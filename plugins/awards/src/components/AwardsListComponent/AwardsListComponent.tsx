import React from 'react';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
  Link,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { Award } from '@internal/plugin-awards-common';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { Box } from '@material-ui/core';
import { awardsApiRef } from '../../api';
import { isEmpty } from 'lodash';

type DenseTableProps = {
  awards: Award[];
  title: string;
  edit: boolean;
};

export const DenseTable = ({ awards, title, edit }: DenseTableProps) => {
  const columns: TableColumn[] = [
    { title: 'Award', field: 'award' },
    { title: 'Description', field: 'description' },
    { title: 'Owners', field: 'owners' },
    { title: 'Recipients', field: 'recipients' },
  ];

  const action = edit ? 'edit' : 'view';

  const data = awards.map(award => {
    let ownersText = 'No owners';
    let recipientsText = 'No recipients';

    // TODO: Need to filter this at the API level then remove this filter.
    award.owners = award.owners.filter(owner => !isEmpty(owner));
    award.recipients = award.recipients.filter(
      recipient => !isEmpty(recipient),
    );

    switch (award.owners.length) {
      case 0:
        break;
      case 1:
        ownersText = '1 owner';
        break;
      default:
        ownersText = `${award.owners.length} owners`;
        break;
    }

    switch (award.recipients.length) {
      case 0:
        break;
      case 1:
        recipientsText = '1 recipient';
        break;
      default:
        recipientsText = `${award.recipients.length} recipients`;
        break;
    }

    return {
      award: (
        <Link to={`/awards/${action}/${award.uid}`}>
          <Box alignItems="center" display="flex" flexDirection="column">
            <Box>
              <img alt="" src={award.image} height="50" width="100" />
            </Box>
            <Box sx={{ width: '100%', textAlign: 'center' }}>{award.name}</Box>
          </Box>
        </Link>
      ),
      description: award.description,
      owners: <Link to={`/awards/${action}/${award.uid}`}>{ownersText}</Link>,
      recipients: (
        <Link to={`/awards/${action}/${award.uid}`}>{recipientsText}</Link>
      ),
    };
  });

  return (
    <Table
      title={title}
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
    />
  );
};

export const AwardsListComponent = ({ owned = false }) => {
  const title = owned ? 'Managed by me' : 'All Awards';
  const awardsApi = useApi(awardsApiRef);
  const identityApi = useApi(identityApiRef);

  const { value, loading, error } = useAsync(async (): Promise<Award[]> => {
    const identityRef = await identityApi.getBackstageIdentity();
    const userRef = owned ? identityRef.userEntityRef : '';
    return await awardsApi.getAwards('', '', [userRef], []);
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <DenseTable edit={owned} title={title} awards={value || []} />;
};
