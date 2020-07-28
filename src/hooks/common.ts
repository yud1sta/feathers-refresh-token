import { HookContext, Application } from '@feathersjs/feathers';
import Debug from 'debug';
import { defaultOptions, RefreshTokenOptions, RefreshTokenData } from './core';

const debug = Debug('feathers-refresh-token');
let refreshTokenOptions: RefreshTokenOptions | null = null;

/*
 * Return refresh-tokens all depending options
 */
export const loadConfig = (app: Application) => {
  // refresn token options already loaded, simply return
  if (refreshTokenOptions) {
    return refreshTokenOptions;
  }
  // get default authentication key
  const defaultAuthKey = app.get('defaultAuthentication');
  const {
    entity: userEntity, // The name of the field that will contain the entity after successful authentication
    entityId: userEntityId, //T he id property of an entity object
    service: userService, // The path of the entity service
    'refresh-token': config
  } = app.get(defaultAuthKey);

  if (!userEntity || !defaultAuthKey || !app.service(userService)) {
    throw new Error(`Invalid authentication service configuration!`);
  }

  debug(
    `Default authentication key and config:`,
    defaultAuthKey,
    app.get(defaultAuthKey)
  );

  // merge default options and options loaded from config
  const finalOptions: RefreshTokenOptions = {
    ...defaultOptions,
    authService: defaultAuthKey, // authentication service
    userEntityId: userEntityId ? userEntityId : app.service(userService).id, // user entity ID
    userEntity, // user entity
    ...config
  };

  debug(`Returning final options for refresh token`, finalOptions);

  if (!app.service(finalOptions.service)) {
    throw new Error(
      `Missing refresh-token entity service. Make sure refresh-tokens servie is configured properly.`
    );
  }

  refreshTokenOptions = finalOptions;

  return finalOptions;
};

/*
 *
 * Return an existing refresh-token
 * context: Hook context
 * params: query conditions
 */
export const lookupRefreshToken = async (
  context: HookContext,
  params: Partial<RefreshTokenData>
): Promise<RefreshTokenData | null> => {
  const { app } = context;
  const config = loadConfig(app);

  const { userId, deviceId, isValid, refreshToken } = params;

  if (!userId) {
    throw new Error(`userId is mandatory for querying refresh-token`);
  }

  let query: Partial<RefreshTokenData> = {
    userId: `${userId}`,
    isValid: isValid ? isValid : true
  };

  if (refreshToken) {
    query = {
      ...query,
      refreshToken
    };
  }

  if (deviceId) {
    query = {
      ...query,
      deviceId
    };
  }
  const existingToken = await app.service(config.service).find({
    query
  });

  debug(`Refresh token lookup result: `, existingToken);

  if (Array.isArray(existingToken) && existingToken.length > 0) {
    return existingToken[0];
  }

  if (existingToken && existingToken.total > 0 && existingToken.data) {
    const data: RefreshTokenData = existingToken.data[0];
    return data;
  }

  return null;
};
