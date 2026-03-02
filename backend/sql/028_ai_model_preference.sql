-- 028: AI Model Preference
-- Allows company owners to choose which AI model (haiku/sonnet/opus) powers all AI features.
-- Each model tier has a different token cost multiplier.

-- Add ai_model column to companies (team-level setting)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'haiku';

-- Add ai_model column to profiles (solo user fallback)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'haiku';

-- Add model_used column to token_usage_history for audit trail
ALTER TABLE public.token_usage_history
ADD COLUMN IF NOT EXISTS model_used text;
