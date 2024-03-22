# @seatgeek/backstage-plugin-catalog-backend-module-okta

This plugin offers the ability to ingest users and groups from the [Okta API](https://developer.okta.com/docs/reference/core-okta-api/) into the Backstage catalog.

[![npm latest version](https://img.shields.io/npm/v/@seatgeek/backstage-plugin-catalog-backend-module-okta/latest.svg)](https://www.npmjs.com/package/@seatgeek/backstage-plugin-catalog-backend-module-okta)

## Installation

Install the @seatgeek/backstage-plugin-catalog-backend-module-okta package in your backend package:

```shell
# From your Backstage root directory
yarn add --cwd packages/backend @seatgeek/backstage-plugin-catalog-backend-module-okta
```

Then add the following config to your `app-config.yml`:

```yml
catalog:
  providers:
    okta:
      myOrganizationOkta:
        apiToken: ${OKTA_TOKEN}
        url: https://my-organization.okta.com
```

Then import `OktaOrgDiscoveryEntityProvider` into your Backstage application's `packages/backend/src/plugins/catalog.ts` and add it to the `CatalogBuilder`.

```tsx
import { OktaOrgDiscoveryEntityProvider } from '@seatgeek/backstage-plugin-catalog-backend-module-okta';

// ...

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  builder.addEntityProvider(
    ...OktaOrgDiscoveryEntityProvider.fromConfig(env.config, {
      logger: env.logger,
      schedule: env.scheduler.createScheduledTaskRunner({
        frequency: { days: 1 },
        timeout: { minutes: 5 },
      }),
      // query params passed to the okta api groups request
      listGroupsRequest: {
        filter: 'type Eq "TEAM"',
      },
      // transforms the okta api user object into a UserEntity
      userTransformer: oktaUser => ({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'User',
        metadata: {
          name: oktaUser.profile!.email!.split('@')[0],
        },
        spec: {
          profile: {
            displayName: oktaUser.profile!.displayName!,
          },
          memberOf: [],
        },
      }),
      // transforms the group api user object into a GroupEntity
      groupTransformer: oktaGroup => ({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        metadata: {
          name: oktaGroup.profile!.name!.toLowerCase(),
          description: oktaGroup.profile?.description || '',
        },
        spec: {
          type: 'team',
          children: [],
          profile: {
            displayName: oktaGroup.profile!.name!,
          },
        },
      }),
    }),
  );
  // ...
}
```
