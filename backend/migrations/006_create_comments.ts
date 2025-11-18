import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
    table.increments('id').primary();
    table.string('entity_type').notNullable(); // 'task', 'time_entry', 'project'
    table.integer('entity_id').notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('content').notNullable();
    table.timestamps(true, true);
    
    table.index(['entity_type', 'entity_id']);
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('comments');
}

