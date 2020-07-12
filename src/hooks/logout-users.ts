import { NotAuthenticated, BadRequest } from '@feathersjs/errors';
import { Hook, HookContext, Service } from '@feathersjs/feathers';
import { lookupRefreshToken, loadConfig } from './common';
import Debug from 'debug';
import { Application } from '../declarations';

const debug = Debug('feathers-refresh-token');

export const logoutUser = (options = {}) => {
  return async (context: HookContext) => {
    const { app, type, params, id } = context;
    const config = loadConfig(app as Application);
    const { entity, userIdField, authService } = config;
    //refresh Token only valid for before token and called from external
    if (type === 'after') {
      debug('Logout user after delete refresh token', params);

      const user = await app.service(authService).remove(null, params);
      debug('Logout user after delete refresh token', user, context.result);

      // return the result to user
      context.result = { status: 'Logout successfully' };
      return context;
    }

    const { query, user } = params;

    debug('Logout hook id and params', id, query, user);
    if (!query) {
      throw new Error(`Invalid query strings!`);
    }

    if (!query[entity] || !id) throw new BadRequest(`Bad request`);

    const existingToken = await lookupRefreshToken(
      context,
      id as string,
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
      // important, have to reset the query or won't be able to find users ID
      params.query = {};
      return context;
    }
    throw new NotAuthenticated();
  };
};
