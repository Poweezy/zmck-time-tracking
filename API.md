# API Documentation

The ZMCK Time Tracking API is RESTful and uses JSON for data exchange.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "engineer"
  }
}
```

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "engineer",
  "hourlyRate": 120.00
}
```

### Users

#### GET /users
Get all users (Admin/Supervisor only).

#### GET /users/:id
Get user by ID.

#### POST /users
Create new user (Admin only).

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "engineer",
  "hourlyRate": 120.00
}
```

#### PUT /users/:id
Update user (Admin only).

### Projects

#### GET /projects
Get all projects.

**Query Parameters:**
- `status` (optional): Filter by status

#### GET /projects/:id
Get project by ID.

#### POST /projects
Create new project (Admin/Supervisor only).

**Request:**
```json
{
  "name": "Project Name",
  "code": "PROJ001",
  "client": "Client Name",
  "type": "FIXED",
  "allocatedHours": 100,
  "budgetAmount": 50000,
  "managerId": 1
}
```

#### PUT /projects/:id
Update project (Admin/Supervisor only).

### Tasks

#### GET /tasks
Get all tasks.

**Query Parameters:**
- `projectId` (optional)
- `assignedTo` (optional)
- `status` (optional)

#### GET /tasks/:id
Get task by ID.

#### POST /tasks
Create new task (Admin/Supervisor only).

**Request:**
```json
{
  "projectId": 1,
  "title": "Task Title",
  "description": "Task description",
  "assignedTo": 2,
  "estimatedHours": 8,
  "status": "todo",
  "dueDate": "2024-12-31",
  "priority": 3
}
```

#### PUT /tasks/:id
Update task.

### Time Entries

#### GET /time-entries
Get all time entries.

**Query Parameters:**
- `userId` (optional)
- `projectId` (optional)
- `taskId` (optional)
- `approvalStatus` (optional)
- `from` (optional): ISO 8601 date
- `to` (optional): ISO 8601 date

#### GET /time-entries/:id
Get time entry by ID.

#### POST /time-entries
Create time entry.

**Request:**
```json
{
  "projectId": 1,
  "taskId": 1,
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T17:00:00Z",
  "durationHours": 8,
  "notes": "Worked on feature implementation"
}
```

#### PUT /time-entries/:id
Update time entry.

#### DELETE /time-entries/:id
Delete time entry.

### Approvals

#### GET /approvals/pending
Get pending time entries (Admin/Supervisor only).

#### PUT /approvals/:id/approve
Approve time entry (Admin/Supervisor only).

#### PUT /approvals/:id/reject
Reject time entry (Admin/Supervisor only).

**Request:**
```json
{
  "rejectionReason": "Incorrect hours logged"
}
```

#### PUT /approvals/:id/request-changes
Request changes to time entry (Admin/Supervisor only).

#### POST /approvals/bulk-approve
Bulk approve time entries (Admin/Supervisor only).

**Request:**
```json
{
  "entryIds": [1, 2, 3]
}
```

### Export

#### GET /export/sage
Export time entries to Sage ACCPAC CSV format (Admin/Supervisor only).

**Query Parameters:**
- `from` (optional): ISO 8601 date
- `to` (optional): ISO 8601 date
- `projectId` (optional)
- `mappingId` (optional)

#### GET /export/sage/preview
Preview export data (Admin/Supervisor only).

#### GET /export/mappings
Get all Sage CSV mappings.

### Analytics

#### GET /analytics/dashboard
Get dashboard analytics (Admin/Supervisor only).

**Query Parameters:**
- `from` (optional): ISO 8601 date
- `to` (optional): ISO 8601 date

#### GET /analytics/user/:userId
Get user productivity analytics (Admin/Supervisor only).

### Attachments

#### POST /attachments
Upload attachment.

**Request:** Multipart form data
- `file`: File to upload
- `entityType`: 'task', 'time_entry', or 'project'
- `entityId`: ID of the entity

#### GET /attachments
Get attachments.

**Query Parameters:**
- `entityType` (optional)
- `entityId` (optional)

#### GET /attachments/:id
Download attachment.

#### DELETE /attachments/:id
Delete attachment.

### Audit

#### GET /audit
Get audit logs (Admin/Supervisor only).

**Query Parameters:**
- `userId` (optional)
- `action` (optional)
- `entityType` (optional)
- `entityId` (optional)
- `from` (optional): ISO 8601 date
- `to` (optional): ISO 8601 date
- `limit` (optional): Max 1000

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description"
  }
}
```

### Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3001/api-docs
```

## Rate Limiting

- API endpoints: 10 requests/second
- Login endpoint: 5 requests/minute

