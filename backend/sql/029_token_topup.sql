-- Add 'token_purchase' to token_usage_history action_type check constraint
-- This allows logging one-time token purchases in the usage history

ALTER TABLE public.token_usage_history
  DROP CONSTRAINT IF EXISTS token_usage_history_action_type_check;

ALTER TABLE public.token_usage_history
  ADD CONSTRAINT token_usage_history_action_type_check
  CHECK (action_type IN (
    'single_source_analysis',
    'dual_source_analysis',
    'triple_source_analysis',
    'advanced_ai_deep_dive',
    'token_refund',
    'admin_adjustment',
    'monthly_reset',
    'token_purchase'
  ));
