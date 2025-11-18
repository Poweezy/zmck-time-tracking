import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('time_entries', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE').notNullable();
    table.integer('task_id').unsigned().references('id').inTable('tasks').onDelete('SET NULL');
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time');
    table.decimal('duration_hours', 10, 2).notNullable();
    table.text('notes');
    table.enum('approval_status', ['pending', 'approved', 'rejected', 'changes_requested']).notNullable().defaultTo('pending');
    table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.text('rejection_reason');
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('project_id');
    table.index('task_id');
    table.index('approval_status');
    table.index('start_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('time_entries');
}

