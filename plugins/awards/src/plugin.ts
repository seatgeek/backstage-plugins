/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { awardsApiRef, AwardsBackendApi } from './api';

export const awardsPlugin = createPlugin({
  id: 'awards',
  apis: [
    createApiFactory({
      api: awardsApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new AwardsBackendApi({ discoveryApi, fetchApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const AwardsPage = awardsPlugin.provide(
  createRoutableExtension({
    name: 'AwardsPage',
    component: () => import('./router').then(m => m.AwardsRouter),
    mountPoint: rootRouteRef,
  }),
);
