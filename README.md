<table align="center" cellspacing="0" cellpadding="0" style="border: none;">
<tr>
  <td style="border: 0; vertical-align: middle">
    <img width="180px" src="https://vuejs.org/images/logo.png" />
  </td>
  <td style="border: 0; vertical-align: middle">
    <h1 style="border: 0; font-size: 100px; line-height: 50px">+</h1>
  </td>
  <td style="border: 0; vertical-align: middle">
    <img width="200px" src="https://www.keycloak.org/resources/images/keycloak_icon_512px.svg" />
  </td>
</tr>
</table>

# vue3-keycloak

Another one wrapper library for the [Keycloak JavaScript adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter).

> The library is made for [Vue 3.x.x](https://v3.vuejs.org/) and the [Composition API](https://v3.vuejs.org/api/composition-api.html).

## Instalation

Install the [keycloak-js](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter) package , [jwt-decode](https://www.npmjs.com/package/jwt-decode) to decode the jwt token and our wrapper library with npm.

## Use plugin

Import the library into your `src/vue3-keycloak` file or any other entry point.

```typescript
import {vueKeycloak} from "vue3-keycloak.js";
```

Apply the library to the vue app instance.

```typescript
const app = createApp(App)

app.use(vueKeycloak, {
  initOptions: {
    flow: 'standard', // default
    checkLoginIframe: false, // default
    onLoad: 'login-required', // default
  }
  config: {
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    onReady: async () => {
      app.use(pinia); // or any other plugin
      app.use(router); // or any other plugin
      await router.isReady();
      await isTokenReady();
      app.mount("#app");
    },
  }
})
```

Or use a JSON file with the configs.

```typescript
app.use(vueKeycloak, "/keycloak.json");
```

### Configuration

| Config      | Type                           | Description                              |
| ----------- | ------------------------------ | ---------------------------------------- |
| initOptions | `Keycloak.KeycloakInitOptions` | `initOptions` is Keycloak init options.  |
| config      | `Keycloak.KeycloakConfig`      | `config` are the Keycloak configuration. |

Use the example below to generate dynamic Keycloak conifiguration.

```typescript
app.use(vueKeycloak, async () => {
  return {
    config: {
      url: (await getAuthBaseUrl()) + "/auth",
      realm: "myrealm",
      clientId: "myapp",
    },
    initOptions: {
      onLoad: "check-sso",
      silentCheckSsoRedirectUri:
        window.location.origin + "/assets/silent-check-sso.html",
    },
  };
});
```

> It is also possible to access the keycloak instance with `getKeycloak()`

## Use Token

We export two helper functions for the token.

### updateToken / getToken

This function checks if the token is still valid and will update it if it is expired.

```js
import { updateToken, useKeycloak } from "src/vue3-keycloak";

// Request interceptor for API calls
const axiosClient = axios.create({
  baseURL: import.meta.env.API_URL,
});
// Add a request interceptor
axiosClient.interceptors.request.use(
  async (config) => {
    const { keycloak, hasFailed, isPending } = useKeycloak();
    let token = null;
    try {
      token = await updateToken(0); // updates token if expired, by default returns the token if it valid
    } catch (error) {
      error && errorHandle(error); // some custom error handler

      if (hasFailed && !isPending) {
        keycloak.logout();
      }
    }

    config.headers = {
      Authorization: `Bearer ${token}`, // for example
    };
    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);
```

## Composition API

```js
import {computed, defineComponent} from "vue";
import {useKeycloak} from "src/vue3-keycloak";

export default defineComponent({
  setup() {
    const {hasRoles, isPending} = useKeycloak();

    const hasAccess = computed(() => hasRoles(["RoleName"]));

    return {
      hasAccess,
    };
  },
});
```

### useKeycloak

The `useKeycloak` function exposes the following reactive state.

```typescript
import {useKeycloak} from "src/vue-keycloak";

const {
  isAuthenticated,
  isPending,
  hasFailed,
  token,
  decodedToken,
  username,
  roles,
  resourceRoles,
  keycloak,

  // Functions
  hasRoles,
  hasResourceRoles,
} = useKeycloak();
```

| State           | Type                           | Description                                                         |
| --------------- | ------------------------------ | ------------------------------------------------------------------- |
| isAuthenticated | `Ref<boolean>`                 | If `true` the user is authenticated.                                |
| isPending       | `Ref<boolean>`                 | If `true` the authentication request is still pending.              |
| hasFailed       | `Ref<boolean>`                 | If `true` authentication request has failed.                        |
| token           | `Ref<string>`                  | `token` is the raw value of the JWT token.                          |
| decodedToken    | `Ref<T>`                       | `decodedToken` is the decoded value of the JWT token.               |
| username        | `Ref<string>`                  | `username` the name of our user.                                    |
| roles           | `Ref<string[]>`                | `roles` is a list of the users roles.                               |
| resourceRoles   | `Ref<Record<string, string[]>` | `resourceRoles` is a list of the users roles in specific resources. |
| keycloak        | `Keycloak.KeycloakInstance`    | `keycloak` is the instance of the keycloak-js adapter.              |

#### Functions

| Function         | Type                                             | Description                                                                        |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| hasRoles         | `(roles: string[]) => boolean`                   | `hasRoles` returns true if the user has all the given roles.                       |
| hasResourceRoles | `(roles: string[], resource: string) => boolean` | `hasResourceRoles` returns true if the user has all the given roles in a resource. |

# License

GNU General Public License v3.0 | Copyright © 2022-present Tusko Trush
