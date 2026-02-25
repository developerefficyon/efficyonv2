-- ============================================================================
-- Test Comparisons - Side-by-side analysis comparison tracking
-- ============================================================================

create table if not exists public.test_comparisons (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.test_workspaces(id) on delete cascade,
  name text not null,
  analysis_ids uuid[] not null default '{}',
  comparison_result jsonb default '{}',
  trend_data jsonb default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_comparisons_workspace_id on public.test_comparisons(workspace_id);
create index if not exists idx_test_comparisons_created_at on public.test_comparisons(created_at desc);

alter table public.test_comparisons enable row level security;

create policy "Service role can manage test comparisons"
  on public.test_comparisons for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Done
-- ============================================================================
