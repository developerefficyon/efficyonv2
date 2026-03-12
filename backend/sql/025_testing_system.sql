-- ============================================================================
-- Testing System - Internal AI Agent Testing Infrastructure
-- ============================================================================
-- This migration creates tables for:
-- 1. analysis_templates - Versioned analysis templates (Cleanup Crew, etc.)
-- 2. test_workspaces - Simulated company scenarios for testing
-- 3. test_uploads - Synthetic data uploads per workspace
-- 4. test_analyses - Analysis runs on test data
-- 5. test_run_logs - Debug logs for test runs
-- ============================================================================

-- ============================================================================
-- Analysis Templates (versioned)
-- ============================================================================
create table if not exists public.analysis_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  objective text not null,
  targeting_scope jsonb not null default '{}',
  ai_prompt_logic text not null,
  primary_kpi text not null,
  kpi_description text,
  applicable_integrations text[] default '{}',
  parameters jsonb default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);

create index if not exists idx_analysis_templates_slug on public.analysis_templates(slug);
create index if not exists idx_analysis_templates_is_active on public.analysis_templates(is_active);

alter table public.analysis_templates enable row level security;

drop policy if exists "Service role can manage analysis templates" on public.analysis_templates;
create policy "Service role can manage analysis templates"
  on public.analysis_templates for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Test Workspaces (one per simulated company scenario)
-- ============================================================================
create table if not exists public.test_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  scenario_profile text not null default 'custom'
    check (scenario_profile in ('startup_60', 'agency_25', 'scaleup_200', 'custom')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  metadata jsonb default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_test_workspaces_status on public.test_workspaces(status);
create index if not exists idx_test_workspaces_created_at on public.test_workspaces(created_at desc);

alter table public.test_workspaces enable row level security;

drop policy if exists "Service role can manage test workspaces" on public.test_workspaces;
create policy "Service role can manage test workspaces"
  on public.test_workspaces for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Test Uploads (synthetic data per workspace)
-- ============================================================================
create table if not exists public.test_uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.test_workspaces(id) on delete cascade,
  filename text,
  integration_label text not null
    check (integration_label in ('Fortnox', 'Microsoft365', 'HubSpot')),
  data_type text not null
    check (data_type in (
      'supplier_invoices', 'invoices', 'customers', 'expenses', 'vouchers', 'accounts', 'articles',
      'licenses', 'users', 'usage_reports',
      'hubspot_users', 'hubspot_account',
      'profit_loss'
    )),
  file_data jsonb not null,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'partial', 'invalid')),
  validation_report jsonb default '{}',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_uploads_workspace_id on public.test_uploads(workspace_id);
create index if not exists idx_test_uploads_integration_label on public.test_uploads(integration_label);

alter table public.test_uploads enable row level security;

drop policy if exists "Service role can manage test uploads" on public.test_uploads;
create policy "Service role can manage test uploads"
  on public.test_uploads for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Test Analyses (analysis runs on test data)
-- ============================================================================
create table if not exists public.test_analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.test_workspaces(id) on delete cascade,
  analysis_type text not null
    check (analysis_type in ('standard', 'deep', 'cross_platform')),
  template_id uuid references public.analysis_templates(id) on delete set null,
  template_version integer,
  integration_labels text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  input_upload_ids uuid[] not null default '{}',
  analysis_result jsonb,
  ai_summary text,
  scoring jsonb default '{}',
  error_log text,
  duration_ms integer,
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_analyses_workspace_id on public.test_analyses(workspace_id);
create index if not exists idx_test_analyses_status on public.test_analyses(status);
create index if not exists idx_test_analyses_template_id on public.test_analyses(template_id);
create index if not exists idx_test_analyses_created_at on public.test_analyses(created_at desc);

alter table public.test_analyses enable row level security;

drop policy if exists "Service role can manage test analyses" on public.test_analyses;
create policy "Service role can manage test analyses"
  on public.test_analyses for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Test Run Logs (debug logs)
-- ============================================================================
create table if not exists public.test_run_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.test_workspaces(id) on delete cascade,
  analysis_id uuid references public.test_analyses(id) on delete cascade,
  log_level text not null default 'info'
    check (log_level in ('info', 'warn', 'error', 'debug')),
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_run_logs_workspace_id on public.test_run_logs(workspace_id);
create index if not exists idx_test_run_logs_analysis_id on public.test_run_logs(analysis_id);
create index if not exists idx_test_run_logs_created_at on public.test_run_logs(created_at desc);

alter table public.test_run_logs enable row level security;

drop policy if exists "Service role can manage test run logs" on public.test_run_logs;
create policy "Service role can manage test run logs"
  on public.test_run_logs for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Done
-- ============================================================================
