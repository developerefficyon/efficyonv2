-- Allow Salesforce as a provider for persisted cost-leak analyses.
-- Findings come from Salesforce cost-leak analysis (inactive licensed users,
-- frozen-but-billed users, unused PermissionSetLicenses) via a customer-managed
-- Connected App + OAuth 2.0 web-server flow.

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
    'Stripe',
    'Salesforce'
  ));
