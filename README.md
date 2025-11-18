# ZMCK Engineering Time-Tracking & Project Performance System

A full-stack, on-premise time tracking and project performance management application for ZMCK Engineering (Eswatini).

## Features

- **User Authentication & RBAC**: JWT-based authentication with role-based access control (Admin, Supervisor, Engineer)
- **Project Management**: Create and manage projects with fixed/open/hybrid types, allocated hours, and budgets
- **Task Management**: Asana-style task management with status tracking and progress monitoring
- **Time Tracking**: Timer-based and manual time entry with approval workflow
- **Approval System**: Supervisors can approve, reject, or request changes to time entries
- **Analytics Dashboard**: Productivity metrics, hours tracking, and project progress
- **File Attachments**: Upload and manage documents, drawings, and reports
- **Sage ACCPAC Export**: Export approved time entries to CSV format compatible with Sage ACCPAC
- **Audit Logging**: Comprehensive audit trail for compliance and HR monitoring

## Technology Stack

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL with Knex.js migrations
- JWT authentication
- Swagger API documentation
- Multer for file uploads

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios for API calls

### Deployment
- Docker + Docker Compose
- Nginx reverse proxy
- PostgreSQL database

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd zmck-time-tracking
```

2. Run the installation script:
```bash
chmod +x install.sh
./install.sh
```

3. Access the application:
- Frontend: http://localhost
- API Documentation: http://localhost/api-docs

4. Default login credentials:
- Email: `admin@zmck.co.sz`
- Password: `admin123`

**IMPORTANT**: Change the default password after first login!

## Configuration

Edit the `.env` file to configure:
- Database credentials
- JWT secret key
- File upload settings
- API URLs

## Usage

### For Engineers
1. Log in and navigate to "Time Tracking"
2. Start/stop timer or manually enter time
3. Select project and task
4. Submit time entries for approval

### For Supervisors
1. Review pending time entries in "Approvals"
2. Approve, reject, or request changes
3. View analytics and reports

### For Admins
1. Manage users, projects, and tasks
2. Configure Sage ACCPAC export mappings
3. View audit logs and system analytics

## Backup

Run the backup script to create backups:
```bash
chmod +x backup.sh
./backup.sh
```

Backups are stored in the `backups/` directory.

## Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Sage Export Guide](SAGE-EXPORT-GUIDE.md)
- [Database Schema](DB-SCHEMA.md)

## Support

For issues or questions, please contact the development team.

## License

Proprietary - ZMCK Engineering

