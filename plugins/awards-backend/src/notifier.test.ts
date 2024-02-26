import { TokenManager } from '@backstage/backend-common';
import {
  CatalogClient,
  CatalogRequestOptions,
  GetEntitiesByRefsRequest,
} from '@backstage/catalog-client';
import { UserEntity } from '@backstage/catalog-model';
import { NotificationsGateway } from './notifications/notifications';
import { MultiAwardsNotifier } from './notifier';

function makeUser(ref: string): UserEntity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: ref,
    },
    spec: {},
  };
}

describe('MultiAwardsNotifier', () => {
  const tokenManager: jest.Mocked<TokenManager> = {
    getToken: jest.fn().mockResolvedValue({ token: 'token' }),
    authenticate: jest.fn(),
  };
  const catalogClient: jest.Mocked<CatalogClient> = {
    getEntitiesByRefs: jest
      .fn()
      .mockImplementation(
        async (
          request: GetEntitiesByRefsRequest,
          _?: CatalogRequestOptions,
        ) => {
          return {
            items: request.entityRefs.map(makeUser),
          };
        },
      ),
  } as unknown as jest.Mocked<CatalogClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyNewRecipients', () => {
    const award = {
      uid: 'uid',
      name: 'name',
      description: 'description',
      image: 'image',
      owners: ['owner'],
      recipients: ['user:default/joni-mitchell', 'user:default/jeff-buckley'],
    };

    it('notifies new recipients', async () => {
      const gateway: jest.Mocked<NotificationsGateway> = {
        notifyNewRecipientsAdded: jest.fn(),
      };
      const notifier = new MultiAwardsNotifier(
        [gateway],
        catalogClient,
        tokenManager,
      );

      await notifier.notifyNewRecipients(award, ['user:default/jeff-buckley']);

      expect(catalogClient.getEntitiesByRefs).toHaveBeenCalledWith(
        {
          entityRefs: ['user:default/jeff-buckley'],
        },
        { token: 'token' },
      );

      expect(gateway.notifyNewRecipientsAdded).toHaveBeenCalledWith(award, [
        makeUser('user:default/jeff-buckley'),
      ]);
    });

    it('does not fetch from the catalog if there are no gateways', async () => {
      const notifier = new MultiAwardsNotifier([], catalogClient, tokenManager);

      await notifier.notifyNewRecipients(award, ['user:default/jeff-buckley']);

      expect(tokenManager.getToken).not.toHaveBeenCalled();
      expect(catalogClient.getEntitiesByRefs).not.toHaveBeenCalled();
    });
  });
});
