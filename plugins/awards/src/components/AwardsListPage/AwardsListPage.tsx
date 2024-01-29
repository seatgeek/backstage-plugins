/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import React from 'react';
import { Grid } from '@material-ui/core';
import { Header, Page, Content, LinkButton } from '@backstage/core-components';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';

import { AwardsListComponent } from '../AwardsListComponent';

export const AwardsListPage = () => {
  return (
    <Page themeId="tool">
      <Header title="Awards" subtitle="A simple and fun way to manage awards" />
      <Content>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <LinkButton
              color="primary"
              variant="contained"
              startIcon={<CreateComponentIcon />}
              to="/awards/new"
            >
              Create
            </LinkButton>
          </Grid>
          <Grid item>
            <AwardsListComponent owned />
          </Grid>
          <Grid item>
            <AwardsListComponent />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
