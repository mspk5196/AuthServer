# Group Management Features Setup Script (Windows)
# Run this with PowerShell

Write-Host "🚀 Setting up Group Management Features..." -ForegroundColor Green

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your database credentials."
    exit 1
}

# Load environment variables from .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

Write-Host "📊 Running database migration..." -ForegroundColor Yellow

# Get database connection string
$DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://localhost/auth_server" }

# Run the migration using psql
$migrationFile = "migrations\007_group_management_features.sql"

if (Test-Path $migrationFile) {
    psql $DATABASE_URL -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed! Please check the error messages above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your backend server: npm start"
Write-Host "2. Access the CPanel and navigate to Groups"
Write-Host "3. Click ⚙️ Settings on any group to access new features"
Write-Host ""
Write-Host "📖 For detailed documentation, see GROUP_MANAGEMENT_FEATURES.md"
