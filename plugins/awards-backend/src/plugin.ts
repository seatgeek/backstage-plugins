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
        database: coreServices.database,
        identity: coreServices.identity,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
      },
      async init({ database, identity, logger, httpRouter }) {
        httpRouter.use(
          await createRouter({
            database,
            identity,
            logger: loggerToWinstonLogger(logger),
          }),
        );
      },
    });
  },
});
