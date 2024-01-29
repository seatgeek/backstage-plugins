import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import React from 'react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { awardsApiRef } from '../../api';
import useAsync from 'react-use/lib/useAsync';
import { UserCollectionCard } from '../UserCollectionCard';
import { isUserEntity } from '@backstage/catalog-model';

interface AwardRecipientsComponentProps {
  uid: string;
}

export const AwardRecipientsComponent = ({
  uid,
}: AwardRecipientsComponentProps) => {
  const awardsApi = useApi(awardsApiRef);
  const catalogApi = useApi(catalogApiRef);

  function nonNullable<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
  }

  const {
    value: recipients,
    loading,
    error,
  } = useAsync(async (): Promise<any[]> => {
    const res = await awardsApi.getAwards(uid, '', [], []);
    if (res.length > 0) {
      const award = res[0];

      const ents = await catalogApi.getEntitiesByRefs({
        // TODO: Remove boolean filter this when the underlying API component is guaranteed not
        // to return lists with a blank element.
        entityRefs: award.recipients.filter(nonNullable),
      });
      return ents.items.filter(nonNullable).filter(isUserEntity);
    }

    throw new Error(`Award with uid ${uid} does not exist`);
  }, [awardsApi]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  } else if (recipients) {
    return (
      <UserCollectionCard
        users={recipients}
        title={`Recipients ${recipients.length}`}
      />
    );
  }
  return <ResponseErrorPanel error={new Error('Unknown problem')} />;
};
