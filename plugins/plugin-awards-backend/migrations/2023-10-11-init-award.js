exports.up = async function up(knex) {
  await knex.schema.createTable('awards', table => {
    table.uuid('uid').notNullable()
      .unique()
      .primary();
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.text('image').notNullable();

    table.timestamps(true, true);
  })
  .createTable('awards_owners', table => {
    table.uuid('awards_uid').notNullable()
      .references('awards.uid')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('owner_ref').notNullable();

    table.primary(['awards_uid', 'owner_ref']);
    table.index(['owner_ref'], 'awards_owners_owner_ref_index');

    table.timestamps(true, true);
  })
  .createTable('awards_recipients', table => {
    table.uuid('awards_uid').notNullable()
      .references('awards.uid')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('recipient_ref').notNullable();

    table.primary(['awards_uid', 'recipient_ref']);
    table.index(['recipient_ref'], 'awards_recipients_recipient_ref_index');

    table.timestamps(true, true);
  });
}

exports.down = async function down(knex) {
  await knex.schema.alterTable('awards_recipients', table => {

    table.dropIndex('', 'awards_recipients_recipient_ref_index');

  })
  .dropTable('awards_recipients')
  .alterTable('awards_owners', table => {

    table.dropIndex('', 'awards_owners_owner_ref_index');

  })
  .dropTable('awards_owners')
  .alterTable('awards', table => {

    table.dropIndex('', 'awards_uuid_index');
    
  })
  .dropTable('awards');
}