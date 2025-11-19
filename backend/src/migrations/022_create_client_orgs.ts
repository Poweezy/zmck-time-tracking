import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('client_orgs', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('logo_url');
    table.string('primary_contact_name');
    table.string('primary_contact_email');
    table.string('primary_contact_phone');
    table.jsonb('branding_preferences').defaultTo('{}');
    table.jsonb('notification_preferences').defaultTo('{}');
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('projects', (table) => {
    table.integer('client_org_id').unsigned().references('id').inTable('client_orgs').onDelete('SET NULL');
  });

  await knex.schema.alterTable('users', (table) => {
    table.boolean('is_client_portal_user').notNullable().defaultTo(false);
    table.integer('client_org_id').unsigned().references('id').inTable('client_orgs').onDelete('SET NULL');
    table.jsonb('client_permissions').defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('client_permissions');
    table.dropColumn('client_org_id');
    table.dropColumn('is_client_portal_user');
  });

  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('client_org_id');
  });

  await knex.schema.dropTable('client_orgs');
}

