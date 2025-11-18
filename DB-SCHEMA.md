# Database Schema

This document describes the database schema for the ZMCK Time Tracking System.

## Overview

The system uses PostgreSQL with the following tables:

- `users` - User accounts and authentication
- `projects` - Project information
- `tasks` - Task management
- `time_entries` - Time tracking records
- `attachments` - File attachments
- `comments` - Comments on entities
- `audit_logs` - Audit trail
- `sage_csv_mappings` - Sage ACCPAC export configurations

## Tables

### users

Stores user accounts and authentication information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | User ID |
| email | VARCHAR UNIQUE | Email address (login) |
| password_hash | VARCHAR | Bcrypt hashed password |
| first_name | VARCHAR | First name |
| last_name | VARCHAR | Last name |
| role | ENUM | Role: admin, supervisor, engineer |
| hourly_rate | DECIMAL(10,2) | Hourly rate for costing |
| is_active | BOOLEAN | Account active status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### projects

Stores project information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Project ID |
| name | VARCHAR | Project name |
| code | VARCHAR UNIQUE | Project code |
| client | VARCHAR | Client name |
| manager_id | INTEGER | Foreign key to users.id |
| allocated_hours | DECIMAL(10,2) | Allocated hours (nullable) |
| budget_amount | DECIMAL(12,2) | Budget amount (nullable) |
| type | ENUM | Type: FIXED, OPEN, HYBRID |
| status | ENUM | Status: planning, active, on_hold, completed, cancelled |
| description | TEXT | Project description |
| start_date | DATE | Project start date |
| end_date | DATE | Project end date |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- code
- manager_id
- status

### tasks

Stores task information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Task ID |
| project_id | INTEGER | Foreign key to projects.id |
| title | VARCHAR | Task title |
| description | TEXT | Task description |
| assigned_to | INTEGER | Foreign key to users.id |
| estimated_hours | DECIMAL(10,2) | Estimated hours |
| progress_percentage | INTEGER | Progress (0-100) |
| status | ENUM | Status: todo, in_progress, review, done |
| due_date | DATE | Due date |
| priority | INTEGER | Priority (0-5) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- project_id
- assigned_to
- status

### time_entries

Stores time tracking entries.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Time entry ID |
| user_id | INTEGER | Foreign key to users.id |
| project_id | INTEGER | Foreign key to projects.id |
| task_id | INTEGER | Foreign key to tasks.id (nullable) |
| start_time | TIMESTAMP | Start time |
| end_time | TIMESTAMP | End time (nullable) |
| duration_hours | DECIMAL(10,2) | Duration in hours |
| notes | TEXT | Notes |
| approval_status | ENUM | Status: pending, approved, rejected, changes_requested |
| approved_by | INTEGER | Foreign key to users.id (nullable) |
| approved_at | TIMESTAMP | Approval timestamp (nullable) |
| rejection_reason | TEXT | Rejection reason (nullable) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- user_id
- project_id
- task_id
- approval_status
- start_time

### attachments

Stores file attachments.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Attachment ID |
| filename | VARCHAR | Stored filename |
| original_filename | VARCHAR | Original filename |
| file_path | VARCHAR | File system path |
| mime_type | VARCHAR | MIME type |
| file_size | INTEGER | File size in bytes |
| entity_type | VARCHAR | Entity type: task, time_entry, project |
| entity_id | INTEGER | Entity ID |
| uploaded_by | INTEGER | Foreign key to users.id |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- (entity_type, entity_id)
- uploaded_by

### comments

Stores comments on entities.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Comment ID |
| entity_type | VARCHAR | Entity type: task, time_entry, project |
| entity_id | INTEGER | Entity ID |
| user_id | INTEGER | Foreign key to users.id |
| content | TEXT | Comment content |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- (entity_type, entity_id)
- user_id

### audit_logs

Stores audit trail records.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Audit log ID |
| user_id | INTEGER | Foreign key to users.id (nullable) |
| action | VARCHAR | Action: create, update, delete, approve, etc. |
| entity_type | VARCHAR | Entity type |
| entity_id | INTEGER | Entity ID (nullable) |
| old_values | JSONB | Old values (nullable) |
| new_values | JSONB | New values (nullable) |
| ip_address | VARCHAR | IP address |
| user_agent | TEXT | User agent string |
| created_at | TIMESTAMP | Creation timestamp |

**Indexes:**
- user_id
- action
- (entity_type, entity_id)
- created_at

### sage_csv_mappings

Stores Sage ACCPAC export column mappings.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Mapping ID |
| name | VARCHAR | Mapping name |
| column_mapping | JSONB | Column mapping configuration |
| is_default | BOOLEAN | Default mapping flag |
| created_by | INTEGER | Foreign key to users.id |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- is_default

## Relationships

- `projects.manager_id` → `users.id`
- `tasks.project_id` → `projects.id`
- `tasks.assigned_to` → `users.id`
- `time_entries.user_id` → `users.id`
- `time_entries.project_id` → `projects.id`
- `time_entries.task_id` → `tasks.id`
- `time_entries.approved_by` → `users.id`
- `attachments.uploaded_by` → `users.id`
- `comments.user_id` → `users.id`
- `audit_logs.user_id` → `users.id`
- `sage_csv_mappings.created_by` → `users.id`

## Migrations

Database migrations are managed using Knex.js. Run migrations with:

```bash
npm run migrate
```

Rollback migrations with:

```bash
npm run migrate:rollback
```

## Seeds

Initial seed data includes:
- Default admin, supervisor, and engineer users
- Default Sage ACCPAC mapping configuration

Run seeds with:

```bash
npm run seed
```

