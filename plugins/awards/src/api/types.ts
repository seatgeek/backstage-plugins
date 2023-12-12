import { createApiRef } from '@backstage/core-plugin-api';
import { Award } from '@internal/plugin-awards-common';

export const awardsApiRef = createApiRef<AwardsApi>({
  id: 'plugin.awards.service',
});

export type AwardsApi = {
  getAwards: (
    uid: string,
    name: string,
    owners: string[],
    recipients: string[],
  ) => Promise<Award[]>;
  save: (award: Award) => Promise<Award>;
  delete: (uid: string) => Promise<boolean>;
};
