# @seatgeek/backstage-plugin-aws-catalog-backend

This plugin offers the ability to ingest certain resources from [AWS](https://aws.amazon.com/) into the Backstage catalog.

[![npm latest version](https://img.shields.io/npm/v/@seatgeek/backstage-plugin-aws-catalog-backend/latest.svg)](https://www.npmjs.com/package/@seatgeek/backstage-plugin-aws-catalog-backend)

## Supported Resources

- [x] RDS Databases

## Installation

Install the @seatgeek/backstage-plugin-aws-catalog-backend package in your backend package:

```shell
# From your Backstage root directory
yarn add --cwd packages/backend @seatgeek/backstage-plugin-aws-catalog-backend
```

Then add the following config to your `app-config.yml`:

```yml
catalog:
  providers:
    aws:
      myOrganizationAws:
        region: 'us-east-1' # required
        # Omit the following fields if using IAM roles (https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-iam.html)
        accessKeyId: ${AWS_ACCESS_KEY_ID} # optional
        secretAccessKey: ${AWS_SECRET_ACCESS_KEY} # optional
        sessionToken: ${AWS_SESSION_TOKEN} # optional
```

You'll then need to add whichever entity providers you wish to use into your Backstage application's `packages/backend/src/plugins/catalog.ts` and add it to the `CatalogBuilder`.
For example, to add the RDS entity provider:

```tsx
import { RDSEntityProvider } from '@seatgeek/backstage-plugin-aws-catalog-backend';

// ...

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  builder.addEntityProvider(
    ...RDSEntityProvider.fromConfig(env.config, {
      logger: env.logger,
      schedule: env.scheduler.createScheduledTaskRunner({
        frequency: { days: 1 },
        timeout: { minutes: 5 },
      }),
      // transforms the RDS data from AWS into a ResourceEntity
      dbInstanceTransformer: rdsDBInstance => ({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: {
          name: `db-${db.DBInstanceIdentifier}`,
          tags: [db.Engine!],
        },
        spec: {
          type: 'rds',
          owner: 'somebody',
        },
      }),
      // optional filter to limit which entities are ingested
      dbInstanceFilter: dbInstance => true,
    }),
  );
  // ...
}
```
