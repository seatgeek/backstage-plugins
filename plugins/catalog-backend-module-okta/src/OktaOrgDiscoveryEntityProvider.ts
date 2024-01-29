/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { Config } from '@backstage/config';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  UserEntity,
  GroupEntity,
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
} from '@backstage/catalog-model';
import * as uuid from 'uuid';
import { TaskRunner } from '@backstage/backend-tasks';
import { Logger } from 'winston';
import { merge } from 'lodash';
import {
  Client,
  UserApiListUsersRequest,
  GroupApiListGroupsRequest,
  User,
  Group,
} from '@okta/okta-sdk-nodejs';

/**
 * A user object from the Okta API.
 * @public
 */
export type OktaUser = User;
/**
 * A group object from the Okta API.
 * @public
 */
export type OktaGroup = Group;
/**
 * Filter users from the Okta API from being included in the catalog.
 * @public
 */
export type OktaUserFilter = (user: OktaUser) => boolean;
/**
 * Filter groups from the Okta API from being included in the catalog.
 * @public
 */
export type OktaGroupFilter = (group: OktaGroup) => boolean;
/**
 * Transform users from the Okta API into user entities for the catalog.
 * @public
 */
export type OktaUserTransformer = (user: OktaUser) => UserEntity;
/**
 * Transform groups from the Okta API into user entities for the catalog.
 * @public
 */
export type OktaGroupTransformer = (group: OktaGroup) => GroupEntity;
/**
 * Request parameters for Okta list users resource.
 * @public
 */
export type OktaListUsersRequest = UserApiListUsersRequest;
/**
 * Request parameters for Okta list groups resource.
 * @public
 */
export type OktaListGroupsRequest = GroupApiListGroupsRequest;
/**
 * Hook function run before adding entities to the catalog, for example, to enrich user entities
 * with group data or vice versa.
 * @public
 */
export type HookBeforeMutation = (
  users: UserEntity[],
  groups: GroupEntity[],
) => [UserEntity[], GroupEntity[]];

const defaultUserFilter: OktaUserFilter = (_: OktaUser) => true;
const defaultGroupFilter: OktaGroupFilter = (_: OktaGroup) => true;
/**
 * Discovers users and groups from an Okta instance.
 * @public
 */
export class OktaOrgDiscoveryEntityProvider implements EntityProvider {
  private readonly logger: Logger;
  private readonly scheduleFn: () => Promise<void>;
  private readonly client: Client;
  private connection?: EntityProviderConnection;

  // optional id to distinguish multiple entity processors
  private readonly id?: string;
  private readonly listUsersRequest: UserApiListUsersRequest;
  private readonly listGroupsRequest: GroupApiListGroupsRequest;
  private readonly userFilter: OktaUserFilter;
  private readonly groupFilter: OktaGroupFilter;
  private readonly userTransformer: OktaUserTransformer;
  private readonly groupTransformer: OktaGroupTransformer;
  private readonly hookBeforeMutation?: HookBeforeMutation;

  static fromConfig(
    config: Config,
    options: {
      logger: Logger;
      schedule?: TaskRunner;
      listUsersRequest?: UserApiListUsersRequest;
      listGroupsRequest?: GroupApiListGroupsRequest;
      userFilter?: OktaUserFilter;
      groupFilter?: OktaGroupFilter;
      userTransformer: OktaUserTransformer;
      groupTransformer: OktaGroupTransformer;
      hookBeforeMutation?: HookBeforeMutation;
    },
  ): OktaOrgDiscoveryEntityProvider[] {
    if (!options.schedule) {
      throw new Error('Schedule must be provided.');
    }

    const oktaConfig = config.getOptionalConfig('catalog.providers.okta');
    if (!oktaConfig) {
      options.logger.warn(
        "OktaOrgDiscoveryEntityProvider will not be created as 'okta' key is missing in configuration.",
      );
      return [];
    }
    return oktaConfig.keys().map(key => {
      const individalConfig = oktaConfig.getConfig(key);
      const apiToken = individalConfig.getString('apiToken');
      const url = individalConfig.getString('url');

      const client = new Client({ orgUrl: url, token: apiToken });

      const taskRunner = options.schedule!;

      return new OktaOrgDiscoveryEntityProvider({
        ...options,
        id: key,
        config,
        client,
        taskRunner,
      });
    });
  }

  private constructor(options: {
    config: Config;
    id?: string;
    logger: Logger;
    taskRunner: TaskRunner;
    client: Client;
    listUsersRequest?: UserApiListUsersRequest;
    listGroupsRequest?: GroupApiListGroupsRequest;
    userFilter?: OktaUserFilter;
    groupFilter?: OktaGroupFilter;
    userTransformer: OktaUserTransformer;
    groupTransformer: OktaGroupTransformer;
    hookBeforeMutation?: HookBeforeMutation;
  }) {
    this.logger = options.logger.child({
      target: this.getProviderName(),
    });
    this.scheduleFn = this.createScheduleFn(options.taskRunner);
    this.client = options.client;

    this.id = options.id;
    this.listUsersRequest = options.listUsersRequest || {};
    this.listGroupsRequest = options.listGroupsRequest || {};
    this.userFilter = options.userFilter || defaultUserFilter;
    this.groupFilter = options.groupFilter || defaultGroupFilter;
    this.userTransformer = options.userTransformer;
    this.groupTransformer = options.groupTransformer;
    this.hookBeforeMutation = options.hookBeforeMutation;
  }

  getProviderName(): string {
    const suffix = this.id ? `:${this.id}` : '';
    return `OktaOrgDiscoveryEntityProvider${suffix}`;
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
            class: OktaOrgDiscoveryEntityProvider.prototype.constructor.name,
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
        `Okta connection not initialized for ${this.getProviderName()}`,
      );
    }

    const listGroupsResponse = await this.client.groupApi.listGroups(
      this.listGroupsRequest,
    );
    let groups: GroupEntity[] = [];
    await listGroupsResponse.each(group => {
      if (!this.groupFilter(group as OktaGroup)) {
        return;
      }
      groups.push(this.createGroup(group as OktaGroup));
    });

    const listUsersResponse = await this.client.userApi.listUsers(
      this.listUsersRequest,
    );
    let users: UserEntity[] = [];
    await listUsersResponse.each(user => {
      if (!this.userFilter(user as OktaUser)) {
        return;
      }
      users.push(this.createUser(user as OktaUser));
    });

    if (this.hookBeforeMutation) {
      [users, groups] = this.hookBeforeMutation(users, groups);
    }

    logger.info(
      `Retrieved ${users.length} users and ${groups.length} groups from Okta for the catalog.`,
    );
    await this.connection.applyMutation({
      type: 'full',
      entities: [...users, ...groups].map(entity => ({
        locationKey: this.getProviderName(),
        entity: entity,
      })),
    });
  }

  private createGroup(group: OktaGroup): GroupEntity {
    const groupEntity = this.groupTransformer(group);
    const location = `url:${this.client.baseUrl}/api/v1/groups/${group.id}`;
    return merge(
      {
        metadata: {
          annotations: {
            [ANNOTATION_LOCATION]: location,
            [ANNOTATION_ORIGIN_LOCATION]: location,
          },
        },
      },
      groupEntity,
    );
  }

  private createUser(user: OktaUser): UserEntity {
    const userEntity = this.userTransformer(user);
    const location = `url:${this.client.baseUrl}/api/v1/users/${user.id}`;

    // this is the annotation used by the okta auth provider: https://github.com/backstage/backstage/blob/master/plugins/auth-backend/src/providers/okta/provider.ts
    const emailAnnotation: { [key: string]: string } = {};
    if (user.profile?.email) {
      emailAnnotation['okta.com/email'] = user.profile.email;
    }

    return merge(
      {
        metadata: {
          annotations: {
            ...emailAnnotation,
            [ANNOTATION_LOCATION]: location,
            [ANNOTATION_ORIGIN_LOCATION]: location,
          },
        },
      },
      userEntity,
    );
  }
}
