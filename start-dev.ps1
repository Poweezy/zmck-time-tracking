# ZMCK Time Tracking - Development Start Script
# This script starts both backend and frontend servers

Write-Host "Starting ZMCK Time Tracking System..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found. Run setup-local.ps1 first." -ForegroundColor Red
    exit 1
}

# Start backend in background
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in background
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Servers starting in separate windows!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:3001/api-docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: Make sure PostgreSQL is running and migrations are complete!" -ForegroundColor Yellow
Write-Host ""

