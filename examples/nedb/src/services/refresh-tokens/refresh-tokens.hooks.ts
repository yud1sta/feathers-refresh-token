import * as authentication from '@feathersjs/authentication';

import {
  refreshAccessToken,
  revokeRefreshToken,
  logoutUser
} from '@jackywxd/feathers-refresh-token';
// Don't remove this comment. It's needed to format import lines nicely.

const { authenticate } = authentication.hooks;

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
