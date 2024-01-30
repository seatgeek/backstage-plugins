/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { Content, Header, Page } from '@backstage/core-components';
import { Grid } from '@material-ui/core';
import React from 'react';

import { useRouteRefParams } from '@backstage/core-plugin-api';
import { editRouteRef } from '../../routes';
import { AwardOwnersComponent } from '../AwardOwnersComponent';
import { AwardRecipientsComponent } from '../AwardRecipientsComponent';
import { AwardViewComponent } from '../AwardViewComponent';

// Ref: https://github.com/backstage/backstage/blob/d4aa81680c6b81f7c8736831e938d7c53f36e534/plugins/playlist/src/components/CreatePlaylistButton/CreatePlaylistButton.tsx#L39
export const AwardsViewPage = () => {
  const { uid } = useRouteRefParams(editRouteRef);

  return (
    <Page themeId="tool">
      <Header title="Awards" subtitle="A simple and fun way to manage awards" />
      <Content>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <AwardViewComponent uid={uid} />
            <AwardOwnersComponent uid={uid} />
            <AwardRecipientsComponent uid={uid} />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
