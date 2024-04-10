/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { SystemEntity, UserEntity } from '@backstage/catalog-model';
import { WebClient } from '@slack/web-api';
import * as winston from 'winston';
import { SlackUserProcessor } from './SlackUserProcessor';

jest.mock('@slack/web-api', () => {
  return {
    WebClient: jest.fn().mockImplementation(() => {
      return {
        users: {
          list: jest.fn().mockResolvedValue({
            members: [
              {
                id: 'ID_rufus',
                profile: {
                  email: 'rufus@seatgeek.com',
                  image_192: 'rufus-192.png',
                },
              },
              {
                id: 'ID_taylor',
                profile: {
                  email: 'taylor@seatgeek.com',
                  image_192: 'taylor-192.png',
                },
              },
            ],
          }),
          // mock other methods as needed
        },
      };
    }),
  };
});

describe('SlackUserProcessor', () => {
  let processor: SlackUserProcessor;
  let mockSlackClient: WebClient;
  let mockLogger: winston.Logger;

  beforeEach(() => {
    mockSlackClient = new WebClient();
    mockLogger = winston.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
          level: 'debug',
        }),
      ],
    });

    processor = new SlackUserProcessor(mockSlackClient, mockLogger);

    // Reset the mocks before each test
    jest.clearAllMocks();
  });

  test.each([
    { beforePicture: '', expectedPicture: 'rufus-192.png' },
    {
      beforePicture: 'https://example.com/me.jpg',
      expectedPicture: 'https://example.com/me.jpg',
    },
  ])('should add slack info', async ({ beforePicture, expectedPicture }) => {
    const before: UserEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'User',
      metadata: {
        name: 'rufus',
      },
      spec: {
        profile: { email: 'rufus@seatgeek.com', picture: beforePicture },
      },
    };
    const result = await processor.postProcessEntity(
      before,
      {} as any,
      () => {},
    );

    const expected: UserEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'User',
      metadata: {
        name: 'rufus',
        annotations: {
          'slack.com/user_id': 'ID_rufus',
        },
      },
      spec: {
        profile: {
          picture: expectedPicture,
          email: 'rufus@seatgeek.com',
        },
      },
    };

    expect(result).toEqual(expected);
    expect(mockSlackClient.users.list).toHaveBeenCalled();

    // make sure that the slack users are only fetched once
    await processor.postProcessEntity(before, {} as any, () => {});
    expect(mockSlackClient.users.list).toHaveBeenCalledTimes(1);
  });

  test('should no op if not a user', async () => {
    const before: SystemEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'System',
      metadata: {
        name: 'rufus',
        annotations: {},
      },
      spec: {
        owner: 'rufus',
      },
    };

    const result = await processor.postProcessEntity(
      before,
      {} as any,
      () => {},
    );

    expect(result).toEqual(before);
    expect(mockSlackClient.users.list).not.toHaveBeenCalled();
  });
});
