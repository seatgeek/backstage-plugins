/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { parseEntityRef } from '@backstage/catalog-model';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import {
  alertApiRef,
  identityApiRef,
  useApi,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Button,
  Grid,
  InputLabel,
  TextField,
  Typography,
  styled,
} from '@material-ui/core';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DeleteIcon from '@material-ui/icons/Delete';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { awardsApiRef } from '../../api';
import { editRouteRef } from '../../routes';

const emptyAward: Award = {
  uid: '',
  name: 'Award Name',
  description: 'Award description',
  image: '',
  owners: [],
  recipients: [],
};

type AwardEditCardProps = {
  award: Award;
};

type User = {
  name: string;
  ref: string;
};

export const AwardEditCard = ({ award = emptyAward }: AwardEditCardProps) => {
  const alertApi = useApi(alertApiRef);
  const awardsApi = useApi(awardsApiRef);
  const catalogApi = useApi(catalogApiRef);
  const navigate = useNavigate();

  const [awardUid, _] = useState(award.uid);
  const [awardName, setAwardName] = useState(award.name);
  const [awardDescription, setAwardDescription] = useState(award.description);

  const [awardImage, setAwardImage] = useState(award.image);
  const [awardOwners, setAwardOwners] = useState(
    award.owners
      .filter(m => !isEmpty(m))
      .map(e => {
        const { name } = parseEntityRef(e);
        return {
          name: name,
          ref: e,
        };
      }),
  );
  const [awardRecipients, setAwardRecipients] = useState(
    award.recipients
      .filter(m => !isEmpty(m))
      .map(e => {
        const { name } = parseEntityRef(e);
        return {
          name: name,
          ref: e,
        };
      }),
  );
  const { value: allUsers } = useAsync(async () => {
    // Fetching all users in the catalog.
    // TODO: memoize this
    const entities = await catalogApi.getEntities({
      filter: [{ kind: 'user' }],
    });
    const users: User[] = entities.items.map(entity => {
      return {
        name: entity.metadata.name,
        ref: `${entity.kind.toLowerCase()}:${entity.metadata.namespace}/${
          entity.metadata.name
        }`,
      };
    });
    return users;
  });

  async function saveAward() {
    try {
      const newAward = {
        uid: awardUid,
        name: awardName,
        description: awardDescription,
        image: awardImage,
        owners: awardOwners.map(e => e.ref),
        recipients: awardRecipients.map(e => e.ref),
      };

      const operation = newAward.uid === '' ? 'Added new' : 'Updated';

      const res = await awardsApi.save(newAward);

      if (res !== undefined) {
        alertApi.post({
          message: `${operation} award - ${res?.name} (${res?.uid})`,
          severity: 'success',
          display: 'transient',
        });
        navigate(`/awards/view/${res.uid}`);
      } else {
        throw new Error('Error saving award');
      }
    } catch (e) {
      alertApi.post({
        message: String(e),
        severity: 'error',
        display: 'transient',
      });
    }
  }

  async function deleteAward() {
    try {
      const res = await awardsApi.delete(awardUid);

      if (res) {
        alertApi.post({
          message: `Removed award - ${awardName} (${awardUid})`,
          severity: 'success',
          display: 'transient',
        });

        navigate('/awards');
      } else {
        throw new Error('Error removing award');
      }
    } catch (e) {
      alertApi.post({
        message: String(e),
        severity: 'error',
        display: 'transient',
      });
    }
  }

  async function handleFileInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (!(event.target.files && event.target.files.length > 0)) {
      return;
    }
    const file = event.target.files[0];
    try {
      const res = await awardsApi.uploadImage(file);
      setAwardImage(res.location);
    } catch (e) {
      alertApi.post({
        message: String(e),
        severity: 'error',
        display: 'transient',
      });
    }
  }

  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

  return (
    <InfoCard
      title={award.uid === '' ? 'Create new award' : `Update award ${awardUid}`}
    >
      <Typography variant="body1">
        <Stack spacing={2}>
          <TextField
            required
            variant="outlined"
            label="Name"
            onChange={e => setAwardName(e.target.value)}
            value={awardName}
          />
          <TextField
            required
            multiline
            variant="outlined"
            label="Description"
            minRows="4"
            onChange={e => setAwardDescription(e.target.value)}
            value={awardDescription}
          />
          <Grid container alignItems="center">
            <Grid item>
              <InputLabel>Award logo (3:1 aspect ratio)</InputLabel>
            </Grid>
            <Grid item>
              <img alt="" src={awardImage} height="200" width="600" />
            </Grid>
            <Grid item>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
              >
                Upload logo
                <VisuallyHiddenInput
                  required
                  type="file"
                  onChange={handleFileInputChange}
                />
              </Button>
            </Grid>
          </Grid>
          <Autocomplete
            multiple
            options={allUsers || []}
            getOptionLabel={option => option.name}
            onChange={(__, v) => setAwardOwners(v)}
            value={awardOwners}
            renderInput={params => (
              <TextField
                {...params}
                variant="outlined"
                label="Owners"
                placeholder="Owners"
              />
            )}
          />
          <Autocomplete
            multiple
            options={allUsers || []}
            getOptionLabel={option => option.name}
            onChange={(__, v) => setAwardRecipients(v)}
            value={awardRecipients}
            renderInput={params => (
              <TextField
                {...params}
                variant="outlined"
                label="Recipients"
                placeholder="Recipients"
              />
            )}
          />
          <br />
          <Button
            color="primary"
            variant="contained"
            startIcon={<CreateComponentIcon />}
            onClick={saveAward}
          >
            Save
          </Button>
          <Button
            color="secondary"
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={deleteAward}
          >
            Delete
          </Button>
        </Stack>
      </Typography>
    </InfoCard>
  );
};

export const AwardsEditComponent = ({ create = false }) => {
  const awardsApi = useApi(awardsApiRef);
  const identityApi = useApi(identityApiRef);
  const { uid } = useRouteRefParams(editRouteRef);

  const { value, loading, error } = useAsync(async (): Promise<Award> => {
    const userRef = (await identityApi.getBackstageIdentity()).userEntityRef;
    emptyAward.owners = [userRef];

    if (create) {
      return emptyAward;
    }

    const res = await awardsApi.getAwards(uid, '', [], []);
    if (res.length > 0) {
      return res[0];
    }
    return emptyAward;
  }, [awardsApi]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <AwardEditCard award={value || emptyAward} />;
};
