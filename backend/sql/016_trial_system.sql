-- Migration: 7-Day Trial System
-- Adds trial tracking fields to subscriptions table

-- Add trial fields to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS stripe_setup_intent_id text;

-- Update status constraint to include trialing and trial_expired
-- First drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;
END $$;

-- Add updated constraint with trial statuses
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_status_check CHECK (
  status IS NULL OR status IN ('incomplete', 'active', 'past_due', 'canceled', 'unpaid', 'trialing', 'trial_expired')
);

-- Create index for efficient trial expiration queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends
ON public.subscriptions(trial_ends_at)
WHERE trial_ends_at IS NOT NULL;

-- Create index for trial status queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_trialing
ON public.subscriptions(status)
WHERE status IN ('trialing', 'trial_expired');
