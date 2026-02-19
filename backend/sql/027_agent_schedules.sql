-- ============================================================================
-- Agent Schedules - Scheduled test runs via node-cron
-- ============================================================================

create table if not exists public.agent_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  workspace_id uuid not null references public.test_workspaces(id) on delete cascade,
  schedule_cron text not null,
  schedule_type text not null default 'improvement_cycle'
    check (schedule_type in ('improvement_cycle', 'analysis_only', 'stress_test')),
  config jsonb not null default '{}',
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  last_run_status text
    check (last_run_status is null or last_run_status in ('completed', 'failed', 'running')),
  last_run_report jsonb,
  run_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_schedules_workspace_id on public.agent_schedules(workspace_id);
create index if not exists idx_agent_schedules_is_enabled on public.agent_schedules(is_enabled);

alter table public.agent_schedules enable row level security;

create policy "Service role can manage agent schedules"
  on public.agent_schedules for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Done
-- ============================================================================
