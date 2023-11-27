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

/** @public */
// export const AwardsPage = awardsPlugin.provide(
//   createRoutableExtension({
//     name: 'AwardsPage',
//     component: () => import('./router').then(m => m.AwardsRouter),
//     mountPoint: rootRouteRef,
//   }),
// );

// TODO: Do I really need to export all of this? Can't I have an internal router
// managing those?
export const AwardsListPage = awardsPlugin.provide(
  createRoutableExtension({
    name: 'AwardsListPage',
    component: () => import('./components').then(m => m.AwardsListPage),
    mountPoint: rootRouteRef,
  }),
);

export const AwardsNewPage = awardsPlugin.provide(
  createRoutableExtension({
    name: 'AwardsNewPage',
    component: () => import('./components').then(m => m.AwardsNewPage),
    mountPoint: rootRouteRef,
  }),
);

export const AwardsEditPage = awardsPlugin.provide(
  createRoutableExtension({
    name: 'AwardsEditPage',
    component: () => import('./components').then(m => m.AwardsEditPage),
    mountPoint: rootRouteRef,
  }),
);

export const AwardsViewPage = awardsPlugin.provide(
  createRoutableExtension({
    name: 'AwardsViewPage',
    component: () => import('./components').then(m => m.AwardsViewPage),
    mountPoint: rootRouteRef,
  }),
);