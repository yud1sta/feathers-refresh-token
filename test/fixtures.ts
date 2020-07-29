import { NotAuthenticated } from '@feathersjs/errors';
import { Params } from '@feathersjs/feathers';

import {
  AuthenticationRequest,
  AuthenticationBaseStrategy
} from '@feathersjs/authentication';
import { IncomingMessage } from 'http';

export interface MockRequest extends IncomingMessage {
  isDave?: boolean;
  isV2?: boolean;
}

let i = new Date().getTime();

export class Strategy1 extends AuthenticationBaseStrategy {
  static result = {
    user: {
      id: 123,
      name: 'Dave'
    },
    authenticated: true
  };

  async authenticate(authentication: AuthenticationRequest) {
    if (authentication.username === 'David' || authentication.both) {
      return { ...Strategy1.result, accessToken: i++ };
    }
    if (authentication.username === 'Jacky' || authentication.both) {
      return {
        id: 456,
        authenticated: true
      };
    }
    if (authentication.username === 'other' || authentication.both) {
      return {
        authenticated: true
      };
    }
    throw new NotAuthenticated('Invalid Username');
  }

  async parse(req: MockRequest) {
    if (req.isDave) {
      return Strategy1.result;
    }

    return null;
  }
}

export class Strategy2 extends AuthenticationBaseStrategy {
  static result = {
    user: {
      name: 'V2',
      version: 2
    },
    authenticated: true
  };

  authenticate(authentication: AuthenticationRequest, params: Params) {
    const isV2 =
      authentication.v2 === true && authentication.password === 'supersecret';

    if (isV2 || authentication.both) {
      return Promise.resolve(
        Object.assign({ params, authentication }, Strategy2.result)
      );
    }

    return Promise.reject(new NotAuthenticated('Invalid v2 user'));
  }

  async parse(req: MockRequest) {
    if (req.isV2) {
      return Strategy2.result;
    }

    return null;
  }
}
