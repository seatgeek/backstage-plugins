/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { Config } from '@backstage/config';

export const PROVIDER_CONFIG_KEY = 'catalog.providers.aws';

export interface ProviderConfig {
  readonly region: string;
  readonly credentials: AwsCredentialIdentity | undefined;
}

export function getProviderConfigs(
  configRoot: Config,
): Record<string, ProviderConfig> {
  const awsConfig = configRoot.getOptionalConfig(PROVIDER_CONFIG_KEY);
  if (!awsConfig) {
    return {};
  }

  return Object.fromEntries(
    awsConfig.keys().map(key => {
      const individualConfig = awsConfig.getConfig(key);
      const region = individualConfig.getString('region');
      const accessKeyId = individualConfig.getOptionalString('accessKeyId');
      const secretAccessKey =
        individualConfig.getOptionalString('secretAccessKey');
      const sessionToken = individualConfig.getOptionalString('sessionToken');
      let credentials: AwsCredentialIdentity | undefined = undefined;
      if (accessKeyId && secretAccessKey) {
        credentials = {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        };
      }

      return [
        key,
        {
          region,
          credentials,
        },
      ];
    }),
  );
}
