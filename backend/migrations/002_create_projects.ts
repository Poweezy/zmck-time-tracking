import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('code').unique().notNullable();
    table.string('client').notNullable();
    table.integer('manager_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.decimal('allocated_hours', 10, 2);
    table.decimal('budget_amount', 12, 2);
    table.enum('type', ['FIXED', 'OPEN', 'HYBRID']).notNullable().defaultTo('OPEN');
    table.enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled']).notNullable().defaultTo('planning');
    table.text('description');
    table.date('start_date');
    table.date('end_date');
    table.timestamps(true, true);
    
    table.index('code');
    table.index('manager_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('projects');
}

