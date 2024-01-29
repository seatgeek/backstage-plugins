/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { createApiRef } from '@backstage/core-plugin-api';
import { Award } from '@seatgeek/plugin-awards-common';

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
