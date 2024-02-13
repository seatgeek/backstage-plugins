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
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { arn } from '@seatgeek/backstage-plugin-aws-catalog-common';
import { merge } from 'lodash';
import * as uuid from 'uuid';
import { Logger } from 'winston';

export type InstanceTransformer<T> = (instance: T) => Promise<ResourceEntity>;
export type InstanceFilter<T> = (instance: T) => boolean;

export abstract class BaseEntityProvider<T> implements EntityProvider {
  protected readonly logger: Logger;
  private readonly scheduleFn: () => Promise<void>;
  private connection?: EntityProviderConnection;
  private readonly id?: string;

  private readonly transformer: InstanceTransformer<T>;
  private readonly filter: InstanceFilter<T>;

  constructor(options: {
    id?: string;
    logger: Logger;
    taskRunner: TaskRunner;
    transformer: InstanceTransformer<T>;
    filter: InstanceFilter<T> | undefined;
  }) {
    this.logger = options.logger.child({
      target: this.getProviderName(),
    });
    this.scheduleFn = this.createScheduleFn(options.taskRunner);
    this.id = options.id;
    this.transformer = options.transformer;
    this.filter = options.filter || (() => true);
  }

  getProviderName(): string {
    const suffix = this.id ? `:${this.id}` : '';
    return `${this.constructor.name}${suffix}`;
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.logger.debug('Connected to the catalog');
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
            class: this.constructor.name,
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

    const instances = await this.getInstances();

    logger.info(`Retrieved ${instances.length} instances from AWS.`);

    const entities: ResourceEntity[] = await Promise.all(
      instances.filter(this.filter).map(this.createResource),
    );

    logger.info(`Will apply ${entities.length} instances to the catalog.`);

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        locationKey: this.getProviderName(),
        entity: entity,
      })),
    });
  }

  protected abstract getInstances(): Promise<T[]>;

  protected abstract getArn(resource: T): string;

  private createResource = async (instance: T): Promise<ResourceEntity> => {
    const resourceEntity = await this.transformer(instance);
    const instanceArn = this.getArn(instance);

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
