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
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { TaskRunner } from '@backstage/backend-tasks';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import {
  BaseEntityProvider,
  InstanceFilter,
  InstanceTransformer,
} from './BaseEntityProvider';
import { PROVIDER_CONFIG_KEY } from './config';

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
    const awsConfig = config.getOptionalConfig(PROVIDER_CONFIG_KEY);
    if (!awsConfig) {
      options.logger.warn(
        `RDSEntityProvider will not be created as '${PROVIDER_CONFIG_KEY}' key is missing in configuration.`,
      );
      return [];
    }
    return awsConfig.keys().map(key => {
      const individalConfig = awsConfig.getConfig(key);
      const region = individalConfig.getString('region');
      const accessKeyId = individalConfig.getOptionalString('accessKeyId');
      const sessionToken = individalConfig.getOptionalString('sessionToken');
      const secretAccessKey =
        individalConfig.getOptionalString('secretAccessKey');
      let credentials: AwsCredentialIdentity | undefined = undefined;
      if (accessKeyId && secretAccessKey) {
        credentials = {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        };
      }

      return new RDSEntityProvider({
        ...options,
        id: key,
        client: new RDSClient({ region, credentials }),
        taskRunner: options.schedule,
        commandInput: options.commandInput,
      });
    });
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
