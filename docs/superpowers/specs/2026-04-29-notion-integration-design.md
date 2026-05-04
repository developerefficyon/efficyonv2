# Notion Integration — Design Spec

- **Date:** 2026-04-29
- **Topic:** Notion cost-leak integration (V1: bot users billed as members + seat-utilization gap + Notion AI add-on exposure)
- **Status:** Design ready; ready for implementation plan

## Summary

Add Notion as Efficyon's 18th integration. **The customer creates a public OAuth integration in their own Notion workspace**, copies the Consumer Key + Consumer Secret, and pastes them into Efficyon along with their plan tier and total seats. Efficyon does an OAuth 2.0 web-server flow, encrypts the (non-expiring) access token at rest, and runs three light cost-leak checks against the workspace's `/v1/users` endpoint.

**Honest scope:** This is a deliberately thinner V1 than Stripe / Salesforce. Notion's public REST API does not expose `last_login_at` or any per-user activity timestamp, so the inactive-user signal that powers the bulk of value in Slack / HubSpot / Salesforce / GitHub does not exist for Notion. We ship what we can detect with public data: bot accounts that customers may have miscounted as paid seats, and the gap between purchased seats vs. actual humans in the workspace.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **V1 scope:** 3 checks — (a) bot users counted as paid seats, (b) seat-utilization gap (paid_seats − person_count), (c) Notion AI add-on over-provisioning |
| 2 | **Auth:** customer-managed Notion public integration; OAuth 2.0 web-server flow. **No refresh tokens** — Notion access tokens do not expire |
| 3 | **Customer-supplied metadata in connect form:** plan tier (Free / Plus / Business / Enterprise) + total paid seats + has Notion AI? + AI seat count. Notion's API doesn't expose plan or billing |
| 4 | **Pricing:** hardcoded list-price map (`notionPricing.js`). Plus $10, Business $18, Enterprise $25 default, Notion AI $10 add-on. Documented note about negotiated discounts |
| 5 | **Severity ladder:** ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — consistent with AWS / Azure / GCP / Stripe / Salesforce |
| 6 | **Storage:** reuse `cost_leak_analyses`; migration `050_notion_provider.sql` extends the provider CHECK |
| 7 | **No "inactive user" detection in V1** — Notion public API has no last-login. Page-edit-history scanning deferred to V2 (heavy / expensive). Audit Log API deferred to V2 (Enterprise-only) |
| 8 | **Trigger:** on-demand only (no scheduler) |
| 9 | **API version:** Notion-Version `2022-06-28` (current stable) |

## Why this shape

- **Customer-managed OAuth over Efficyon-managed.** Same precedent as Salesforce / QuickBooks / HubSpot. Each customer's OAuth credentials are isolated. Avoids the operator burden of registering a single public integration with Notion and managing its review status.
- **Thin V1 over a deferred Notion launch.** A Notion checkbox on the integrations page has marketing value even if findings are light. Customers who want it know what they're getting (bot detection + seat gap), and we can layer the page-edit-history-based inactivity check in V2 without breaking changes.
- **Customer-entered seats over scraped billing.** Notion exposes no billing endpoint. Asking the customer to enter their plan tier + seat count is one extra connect-form step but unblocks the only quantitative findings the API allows.
- **Reuse `cost_leak_analyses`.** Same logic as every other integration — JSONB schema absorbs Notion findings cleanly, only schema change is the provider CHECK.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ notionAuth.js                            OAuth code exchange + encryption (no refresh — tokens never expire)
├─ services/
│  ├─ notionPricing.js                         Plan tier + AI list-price map
│  ├─ notionCostLeakAnalysis.js                Aggregator
│  └─ notionChecks/
│     ├─ botSeatsBilled.js                     Check 1
│     ├─ seatUtilizationGap.js                 Check 2
│     └─ notionAIOverprovisioning.js           Check 3
├─ controllers/
│  └─ notionController.js                      oauth/start, callback, validate, status, users, cost-leaks, disconnect
└─ sql/
   └─ 050_notion_provider.sql                  Extends valid_provider CHECK to include 'Notion'
```

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/
│  └─ notion.ts                                UnifiedToolConfig — oauth + plan/seats/AI fields
└─ components/tools/
   └─ notion-view.tsx                          Data tab — workspace info + members table + honest-limitation note
```

**Wiring**

- `frontend/lib/tools/registry.ts` — register `notionConfig`
- `backend/src/routes/index.js` — register 7 controller routes
- `frontend/app/dashboard/tools/guide/page.tsx` — add Notion section to setup-guide page
- `frontend/components/tools/tool-logos.tsx` — add Notion brand mark (simple-icons "N")
- `docs/tool-analysis-reference.md` — add Notion entry

### Data flow

```
User clicks Connect Notion → fills 6 fields (consumerKey, consumerSecret, planTier, totalSeats, hasAI, aiSeats)
  → POST /api/integrations { _pending_notion_creds, plan_tier, total_seats, has_ai, ai_seats }
  → frontend hits GET /api/integrations/notion/oauth/start
  → backend builds authorize URL with state token, redirects browser
  → user approves on Notion → Notion redirects to /api/integrations/notion/callback?code=...&state=...
  → backend verifies state, exchanges code for token via POST https://api.notion.com/v1/oauth/token (HTTP Basic auth)
  → encrypts access_token at rest along with workspace_id, workspace_name
  → flips status to "connected"; redirects to dashboard

Later: User clicks "Run Analysis"
  → POST /api/integrations/notion/cost-leaks
  → controller: lookup, status check, 5-min duplicate-check
  → service: pull /v1/users paginated, fan out to 3 checks
  → aggregator: severity, drop zero, sort
  → returns { findings, summary, warnings }
  → frontend persists via /api/analysis-history (matches GitHub / Stripe / Salesforce pattern)
```

### The 3 V1 checks — detail

#### 1. Bot users billed as paid seats

- **Notion API:** `GET /v1/users` paginated (Notion uses cursor pagination via `start_cursor` and `next_cursor`; `page_size` max 100)
- **Detection:** filter `type === "bot"`. Bots in the workspace member list don't represent paid humans, but customers sometimes tell their CFO their seat count includes them
- **Output:** one finding per bot — `currentValue: planPrice`, `potentialSavings: planPrice` (the savings if the customer reduces their seat count by 1 per bot they were over-counting)
- **Evidence:** Notion `id` for each bot
- **Action text:** "Bot account `<name>` is in the workspace member list — make sure your `<plan>` seat count doesn't include it. Bots are free in Notion's billing."

#### 2. Seat-utilization gap

- **Notion API:** same `/v1/users` pull; count `type === "person"`
- **Customer-supplied:** `total_seats` (entered at connect)
- **Detection:** `gap = total_seats - person_count`. If `gap > 0`, the customer is paying for unused capacity
- **Output:** one finding — `currentValue: gap × planPrice`, `potentialSavings: gap × planPrice`
- **Action text:** "You purchased `<N>` seats on the `<plan>` plan but only `<M>` humans are in the workspace. Reduce seat count to `<M>` to save `$<gap × price>/mo`."
- **Note:** gap can also be 0 or negative (more humans than seats means the customer either entered the wrong number or has guests we're miscounting). If gap ≤ 0, no finding.

#### 3. Notion AI add-on over-provisioning

- **Conditional:** only fires if customer indicated `has_ai === true` at connect
- **Notion API:** same `/v1/users` pull; count `type === "person"`
- **Customer-supplied:** `ai_seats`
- **Detection:** `aiGap = ai_seats - person_count`. If `aiGap > 0`, unused AI capacity
- **Output:** one finding — `currentValue: aiGap × $10`, `potentialSavings: aiGap × $10`
- **Action text:** "You bought `<X>` Notion AI seats but only `<Y>` humans are in the workspace. Reduce AI seats to `<Y>` to save `$<aiGap × 10>/mo`."

### Severity assignment

```javascript
function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null  // drop the finding
}
```

Identical to all prior integrations.

### Auth model

**Customer creates a public OAuth integration in Notion:**
1. Notion → Settings & members → Connections → Develop or manage integrations → New integration
2. Type: **Public** (not Internal)
3. Provide name "Efficyon Cost Analyzer", logo, contact email, redirect URI
4. Copy the OAuth Client ID and Client Secret
5. Paste both into Efficyon's connect form

**Required Notion API capabilities** (configured during integration creation):
- Read user information including emails (the only user-related capability)
- No write permissions

**Storage in `company_integrations.settings`:**
- `client_id_encrypted` — encrypted Consumer Key
- `client_secret_encrypted` — encrypted Consumer Secret
- `access_token_encrypted` — non-expiring access token (Notion specific)
- `bot_id` — the integration's bot user ID inside the workspace
- `workspace_id`, `workspace_name`, `workspace_icon` — captured at OAuth callback
- `plan_tier` — `"free" | "plus" | "business" | "enterprise"`
- `total_seats` — number entered at connect
- `has_ai` — boolean
- `ai_seats` — number (only present if `has_ai`)
- `last_validated_at` — ISO timestamp

**No token cache needed** — Notion access tokens don't expire, so the encrypted token in `settings` is the durable source. We just decrypt + use on each request.

**OAuth host:** `https://api.notion.com` (single endpoint — no sandbox split like Salesforce)

### Connect form (declarative)

```typescript
authType: "oauth"
authFields: [
  { name: "consumerKey",    label: "Notion Integration Client ID",     type: "text",     required: true,  hint: "From your Notion integration's secrets page" },
  { name: "consumerSecret", label: "Notion Integration Client Secret", type: "password", required: true },
  { name: "planTier",       label: "Plan Tier",                         type: "select",   required: true,
    options: [
      { value: "free",       label: "Free ($0/seat)" },
      { value: "plus",       label: "Plus ($10/seat/mo)" },
      { value: "business",   label: "Business ($18/seat/mo)" },
      { value: "enterprise", label: "Enterprise ($25/seat/mo default)" },
    ],
  },
  { name: "totalSeats",     label: "Total Paid Seats",                  type: "text",     required: true,  placeholder: "25", hint: "How many paid seats you purchased — check Notion → Settings → Plans" },
  { name: "hasAI",          label: "Notion AI Add-On?",                 type: "select",   required: true,
    options: [
      { value: "no",  label: "No" },
      { value: "yes", label: "Yes — adds $10/seat/mo to detected exposure" },
    ],
  },
  { name: "aiSeats",        label: "Total Notion AI Seats",             type: "text",     required: false, placeholder: "Leave blank if no AI", hint: "Only required if you have Notion AI" },
]
oauthStartEndpoint: "/api/integrations/notion/oauth/start"
quickSetup: {
  title: "How to create a Notion public integration",
  steps: [
    "Go to https://www.notion.so/my-integrations",
    "Click 'New integration'. Type: Public. Name: 'Efficyon Cost Analyzer'",
    "Set Redirect URIs to your Efficyon callback (local: http://localhost:4000/api/integrations/notion/callback)",
    "Capabilities: 'Read content' is enough; we only call /v1/users",
    "User capabilities: 'Read user information including email addresses'",
    "Save and copy OAuth Client ID + Client Secret from the integration's secrets page",
    "Paste them above along with your plan + seat counts, then click Connect",
  ],
  note: "Notion's 'Internal' integration type is simpler but only works in one workspace. We use Public OAuth so the integration scales across customer workspaces.",
}
```

### Token revocation

`tokenRevocation.automated: false` — Notion doesn't expose a public revoke-by-token endpoint. Show manual-steps note: *"To revoke access, go to your Notion workspace → Settings & members → Connections → find 'Efficyon Cost Analyzer' → Disconnect. Or delete the integration entirely from notion.so/my-integrations."*

### Routes

Middleware per route — matches the Salesforce / QuickBooks pattern:

```
GET    /api/integrations/notion/oauth/start    requireAuth + requireRole("owner","editor")           Build authorize URL with base64-encoded JSON state
GET    /api/integrations/notion/callback       (no auth — Notion's browser redirect)                 Exchange code for token, persist, redirect to dashboard
POST   /api/integrations/notion/validate       requireAuth + requireRole("owner","editor")           Manual re-validate (for "Refresh status" button)
GET    /api/integrations/notion/status         requireAuth + requireRole("owner","editor","viewer")  Connection metadata (no Notion call)
GET    /api/integrations/notion/users          requireAuth + requireRole("owner","editor","viewer")  Workspace member list for Data tab
POST   /api/integrations/notion/cost-leaks     requireAuth + requireRole("owner","editor")           Run analysis, return findings
DELETE /api/integrations/notion                requireAuth + requireRole("owner","editor")           Disconnect — clear encrypted token, flip status
```

The callback route is the only one without `requireAuth` — same OAuth-redirect rationale as Salesforce. State parameter is base64-encoded JSON `{ company_id, integration_id }` (matches QuickBooks / HubSpot / Salesforce — not signed; future hardening item across all OAuth integrations).

### Error handling

| Failure | Response |
|---|---|
| Bad client_id/client_secret on token exchange (Notion returns 401 `invalid_client`) | 400 with hint about re-checking integration credentials |
| Customer denies consent | redirect to `/dashboard/tools?notion_consent=denied` |
| Notion access token revoked | 401 with `code: "notion_credentials_revoked"`, message "Notion credentials revoked — please reconnect" |
| Notion 429 rate limit | 503 with retry-after suggestion (Notion's limits are generous: 3 req/s average) |
| Single check throws | partial findings + `warnings: [{ check, error }]`; analysis still saved |
| `/v1/users` returns empty list | not an error — just produces zero findings; surface a warning in response |

### Frontend behavior

- **Data tab (`notion-view.tsx`):** two sections —
  - **Workspace info:** workspace name, workspace ID, plan tier, total paid seats (from settings), Notion AI on/off + AI seats, member count, bot count, last validated.
  - **Members:** table of up to 100 most recent users. Columns: name, email, type (person / bot), avatar.
  - **Honest-limitation banner** at the top: *"Notion's public API doesn't expose per-user login activity. Findings here are based on bot detection and the seat-utilization gap. Inactive-user detection requires Audit Log API access (Enterprise plan only) and is on the V2 roadmap."*
- **Analysis tab:** uses shared `analysis-tab.tsx` because `analysisType: "costLeaks"`. **No** inactivity dropdown (`analysisSupportsInactivity: false`).
- **History tab:** shared `history-tab.tsx`.
- **Brand color:** `#000000` (Notion's mark is monochrome black on white).

### Storage shape

Reuses existing `cost_leak_analyses` row format. Migration `050_notion_provider.sql` only extends the provider CHECK to include `'Notion'`. No new columns.

```jsonb
summary: {
  totalFindings: 3,
  totalCurrentValue: 270,
  totalPotentialSavings: 270,
  healthScore: 84,
  criticalSeverity: 0,
  highSeverity: 1,
  mediumSeverity: 2,
  lowSeverity: 0,
  pricingNote: "Savings shown at Notion list price. Plus $10, Business $18, Enterprise $25 (default — varies by contract). Apply your negotiated discount for actual recovery."
}
analysis_data: {
  findings: [
    {
      check: "seat_utilization_gap",
      title: "5 unused seats on the Business plan",
      severity: "high",
      currency: "USD",
      currentValue: 90,
      potentialSavings: 90,
      evidence: ["bot:b1", "bot:b2"],
      action: "You purchased 25 seats but only 20 humans are in the workspace. Reduce seat count to 20 to save $90/mo.",
    },
    {
      check: "bot_seats_billed",
      title: "Bot 'Slackbot Sync' may be miscounted as a paid seat",
      severity: "low",
      currency: "USD",
      currentValue: 18,
      potentialSavings: 18,
      evidence: ["abc-bot-id"],
      action: "Bot 'Slackbot Sync' is in the workspace — make sure your seat count doesn't include it. Bots are free in Notion's billing.",
    },
    ...
  ],
  warnings: [],
  parameters: { },
  workspace: { id, name, plan_tier, total_seats, has_ai, ai_seats }
}
```

### Pricing constants (`notionPricing.js`)

```javascript
// Notion's published list prices in USD/user/mo. Customers typically negotiate
// 10–30% discounts on Business and 30–50% on Enterprise. Update annually.

const PLAN_PRICES = {
  free: 0,
  plus: 10,        // $10/seat/mo (annual; $12 monthly)
  business: 18,    // $18/seat/mo (annual; $24 monthly)
  enterprise: 25,  // $25/seat/mo default (highly negotiated; range $20-30+)
}

const NOTION_AI_PRICE = 10 // $10/seat/mo add-on, applies to any plan

function resolvePlanPrice(planTier) {
  if (!planTier) return 0
  return PLAN_PRICES[planTier.toLowerCase()] || 0
}

const PRICING_NOTE =
  "Savings shown at Notion list price. Plus $10, Business $18, Enterprise $25 (default — varies). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { PLAN_PRICES, NOTION_AI_PRICE, resolvePlanPrice, PRICING_NOTE }
```

### Out of scope for V1 (deferred to V2)

- Inactive user detection via page edit history scanning (heavy — paginate all pages, join `last_edited_by` to `last_edited_time`)
- Audit Log API integration (Enterprise plan only — would unlock real activity-based findings)
- Workspace consolidation findings (multiple separate workspaces detection)
- Plan tier downgrade recommendations
- Guest-vs-member distinction (Notion API doesn't cleanly distinguish)
- Internal Integration Token alternative auth path
- Background scheduled syncs

## Testing

Per CLAUDE.md no test runner. Verification is manual against a free Notion workspace.

Plan:

1. Sign up for a free Notion workspace (or use an existing personal one)
2. Go to notion.so/my-integrations → New integration → Public
3. Configure with the OAuth scopes per the connect-form quickSetup
4. Connect via Efficyon, walk through OAuth dance
5. Verify status `connected`, `workspace_id` populated, member list returns
6. Run analysis with intentionally-mismatched seat counts entered (e.g. say "10 seats" when only 3 humans exist) and verify findings fire
7. Verify error paths: bad client_id, denied consent, revoked token

## Open questions before implementation

None — all decisions resolved.

## Implementation order (rough)

1. SQL migration `050_notion_provider.sql` (apply via Supabase MCP)
2. `notionPricing.js` constants
3. `notionAuth.js` — OAuth code exchange + encryption
4. `notionController.js` skeleton — oauth/start, callback, validate, status, disconnect
5. Wire connect/oauth/status routes; manual end-to-end OAuth dance verification
6. Frontend `notion.ts` config + placeholder view + registry entry
7. Manual verification of full connect flow with a real Notion workspace
8. Data endpoint (`/users`) + filled-in `notion-view.tsx`
9. The 3 check modules
10. Aggregator + `/cost-leaks` endpoint + History tab integration
11. Setup-guide page section + brand logo + reference doc
12. End-to-end manual verification with seeded mismatched seat counts
