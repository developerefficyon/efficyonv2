-- ============================================================================
-- Clean Payment & Billing Schema - Replaces messy payment tables
-- ============================================================================
-- This migration:
-- 1. Replaces plan_details with plan_catalog
-- 2. Simplifies subscriptions (removes duplicates with payments)
-- 3. Creates a clean payments table for audit trail
-- 4. Updates token_balances for clarity
-- 5. Drops unnecessary tables (payment_history, plan_details old)
-- ============================================================================

-- Drop old messy tables (if they exist)
drop table if exists public.payment_history cascade;
drop table if exists public.plan_details cascade;

-- ============================================================================
-- Plan Catalog - Single source of truth for plan definitions
-- ============================================================================
create table if not exists public.plan_catalog (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique check (tier in ('free','startup','growth','custom')),
  name text not null,
  description text,
  price_monthly_cents integer not null check (price_monthly_cents >= 0),
  price_annual_cents integer check (price_annual_cents >= 0),
  included_tokens integer not null default 0,
  max_integrations integer,
  max_team_members integer,
  features jsonb,
  stripe_product_id text unique,
  stripe_price_monthly_id text unique,
  stripe_price_annual_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_catalog_tier on public.plan_catalog(tier);
create index if not exists idx_plan_catalog_stripe_product on public.plan_catalog(stripe_product_id);

-- ============================================================================
-- Subscriptions - One per company (or user if not company-bound)
-- ============================================================================
-- Drop old subscriptions and recreate
drop table if exists public.subscriptions cascade;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier text not null references public.plan_catalog(tier),
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete' check (
    status in ('incomplete','active','past_due','canceled','unpaid')
  ),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  amount_cents integer,
  currency text default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_company_id on public.subscriptions(company_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- Ensure only one active subscription per company
create unique index if not exists idx_subscriptions_unique_active_company 
  on public.subscriptions(company_id) 
  where status in ('incomplete','active','past_due');

-- ============================================================================
-- Payments - Audit trail for payment intents and checkout sessions
-- ============================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer not null,
  currency text default 'usd',
  status text not null check (
    status in ('requires_payment_method','requires_action','processing','succeeded','canceled')
  ),
  description text,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  unique (stripe_payment_intent_id),
  unique (stripe_checkout_session_id)
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_company_id on public.payments(company_id);
create index if not exists idx_payments_subscription_id on public.payments(subscription_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_stripe_payment_intent on public.payments(stripe_payment_intent_id);
create index if not exists idx_payments_stripe_checkout_session on public.payments(stripe_checkout_session_id);

-- ============================================================================
-- Token Balances - Per-company token ledger
-- ============================================================================
-- Drop old token_balances and recreate
drop table if exists public.token_balances cascade;

create table public.token_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  plan_tier text not null references public.plan_catalog(tier),
  total_tokens integer not null default 0,
  used_tokens integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_token_balances_user_id on public.token_balances(user_id);
create index if not exists idx_token_balances_company_id on public.token_balances(company_id);
create unique index if not exists idx_token_balances_company_plan on public.token_balances(company_id, plan_tier) 
  where company_id is not null;

-- ============================================================================
-- Seed Plan Catalog with default plans
-- ============================================================================
insert into public.plan_catalog (tier, name, description, price_monthly_cents, included_tokens, max_integrations, max_team_members, features)
values
  (
    'free',
    'Free',
    'Try Efficyon risk-free',
    0,
    0,
    1,
    1,
    '["7 days access", "1 integration", "Basic insights"]'::jsonb
  ),
  (
    'startup',
    'Startup',
    'Perfect for small teams',
    2999,
    10,
    5,
    3,
    '["5 integrations", "10 monthly credits", "Email support", "Basic analytics"]'::jsonb
  ),
  (
    'growth',
    'Growth',
    'For scaling companies',
    9999,
    50,
    15,
    10,
    '["15 integrations", "50 monthly credits", "Priority support", "Advanced analytics", "Team collaboration"]'::jsonb
  ),
  (
    'custom',
    'Enterprise',
    'Enterprise solution',
    29999,
    200,
    999,
    999,
    '["Unlimited integrations", "200 monthly credits", "Dedicated support", "Custom analytics", "Custom features"]'::jsonb
  )
on conflict (tier) do nothing;

-- ============================================================================
-- Done
-- ============================================================================
