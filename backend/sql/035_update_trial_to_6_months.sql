-- Migration: Update trial duration from 7 days to 6 months (180 days)
-- Updates plan_catalog features text and extends active trials
-- NOTE: Already applied to production DB

-- Update free plan features to reflect 6-month trial
UPDATE public.plan_catalog
SET
  features = '["2 integrations", "5 trial credits", "Basic insights", "6 months trial"]'::jsonb,
  updated_at = now()
WHERE tier = 'free';

-- Extend any currently active trials from 7 days to 6 months from their start date
UPDATE public.subscriptions
SET
  trial_ends_at = trial_started_at + interval '180 days',
  updated_at = now()
WHERE status = 'trialing'
  AND trial_started_at IS NOT NULL;

-- Reactivate recently expired trials (expired within last 7 days) and extend them
UPDATE public.subscriptions
SET
  status = 'trialing',
  trial_ends_at = trial_started_at + interval '180 days',
  updated_at = now()
WHERE status = 'trial_expired'
  AND trial_started_at IS NOT NULL
  AND trial_started_at > now() - interval '7 days';
