# Quick Start Guide - Running Without Docker

Since Docker is not installed, here's how to run the application locally:

## Option 1: Install PostgreSQL Locally (Recommended)

1. **Download and Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/windows/
   - During installation, remember the password you set for the `postgres` user
   - Default port is 5432

2. **Create Database and User**
   ```sql
   -- Connect to PostgreSQL as postgres user, then run:
   CREATE DATABASE zmck_timetracking;
   CREATE USER zmck_user WITH PASSWORD 'zmck_password_change_me';
   GRANT ALL PRIVILEGES ON DATABASE zmck_timetracking TO zmck_user;
   ```

3. **Update .env file** with your PostgreSQL credentials

4. **Run Setup**
   ```powershell
   # Run setup script
   powershell -ExecutionPolicy Bypass -File setup-local.ps1
   
   # Run migrations
   cd backend
   npm run migrate
   
   # Seed database
   npm run seed
   ```

5. **Start Application**
   ```powershell
   # Start backend (Terminal 1)
   cd backend
   npm run dev
   
   # Start frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

## Option 2: Use Docker Desktop (Easiest)

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and restart your computer

2. **Run Installation**
   ```powershell
   # On Linux/Mac:
   ./install.sh
   
   # On Windows (after installing Docker):
   docker-compose up -d
   ```

## Option 3: Use Cloud PostgreSQL (Quick Setup)

1. **Sign up for free PostgreSQL service**
   - Supabase: https://supabase.com (free tier available)
   - Railway: https://railway.app (free tier available)
   - Neon: https://neon.tech (free tier available)

2. **Get Connection String**
   - Copy the connection string from your provider
   - Format: `postgresql://user:password@host:port/database`

3. **Update .env**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

4. **Run Migrations and Start**
   ```powershell
   cd backend
   npm run migrate
   npm run seed
   npm run dev
   ```

## Access the Application

Once running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs

## Default Login

- Email: `admin@zmck.co.sz`
- Password: `admin123`

**⚠️ IMPORTANT**: Change the default password after first login!

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running
- Verify database credentials in `.env`
- Check if port 3001 is available

### Frontend won't start
- Check if port 3000 is available
- Verify `REACT_APP_API_URL` in `.env`

### Database connection errors
- Verify PostgreSQL is running: `psql -U postgres`
- Check firewall settings
- Verify credentials in `.env`

