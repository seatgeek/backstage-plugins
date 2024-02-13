/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  DBInstance,
  DescribeDBInstancesCommandInput,
  RDSClient,
  paginateDescribeDBInstances,
} from '@aws-sdk/client-rds';
import { TaskRunner } from '@backstage/backend-tasks';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import {
  BaseEntityProvider,
  InstanceFilter,
  InstanceTransformer,
} from './BaseEntityProvider';
import { PROVIDER_CONFIG_KEY, getProviderConfigs } from './config';

/**
 * A db instance from the AWS SDK.
 * @public
 */
export type RDSDBInstance = DBInstance;
/**
 * Input for the RDSDescribeDBInstancesCommand.
 * @public
 */
export type RDSDescribeDBInstancesCommandInput =
  DescribeDBInstancesCommandInput;

/**
 * Discovers RDS instances from AWS and adds them to the catalog.
 * @public
 */
export class RDSEntityProvider extends BaseEntityProvider<RDSDBInstance> {
  private readonly client: RDSClient;
  private readonly commandInput: RDSDescribeDBInstancesCommandInput;

  static fromConfig(
    config: Config,
    options: {
      logger: Logger;
      schedule: TaskRunner;
      transformer: InstanceTransformer<RDSDBInstance>;
      filter?: InstanceFilter<RDSDBInstance>;
      commandInput?: RDSDescribeDBInstancesCommandInput;
    },
  ): RDSEntityProvider[] {
    const providersConfigs = getProviderConfigs(config);
    const providers = Object.entries(providersConfigs).map(
      ([id, { region, credentials }]) => {
        const client = new RDSClient({ region, credentials });

        return new RDSEntityProvider({
          ...options,
          id,
          client,
          taskRunner: options.schedule,
          commandInput: options.commandInput,
        });
      },
    );

    if (providers.length === 0) {
      options.logger.warn(
        `RDSEntityProvider will not be created as '${PROVIDER_CONFIG_KEY}' key is missing in configuration.`,
      );
    }

    return providers;
  }

  private constructor(options: {
    id?: string;
    logger: Logger;
    client: RDSClient;
    taskRunner: TaskRunner;
    transformer: InstanceTransformer<RDSDBInstance>;
    filter?: InstanceFilter<RDSDBInstance>;
    commandInput?: RDSDescribeDBInstancesCommandInput;
  }) {
    super({
      ...options,
      filter: options.filter,
    });

    this.client = options.client;
    this.commandInput = options.commandInput || {};
  }

  protected async getInstances(): Promise<RDSDBInstance[]> {
    const paginator = paginateDescribeDBInstances(
      { client: this.client, pageSize: 100 },
      this.commandInput,
    );

    const dbInstances: RDSDBInstance[] = [];
    for await (const page of paginator) {
      if (page.DBInstances) {
        dbInstances.push(...page.DBInstances);
      }
    }

    return dbInstances;
  }

  protected getArn(db: RDSDBInstance): string {
    return db.DBInstanceArn!!;
  }
}
