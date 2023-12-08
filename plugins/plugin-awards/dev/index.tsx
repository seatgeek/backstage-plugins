import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { awardsPlugin, AwardsListPage } from '../src/plugin';

createDevApp()
  .registerPlugin(awardsPlugin)
  .addPage({
    element: <AwardsListPage />,
    title: 'Root Page',
    path: '/awards',
  })
  .render();
