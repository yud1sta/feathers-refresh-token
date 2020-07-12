import { NotAuthenticated, BadRequest } from '@feathersjs/errors';
import { Hook, HookContext } from '@feathersjs/feathers';
import { lookupRefreshToken, loadConfig } from './common';
import Debug from 'debug';

const debug = Debug('feathers-refresh-tokens');

// Before create hook refresh token service to refresh access token
// data: post data with sub and refresh token
export const refreshAccessToken = (): Hook => {
  return async (context: HookContext) => {
    const { data, app, type, params } = context;
    const config = loadConfig(app);

    // for internal call, simply return context
    if (!params.provider) {
      debug('Internal call for refresh token, simply return context');
      return context;
    }
    //refresh Token only valid for before token and called from external
    if (type !== 'before') {
      throw new Error('Refresh token must be used with before token');
    }

    // user is the user entity object
    if (!params.user) {
      throw new Error('This hook must be used with JWT strategy');
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
      if (tokenVerifyResult[userIdField] !== data[userIdField]) {
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
