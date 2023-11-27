import {
  createServiceBuilder,
  DatabaseManager,
  loadBackendConfig,
  HostDiscovery,
} from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { DefaultIdentityClient } from '@backstage/plugin-auth-node';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'awards-backend' });
  const config = await loadBackendConfig({ logger, argv: process.argv });
  const discovery = HostDiscovery.fromConfig(config);

  const manager = DatabaseManager.fromConfig(
    new ConfigReader({
      backend: {
        database: { client: 'better-sqlite3', connection: ':memory:' },
      },
    }),
  );
  const database = manager.forPlugin('awards');

  const identity = DefaultIdentityClient.create({
    discovery,
    issuer: await discovery.getExternalBaseUrl('auth'),
  });

  logger.debug('Starting application server...');
  const router = await createRouter({
    database,
    identity,
    logger,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/awards', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();