/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { getVoidLogger } from '@backstage/backend-common';
import { TaskInvocationDefinition, TaskRunner } from '@backstage/backend-tasks';
import { ResourceEntity } from '@backstage/catalog-model';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';
import {
  BaseEntityProvider,
  InstanceFilter,
  InstanceTransformer,
} from './BaseEntityProvider';

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

interface SomeInstance {
  name: string;
}

const simpleTransformer: InstanceTransformer<SomeInstance> = (
  i: SomeInstance,
): Promise<ResourceEntity> => {
  return Promise.resolve({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Resource',
    metadata: {
      name: i.name,
    },
    spec: {
      type: 'test',
      owner: 'somebody',
    },
  });
};

class TestableEntityProvider extends BaseEntityProvider<SomeInstance> {
  constructor(
    id: string,
    taskRunner: TaskRunner,
    filter?: InstanceFilter<SomeInstance> | undefined,
  ) {
    super({
      id,
      logger,
      filter,
      taskRunner,
      transformer: simpleTransformer,
    });
  }

  protected getArn(resource: SomeInstance): string {
    return `arn:aws:whatever:us-east-1:0123456789:${resource.name}`;
  }

  protected getInstances(): Promise<SomeInstance[]> {
    return Promise.resolve([{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }]);
  }
}

describe('BaseEntityProvider', () => {
  afterEach(() => jest.resetAllMocks());

  describe('getProviderName', () => {
    it('should return the provider name', () => {
      const provider = new TestableEntityProvider(
        'test',
        new PersistingTaskRunner(),
      );
      expect(provider.getProviderName()).toEqual('TestableEntityProvider:test');
    });
  });

  describe('connect', () => {
    it('should schedule a refresh task', async () => {
      const schedule = new PersistingTaskRunner();
      const entityProviderConnection: EntityProviderConnection = {
        applyMutation: jest.fn(),
        refresh: jest.fn(),
      };

      const provider = new TestableEntityProvider('test', schedule);

      await provider.connect(entityProviderConnection);
      const taskDef = schedule.getTasks()[0];
      expect(taskDef.id).toEqual('TestableEntityProvider:test:refresh');
    });
  });

  it('applies full update on scheduled execution', async () => {
    const schedule = new PersistingTaskRunner();
    const entityProviderConnection: EntityProviderConnection = {
      applyMutation: jest.fn(),
      refresh: jest.fn(),
    };

    const excludeBaz: InstanceFilter<SomeInstance> = (i: SomeInstance) => {
      return i.name !== 'baz';
    };

    const provider = new TestableEntityProvider('test', schedule, excludeBaz);

    await provider.connect(entityProviderConnection);
    const taskDef = schedule.getTasks()[0];
    expect(taskDef.id).toEqual('TestableEntityProvider:test:refresh');
    await (taskDef.fn as () => Promise<void>)();

    const expectedEntities = [
      {
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Resource',
          metadata: {
            name: 'foo',
            annotations: {
              'amazonaws.com/arn': 'arn:aws:whatever:us-east-1:0123456789:foo',
              'backstage.io/managed-by-location':
                'arn:aws:whatever:us-east-1:0123456789:foo',
              'backstage.io/managed-by-origin-location':
                'arn:aws:whatever:us-east-1:0123456789:foo',
            },
          },
          spec: {
            type: 'test',
            owner: 'somebody',
          },
        },
        locationKey: 'TestableEntityProvider:test',
      },
      {
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Resource',
          metadata: {
            name: 'bar',
            annotations: {
              'amazonaws.com/arn': 'arn:aws:whatever:us-east-1:0123456789:bar',
              'backstage.io/managed-by-location':
                'arn:aws:whatever:us-east-1:0123456789:bar',
              'backstage.io/managed-by-origin-location':
                'arn:aws:whatever:us-east-1:0123456789:bar',
            },
          },
          spec: {
            type: 'test',
            owner: 'somebody',
          },
        },
        locationKey: 'TestableEntityProvider:test',
      },
    ];

    expect(entityProviderConnection.applyMutation).toHaveBeenCalledTimes(1);
    expect(entityProviderConnection.applyMutation).toHaveBeenCalledWith({
      type: 'full',
      entities: expectedEntities,
    });
  });
});
