"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
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
exports.default = config;
//# sourceMappingURL=knexfile.js.map