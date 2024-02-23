/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { PluginDatabaseManager, errorHandler } from '@backstage/backend-common';
import { AuthenticationError } from '@backstage/errors';
import { IdentityApi } from '@backstage/plugin-auth-node';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Awards } from '../awards';
import { DatabaseAwardsStore } from '../database/awards';

export interface RouterOptions {
  identity: IdentityApi;
  database: PluginDatabaseManager;
  logger: Logger;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { database, identity, logger } = options;

  const dbStore = await DatabaseAwardsStore.create({ database: database });
  const awardsApp = new Awards(dbStore, logger);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/', async (request, response) => {
    // Protecting the request
    await getUserRef(identity, request);

    logger.debug(request.query);
    const { uid, name, owners, recipients } = request.query;

    let uidQuery: string = '';
    let nameQuery: string = '';
    let ownersQuery: string[] = [];
    let recipientsQuery: string[] = [];

    if (uid) {
      uidQuery = uid.toString();
    }

    if (name) {
      nameQuery = name.toString();
    }

    if (owners) {
      ownersQuery = owners.toString().split(',');
    }

    if (recipients) {
      recipientsQuery = recipients.toString().split(',');
    }

    const resp = await dbStore.search(
      uidQuery,
      nameQuery,
      ownersQuery,
      recipientsQuery,
    );

    response.json(resp);
  });

  router.get('/:uid', async (request, response) => {
    // Protecting the request
    await getUserRef(identity, request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter

    const award = await awardsApp.get(uid);
    response.json(award);
  });

  router.put('/:uid', async (request, response) => {
    const userRef = await getUserRef(identity, request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter
    // TODO: validate request.body

    const upd = await awardsApp.update(userRef, uid, request.body);

    response.json(upd);
  });

  router.delete('/:uid', async (request, response) => {
    const userRef = await getUserRef(identity, request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter

    const result = await awardsApp.delete(userRef, uid);

    response.json(result);
  });

  router.post('/', async (request, response) => {
    // Just to protect the request
    await getUserRef(identity, request);

    const award = await awardsApp.create(request.body);

    response.json(award);
  });

  router.use(errorHandler());
  return router;
}

async function getUserRef(
  identity: IdentityApi,
  request: any,
): Promise<string> {
  const user = await identity.getIdentity({ request: request });
  if (!user) {
    throw new AuthenticationError('Unauthorized');
  }
  const userIdentity = await identity.getIdentity({ request: request });
  const userIdRef = userIdentity?.identity.userEntityRef;
  if (userIdRef === undefined) {
    throw new AuthenticationError('No user entity ref');
  }
  return userIdRef;
}
