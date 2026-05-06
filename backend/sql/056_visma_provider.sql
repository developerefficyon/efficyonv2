-- Allow Visma eAccounting as a provider for persisted cost-leak analyses.
-- Findings come from vismaCostLeakAnalysis (5 supplier-invoice checks + 1
-- customer-invoice check) via a customer-managed OAuth 2.0 integration with
-- read-only scopes (ea:api offline_access ea:sales_readonly
-- ea:accounting_readonly ea:purchase_readonly).

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
    'airtable',
    'Visma'
  ));
