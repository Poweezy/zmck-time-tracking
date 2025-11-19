import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('milestones', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description');
    table.date('target_date').notNullable();
    table.date('completed_date');
    table.enum('status', ['upcoming', 'in_progress', 'completed', 'overdue']).defaultTo('upcoming');
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);
    
    table.index(['project_id']);
    table.index(['status']);
    table.index(['target_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('milestones');
}

