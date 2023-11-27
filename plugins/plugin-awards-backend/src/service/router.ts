import { PluginDatabaseManager, errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { IdentityApi } from '@backstage/plugin-auth-node';
import { AuthenticationError, NotFoundError } from '@backstage/errors';
import { DatabaseAwardsStore } from '../database/awards';
import { Award } from '@internal/plugin-awards-common';

export interface RouterOptions {
  identity: IdentityApi,
  database: PluginDatabaseManager;
  logger: Logger;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { database, identity, logger } = options;

  const dbStore = await DatabaseAwardsStore.create({database: database});

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/', async (request, response) => {
    // Protecting the request
    await getUserRef(identity, request);
    
    console.log(request.query);
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

    let resp = await dbStore.search(uidQuery, nameQuery, ownersQuery, recipientsQuery);

    response.json(resp);
  })

  router.get('/:uid', async (request, response) => {
    // Protecting the request
    await getUserRef(identity, request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter
    let resp = await dbStore.search(uid, '', [], []);

    if (!resp) {
      throw new NotFoundError(uid);
    }

    response.json(resp);
  });

  router.put('/:uid', async (request, response) => {
    const userRef = await getUserRef(identity, request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter

    const res = await dbStore.search(uid, '', [], []);

    if (!res || res.length == 0) {
      throw new NotFoundError(uid);
    }

    const award: Award = res[0];

    if (!award.owners.includes(userRef)) {
      throw new Error('Unauthorized to update award');
    }

    console.log(request.body);
    let { name, description, image, owners, recipients } = request.body;

    const upd = await dbStore.update(uid, name, description, image, owners, recipients);

    response.json(upd);
  });

  router.delete('/:uid', async (request, response) => {
    const userRef = await getUserRef(identity, request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter

    const res = await dbStore.search(uid, '', [], []);

    if (!res || res.length == 0) {
      throw new NotFoundError(uid);
    }

    const award: Award = res[0];

    if (!award.owners.includes(userRef)) {
      throw new Error('Unauthorized to delete award');
    }

    response.json(dbStore.delete(uid));
  });


  router.post('/', async (request, response) => {
    // Just to protect the request
    await getUserRef(identity, request);

    const { name, description, image, owners, recipients } = request.body;

    let resp = await dbStore.add(
      name,
      description,
      image,
      owners,
      recipients,
    );

    response.json(resp)
  });

  router.use(errorHandler());
  return router;
}

async function getUserRef(identity: IdentityApi, request: any): Promise<string> {
  const user = await identity.getIdentity({ request: request });
  if (!user) {
    throw new AuthenticationError('Unauthorized');
  }
  const userIdentity = await identity.getIdentity({ request: request });
  const userIdRef = userIdentity?.identity.userEntityRef;
  if (userIdRef == undefined) {
    throw new AuthenticationError('No user entity ref');
  }
  return userIdRef;
}

