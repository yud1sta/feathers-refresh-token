import { NotAuthenticated, BadRequest } from '@feathersjs/errors';
import { Hook, HookContext, Service } from '@feathersjs/feathers';
import Debug from 'debug';

import { lookupRefreshTokenId, loadConfig } from './common';
import { Application } from '../declarations';
import { RefreshTokenData } from './core';

const debug = Debug('feathers-refresh-token');

export const revokeRefreshToken = (options = {}): Hook<any, Service<any>> => {
  return async (context: HookContext) => {
    const { data, app, method, type, params } = context;
    const config = loadConfig(app as Application);

    if (method !== 'patch') {
      throw new Error(
        `revokeRefreshToken hook must be used with patch method!`
      );
    }
    // for internal call, simply return context
    if (!params.provider) {
      debug('Internal API call for refresh token, simply return context');
      return context;
    }
    //revoke refresh Token only valid for before token and called from external
    if (type !== 'before') {
      throw new Error(
        'Revoke refresh token hook must be used with before token'
      );
    }

    const { entity, userEntityId } = config;

    //! validating user input
    [entity, userEntityId].forEach((p) => {
      if (p in data) return;
      throw new BadRequest(`${p} is missing from request`);
    });

    const existingTokenId = await lookupRefreshTokenId(context, config, {
      userId: data[userEntityId],
      refreshToken: data[entity]
    });

    debug('Find existing refresh token result', existingTokenId);
    // Refresh token exists
    if (existingTokenId === null) {
      throw new NotAuthenticated();
    }

    context.id = existingTokenId;
    context.data = { isValid: false };
    return context;
  };
};
