import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE').notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.integer('assigned_to').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.decimal('estimated_hours', 10, 2);
    table.integer('progress_percentage').defaultTo(0).checkBetween([0, 100]);
    table.enum('status', ['todo', 'in_progress', 'review', 'done']).notNullable().defaultTo('todo');
    table.date('due_date');
    table.integer('priority').defaultTo(0).checkBetween([0, 5]);
    table.timestamps(true, true);
    
    table.index('project_id');
    table.index('assigned_to');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tasks');
}

