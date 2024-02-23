import { UserEntity } from '@backstage/catalog-model';
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
    newRecipients: UserEntity[],
  ): Promise<void>;
}

export class NullNotificationGateway implements NotificationsGateway {
  async notifyNewRecipientsAdded(
    _: string,
    __: Award,
    ___: UserEntity[],
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
  private viewUrl = (award: Award): string => {
    return `${this.backstageBaseUrl}/awards/view/${award.uid}`;
  };

  private renderRecipient = (recipient: UserEntity): string => {
    const namespace = recipient.metadata.namespace || 'default';
    const url = `${this.backstageBaseUrl}/catalog/${namespace}/${recipient.kind}/${recipient.metadata.name}`;
    const name = recipient.spec.profile?.displayName || recipient.metadata.name;
    let rendered = `<${url}|${name}>`;
    const slackAnnotation =
      recipient.metadata.annotations?.['slack.com/user_id'];
    if (slackAnnotation) {
      rendered += ` (<@${slackAnnotation}>)`;
    }

    return rendered;
  };

  async notifyNewRecipientsAdded(
    _: string,
    award: Award,
    newRecipients: UserEntity[],
  ): Promise<void> {
    await this.slack.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `:trophy: The following users have received the ${award.name} Award :trophy:`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: newRecipients.map(this.renderRecipient).join(', '),
          },
        },
      ],
    });
  }
}
