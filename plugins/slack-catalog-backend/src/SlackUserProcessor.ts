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
import { WebClient } from '@slack/web-api';
import { Member } from '@slack/web-api/dist/types/response/UsersListResponse';

const SLACK_USER_LIMIT = 1000;

/**
 * The SlackUserProcessor is used to enrich our User entities with information
 * from Slack: notably the user's Slack ID and profile picture.
 *
 * @public
 */
export class SlackUserProcessor implements CatalogProcessor {
  private readonly slack: WebClient;
  private readonly logger: LoggerService;
  private cacheLoaded: boolean;
  private userLookup: Map<string, Member>;
  // guarantee that users are loaded only once
  private loadUserPromise: Promise<Map<string, Member>> | null = null;

  private async fetchUsers(): Promise<Map<string, Member>> {
    if (!this.slack) {
      return new Map();
    }

    if (!this.cacheLoaded) {
      // we use a shared promise to make sure that the load is only
      // executed once even if `SlackUserProcessor.postProcessEntity`
      // is called "concurrently".
      if (!this.loadUserPromise) {
        this.loadUserPromise = this.loadUsers();
      }

      // Wait for the data to load
      await this.loadUserPromise;
    }

    return this.userLookup;
  }

  private async loadUsers(): Promise<Map<string, Member>> {
    this.logger.info('Loading slack users');
    const members: Member[] = [];
    let resp = await this.slack!.users.list({ limit: SLACK_USER_LIMIT });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      members.push(...(resp.members || []));
      if (!resp.response_metadata?.next_cursor) {
        break;
      }
      resp = await this.slack!.users.list({
        cursor: resp.response_metadata.next_cursor,
        limit: SLACK_USER_LIMIT,
      });
    }

    members
      ?.filter(
        user =>
          !user.is_bot &&
          !user.deleted &&
          !user.is_restricted &&
          !user.is_ultra_restricted,
      )
      .forEach(user => {
        if (user.profile?.email) {
          this.userLookup.set(user.profile.email, user);
        }
      });

    this.logger.info(`Loaded ${this.userLookup.size} slack users`);
    this.cacheLoaded = true;

    return this.userLookup;
  }

  static fromConfig(
    config: Config,
    logger: LoggerService,
  ): SlackUserProcessor[] {
    const slackToken = config.getOptionalString('slackCatalog.token');
    if (!slackToken) {
      logger.warn(
        'No token provided for SlackUserProcessor, skipping Slack user lookup',
      );
      return [];
    }
    return [new SlackUserProcessor(new WebClient(slackToken), logger)];
  }

  constructor(slack: WebClient, logger: LoggerService) {
    this.slack = slack;
    this.logger = logger;
    this.userLookup = new Map();
    this.cacheLoaded = false;
  }

  getProcessorName(): string {
    return 'SlackUserProcessor';
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
    const slackUser = userLookup.get(email);
    if (!slackUser) {
      return entity;
    }

    if (!entity.metadata.annotations) {
      entity.metadata.annotations = {};
    }
    if (!entity.spec.profile) {
      entity.spec.profile = {};
    }

    if (slackUser.id) {
      entity.metadata.annotations['slack.com/user_id'] = slackUser.id;
    }
    // if the user entity doesn't already have a profile picture set, *and* there's a slack avatar for the user, add that.
    if (!entity.spec.profile.picture && slackUser.profile?.image_192) {
      entity.spec.profile.picture = slackUser.profile.image_192;
    }

    return entity;
  }
}
