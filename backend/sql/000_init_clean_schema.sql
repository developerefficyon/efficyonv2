-- ============================================================================
-- Efficyon Clean Schema Init (Auth → Core → Billing → RLS)
-- Run this in Supabase SQL editor on a fresh project
-- ============================================================================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================================
-- Auth → Profiles linkage: create a profile row on signup
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key, -- matches auth.users.id
  email text unique,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  company_id uuid, -- foreign key added after companies table is created
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_profiles_onboarding_completed on public.profiles(onboarding_completed);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  user_name text;
  user_role text;
begin
  -- Safely extract email (handle null/empty)
  if new.email is not null and trim(new.email) != '' then
    user_email := new.email;
  else
    user_email := null;
  end if;
  
  -- Extract name from metadata if available
  if new.raw_user_meta_data->>'name' is not null then
    user_name := new.raw_user_meta_data->>'name';
  else
    user_name := null;
  end if;
  
  -- Extract role from metadata, default to 'user'
  -- Validate role matches schema constraint ('user' or 'admin')
  if new.raw_user_meta_data->>'role' is not null then
    user_role := new.raw_user_meta_data->>'role';
    -- Ensure role is valid, default to 'user' if not
    if user_role not in ('user', 'admin') then
      user_role := 'user';
    end if;
  else
    user_role := 'user';
  end if;
  
  -- Create profile entry
  -- Use on conflict to handle case where profile already exists
  insert into public.profiles (id, email, full_name, role, created_at, updated_at)
  values (new.id, user_email, user_name, user_role, now(), now())
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = coalesce(excluded.role, profiles.role),
    updated_at = now();
  
  return new;
exception when others then
  -- Log error but don't fail user creation
  -- Supabase will log this in database logs
  -- Return new to allow user creation to proceed even if profile creation fails
  raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- Core SaaS: companies, integrations, alerts
-- ============================================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  industry text,
  size text,
  website text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_companies_user_id on public.companies(user_id);

-- Add foreign key constraint for profiles.company_id after companies table exists
do $$ 
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'profiles_company_id_fkey' 
    and table_name = 'profiles'
  ) then
    alter table public.profiles
    add constraint profiles_company_id_fkey 
    foreign key (company_id) references public.companies(id) on delete set null;
  end if;
end $$;

create table if not exists public.company_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  settings jsonb,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);
create index if not exists idx_integrations_company_id on public.company_integrations(company_id);
create index if not exists idx_integrations_provider on public.company_integrations(provider);

create table if not exists public.company_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  alert_type text not null,
  config jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_alerts_company_id on public.company_alerts(company_id);
create index if not exists idx_alerts_type on public.company_alerts(alert_type);

-- Optional: track analyses
create table if not exists public.deep_research_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  analysis_type text default 'standard',
  integration_sources jsonb default '[]'::jsonb,
  tokens_used integer not null default 0,
  status text default 'completed',
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_analyses_user_id on public.deep_research_analyses(user_id);

-- ============================================================================
-- Billing: plan_catalog, subscriptions, payments, token_balances
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
create index if not exists idx_plan_catalog_product on public.plan_catalog(stripe_product_id);

-- One subscription per user/company, linked to a plan tier
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier text not null references public.plan_catalog(tier),
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete' check (status in ('incomplete','active','past_due','canceled','unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  amount_cents integer,
  currency text default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subs_user_id on public.subscriptions(user_id);
create index if not exists idx_subs_company_id on public.subscriptions(company_id);
create index if not exists idx_subs_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_subs_subscription_id on public.subscriptions(stripe_subscription_id);
create index if not exists idx_subs_status on public.subscriptions(status);
-- Ensure only one active subscription per company (if company bound)
create unique index if not exists idx_subs_unique_active_company
  on public.subscriptions(company_id)
  where status in ('incomplete','active','past_due') and company_id is not null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer not null,
  currency text default 'usd',
  status text not null check (status in ('requires_payment_method','requires_action','processing','succeeded','canceled')),
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

create table if not exists public.token_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  plan_tier text not null references public.plan_catalog(tier),
  total_tokens integer not null default 0,
  used_tokens integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists idx_token_user_id on public.token_balances(user_id);
create index if not exists idx_token_company_id on public.token_balances(company_id);
create unique index if not exists idx_token_company_plan on public.token_balances(company_id, plan_tier) where company_id is not null;

-- ============================================================================
-- Seeds: default plans
-- ============================================================================
insert into public.plan_catalog (tier, name, description, price_monthly_cents, included_tokens, max_integrations, max_team_members, features)
values
  ('free','Free','Try Efficyon risk-free',0,0,1,1,'["7 days access","1 integration","Basic insights"]'::jsonb),
  ('startup','Startup','Perfect for small teams',2999,10,5,3,'["5 integrations","10 monthly credits","Email support","Basic analytics"]'::jsonb),
  ('growth','Growth','For scaling companies',9999,50,15,10,'["15 integrations","50 monthly credits","Priority support","Advanced analytics","Team collaboration"]'::jsonb),
  ('custom','Enterprise','Enterprise solution',29999,200,999,999,'["Unlimited integrations","200 monthly credits","Dedicated support","Custom analytics","Custom features"]'::jsonb)
on conflict (tier) do nothing;

-- ============================================================================
-- Utility: updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Attach updated_at triggers
-- Note: Only on tables that have updated_at
-- Drop existing triggers first to make this idempotent
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at before update on public.companies for each row execute function public.set_updated_at();

drop trigger if exists set_integrations_updated_at on public.company_integrations;
create trigger set_integrations_updated_at before update on public.company_integrations for each row execute function public.set_updated_at();

drop trigger if exists set_alerts_updated_at on public.company_alerts;
create trigger set_alerts_updated_at before update on public.company_alerts for each row execute function public.set_updated_at();

drop trigger if exists set_plan_catalog_updated_at on public.plan_catalog;
create trigger set_plan_catalog_updated_at before update on public.plan_catalog for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

drop trigger if exists set_token_balances_updated_at on public.token_balances;
create trigger set_token_balances_updated_at before update on public.token_balances for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security (RLS) policies
-- ============================================================================
-- Enable RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_integrations enable row level security;
alter table public.company_alerts enable row level security;
alter table public.plan_catalog enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.token_balances enable row level security;
alter table public.deep_research_analyses enable row level security;

-- Profiles: a user can see/update their own profile
-- Allow updating company_id and onboarding_completed during onboarding
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id = auth.uid());

-- Companies: a user can manage their own company rows
-- Also allow users to see companies they're linked to via profile.company_id
drop policy if exists companies_select_own on public.companies;
create policy companies_select_own on public.companies for select using (
  user_id = auth.uid() or 
  exists (select 1 from public.profiles p where p.company_id = companies.id and p.id = auth.uid())
);
drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own on public.companies for insert with check (user_id = auth.uid());
drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies for update using (
  user_id = auth.uid() or 
  exists (select 1 from public.profiles p where p.company_id = companies.id and p.id = auth.uid())
);

-- Integrations: tied to company ownership (via user_id or profile.company_id)
drop policy if exists integrations_select_own on public.company_integrations;
create policy integrations_select_own on public.company_integrations for select using (
  exists (select 1 from public.companies c where c.id = company_id and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.company_id = c.id and p.id = auth.uid())))
);
drop policy if exists integrations_insert_own on public.company_integrations;
create policy integrations_insert_own on public.company_integrations for insert with check (
  exists (select 1 from public.companies c where c.id = company_id and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.company_id = c.id and p.id = auth.uid())))
);
drop policy if exists integrations_update_own on public.company_integrations;
create policy integrations_update_own on public.company_integrations for update using (
  exists (select 1 from public.companies c where c.id = company_id and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.company_id = c.id and p.id = auth.uid())))
);

-- Alerts: tied to company ownership (via user_id or profile.company_id)
drop policy if exists alerts_select_own on public.company_alerts;
create policy alerts_select_own on public.company_alerts for select using (
  exists (select 1 from public.companies c where c.id = company_id and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.company_id = c.id and p.id = auth.uid())))
);
drop policy if exists alerts_insert_own on public.company_alerts;
create policy alerts_insert_own on public.company_alerts for insert with check (
  exists (select 1 from public.companies c where c.id = company_id and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.company_id = c.id and p.id = auth.uid())))
);
drop policy if exists alerts_update_own on public.company_alerts;
create policy alerts_update_own on public.company_alerts for update using (
  exists (select 1 from public.companies c where c.id = company_id and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.company_id = c.id and p.id = auth.uid())))
);

-- Plans: readable by everyone
drop policy if exists plan_catalog_read on public.plan_catalog;
create policy plan_catalog_read on public.plan_catalog for select using (true);

-- Subscriptions: user reads own; inserts must match auth.uid
drop policy if exists subs_select_own on public.subscriptions;
create policy subs_select_own on public.subscriptions for select using (user_id = auth.uid());
drop policy if exists subs_insert_own on public.subscriptions;
create policy subs_insert_own on public.subscriptions for insert with check (user_id = auth.uid());
drop policy if exists subs_update_own on public.subscriptions;
create policy subs_update_own on public.subscriptions for update using (user_id = auth.uid());

-- Payments: user reads own
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments for select using (user_id = auth.uid());

-- Token balances: user reads/updates own
drop policy if exists tokens_select_own on public.token_balances;
create policy tokens_select_own on public.token_balances for select using (user_id = auth.uid());
drop policy if exists tokens_update_own on public.token_balances;
create policy tokens_update_own on public.token_balances for update using (user_id = auth.uid());

-- Analyses: user reads own; inserts allowed for own
drop policy if exists analyses_select_own on public.deep_research_analyses;
create policy analyses_select_own on public.deep_research_analyses for select using (user_id = auth.uid());
drop policy if exists analyses_insert_own on public.deep_research_analyses;
create policy analyses_insert_own on public.deep_research_analyses for insert with check (user_id = auth.uid());

-- ============================================================================
-- Admin Seed (optional): promote admin@efficyon.com and create a company
-- Run after you create the user in Supabase Auth.
-- ============================================================================
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users where email = 'admin@efficyon.com';

  if admin_id is not null then
    -- Upsert profile with admin role
    insert into public.profiles (id, email, role, onboarding_completed, created_at, updated_at)
    values (admin_id, 'admin@efficyon.com', 'admin', true, now(), now())
    on conflict (id) do update set role = 'admin', email = 'admin@efficyon.com', updated_at = now();

    -- Create a default company for the admin if missing
    if not exists (select 1 from public.companies c where c.user_id = admin_id) then
      insert into public.companies (user_id, name, industry, size, website, phone)
      values (admin_id, 'Efficyon Admin Co', 'Technology', '1-10', 'https://efficyon.com', null);
    end if;
  end if;
end $$;

-- ============================================================================
-- Done
-- ============================================================================
