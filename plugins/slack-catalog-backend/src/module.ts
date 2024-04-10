/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { loggerToWinstonLogger } from '@backstage/backend-common';
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { WebClient } from '@slack/web-api';

import { SlackUserProcessor } from './SlackUserProcessor';

export const catalogModuleSlackUserProcessor = createBackendModule({
  pluginId: 'catalog', // name of the plugin that the module is targeting
  moduleId: 'slack-catalog-backend',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ catalog, logger, config }) {
        // Log warning if no token is set
        const slackToken = config.getOptionalString('slackCatalog.token');
        if (!slackToken) {
          logger.warn(
            'No token provided for SlackUserProcessor, skipping Slack user lookup',
          );
          return;
        }
        catalog.addProcessor(
          new SlackUserProcessor(
            new WebClient(slackToken),
            loggerToWinstonLogger(logger),
          ),
        );
      },
    });
  },
});
