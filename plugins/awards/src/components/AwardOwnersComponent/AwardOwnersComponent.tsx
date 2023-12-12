import {
  Avatar,
  Link,
  InfoCard,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Box, Grid, Typography } from '@material-ui/core';
import React from 'react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { awardsApiRef } from '../../api';
import useAsync from 'react-use/lib/useAsync';
import { isEmpty } from 'lodash';

interface AwardOwnersCardProps {
  recipients: any[];
}

// Some reference at https://github.com/backstage/backstage/blob/60e3b563f7f3d76e1001366aaa36360d999c64a2/plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.tsx
export const AwardOwnersCard = ({
  recipients: owners,
}: AwardOwnersCardProps) => {
  return (
    <InfoCard title={`Owners (${owners.length})`}>
      <Typography variant="body1">
        <Grid container spacing={3}>
          {(owners || []).map(owner => {
            const displayName =
              owner.profile?.displayName ?? owner.metadata.name;
            const email = owner.profile?.email
              ? `(${owner.profile.email})`
              : '';
            const { namespace, name } = owner.metadata;
            const kind = owner.kind.toLowerCase();
            console.log(owner);
            return (
              <Grid item>
                <Box alignItems="center" display="flex" flexDirection="column">
                  <Avatar
                    displayName={displayName}
                    picture={owner.profile?.picture}
                  />
                  <Link to={`/catalog/${namespace}/${kind}/${name}`}>
                    <Typography>
                      {displayName} {email}
                    </Typography>
                  </Link>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Typography>
    </InfoCard>
  );
};

interface AwardOwnersComponentProps {
  uid: string;
}

export const AwardOwnersComponent = ({ uid }: AwardOwnersComponentProps) => {
  const awardsApi = useApi(awardsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const { value, loading, error } = useAsync(async (): Promise<any[]> => {
    const res = await awardsApi.getAwards(uid, '', [], []);
    if (res.length > 0) {
      const award = res[0];

      // TODO: Remove this when the underlying API component is guaranteed not
      // to return lists with a blank element.
      award.owners = award.owners.filter(owner => !isEmpty(owner));
      let ents = await catalogApi.getEntitiesByRefs({
        entityRefs: award.owners,
      });
      return ents.items;
    } else {
      throw new Error(`Award with uid ${uid} does not exist`);
    }
  }, [awardsApi]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  } else if (value) {
    return <AwardOwnersCard recipients={value} />;
  } else {
    return <ResponseErrorPanel error={new Error('Unknown problem')} />;
  }
};
