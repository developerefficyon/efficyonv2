# Deploying Backend to Render

## Root Directory Configuration

When deploying to Render, set the **Root Directory** to:
```
backend
```

## Build & Start Commands

### Build Command
```
npm install
```

### Start Command
```
npm start
```

Or for development:
```
npm run dev
```

## Environment Variables

Make sure to set these environment variables in Render:

1. **PORT** (optional, defaults to 4000)
   - Render will automatically set this, but you can override if needed

2. **SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key (from Supabase Dashboard → Settings → API)

4. **NODE_ENV** (optional)
   - Set to `production` for production deployments

## Render Service Settings

1. **Service Type**: Web Service
2. **Environment**: Node
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Root Directory**: `backend`

## Health Check

The backend includes a health check endpoint:
- **URL**: `https://your-service.onrender.com/health`
- Render can use this for health checks

## Database Setup

Before deploying, make sure to:

1. Run the SQL migrations in Supabase:
   - `001_users_and_roles.sql`
   - `002_profiles_status.sql`
   - `003_add_customer_role.sql`
   - `007_simplified_profiles_setup.sql` (recommended)

2. Seed the admin user:
   - Run `npm run seed` locally or create admin manually in Supabase

## CORS Configuration

The backend is configured to accept requests from your frontend. Make sure your frontend's `NEXT_PUBLIC_API_URL` points to your Render backend URL.

## Example Render Configuration

```
Name: efficyon-backend
Environment: Node
Region: (choose closest to your users)
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

## Troubleshooting

- If the service fails to start, check the logs in Render dashboard
- Ensure all environment variables are set correctly
- Verify the PORT is not conflicting (Render sets this automatically)
- Check that Supabase credentials are correct

