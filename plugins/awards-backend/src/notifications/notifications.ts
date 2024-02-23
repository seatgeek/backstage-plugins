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
  private readonly backstageBaseUrl: string;

  constructor(slack: IncomingWebhook, backstageBaseUrl: string) {
    this.slack = slack;
    this.backstageBaseUrl = backstageBaseUrl;
  }

  static fromConfig(config: Config): SlackNotificationsGateway | null {
    const webhookUrl = config.getOptionalString(
      'awards.notifications.slack.webhook.url',
    );
    if (!webhookUrl) {
      return null;
    }
    const slack = new IncomingWebhook(webhookUrl);
    const backstageBaseUrl = config.getString('app.baseUrl');
    return new SlackNotificationsGateway(slack, backstageBaseUrl);
  }

  // todo: this should be in awards-common
  private viewUrl(award: Award): string {
    return `${this.backstageBaseUrl}/awards/view/${award.uid}`;
  }

  async notifyNewRecipientsAdded(
    _: string,
    award: Award,
    newRecipients: string[],
  ): Promise<void> {
    await this.slack.send({
      text: `🎉🎉🎉 Woohoo! The following users have received the <${this.viewUrl(
        award,
      )}|${award.name}> award! 🎉🎉🎉

${newRecipients.map(recipient => `- ${recipient}`).join('\n')}
      `,
    });
  }
}
