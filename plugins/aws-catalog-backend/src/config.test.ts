import { ConfigReader } from '@backstage/config';
import { getProviderConfigs } from './config';

describe('getProviderConfigs', () => {
  it('should return an empty object if no config is present', () => {
    const emptyConfig = new ConfigReader({});

    expect(getProviderConfigs(emptyConfig)).toEqual({});
  });

  it('should return an empty object if the provider list is empty', () => {
    const emptyConfig = new ConfigReader({
      catalog: {
        providers: {
          aws: {},
        },
      },
    });

    expect(getProviderConfigs(emptyConfig)).toEqual({});
  });

  it('should return one record for each provider config', () => {
    const config = new ConfigReader({
      catalog: {
        providers: {
          aws: {
            east: {
              region: 'us-east-1',
            },
            west: {
              region: 'us-west-2',
              accessKeyId: 'accessKeyId',
              secretAccessKey: 'secretAccessKey',
            },
          },
        },
      },
    });

    expect(getProviderConfigs(config)).toEqual({
      east: {
        region: 'us-east-1',
        credentials: undefined,
      },
      west: {
        region: 'us-west-2',
        credentials: {
          accessKeyId: 'accessKeyId',
          secretAccessKey: 'secretAccessKey',
          sessionToken: undefined,
        },
      },
    });
  });
});
