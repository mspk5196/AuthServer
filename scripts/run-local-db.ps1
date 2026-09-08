<#
.SYNOPSIS
  Starts the local PostgreSQL and Redis containers for local testing.
  Pre-seeds the database with all schemas, tables, and data from Sql/public.sql.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot "docker\docker-compose.local.yml"

Write-Host "🚀 Starting local isolated database & redis containers..." -ForegroundColor Cyan

docker compose -f $ComposeFile up -d local-postgres local-redis

Write-Host "`n⏳ Waiting for local database to become healthy..." -ForegroundColor Yellow
$timeout = 60
$elapsed = 0
while ($elapsed -lt $timeout) {
    $status = docker inspect --format='{{json .State.Health.Status}}' auth-local-postgres 2>$null
    if ($status -like "*healthy*") {
        Write-Host "`n✅ Local PostgreSQL is READY and seeded with Sql/public.sql!" -ForegroundColor Green
        Write-Host "   Host: localhost:5432"
        Write-Host "   User: mspkapps | Password: Pranesh82 | DB: authdb"
        Write-Host "   Redis: localhost:6379"
        Write-Host "`n✨ You can now run your local dev servers:"
        Write-Host "   1. Developer Backend: cd developerWeb\Backend && npm run dev (http://localhost:5000)"
        Write-Host "   2. Developer Web:     cd developerWeb\authServerWeb && npm run dev (http://localhost:4001)"
        Write-Host "   3. CPanel Backend:    cd Cpanel\auth-server && npm run dev (http://localhost:5002)"
        Write-Host "   4. CPanel Web:        cd Cpanel\CpanelWeb && npm run dev (http://localhost:4002)"
        exit 0
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host -NoNewline "."
}

Write-Host "`n⚠️ PostgreSQL container is still initializing. Check logs with: docker logs -f auth-local-postgres" -ForegroundColor Yellow

