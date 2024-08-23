/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  mockServices,
  startTestBackend,
  TestDatabaseId,
  TestDatabases,
} from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { StorageType } from '@tweedegolf/storage-abstraction';
import request from 'supertest';
import { awardsPlugin } from '../plugin';
import { getStorageClient } from './router';

describe('backend router', () => {
  const databases = TestDatabases.create({
    ids: ['SQLITE_3'],
  });
  async function makeTestServer(databaseId: TestDatabaseId) {
    const knex = await databases.init(databaseId);
    const { server } = await startTestBackend({
      features: [
        awardsPlugin,
        mockServices.rootConfig.factory({
          data: {
            awards: {
              storage: {
                s3: {
                  bucket: 'awards-bucket',
                  region: 'us-east-1',
                },
              },
            },
          },
        }),
        mockServices.database.mock({
          getClient: async () => knex,
        }).factory,
      ],
    });
    return server;
  }

  describe('GET /health', () => {
    it.each(databases.eachSupportedId())(
      'returns ok for %s',
      async databaseId => {
        const server = await makeTestServer(databaseId);
        const response = await request(server).get('/api/awards/health');
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ status: 'ok' });
      },
    );
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
  it('creates a GCS storage client with key file', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          gcs: {
            bucket: 'gs://my-bucket',
            keyFilename: 'path/to/keyFile.json',
          },
        },
      },
    });

    const storage = getStorageClient(config);
    expect(storage.getConfig()).toEqual({
      bucketName: 'gs://my-bucket',
      keyFilename: 'path/to/keyFile.json',
      type: StorageType.GCS,
    });
  });
  it('creates a GCS storage client from GOOGLE_APPLICATION_CREDENTIALS', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          gcs: {
            bucket: 'gs://my-bucket',
          },
        },
      },
    });

    const storage = getStorageClient(config);
    expect(storage.getConfig()).toEqual({
      bucketName: 'gs://my-bucket',
      type: StorageType.GCS,
    });
  });

  it('errors if multiple storage engines provided', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          s3: {},
          fs: {},
          gcs: {},
        },
      },
    });

    expect(() => getStorageClient(config)).toThrow(
      /Must specify exactly one storage engine.*/,
    );
  });

  // this allows for app-config overlays to cancel out engines specified in previous configs
  // e.g. app-config.yaml sets 'fs' but app-config.prod.yaml sets 's3', it can then set fs: null.
  it('allows multiple storage engines as long as all but one are null', () => {
    const config = new ConfigReader({
      awards: {
        storage: {
          fs: null,
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
