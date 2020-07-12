import { NotAuthenticated, BadRequest } from '@feathersjs/errors';
import { Hook, HookContext, Service } from '@feathersjs/feathers';
import { lookupRefreshToken, loadConfig } from './common';
import Debug from 'debug';

const debug = Debug('feathers-refresh-tokens');

export const logoutUser = (): Hook => {
  return async (context: HookContext) => {
    const { app, type, params } = context;
    const config = loadConfig(app);
    const { entity, userIdField, authService } = config;
    //refresh Token only valid for before token and called from external
    if (type === 'after') {
      debug('Logout user after delete refresh token', context.result, params);

      // important, have to reset the query or won't be able to find users ID
      params.query = {};
      const user = await app.service(authService).remove(null, params);
      debug('Logout user after delete refresh token', user, context.result);

      // return the result to user
      context.result = { status: 'Logout successfully' };
      return context;
    }

    const { query, user } = params;

    debug('Hook params', query, user);
    if (!query) {
      throw new Error(`Invalid query strings!`);
    }

    [entity, userIdField].forEach((p) => {
      if (p in query) return;
      throw new BadRequest(`${p} is missing from request`);
    });

    const existingToken = await lookupRefreshToken(
      context,
      query[userIdField],
      query[entity]
    );
    debug('Find existing refresh token result', existingToken);
    if (existingToken) {
      const { _id } = existingToken; // refresh token ID in database
      if (!_id) {
        throw new Error('Invalid refresh token!');
      }
      debug('Deleting token id', _id);

      // set context ID to refresh token ID to delete it from DB
      context.id = _id;
      return context;
    }
    throw new NotAuthenticated();
  };
};
