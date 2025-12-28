-- ============================================================================
-- Data Migration - Migrate existing users to new subscription model
-- ============================================================================
-- This migration handles:
-- 1. Migrating free trial users to the new subscriptions table
-- 2. Setting up token balances for existing users
-- ============================================================================

-- ============================================================================
-- Create subscriptions for existing users who haven't been migrated
-- ============================================================================
-- For each user with a company, create a subscription for the 'free' plan
-- (they can upgrade later)
insert into public.subscriptions (
  company_id,
  user_id,
  plan_tier,
  stripe_customer_id,
  status,
  created_at
)
select
  c.id as company_id,
  p.id as user_id,
  'free' as plan_tier,
  -- Generate a placeholder stripe_customer_id if it doesn't exist
  'cust_' || encode(gen_random_bytes(8), 'hex') as stripe_customer_id,
  'active' as status,
  now() as created_at
from public.profiles p
join public.companies c on c.user_id = p.id
where not exists (
  select 1 from public.subscriptions s
  where s.user_id = p.id
)
on conflict (stripe_customer_id) do nothing;

-- ============================================================================
-- Initialize token balances for companies without them
-- ============================================================================
insert into public.token_balances (
  company_id,
  user_id,
  plan_tier,
  total_tokens,
  used_tokens,
  updated_at
)
select
  c.id as company_id,
  c.user_id as user_id,
  s.plan_tier,
  pc.included_tokens as total_tokens,
  0 as used_tokens,
  now() as updated_at
from public.companies c
join public.subscriptions s on s.company_id = c.id
join public.plan_catalog pc on pc.tier = s.plan_tier
where not exists (
  select 1 from public.token_balances tb
  where tb.company_id = c.id
  and tb.plan_tier = s.plan_tier
)
on conflict (company_id, plan_tier) do nothing;

-- ============================================================================
-- Done
-- ============================================================================
