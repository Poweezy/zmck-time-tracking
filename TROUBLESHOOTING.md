# Troubleshooting Guide

## Backend Server Not Running (ERR_CONNECTION_REFUSED)

If you see `ERR_CONNECTION_REFUSED` when trying to access the API, the backend server is not running.

### Quick Fix

1. **Start the backend server:**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Or use the start script:**
   ```powershell
   .\start.ps1
   ```

### Verify Backend is Running

Check if port 3001 is listening:
```powershell
Get-NetTCPConnection -LocalPort 3001
```

If nothing is returned, the backend is not running.

### Common Issues

#### 1. Port Already in Use
If port 3001 is already in use:
- Find the process: `Get-NetTCPConnection -LocalPort 3001`
- Kill it: `Stop-Process -Id <PID>`
- Or change the port in `.env`: `PORT=3002`

#### 2. Database Connection Error
If you see database connection errors:
- Ensure PostgreSQL is running
- Check `.env` file has correct database credentials:
  ```
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432
  POSTGRES_DB=zmck_timetracking
  POSTGRES_USER=zmck_user
  POSTGRES_PASSWORD=zmck_password
  ```

#### 3. Missing Dependencies
If you see module not found errors:
```powershell
cd backend
npm install
```

#### 4. TypeScript Compilation Errors
If you see TypeScript errors:
```powershell
cd backend
npm run build
```

### Starting Both Servers

To start both backend and frontend:

**Option 1: Use the start script**
```powershell
.\start.ps1
```

**Option 2: Manual start**
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Default URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api-docs
- Health Check: http://localhost:3001/health

### Default Login

- Email: `admin@zmck.co.sz`
- Password: `admin123`

**⚠️ IMPORTANT: Change the default password after first login!**

