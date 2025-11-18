import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attachments', (table) => {
    table.increments('id').primary();
    table.string('filename').notNullable();
    table.string('original_filename').notNullable();
    table.string('file_path').notNullable();
    table.string('mime_type').notNullable();
    table.integer('file_size').notNullable();
    table.string('entity_type').notNullable(); // 'task', 'time_entry', 'project'
    table.integer('entity_id').notNullable();
    table.integer('uploaded_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.index(['entity_type', 'entity_id']);
    table.index('uploaded_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('attachments');
}

