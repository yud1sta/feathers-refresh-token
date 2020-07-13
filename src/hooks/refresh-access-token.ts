import { NotAuthenticated, BadRequest } from '@feathersjs/errors';
import { Hook, HookContext, Service } from '@feathersjs/feathers';
import Debug from 'debug';

import { lookupRefreshToken, loadConfig } from './common';
import { Application } from '../declarations';

const debug = Debug('feathers-refresh-token');

// Before create hook refresh token service to refresh access token
// data: post data with sub and refresh token
export const refreshAccessToken = (options = {}): Hook<any, Service<any>> => {
  return async (context: HookContext) => {
    const { data, app, type, params } = context;
    const config = loadConfig(app as Application);

    // for internal call, simply return context
    if (!params.provider) {
      debug('Internal call for refresh token, simply return context');
      return context;
    }
    //refresh Token only valid for before token and called from external
    if (type !== 'before') {
      throw new Error('Refresh token must be used with before token');
    }

    const { entity, userIdField, authService } = config;
    [entity, userIdField].forEach((p) => {
      if (p in data) return;
      throw new BadRequest(`${p} is missing from request`);
    });

    const existingToken = await await lookupRefreshToken(
      context,
      data[userIdField],
      data[entity]
    );

    debug('Find existing refresh token result', existingToken);

    // Refresh token exists
    if (existingToken) {
      debug('Validating refresh token');
      // validate refresh token
      const tokenVerifyResult = await app!
        .service(authService)
        ?.verifyAccessToken(
          existingToken[entity],
          config.options,
          config.secret
        );

      debug('Verify Refresh Token result', tokenVerifyResult);

      // Input data[userIdFiled] must match the sub in Refresh Token
      if (tokenVerifyResult.sub !== data[userIdField]) {
        throw new Error(`Invalid token`);
      }

      debug('Creating new access token');
      const accessToken = await app!.service(authService)?.createAccessToken({
        [userIdField]: data[userIdField],
      });

      debug('Issued new access token', accessToken);

      context.result = {
        [entity]: data[entity],
        [userIdField]: data[userIdField],
        accessToken,
      };
      return context;
    }
    throw new NotAuthenticated();
  };
};
