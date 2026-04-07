-- OpenAI cost analysis integration
-- Stores normalized daily usage pulled from OpenAI's organization cost & usage endpoints.

CREATE TABLE IF NOT EXISTS public.openai_usage (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  model TEXT NOT NULL DEFAULT 'unknown',
  line_item TEXT,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cached_tokens BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  raw JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, date, model, line_item)
);

CREATE INDEX IF NOT EXISTS openai_usage_company_date_idx
  ON public.openai_usage (company_id, date DESC);

ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "openai_usage_company_read" ON public.openai_usage;
CREATE POLICY "openai_usage_company_read" ON public.openai_usage
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Allow OpenAI as a provider for cost leak analyses (optional v2 use)
ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN ('Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify', 'OpenAI'));
