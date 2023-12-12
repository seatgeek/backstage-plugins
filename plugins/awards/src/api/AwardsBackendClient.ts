import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { Award } from '@internal/plugin-awards-common';
import { AwardsApi } from './types';

export class AwardsBackendApi implements AwardsApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async getAwards(
    uid: string,
    name: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award[]> {
    const url = `${await this.discoveryApi.getBaseUrl('awards')}/`;
    // https://stackoverflow.com/questions/35038857/setting-query-string-using-fetch-get-request
    const query = new URLSearchParams();
    query.append('uid', uid);
    query.append('name', name);
    owners.forEach(owner => {
      query.append('owners', owner);
    })
    recipients.forEach(recipient => {
      query.append('recipients', recipient);
    })
    return await this.fetchApi
      .fetch(`${url}?${query}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.json());
  }

  async save(award: Award): Promise<Award> {
    const url = `${await this.discoveryApi.getBaseUrl('awards')}/`;

    const method = award.uid === '' ? 'POST' : 'PUT';
    const suffix = award.uid === '' ? '' : `/${award.uid}`;

    return await this.fetchApi
      .fetch(`${url}${suffix}`, {
        method: method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(award),
      })
      .then(res => res.json());
  }

  async delete(uid: string): Promise<boolean> {
    const url = `${await this.discoveryApi.getBaseUrl('awards')}/`;

    return await this.fetchApi
      .fetch(`${url}/${uid}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.json());
  }
}
