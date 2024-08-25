/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { GitlabUserProcessor } from './GitlabUserProcessor';

export const catalogModuleGitlabUserProcessor = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'gitlab-user-processor',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ catalog, config, logger }) {
        const gitlabUserProcessor = GitlabUserProcessor.fromConfig(
          config,
          logger,
        );
        catalog.addProcessor(gitlabUserProcessor);
      },
    });
  },
});
