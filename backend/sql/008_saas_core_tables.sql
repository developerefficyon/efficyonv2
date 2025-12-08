-- Core SaaS data model for Efficyon
-- Companies, integrations, plans, alerts

-- 1) Companies table (workspaces)
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

-- 2) Link profiles to companies (each user belongs to a company/workspace)
alter table public.profiles
add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_profiles_company_id on public.profiles(company_id);

-- 3) Tools catalog (optional, for now just a simple lookup)
create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_tools_name on public.tools(name);

-- 4) Company integrations (connected tools per company)
create table if not exists public.company_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tool_id uuid references public.tools(id),
  tool_name text not null, -- allow custom tools without tools catalog row
  connection_type text not null check (connection_type in ('oauth', 'api_key')),
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  environment text default 'production' check (environment in ('production', 'sandbox', 'development')),
  oauth_data jsonb,
  api_key text,
  client_id text,
  client_secret text,
  webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_integrations_company_id on public.company_integrations(company_id);
create index if not exists idx_company_integrations_tool_name on public.company_integrations(tool_name);

-- 5) Company plans / billing info per tool
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

-- 6) Alert / notification preferences per company
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

-- 7) Keep updated_at in sync for these tables
create or replace function public.set_updated_at_generic()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row
execute function public.set_updated_at_generic();

drop trigger if exists set_company_integrations_updated_at on public.company_integrations;
create trigger set_company_integrations_updated_at
before update on public.company_integrations
for each row
execute function public.set_updated_at_generic();

drop trigger if exists set_company_plans_updated_at on public.company_plans;
create trigger set_company_plans_updated_at
before update on public.company_plans
for each row
execute function public.set_updated_at_generic();

drop trigger if exists set_company_alerts_updated_at on public.company_alerts;
create trigger set_company_alerts_updated_at
before update on public.company_alerts
for each row
execute function public.set_updated_at_generic();


