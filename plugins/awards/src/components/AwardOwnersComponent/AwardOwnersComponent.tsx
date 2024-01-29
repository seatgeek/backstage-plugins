/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import React from 'react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { awardsApiRef } from '../../api';
import useAsync from 'react-use/lib/useAsync';
import { isUserEntity } from '@backstage/catalog-model';
import { UserCollectionCard } from '../UserCollectionCard';

interface AwardOwnersComponentProps {
  uid: string;
}

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export const AwardOwnersComponent = ({ uid }: AwardOwnersComponentProps) => {
  const awardsApi = useApi(awardsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const {
    value: owners,
    loading,
    error,
  } = useAsync(async () => {
    const res = await awardsApi.getAwards(uid, '', [], []);
    if (res.length > 0) {
      const award = res[0];

      const ents = await catalogApi.getEntitiesByRefs({
        // TODO: Remove boolean filter this when the underlying API component is guaranteed not
        // to return lists with a blank element.
        entityRefs: award.owners.filter(nonNullable),
      });
      return ents.items.filter(nonNullable).filter(isUserEntity);
    }

    throw new Error(`Award with uid ${uid} does not exist`);
  }, [awardsApi]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  } else if (owners) {
    return (
      <UserCollectionCard users={owners} title={`Owners ${owners.length}`} />
    );
  }
  return <ResponseErrorPanel error={new Error('Unknown problem')} />;
};
