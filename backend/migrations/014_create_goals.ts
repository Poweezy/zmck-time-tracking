import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Goals table
  await knex.schema.createTable('goals', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.enum('type', ['company', 'team', 'individual']).notNullable();
    table.integer('parent_goal_id').unsigned().references('id').inTable('goals').onDelete('SET NULL').nullable();
    table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.date('start_date');
    table.date('end_date');
    table.decimal('target_value', 10, 2).nullable(); // Numeric target (e.g., hours, revenue)
    table.string('target_unit', 50).nullable(); // Unit for target (hours, %, etc.)
    table.decimal('current_value', 10, 2).defaultTo(0);
    table.enum('status', ['not_started', 'on_track', 'at_risk', 'off_track', 'achieved']).defaultTo('not_started');
    table.timestamps(true, true);
    
    table.index('type');
    table.index('parent_goal_id');
    table.index('owner_id');
  });

  // Goal-project linking
  await knex.schema.createTable('goal_projects', (table) => {
    table.increments('id').primary();
    table.integer('goal_id').unsigned().references('id').inTable('goals').onDelete('CASCADE').notNullable();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE').notNullable();
    table.timestamps(true, true);
    
    table.unique(['goal_id', 'project_id']);
    table.index('goal_id');
    table.index('project_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('goal_projects');
  await knex.schema.dropTable('goals');
}

