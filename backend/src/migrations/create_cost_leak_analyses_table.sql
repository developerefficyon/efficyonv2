-- Cost Leak Analyses History Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cost_leak_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES company_integrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'Fortnox', 'Microsoft365', 'HubSpot'

  -- Analysis parameters used
  parameters JSONB DEFAULT '{}',
  -- For Fortnox: { startDate, endDate }
  -- For MS365/HubSpot: { inactivityDays }

  -- Quick summary for listing (avoids parsing full analysis_data)
  summary JSONB NOT NULL DEFAULT '{}',
  -- { totalFindings, totalPotentialSavings, highSeverity, mediumSeverity, lowSeverity, healthScore }

  -- Full analysis data
  analysis_data JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for faster queries
  CONSTRAINT valid_provider CHECK (provider IN ('Fortnox', 'Microsoft365', 'HubSpot'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cost_leak_analyses_company_id ON cost_leak_analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_leak_analyses_integration_id ON cost_leak_analyses(integration_id);
CREATE INDEX IF NOT EXISTS idx_cost_leak_analyses_provider ON cost_leak_analyses(provider);
CREATE INDEX IF NOT EXISTS idx_cost_leak_analyses_created_at ON cost_leak_analyses(created_at DESC);

-- Composite index for fetching history by company and provider
CREATE INDEX IF NOT EXISTS idx_cost_leak_analyses_company_provider
ON cost_leak_analyses(company_id, provider, created_at DESC);

-- Enable Row Level Security
ALTER TABLE cost_leak_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access analyses for their company
CREATE POLICY "Users can view their company's analyses"
ON cost_leak_analyses FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can insert analyses for their company
CREATE POLICY "Users can insert analyses for their company"
ON cost_leak_analyses FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can delete analyses for their company
CREATE POLICY "Users can delete their company's analyses"
ON cost_leak_analyses FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON cost_leak_analyses TO authenticated;

-- Comment on table
COMMENT ON TABLE cost_leak_analyses IS 'Stores historical cost leak analysis results for each integration';
