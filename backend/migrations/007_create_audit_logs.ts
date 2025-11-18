import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable(); // 'create', 'update', 'delete', 'approve', 'reject', etc.
    table.string('entity_type').notNullable();
    table.integer('entity_id');
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.string('ip_address');
    table.text('user_agent');
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('action');
    table.index(['entity_type', 'entity_id']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('audit_logs');
}

