/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { getVoidLogger } from '@backstage/backend-common';
import { TaskInvocationDefinition, TaskRunner } from '@backstage/backend-tasks';
import { setupRequestMockHandlers } from '@backstage/backend-test-utils';
import { GroupEntity, UserEntity } from '@backstage/catalog-model';
import { ConfigReader } from '@backstage/config';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import {
  HookBeforeMutation,
  OktaGroup,
  OktaGroupTransformer,
  OktaOrgDiscoveryEntityProvider,
  OktaUser,
  OktaUserTransformer,
} from './OktaOrgDiscoveryEntityProvider';

class PersistingTaskRunner implements TaskRunner {
  private tasks: TaskInvocationDefinition[] = [];

  getTasks() {
    return this.tasks;
  }

  run(task: TaskInvocationDefinition): Promise<void> {
    this.tasks.push(task);
    return Promise.resolve(undefined);
  }
}

const logger = getVoidLogger();

const server = setupServer();

const simpleUserTransformer: OktaUserTransformer = (
  user: OktaUser,
): UserEntity => {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    metadata: {
      name: user.profile!.login!,
    },
    kind: 'User',
    spec: {
      profile: {
        displayName: user.profile!.displayName!,
      },
    },
  };
};
const simpleGroupTransformer: OktaGroupTransformer = (
  group: OktaGroup,
): GroupEntity => {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    metadata: {
      name: group.profile!.name!,
    },
    kind: 'Group',
    spec: {
      type: group.type!,
      children: [],
    },
  };
};

describe('GitlabOrgDiscoveryEntityProvider', () => {
  setupRequestMockHandlers(server);
  afterEach(() => jest.resetAllMocks());

  it('no provider config', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({});
    const providers = OktaOrgDiscoveryEntityProvider.fromConfig(config, {
      logger,
      schedule,
      userTransformer: simpleUserTransformer,
      groupTransformer: simpleGroupTransformer,
    });

    expect(providers).toHaveLength(0);
  });

  it('single discovery config', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          okta: {
            'my-okta': {
              url: 'https://my.okta.com',
              apiToken: 'my-okta-token',
            },
          },
        },
      },
    });
    const providers = OktaOrgDiscoveryEntityProvider.fromConfig(config, {
      logger,
      schedule,
      userTransformer: simpleUserTransformer,
      groupTransformer: simpleGroupTransformer,
    });

    expect(providers).toHaveLength(1);
    expect(providers[0].getProviderName()).toEqual(
      'OktaOrgDiscoveryEntityProvider:my-okta',
    );
  });

  it('multiple discovery configs', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          okta: {
            'my-okta': {
              url: 'https://my.okta.com',
              apiToken: 'my-okta-token',
            },
            'other-okta': {
              url: 'https://other.okta.com',
              apiToken: 'other-okta-token',
            },
          },
        },
      },
    });
    const providers = OktaOrgDiscoveryEntityProvider.fromConfig(config, {
      logger,
      schedule,
      userTransformer: simpleUserTransformer,
      groupTransformer: simpleGroupTransformer,
    });

    expect(providers).toHaveLength(2);
    expect(providers[0].getProviderName()).toEqual(
      'OktaOrgDiscoveryEntityProvider:my-okta',
    );
    expect(providers[1].getProviderName()).toEqual(
      'OktaOrgDiscoveryEntityProvider:other-okta',
    );
  });

  it('missing apiToken', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          okta: {
            'my-okta': {
              url: 'https://my.okta.com',
            },
          },
        },
      },
    });
    expect(() =>
      OktaOrgDiscoveryEntityProvider.fromConfig(config, {
        logger,
        schedule,
        userTransformer: simpleUserTransformer,
        groupTransformer: simpleGroupTransformer,
      }),
    ).toThrow(
      "Missing required config value at 'catalog.providers.okta.my-okta.apiToken",
    );
  });

  it('missing url', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          okta: {
            'my-okta': {
              apiToken: 'my-okta-token',
            },
          },
        },
      },
    });
    expect(() =>
      OktaOrgDiscoveryEntityProvider.fromConfig(config, {
        logger,
        schedule,
        userTransformer: simpleUserTransformer,
        groupTransformer: simpleGroupTransformer,
      }),
    ).toThrow(
      "Missing required config value at 'catalog.providers.okta.my-okta.url",
    );
  });

  it('apply full update on scheduled execution', async () => {
    const schedule = new PersistingTaskRunner();
    const entityProviderConnection: EntityProviderConnection = {
      applyMutation: jest.fn(),
      refresh: jest.fn(),
    };
    const config = new ConfigReader({
      catalog: {
        providers: {
          okta: {
            'my-okta': {
              apiToken: 'my-okta-token',
              url: 'https://my.okta.com',
            },
          },
        },
      },
    });
    const hookBeforeMutation: HookBeforeMutation = (
      users: UserEntity[],
      groups: GroupEntity[],
    ): [UserEntity[], GroupEntity[]] => {
      return [
        users.map(user => {
          user.metadata.labels = { hooked: 'true' };
          return user;
        }),
        groups.map(group => {
          group.metadata.labels = { hooked: 'true' };
          return group;
        }),
      ];
    };
    const provider = OktaOrgDiscoveryEntityProvider.fromConfig(config, {
      logger,
      schedule,
      userTransformer: simpleUserTransformer,
      groupTransformer: simpleGroupTransformer,
      hookBeforeMutation,
    })[0];

    server.use(
      rest.get(`https://my.okta.com/api/v1/users`, (_req, res, ctx) => {
        const response = [
          {
            id: 'user-id-1',
            status: 'ACTIVE',
            profile: {
              country: 'United States of America',
              displayName: 'Zachary Hammer',
              login: 'zhammer',
              email: 'zhammer@seatgeek.com',
            },
          },
        ];
        return res(ctx.json(response));
      }),
      rest.get(`https://my.okta.com/api/v1/groups`, (_req, res, ctx) => {
        const response = [
          {
            id: 'group-id-1',
            objectClass: ['okta:user_group'],
            type: 'OKTA_GROUP',
            profile: {
              name: 'devx',
            },
          },
        ];
        return res(ctx.json(response));
      }),
    );

    await provider.connect(entityProviderConnection);
    const taskDef = schedule.getTasks()[0];
    expect(taskDef.id).toEqual(
      'OktaOrgDiscoveryEntityProvider:my-okta:refresh',
    );
    await (taskDef.fn as () => Promise<void>)();

    const expectedEntities = [
      {
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'User',
          metadata: {
            annotations: {
              'backstage.io/managed-by-location':
                'url:https://my.okta.com/api/v1/users/user-id-1',
              'backstage.io/managed-by-origin-location':
                'url:https://my.okta.com/api/v1/users/user-id-1',
              'okta.com/email': 'zhammer@seatgeek.com',
            },
            labels: {
              hooked: 'true',
            },
            name: 'zhammer',
          },
          spec: {
            profile: {
              displayName: 'Zachary Hammer',
            },
          },
        },
        locationKey: 'OktaOrgDiscoveryEntityProvider:my-okta',
      },
      {
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Group',
          metadata: {
            annotations: {
              'backstage.io/managed-by-location':
                'url:https://my.okta.com/api/v1/groups/group-id-1',
              'backstage.io/managed-by-origin-location':
                'url:https://my.okta.com/api/v1/groups/group-id-1',
            },
            labels: {
              hooked: 'true',
            },
            name: 'devx',
          },
          spec: {
            children: [],
            type: 'OKTA_GROUP',
          },
        },
        locationKey: 'OktaOrgDiscoveryEntityProvider:my-okta',
      },
    ];

    expect(entityProviderConnection.applyMutation).toHaveBeenCalledTimes(1);
    expect(entityProviderConnection.applyMutation).toHaveBeenCalledWith({
      type: 'full',
      entities: expectedEntities,
    });
  });
});
