-- Migration: Update Free Plan Tokens
-- Free/Trial users should have 5 tokens to match the trial setup

-- Update free plan to have 5 tokens (matching trial allocation)
UPDATE public.plan_catalog
SET
  included_tokens = 5,
  features = '["2 integrations", "5 trial credits", "Basic insights", "7 days trial"]'::jsonb,
  updated_at = now()
WHERE tier = 'free';

-- Verify the update
SELECT tier, name, included_tokens, features
FROM public.plan_catalog
WHERE tier = 'free';
