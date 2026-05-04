# Linear Integration — Design Spec

- **Date:** 2026-05-04
- **Topic:** Linear cost-leak integration (V1: inactive billable users)
- **Status:** Design ready; ready for implementation plan

## Summary

Add Linear as Efficyon's 19th integration. **The customer creates an OAuth Application in their own Linear workspace**, copies the Client ID + Secret, and pastes them into Efficyon along with their plan tier. Efficyon does an OAuth 2.0 web-server flow against Linear's GraphQL API, encrypts the access + refresh tokens at rest, and runs one high-conviction check: inactive billable users.

V1 is deliberately focused on a single check. Linear's per-user pricing (Standard $8, Plus $14, Enterprise ~$25) means each inactive user is a real dollar finding, and the API exposes `lastSeenAt` cleanly — no need to scaffold weaker secondary checks. V2 can layer in bot detection, admin audits, and plan-tier downgrade.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **V1 scope:** ONE check — inactive billable users (`active = true` AND `lastSeenAt < cutoff`) |
| 2 | **Auth:** customer-managed Linear OAuth app; OAuth 2.0 web-server flow with refresh tokens |
| 3 | **Customer-supplied at connect:** plan tier (Standard / Plus / Enterprise) |
| 4 | **No total-seats input** — Linear bills per active user, so bill = `active_count × plan_price`. We compute directly |
| 5 | **Inactivity window:** user-selectable 30 / 60 / 90 / 180 days, default 60 |
| 6 | **Pricing:** hardcoded list-prices (`linearPricing.js`). Standard $8, Plus $14, Enterprise $25 default. Documented `pricingNote` about negotiated discounts |
| 7 | **Severity ladder:** ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — consistent with everything else |
| 8 | **Storage:** reuse `cost_leak_analyses`; migration `051_linear_provider.sql` extends provider CHECK |
| 9 | **Trigger:** on-demand only (no scheduler) |
| 10 | **API:** GraphQL at `https://api.linear.app/graphql`. Cursor pagination via `pageInfo.endCursor`, capped at 1000 users |

## Why this shape

- **Customer-managed OAuth over personal API key.** Personal API key is simpler to paste but tied to one user's permissions and gets revoked when that user leaves. OAuth at the workspace level survives personnel turnover and matches Salesforce / Notion / QuickBooks precedent. Linear OAuth supports refresh tokens (10-hour access tokens, long-lived refresh).
- **One strong check over three thin checks.** Linear's API is rich enough to support bot detection, admin audits, plan-tier analysis, etc. — but V1 ships when we have the highest-conviction finding working. Inactive billable users at $8–$14/user/mo produces real dollar findings; a 50-person workspace with 10 inactive users = $80–$140/mo low-confidence savings. Other checks are weaker on per-finding dollar value.
- **No total-seats input.** Linear's pricing is fundamentally per-active-user — the customer's bill is automatically `active_count × plan_price`. We don't need them to tell us seat count (unlike Notion). Less connect-form friction.
- **Reuse `cost_leak_analyses`.** Same logic as every other integration. JSONB schema absorbs Linear findings cleanly; only schema change is the provider CHECK extension.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ linearAuth.js                            OAuth code/refresh exchange + encryption + GraphQL request helper + paginated users pull
├─ services/
│  ├─ linearPricing.js                         Plan tier list-price map
│  ├─ linearCostLeakAnalysis.js                Aggregator + the one check
│  └─ linearChecks/
│     └─ inactiveUsers.js                      The V1 check
├─ controllers/
│  └─ linearController.js                      oauth/start, callback, validate, status, users, cost-leaks, disconnect
└─ sql/
   └─ 051_linear_provider.sql                  Extends valid_provider CHECK to include 'Linear'
```

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/
│  └─ linear.ts                                UnifiedToolConfig — oauth + planTier select + analysisSupportsInactivity
└─ components/tools/
   └─ linear-view.tsx                          Data tab — workspace info + members table with lastSeenAt
```

**Wiring**

- `frontend/lib/tools/registry.ts` — register `linearConfig`
- `backend/src/routes/index.js` — register 7 controller routes
- `frontend/app/dashboard/tools/guide/page.tsx` — add Linear setup walkthrough
- `frontend/components/tools/tool-logos.tsx` — add Linear brand mark (simple-icons)
- `docs/tool-analysis-reference.md` — add Linear entry

### Data flow

```
User clicks Connect Linear → fills 3 fields (clientId, clientSecret, planTier)
  → POST /api/integrations { _pending_linear_creds, plan_tier }
  → frontend hits GET /api/integrations/linear/oauth/start
  → backend builds authorize URL with state token, redirects browser
  → user approves on Linear → Linear redirects to /api/integrations/linear/callback?code=...&state=...
  → backend verifies state, exchanges code for tokens via POST https://api.linear.app/oauth/token
  → encrypts access_token + refresh_token at rest along with workspace metadata
  → flips status to "connected"; redirects to dashboard

Later: User clicks "Run Analysis" with chosen inactivity window
  → POST /api/integrations/linear/cost-leaks { inactivityDays }
  → controller: lookup, status check, 5-min duplicate-check
  → service: refresh access token if needed, pull paginated users, run check
  → aggregator: severity, drop zero, sort
  → returns { findings, summary, warnings, parameters: { inactivityDays } }
  → frontend persists via /api/analysis-history (matches GitHub/Stripe/Salesforce/Notion)
```

### The V1 check — detail

#### Inactive billable users

- **GraphQL:**
  ```graphql
  query InactiveUsers($after: String) {
    users(first: 250, after: $after, includeArchived: false) {
      nodes {
        id name displayName email active admin lastSeenAt createdAt
      }
      pageInfo { hasNextPage endCursor }
    }
  }
  ```
- **Pagination:** Linear caps `first` at 250. Iterate with `pageInfo.endCursor` until `hasNextPage = false`. Hard cap at 1000 users (4 pages) for safety.
- **Detection:** `active === true` AND (`lastSeenAt === null` OR `lastSeenAt < (today - inactivityDays)`)
- **Output:** one finding per match
  - `currentValue`: per-user plan price
  - `potentialSavings`: per-user plan price
  - `evidence`: `[user.id]`
  - `action`: `"User <email> hasn't logged into Linear in <N> days. Set them to inactive (Settings → Members → suspend) to free the seat."`
  - `severity`: assigned by aggregator; per-user findings will land in low/medium since prices are <$25/user/mo by themselves. The aggregate $-total drives critical/high reporting.

### Severity assignment

Same ladder as all prior integrations:

```javascript
function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null  // drop the finding
}
```

Per-user findings will mostly be `low` (single seat = $8–$25). The summary's `totalPotentialSavings` is what matters for the customer dashboard.

### Auth model

**Customer creates an OAuth application in Linear:**
1. Linear → Settings → Account → API → "Create new" under OAuth applications
2. Name "Efficyon Cost Analyzer"
3. Redirect URI: `http://localhost:4000/api/integrations/linear/callback` (production: substitute deployed host)
4. Copy Client ID + Client Secret
5. Paste both into Efficyon's connect form

**OAuth flow:**
- Authorize URL: `https://linear.app/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=read&state=...&actor=user`
- Token exchange: `POST https://api.linear.app/oauth/token` with form-encoded `grant_type, code, redirect_uri, client_id, client_secret`
- Returns: `access_token`, `refresh_token`, `expires_in` (~10 hours), `token_type: "Bearer"`, `scope`

**Required OAuth scope:** `read` (single read scope covers the `users` query; nothing else needed for V1)

**Token refresh:** when cached access token within 5 min of expiry, POST to `/oauth/token` with `grant_type=refresh_token`. Same in-process token cache pattern as Salesforce.

**Storage in `company_integrations.settings`:**
- `client_id_encrypted`
- `client_secret_encrypted`
- `access_token_encrypted`
- `refresh_token_encrypted`
- `plan_tier` — `"standard" | "plus" | "enterprise"`
- `workspace_id` — captured at OAuth callback (Linear's organization id)
- `workspace_name` — captured at OAuth callback
- `workspace_url_key` — for deep links
- `last_validated_at`

### Connect form

```typescript
authType: "oauth"
authFields: [
  { name: "consumerKey",    label: "Linear OAuth Client ID",     type: "text",     required: true,  hint: "From Settings → API → OAuth applications → your app" },
  { name: "consumerSecret", label: "Linear OAuth Client Secret", type: "password", required: true },
  { name: "planTier",       label: "Plan Tier",                   type: "select",   required: true,
    options: [
      { value: "standard",   label: "Standard ($8/user/mo)" },
      { value: "plus",       label: "Plus ($14/user/mo)" },
      { value: "enterprise", label: "Enterprise ($25/user/mo default)" },
    ],
  },
]
oauthStartEndpoint: "/api/integrations/linear/oauth/start"
quickSetup: {
  title: "How to create a Linear OAuth application",
  steps: [
    "Open Linear → Settings → Account → API",
    "Under 'OAuth applications', click 'Create new'",
    "Name: 'Efficyon Cost Analyzer'. Redirect URI: http://localhost:4000/api/integrations/linear/callback (use prod URL when deploying)",
    "Scope: read",
    "Save. Copy the Client ID + Client Secret from the app's page",
    "Paste them above along with your plan tier, then click Connect",
  ],
}
```

### Token revocation

`tokenRevocation.automated: false` — Linear doesn't expose a public revoke-by-token endpoint. Manual-steps note: *"To revoke access: Linear → Settings → Account → API → OAuth applications → 'Efficyon Cost Analyzer' → Revoke. Or delete the OAuth app entirely from the same page."*

### Routes

```
GET    /api/integrations/linear/oauth/start    requireAuth + requireRole("owner","editor")           Build authorize URL with base64-encoded JSON state
GET    /api/integrations/linear/callback       (no auth — Linear's browser redirect)                 Exchange code for tokens, persist, redirect to dashboard
POST   /api/integrations/linear/validate       requireAuth + requireRole("owner","editor")           Manual re-validate
GET    /api/integrations/linear/status         requireAuth + requireRole("owner","editor","viewer")  Connection metadata
GET    /api/integrations/linear/users          requireAuth + requireRole("owner","editor","viewer")  Workspace user list for Data tab
POST   /api/integrations/linear/cost-leaks     requireAuth + requireRole("owner","editor")           Run analysis
DELETE /api/integrations/linear                requireAuth + requireRole("owner","editor")           Disconnect
```

The callback route is the only one without `requireAuth` — same OAuth-redirect rationale as Salesforce / Notion. State parameter is base64-encoded JSON `{ company_id, integration_id }` matching the codebase pattern.

### Error handling

| Failure | Response |
|---|---|
| Bad client_id/client_secret on token exchange | 400 with hint about re-checking OAuth app credentials |
| Customer denies consent | redirect to `/dashboard/tools?linear_consent=denied` |
| Refresh token revoked / expired | 401 with `code: "linear_credentials_revoked"`, message "Linear credentials revoked — please reconnect" |
| GraphQL 401 (token rejected) | 401 + reconnect hint |
| GraphQL 429 (rate limit) | 503 with retry-after suggestion |
| Single check throws | partial findings + `warnings: [{ check, error }]`; analysis still saved |

### Frontend behavior

- **Data tab (`linear-view.tsx`):**
  - **Workspace info** — name, URL key (deep link), plan tier, total members, active members, admin count, last validated
  - **Members table** — name, email, admin flag, active flag, last seen (formatted relative date)
- **Analysis tab:** uses shared `analysis-tab.tsx`. Inactivity dropdown via `analysisSupportsInactivity: true` (30 / 60 / 90 / 180)
- **History tab:** shared `history-tab.tsx`
- **Brand color:** `#5E6AD2` (Linear's purple)

### Storage shape

Reuses existing `cost_leak_analyses` row format. Migration `051_linear_provider.sql` only extends the provider CHECK to include `'Linear'`.

```jsonb
summary: {
  totalFindings: 12,
  totalCurrentValue: 168,
  totalPotentialSavings: 168,
  healthScore: 76,
  criticalSeverity: 0,
  highSeverity: 1,
  mediumSeverity: 0,
  lowSeverity: 11,
  pricingNote: "Savings shown at Linear list price. Standard $8, Plus $14, Enterprise $25 (default — varies). Apply your negotiated discount for actual recovery.",
  activeUserCount: 50,
  totalUserCount: 62
}
analysis_data: {
  findings: [
    {
      check: "inactive_user",
      title: "Inactive Linear user: alice@acme.com",
      severity: "low",
      currency: "USD",
      currentValue: 14,
      potentialSavings: 14,
      evidence: ["user-uuid"],
      action: "User alice@acme.com hasn't logged into Linear in 87 days. Set them to inactive (Settings → Members → suspend) to free the seat.",
    },
    ...
  ],
  warnings: [],
  parameters: { inactivityDays: 60 },
  workspace: { id, name, url_key, plan_tier }
}
```

### Pricing constants (`linearPricing.js`)

```javascript
// Linear's published list prices in USD/user/mo (annual billing).
// Customers typically negotiate 10–20% discounts on Plus and 30%+ on Enterprise.
// Update annually.

const PLAN_PRICES = {
  standard:   8,   // $8/user/mo (annual; $10 monthly)
  plus:      14,   // $14/user/mo (annual; $19 monthly)
  enterprise: 25,  // $25/user/mo default — highly negotiated
}

function resolvePlanPrice(planTier) {
  if (!planTier) return 0
  return PLAN_PRICES[planTier.toLowerCase()] || 0
}

const PRICING_NOTE =
  "Savings shown at Linear list price. Standard $8, Plus $14, Enterprise $25 (default — varies). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { PLAN_PRICES, resolvePlanPrice, PRICING_NOTE }
```

### Out of scope V1 (deferred V2)

- Bot/integration user detection (Linear's bot semantics need workspace-specific tuning)
- Admin over-permissioning audit (security finding, not directly cost)
- Plan tier downgrade candidates (requires per-customer pricing input + feature usage analysis)
- Guest billing audit (Plus+ only; uncommon)
- Workspace consolidation findings (multi-workspace orgs)
- Inbox+ add-on tracking
- Background scheduled syncs

## Testing

Per CLAUDE.md no test runner. Verification is manual against a real Linear workspace.

Plan:
1. Use an existing Linear workspace (free Standard tier sign-up at linear.app works)
2. Settings → Account → API → Create OAuth application
3. Configure with redirect URI per the connect-form quickSetup
4. Connect via Efficyon
5. Run analysis with default 60-day inactivity
6. Verify findings render: members who haven't logged in lately appear with severity badges
7. Verify error paths: bad client_id, denied consent, manually revoked OAuth app

## Open questions before implementation

None — all decisions resolved.

## Implementation order (rough)

1. SQL migration `051_linear_provider.sql` (apply via Supabase MCP)
2. `linearPricing.js` constants
3. `linearAuth.js` — OAuth code exchange, refresh, encryption, GraphQL helper, paginated users pull
4. `linearController.js` skeleton — oauth/start, callback, validate, status, disconnect
5. Wire connect/oauth/status routes; manual end-to-end OAuth dance verification
6. Frontend `linear.ts` config + placeholder view + registry entry
7. (USER) Manual verification of full connect flow with a real Linear workspace
8. Data endpoint (`/users`) + filled-in `linear-view.tsx`
9. The single check module
10. Aggregator + `/cost-leaks` endpoint + History tab integration
11. Setup-guide page section + brand logo + reference doc
12. (USER) End-to-end manual verification with seeded inactive users
