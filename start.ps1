# ZMCK Time Tracking - Start Script
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting ZMCK Time Tracking System" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please run: powershell -ExecutionPolicy Bypass -File setup-local.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if backend dependencies are installed
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Check if frontend dependencies are installed
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "Starting backend server on port 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend Server - Port 3001' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting frontend server on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend Server - Port 3000' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Servers are starting!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:3001/api-docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: You need PostgreSQL running for the app to work!" -ForegroundColor Yellow
Write-Host "See QUICK-START.md for database setup instructions." -ForegroundColor Yellow
Write-Host ""
Write-Host "Default login:" -ForegroundColor Yellow
Write-Host "  Email: admin@zmck.co.sz" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""

