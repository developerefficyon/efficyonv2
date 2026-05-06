-- Allow Airtable as a provider for persisted cost-leak analyses. Findings come
-- from airtableCostLeakAnalysis (4 checks) via a customer-managed OAuth 2.0
-- + PKCE integration with read-only scopes (user.email:read, schema.bases:read).

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
    'Salesforce',
    'Notion',
    'Linear',
    'Atlassian',
    'monday',
    'asana',
    'airtable'
  ));
