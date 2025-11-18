import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('sage_csv_mappings').del();

  await knex('sage_csv_mappings').insert([
    {
      id: 1,
      name: 'Default Sage ACCPAC Mapping',
      column_mapping: {
        'Employee Code': 'user_id',
        'Project Code': 'project_code',
        'Task Code': 'task_id',
        'Date': 'start_time',
        'Hours': 'duration_hours',
        'Description': 'notes',
        'Cost Center': 'project_id',
        'Rate': 'hourly_rate',
      },
      is_default: true,
      created_by: 1,
    },
  ]);
}

