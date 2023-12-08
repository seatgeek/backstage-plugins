import React from 'react';
import { Grid } from '@material-ui/core';
import { Header, Page, Content } from '@backstage/core-components';

import { AwardViewComponent } from '../AwardViewComponent';
import { editRouteRef } from '../../routes';
import { useRouteRefParams } from '@backstage/core-plugin-api';
import { AwardOwnersComponent } from '../AwardOwnersComponent';
import { AwardRecipientsComponent } from '../AwardRecipientsComponent';

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
