import { ServiceAddons } from '@feathersjs/feathers';
import {
  AuthenticationService,
  JWTStrategy,
  AuthenticationResult,
} from '@feathersjs/authentication';
import { LocalStrategy } from '@feathersjs/authentication-local';
import { expressOauth } from '@feathersjs/authentication-oauth';

import { issueRefreshToken } from '@jackywxd/feathers-refresh-token';

import { Application } from './declarations';

declare module './declarations' {
  interface ServiceTypes {
    authentication: AuthenticationService & ServiceAddons<any>;
  }
}

class MyJwtStrategy extends JWTStrategy {
  async getEntityId(authResult: AuthenticationResult) {
    const {
      authentication: { payload },
    } = authResult;
    console.log(authResult);
    return payload.sub || payload._id;
  }
}

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
