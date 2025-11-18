import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('type').notNullable(); // 'time_entry_approved', 'time_entry_rejected', 'task_assigned', 'task_updated', 'project_updated', etc.
    table.string('title').notNullable();
    table.text('message');
    table.enum('entity_type', ['project', 'task', 'time_entry', 'user']).nullable();
    table.integer('entity_id').nullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at').nullable();
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('is_read');
    table.index(['user_id', 'is_read']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('notifications');
}

