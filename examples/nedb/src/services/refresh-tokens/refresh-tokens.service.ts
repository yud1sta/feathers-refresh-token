// Initializes the `refresh-tokens` service on path `/refresh-tokens`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import { RefreshTokens } from './refresh-tokens.class';
import createModel from '../../models/refresh-tokens.model';
import hooks from './refresh-tokens.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    'refresh-tokens': RefreshTokens & ServiceAddons<any>;
  }
}

export default function (app: Application) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('/refresh-tokens', new RefreshTokens(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('refresh-tokens');

  service.hooks(hooks as any);
}
