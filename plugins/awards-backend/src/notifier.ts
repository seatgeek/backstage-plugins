/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { AuthService } from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import { isUserEntity } from '@backstage/catalog-model';
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import { NotificationsGateway } from './notifications/notifications';

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Interface for handling interactions between Awards and NotificationsGateways.
 */
export interface AwardsNotifier {
  notifyNewRecipients(award: Award, newRecipients: string[]): Promise<void>;
}

export class MultiAwardsNotifier implements AwardsNotifier {
  private readonly notificationsGateways: NotificationsGateway[];
  private readonly catalogClient: CatalogClient;
  private readonly auth: AuthService;

  constructor(
    notificationsGateways: NotificationsGateway[],
    catalogClient: CatalogClient,
    auth: AuthService,
  ) {
    this.notificationsGateways = notificationsGateways;
    this.catalogClient = catalogClient;
    this.auth = auth;
  }

  addNotificationsGateway(gateway: NotificationsGateway) {
    this.notificationsGateways.push(gateway);
  }

  async notifyNewRecipients(
    award: Award,
    newRecipients: string[],
  ): Promise<void> {
    if (this.notificationsGateways.length === 0) {
      return;
    }

    const token = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });
    const resp = await this.catalogClient.getEntitiesByRefs(
      {
        entityRefs: newRecipients,
      },
      token,
    );
    const users = resp.items.filter(nonNullable).filter(isUserEntity);
    await Promise.all(
      this.notificationsGateways.map(gateway =>
        gateway.notifyNewRecipientsAdded(award, users),
      ),
    );
  }
}
