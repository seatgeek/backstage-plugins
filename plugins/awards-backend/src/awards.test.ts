/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { TokenManager } from '@backstage/backend-common';
import {
  CatalogClient,
  CatalogRequestOptions,
  GetEntitiesByRefsRequest,
} from '@backstage/catalog-client';
import { UserEntity } from '@backstage/catalog-model';
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import * as winston from 'winston';
import { Awards } from './awards';
import { AwardsStore } from './database/awards';
import { NotificationsGateway } from './notifications/notifications';

const frank = 'user:default/frank-ocean';

function makeAward(): Award {
  return {
    uid: '123456',
    name: 'Test Award',
    description: 'This is a test award',
    image: 'image_data',
    owners: [frank],
    recipients: ['user:default/peyton-manning', 'user:default/serena-williams'],
  };
}

function makeUser(ref: string): UserEntity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: ref,
    },
    spec: {},
  };
}

describe('Awards', () => {
  let db: jest.Mocked<AwardsStore>;
  let notifications: jest.Mocked<NotificationsGateway>;
  let catalogClient: jest.Mocked<CatalogClient>;
  let tokenManager: jest.Mocked<TokenManager>;
  let awards: Awards;

  beforeEach(() => {
    db = {
      search: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    notifications = {
      notifyNewRecipientsAdded: jest.fn(),
    };
    tokenManager = {
      authenticate: jest.fn(),
      getToken: jest.fn().mockReturnValue({ token: 'mocked-token' }),
    };
    catalogClient = {
      getEntitiesByRefs: jest
        .fn()
        .mockImplementation(
          async (
            request: GetEntitiesByRefsRequest,
            _?: CatalogRequestOptions,
          ) => {
            return {
              items: request.entityRefs.map(makeUser),
            };
          },
        ),
    } as unknown as jest.Mocked<CatalogClient>;
    const logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
    awards = new Awards(db, notifications, catalogClient, tokenManager, logger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('should notify new recipients', async () => {
      const award = makeAward();
      db.add = jest.fn().mockResolvedValue(award);
      const result = await awards.create(frank, {
        name: award.name,
        description: award.description,
        image: award.image,
        owners: award.owners,
        recipients: award.recipients,
      });

      // wait for the afterCreate promises to complete
      await new Promise(process.nextTick);

      expect(result).toEqual(award);
      expect(db.add).toHaveBeenCalledWith(
        award.name,
        award.description,
        award.image,
        award.owners,
        award.recipients,
      );
      expect(notifications.notifyNewRecipientsAdded).toHaveBeenCalledWith(
        frank,
        award,
        [
          makeUser('user:default/peyton-manning'),
          makeUser('user:default/serena-williams'),
        ],
      );
    });
  });

  describe('update', () => {
    it('should notify new recipients', async () => {
      const award = makeAward();
      db.search = jest.fn().mockResolvedValue([award]);
      const updated = {
        ...award,
        recipients: [
          ...award.recipients,
          'user:default/megan-rapinoe',
          'user:default/adrianne-lenker',
        ],
      };
      db.update = jest.fn().mockResolvedValue(updated);
      const result = await awards.update(frank, award.uid, updated);

      // wait for the afterUpdate promises to complete
      await new Promise(process.nextTick);

      expect(result).toEqual(updated);
      expect(db.update).toHaveBeenCalledWith(
        updated.uid,
        updated.name,
        updated.description,
        updated.image,
        updated.owners,
        updated.recipients,
      );
      expect(notifications.notifyNewRecipientsAdded).toHaveBeenCalledWith(
        frank,
        updated,
        [
          makeUser('user:default/megan-rapinoe'),
          makeUser('user:default/adrianne-lenker'),
        ],
      );
    });
  });
});
