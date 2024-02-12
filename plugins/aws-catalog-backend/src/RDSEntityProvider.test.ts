/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { DBInstance } from '@aws-sdk/client-rds';
import { getVoidLogger } from '@backstage/backend-common';
import { TaskInvocationDefinition, TaskRunner } from '@backstage/backend-tasks';
import { setupRequestMockHandlers } from '@backstage/backend-test-utils';
import { ResourceEntity } from '@backstage/catalog-model';
import { ConfigReader } from '@backstage/config';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { InstanceTransformer } from './BaseEntityProvider';
import { RDSDBInstance, RDSEntityProvider } from './RDSEntityProvider';

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

const simpleRDSTransformer: InstanceTransformer<RDSDBInstance> = (
  db: DBInstance,
): Promise<ResourceEntity> => {
  return Promise.resolve({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Resource',
    metadata: {
      name: db.DBInstanceIdentifier!,
    },
    spec: {
      type: 'rds',
      owner: 'somebody',
    },
  });
};

describe('RDSEntityProvider', () => {
  setupRequestMockHandlers(server);
  afterEach(() => jest.resetAllMocks());

  it('no provider config', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({});
    const providers = RDSEntityProvider.fromConfig(config, {
      logger,
      schedule,
      transformer: simpleRDSTransformer,
    });

    expect(providers).toHaveLength(0);
  });

  it('single discovery config', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          aws: {
            'my-aws': {
              region: 'us-east-1',
              // Sample values from https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              sessionToken:
                'AQoEXAMPLEH4aoAH0gNCAPyzrkuWJOgQs8IZZaIv2BXIa2R4Olgk',
            },
          },
        },
      },
    });
    const providers = RDSEntityProvider.fromConfig(config, {
      logger,
      schedule,
      transformer: simpleRDSTransformer,
    });

    expect(providers).toHaveLength(1);
    expect(providers[0].getProviderName()).toEqual('RDSEntityProvider:my-aws');
  });

  it('multiple discovery configs', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          aws: {
            'my-aws': {
              region: 'us-east-1',
              // Sample values from https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              sessionToken:
                'AQoEXAMPLEH4aoAH0gNCAPyzrkuWJOgQs8IZZaIv2BXIa2R4Olgk',
            },
            'other-aws': {
              region: 'us-west-2',
              // Sample values from https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              sessionToken:
                'AQoEXAMPLEH4aoAH0gNCAPyzrkuWJOgQs8IZZaIv2BXIa2R4Olgk',
            },
          },
        },
      },
    });
    const providers = RDSEntityProvider.fromConfig(config, {
      logger,
      schedule,
      transformer: simpleRDSTransformer,
    });

    expect(providers).toHaveLength(2);
    expect(providers[0].getProviderName()).toEqual('RDSEntityProvider:my-aws');
    expect(providers[1].getProviderName()).toEqual(
      'RDSEntityProvider:other-aws',
    );
  });

  it('missing region', () => {
    const schedule = new PersistingTaskRunner();
    const config = new ConfigReader({
      catalog: {
        providers: {
          aws: {
            'my-aws': {
              // Sample values from https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              sessionToken:
                'AQoEXAMPLEH4aoAH0gNCAPyzrkuWJOgQs8IZZaIv2BXIa2R4Olgk',
            },
          },
        },
      },
    });
    expect(() =>
      RDSEntityProvider.fromConfig(config, {
        logger,
        schedule,
        transformer: simpleRDSTransformer,
      }),
    ).toThrow(
      "Missing required config value at 'catalog.providers.aws.my-aws.region",
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
          aws: {
            'my-aws': {
              region: 'us-east-1',
              // Sample values from https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              sessionToken:
                'AQoEXAMPLEH4aoAH0gNCAPyzrkuWJOgQs8IZZaIv2BXIa2R4Olgk',
            },
          },
        },
      },
    });

    const provider = RDSEntityProvider.fromConfig(config, {
      logger,
      schedule,
      transformer: simpleRDSTransformer,
      filter: (db: DBInstance) => db.DBInstanceIdentifier !== 'excluded',
    })[0];

    server.use(
      rest.post(
        'https://rds.us-east-1.amazonaws.com/',
        async (req, res, ctx) => {
          // Simulate a paginated response
          const reqBody = await req.text();
          if (!reqBody.includes('Marker=next-page')) {
            // Page 1 of 2
            return res(
              ctx.xml(`
<DescribeDBInstancesResponse xmlns="http://rds.amazonaws.com/doc/2014-10-31/">
  <DescribeDBInstancesResult>
    <DBInstances>
      <DBInstance>
        <DBInstanceIdentifier>backstage</DBInstanceIdentifier>
        <DBInstanceArn>arn:aws:rds:us-east-1:0123456789:db:backstage</DBInstanceArn>
        <Engine>postgres</Engine>
        <EngineVersion>13.10</EngineVersion>
        <InstanceCreateTime>2021-11-03T20:42:00.000Z</InstanceCreateTime>
        <DBInstanceClass>db.t4g.small</DBInstanceClass>
      </DBInstance>
    </DBInstances>
  </DescribeDBInstancesResult>
</DescribeDBInstancesResponse>
          `),
            );
          }

          // Page 1 of 2
          return res(
            ctx.xml(`
<DescribeDBInstancesResponse xmlns="http://rds.amazonaws.com/doc/2014-10-31/">
  <DescribeDBInstancesResult>
    <DBInstances>
      <DBInstance>
        <DBInstanceIdentifier>excluded</DBInstanceIdentifier>
        <DBInstanceArn>arn:aws:rds:us-east-1:0123456789:db:excluded</DBInstanceArn>
        <Engine>mysql</Engine>
        <EngineVersion>5.7.38</EngineVersion>
        <InstanceCreateTime>2021-11-03T20:42:00.000Z</InstanceCreateTime>
        <DBInstanceClass>db.m5.large</DBInstanceClass>
      </DBInstance>
    </DBInstances>
    <Marker>next-page</Marker>
  </DescribeDBInstancesResult>
</DescribeDBInstancesResponse>
          `),
          );
        },
      ),
    );

    await provider.connect(entityProviderConnection);
    const taskDef = schedule.getTasks()[0];
    expect(taskDef.id).toEqual('RDSEntityProvider:my-aws:refresh');
    await (taskDef.fn as () => Promise<void>)();

    const expectedEntities = [
      {
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Resource',
          metadata: {
            name: 'backstage',
            annotations: {
              'amazonaws.com/arn':
                'arn:aws:rds:us-east-1:0123456789:db:backstage',
              'backstage.io/managed-by-location':
                'arn:aws:rds:us-east-1:0123456789:db:backstage',
              'backstage.io/managed-by-origin-location':
                'arn:aws:rds:us-east-1:0123456789:db:backstage',
            },
          },
          spec: {
            type: 'rds',
            owner: 'somebody',
          },
        },
        locationKey: 'RDSEntityProvider:my-aws',
      },
    ];

    expect(entityProviderConnection.applyMutation).toHaveBeenCalledTimes(1);
    expect(entityProviderConnection.applyMutation).toHaveBeenCalledWith({
      type: 'full',
      entities: expectedEntities,
    });
  });
});
