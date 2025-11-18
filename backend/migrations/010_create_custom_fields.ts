import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Custom field definitions table
  await knex.schema.createTable('custom_fields', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.enum('type', ['text', 'number', 'date', 'dropdown', 'multi_select', 'checkbox']).notNullable();
    table.enum('entity_type', ['project', 'task']).notNullable();
    table.string('color', 7); // Hex color code
    table.json('options'); // For dropdown/multi_select options
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('entity_type');
  });

  // Custom field values table (polymorphic)
  await knex.schema.createTable('custom_field_values', (table) => {
    table.increments('id').primary();
    table.integer('custom_field_id').unsigned().references('id').inTable('custom_fields').onDelete('CASCADE').notNullable();
    table.enum('entity_type', ['project', 'task']).notNullable();
    table.integer('entity_id').notNullable(); // project_id or task_id
    table.text('value'); // Stored as text, parsed based on field type
    table.timestamps(true, true);
    
    table.unique(['custom_field_id', 'entity_type', 'entity_id']);
    table.index(['entity_type', 'entity_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('custom_field_values');
  await knex.schema.dropTable('custom_fields');
}

