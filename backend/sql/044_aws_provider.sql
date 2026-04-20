-- Allow AWS as a provider for persisted cost-leak analyses.
-- Findings come from AWS Cost Explorer (rightsizing, SP/RI purchase recs)
-- and AWS Compute Optimizer (EC2 / EBS / Lambda / RDS / idle).

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
    'AWS'
  ));
