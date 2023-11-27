import { Avatar, Link, InfoCard, Progress, ResponseErrorPanel } from "@backstage/core-components"
import { useApi } from "@backstage/core-plugin-api";
import { Box, Grid, Typography } from "@material-ui/core";
import React from "react";
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { awardsApiRef } from "../../api";
import useAsync from "react-use/lib/useAsync";
import { isEmpty } from "lodash";

interface AwardRecipientsCardProps {
  recipients: any[];
}

// Some reference at https://github.com/backstage/backstage/blob/60e3b563f7f3d76e1001366aaa36360d999c64a2/plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.tsx
export const AwardRecipientsCard = ({ recipients }: AwardRecipientsCardProps) => {

  return (
    <InfoCard title={`Recipients (${recipients.length})`}>
    <Typography variant="body1">
      <Grid container spacing={3}>
      {(recipients || []).map(recipient => {
        const displayName = recipient.profile?.displayName ?? recipient.metadata.name;
        const email = recipient.profile?.email ? `(${recipient.profile.email})` : '';
        const { namespace, name } = recipient.metadata;
        const kind = recipient.kind.toLowerCase();

        return (
          <Grid item>
            <Box alignItems="center" display="flex" flexDirection="column">
              <Avatar displayName={displayName} picture={recipient.profile?.picture} />
              <Link to={`/catalog/${namespace}/${kind}/${name}`}>
                <Typography>{displayName} {email}</Typography>
              </Link>
            </Box>
          </Grid>
      );
      })}
      </Grid>          
    </Typography>
    </InfoCard>
    );
}

interface AwardRecipientsComponentProps {
  uid: string;
}

export const AwardRecipientsComponent = ({uid}: AwardRecipientsComponentProps) => {
  const awardsApi = useApi(awardsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const { value, loading, error } = useAsync(async (): Promise<any[]> => {
    const res = await awardsApi.getAwards(uid, '', [], []);
    if (res.length > 0) {
      const award = res[0];
      
      // TODO: Remove this fix when the underlying API client stops returning
      // lists with a blank element.
      award.recipients = award.recipients.filter((recipient) => !isEmpty(recipient));

      let ents = await catalogApi.getEntitiesByRefs({entityRefs: award.recipients});
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
    return <AwardRecipientsCard recipients={value}/>;
  } else {
    return <ResponseErrorPanel error={new Error('Unknown problem')} />;
  }
};
