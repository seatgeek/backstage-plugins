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
import express from 'express';
import { Knex } from 'knex';
import request from 'supertest';
import { createRouter } from './router';

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
      logger: getVoidLogger(),
      identity: { getIdentity },
      database: dbm,
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
