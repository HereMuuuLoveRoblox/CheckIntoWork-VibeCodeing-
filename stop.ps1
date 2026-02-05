# Working Time - Stop All Services
# รันคำสั่งนี้: .\stop.ps1

Write-Host "Stopping all services..." -ForegroundColor Yellow

# Stop Docker containers
Push-Location "Back-End"
docker-compose down
Pop-Location

Write-Host "All services stopped!" -ForegroundColor Green
