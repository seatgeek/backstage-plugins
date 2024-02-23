import { Award } from "@seatgeek/backstage-plugin-awards-common";
import { IncomingWebhook } from '@slack/webhook';

/**
 * Interface for sending notifications about awards
 */
export interface NotificationsGateway {
  notifyNewRecipientsAdded(identityRef: string, award: Award, newRecipients: string[]): Promise<void>;
}

export class SlackNotificationsGateway implements NotificationsGateway {
  private readonly slack: IncomingWebhook;

  constructor(slack: IncomingWebhook) {
    this.slack = slack;
  }

  async notifyNewRecipientsAdded(_: string, award: Award, newRecipients: string[]): Promise<void> {
    await this.slack.send({
      text: `🎉🎉🎉 Woohoo! The following users have received the ${award.name} award! 🎉🎉🎉

${newRecipients.map(recipient => `- ${recipient}`).join('\n')}
      `
    })
  }
}
