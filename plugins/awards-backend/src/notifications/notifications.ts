import { Config } from '@backstage/config';
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import { IncomingWebhook } from '@slack/webhook';

/**
 * Interface for sending notifications about awards
 */
export interface NotificationsGateway {
  notifyNewRecipientsAdded(
    identityRef: string,
    award: Award,
    newRecipients: string[],
  ): Promise<void>;
}

export class NullNotificationGateway implements NotificationsGateway {
  async notifyNewRecipientsAdded(
    _: string,
    __: Award,
    ___: string[],
  ): Promise<void> {
    return;
  }
}

export class SlackNotificationsGateway implements NotificationsGateway {
  private readonly slack: IncomingWebhook;

  constructor(slack: IncomingWebhook) {
    this.slack = slack;
  }

  static fromConfig(config: Config): SlackNotificationsGateway | null {
    const webhookUrl = config.getOptionalString(
      'awards.notifications.slack.webhook.url',
    );
    if (!webhookUrl) {
      return null;
    }
    const slack = new IncomingWebhook(webhookUrl);
    return new SlackNotificationsGateway(slack);
  }

  async notifyNewRecipientsAdded(
    _: string,
    award: Award,
    newRecipients: string[],
  ): Promise<void> {
    await this.slack.send({
      text: `🎉🎉🎉 Woohoo! The following users have received the ${
        award.name
      } award! 🎉🎉🎉

${newRecipients.map(recipient => `- ${recipient}`).join('\n')}
      `,
    });
  }
}
