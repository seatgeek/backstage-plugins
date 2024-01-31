/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Box, Grid, Tooltip } from '@material-ui/core';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { awardsApiRef } from '../../../../api';

import { stringifyEntityRef } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Award } from '@seatgeek/backstage-plugin-awards-common';

// For a reference, check https://github.com/backstage/backstage/blob/77a7ef3fa500fcfb80bee21f971eee682a955655/plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.tsx
/** @public */
export const UserAwardsCard = () => {
  const { entity } = useEntity();
  const awardsApiClient = useApi(awardsApiRef);

  const {
    value: awards,
    loading,
    error,
  } = useAsync(async (): Promise<Award[]> => {
    return awardsApiClient.getAwards('', '', [], [stringifyEntityRef(entity)]);
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return (
    <InfoCard title="Awards">
      <Grid container spacing={1} alignItems="center">
        {(awards || []).map(award => {
          return (
            <Grid item>
              <Link to={`/awards/view/${award.uid}`}>
                <Box alignItems="center" display="flex" flexDirection="column">
                  <Box>
                    <Tooltip title={award.name}>
                      <img
                        src={award.image}
                        height="50"
                        width="150"
                        alt={award.name}
                      />
                    </Tooltip>
                  </Box>
                </Box>
              </Link>
            </Grid>
          );
        })}
      </Grid>
    </InfoCard>
  );
};
