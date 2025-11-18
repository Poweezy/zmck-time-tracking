import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      database: process.env.POSTGRES_DB || 'zmck_timetracking',
      user: process.env.POSTGRES_USER || 'zmck_user',
      password: process.env.POSTGRES_PASSWORD || 'zmck_password',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      database: process.env.POSTGRES_DB || 'zmck_timetracking',
      user: process.env.POSTGRES_USER || 'zmck_user',
      password: process.env.POSTGRES_PASSWORD || 'zmck_password',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};

export default config;

