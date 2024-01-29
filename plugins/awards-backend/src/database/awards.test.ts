import { v4 as uuid } from 'uuid';
import { Knex } from 'knex';
import { Award } from '@seatgeek/plugin-awards-common';
import { DatabaseManager } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { DatabaseAwardsStore } from './awards';

function generateTestAwards(length: number): Award[] {
  return Array.from({ length: length }, (_, index) => {
    return {
      uid: uuid(),
      name: `Test Award ${index}`,
      description: `Description for award ${index}`,
      image: 'Base 64 blob here',
      owners: ['user:default/user1', 'user:default/user2'],
      recipients: ['user:default/user1', 'user:default/user2'],
    };
  });
}

describe('awards database CRUD', () => {
  let store: DatabaseAwardsStore;
  let db: Knex;

  beforeEach(async () => {
    // Need to do this to avoid using @backstage/backend-test-utils and run into
    // a conflict with the knex import from the plugin.
    // This means that the tests will run only on SQLite.
    const createDatabaseManager = async () =>
      DatabaseManager.fromConfig(
        new ConfigReader({
          backend: {
            database: {
              client: 'better-sqlite3',
              connection: ':memory:',
            },
          },
        }),
      ).forPlugin('awards');
    const dbm = await createDatabaseManager();
    db = await dbm.getClient();

    store = await DatabaseAwardsStore.create({
      database: await createDatabaseManager(),
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should create an award', async () => {
    const award = generateTestAwards(1)[0];

    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      award.recipients,
    );

    expect(result).toBeDefined();
    expect(award.uid).not.toEqual('');
    expect(award.name).toEqual(award.name);
    expect(award.description).toEqual(award.description);
    expect(award.image).toEqual(award.image);
    expect(award.owners).toEqual(award.owners);
    expect(award.recipients).toEqual(award.recipients);
  });

  it('should look up an award by uuid', async () => {
    const award = generateTestAwards(1)[0];
    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      award.recipients,
    );
    const results = await store.search(result.uid, '', [], []);
    expect(results.length > 0).toBeTruthy();

    const first = results[0];
    expect(first.uid).toEqual(first.uid);
  });

  it('should look up an award by name', async () => {
    const award = generateTestAwards(1)[0];
    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      award.recipients,
    );
    const results = await store.search('', award.name, [], []);
    expect(results.length > 0).toBeTruthy();

    const first = results[0];
    expect(first.name).toEqual(result.name);
  });

  it('should look up an award by owners', async () => {
    const award = generateTestAwards(1)[0];
    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      award.recipients,
    );
    const results = await store.search('', '', [award.owners[0]], []);
    expect(results.length > 0).toBeTruthy();

    const first = results[0];
    expect(first.owners.includes(result.owners[0])).toBeTruthy();
  });

  it('should look up an award by recipient', async () => {
    const award = generateTestAwards(1)[0];
    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      award.recipients,
    );
    const results = await store.search(
      '',
      award.name,
      [],
      [result.recipients[0]],
    );
    expect(results.length > 0).toBeTruthy();

    const first = results[0];
    expect(first.recipients.includes(result.recipients[0])).toBeTruthy();
  });

  it('should update an award', async () => {
    const award = generateTestAwards(1)[0];

    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      award.recipients,
    );
    const updated = await store.update(
      result.uid,
      `${result.name} updated`,
      `${result.description} updated`,
      `${result.image} updated`,
      [],
      [],
    );

    const retrieved = await store.search(updated.uid, '', [], []);
    expect(retrieved.length).toBeGreaterThan(0);

    const upd = retrieved[0];

    expect(upd).toBeDefined();
    expect(upd.uid).toEqual(updated.uid);
    expect(upd.name).toEqual(updated.name);
    expect(upd.description).toEqual(updated.description);
    expect(upd.image).toEqual(updated.image);
    expect(upd.owners.length === 0).toBeTruthy();
    expect(upd.recipients.length === 0).toBeTruthy();
  });

  it('should not create an award with no owners', async () => {
    const award = generateTestAwards(1)[0];
    const createWithNoOwner = async () => {
      await store.add(
        award.name,
        award.description,
        award.image,
        [],
        award.recipients,
      );
    };
    await expect(createWithNoOwner).rejects.toThrow(
      'New award must have at least one owner',
    );
  });

  it('should create an award with no recipients', async () => {
    const award = generateTestAwards(1)[0];
    const result = await store.add(
      award.name,
      award.description,
      award.image,
      award.owners,
      [],
    );
    const results = await store.search('', '', [award.owners[0]], []);
    expect(results.length > 0).toBeTruthy();

    const first = results[0];
    expect(first.owners.includes(result.owners[0])).toBeTruthy();
  });
});
