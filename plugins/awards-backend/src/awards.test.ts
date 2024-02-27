/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import { Storage } from '@tweedegolf/storage-abstraction';
import { Readable } from 'stream';
import * as winston from 'winston';
import { Awards } from './awards';
import { AwardsStore } from './database/awards';
import { AwardsNotifier } from './notifier';

const frank = 'user:default/frank-ocean';

async function streamToString(stream: Readable) {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

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
  let storage: jest.Mocked<Storage>;
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
    storage = {
      getFileAsStream: jest.fn(),
      addFile: jest.fn(),
    } as unknown as jest.Mocked<Storage>;
    const logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
    awards = new Awards(db, notifier, storage, logger);
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

  describe('getLogo', () => {
    it('should get a logo from storage', async () => {
      const key = 'logo.png';
      storage.getFileAsStream = jest.fn().mockResolvedValue({
        value: Readable.from('data'),
      });
      const out = await awards.getLogo(key);

      expect(out).not.toBeNull();
      expect(out!.contentType).toEqual('image/png');
      expect(await streamToString(out!.body)).toEqual('data');

      expect(storage.getFileAsStream).toHaveBeenCalledWith(key);
    });

    it('should fail on an unknown extension type', async () => {
      const key = 'logo.wav';

      await expect(awards.getLogo(key)).rejects.toThrow(
        'Unknown key extension wav',
      );
    });

    it('should fail when missing extension type', async () => {
      const key = 'logo';

      await expect(awards.getLogo(key)).rejects.toThrow(
        'Invalid key, missing extension',
      );
    });

    it('should return null when storage returns null', async () => {
      const key = 'logo.png';
      storage.getFileAsStream = jest.fn().mockResolvedValue({
        value: null,
      });
      const out = await awards.getLogo(key);

      expect(out).toBeNull();

      expect(storage.getFileAsStream).toHaveBeenCalledWith(key);
    });
  });
});
