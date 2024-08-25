/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { errorHandler } from '@backstage/backend-common';
import {
  AuthService,
  DatabaseService,
  DiscoveryService,
  HttpAuthService,
  LoggerService,
  RootConfigService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import { Config } from '@backstage/config';
import { Storage, StorageType } from '@tweedegolf/storage-abstraction';
import express from 'express';
import fileUpload from 'express-fileupload';
import Router from 'express-promise-router';
import { Awards } from '../awards';
import { DatabaseAwardsStore } from '../database/awards';
import { SlackNotificationsGateway } from '../notifications/notifications';
import { MultiAwardsNotifier } from '../notifier';

export interface RouterOptions {
  auth: AuthService;
  config: RootConfigService;
  database: DatabaseService;
  discovery: DiscoveryService;
  httpAuth: HttpAuthService;
  logger: LoggerService;
  userInfo: UserInfoService;
}

function userInfoGetter(
  httpAuth: HttpAuthService,
  userInfoService: UserInfoService,
): (request: any) => Promise<string> {
  return async (request: any): Promise<string> => {
    const creds = await httpAuth.credentials(request, { allow: ['user'] });
    return (await userInfoService.getUserInfo(creds)).userEntityRef;
  };
}

function buildS3Adapter(config: Config): Storage {
  const region = config.getString('region');

  // for local dev
  const endpoint = config.getOptionalString('endpoint');

  // credentials
  const accessKeyId = config.getOptionalString('accessKey');
  const secretAccessKey = config.getOptionalString('secretKey');

  // bucket name
  const bucketName = config.getString('bucket');

  return new Storage({
    type: StorageType.S3,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucketName,
  });
}

function buildFsAdapter(config: Config): Storage {
  const directory =
    config.getOptionalString('directory') || 'tmp-awards-storage';
  return new Storage({
    type: StorageType.LOCAL,
    directory,
    bucketName: directory,
    mode: 755,
  });
}

function buildGcsAdapter(config: Config): Storage {
  // bucket name
  const bucketName = config.getString('bucket');
  // keyFilename
  const keyFilename = config.getOptionalString('keyFilename');
  return new Storage({
    type: StorageType.GCS,
    bucketName: bucketName,
    keyFilename: keyFilename,
  });
}

export function getStorageClient(config: Config): Storage {
  const storageConfig = config.getConfig('awards.storage');
  const configs: Record<string, Config> = {};
  storageConfig.keys().forEach(key => {
    try {
      configs[key] = storageConfig.getConfig(key);
    } catch {
      // config object isn't instantiated for this key
    }
  });
  if (Object.keys(configs).length !== 1) {
    throw new Error(
      `Must specify exactly one storage engine in awards.storage, got ${Object.keys(
        configs,
      )}`,
    );
  }
  const key = Object.keys(configs)[0];
  switch (key) {
    case 's3':
      return buildS3Adapter(configs.s3);
    case 'fs':
      return buildFsAdapter(configs.fs);
    case 'gcs':
      return buildGcsAdapter(configs.gcs);
    default:
      throw new Error(
        `Invalid storage engine type, valid types are "s3", "fs", "gcs", got: ${key}`,
      );
  }
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, database, logger, userInfo, httpAuth } = options;
  const getUserRef = userInfoGetter(httpAuth, userInfo);

  const catalogClient = new CatalogClient({
    discoveryApi: options.discovery,
  });
  const notifier = new MultiAwardsNotifier([], catalogClient, options.auth);
  const slack = SlackNotificationsGateway.fromConfig(config);
  if (slack) {
    notifier.addNotificationsGateway(slack);
  }
  const dbStore = await DatabaseAwardsStore.create({ database: database });
  const storage = getStorageClient(config);

  const awardsApp = new Awards(dbStore, notifier, storage, logger);

  const router = Router();
  router.use(express.json());
  router.use(fileUpload());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/', async (request, response) => {
    // Protecting the request
    await getUserRef(request);

    logger.debug(JSON.stringify(request.query));
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
    await getUserRef(request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter

    const award = await awardsApp.get(uid);
    response.json(award);
  });

  router.put('/:uid', async (request, response) => {
    const userRef = await getUserRef(request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter
    // TODO: validate request.body

    const upd = await awardsApp.update(userRef, uid, request.body);

    response.json(upd);
  });

  router.delete('/:uid', async (request, response) => {
    const userRef = await getUserRef(request);

    const uid = request.params.uid;
    // TODO: validate uuid parameter

    const result = await awardsApp.delete(userRef, uid);

    response.json(result);
  });

  router.post('/', async (request, response) => {
    await getUserRef(request);

    const award = await awardsApp.create(request.body);

    response.json(award);
  });

  router.post('/logos', async (request, response) => {
    await getUserRef(request);

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
