import { Award } from "@seatgeek/backstage-plugin-awards-common";

/**
 * Interface for sending notifications about awards
 */
export interface NotificationsGateway {
  notifyNewRecipientsAdded(identityRef: string, award: Award, newRecipients: string[]): Promise<void>;
}
