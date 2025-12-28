-- ============================================================================
-- Efficyon Complete Database Schema
-- Current Implementation - Ready to Copy/Paste for Supabase
-- ============================================================================
-- This schema includes all tables, functions, triggers, and indexes currently
-- implemented in the application.
-- 
-- Run this in your Supabase SQL Editor to set up the complete database.
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Create app_role enum type
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'user', 'customer');
  else
    -- Ensure 'customer' role exists
    if not exists (
      select 1
      from pg_enum
      where enumlabel = 'customer'
      and enumtypid = (select oid from pg_type where typname = 'app_role')
    ) then
      alter type app_role add value 'customer';
    end if;
  end if;
end $$;

-- ============================================================================
-- 2. PROFILES TABLE
-- ============================================================================

-- Drop existing profiles table and triggers (if recreating)
drop table if exists public.profiles cascade;
drop trigger if exists on_email_confirmed on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_email_updated on auth.users;

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, -- NULLABLE - can be set later
  full_name text, -- NULLABLE
  role app_role default 'customer', -- Default to customer
  email_verified boolean default false,
  admin_approved boolean default false,
  status text default 'pending_email' check (status in ('pending_email', 'pending_admin', 'active', 'disabled')),
  company_id uuid, -- Will be linked to companies table later
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes on profiles
create index if not exists idx_profiles_email on public.profiles(email) where email is not null;
create unique index if not exists idx_profiles_email_unique 
on public.profiles(email) 
where email is not null and trim(email) != '';
create index if not exists idx_profiles_onboarding_completed
on public.profiles(onboarding_completed);

-- ============================================================================
-- 3. COMPANIES TABLE
-- ============================================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text,
  industry text,
  website text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Link profiles to companies
alter table public.profiles
add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_profiles_company_id on public.profiles(company_id);

-- ============================================================================
-- 4. TOOLS CATALOG TABLE
-- ============================================================================

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_tools_name on public.tools(name);

-- ============================================================================
-- 5. COMPANY INTEGRATIONS TABLE
-- ============================================================================

create table if not exists public.company_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tool_id uuid references public.tools(id),
  tool_name text not null, -- allow custom tools without tools catalog row
  connection_type text not null check (connection_type in ('oauth', 'api_key')),
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  environment text default 'production' check (environment in ('production', 'sandbox', 'development')),
  oauth_data jsonb, -- Stores OAuth tokens: { tokens: { access_token, refresh_token, expires_at, scope }, ... }
  api_key text,
  client_id text,
  client_secret text,
  webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_integrations_company_id on public.company_integrations(company_id);
create index if not exists idx_company_integrations_tool_name on public.company_integrations(tool_name);

-- ============================================================================
-- 6. COMPANY PLANS TABLE
-- ============================================================================

create table if not exists public.company_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tool_name text not null,
  current_plan text,
  seats integer,
  price_per_seat numeric,
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  renewal_date date,
  add_ons jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_plans_company_id on public.company_plans(company_id);
create index if not exists idx_company_plans_tool_name on public.company_plans(tool_name);

-- ============================================================================
-- 7. COMPANY ALERTS TABLE
-- ============================================================================

create table if not exists public.company_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email_for_alerts text,
  slack_channel text,
  alert_types jsonb, -- e.g. { "api_spike": true, "license_waste": true, "renewal": true }
  frequency text check (frequency in ('immediate', 'daily', 'weekly', 'monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_company_alerts_company_id on public.company_alerts(company_id);

-- ============================================================================
-- 8. FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Generic function for updated_at (used by multiple tables)
create or replace function public.set_updated_at_generic()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Function to handle email confirmation
create or replace function public.handle_email_confirmation()
returns trigger as $$
begin
  -- When email_confirmed_at is set (not null), update the profile
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    -- Update existing profile
    update public.profiles
    set 
      email_verified = true,
      email = coalesce(nullif(trim(profiles.email), ''), new.email), -- Set email if it was null
      status = case 
        when status = 'pending_email' then 'pending_admin'
        else status
      end,
      updated_at = now()
    where id = new.id;
    
    -- If profile doesn't exist yet (shouldn't happen, but handle it gracefully)
    -- Create it with minimal data
    insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
    select
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'name', null),
      coalesce(
        case 
          when new.raw_user_meta_data->>'role' is not null 
          then (new.raw_user_meta_data->>'role')::app_role
          else 'customer'::app_role
        end,
        'customer'::app_role
      ),
      true,
      false,
      'pending_admin'
    where not exists (select 1 from public.profiles where id = new.id)
    on conflict (id) do update
    set 
      email_verified = true,
      email = coalesce(nullif(trim(profiles.email), ''), excluded.email),
      status = case 
        when profiles.status = 'pending_email' then 'pending_admin'
        else profiles.status
      end,
      updated_at = now();
  end if;
  
  return new;
exception when others then
  -- Log error but don't fail the email confirmation
  raise warning 'Failed to update profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

-- Function to sync email when it changes in auth.users
create or replace function public.handle_email_update()
returns trigger as $$
begin
  -- Update profile email when auth.users.email changes
  if new.email is distinct from old.email then
    update public.profiles
    set 
      email = new.email,
      updated_at = now()
    where id = new.id;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Trigger for profiles updated_at
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Trigger for companies updated_at
drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row
execute function public.set_updated_at_generic();

-- Trigger for company_integrations updated_at
drop trigger if exists set_company_integrations_updated_at on public.company_integrations;
create trigger set_company_integrations_updated_at
before update on public.company_integrations
for each row
execute function public.set_updated_at_generic();

-- Trigger for company_plans updated_at
drop trigger if exists set_company_plans_updated_at on public.company_plans;
create trigger set_company_plans_updated_at
before update on public.company_plans
for each row
execute function public.set_updated_at_generic();

-- Trigger for company_alerts updated_at
drop trigger if exists set_company_alerts_updated_at on public.company_alerts;
create trigger set_company_alerts_updated_at
before update on public.company_alerts
for each row
execute function public.set_updated_at_generic();

-- Trigger for email confirmation on auth.users
drop trigger if exists on_email_confirmed on auth.users;
create trigger on_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at))
execute function public.handle_email_confirmation();

-- Trigger for email updates on auth.users
drop trigger if exists on_email_updated on auth.users;
create trigger on_email_updated
after update of email on auth.users
for each row
when (new.email is distinct from old.email)
execute function public.handle_email_update();

-- ============================================================================
-- 10. DATA BACKFILL & SEEDING
-- ============================================================================

-- Backfill: Create profiles for existing users who don't have one
do $$
declare
  user_record record;
  user_role app_role;
  user_name text;
  user_email text;
begin
  for user_record in 
    select u.id, u.email, u.raw_user_meta_data, u.email_confirmed_at
    from auth.users u
    where not exists (select 1 from public.profiles where id = u.id)
  loop
    -- Safely extract role
    begin
      if user_record.raw_user_meta_data->>'role' is not null then
        user_role := (user_record.raw_user_meta_data->>'role')::app_role;
      else
        user_role := 'customer';
      end if;
    exception when others then
      user_role := 'customer';
    end;
    
    -- Extract name
    if user_record.raw_user_meta_data->>'name' is not null then
      user_name := user_record.raw_user_meta_data->>'name';
    else
      user_name := null;
    end if;
    
    -- Use email only if not null/empty
    if user_record.email is not null and trim(user_record.email) != '' then
      user_email := user_record.email;
    else
      user_email := null;
    end if;
    
    -- Insert profile
    insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
    values (
      user_record.id,
      user_email,
      nullif(trim(user_name), ''),
      user_role,
      coalesce(user_record.email_confirmed_at is not null, false),
      false,
      case 
        when user_record.email_confirmed_at is not null then 'pending_admin'
        else 'pending_email'
      end
    )
    on conflict (id) do nothing;
  end loop;
end $$;

-- Seed admin profile if it doesn't exist
insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
select
  u.id,
  u.email,
  'Admin User' as full_name,
  'admin'::app_role as role,
  true,
  true,
  'active'
from auth.users u
where u.email = 'admin@efficyon.com'
  and not exists (select 1 from public.profiles where id = u.id)
on conflict (id) do update
set 
  role = 'admin'::app_role,
  admin_approved = true,
  status = 'active',
  email_verified = true;

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ============================================================================
-- Uncomment and adjust these policies based on your security requirements

-- Enable RLS on profiles
-- alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
-- create policy "Users can view own profile"
--   on public.profiles
--   for select
--   using (auth.uid() = id);

-- Policy: Users can update their own profile
-- create policy "Users can update own profile"
--   on public.profiles
--   for update
--   using (auth.uid() = id);

-- Enable RLS on companies
-- alter table public.companies enable row level security;

-- Policy: Users can view companies they belong to
-- create policy "Users can view own company"
--   on public.companies
--   for select
--   using (
--     id in (
--       select company_id from public.profiles where id = auth.uid()
--     )
--   );

-- Enable RLS on company_integrations
-- alter table public.company_integrations enable row level security;

-- Policy: Users can view integrations for their company
-- create policy "Users can view own company integrations"
--   on public.company_integrations
--   for select
--   using (
--     company_id in (
--       select company_id from public.profiles where id = auth.uid()
--     )
--   );

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- 
-- Summary of created objects:
-- 
-- Tables:
--   - profiles (user profiles linked to auth.users)
--   - companies (workspaces/organizations)
--   - tools (tools catalog)
--   - company_integrations (OAuth/API integrations per company)
--   - company_plans (billing/plan information per company)
--   - company_alerts (alert preferences per company)
-- 
-- Enums:
--   - app_role ('admin', 'user', 'customer')
-- 
-- Functions:
--   - set_updated_at() - Update timestamp for profiles
--   - set_updated_at_generic() - Update timestamp for other tables
--   - handle_email_confirmation() - Sync email verification status
--   - handle_email_update() - Sync email changes
-- 
-- Triggers:
--   - Auto-update updated_at on all tables
--   - Auto-sync email verification from auth.users
--   - Auto-sync email changes from auth.users
-- 
-- Indexes:
--   - All foreign keys indexed
--   - Email lookup indexes
--   - Tool name indexes
--   - Company ID indexes
-- 
-- ============================================================================

