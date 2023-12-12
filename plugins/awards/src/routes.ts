import { createRouteRef } from '@backstage/core-plugin-api';

// Reference: https://github.com/backstage/backstage/blob/77a7ef3fa500fcfb80bee21f971eee682a955655/plugins/catalog/src/routes.ts
// https://backstage.io/docs/plugins/composability/#subroutes
export const rootRouteRef = createRouteRef({
  id: 'awards',
});

export const editRouteRef = createRouteRef({
  id: 'awards:edit',
  params: ['uid'],
});

export const newRouteRef = createRouteRef({
  id: 'awards:new',
  params: ['uid'],
});

export const viewRouteRef = createRouteRef({
  id: 'awards:view',
  params: ['uid'],
});
