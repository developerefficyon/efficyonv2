-- Allow Stripe as a provider for persisted cost-leak analyses.
-- Findings come from Stripe revenue-leak analysis (failed payments,
-- card-expiry churn, past-due subscriptions, disputes) via a customer-pasted
-- restricted API key.

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
    'Slack',
    'GCP',
    'AWS',
    'Azure',
    'Zoom',
    'GitHub',
    'Stripe'
  ));
