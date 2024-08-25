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
