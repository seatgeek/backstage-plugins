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

describe('Awards', () => {
  let db: jest.Mocked<AwardsStore>;
  let notifications: jest.Mocked<NotificationsGateway>;
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
    const logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
    awards = new Awards(db, notifications, logger);

    jest.resetAllMocks();
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
        ['user:default/megan-rapinoe', 'user:default/adrianne-lenker'],
      );
    });
  });
});
