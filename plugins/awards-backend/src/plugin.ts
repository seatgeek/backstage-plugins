/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { loggerToWinstonLogger } from '@backstage/backend-common';
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
        config: coreServices.rootConfig,
        database: coreServices.database,
        identity: coreServices.identity,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        discovery: coreServices.discovery,
        tokenManager: coreServices.tokenManager,
      },
      async init({
        config,
        database,
        identity,
        logger,
        httpRouter,
        discovery,
        tokenManager,
      }) {
        httpRouter.use(
          await createRouter({
            config,
            database,
            identity,
            logger: loggerToWinstonLogger(logger),
            discovery,
            tokenManager,
          }),
        );
      },
    });
  },
});
