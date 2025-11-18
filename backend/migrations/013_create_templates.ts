import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Project templates
  await knex.schema.createTable('project_templates', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('code_prefix').nullable(); // Prefix for auto-generated project codes
    table.enum('type', ['FIXED', 'OPEN', 'HYBRID']).notNullable().defaultTo('OPEN');
    table.json('default_fields'); // Default project fields (allocated_hours, budget, etc.)
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Template tasks (tasks that come with a template)
  await knex.schema.createTable('template_tasks', (table) => {
    table.increments('id').primary();
    table.integer('template_id').unsigned().references('id').inTable('project_templates').onDelete('CASCADE').notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.integer('order').defaultTo(0);
    table.decimal('estimated_hours', 10, 2);
    table.integer('priority').defaultTo(0);
    table.enum('default_status', ['todo', 'in_progress', 'review', 'done']).defaultTo('todo');
    table.timestamps(true, true);
    
    table.index('template_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('template_tasks');
  await knex.schema.dropTable('project_templates');
}

