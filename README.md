# Refresh tokens hooks for Feathers

Forked from [TheSinding/authentication-refresh-token](https://github.com/TheSinding/authentication-refresh-token)
There are three major differences of my implementation:

1. Implement refresh token via Feathers standalone service
2. The form of refresh token is actual JWT
3. Support all authentication strategies (local, oAuth)
4. Support multi-devices login

## Key features

Leveraging existing Feathers built-in authentication service and JWT support to implement refresh token functionalities via couple hooks:

1. issueRefreshToken - issuing refresh token after user authenticated successfully and save it via custom refresh-tokens service
2. refreshAccessToken - issuing new access token by making a POST request to /refresh-tokens endpoint along with user Id and a valid refresh token
3. revokeRefreshToken - revoke refresh token by making PATCH request to /refresh-tokens endpoint
4. logoutUser - remove the refresh token by making a DELETE request to /refresh-tokens endpoint

### This is still new, use with caution

---

## How to use it

1. Create a Feathers App (`feathers generate app`)
2. Authentication should be enable, authentication strategies and user entity service is setup properly
3. Import feathers-refresh-token
4. Add a custom service (`feathers generate service`)
5. Add refresh-token config in default.json
6. Add hooks to authentication service and customer service created on step 4

### Import this package to your Feathers App project

`npm install @jackywxd/feathers-refresh-token`
or
`yarn add @jackywxd/feathers-refresh-token`

### Add 'refresh-token' config section in default.json under authentication section. Basically it mirrors the settings of authentication. It is suggested that change access token expiresIn to 15m

- entity: the refresh token entity name
- service: the refresh token service name
- secret: secret of refresh token JWT, should be different than access token's secret
- jwtOptions: refresh token JWT options

```json
  "authentication": {
    "entity": "user",
    "service": "users",
    "secret": "Mor17jj93SV4Q26GvivuvOySqA0=",
    "authStrategies": ["jwt", "local"],
    "jwtOptions": {
      "header": {
        "typ": "access"
      },
      "audience": "https://yourdomain.com",
      "issuer": "feathers",
      "algorithm": "HS512",
      "expiresIn": "15m"
    },
    "refresh-token": {
      "entity": "refreshToken",
      "service": "refresh-tokens",
      "secret": "oQQjDiCO/Okmm/AUMN7aqKXod+M=asdfasdfasdf99kdsl)(&&3mc,",
      "jwtOptions": {
        "header": {
          "typ": "refresh"
        },
        "audience": "https://example.com",
        "issuer": "example",
        "algorithm": "HS256",
        "expiresIn": "360d"
      }
    },
```

### If "refresh-token" config section is missing in default.json file, the default refresh-token options will be used as below

```typescript
export const defaultOptions = {
  service: 'refresh-tokens', // refresh-token service name
  entity: 'refreshToken', // refresh-token entity
  secret: 'supersecret', // secret for Refresh token
  jwtOptions: {
    header: {
      typ: 'refresh'
    },
    audience: 'https://example.com',
    issuer: 'example',
    algorithm: 'HS256',
    expiresIn: '360d'
  }
};
```

### Configure a service as refresh token endpoint, the name should match the "service" name in refresh-token config options, default is refresh-tokens. This is the endpoint client used to refresh access token and logout user

refresh-tokens.service.ts

```typescript
// Initializes the `refresh-tokens` service on path `/refresh-tokens`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import { RefreshTokens } from './refresh-tokens.class';
import createModel from '../../models/refresh-tokens.model';
import hooks from './refresh-tokens.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    'refresh-tokens': RefreshTokens & ServiceAddons<any>;
  }
}

export default function (app: Application) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/refresh-tokens', new RefreshTokens(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('refresh-tokens');

  service.hooks(hooks as any);
}
```

### Depends on the DB model you are using, you may need to configure refresh-tokens model. Below is the refresh-token data type interface

```typescript
export type RefreshTokenData = {
  id?: string; // id filed for refresh token
  _id?: string;
  userId: string; // user Id
  refreshToken: string; // refresh token
  isValid: boolean; // refresh token is valid or not
  deviceId?: string; // user login device Id, provied by client
  location?: string; // user login location, provided by client
  createdAt?: string; // user login time (refresh-tokenn creation time)
  updatedAt?: string;
};
```

Below is the model file for mongoose
refresh-tokens.model.ts

```typescript
export default function (app: Application) {
  const modelName = 'refreshTokens';
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      userId: { type: String, required: true },
      refreshToken: { type: String, required: true },
      isValid: { type: Boolean, required: true }, // refresh token is valid or not
      deviceId: String
    },
    {
      validateBeforeSave: false,
      timestamps: true
    }
  );

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
```

model file for sequelize:

```typescript
// See http://docs.sequelizejs.com/en/latest/docs/models-definition/
// for more of what you can do here.
import { Sequelize, DataTypes } from 'sequelize';
import { Application } from '../declarations';

export default function (app: Application) {
  const sequelizeClient: Sequelize = app.get('sequelizeClient');
  const refreshTokens = sequelizeClient.define(
    'refresh_tokens',
    {
      userId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isValid: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      }
    },
    {
      hooks: {
        beforeCount(options: any) {
          options.raw = true;
        }
      }
    }
  );

  // eslint-disable-next-line no-unused-vars
  (refreshTokens as any).associate = function (models: any) {
    // Define associations here
    // See http://docs.sequelizejs.com/en/latest/docs/associations/
  };

  return refreshTokens;
}
```

### Add issueRefreshToken to Feathers Authentication after create hook

authentication.ts

```typescript
export default function (app: Application) {
  const authentication = new AuthenticationService(app);

  authentication.register('jwt', new MyJwtStrategy());
  authentication.register('local', new LocalStrategy());

  app.use('/authentication', authentication);
  app.service('authentication').hooks({
    after: {
      create: [issueRefreshToken()]
    }
  });
  app.configure(expressOauth());
}
```

### Update refresh-tokens.hooks.ts to add refreshAccessToken, revokeRefreshToken and logoutUser hooks

refresh-tokens.hooks.ts

```typescript
export default {
  before: {
    all: [],
    find: [],
    get: [],
    create: [refreshAccessToken()],
    update: [],
    patch: [authenticate('jwt'), revokeRefreshToken()],
    remove: [authenticate('jwt'), logoutUser()]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [logoutUser()]
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
```

## Examples

### Authenticate user with local or oAuth strategies, to support multi-devices login, client must provide "deviceId" in authentication request. After authenticated successfully, client must save the user Id and refresh token in secure local storage for future use

Authentication request:

```http
POST http://localhost:3030/authentication
Content-Type: application/json

{
  "strategy": "local",
  "email": "test@test.com",
  "password": "a",
  "deviceId": "device1"
}
```

Authentication response:

```http
HTTP/1.1 201 Created
{
  "accessToken": "...JWT...",
  "authentication": {
    "strategy": "local"
  },
  "user": {
    "strategy": "local",
    "email": "test@test.com",
    "_id": "user ID"
  },
  "refreshToken": "...JWT..."
}
```

### After access token expiration, make a POST request to /refresh-tokens endpoint along with userID and refresh token to get a new access token

```http
POST http://localhost:3030/refresh-tokens
Content-Type: application/json

{
  "_id": "user ID",
  "refreshToken": <refresh_token>
}
```

response:

```http
HTTP/1.1 201 Created
{
  "accessToken": "new access_token"
}

```

### To revoke refresh-token, make a PATCH request to /refresh-tokens endpoint. Authorization header should be set as it is required a protected endpoint

```http
PATCH http://localhost:3030/refresh-tokens
Content-Type: application/json
Authorization: <access_token>

{
  "refreshToken": <refresh_token>
}
```

### To logout user, client makes a DELETE request to /refresh-tokens/userID endpoint. Same as revokeRefreshToken, DELETE request is protected, client needs to set the Authorization header to access it

```http
DELETE http://localhost:3030/refresh-tokens?refreshToken=<refresh_token>
Authorization: <access_token>
```

## Change-log

```text
0.2.0 - Add revokeRefreshToken hook, unit testing, support deviceId for multiple device login and update utility funtions
0.1.0 - Simply and align refresh-token config options with existing authentication options; update typescript typing
0.0.6 - initial release
```
