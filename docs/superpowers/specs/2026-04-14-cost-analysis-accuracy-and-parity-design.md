# Cost Analysis Accuracy & Detail-Page Parity — Design

**Date:** 2026-04-14
**Scope:** Fix 4 critical cost-analysis math bugs + restore the 4-tab detail page structure that was removed during the HIGH-11 refactor + bring AI summary generation to parity across all 9 tools
**Origin:** User-driven audit of "when I click the Analyze button" revealed that only 1 of 9 tools has an Analyze button, and several analyzers produce wrong numbers

---

## Problem

The cost-analysis feature has three overlapping problems that surfaced in a single audit:

1. **Four backend analyzers produce incorrect numbers.** M365 uses a `$20`-per-license placeholder instead of real SKU pricing. Fortnox hardcodes SEK→USD at `0.095` (no live rate). Gemini's pricing table includes shut-down models (`text-embedding-004`, `gemini-1.5-pro`, `gemini-1.5-flash`) and misses the >200k-token tier for `gemini-2.5-pro`. QuickBooks' duplicate detector emits N-1 findings per group for recurring subscriptions.

2. **5 of 9 tools have no UI path to run analysis.** Fortnox, Microsoft 365, HubSpot, QuickBooks, and Shopify have working backend analyzer endpoints that no frontend button calls. Their analyzers have been drifting silently since the HIGH-11 refactor dropped the Analysis/History/Overview tabs from `[id]/page.tsx`.

3. **AI summaries were silently disabled and are inconsistent.** The pre-refactor Analysis tab rendered `aiSummary` (generated via OpenRouter using Claude Sonnet 4.5). The backend still emits `aiSummary` for 4 cost-leak tools (Fortnox, M365, HubSpot, QuickBooks), but the frontend stopped displaying it. Shopify and GoogleWorkspace never had AI summaries wired in. The 3 AI integrations (OpenAI, Anthropic, Gemini) have never had AI summaries at all — they use a different data shape (usage time-series, not cost-leak findings).

## Goals

1. Every cost-analysis number displayed to the user is factually correct.
2. Every tool has a reachable "Analyze" button and a consistent `Overview | Analysis | History | Data` tab layout — full parity with pre-refactor.
3. Every tool gets an AI-generated summary on analysis: cost-leak tools summarize findings; AI tools summarize usage trends.
4. AI tool summary runs are persisted, so users can browse past summaries in the History tab (matching how cost-leak analyses are persisted in `cost_leak_analyses`).

## Non-goals

- Not addressing the ~40 HIGH/MEDIUM accuracy findings from the audit (e.g., Shopify's arbitrary 20% margin threshold, HubSpot's outdated pricing). Those are follow-ups.
- Not adding multi-currency support to Fortnox (EUR/NOK/DKK). SEK→USD only.
- Not redesigning the UI. Parity with pre-refactor behavior, no new aesthetic direction.
- Not changing backend analyzer return shapes. Existing callers continue to work.

---

## Architecture

### Backend changes — 8 logical groups

**Group 1: Currency utility**
New file `backend/src/utils/currency.js` exports `getSekToUsdRate()`: fetches from `https://api.frankfurter.app/latest?from=SEK&to=USD`, caches for 24 hours in-memory, falls back to `0.095` on failure. Logs a warn on fallback.

**Group 2: M365 SKU-aware pricing** (CRIT-1)
Change `calculateUserLicenseCost(assignedLicenses, skuMap)` in `backend/src/services/microsoft365CostLeakAnalysis.js` to look up each license's actual cost from `M365_LICENSE_COSTS` via `skuMap`. Return `0` for unknown SKUs; emit one WARN-level log per run listing any unknown SKUs seen. Update the 3 call sites to pass `skuMap` (already built by their caller).

**Group 3: Fortnox live rate** (CRIT-2)
Change `costLeakAnalysis.js:17` from `const SEK_TO_USD = 0.095` to resolve the rate at analyzer entry via `await getSekToUsdRate()`. `formatSekAsUsd()` becomes async OR uses a module-scoped `_currentRate` that the analyzer sets on entry.

**Group 4: Gemini pricing cleanup** (CRIT-3)
In `backend/src/services/geminiCostAnalysis.js`:
- Remove entries: `text-embedding-004`, `gemini-1.5-pro`, `gemini-1.5-flash`
- Add `gemini-2.5-pro-long` variant or a helper that picks the >200k rate when context exceeds threshold (if context isn't available per-call, document that we use the ≤200k rate and note the systematic under-bill risk)
- Change fallback from Flash pricing to Pro pricing (safer: over-bill unknowns, under-bill is worse)
- Change cached rate from "25% of input" heuristic to the actual `$0.125/M` flat rate for 2.5 Pro. Document that storage fees are not modeled.
- Add `const PRICING_LAST_VERIFIED = "2026-04-14"` constant

**Group 5: QuickBooks duplicate-group fix** (CRIT-4)
Rewrite the duplicate detection loop in `quickbooksCostLeakAnalysis.js:79-141` to cluster bills with the same vendor+amount into date-proximity groups and emit **one finding per group** (not per pair). `potentialSavings = amount × (groupSize - 1)` — only the extras are waste. Add a `likely_recurring` flag when all inter-bill intervals are ~30 days, so the UI can show "Likely a legitimate subscription".

**Group 6: AI summary parity — cost-leak tools**
Wire `generateAnalysisSummary` into two controllers that don't have it:
- `backend/src/controllers/shopifyController.js` (inside `analyzeShopifyCostLeaksEndpoint`)
- `backend/src/controllers/googleWorkspaceController.js` (inside `analyzeGoogleWorkspaceCostLeaksEndpoint`)
Copy the exact pattern from `fortnoxController.js:1137-1155`: call `generateAnalysisSummary(analysis)`, attach to `analysis.aiSummary`, swallow errors non-fatally.

**Group 7: AI summary for usage tools**
Add `generateUsageSummary(usageData, providerLabel)` to `backend/src/services/openaiService.js`. Same OpenRouter pipeline as `generateAnalysisSummary`, different system prompt focused on usage insights:
- "Analyze this API usage data for {provider}"
- "Identify trends, model mix, and budget-relevant findings"
- "Recommend cost-reduction actions (e.g., model downgrade opportunities)"

Wire into the 3 AI usage endpoints (`openaiUsageController.getUsage`, `anthropicUsageController.getUsage`, `geminiUsageController.getUsage`). The summary is generated on demand when a new `?withSummary=1` query param is set (or when the client posts to a new `/generate-summary` sub-endpoint — see testing section for decision rationale). This avoids generating summaries on every usage fetch.

**Group 8: usage_summaries table** (for AI tools' History tab)
New table migration:
```sql
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
```

New endpoints in a new `backend/src/controllers/usageSummaryController.js`:
- `POST /api/integrations/:id/usage-summary` — generates + stores a summary
- `GET /api/integrations/:id/usage-summaries` — lists past summaries for this integration

Routes registered in `backend/src/routes/index.js`.

### Frontend changes — 4-tab restoration

**All 9 tools get the same 4-tab structure:** `Overview | Analysis | History | Data`.

**5 new shared components** (all provider-agnostic):

1. **`<ToolDetailTabs>`** (`frontend/components/tools/tool-detail-tabs.tsx`) — 4-tab wrapper, accepts `integration` + `config`
2. **`<OverviewTab>`** (`overview-tab.tsx`) — integration metadata, connection type, OAuth token expiry, created/updated timestamps. Lift from pre-refactor `[id]/page.tsx` lines 2543-2702
3. **`<AnalysisTab>`** (`analysis-tab.tsx`) — dual-mode:
   - **Cost-leak mode** (when `config.analysisType === "costLeaks"`): calls `{provider}/cost-leaks` endpoint with optional inactivity-days dropdown. Renders the existing cost-leak findings UI (copy from pre-refactor `[id]/page.tsx` lines 1740-2279 + GWorkspace's current findings tab). Displays `aiSummary` at the top via ReactMarkdown.
   - **Usage mode** (when `config.analysisType === "usage"`): shows current usage snapshot + "Generate AI Summary" button. On click, calls `POST /api/integrations/:id/usage-summary`, displays returned `summary_text` via ReactMarkdown.
4. **`<HistoryTab>`** (`history-tab.tsx`) — dual-mode:
   - Cost-leak mode: queries `cost_leak_analyses` (existing endpoint), renders list
   - Usage mode: queries `GET /api/integrations/:id/usage-summaries` (new endpoint), renders list
5. **`<DataTab>`** (`data-tab.tsx`) — thin wrapper: renders `config.viewComponent` directly

**Config extension** in `UnifiedToolConfig`:
```ts
interface UnifiedToolConfig {
  // ... existing fields ...
  analysisType?: "costLeaks" | "usage" | "none"
  analysisEndpoint?: string          // e.g., "/api/integrations/fortnox/cost-leaks"
  analysisSupportsInactivity?: boolean
  analysisSections?: { key: string; title: string; emptyMessage: string }[]
}
```

Populate on all 9 configs. Tools with no analysis (none currently, but future-proofed) omit these fields and show only Overview/Data tabs.

**Wire-up**:
- `frontend/app/dashboard/tools/[id]/page.tsx` renders `<ToolDetailTabs>` inside the existing `<ToolDetailShell>` (replacing the current direct `<ViewComponent>` render)
- `google-workspace-view.tsx` loses its internal "Findings" tab (now in shared `<AnalysisTab>`)

### Data shape for AI summary payloads

**Cost-leak analyses** (existing, unchanged):
```js
{
  overallSummary: { totalFindings, totalPotentialSavings, highSeverity, mediumSeverity, lowSeverity },
  licenseAnalysis: { findings: [...], summary: {...} },  // for seat-based tools
  supplierInvoiceAnalysis: { ... },                        // for Fortnox/QB
  aiSummary: "markdown string"                             // optional — fills in for 4/6 tools today, 6/6 after Group 6
}
```

**Usage summary response** (new):
```js
{
  id: "uuid",
  provider: "OpenAI",
  summary_text: "markdown string",
  usage_snapshot: { ... },  // copy of the usage data at generation time, for traceability
  created_at: "ISO timestamp"
}
```

---

## Error handling

- **Revocation fetch fails** (Fortnox SEK→USD): fall back to hardcoded `0.095`, log warn
- **M365 unknown SKU**: returns `0` for that license, logs warn once per run (not per license — dedup via Set)
- **OpenRouter call fails** (AI summaries): returns `null`, calling code omits `aiSummary` from response, frontend gracefully hides the summary card
- **usage_summaries insert fails**: 500 to client, summary text is still returned (so user sees the result even if not persisted)
- **Frontend tab component errors**: each tab is an error boundary — one broken tab doesn't take down the page

---

## Testing

No automated test framework for these services. Manual verification steps per work group:

1. **CRIT-1 (M365)**: With a connected M365 account, run analysis and confirm a sample finding's `potentialSavings` equals the sum of the user's actual license costs from `M365_LICENSE_COSTS` (not `$20 × licenseCount`).
2. **CRIT-2 (Fortnox)**: Watch backend logs during analysis — confirm "Live rate fetched" log fires on first run and "cache hit" on subsequent runs within 24h. Compare the rate in the log to [frankfurter.app](https://www.frankfurter.app/latest?from=SEK&to=USD) manually.
3. **CRIT-3 (Gemini)**: Connect Gemini, pull usage, verify zero models fall into the "unknown → Pro fallback" log (unless Google releases a new model). Verify `gemini-2.5-pro` calls use `$1.25/M` for input ≤200k.
4. **CRIT-4 (QuickBooks)**: With sample data containing 4 monthly bills from the same vendor at the same amount, confirm exactly 1 finding is emitted (not 3) with `potentialSavings = amount × 3` and `likely_recurring = true`.
5. **Group 6**: Run Shopify + GoogleWorkspace cost-leak analysis, confirm `aiSummary` appears in the response body.
6. **Group 7**: Click "Generate AI Summary" on OpenAI detail page, confirm response has `summary_text` and it's saved to `usage_summaries`.
7. **Group 8**: Refresh the History tab, confirm the new summary appears with timestamp.
8. **Frontend parity**: For each of 9 tools, confirm all 4 tabs render without error. Compare Analysis tab layout against pre-refactor screenshots (if available) or GWorkspace's current Findings layout for visual consistency.

### Scope decision: `?withSummary=1` vs. explicit `POST /generate-summary`

Two ways to trigger AI usage summaries:

**Option X**: Extend the existing `GET /api/integrations/{tool}/usage` with a `?withSummary=1` query param. When set, generate + persist the summary and include it inline.

**Option Y** (chosen): Add a new `POST /api/integrations/:id/usage-summary` endpoint. Separates concerns (usage fetch is fast & cached; summary is slow + billable via OpenRouter). User explicitly opts in by clicking "Generate AI Summary". History accumulates only intentional runs.

Going with Y — cleaner separation, avoids accidental OpenRouter spend on every page load.

---

## Files changed

| File | Action | LoC |
|---|---|---|
| `backend/src/utils/currency.js` | NEW — SEK→USD live fetcher | +50 |
| `backend/src/services/microsoft365CostLeakAnalysis.js` | Modify — SKU-aware price lookup | +20/-10 |
| `backend/src/services/costLeakAnalysis.js` | Modify — use live rate | +15/-5 |
| `backend/src/services/geminiCostAnalysis.js` | Modify — pricing cleanup | +15/-20 |
| `backend/src/services/quickbooksCostLeakAnalysis.js` | Modify — duplicate grouping | +40/-20 |
| `backend/src/services/openaiService.js` | Modify — add `generateUsageSummary` | +80 |
| `backend/src/controllers/shopifyController.js` | Modify — wire aiSummary | +15 |
| `backend/src/controllers/googleWorkspaceController.js` | Modify — wire aiSummary | +15 |
| `backend/src/controllers/openaiUsageController.js` | Modify — wire usage summary endpoint | +10 |
| `backend/src/controllers/anthropicUsageController.js` | Modify — wire usage summary endpoint | +10 |
| `backend/src/controllers/geminiUsageController.js` | Modify — wire usage summary endpoint | +10 |
| `backend/src/controllers/usageSummaryController.js` | NEW — save/list summaries | +150 |
| `backend/src/routes/index.js` | Modify — add new routes | +8 |
| `backend/sql/0XX_usage_summaries.sql` | NEW — migration | +25 |
| `frontend/lib/tools/types.ts` | Modify — extend UnifiedToolConfig | +10 |
| `frontend/lib/tools/configs/*.ts` (all 9) | Modify — populate new analysis fields | +3/file |
| `frontend/components/tools/tool-detail-tabs.tsx` | NEW — 4-tab wrapper | +80 |
| `frontend/components/tools/overview-tab.tsx` | NEW | +150 |
| `frontend/components/tools/analysis-tab.tsx` | NEW — dual-mode | +550 |
| `frontend/components/tools/history-tab.tsx` | NEW — dual-mode | +250 |
| `frontend/components/tools/data-tab.tsx` | NEW — wraps viewComponent | +40 |
| `frontend/app/dashboard/tools/[id]/page.tsx` | Modify — use ToolDetailTabs | +10/-5 |
| `frontend/components/tools/google-workspace-view.tsx` | Modify — remove internal Findings tab | +5/-60 |

**Total: ~1,840 added, ~120 removed.** Single PR, 13 commits.

---

## Rollout

Single merge to main. No feature flag. No destructive data changes — the new `usage_summaries` table is additive; existing `cost_leak_analyses` untouched.

Rollback: `git revert` the merge commit + drop the `usage_summaries` table if needed. All other changes are pure code.

## Follow-ups (not in this spec)

- The ~40 remaining HIGH/MEDIUM accuracy findings from the audit (Shopify margin threshold, HubSpot pricing, M365 pricing refresh, etc.)
- Multi-currency support in Fortnox (EUR/NOK/DKK)
- Historical exchange-rate application (apply the invoice date's rate, not the current rate)
- Audit log table for every `generateAnalysisSummary` and `generateUsageSummary` call (billing transparency)
- Automated test framework for cost analyzers
