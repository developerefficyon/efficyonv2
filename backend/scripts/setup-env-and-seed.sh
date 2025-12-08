#!/bin/bash

# Setup script for Efficyon backend
# This script creates .env files and seeds the admin user

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Efficyon Backend Setup Script${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

# Default values
ADMIN_EMAIL="admin@efficyon.com"
ADMIN_PASSWORD="Admin@123456"
STAGING_ADMIN_PASSWORD="Admin@Staging123456"

# Function to prompt for input
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    read -p "$prompt [$default]: " input
    eval "$var_name=\"\${input:-$default}\""
}

# Function to create .env file
create_env_file() {
    local env_file="$1"
    local supabase_url="$2"
    local supabase_key="$3"
    local admin_password="$4"
    local port="${5:-4000}"
    local node_env="${6:-development}"
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️  $env_file already exists.${NC}"
        read -p "Do you want to overwrite it? (y/N): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Skipping $env_file creation...${NC}"
            return
        fi
    fi
    
    cat > "$env_file" << EOF
# Supabase Configuration
SUPABASE_URL=$supabase_url
SUPABASE_SERVICE_ROLE_KEY=$supabase_key

# Server Configuration
PORT=$port
NODE_ENV=$node_env

# Admin Credentials (used for seeding)
ADMIN_PASSWORD=$admin_password
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
    
    echo -e "${GREEN}✅ Created $env_file${NC}"
}

# Check if .env files exist
echo -e "${YELLOW}📝 Environment Setup${NC}"
echo ""

# Prompt for Supabase credentials
echo "Please provide your Supabase credentials:"
prompt_with_default "Supabase URL" "" SUPABASE_URL
prompt_with_default "Supabase Service Role Key" "" SUPABASE_SERVICE_ROLE_KEY

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: Supabase URL and Service Role Key are required!${NC}"
    exit 1
fi

# Prompt for admin password
echo ""
echo "Admin user configuration:"
prompt_with_default "Admin Email" "$ADMIN_EMAIL" ADMIN_EMAIL
prompt_with_default "Admin Password (Development)" "$ADMIN_PASSWORD" ADMIN_PASSWORD
prompt_with_default "Admin Password (Staging)" "$STAGING_ADMIN_PASSWORD" STAGING_ADMIN_PASSWORD

# Prompt for server configuration
echo ""
echo "Server configuration:"
prompt_with_default "Port (Development)" "4000" DEV_PORT
prompt_with_default "Port (Staging)" "4000" STAGING_PORT

# Create .env file (development)
echo ""
echo -e "${GREEN}Creating .env file (development)...${NC}"
create_env_file ".env" "$SUPABASE_URL" "$SUPABASE_SERVICE_ROLE_KEY" "$ADMIN_PASSWORD" "$DEV_PORT" "development"

# Create .env.staging file
echo ""
echo -e "${GREEN}Creating .env.staging file...${NC}"
create_env_file ".env.staging" "$SUPABASE_URL" "$SUPABASE_SERVICE_ROLE_KEY" "$STAGING_ADMIN_PASSWORD" "$STAGING_PORT" "staging"

# Seed admin user
echo ""
echo -e "${GREEN}🌱 Seeding admin user...${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Run seed script
if [ -f "scripts/seed.js" ]; then
    echo -e "${GREEN}Running seed script...${NC}"
    npm run seed
    echo ""
    echo -e "${GREEN}✅ Admin user seeded successfully!${NC}"
else
    echo -e "${RED}❌ Error: seed.js not found!${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📋 Summary:"
echo "  • .env file created (development)"
echo "  • .env.staging file created"
echo "  • Admin user seeded"
echo ""
echo "🔑 Admin Credentials:"
echo "  • Email: $ADMIN_EMAIL"
echo "  • Password (Dev): $ADMIN_PASSWORD"
echo "  • Password (Staging): $STAGING_ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  1. Keep your .env files secure and never commit them to git"
echo "  2. Change the admin password after first login"
echo "  3. Update .env.staging with staging-specific values if needed"
echo ""
echo -e "${GREEN}🚀 You can now start the server with: npm run dev${NC}"

