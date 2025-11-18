import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await knex('users').del();

  await knex('users').insert([
    {
      id: 1,
      email: 'admin@zmck.co.sz',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      hourly_rate: 0,
      is_active: true,
    },
    {
      id: 2,
      email: 'supervisor@zmck.co.sz',
      password_hash: hashedPassword,
      first_name: 'Supervisor',
      last_name: 'User',
      role: 'supervisor',
      hourly_rate: 150.00,
      is_active: true,
    },
    {
      id: 3,
      email: 'engineer@zmck.co.sz',
      password_hash: hashedPassword,
      first_name: 'Engineer',
      last_name: 'User',
      role: 'engineer',
      hourly_rate: 120.00,
      is_active: true,
    },
  ]);
}

