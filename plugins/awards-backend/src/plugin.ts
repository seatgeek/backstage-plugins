import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const awardsPlugin = createBackendPlugin({
  pluginId: 'awards',
  register(env) {
    env.registerInit({
      deps: {
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        database: coreServices.database,
        discovery: coreServices.discovery,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        userInfo: coreServices.userInfo,
      },
      async init({
        auth,
        config,
        database,
        discovery,
        httpAuth,
        httpRouter,
        logger,
        userInfo,
      }) {
        httpRouter.use(
          await createRouter({
            auth,
            config,
            database,
            discovery,
            httpAuth,
            logger,
            userInfo,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        // Award logos are rendered on the frontend as img tags, so they need to be public.
        httpRouter.addAuthPolicy({
          path: '/logos/:id',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
