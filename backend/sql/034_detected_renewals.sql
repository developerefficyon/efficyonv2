-- Detected Renewals
-- Stores auto-detected recurring SaaS subscriptions with projected renewal dates

CREATE TABLE IF NOT EXISTS public.detected_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.company_integrations(id) ON DELETE SET NULL,
  supplier_number TEXT,
  supplier_name TEXT NOT NULL,
  average_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'SEK',
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly','quarterly','semi_annual','annual','unknown')),
  cadence_days INTEGER,
  last_invoice_date DATE,
  projected_renewal_date DATE,
  confidence DECIMAL(3,2),
  invoice_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','dismissed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, supplier_number, cadence)
);

CREATE INDEX IF NOT EXISTS idx_detected_renewals_company
  ON public.detected_renewals(company_id);
CREATE INDEX IF NOT EXISTS idx_detected_renewals_upcoming
  ON public.detected_renewals(projected_renewal_date)
  WHERE status = 'active';

ALTER TABLE public.detected_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY detected_renewals_select ON public.detected_renewals
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY detected_renewals_update ON public.detected_renewals
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND status = 'active'
    )
  );

GRANT ALL ON public.detected_renewals TO service_role;
