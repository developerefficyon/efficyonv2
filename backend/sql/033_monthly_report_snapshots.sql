-- Monthly Report Snapshots
-- Stores generated monthly reports per company for the recurring value system

CREATE TABLE IF NOT EXISTS public.monthly_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  recommended_action TEXT,
  renewal_alerts JSONB DEFAULT '[]'::jsonb,
  is_quarterly BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, report_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_company
  ON public.monthly_report_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month
  ON public.monthly_report_snapshots(report_month DESC);

ALTER TABLE public.monthly_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_reports_select ON public.monthly_report_snapshots
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

GRANT ALL ON public.monthly_report_snapshots TO service_role;
