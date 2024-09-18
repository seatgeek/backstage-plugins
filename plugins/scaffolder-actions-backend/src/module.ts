/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import * as actions from './actions';

export const scaffolderBackendModuleActions = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'seatgeek-scaffolder-actions-backend-module',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder }) {
        scaffolder.addActions(actions.createHclMergeAction());
        scaffolder.addActions(actions.createHclMergeWriteAction());
        scaffolder.addActions(actions.createHclMergeFilesAction());
        scaffolder.addActions(actions.createHclMergeFilesWriteAction());
      },
    });
  },
});
