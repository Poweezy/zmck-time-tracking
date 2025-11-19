import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('expenses', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.integer('task_id').unsigned().references('id').inTable('tasks').onDelete('SET NULL');
    table.decimal('amount', 10, 2).notNullable();
    table.string('category', 100).notNullable(); // e.g., 'Travel', 'Materials', 'Equipment', 'Other'
    table.string('description', 500);
    table.date('expense_date').notNullable();
    table.string('receipt_file_path', 500); // Path to uploaded receipt
    table.enum('approval_status', ['pending', 'approved', 'rejected', 'changes_requested']).defaultTo('pending');
    table.text('rejection_reason');
    table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.timestamps(true, true);
    
    table.index(['user_id', 'expense_date']);
    table.index(['project_id']);
    table.index(['approval_status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expenses');
}

