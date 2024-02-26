/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { S3Client } from '@aws-sdk/client-s3';
import {
  PluginDatabaseManager,
  TokenManager,
  errorHandler,
} from '@backstage/backend-common';
import { DiscoveryService } from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import { Config } from '@backstage/config';
import { AuthenticationError } from '@backstage/errors';
import { IdentityApi } from '@backstage/plugin-auth-node';
import express from 'express';
import fileUpload from 'express-fileupload';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Awards } from '../awards';
import { DatabaseAwardsStore } from '../database/awards';
import { SlackNotificationsGateway } from '../notifications/notifications';
import { MultiAwardsNotifier } from '../notifier';

export interface RouterOptions {
  identity: IdentityApi;
  database: PluginDatabaseManager;
  logger: Logger;
  config: Config;
  discovery: DiscoveryService;
  tokenManager: TokenManager;
}

function getS3Client(config: Config): S3Client {
  const region = config.getString('awards.s3.region');

  // for local dev
  const endpoint = config.getOptionalString('awards.s3.endpoint');

  // credentials
  const accessKey = config.getOptionalString('awards.s3.accessKey');
  const secretKey = config.getOptionalString('awards.s3.secretKey');
  const sessionToken = config.getOptionalString('awards.s3.sessionToken');
  let credentials = undefined;
  if (accessKey && secretKey && sessionToken) {
    credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      sessionToken,
    };
  }

  return new S3Client({
    endpoint,
    region,
    credentials,
  });
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, database, identity, logger } = options;

  const catalogClient = new CatalogClient({
    discoveryApi: options.discovery,
  });
  const notifier = new MultiAwardsNotifier(
    [],
    catalogClient,
    options.tokenManager,
  );
  const slack = SlackNotificationsGateway.fromConfig(config);
  if (slack) {
    notifier.addNotificationsGateway(slack);
  }
  const dbStore = await DatabaseAwardsStore.create({ database: database });
  const s3 = getS3Client(config);
  const bucket = config.getString('awards.s3.bucket');

  const awardsApp = new Awards(dbStore, notifier, s3, bucket, logger);

  const router = Router();
  router.use(express.json());
  router.use(fileUpload());

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
    await getUserRef(identity, request);

    const award = await awardsApp.create(request.body);

    response.json(award);
  });

  router.post('/logos/upload', async (request, response) => {
    await getUserRef(identity, request);

    if (!request.files) {
      response.status(400).send('No files were uploaded.');
      return;
    }
    const logo = request.files.file;
    if (Array.isArray(logo)) {
      response.status(400).send('Must only upload one file.');
      return;
    }

    const key = await awardsApp.uploadLogo(logo.data, logo.mimetype);

    const apiUrl = await options.discovery.getExternalBaseUrl('awards');
    response.status(201).json({
      location: `${apiUrl}/logos/${key}`,
    });
  });

  router.get('/logos/:key', async (request, response) => {
    const key = request.params.key;
    const image = await awardsApp.getLogo(key);
    if (!image) {
      response.status(404).send('Not found');
      return;
    }

    response.setHeader('Content-Type', image.contentType);
    image.body.pipe(response);
    image.body.on('error', (err: Error) => {
      response.status(500).send(err.message);
    });
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
