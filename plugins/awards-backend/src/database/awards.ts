/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  PluginDatabaseManager,
  resolvePackagePath,
} from '@backstage/backend-common';
import { Award } from '@seatgeek/plugin-awards-common';
import { Knex } from 'knex';
import { isEmpty } from 'lodash';
import { v4 as uuid } from 'uuid';

export interface AwardsStore {
  search(
    uid: string,
    name: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award[]>;

  add(
    name: string,
    description: string,
    image: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award>;

  update(
    uid: string,
    name: string,
    description: string,
    image: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award>;

  delete(uid: string): Promise<boolean>;
}

const migrationsDir = resolvePackagePath(
  // TODO: this was @backstage in the beginning, but it breaks service startup.
  '@seatgeek/plugin-awards-backend', // Package name
  'migrations', // Migrations directory
);

type DatabaseAwardsStoreOptions = {
  database: PluginDatabaseManager;
  skipMigrations?: boolean;
};

export class DatabaseAwardsStore implements AwardsStore {
  private constructor(private readonly db: Knex) {}

  static async create({
    database,
    skipMigrations,
  }: DatabaseAwardsStoreOptions): Promise<DatabaseAwardsStore> {
    const client = await database.getClient();

    if (!database.migrations?.skip && !skipMigrations) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new DatabaseAwardsStore(client);
  }

  async search(
    uid: string,
    name: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award[]> {
    let aggFunctionBegin = 'string_agg(';
    let aggFunctionEnd = ", ',')";
    if (this.db.client.config.client.includes('sqlite')) {
      aggFunctionBegin = 'group_concat(';
      aggFunctionEnd = ')';
    }

    // https://stackoverflow.com/questions/64656592/node-knex-to-return-array-of-objects-as-a-result-of-joined-tables
    // select a.*, ao.owners as owners, am.recipients as recipients from awards a left join (select awards_uid, array_agg(owner_ref) as owners from awards_owners group by awards_uid) ao on a.uid = ao.awards_uid left join (select awards_uid, array_agg(recipient_ref) as recipients from awards_recipients group by awards_uid) am on a.uid = am.awards_uid order by a.name;
    let query = this.db<Award>('awards')
      .select('awards.*')
      .leftJoin('awards_owners', 'awards.uid', 'awards_owners.awards_uid')
      .leftJoin(
        'awards_recipients',
        'awards.uid',
        'awards_recipients.awards_uid',
      )
      .groupBy('awards.uid')
      .orderBy('awards.uid')
      .select(
        this.db.raw(
          `${aggFunctionBegin}distinct awards_owners.owner_ref${aggFunctionEnd} as owners`,
        ),
        this.db.raw(
          `${aggFunctionBegin}distinct awards_recipients.recipient_ref${aggFunctionEnd} as recipients`,
        ),
      );

    if (!isEmpty(name)) {
      query = query.where('awards.name', name);
    }

    if (!isEmpty(uid)) {
      query = query.where('awards.uid', uid);
    }

    const ownersToSearch = owners.filter(owner => !isEmpty(owner));
    const recipientsToSearch = recipients.filter(member => !isEmpty(member));

    if (ownersToSearch.length > 0) {
      query = query.whereIn('owner_ref', owners);
    }

    if (recipientsToSearch.length > 0) {
      query = query.whereIn('recipient_ref', recipients);
    }

    return query.then(res => {
      // This is required to have the same behavior on sqlite and pgsql
      return res.map(awd => {
        awd.owners = isEmpty(awd.owners) ? [] : awd.owners.split(',');
        awd.recipients = isEmpty(awd.recipients)
          ? []
          : awd.recipients.split(',');
        return awd;
      });
    });
  }

  async add(
    name: string,
    description: string,
    image: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award> {
    const record = {
      uid: uuid(),
      name: name,
      description: description,
      image: image,
    };

    const ownersToAdd = owners.filter(owner => !isEmpty(owner));
    const recipientsToAdd = recipients.filter(member => !isEmpty(member));

    if (ownersToAdd.length === 0) {
      throw new Error('New award must have at least one owner');
    }

    try {
      await this.db.transaction(async tx => {
        await tx<Award>('awards').insert(record).onConflict(['uid']).merge();

        await tx.table('awards_owners').insert(
          ownersToAdd.map(owner => ({
            awards_uid: record.uid,
            owner_ref: owner,
          })),
        );

        if (recipientsToAdd.length > 0) {
          await tx.table('awards_recipients').insert(
            recipientsToAdd.map(member => ({
              awards_uid: record.uid,
              recipient_ref: member,
            })),
          );
        }

        await tx.commit();
      });
    } catch (error) {
      console.error('Transaction failed', error);
      throw new Error(`Transaction failed: ${error}`);
    }

    return new Promise<Award>(resolve =>
      resolve({
        ...record,
        owners: ownersToAdd,
        recipients: recipientsToAdd,
      }),
    );
  }

  async update(
    uid: string,
    name: string,
    description: string,
    image: string,
    owners: string[],
    recipients: string[],
  ): Promise<Award> {
    const record = {
      uid: uid,
      name: name,
      description: description,
      image: image,
    };

    let resOwners: string[] = [];
    let resRecipients: string[] = [];

    try {
      await this.db.transaction(async tx => {
        const currentOwners: string[] = await tx
          .table('awards_owners')
          .where({ awards_uid: uid })
          .pluck('owner_ref');
        const ownersToAdd = owners.filter(
          owner => !currentOwners.includes(owner) && !isEmpty(owner),
        );
        const ownersToRemove = currentOwners.filter(
          owner => !owners.includes(owner) && !isEmpty(owner),
        );

        const currentRecipients: string[] = await tx
          .table('awards_recipients')
          .where('awards_uid', uid)
          .pluck('recipient_ref');
        const recipientsToAdd = recipients.filter(
          member => !currentRecipients.includes(member) && !isEmpty(member),
        );
        const recipientsToRemove = currentRecipients.filter(
          member => !recipients.includes(member) && !isEmpty(member),
        );

        await tx<Award>('awards').update(record).where({ uid: uid });

        // Add new owners
        if (ownersToAdd.length > 0) {
          await tx('awards_owners').insert(
            ownersToAdd.map(owner => ({
              awards_uid: uid,
              owner_ref: owner,
            })),
          );
        }

        // Remove old owners
        await tx('awards_owners')
          .where({ awards_uid: uid })
          .whereIn('owner_ref', ownersToRemove)
          .delete();

        // Add new recipients
        if (recipientsToAdd.length > 0) {
          await tx('awards_recipients').insert(
            recipientsToAdd.map(member => ({
              awards_uid: uid,
              recipient_ref: member,
            })),
          );
        }

        // Remove old recipients
        await tx('awards_recipients')
          .where({ awards_uid: uid })
          .whereIn('recipient_ref', recipientsToRemove)
          .delete();

        // Refresh from db
        resOwners = await tx
          .table('awards_owners')
          .where({ awards_uid: uid })
          .pluck('owner_ref');
        resRecipients = await tx
          .table('awards_recipients')
          .where('awards_uid', uid)
          .pluck('recipient_ref');

        await tx.commit();
      });
    } catch (error) {
      console.error('Transaction failed', error);
      throw new Error('Transaction failed');
    }

    return new Promise<Award>(resolve =>
      resolve({
        ...record,
        owners: resOwners,
        recipients: resRecipients,
      }),
    );
  }

  async delete(uid: string): Promise<boolean> {
    const res = await this.db<Award>('awards').where({ uid: uid }).delete();
    return Promise.resolve(!(res === undefined));
  }
}
