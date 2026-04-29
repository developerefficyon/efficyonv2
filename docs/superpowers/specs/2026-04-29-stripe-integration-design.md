# Stripe Integration — Design Spec

- **Date:** 2026-04-29
- **Topic:** Stripe revenue-leak integration (V1: failed payment recovery + card-expiry preventable churn + past-due subscriptions + disputes/chargebacks)
- **Status:** Design ready; ready for implementation plan

## Summary

Add Stripe as the 16th integration. **The customer connects their own Stripe account** by pasting a restricted API key (read-only, scoped to the resources we need). Efficyon validates and encrypts the key, then runs four "money on the floor" checks against their Stripe data and surfaces findings in the existing cost-leak dashboard.

This stretches the platform's framing slightly: Stripe findings are **revenue to recover** rather than **cost to cut**. We reuse the existing `cost_leak_analyses` storage and surfacing without schema gymnastics — the dollar number is still "money you'd otherwise lose," just on the inflow side.

**Zero operator setup.** No Efficyon Stripe Connect platform, no operator env vars. Matches the GitHub / Zoom / Fortnox pattern.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **Scope:** V1 is recovery-only — 4 checks: failed payment recovery, card-expiry churn, past-due subscriptions, disputes |
| 2 | **Auth:** customer-pasted Stripe restricted key (read-only, listed scopes); validated on connect via `GET /v1/account` |
| 3 | **Lookback window:** user-selectable 30 / 90 / 180 days, default 90; uses existing `analysisSupportsDateRange` config flag |
| 4 | **Currency:** report in the Stripe account's `default_currency`; multi-currency accounts get findings grouped by currency, no FX conversion |
| 5 | **Trigger:** on-demand only via "Run Analysis" button (no background scheduler) |
| 6 | **Severity ladder:** ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — same as AWS/Azure/GCP |
| 7 | **Storage:** existing `cost_leak_analyses` table; migration `048_stripe_provider.sql` adds `'Stripe'` to the provider CHECK constraint |
| 8 | **Code layout:** thin aggregator (`stripeRevenueLeakAnalysis.js`) over four single-purpose check modules; controller exposes the connect/data/analyze surface |
| 9 | **Frontend:** `apiKey` auth type + `analysisType: "costLeaks"` — reuses GitHub's UnifiedToolConfig shape exactly, no new components shared by all tools |

## Why this shape

- **Restricted API key over Stripe Connect.** Connect is the "right" long-term pattern but requires Efficyon to register a Connect Platform and pass Stripe's Platform Profile review (~3–5 business days). For V1 we trade that gating step for the GitHub-style paste flow we already know works. Layering Connect on later is a non-breaking enhancement.
- **Recovery-only V1 over the full revenue audit.** The four V1 checks all map cleanly to "dollars you can still recover this month" — high-conviction findings with no subjective interpretation. Pricing-hygiene checks (legacy customers below current list price, monthly→annual upsells) require the customer to confirm their current pricing, which adds friction. Fee/compliance checks overlap with what Stripe's own dashboard already surfaces. Both deferred to V2.
- **Reuse `cost_leak_analyses` over a separate `revenue_leak_analyses` table.** The existing schema is JSONB-flexible enough to hold a "potential recovery" amount in the same `summary.totalPotentialSavings` field. Forking the storage path would mean forking the History tab, the analysis-tab component, and the renewals/snapshot pipelines. Reuse is correct here.
- **Native currency over FX conversion.** Most Stripe accounts run a single presentment currency. Multi-currency accounts would require a daily FX rate source — pure complexity for the long tail. Group findings per currency in V1 and document that totals across currencies are summed naively (USD + EUR add as if 1:1). If multi-currency customers complain, add a FX layer in V2.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ stripeAuth.js                       Restricted-key encrypt/decrypt + validation (GET /v1/account)
├─ services/
│  ├─ stripeRevenueLeakAnalysis.js        Aggregator — fans out to 4 checks, severity assignment
│  └─ stripeChecks/
│     ├─ failedPaymentRecovery.js         invoices.list({ status: 'open', collection_method: 'charge_automatically' })
│     ├─ cardExpiryChurn.js               customers + payment_methods + subscriptions cross-check
│     ├─ pastDueSubscriptions.js          subscriptions.list({ status: 'past_due' | 'unpaid' })
│     └─ disputes.js                      disputes.list({ created.gte })
├─ controllers/
│  └─ stripeIntegrationController.js      validate / status / subscriptions / invoices / disputes / analyze / disconnect (named to avoid collision with existing stripeController.js used for Efficyon's own billing)
└─ sql/
   └─ 048_stripe_provider.sql             Extends valid_provider CHECK to include 'Stripe'
```

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/
│  └─ stripe.ts                           UnifiedToolConfig — apiKey + dateRange + costLeaks
└─ components/tools/
   └─ stripe-view.tsx                     Data tab: 3 panels (Subscriptions / Invoices / Disputes)
```

**Wiring**

- `frontend/lib/tools/registry.ts` — register `stripeConfig`
- `backend/src/routes/index.js` — register the 7 controller routes (all behind `requireAuth` + `requireRole`)

### Data flow

```
User clicks "Run Analysis" with chosen date range (30 / 90 / 180 days)
  → POST /api/integrations/stripe/cost-leaks { startDate, endDate }
  → controller verifies auth + integration ownership
  → service decrypts restricted key, fans out 4 parallel API pulls (Promise.allSettled)
  → each check returns { findings: [...], warnings?: [...] }
  → aggregator assigns severity per ladder, drops zero-value findings, sorts by potentialRecovery desc
  → save via shared analysisHistoryController.saveAnalysis (writes to cost_leak_analyses)
  → response: { findings, summary: { totalFindings, totalPotentialSavings, healthScore, ... }, warnings }
```

### The 4 V1 checks — detail

#### 1. Failed payment recovery

- **Stripe API:** `GET /v1/invoices` paginated, filters: `status=open`, `collection_method=charge_automatically`, `created[gte]={lookbackStart}`
- **Detection:** `attempt_count >= 1` and `status not in ('paid', 'void', 'uncollectible')`
- **Output (per currency):** `{ title: "Failed payments awaiting recovery", count, totalAmount, recoverable, evidence: [first 10 invoice IDs] }` where `recoverable = totalAmount × 0.65` (B2B SaaS dunning recovery benchmark; constant lives in `stripeChecks/failedPaymentRecovery.js` so we can tune it later without a migration)
- **Severity:** by total `amount_remaining` ÷ 100, applying the standard ladder

#### 2. Card-expiry preventable churn

- **Stripe API:** `customers.list` paginated → for each, `paymentMethods.retrieve(customer.invoice_settings.default_payment_method)` → cross-check `subscriptions.list({ customer, status: 'active' })`
- **Detection:** card with `exp_year/exp_month` falling in the next 60 days, customer has at least one active subscription
- **Output:** one finding per at-risk customer; `potentialLoss = sum(subscription.plan.amount × cycle_normalized_to_monthly)`
- **Severity:** by potentialLoss
- **Note:** we don't check whether Stripe Adaptive Acceptance / card updater is enabled — that's a V2 enhancement (would skip findings the customer is already mitigating)

#### 3. Past-due subscriptions

- **Stripe API:** `subscriptions.list({ status: 'past_due' })` and `subscriptions.list({ status: 'unpaid' })`, both paginated
- **Detection:** all results
- **Output:** finding per subscription with customer email, plan name, MRR, days past due
- **Severity:** by MRR (cycle normalized to monthly)

#### 4. Disputes / chargebacks

- **Stripe API:** `disputes.list({ created[gte]: lookbackStart })` paginated
- **Aggregation:** count, sum of `amount` ÷ 100, total Stripe dispute fees (approximated at $15 × count — the standard US card dispute fee; varies by region/card brand and isn't returned in the dispute object, so we use the modal value)
- **Output:** one trend finding per currency: `{ title: "Disputes & chargebacks (last {N} days)", count, totalLost, feesPaid, evidence: [first 10 dispute IDs] }`
- **Severity:** by `totalLost + feesPaid`

### Severity assignment

Identical to AWS/Azure aggregators:

```
if (potentialRecovery >= 500)  severity = "critical"
else if (potentialRecovery >= 100) severity = "high"
else if (potentialRecovery >= 25)  severity = "medium"
else if (potentialRecovery > 0)    severity = "low"
else drop the finding
```

### Auth model

- Customer creates a restricted key in their Stripe dashboard (Developers → API keys → Restricted keys)
- Required scopes (all `Read`):
  - Charges
  - Customers
  - Disputes
  - Invoices
  - Payment Intents
  - Subscriptions
- Customer pastes `rk_live_...` (or `rk_test_...` for sandbox testing) into Efficyon
- Backend `POST /api/integrations/stripe/validate` calls Stripe's `GET /v1/account` to verify the key is valid and capture `account.id`, `account.business_profile.name`, `account.default_currency`
- Key + account metadata stored encrypted in `company_integrations.settings._stripe_restricted_key` (string-level encryption via existing `encrypt()` helper, same pattern as Zoom)

### Connect form (declarative, single field)

```
authType: "apiKey"
authFields: [
  {
    name: "restrictedKey",
    label: "Stripe Restricted API Key",
    type: "password",
    required: true,
    placeholder: "rk_live_...",
    hint: "Stripe Dashboard → Developers → API keys → Restricted keys",
  }
]
quickSetup: {
  title: "How to get your Stripe restricted key",
  steps: [
    "Open Stripe Dashboard → Developers → API keys",
    "Click 'Create restricted key'",
    "Name it 'Efficyon Cost Analyzer'",
    "Grant Read access to: Charges, Customers, Disputes, Invoices, Payment Intents, Subscriptions",
    "Click 'Create key', then reveal and copy the rk_live_... key",
    "Paste it here",
  ],
}
```

### Token revocation

`tokenRevocation.automated: false` — restricted keys can only be revoked from the Stripe dashboard. Show manual-steps note in delete dialog: *"To revoke access, go to Stripe Dashboard → Developers → API keys → find 'Efficyon Cost Analyzer' → Roll or Delete."*

### Routes

All under `requireAuth` + `requireRole("owner", "editor", "viewer")` per CLAUDE.md:

```
POST   /api/integrations/stripe/validate          Validate a restricted key (preflight, before save)
GET    /api/integrations/stripe/account           Account metadata (used by view component)
GET    /api/integrations/stripe/subscriptions     Recent 50 subscriptions for Data tab
GET    /api/integrations/stripe/invoices          Recent 50 invoices for Data tab
GET    /api/integrations/stripe/disputes          Recent 50 disputes for Data tab
GET    /api/integrations/stripe/status            Connection status + last sync timestamp
POST   /api/integrations/stripe/cost-leaks        Run the 4 checks, persist to cost_leak_analyses
DELETE /api/integrations/stripe                   Disconnect (deletes encrypted key)
```

Recommendations endpoints (read-only, served by the shared `recommendationController`) — no new code needed.

### Error handling

| Failure | Response |
|---|---|
| Invalid / revoked key (Stripe returns 401) | 401 to frontend with `code: "stripe_credentials_invalid"`, message *"Stripe credentials invalid — please reconnect"* |
| Rate limit (Stripe 429) | Stripe SDK retries with backoff; if still failing after 3 retries, return 503 with retry-after |
| Missing scope on the key (Stripe returns 403) | 403 with `code: "stripe_missing_scope"`, message identifying which scope is missing |
| Single check throws | Captured in `Promise.allSettled`; partial findings returned with a `warnings: [{ check, error }]` field; analysis still saved |
| Network timeout | 30s per Stripe call, axios `AbortController`; check fails, others continue |

### Frontend behavior

- **Data tab (`stripe-view.tsx`):** three collapsible panels — Subscriptions (status, customer, MRR, current period end), Invoices (status, customer, amount, due date), Disputes (status, amount, reason, evidence due date). Each shows the most recent 50; "View in Stripe" deep-link per row.
- **Analysis tab:** uses the shared `analysis-tab.tsx` because `analysisType: "costLeaks"`. Date range picker appears because `analysisSupportsDateRange: true`.
- **History tab:** uses the shared `history-tab.tsx` — Stripe runs appear alongside other cost-leak runs.
- **Brand color:** `#635BFF` (Stripe purple)

### Storage shape

Reuses existing `cost_leak_analyses` row format — no schema migration beyond the CHECK constraint extension:

```jsonb
summary: {
  totalFindings: 7,
  totalPotentialSavings: 2840,    // dollars to recover
  totalCurrentValue: 12500,       // gross MRR / volume scanned
  healthScore: 72,                // 100 - (findings_severity_weighted)
  highSeverity: 2,
  mediumSeverity: 3,
  lowSeverity: 2,
  currency: "USD"                 // primary; per-finding may differ
}
analysis_data: {
  findings: [
    {
      check: "failed_payment_recovery",
      title: "12 failed payments awaiting recovery",
      severity: "critical",
      currency: "USD",
      currentValue: 3400,
      potentialRecovery: 2700,
      evidence: ["in_1Abc...", "in_1Def...", ...],
      action: "Enable Smart Retries with at least 4 attempts over 14 days; check Adaptive Acceptance is on.",
    },
    ...
  ],
  warnings: [],                   // populated if any check failed
  parameters: { startDate, endDate, lookbackDays },
  account: { id, default_currency, business_name }
}
```

### Out of scope for V1 (deferred)

- Pricing-hygiene checks: stale prices, idle products, pricing drift, monthly→annual upsell candidates, coupon overuse
- Fee/compliance checks: effective Stripe fee %, EU tax ID coverage, 3DS/SCA enforcement, webhook endpoint health
- Stripe Connect OAuth (alternative auth path)
- Multi-currency FX conversion
- Background scheduled syncs (polling Stripe nightly for new failed payments)
- Recoverability decay scoring (% chance of recovery vs. age of failed charge)
- Trend over time (this run vs. last run delta)

## Testing

Per CLAUDE.md no test runner exists in either app. Verification is manual against a Stripe **test-mode** account.

Plan:

1. Create a Stripe test account (or use the team's existing one)
2. Use Stripe CLI fixtures to seed:
   - 8–10 failed invoices (`stripe trigger invoice.payment_failed` × N)
   - 3 customers with cards expiring in 30 days (`stripe fixtures` custom JSON)
   - 2 past-due subscriptions
   - 4 disputes
3. Connect the test account to a local Efficyon instance using a restricted key
4. Run the analysis, verify each check fires with the expected counts and amounts
5. Verify findings persist to `cost_leak_analyses` and surface in History tab
6. Verify error paths: invalid key, revoked key, missing scope (create a key without one of the 6 scopes), 30s timeout simulated by network throttling

## Open questions before implementation

None — all decisions resolved during brainstorming.

## Implementation order (rough)

1. SQL migration `048_stripe_provider.sql`
2. `stripeAuth.js` + `stripeController.validate` + the connect/disconnect/status routes — get the connect flow working end to end
3. Data tab routes (`/account`, `/subscriptions`, `/invoices`, `/disputes`) + `stripe-view.tsx`
4. Each of the 4 check modules in isolation, against a test-mode account
5. `stripeRevenueLeakAnalysis.js` aggregator + `/cost-leaks` endpoint + History tab integration
6. End-to-end manual verification per the test plan above
