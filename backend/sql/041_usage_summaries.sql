-- Stores AI-generated usage summaries for API-consumption tools (OpenAI, Anthropic, Gemini).
-- Separate from cost_leak_analyses (which stores cost-leak runs for tools like Fortnox, M365, etc.).

create table if not exists public.usage_summaries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.company_integrations(id) on delete set null,
  provider text not null,
  summary_text text not null,
  usage_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_summaries_integration on public.usage_summaries(integration_id);
create index if not exists idx_usage_summaries_company on public.usage_summaries(company_id);
create index if not exists idx_usage_summaries_created on public.usage_summaries(created_at desc);
