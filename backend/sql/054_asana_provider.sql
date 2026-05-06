-- Allow Asana as a provider for persisted cost-leak analyses. Findings come
-- from asanaCostLeakAnalysis (4 checks) via a customer-managed OAuth 2.0
-- (3LO) integration with default scope (read access to workspaces, users,
-- and tasks for activity heuristics).

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
    'asana'
  ));
