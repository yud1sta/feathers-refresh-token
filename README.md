## Refresh Tokens Hooks for Feathers

Forked from [TheSinding/authentication-refresh-token](https://github.com/TheSinding/authentication-refresh-token)
There are three major differences of my implementation:

1. Implement refresh token via Feathers standalone service instead of as Feathers authentication strategy,
2. The form of refresh token is actual JWT
3. Support all authentication strategies (local, oAuth)

## Refresh Tokens Hooks for Feathers

Leveraging built-in service and JWT support in Feathers to implement refresh token functionalities via couple hooks:

1. issueRefreshToken - issuing refresh token after user authenticated successfully and save it via refresh-tokens service
2. refreshAccessToken - issuing new access token by making a POST request to /refresh-tokens endpoint along with user Id and valid refresh token
3. logoutUser - remove the refresh token by making a DELETE request to /refresh-tokens endpoint

### This is still new, so use with caution

### Import this package to your Feathers App project

`npm install @jackywxd/feathers-refresh-token` or `yarn add @jackywxd/feathers-refresh-token`

### Add 'refresh-token' config in default.json under authentication section. It is suggested that change access token expiresIn to 15m.

- entity: the refresh token entity name,
- service: the refresh token service name
- authService: the name of authentication service
- userIdField: user ID filed in authenticate result,
- secret: secret of refresh token JWT, should be different than access token's secret
- options: refresh token JWT options

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
      "authService": "authentication",
      "userIdField": "_id",
      "secret": "oQQjDiCO/Okmm/AUMN7aqKXod+M=asdfasdfasdf99kdsl)(&&3mc,",
      "options": {
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

### Configure a service as refresh token endpoint, the name should match the settings in config, default is refresh-tokens

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
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('/refresh-tokens', new RefreshTokens(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('refresh-tokens');

  service.hooks(hooks as any);
}
```

### Depends on the DB model you are using, you may need to configure refresh-tokens model. Below is the model file for mongoose

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
      device: String,
    },
    {
      validateBeforeSave: false,
      timestamps: true,
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
        allowNull: false,
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isValid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      hooks: {
        beforeCount(options: any) {
          options.raw = true;
        },
      },
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

### Add issue refresh token to Feathers Authentication after create hook

authentication.ts

```typescript
export default function (app: Application) {
  const authentication = new AuthenticationService(app);

  authentication.register('jwt', new MyJwtStrategy());
  authentication.register('local', new LocalStrategy());

  app.use('/authentication', authentication);
  app.service('authentication').hooks({
    after: {
      create: [issueRefreshToken()],
    },
  });
  app.configure(expressOauth());
}
```

### Update refresh-tokens.hooks.ts to add refreshAccessToken to before/create hook,Add logoutUser to before/remove hook and after/remove hook

refresh-tokens.hooks.ts

```typescript
export default {
  before: {
    all: [],
    find: [],
    get: [],
    create: [refreshAccessToken()],
    update: [],
    patch: [],
    remove: [authenticate('jwt'), logoutUser()],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [logoutUser()],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
```

## Examples

### Authenticate user Authentication response, client needs to save the user Id and refresh token for future use.

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
  "refreshToken": "...JWT token..."
}
```

response:

```http
HTTP/1.1 201 Created
{
  "refreshToken": "same refresh token",
  "_id": "same user Id",
  "accessToken": "new access token"
}

```

### To logout user, client makes a DELETE request to /refresh-tokens/userID endpoint. Unlike POST request, DELETE request is protected, client needs to set the Authorization header to access it.

```http
DELETE http://localhost:3030/refresh-tokens/<user ID>?refreshToken=<refresh token>
Authorization:<access token>
```

Response:

```http
HTTP/1.1 200 OK
{
"status": "Logout successfully"
}
```

## Change-log:

```text
0.0.6 - initial release
```
