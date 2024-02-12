/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { TaskRunner } from '@backstage/backend-tasks';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  ResourceEntity,
} from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { merge } from 'lodash';
import * as uuid from 'uuid';
import { Logger } from 'winston';
import {
  RDSClient,
  DBInstance,
  DescribeDBInstancesCommandInput,
  paginateDescribeDBInstances,
} from '@aws-sdk/client-rds';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { arn } from '@internal/plugin-aws-catalog-common';

/**
 * A db instance from the AWS SDK.
 * @public
 */
export type RDSDBInstance = DBInstance;
/**
 * Filter instances from the AWS SDK to be included in the catalog.
 * @public
 */
export type DBInstanceFilter = (db: DBInstance) => boolean;
/**
 * Transforms instances from the AWS SDK into resource entities for the catalog.
 * @public
 */
export type DBInstanceTransformer = (db: DBInstance) => Promise<ResourceEntity>;
/**
 * Input for the RDSDescribeDBInstancesCommand.
 * @public
 */
export type RDSDescribeDBInstancesCommandInput =
  DescribeDBInstancesCommandInput;

const defaultDBInstanceFilter: DBInstanceFilter = (_: DBInstance) => true;

/**
 * Discovers RDS instances from AWS and adds them to the catalog.
 * @public
 */
export class RDSEntityProvider implements EntityProvider {
  private readonly logger: Logger;
  private readonly scheduleFn: () => Promise<void>;
  private readonly client: RDSClient;
  private connection?: EntityProviderConnection;
  private id?: string;

  private readonly dbInstanceTransformer: DBInstanceTransformer;
  private readonly dbInstanceFilter: DBInstanceFilter;
  private readonly commandInput: RDSDescribeDBInstancesCommandInput;

  static fromConfig(
    config: Config,
    options: {
      logger: Logger;
      schedule: TaskRunner;
      dbInstanceTransformer: DBInstanceTransformer;
      dbInstanceFilter?: DBInstanceFilter;
      commandInput?: RDSDescribeDBInstancesCommandInput;
    },
  ): RDSEntityProvider[] {
    const awsConfig = config.getOptionalConfig('catalog.providers.aws');
    if (!awsConfig) {
      options.logger.warn(
        "RDSEntityProvider will not be created as 'catalog.providers.aws' key is missing in configuration.",
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
      const client = new RDSClient({ region, credentials });

      const taskRunner = options.schedule;

      return new RDSEntityProvider({
        ...options,
        id: key,
        client,
        taskRunner,
        dbInstanceTransformer: options.dbInstanceTransformer,
        dbInstanceFilter: options.dbInstanceFilter,
        commandInput: options.commandInput,
      });
    });
  }

  private constructor(options: {
    id?: string;
    logger: Logger;
    client: RDSClient;
    taskRunner: TaskRunner;
    dbInstanceTransformer: DBInstanceTransformer;
    dbInstanceFilter?: DBInstanceFilter;
    commandInput?: RDSDescribeDBInstancesCommandInput;
  }) {
    this.logger = options.logger.child({
      target: this.getProviderName(),
    });
    this.scheduleFn = this.createScheduleFn(options.taskRunner);
    this.client = options.client;
    this.id = options.id;
    this.dbInstanceTransformer = options.dbInstanceTransformer;
    this.dbInstanceFilter = options.dbInstanceFilter || defaultDBInstanceFilter;
    this.commandInput = options.commandInput || {};
  }

  getProviderName(): string {
    const suffix = this.id ? `:${this.id}` : '';
    return `RDSEntityProvider${suffix}`;
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.scheduleFn();
  }

  private createScheduleFn(taskRunner: TaskRunner): () => Promise<void> {
    return async () => {
      const taskId = `${this.getProviderName()}:refresh`;
      return taskRunner.run({
        id: taskId,
        fn: async () => {
          const logger = this.logger.child({
            class: RDSEntityProvider.prototype.constructor.name,
            taskId,
            taskInstanceId: uuid.v4(),
          });

          try {
            await this.refresh(logger);
          } catch (error) {
            logger.error(
              `${this.getProviderName()} refresh failed, ${error}`,
              error,
            );
          }
        },
      });
    };
  }

  private async refresh(logger: Logger): Promise<void> {
    logger.debug(`Refreshing ${this.getProviderName()}`);

    if (!this.connection) {
      throw new Error(
        `Connection not initialized for ${this.getProviderName()}`,
      );
    }

    const paginator = paginateDescribeDBInstances(
      { client: this.client, pageSize: 100 },
      this.commandInput,
    );

    const dbInstances: DBInstance[] = [];
    for await (const page of paginator) {
      if (page.DBInstances) {
        dbInstances.push(...page.DBInstances);
      }
    }

    logger.info(`Retrieved ${dbInstances.length} RDS instances from AWS.`);

    const entities: ResourceEntity[] = await Promise.all(
      dbInstances.filter(this.dbInstanceFilter).map(this.createDBResource),
    );

    logger.info(`Will apply ${entities.length} RDS instances to the catalog.`);

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        locationKey: this.getProviderName(),
        entity: entity,
      })),
    });
  }

  private createDBResource = async (
    db: DBInstance,
  ): Promise<ResourceEntity> => {
    const resourceEntity = await this.dbInstanceTransformer(db);
    const instanceArn = `${db.DBInstanceArn}`;

    return merge(
      {
        metadata: {
          annotations: {
            [arn.ANNOTATION]: instanceArn,
            [ANNOTATION_LOCATION]: instanceArn,
            [ANNOTATION_ORIGIN_LOCATION]: instanceArn,
          },
        },
      },
      resourceEntity,
    );
  };
}
