import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_status_updates', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE').notNullable();
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL').notNullable();
    table.enum('status', ['on_track', 'at_risk', 'off_track', 'on_hold']).notNullable();
    table.text('update_text').notNullable();
    table.decimal('progress_percentage', 5, 2).checkBetween([0, 100]);
    table.json('highlights'); // Array of highlights
    table.json('blockers'); // Array of blockers
    table.timestamps(true, true);
    
    table.index('project_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('project_status_updates');
}

