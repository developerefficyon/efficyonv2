# Setup script for Efficyon backend (PowerShell version)
# This script creates .env files and seeds the admin user

$ErrorActionPreference = "Stop"

Write-Host "Efficyon Backend Setup Script" -ForegroundColor Green
Write-Host ""

# Get the directory where the script is located
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Split-Path -Parent $SCRIPT_DIR
Set-Location $BACKEND_DIR

# Default values
$script:ADMIN_EMAIL = "admin@efficyon.com"
$script:ADMIN_PASSWORD = "Admin@123456"
$script:STAGING_ADMIN_PASSWORD = "Admin@Staging123456"

# Function to prompt for input with default
function Get-InputWithDefault {
    param(
        [string]$Prompt,
        [string]$Default
    )
    $input = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($input)) {
        return $Default
    }
    return $input
}

# Function to create .env file
function New-EnvFile {
    param(
        [string]$FilePath,
        [string]$SupabaseUrl,
        [string]$SupabaseKey,
        [string]$AdminPassword,
        [string]$Port = "4000",
        [string]$NodeEnv = "development"
    )
    
    if (Test-Path $FilePath) {
        Write-Host "WARNING: $FilePath already exists." -ForegroundColor Yellow
        $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
        if ($overwrite -notmatch "^[Yy]$") {
            Write-Host "Skipping $FilePath creation..." -ForegroundColor Yellow
            return
        }
    }
    
    $lines = @(
        "# Supabase Configuration",
        "SUPABASE_URL=$SupabaseUrl",
        "SUPABASE_SERVICE_ROLE_KEY=$SupabaseKey",
        "",
        "# Server Configuration",
        "PORT=$Port",
        "NODE_ENV=$NodeEnv",
        "",
        "# Admin Credentials (used for seeding)",
        "ADMIN_PASSWORD=$AdminPassword",
        "ADMIN_EMAIL=$script:ADMIN_EMAIL"
    )
    
    $lines | Out-File -FilePath $FilePath -Encoding utf8
    Write-Host "SUCCESS: Created $FilePath" -ForegroundColor Green
}

# Function to read value from .env file
function Get-EnvValue {
    param(
        [string]$FilePath,
        [string]$Key
    )
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath
        foreach ($line in $content) {
            if ($line -match "^$Key=(.+)$") {
                return $matches[1].Trim()
            }
        }
    }
    return $null
}

# Check if .env files exist and read existing values
Write-Host "Environment Setup" -ForegroundColor Yellow
Write-Host ""

# Try to read from existing .env file
$existingSupabaseUrl = Get-EnvValue ".env" "SUPABASE_URL"
$existingSupabaseKey = Get-EnvValue ".env" "SUPABASE_SERVICE_ROLE_KEY"
$existingAdminPassword = Get-EnvValue ".env" "ADMIN_PASSWORD"
$existingAdminEmail = Get-EnvValue ".env" "ADMIN_EMAIL"
$existingPort = Get-EnvValue ".env" "PORT"

# Try to read from existing .env.staging file
$existingStagingPassword = Get-EnvValue ".env.staging" "ADMIN_PASSWORD"
$existingStagingPort = Get-EnvValue ".env.staging" "PORT"

# Use existing values as defaults, or prompt if not found
if ($existingSupabaseUrl) {
    Write-Host "Found existing Supabase URL in .env" -ForegroundColor Green
    $SUPABASE_URL = $existingSupabaseUrl
} else {
    $SUPABASE_URL = Read-Host "Supabase URL"
}

if ($existingSupabaseKey) {
    Write-Host "Found existing Supabase Service Role Key in .env" -ForegroundColor Green
    $SUPABASE_SERVICE_ROLE_KEY = $existingSupabaseKey
} else {
    $SUPABASE_SERVICE_ROLE_KEY = Read-Host "Supabase Service Role Key"
}

if ([string]::IsNullOrWhiteSpace($SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($SUPABASE_SERVICE_ROLE_KEY)) {
    Write-Host "ERROR: Supabase URL and Service Role Key are required!" -ForegroundColor Red
    exit 1
}

# Prompt for admin password (use existing values as defaults)
Write-Host ""
Write-Host "Admin user configuration:"
if ($existingAdminEmail) {
    $script:ADMIN_EMAIL = $existingAdminEmail
    Write-Host "Using existing Admin Email: $script:ADMIN_EMAIL" -ForegroundColor Green
} else {
    $script:ADMIN_EMAIL = Get-InputWithDefault "Admin Email" $script:ADMIN_EMAIL
}

if ($existingAdminPassword) {
    $script:ADMIN_PASSWORD = $existingAdminPassword
    Write-Host "Using existing Admin Password (Development) from .env" -ForegroundColor Green
} else {
    $script:ADMIN_PASSWORD = Get-InputWithDefault "Admin Password (Development)" $script:ADMIN_PASSWORD
}

if ($existingStagingPassword) {
    $script:STAGING_ADMIN_PASSWORD = $existingStagingPassword
    Write-Host "Using existing Admin Password (Staging) from .env.staging" -ForegroundColor Green
} else {
    $script:STAGING_ADMIN_PASSWORD = Get-InputWithDefault "Admin Password (Staging)" $script:STAGING_ADMIN_PASSWORD
}

# Prompt for server configuration (use existing values as defaults)
Write-Host ""
Write-Host "Server configuration:"
if ($existingPort) {
    $DEV_PORT = $existingPort
    Write-Host "Using existing Port (Development): $DEV_PORT" -ForegroundColor Green
} else {
    $DEV_PORT = Get-InputWithDefault "Port (Development)" "4000"
}

if ($existingStagingPort) {
    $STAGING_PORT = $existingStagingPort
    Write-Host "Using existing Port (Staging): $STAGING_PORT" -ForegroundColor Green
} else {
    $STAGING_PORT = Get-InputWithDefault "Port (Staging)" "4000"
}

# Create .env file (development)
Write-Host ""
Write-Host "Creating .env file (development)..." -ForegroundColor Green
New-EnvFile ".env" $SUPABASE_URL $SUPABASE_SERVICE_ROLE_KEY $script:ADMIN_PASSWORD $DEV_PORT "development"

# Create .env.staging file
Write-Host ""
Write-Host "Creating .env.staging file..." -ForegroundColor Green
New-EnvFile ".env.staging" $SUPABASE_URL $SUPABASE_SERVICE_ROLE_KEY $script:STAGING_ADMIN_PASSWORD $STAGING_PORT "staging"

# Seed admin user
Write-Host ""
$seedOption = Read-Host "Seed admin user? (1=Development, 2=Staging, 3=Both, N=Skip) [3]"
if ([string]::IsNullOrWhiteSpace($seedOption)) {
    $seedOption = "3"
}

# Check if node_modules exists
if ($seedOption -ne "N" -and $seedOption -ne "n") {
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
}

# Run seed script based on option
if ($seedOption -eq "1" -or $seedOption -eq "3") {
    if (Test-Path "scripts/seed.js") {
        Write-Host ""
        Write-Host "Seeding admin user for DEVELOPMENT..." -ForegroundColor Green
        npm run seed
        Write-Host "SUCCESS: Admin user seeded for development!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: seed.js not found!" -ForegroundColor Red
    }
}

if ($seedOption -eq "2" -or $seedOption -eq "3") {
    if (Test-Path "scripts/seed-staging.js") {
        Write-Host ""
        Write-Host "Seeding admin user for STAGING..." -ForegroundColor Green
        npm run seed:staging
        Write-Host "SUCCESS: Admin user seeded for staging!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: seed-staging.js not found!" -ForegroundColor Red
    }
}

if ($seedOption -eq "N" -or $seedOption -eq "n") {
    Write-Host "Skipping seed..." -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS: Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:"
Write-Host "  - .env file created (development)"
Write-Host "  - .env.staging file created"
Write-Host "  - Admin user seeded"
Write-Host ""
Write-Host "Admin Credentials:"
Write-Host "  - Email: $script:ADMIN_EMAIL"
Write-Host "  - Password (Dev): $script:ADMIN_PASSWORD"
Write-Host "  - Password (Staging): $script:STAGING_ADMIN_PASSWORD"
Write-Host ""
Write-Host "Remember to:" -ForegroundColor Yellow
Write-Host "  1. Keep your .env files secure and never commit them to git"
Write-Host "  2. Change the admin password after first login"
Write-Host "  3. Update .env.staging with staging-specific values if needed"
Write-Host ""
Write-Host "You can now start the server with: npm run dev" -ForegroundColor Green
