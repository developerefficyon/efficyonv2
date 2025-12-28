-- ============================================================================
-- Stripe Payment Integration Schema
-- ============================================================================

-- Enum for subscription status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active', 'past_due', 'canceled', 'unpaid', 'trialing');
  end if;
end $$;

-- Enum for plan types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type plan_tier as enum ('startup', 'growth', 'custom', 'free');
  end if;
end $$;

-- ============================================================================
-- Subscriptions Table
-- ============================================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  stripe_payment_intent_id text,
  plan_tier plan_tier not null default 'free',
  status subscription_status default 'unpaid',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  amount_paid integer,  -- in cents
  currency text default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_company_id on public.subscriptions(company_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- ============================================================================
-- Token/Credit Balance Table
-- ============================================================================

create table if not exists public.token_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  plan_tier plan_tier not null,
  total_tokens integer not null default 0,
  used_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_token_balances_user_id on public.token_balances(user_id);
create index if not exists idx_token_balances_company_id on public.token_balances(company_id);

-- Helper function to calculate available tokens
create or replace function get_available_tokens(p_user_id uuid)
returns integer as $$
  select coalesce(total_tokens - used_tokens, 0) 
  from public.token_balances 
  where user_id = p_user_id
  order by updated_at desc
  limit 1
$$ language sql stable;

-- ============================================================================
-- Payment History Table
-- ============================================================================

create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  stripe_payment_intent_id text,
  amount integer not null,  -- in cents
  currency text default 'usd',
  status text not null,  -- succeeded, processing, requires_payment_method, etc.
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_history_user_id on public.payment_history(user_id);
create index if not exists idx_payment_history_company_id on public.payment_history(company_id);

-- ============================================================================
-- Plan Details Table
-- ============================================================================

create table if not exists public.plan_details (
  id uuid primary key default gen_random_uuid(),
  tier plan_tier not null unique,
  name text not null,
  description text,
  price_monthly integer not null,  -- in cents
  price_annual integer,  -- in cents
  included_tokens integer not null,
  max_integrations integer,
  max_team_members integer,
  max_deep_research_per_month integer,
  features jsonb,  -- array of features
  stripe_product_id text,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_details_tier on public.plan_details(tier);

-- ============================================================================
-- Deep Research Analysis Table (tracks token usage)
-- ============================================================================

create table if not exists public.deep_research_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  analysis_type text not null,  -- 'dual', 'triple', etc.
  integration_sources jsonb not null,  -- array of integration names
  tokens_used integer not null,
  status text default 'completed',
  result jsonb,  -- stores the analysis result
  created_at timestamptz not null default now()
);

create index if not exists idx_deep_research_user_id on public.deep_research_analyses(user_id);
create index if not exists idx_deep_research_company_id on public.deep_research_analyses(company_id);
