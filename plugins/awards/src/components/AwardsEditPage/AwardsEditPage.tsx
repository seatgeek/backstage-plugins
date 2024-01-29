/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import React from 'react';
import { Grid } from '@material-ui/core';
import { Header, Page, Content } from '@backstage/core-components';

import { AwardsEditComponent } from '../AwardEditComponent';

// Ref: https://github.com/backstage/backstage/blob/d4aa81680c6b81f7c8736831e938d7c53f36e534/plugins/playlist/src/components/CreatePlaylistButton/CreatePlaylistButton.tsx#L39
export const AwardsEditPage = () => {
  return (
    <Page themeId="tool">
      <Header title="Awards" subtitle="A simple and fun way to manage awards" />
      <Content>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <AwardsEditComponent />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
