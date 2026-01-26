# Supabase Setup for Stripe Webhooks

This guide covers what you need to set up in Supabase for Stripe webhooks to work properly.

## Prerequisites

1. **Supabase Project** - You need an active Supabase project
2. **Service Role Key** - Required for backend operations (bypasses RLS)

## Step 1: Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important:** Use the `service_role` key (not `anon` key) for backend operations. This key bypasses Row Level Security (RLS) policies, which is necessary for webhook handlers.

## Step 2: Configure Backend Environment

Add these to your `backend/.env` file:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 3: Run Database Migrations

You need to ensure all required tables exist. Run these SQL files in order in your Supabase SQL Editor:

### Required Tables (in order):

1. **Profiles & Auth Setup:**
   - `001_users_and_roles.sql` - Creates profiles table and roles enum
   - `005_recreate_profiles_table.sql` or `007_simplified_profiles_setup.sql` - Sets up profiles table
   - `004_auto_update_email_verified.sql` - Auto-updates email verification

2. **Core Tables:**
   - `008_saas_core_tables.sql` - Creates companies, integrations, etc.

3. **Stripe Payment Tables:**
   - `012_clean_payment_schema.sql` - **This is the main one for Stripe!**
     - Creates `plan_catalog` table
     - Creates `subscriptions` table
     - Creates `payments` table
     - Creates `token_balances` table
     - Seeds default plans

4. **Webhook Permissions (Optional but Recommended):**
   - `019_webhook_service_role_policies.sql` - Adds service role policies for webhooks
     - Allows backend to manage subscriptions, payments, token_balances
     - Ensures webhooks can operate even with RLS enabled

### Quick Setup (All-in-One):

If you want to run everything at once, you can use:

```sql
-- Run 012_clean_payment_schema.sql in Supabase SQL Editor
-- This creates all Stripe-related tables and seeds the plan catalog
```

## Step 4: Verify Tables Exist

Run this query in Supabase SQL Editor to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles',
    'companies',
    'subscriptions',
    'payments',
    'plan_catalog',
    'token_balances'
  )
ORDER BY table_name;
```

You should see all 6 tables listed.

## Step 5: Verify Plan Catalog is Seeded

Check that plans are seeded:

```sql
SELECT tier, name, price_monthly_cents, included_tokens 
FROM plan_catalog 
ORDER BY price_monthly_cents;
```

You should see: `free`, `startup`, `growth`, `custom` plans.

## Step 6: Row Level Security (RLS)

### Option A: Service Role (Recommended for Webhooks)

If your backend uses `SUPABASE_SERVICE_ROLE_KEY`, RLS is automatically bypassed. **No additional setup needed.**

### Option B: Add Service Role Policies (Recommended)

Run the provided SQL file for explicit service role policies:

```sql
-- Run 019_webhook_service_role_policies.sql in Supabase SQL Editor
```

This file adds policies that explicitly allow the service role to:
- Manage subscriptions (for webhooks)
- Manage payments (for webhooks)
- Manage token balances (for webhooks)
- Read profiles (for validation)
- Read plan catalog (for plan details)

**Note:** Even though service role should bypass RLS, these policies provide explicit permissions and can help with debugging.

## Step 7: Verify Foreign Key Constraints

The `subscriptions` table has a foreign key to `profiles`:

```sql
-- Check foreign key constraint
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'subscriptions' 
  AND tc.constraint_type = 'FOREIGN KEY';
```

You should see:
- `subscriptions.user_id` → `profiles.id`
- `subscriptions.company_id` → `companies.id` (nullable)
- `subscriptions.plan_tier` → `plan_catalog.tier`

## Step 8: Test Database Connection

Test that your backend can connect:

```bash
# In your backend directory
node -e "
require('dotenv').config();
const { supabase } = require('./src/config/supabase');
supabase.from('plan_catalog').select('*').then(({data, error}) => {
  if (error) console.error('Error:', error);
  else console.log('Success! Plans:', data.length);
});
"
```

## Common Issues

### Issue: "Foreign key constraint violation"

**Cause:** User doesn't have a profile in the `profiles` table.

**Solution:**
```sql
-- Check if user exists
SELECT id, email FROM profiles WHERE id = '<user-id-from-error>';

-- If missing, create profile (user must exist in auth.users first)
INSERT INTO profiles (id, email, role, status)
VALUES ('<user-id>', '<email>', 'customer', 'active')
ON CONFLICT (id) DO NOTHING;
```

### Issue: "Table does not exist"

**Solution:** Run the SQL migrations in Step 3.

### Issue: "Permission denied"

**Cause:** Using `anon` key instead of `service_role` key.

**Solution:** Use `SUPABASE_SERVICE_ROLE_KEY` in your backend `.env` file.

### Issue: "Plan not found"

**Cause:** `plan_catalog` table is empty.

**Solution:** Run `012_clean_payment_schema.sql` which seeds the plans.

## Verification Checklist

- [ ] `SUPABASE_URL` set in backend `.env`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in backend `.env`
- [ ] `profiles` table exists
- [ ] `companies` table exists
- [ ] `subscriptions` table exists
- [ ] `payments` table exists
- [ ] `plan_catalog` table exists and has 4 plans
- [ ] `token_balances` table exists
- [ ] Foreign key constraints are set correctly
- [ ] Backend can connect to Supabase

## Next Steps

After Supabase is set up:

1. **Test Stripe Webhook:**
   ```bash
   stripe listen --forward-to http://localhost:4000/api/stripe/webhook
   ```

2. **Trigger Test Event:**
   ```bash
   stripe trigger checkout.session.completed
   ```

3. **Check Backend Logs:**
   - Should see "Checkout session completed"
   - Should see "Subscription created/updated"
   - No foreign key errors

## Additional Resources

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase SQL Editor](https://app.supabase.com/project/_/sql)
- [Stripe Webhook Setup Guide](../stripe-webhook-setup.md)
