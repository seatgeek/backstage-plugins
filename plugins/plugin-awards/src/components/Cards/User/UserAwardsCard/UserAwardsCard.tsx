import {
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel
} from '@backstage/core-components';
import { Grid, Box, Tooltip } from '@material-ui/core';
import React from 'react';
import { awardsApiRef } from '../../../../api';
import { createRouteRef, useApi, useRouteRefParams } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';

import { getOrCreateGlobalSingleton } from '@backstage/version-bridge';
import { Award } from '@internal/plugin-awards-common';

// https://github.com/backstage/backstage/blob/77a7ef3fa500fcfb80bee21f971eee682a955655/plugins/catalog-react/src/routes.ts#L28
// https://github.com/backstage/backstage/blob/77a7ef3fa500fcfb80bee21f971eee682a955655/plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts#L31
// https://github.com/backstage/backstage/blob/77a7ef3fa500fcfb80bee21f971eee682a955655/plugins/catalog/src/components/CatalogEntityPage/CatalogEntityPage.tsx#L23
export const entityRouteRef = getOrCreateGlobalSingleton(
  'awards:entity-route-ref',
  () =>
    createRouteRef({
      id: 'catalog:entity',
      params: ['namespace', 'kind', 'name'],
    }),
);

// For a reference, check https://github.com/backstage/backstage/blob/77a7ef3fa500fcfb80bee21f971eee682a955655/plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.tsx
/** @public */
export const UserAwardsCard = () => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const awardsApiClient = useApi(awardsApiRef)

  const { value: awards, loading, error } = useAsync(async (): Promise<Award[]> => {
    return awardsApiClient.getAwards('', '', [], [`${kind}:${namespace}/${name}`])
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return (
    <InfoCard title='Awards'>
      <Grid container spacing={1} alignItems='center'>
          {(awards || []).map(award => {
            return (
              <Grid item>
                <Link to={`/awards/view/${award.uid}`}>
                  <Box alignItems="center" display="flex" flexDirection="column">
                      <Box>
                        <Tooltip title={award.name}>
                          <img src={award.image} height="50" width="100" alt={award.name} />
                        </Tooltip>
                      </Box>
                      {/* <Box sx={{ width: '100%', textAlign: 'center' }}>
                        {award.name}  
                      </Box> */}
                  </Box>
                </Link>
              </Grid>
            )
            })}
      </Grid>
    </InfoCard>
  )
}