/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { UserEntity } from '@backstage/catalog-model';
import { Award } from '@seatgeek/backstage-plugin-awards-common';
import { IncomingWebhook } from '@slack/webhook';
import { SlackNotificationsGateway } from './notifications';

describe('SlackNotificationsGateway', () => {
  // @ts-ignore
  const slack: jest.Mocked<IncomingWebhook> = {
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should send a message to slack', async () => {
    const gateway = new SlackNotificationsGateway(
      slack,
      'http://localhost:3000',
    );
    const award: Award = {
      uid: '123',
      name: 'Coolest Test',
      description: 'For great tests',
      image: 'image',
      owners: [],
      recipients: [],
    };
    const newRecipients: UserEntity[] = [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'User',
        metadata: {
          name: 'taylor-swift',
          annotations: {
            'slack.com/user_id': '123',
          },
        },
        spec: {
          profile: {
            displayName: 'Taylor Swift',
          },
        },
      },
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'User',
        metadata: {
          name: 'lebron-james',
          annotations: {
            'slack.com/user_id': '456',
          },
        },
        spec: {
          profile: {
            displayName: 'Lebron James',
          },
        },
      },
    ];

    await gateway.notifyNewRecipientsAdded('123', award, newRecipients);

    expect(slack.send).toHaveBeenCalledWith({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':trophy: The following users have received the Coolest Test Award :trophy:',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '<http://localhost:3000/catalog/default/User/taylor-swift|Taylor Swift> (<@123>), <http://localhost:3000/catalog/default/User/lebron-james|Lebron James> (<@456>)',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '> For great tests (<http://localhost:3000/awards/view/123|More info>)',
          },
        },
      ],
    });
  });
});
