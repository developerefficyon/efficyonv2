-- Add QuickBooks and Shopify to the valid_provider constraint on cost_leak_analyses

ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN ('Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify'));
