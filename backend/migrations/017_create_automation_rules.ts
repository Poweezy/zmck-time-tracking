import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('automation_rules', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.enum('trigger_type', ['task_created', 'task_status_changed', 'time_entry_created', 'project_status_changed', 'due_date_approaching']).notNullable();
    table.json('trigger_conditions').nullable(); // Conditions that must be met
    table.enum('action_type', ['assign_user', 'change_status', 'create_task', 'send_notification', 'update_field']).notNullable();
    table.json('action_params').notNullable(); // Action parameters
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.integer('execution_count').defaultTo(0);
    table.timestamp('last_executed_at').nullable();
    table.timestamps(true, true);
    
    table.index('trigger_type');
    table.index('is_active');
  });

  // Automation execution log
  await knex.schema.createTable('automation_executions', (table) => {
    table.increments('id').primary();
    table.integer('rule_id').unsigned().references('id').inTable('automation_rules').onDelete('CASCADE').notNullable();
    table.enum('entity_type', ['project', 'task', 'time_entry']).notNullable();
    table.integer('entity_id').notNullable();
    table.enum('status', ['success', 'failed', 'skipped']).notNullable();
    table.text('error_message').nullable();
    table.timestamps(true, true);
    
    table.index('rule_id');
    table.index(['entity_type', 'entity_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('automation_executions');
  await knex.schema.dropTable('automation_rules');
}

