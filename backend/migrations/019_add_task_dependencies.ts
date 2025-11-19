import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_dependencies', (table) => {
    table.increments('id').primary();
    table.integer('task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.integer('depends_on_task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.enum('dependency_type', ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).defaultTo('finish_to_start');
    table.timestamps(true, true);
    
    // Prevent self-dependencies
    table.check('task_id != depends_on_task_id', [], 'no_self_dependency');
    
    // Prevent duplicate dependencies
    table.unique(['task_id', 'depends_on_task_id']);
    
    table.index(['task_id']);
    table.index(['depends_on_task_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('task_dependencies');
}

