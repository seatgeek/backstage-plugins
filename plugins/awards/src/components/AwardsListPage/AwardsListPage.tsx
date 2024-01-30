/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { Content, Header, LinkButton, Page } from '@backstage/core-components';
import { Grid } from '@material-ui/core';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import React from 'react';

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
