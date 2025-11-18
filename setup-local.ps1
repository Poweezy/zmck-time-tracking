# ZMCK Time Tracking - Local Setup Script for Windows
# This script helps set up the application to run locally without Docker

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ZMCK Time Tracking - Local Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
# Database Configuration
POSTGRES_USER=zmck_user
POSTGRES_PASSWORD=zmck_password_change_me
POSTGRES_DB=zmck_timetracking
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Backend Configuration
NODE_ENV=development
BACKEND_PORT=3001
JWT_SECRET=change-me-to-strong-secret-key-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001/api

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,dxf
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host ".env file created. Please edit it with your database credentials." -ForegroundColor Green
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}

# Create data directories
Write-Host "Creating data directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "data\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "data\uploads\exports" | Out-Null
New-Item -ItemType Directory -Force -Path "data\uploads\tasks" | Out-Null
New-Item -ItemType Directory -Force -Path "data\uploads\time_entries" | Out-Null
New-Item -ItemType Directory -Force -Path "data\uploads\projects" | Out-Null
New-Item -ItemType Directory -Force -Path "data\uploads\general" | Out-Null
Write-Host "Data directories created." -ForegroundColor Green

# Check for PostgreSQL
Write-Host ""
Write-Host "Checking for PostgreSQL..." -ForegroundColor Yellow
$pgPath = Get-Command psql -ErrorAction SilentlyContinue
if ($pgPath) {
    Write-Host "PostgreSQL found!" -ForegroundColor Green
    Write-Host "You can now run database migrations with: cd backend; npm run migrate" -ForegroundColor Cyan
} else {
    Write-Host "PostgreSQL not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "To run this application, you need PostgreSQL installed." -ForegroundColor Yellow
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "1. Install PostgreSQL locally: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "2. Install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    Write-Host "3. Use a cloud PostgreSQL service (e.g., Supabase, Railway)" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure PostgreSQL is running" -ForegroundColor White
Write-Host "2. Update .env with your database credentials" -ForegroundColor White
Write-Host "3. Run migrations: cd backend; npm run migrate" -ForegroundColor White
Write-Host "4. Seed database: cd backend; npm run seed" -ForegroundColor White
Write-Host "5. Start backend: cd backend; npm run dev" -ForegroundColor White
Write-Host "6. Start frontend (in new terminal): cd frontend; npm run dev" -ForegroundColor White
Write-Host ""

