# Backend Scripts

## Setup Script

### `setup-env-and-seed.sh`

A comprehensive setup script that:
- Creates `.env` file for development
- Creates `.env.staging` file for staging environment
- Seeds the admin user in the database

### Usage

```bash
# Make the script executable (first time only)
chmod +x scripts/setup-env-and-seed.sh

# Run the setup script
./scripts/setup-env-and-seed.sh
```

Or on Windows (Git Bash or WSL):
```bash
bash scripts/setup-env-and-seed.sh
```

### What it does:

1. **Prompts for Supabase credentials:**
   - Supabase URL
   - Supabase Service Role Key

2. **Prompts for admin configuration:**
   - Admin email (default: `admin@efficyon.com`)
   - Admin password for development
   - Admin password for staging

3. **Creates environment files:**
   - `.env` - Development environment
   - `.env.staging` - Staging environment

4. **Seeds the admin user:**
   - Creates admin user in Supabase auth
   - Creates admin profile in the database

### Environment Files Created

Both `.env` and `.env.staging` will contain:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=4000
NODE_ENV=development
ADMIN_PASSWORD=your_admin_password
ADMIN_EMAIL=admin@efficyon.com
```

## Seed Scripts

### `seed.js` (Development)

Seeds the admin user in the database using `.env` file.

### Usage

```bash
npm run seed
```

### `seed-staging.js` (Staging)

Seeds the admin user in the database using `.env.staging` file.

### Usage

```bash
npm run seed:staging
```

### Requirements

**For Development (`seed.js`):**
- `.env` file must exist with:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_PASSWORD` (optional, defaults to `Admin@123456`)
  - `ADMIN_EMAIL` (optional, defaults to `admin@efficyon.com`)

**For Staging (`seed-staging.js`):**
- `.env.staging` file must exist with:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_PASSWORD` (optional, defaults to `Admin@123456`)
  - `ADMIN_EMAIL` (optional, defaults to `admin@efficyon.com`)

### What they do:

1. Checks if admin user already exists
2. Creates admin user in Supabase auth if needed
3. Creates/updates admin profile in the database
4. Sets admin role, approval status, and email verification

