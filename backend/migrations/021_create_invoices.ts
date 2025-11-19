import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invoices', (table) => {
    table.increments('id').primary();
    table.string('invoice_number', 50).unique().notNullable();
    table.integer('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.integer('client_id').unsigned(); // Can reference a clients table if needed
    table.date('invoice_date').notNullable();
    table.date('due_date').notNullable();
    table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    table.decimal('tax_rate', 5, 2).defaultTo(0); // Tax percentage
    table.decimal('tax_amount', 12, 2).defaultTo(0);
    table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    table.enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']).defaultTo('draft');
    table.text('notes');
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('sent_at');
    table.timestamp('paid_at');
    table.timestamps(true, true);
    
    table.index(['project_id']);
    table.index(['status']);
    table.index(['invoice_date']);
    table.index(['invoice_number']);
  });

  await knex.schema.createTable('invoice_items', (table) => {
    table.increments('id').primary();
    table.integer('invoice_id').unsigned().notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    table.string('description', 500).notNullable();
    table.decimal('quantity', 10, 2).notNullable().defaultTo(1);
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('item_type', 50).notNullable(); // 'time', 'expense', 'fixed'
    table.integer('time_entry_id').unsigned().references('id').inTable('time_entries').onDelete('SET NULL');
    table.integer('expense_id').unsigned().references('id').inTable('expenses').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.index(['invoice_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
}

