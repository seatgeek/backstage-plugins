/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Grid, Typography } from '@material-ui/core';
import { Award } from '@seatgeek/plugin-awards-common';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { awardsApiRef } from '../../api';

interface AwardViewCardProps {
  award: Award;
}

export const AwardViewCard = ({ award }: AwardViewCardProps) => {
  return (
    <InfoCard title={award.name} subheader={award.uid}>
      <Typography variant="body1">
        <Grid container spacing={2}>
          <Grid item xs={6} md={2}>
            <img alt="" src={award.image} height="50" width="150" />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>{award.description}</Typography>
          </Grid>
        </Grid>
      </Typography>
    </InfoCard>
  );
};

interface AwardViewComponentProps {
  uid: string;
}

export const AwardViewComponent = ({ uid }: AwardViewComponentProps) => {
  const awardsApi = useApi(awardsApiRef);

  const { value, loading, error } = useAsync(async (): Promise<Award> => {
    const res = await awardsApi.getAwards(uid, '', [], []);
    if (res.length > 0) {
      return res[0];
    }
    throw new Error(`Award with uid ${uid} does not exist`);
  }, [awardsApi]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  } else if (value) {
    return <AwardViewCard award={value} />;
  }
  return <ResponseErrorPanel error={new Error('Unknown problem')} />;
};
