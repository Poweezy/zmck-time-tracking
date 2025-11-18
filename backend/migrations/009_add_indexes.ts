import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Time entries indexes for common queries
  await knex.schema.alterTable('time_entries', (table) => {
    table.index(['user_id', 'approval_status'], 'idx_time_entries_user_status');
    table.index(['project_id', 'start_time'], 'idx_time_entries_project_date');
    table.index(['task_id', 'approval_status'], 'idx_time_entries_task_status');
    table.index(['start_time'], 'idx_time_entries_start_time');
  });

  // Tasks indexes
  await knex.schema.alterTable('tasks', (table) => {
    table.index(['project_id', 'status'], 'idx_tasks_project_status');
    table.index(['assigned_to', 'status'], 'idx_tasks_assigned_status');
    table.index(['status'], 'idx_tasks_status');
    table.index(['due_date'], 'idx_tasks_due_date');
  });

  // Projects indexes
  await knex.schema.alterTable('projects', (table) => {
    table.index(['status'], 'idx_projects_status');
    table.index(['manager_id'], 'idx_projects_manager');
    table.index(['type', 'status'], 'idx_projects_type_status');
  });

  // Users indexes
  await knex.schema.alterTable('users', (table) => {
    table.index(['is_active'], 'idx_users_active');
    table.index(['role', 'is_active'], 'idx_users_role_active');
  });

  // Audit logs indexes
  await knex.schema.alterTable('audit_logs', (table) => {
    table.index(['user_id', 'created_at'], 'idx_audit_user_date');
    table.index(['entity_type', 'entity_id'], 'idx_audit_entity');
    table.index(['action', 'created_at'], 'idx_audit_action_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('time_entries', (table) => {
    table.dropIndex(['user_id', 'approval_status'], 'idx_time_entries_user_status');
    table.dropIndex(['project_id', 'start_time'], 'idx_time_entries_project_date');
    table.dropIndex(['task_id', 'approval_status'], 'idx_time_entries_task_status');
    table.dropIndex(['start_time'], 'idx_time_entries_start_time');
  });

  await knex.schema.alterTable('tasks', (table) => {
    table.dropIndex(['project_id', 'status'], 'idx_tasks_project_status');
    table.dropIndex(['assigned_to', 'status'], 'idx_tasks_assigned_status');
    table.dropIndex(['status'], 'idx_tasks_status');
    table.dropIndex(['due_date'], 'idx_tasks_due_date');
  });

  await knex.schema.alterTable('projects', (table) => {
    table.dropIndex(['status'], 'idx_projects_status');
    table.dropIndex(['manager_id'], 'idx_projects_manager');
    table.dropIndex(['type', 'status'], 'idx_projects_type_status');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['is_active'], 'idx_users_active');
    table.dropIndex(['role', 'is_active'], 'idx_users_role_active');
  });

  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropIndex(['user_id', 'created_at'], 'idx_audit_user_date');
    table.dropIndex(['entity_type', 'entity_id'], 'idx_audit_entity');
    table.dropIndex(['action', 'created_at'], 'idx_audit_action_date');
  });
}

