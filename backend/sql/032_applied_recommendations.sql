-- Applied Recommendations table for tracking recommendation actions
-- Supports QuickBooks and all other providers

CREATE TABLE IF NOT EXISTS public.applied_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.company_integrations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  analysis_id UUID REFERENCES public.cost_leak_analyses(id) ON DELETE SET NULL,
  finding_type TEXT NOT NULL,
  finding_hash TEXT NOT NULL,
  finding_title TEXT,
  finding_description TEXT,
  potential_savings DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'dismissed', 'snoozed')),
  action_steps JSONB DEFAULT '[]'::jsonb,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate recommendations for the same finding
  UNIQUE(company_id, finding_hash)
);

-- Index for fast lookups by company
CREATE INDEX IF NOT EXISTS idx_applied_recommendations_company
  ON public.applied_recommendations(company_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_applied_recommendations_status
  ON public.applied_recommendations(company_id, status);

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_applied_recommendations_provider
  ON public.applied_recommendations(company_id, provider);

-- RLS policies
ALTER TABLE public.applied_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can read recommendations for their company
CREATE POLICY applied_recommendations_select ON public.applied_recommendations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

-- Owners and editors can insert
CREATE POLICY applied_recommendations_insert ON public.applied_recommendations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Owners and editors can update
CREATE POLICY applied_recommendations_update ON public.applied_recommendations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Owners can delete
CREATE POLICY applied_recommendations_delete ON public.applied_recommendations
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Grant access to service role
GRANT ALL ON public.applied_recommendations TO service_role;
