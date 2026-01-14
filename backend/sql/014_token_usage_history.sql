-- ============================================================================
-- Token Usage History - Audit trail for all token transactions
-- ============================================================================
-- This migration:
-- 1. Creates token_usage_history table for tracking all token transactions
-- 2. Updates plan_catalog values to match new pricing structure
-- ============================================================================

-- ============================================================================
-- Token Usage History Table
-- ============================================================================
create table if not exists public.token_usage_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  tokens_consumed integer not null, -- positive for consumption, negative for refunds/additions
  action_type text not null check (
    action_type in (
      'single_source_analysis',
      'dual_source_analysis',
      'triple_source_analysis',
      'advanced_ai_deep_dive',
      'token_refund',
      'admin_adjustment',
      'monthly_reset'
    )
  ),
  integration_sources jsonb, -- e.g. ["fortnox", "microsoft365"]
  analysis_id uuid references public.deep_research_analyses(id) on delete set null,
  description text,
  balance_before integer not null,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

-- Indexes for efficient querying
create index if not exists idx_token_usage_history_user_id on public.token_usage_history(user_id);
create index if not exists idx_token_usage_history_company_id on public.token_usage_history(company_id);
create index if not exists idx_token_usage_history_created_at on public.token_usage_history(created_at desc);
create index if not exists idx_token_usage_history_action_type on public.token_usage_history(action_type);

-- ============================================================================
-- Row Level Security for token_usage_history
-- ============================================================================
alter table public.token_usage_history enable row level security;

-- Users can view their own token history
create policy "Users can view own token history"
  on public.token_usage_history for select
  using (auth.uid() = user_id);

-- Service role can insert/update (for backend operations)
create policy "Service role can manage token history"
  on public.token_usage_history for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Update Plan Catalog to match new pricing structure
-- ============================================================================
-- Free: 0 tokens, 2 integrations, 1 team member
update public.plan_catalog
set
  included_tokens = 0,
  max_integrations = 2,
  max_team_members = 1,
  features = '["2 integrations", "Basic insights", "7 days trial"]'::jsonb,
  updated_at = now()
where tier = 'free';

-- Startup: 10 tokens, 5 integrations, 1 team member, $29/mo
update public.plan_catalog
set
  included_tokens = 10,
  max_integrations = 5,
  max_team_members = 1,
  price_monthly_cents = 2900,
  features = '["5 integrations", "10 monthly credits", "Email support", "Basic analytics"]'::jsonb,
  updated_at = now()
where tier = 'startup';

-- Growth: 50 tokens, 10 integrations, 5 team members, $99/mo
update public.plan_catalog
set
  included_tokens = 50,
  max_integrations = 10,
  max_team_members = 5,
  price_monthly_cents = 9900,
  features = '["10 integrations", "50 monthly credits", "Priority support", "Advanced analytics", "Team collaboration (5 members)"]'::jsonb,
  updated_at = now()
where tier = 'growth';

-- Custom/Enterprise: 200 tokens, unlimited integrations, unlimited team, $299/mo
update public.plan_catalog
set
  included_tokens = 200,
  max_integrations = 999,
  max_team_members = 999,
  price_monthly_cents = 29900,
  features = '["Unlimited integrations", "200 monthly credits", "Dedicated support", "Custom analytics", "Unlimited team members"]'::jsonb,
  updated_at = now()
where tier = 'custom';

-- ============================================================================
-- Done
-- ============================================================================
