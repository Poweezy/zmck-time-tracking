import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Form definitions
  await knex.schema.createTable('forms', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('type').notNullable(); // 'work_request', 'project_intake', etc.
    table.json('fields').notNullable(); // Form field definitions
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Form submissions
  await knex.schema.createTable('form_submissions', (table) => {
    table.increments('id').primary();
    table.integer('form_id').unsigned().references('id').inTable('forms').onDelete('CASCADE').notNullable();
    table.integer('submitted_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.json('data').notNullable(); // Form submission data
    table.enum('status', ['pending', 'reviewed', 'approved', 'rejected']).defaultTo('pending');
    table.integer('reviewed_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('review_notes').nullable();
    table.integer('created_project_id').unsigned().references('id').inTable('projects').onDelete('SET NULL').nullable(); // If form creates a project
    table.timestamps(true, true);
    
    table.index('form_id');
    table.index('submitted_by');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('form_submissions');
  await knex.schema.dropTable('forms');
}

