/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { TokenManager } from '@backstage/backend-common';
import { CatalogClient } from '@backstage/catalog-client';
import { isUserEntity } from '@backstage/catalog-model';
import { NotFoundError } from '@backstage/errors';
import { Award, AwardInput } from '@seatgeek/backstage-plugin-awards-common';
import { Logger } from 'winston';
import { AwardsStore } from './database/awards';
import { NotificationsGateway } from './notifications/notifications';

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export class Awards {
  private readonly db: AwardsStore;
  private readonly logger: Logger;
  private readonly notifications: NotificationsGateway;
  private readonly catalogClient: CatalogClient;
  private readonly tokenManager: TokenManager;

  constructor(
    db: AwardsStore,
    notifications: NotificationsGateway,
    catalogClient: CatalogClient,
    tokenManager: TokenManager,
    logger: Logger,
  ) {
    this.db = db;
    this.notifications = notifications;
    this.logger = logger.child({ class: 'Awards' });
    this.catalogClient = catalogClient;
    this.tokenManager = tokenManager;
    this.logger.debug('Constructed');
  }

  async get(uid: string): Promise<Award> {
    return await this.getAwardByUid(uid);
  }

  async create(input: AwardInput): Promise<Award> {
    return await this.db.add(
      input.name,
      input.description,
      input.image,
      input.owners,
      input.recipients,
    );
  }

  private async afterUpdate(
    identityRef: string,
    curr: Award,
    previous: Award,
  ): Promise<void> {
    const newRecipients = curr.recipients.filter(
      recipient => !previous.recipients.includes(recipient),
    );

    if (newRecipients.length > 0) {
      const token = await this.tokenManager.getToken();
      const resp = await this.catalogClient.getEntitiesByRefs(
        {
          entityRefs: newRecipients,
        },
        token,
      );
      const users = resp.items.filter(nonNullable).filter(isUserEntity);
      await this.notifications.notifyNewRecipientsAdded(
        identityRef,
        curr,
        users,
      );
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

    this.afterUpdate(identityRef, updated, award).catch(e => {
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
