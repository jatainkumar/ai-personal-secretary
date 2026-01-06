# AI Secretary Unified - Startup Script
# Starts both backend and frontend services

Write-Host "🚀 Starting AI Secretary Unified..." -ForegroundColor Cyan

# Check if in project root
if (-Not (Test-Path "backend") -or -Not (Test-Path "frontend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Start Backend
Write-Host "`n📦 Starting Backend Server..." -ForegroundColor Yellow
cd backend
Start-Process -FilePath "cmd.exe" -ArgumentList "/k conda activate ps-chi && uvicorn main:app --reload --port 8000" -WindowStyle Normal
cd ..

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Yellow
cd frontend
Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm run dev" -WindowStyle Normal
cd ..

Write-Host "`n✅ Services Starting!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan  
Write-Host "`nPress Ctrl+C in each terminal window to stop the servers" -ForegroundColor Gray
