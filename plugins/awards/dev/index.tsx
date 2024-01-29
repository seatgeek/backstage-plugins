import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { awardsPlugin, AwardsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(awardsPlugin)
  .addPage({
    element: <AwardsPage />,
    title: 'Root Page',
    path: '/awards',
  })
  .render();
