/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { S3Client } from '@aws-sdk/client-s3';
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import * as winston from 'winston';
import { Awards } from './awards';
import { AwardsStore } from './database/awards';
import { AwardsNotifier } from './notifier';

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

describe('Awards', () => {
  let db: jest.Mocked<AwardsStore>;
  let notifier: jest.Mocked<AwardsNotifier>;
  let s3: jest.Mocked<S3Client>;
  let awards: Awards;

  beforeEach(() => {
    db = {
      search: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    notifier = {
      notifyNewRecipients: jest.fn(),
    };
    s3 = {
      send: jest.fn(),
    } as unknown as jest.Mocked<S3Client>;
    const logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
    awards = new Awards(db, notifier, s3, 'backstage-awards', logger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('should notify new recipients', async () => {
      const award = makeAward();
      db.add = jest.fn().mockResolvedValue(award);
      const result = await awards.create({
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
      expect(notifier.notifyNewRecipients).toHaveBeenCalledWith(award, [
        'user:default/peyton-manning',
        'user:default/serena-williams',
      ]);
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
      expect(notifier.notifyNewRecipients).toHaveBeenCalledWith(updated, [
        'user:default/megan-rapinoe',
        'user:default/adrianne-lenker',
      ]);
    });
  });
});
