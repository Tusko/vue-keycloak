import Keycloak from "keycloak-js";
import { reactive, toRefs } from "vue";
import jwtDecode from "jwt-decode";
import { isNil, isFunction, isString } from "lodash";

const state = reactive({
  isAuthenticated: false,
  hasFailed: false,
  isPending: false,
  token: "",
  decodedToken: {},
  username: "",
  roles: [],
  resourceRoles: {},
});

const setToken = (token) => {
  state.token = token;
  const content = jwtDecode(state.token);
  state.decodedToken = content;
  state.roles = content.realm_access?.roles || [];
  state.username = content.preferred_username;
  state.resourceRoles = content.resource_access
    ? Object.fromEntries(
        Object.entries(content.resource_access).map(([key, value]) => [
          key,
          value.roles,
        ])
      )
    : {};
};

const hasFailed = (value) => {
  state.hasFailed = value;
};

const isPending = (value) => {
  state.isPending = value;
};

const isAuthenticated = (value) => {
  state.isAuthenticated = value;
};

function isPromise(promise) {
  return !isNil(promise) && typeof promise.then === "function";
}

let $keycloak = undefined;
async function isTokenReady() {
  return new Promise((resolve) => checkToken(resolve));
}
const checkToken = (resolve) => {
  if (!isNil($keycloak) && !isNil($keycloak.token)) {
    resolve();
  } else {
    setTimeout(() => checkToken(resolve), 500);
  }
};
function getKeycloak() {
  return $keycloak;
}
async function getToken() {
  return updateToken();
}
async function updateToken(timeout = 5) {
  if (!$keycloak) {
    throw new Error("Keycloak is not initialized.");
  }
  try {
    await $keycloak.updateToken(timeout);
    setToken($keycloak.token);
  } catch (error) {
    console.error("Token update error", error);
    hasFailed(true);
    throw new Error("Failed to refresh the token, or the session has expired");
  }
  return $keycloak.token;
}
function createKeycloak(config) {
  $keycloak = new Keycloak(config);
  return getKeycloak();
}
async function initKeycloak(initConfig) {
  try {
    isPending(true);
    const _isAuthenticated = await $keycloak.init(initConfig);
    isAuthenticated(_isAuthenticated);
    if (!isNil($keycloak.token)) {
      setToken($keycloak.token);
    }
    $keycloak.onAuthRefreshSuccess = () => setToken($keycloak.token);
    $keycloak.onTokenExpired = () => updateToken();
  } catch (error) {
    console.error("Init keycloak error", error);
    hasFailed(true);
    isAuthenticated(false);
    throw new Error("Could not read access token");
  } finally {
    isPending(false);
  }
}

const useKeycloak = () => {
  return Object.assign(Object.assign({}, toRefs(state)), {
    keycloak: getKeycloak(),
    hasRoles: (roles) =>
      !isNil(roles) &&
      state.isAuthenticated &&
      roles.every((role) => state.roles.includes(role)),
    hasResourceRoles: (roles, resource) =>
      !isNil(roles) &&
      !isNil(resource) &&
      state.isAuthenticated &&
      !isNil(state.resourceRoles) &&
      !isNil(state.resourceRoles[resource]) &&
      roles.every((role) => state.resourceRoles[resource].includes(role)),
  });
};

const defaultInitConfig = {
  flow: "standard",
  checkLoginIframe: false,
  onLoad: "login-required",
};

function loadJsonConfig(url) {
  return new Promise((resolve, reject) => {
    const xhttp = new XMLHttpRequest();
    xhttp.overrideMimeType("application/json");
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        const jsonResponse = this.responseText;
        const response = JSON.parse(jsonResponse);
        resolve(response);
      } else {
        reject("Could not load " + url + " file");
      }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
  });
}

const vueKeycloak = {
  async install(app, options) {
    if (isNil(options)) {
      throw new Error("The Keycloak.KeycloakConfig are requried");
    }
    let keycloakPluginConfig;
    if (isString(options)) {
      keycloakPluginConfig = await loadJsonConfig(options);
    } else if (isPromise(options) || isFunction(options)) {
      keycloakPluginConfig = await options();
    } else {
      keycloakPluginConfig = options;
    }
    const keycloakConfig = keycloakPluginConfig.config;
    const keycloakInitOptions = !isNil(keycloakPluginConfig.initOptions)
      ? Object.assign(
          Object.assign({}, defaultInitConfig),
          keycloakPluginConfig.initOptions
        )
      : defaultInitConfig;
    const _keycloak = createKeycloak(keycloakConfig);
    app.config.globalProperties.$keycloak = _keycloak;
    await initKeycloak(keycloakInitOptions);

    if (options.onReady && typeof options.onReady === "function") {
      options.onReady();
    }
  },
};

export {
  getKeycloak,
  getToken,
  updateToken,
  isTokenReady,
  useKeycloak,
  vueKeycloak,
};
