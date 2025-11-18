import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('portfolios', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Portfolio-project linking
  await knex.schema.createTable('portfolio_projects', (table) => {
    table.increments('id').primary();
    table.integer('portfolio_id').unsigned().references('id').inTable('portfolios').onDelete('CASCADE').notNullable();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE').notNullable();
    table.timestamps(true, true);
    
    table.unique(['portfolio_id', 'project_id']);
    table.index('portfolio_id');
    table.index('project_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('portfolio_projects');
  await knex.schema.dropTable('portfolios');
}

