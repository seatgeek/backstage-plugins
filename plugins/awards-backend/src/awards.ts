/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { TokenManager } from '@backstage/backend-common';
import { CatalogClient } from '@backstage/catalog-client';
import { isUserEntity } from '@backstage/catalog-model';
import { NotFoundError } from '@backstage/errors';
import { Award, AwardInput } from '@seatgeek/backstage-plugin-awards-common';
import { IncomingMessage } from 'http';
import sizeOf from 'image-size';
import { v4 as uuid } from 'uuid';
import { Logger } from 'winston';
import { AwardsStore } from './database/awards';
import { NotificationsGateway } from './notifications/notifications';

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// todo: make this configurable
const BUCKET = 'backstage-awards';

const extensionByMimetype: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

export class Awards {
  private readonly db: AwardsStore;
  private readonly logger: Logger;
  private readonly notifications: NotificationsGateway;
  private readonly catalogClient: CatalogClient;
  private readonly tokenManager: TokenManager;
  private readonly s3: S3Client;

  constructor(
    db: AwardsStore,
    notifications: NotificationsGateway,
    catalogClient: CatalogClient,
    tokenManager: TokenManager,
    s3: S3Client,
    logger: Logger,
  ) {
    this.db = db;
    this.notifications = notifications;
    this.logger = logger.child({ class: 'Awards' });
    this.catalogClient = catalogClient;
    this.tokenManager = tokenManager;
    this.s3 = s3;
    this.logger.debug('Constructed');
  }

  async get(uid: string): Promise<Award> {
    return await this.getAwardByUid(uid);
  }

  private async notifyNewRecipients(
    identityRef: string,
    award: Award,
    newRecipients: string[],
  ): Promise<void> {
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
      award,
      users,
    );
  }

  private async afterCreate(identityRef: string, award: Award): Promise<void> {
    if (award.recipients.length > 0) {
      await this.notifyNewRecipients(identityRef, award, award.recipients);
    }
  }

  async create(identityRef: string, input: AwardInput): Promise<Award> {
    const award = await this.db.add(
      input.name,
      input.description,
      input.image,
      input.owners,
      input.recipients,
    );

    this.afterCreate(identityRef, award).catch(e => {
      this.logger.error('Error running afterCreate action', e);
    });

    return award;
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
      await this.notifyNewRecipients(identityRef, curr, newRecipients);
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

  async uploadLogo(image: Buffer, mimeType: string): Promise<string> {
    // validate image
    const { width, height } = sizeOf(image);
    if (!width || !height) {
      throw new Error('Could not read image metadata');
    }
    validateAspectRatio(width, height);
    validateImageSize(width, height);
    validateImageFormat(mimeType);

    // upload image to s3
    const key = `${uuid()}.${extensionByMimetype[mimeType]}`;
    await this.s3.send(
      new PutObjectCommand({
        Body: image,
        ContentType: mimeType,
        // todo: make this configurable
        Bucket: BUCKET,
        Key: key,
      }),
    );
    return key;
  }

  async getLogo(
    key: string,
  ): Promise<{ body: IncomingMessage; contentType: string } | null> {
    const resp = await this.s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    if (!resp.Body || !resp.ContentType) {
      return null;
    }

    return {
      body: resp.Body as IncomingMessage,
      contentType: resp.ContentType,
    };
  }
}

function validateAspectRatio(width: number, height: number): void {
  if (width / height !== 3) {
    throw new Error('Image must have a 3:1 aspect ratio');
  }
}

function validateImageSize(width: number, _: number): void {
  if (width < 100 || width > 1000) {
    throw new Error('Image width must be between 100 and 1000 pixels');
  }
}

function validateImageFormat(mimeType: string): void {
  if (!(mimeType in extensionByMimetype)) {
    throw new Error(
      `Image must be of format [${Object.keys(extensionByMimetype).join(
        ', ',
      )}], got ${mimeType}`,
    );
  }
}
