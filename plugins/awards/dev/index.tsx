/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
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
