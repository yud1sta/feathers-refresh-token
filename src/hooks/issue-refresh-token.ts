import { Hook, HookContext } from '@feathersjs/feathers';
import { lookupRefreshToken, loadConfig } from './common';
import Debug from 'debug';

const debug = Debug('feathers-refresh-token');

// After hook with authentication service
// result - authResult which will return to user, contains access token, sub and strategy

/*
 service - refresh token service
 entity - entity name of refresh token service
 options - refresh token JWT options
 userIdField - user ID filed in database, i.e. subject field in JWT, used to look up refresh token
*/

export const issueRefreshToken = (): Hook => {
  return async (context: HookContext) => {
    const { app, result } = context;
    const config = loadConfig(app);

    debug(`Issue Refresh token with auth result`, result);

    const { entity, userIdField, authService } = config;
    // userIdField must be presented in result
    if (!(userIdField in result)) {
      debug(`${config['userIdField']} doesn't exist in auth result`, result);
      return context;
    }

    const entityService = app.service(config.service);
    const user = result[userIdField];
    const existingToken = await lookupRefreshToken(context, user);

    debug(`existing token`, existingToken);

    // if refresh token already exists, simply return
    if (existingToken) {
      Object.assign(result, { [entity]: existingToken[entity] });
      return context;
    }

    // Use authentication service to generate the refresh token with user ID
    const refreshToken = await app.service(authService).createAccessToken(
      {
        [userIdField]: user,
      },
      config.options, // refresh token options
      config.secret // refresh token secret, should be different than access token
    );

    // save the refresh token ID
    const token = await entityService.create({
      [entity]: refreshToken,
      [userIdField]: user,
      isValid: true,
    });

    debug(`Token ID and refresh token`, token, refreshToken);

    // return refresh token in result
    Object.assign(result, { [entity]: refreshToken });

    return context;
  };
};
