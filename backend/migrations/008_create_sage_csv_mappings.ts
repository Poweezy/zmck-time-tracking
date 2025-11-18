import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sage_csv_mappings', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.jsonb('column_mapping').notNullable(); // Maps our fields to Sage ACCPAC columns
    table.boolean('is_default').defaultTo(false);
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.index('is_default');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('sage_csv_mappings');
}

