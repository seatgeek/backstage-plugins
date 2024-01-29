import { UserEntity } from '@backstage/catalog-model';
import { Avatar, InfoCard } from '@backstage/core-components';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { Box, Grid, Typography } from '@material-ui/core';
import React from 'react';

interface UserCollectionCardProps {
  users: UserEntity[];
  title: string;
}

export const UserCollectionCard = ({
  users,
  title,
}: UserCollectionCardProps) => {
  return (
    <InfoCard title={title}>
      <Typography variant="body1">
        <Grid container spacing={3}>
          {(users || []).map(user => {
            const displayName =
              user.spec?.profile?.displayName || user.metadata.name;
            return (
              <Grid item>
                <Box alignItems="center" display="flex" flexDirection="column">
                  <Avatar
                    displayName={displayName}
                    picture={user.spec.profile?.picture}
                  />
                  <EntityRefLink entityRef={user} title={displayName} />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Typography>
    </InfoCard>
  );
};
