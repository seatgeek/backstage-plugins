# @seatgeek/backstage-plugin-awards-backend

This plugin provides the backend API for the awards plugin.

[![npm latest version](https://img.shields.io/npm/v/@seatgeek/backstage-plugin-awards-backend/latest.svg)](https://www.npmjs.com/package/@seatgeek/backstage-plugin-awards-backend)

This plugin relies on [Backstage authentication](https://backstage.io/docs/auth/)
in order to enforce ownership of awards. Please follow the documentation to
enable authentication before attempting to use this plugin!

Currently we support only `SQLite` and `PostgreSQL` databases.

## Installation

Install the @seatgeek/backstage-plugin-awards-backend package in your backend package:

```shell
# From your Backstage root directory
yarn add --cwd packages/backend @seatgeek/backstage-plugin-awards-backend
```

Then create a plugin entry inside `packages/src/plugins/awards.ts` in your
Backstage root with the following content:

```typescript
import { createRouter } from '@seatgeek/backstage-plugin-awards-backend';
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

## Configuration

The awards plugin uses S3 bucket for Award logo storage.

```yaml
awards:
  s3:
    bucket: backstage-awards # required
    region: us-east-1 # required
    # Omit the following fields if using IAM roles (https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-iam.html)
    accessKeyId: ${AWS_ACCESS_KEY_ID} # optional
    secretAccessKey: ${AWS_SECRET_ACCESS_KEY} # optional
    sessionToken: ${AWS_SESSION_TOKEN} # optional
    # For local development, pass the endpoint for your localstack server
    endpoint: http://127.0.0.1:4566 # optional
```

### Slack notifications

To enable Slack notifications, add the following to your `app-config.yaml` file:

```yaml
awards:
  notifications:
    slack:
      webhook:
        # https://api.slack.com/messaging/webhooks
        url: <my_slack_webhook_url>
```

Users who have the `slack.com/user_id` annotation set (see [slack-catalog-backend](/plugins/slack-catalog-backend/README.md)) will be tagged in notifications that pertain to them.

## Developing this plugin

The plugin can be executed in isolation during development by running
`yarn start` in the plugin root directory. This method of serving the plugin
provides quicker iteration speed and a faster startup and hot reloads.

It is only meant for local development, and the setup for it can be found
inside the [/dev](/dev) directory.
