# @seatgeek/plugin-slack-catalog-backend

This plugin offers catalog integrations for ingesting data from the Slack API into the Software Catalog.

## Installation

Install the `@seatgeek/plugin-slack-catalog-backend` package in your backend package:

```shell
# From your Backstage root directory
yarn add --cwd packages/app @seatgeek/plugin-slack-catalog-backend
```

Add the following config to your `app-config.yaml`:

```yml
slackCatalog:
  token: ${SLACK_API_TOKEN_CATALOG}
```

## Processors

### `SlackUserProcessor`

Enriches existing `User` entities with information from Slack, notably the user's Slack ID and profile picture, based on the user's `.profile.email`.

#### Installation

Add the following to your `packages/backend/catalog.ts`:

```ts
import { SlackUserProcessor } from '@internal/plugin-slack-catalog-backend';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = CatalogBuilder.create(env);
  builder.addProcessor(
    // Add the slack user processor
    SlackUserProcessor.fromConfig(env.config, env.logger),
  );
  const { processingEngine, router } = await builder.build();
  processingEngine.start();
  return router;
}
```
