import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'awards',
});

export const editRouteRef = createSubRouteRef({
  id: 'awards-edit',
  parent: rootRouteRef,
  path: '/edit/:uid',
})

export const newRouteRef = createSubRouteRef({
  id: 'awards-new',
  parent: rootRouteRef,
  path: '/new',
});

export const viewRouteRef = createSubRouteRef({
  id: 'awards-view',
  parent: rootRouteRef,
  path: '/view/:uid',
});
