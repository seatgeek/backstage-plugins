/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { SystemEntity, UserEntity } from '@backstage/catalog-model';
import { Gitlab } from '@gitbeaker/rest';
import * as winston from 'winston';
import { GitlabUserProcessor } from './GitlabUserProcessor';

jest.mock('@gitbeaker/rest', () => {
  return {
    Gitlab: jest.fn().mockImplementation(() => {
      return {
        Users: {
          all: jest.fn().mockResolvedValue([
            {
              id: 123,
              email: 'rufus@seatgeek.com',
              username: 'rufus',
            },
            {
              id: 999,
              email: 'taylor@seatgeek.com',
              username: 'taylor',
            },
          ]),
          // mock other methods as needed
        },
      };
    }),
  };
});

describe('GitlabUserProcessor', () => {
  let processor: GitlabUserProcessor;
  let mockGitlabClient: InstanceType<typeof Gitlab>;
  let mockLogger: winston.Logger;

  beforeEach(() => {
    mockGitlabClient = new Gitlab({ token: `token` });
    mockLogger = winston.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
          level: 'debug',
        }),
      ],
    });

    processor = new GitlabUserProcessor(mockGitlabClient, mockLogger);

    // Reset the mocks before each test
    jest.clearAllMocks();
  });

  test('should add gitlab info', async () => {
    const before: UserEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'User',
      metadata: {
        name: 'rufus',
      },
      spec: {
        profile: {
          email: 'rufus@seatgeek.com',
        },
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
          'gitlab.com/user_id': '123',
          'gitlab.com/username': 'rufus',
        },
      },
      spec: {
        profile: {
          email: 'rufus@seatgeek.com',
        },
      },
    };

    expect(result).toEqual(expected);
    expect(mockGitlabClient.Users.all).toHaveBeenCalled();

    // make sure that the slack users are only fetched once
    await processor.postProcessEntity(before, {} as any, () => {});
    expect(mockGitlabClient.Users.all).toHaveBeenCalledTimes(1);
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
    expect(mockGitlabClient.Users.all).not.toHaveBeenCalled();
  });
});
