# @seatgeek/plugin-awards-backend

[![npm latest version](https://img.shields.io/npm/v/@seatgeek/plugin-awards-backend/latest.svg)](https://www.npmjs.com/package/@seatgeek/plugin-awards-backend)

Welcome to the backend package for awards plugin!

This plugin relies on [Backstage authentication](https://backstage.io/docs/auth/)
in order to enforce ownership of awards. Please follow the documentation to
enable authentication before attempting to use this plugin!

Currently we support only `SQLite` and `PostgreSQL` databases.

## Installation

Install the @seatgeek/plugin-awards-backend package in your backend package:

```shell
# From your Backstage root directory
yarn add --cwd packages/backend @seatgeek/plugin-awards-backend
```

Then create a plugin entry inside `packages/src/plugins/awards.ts` in your
Backstage root with the following content:

```typescript
import { createRouter } from '@seatgeek/plugin-awards-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    database: env.database,
    identity: env.identity,
  });
}
```

Import the plugin inside `packages/backend/src/index.ts` in your Backstage root:

```typescript
// Other imports here
import awards from './plugins/awards';

function makeCreateEnv(config: Config) {
  // Lots of code here. Add the following line before the router is instantiated.
  const awardsEnv = useHotMemoize(module, () => createEnv('awards'));

  const apiRouter = Router();
  // Several apiRouter.use() statements here.
  // Add the route for /awards as the last one before the notFoundHandler() is
  // setup.
  apiRouter.use('/awards', await awards(awardsEnv));

  apiRouter.use(notFoundHandler());
}
```

## Developing this plugin

The plugin can be executed in isolation during development by running
`yarn start` in the plugin root directory. This method of serving the plugin
provides quicker iteration speed and a faster startup and hot reloads.

It is only meant for local development, and the setup for it can be found
inside the [/dev](/dev) directory.
