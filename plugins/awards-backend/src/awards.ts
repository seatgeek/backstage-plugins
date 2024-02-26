/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { NotFoundError } from '@backstage/errors';
import { Award, AwardInput } from '@seatgeek/backstage-plugin-awards-common';
import { Logger } from 'winston';
import { AwardsStore } from './database/awards';
import { AwardsNotifier } from './notifier';

export class Awards {
  private readonly db: AwardsStore;
  private readonly logger: Logger;
  private readonly notifier: AwardsNotifier;

  constructor(db: AwardsStore, notifier: AwardsNotifier, logger: Logger) {
    this.db = db;
    this.notifier = notifier;
    this.logger = logger.child({ class: 'Awards' });
    this.logger.debug('Constructed');
  }

  async get(uid: string): Promise<Award> {
    return await this.getAwardByUid(uid);
  }

  private async afterCreate(award: Award): Promise<void> {
    if (award.recipients.length > 0) {
      await this.notifier.notifyNewRecipients(award, award.recipients);
    }
  }

  async create(input: AwardInput): Promise<Award> {
    const award = await this.db.add(
      input.name,
      input.description,
      input.image,
      input.owners,
      input.recipients,
    );

    this.afterCreate(award).catch(e => {
      this.logger.error('Error running afterCreate action', e);
    });

    return award;
  }

  private async afterUpdate(curr: Award, previous: Award): Promise<void> {
    const newRecipients = curr.recipients.filter(
      recipient => !previous.recipients.includes(recipient),
    );

    if (newRecipients.length > 0) {
      await this.notifier.notifyNewRecipients(curr, newRecipients);
    }
  }

  async update(
    identityRef: string,
    uid: string,
    input: AwardInput,
  ): Promise<Award> {
    const award = await this.getAwardByUid(uid);

    if (!award.owners.includes(identityRef)) {
      throw new Error('Unauthorized to update award');
    }

    const updated = await this.db.update(
      uid,
      input.name,
      input.description,
      input.image,
      input.owners,
      input.recipients,
    );

    this.afterUpdate(updated, award).catch(e => {
      this.logger.error('Error running afterUpdate action', e);
    });

    return updated;
  }

  async delete(identityRef: string, uid: string): Promise<boolean> {
    const award = await this.getAwardByUid(uid);

    if (!award.owners.includes(identityRef)) {
      throw new Error('Unauthorized to delete award');
    }

    return await this.db.delete(uid);
  }

  private async getAwardByUid(uid: string): Promise<Award> {
    const res = await this.db.search(uid, '', [], []);

    if (!res || res.length === 0) {
      throw new NotFoundError(uid);
    }

    return res[0];
  }
}
