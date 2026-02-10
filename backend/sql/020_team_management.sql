-- ============================================================================
-- Team Management - Members and Invitations
-- ============================================================================
-- This migration:
-- 1. Creates team_members table for tracking company team membership and roles
-- 2. Creates team_invitations table for email-based invitation system
-- ============================================================================

-- ============================================================================
-- Team Members Table
-- ============================================================================
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_team_members_company_id on public.team_members(company_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_status on public.team_members(status);

alter table public.team_members enable row level security;

create policy "Users can view team members of their company"
  on public.team_members for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Service role can manage team members"
  on public.team_members for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Team Invitations Table
-- ============================================================================
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  token text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_invitations_token on public.team_invitations(token);
create index if not exists idx_team_invitations_email on public.team_invitations(email);
create index if not exists idx_team_invitations_company_id on public.team_invitations(company_id);
create index if not exists idx_team_invitations_status on public.team_invitations(status);

alter table public.team_invitations enable row level security;

create policy "Users can view invitations for their company"
  on public.team_invitations for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Service role can manage team invitations"
  on public.team_invitations for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- Done
-- ============================================================================
