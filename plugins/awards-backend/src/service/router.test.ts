/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { DatabaseManager, getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import {
  BackstageIdentityResponse,
  IdentityApiGetIdentityRequest,
} from '@backstage/plugin-auth-node';
import { StorageType } from '@tweedegolf/storage-abstraction';
import express from 'express';
import { Knex } from 'knex';
import request from 'supertest';
import { createRouter, getStorageClient } from './router';

// Good references for this:
// https://github.com/backstage/backstage/blob/0c930f8df1f2acb4a0af400e8e31cae354973af4/plugins/tech-insights-backend/src/service/router.test.ts
// https://github.com/backstage/backstage/blob/0c930f8df1f2acb4a0af400e8e31cae354973af4/plugins/playlist-backend/src/service/router.test.ts#L112
describe('backend router', () => {
  let app: express.Express;
  let db: Knex;

  const getIdentity = jest.fn();
  getIdentity.mockImplementation(
    async ({
      request: _request,
    }: IdentityApiGetIdentityRequest): Promise<
      BackstageIdentityResponse | undefined
    > => {
      return {
        identity: {
          userEntityRef: 'user:default/guest',
          ownershipEntityRefs: [],
          type: 'user',
        },
        token: 'token',
      };
    },
  );

  beforeEach(async () => {
    // Need to do this to avoid using @backstage/backend-test-utils and run into
    // a conflict with the knex import from the plugin.
    // This means that the tests will run only on SQLite.
    const createDatabaseManager = async () =>
      DatabaseManager.fromConfig(
        new ConfigReader({
          backend: {
            database: {
              client: 'better-sqlite3',
              connection: ':memory:',
            },
          },
        }),
      ).forPlugin('awards');
    const dbm = await createDatabaseManager();
    db = await dbm.getClient();
    const router = await createRouter({
      config: new ConfigReader({
        awards: {
          storage: {
            s3: {
              region: 'us-east-1',
              bucket: 'awards-bucket',
            },
          },
        },
      }),
      logger: getVoidLogger(),
      identity: { getIdentity },
      database: dbm,
      discovery: {
        getBaseUrl: jest.fn().mockResolvedValue('/'),
        getExternalBaseUrl: jest.fn().mockResolvedValue('/'),
      },
      tokenManager: {
        authenticate: jest.fn(),
        getToken: jest.fn().mockResolvedValue({ token: 'token' }),
      },
    });
    app = express().use(router);

    jest.resetAllMocks();
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});

describe('getStorageClient', () => {
  it('creates a fs storage client', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          fs: {
            directory: 'my-directory',
          },
        },
      },
    });
    const storage = getStorageClient(config);
    expect(storage.getConfig()).toEqual({
      type: StorageType.LOCAL,
      bucketName: 'my-directory',
      directory: 'my-directory',
      mode: 755,
    });
  });
  it('creates an s3 storage client', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          s3: {
            bucket: 'my-bucket',
            region: 'us-east-1',
            accessKey: 'my-access-key',
            secretKey: 'my-secret-key',
            endpoint: '127.0.0.1',
          },
        },
      },
    });

    const storage = getStorageClient(config);
    expect(storage.getConfig()).toEqual({
      accessKeyId: 'my-access-key',
      secretAccessKey: 'my-secret-key',
      endpoint: '127.0.0.1',
      bucketName: 'my-bucket',
      region: 'us-east-1',
      type: StorageType.S3,
    });
  });

  it('errors if multiple storage engines provided', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          s3: {},
          fs: {},
        },
      },
    });

    expect(() => getStorageClient(config)).toThrow(
      /Must specify exactly one storage engine.*/,
    );
  });

  it('errors if no storage engines provided', () => {
    const config = new ConfigReader({
      awards: {
        storage: {},
      },
    });

    expect(() => getStorageClient(config)).toThrow(
      /Must specify exactly one storage engine.*/,
    );
  });

  it('errors if unknown storage engine provides', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          carrierPidgeon: {},
        },
      },
    });

    expect(() => getStorageClient(config)).toThrow(
      /Invalid storage engine type.*/,
    );
  });
});
