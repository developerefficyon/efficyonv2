-- Allow Slack as a provider for persisted cost-leak analyses.
-- The analyzer in services/slackCostLeakAnalysis.js produces
-- findings in the same shape as HubSpot's, so the existing
-- cost_leak_analyses table is reused via the analysis_history flow.

ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox',
    'Microsoft365',
    'HubSpot',
    'QuickBooks',
    'Shopify',
    'OpenAI',
    'Anthropic',
    'Gemini',
    'GoogleWorkspace',
    'Slack'
  ));
