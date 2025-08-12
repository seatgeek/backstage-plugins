/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { LoggerService } from '@backstage/backend-plugin-api';
import { Entity, isUserEntity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import type {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { ExpandedUserSchema, Gitlab } from '@gitbeaker/rest';

const GITLAB_PER_PAGE_LIMIT = 500;
const GITLAB_DEFAULT_HOST = 'https://gitlab.com';

/**
 * The GitlabUserProcessor is used to enrich our User entities with information
 * from Gitlab: notably the user's Gitlab ID.
 *
 * @public
 */
export class GitlabUserProcessor implements CatalogProcessor {
  private readonly gitlab: InstanceType<typeof Gitlab>;
  private readonly logger: LoggerService;
  private cacheLoaded: boolean;
  private userLookup: Map<string, ExpandedUserSchema>;
  // guarantee that users are loaded only once
  private loadUserPromise: Promise<Map<string, ExpandedUserSchema>> | null =
    null;

  private async fetchUsers(): Promise<Map<string, ExpandedUserSchema>> {
    if (!this.gitlab) {
      return new Map();
    }

    if (!this.cacheLoaded) {
      // we use a shared promise to make sure that the load is only
      // executed once even if `GitlabUserProcessor.postProcessEntity`
      // is called "concurrently".
      if (!this.loadUserPromise) {
        this.loadUserPromise = this.loadUsers();
      }

      // Wait for the data to load
      await this.loadUserPromise;
    }

    return this.userLookup;
  }

  private async loadUsers(): Promise<Map<string, ExpandedUserSchema>> {
    this.logger.info('Loading gitlab users');

    let members: ExpandedUserSchema[] = [];
    try {
      members = (await this.gitlab!.Users.all({
        perPage: GITLAB_PER_PAGE_LIMIT,
        active: true,
        withoutProjectBots: true,
      })) as ExpandedUserSchema[];
    } catch (error) {
      this.logger.error(`Error loading gitlab users: ${error}`);
      return this.userLookup;
    }

    members.forEach(user => {
      if (user.email) {
        this.userLookup.set(user.email, user);
      }
    });

    this.logger.info(`Loaded ${this.userLookup.size} gitlab users`);
    this.cacheLoaded = true;

    return this.userLookup;
  }

  static fromConfig(
    config: Config,
    logger: LoggerService,
  ): GitlabUserProcessor[] {
    const token = config.getOptionalString('gitlabCatalog.token');
    if (!token) {
      logger.warn(
        'No token provided for GitlabUserProcessor, skipping Gitlab user lookup',
      );
      return [];
    }
    let host = config.getOptionalString('gitlabCatalog.host');
    if (!host) {
      logger.info(
        `No host provided for GitlabUserProcessor, defaulting to ${GITLAB_DEFAULT_HOST}`,
      );
      host = GITLAB_DEFAULT_HOST;
    }
    return [
      new GitlabUserProcessor(
        new Gitlab({
          host: host,
          token: token,
        }),
        logger,
      ),
    ];
  }

  constructor(gitlab: InstanceType<typeof Gitlab>, logger: LoggerService) {
    this.gitlab = gitlab;
    this.logger = logger;
    this.userLookup = new Map();
    this.cacheLoaded = false;
  }

  getProcessorName(): string {
    return 'GitlabUserProcessor';
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    if (!isUserEntity(entity)) {
      return entity;
    }

    const email = entity.spec.profile?.email;
    if (!email) {
      return entity;
    }

    const userLookup = await this.fetchUsers();
    const gitlabUser = userLookup.get(email);
    if (!gitlabUser) {
      return entity;
    }

    if (!entity.metadata.annotations) {
      entity.metadata.annotations = {};
    }

    if (gitlabUser.id) {
      entity.metadata.annotations[`gitlab.com/user_id`] =
        gitlabUser.id.toString();
    }

    if (gitlabUser.username) {
      entity.metadata.annotations[`gitlab.com/username`] = gitlabUser.username;
    }

    return entity;
  }
}
