# Atlassian Integration — Design Spec

- **Date:** 2026-05-04
- **Topic:** Atlassian (Jira Software + Confluence) cost-leak integration (V1: inactive users + cross-product dual-seat overlap)
- **Status:** Design ready; ready for implementation plan

## Summary

Add Atlassian as Efficyon's 20th integration covering **both Jira Software and Confluence** under a single connection. The customer creates an OAuth 2.0 (3LO) app in Atlassian Developer Console, copies the Client ID + Secret, connects via Efficyon's standard OAuth flow, and supplies their per-product per-seat cost. Efficyon pulls users from each Cloud site, cross-references by `accountId` (Atlassian's unified user identifier), and runs three checks: inactive Jira users, inactive Confluence users, and the killer cross-product check — users paying for both Jira + Confluence seats but only active in one.

V1 is scoped wider than Linear (3 checks vs 1) because Atlassian's per-product seat billing model produces a uniquely high-leverage finding (`single_product_dual_seat`) that doesn't exist for single-product tools. Each Jira+Confluence dual-seat user is ~$13.80/user/mo at Standard tier — material on any team of 50+.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **V1 scope:** THREE checks — `inactive_jira_user`, `inactive_confluence_user`, `single_product_dual_seat` |
| 2 | **Products covered:** Jira Software + Confluence (Cloud only). Jira Service Management, Bitbucket Cloud, Compass = V2 |
| 3 | **Auth:** customer-managed Atlassian OAuth 2.0 (3LO) app; web-server flow with refresh tokens |
| 4 | **Org admin install required.** `lastActiveDate` per product comes from the Org Directory API which needs the `read:directory:admin-atlassian` scope. Fail loud if not granted — no degraded mode in V1 |
| 5 | **Customer-supplied at connect:** `jiraSeatCostUsd`, `confluenceSeatCostUsd`. Tier guidance shown but not auto-detected |
| 6 | **Inactivity window:** user-selectable 30 / 60 / 90 / 180 days, default 60 (matches Linear) |
| 7 | **Pricing:** customer-supplied per-product (`atlassianPricing.js` only holds tier-guidance constants for the connect form). Documented `pricingNote` about tiered/negotiated pricing |
| 8 | **Severity ladder:** ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — consistent with everything else |
| 9 | **Storage:** reuse `cost_leak_analyses`; migration `052_atlassian_provider.sql` extends provider CHECK |
| 10 | **Trigger:** on-demand only (no scheduler) |
| 11 | **API:** REST. Org Directory API at `https://api.atlassian.com/admin/v1/orgs/{orgId}/directory/users` (paginated). Site-list at `/oauth/token/accessible-resources` |
| 12 | **Multi-site:** sync ALL accessible Cloud sites for the authorized org and aggregate findings under one integration row. Site-selection UI deferred |

## Why this shape

- **Both products under one integration.** Atlassian Cloud uses a unified `accountId` per org, so cross-referencing is trivial. The `single_product_dual_seat` finding is *only* possible when both products are connected together — splitting Jira and Confluence into separate integrations would lose the most differentiated finding.
- **Org admin install over degraded mode.** `lastActiveDate` is the entire signal for inactive-user detection. Without it the checks reduce to "find deactivated users still in groups" — a weak shadow of the real product. Customers buying a FinOps tool already grant org-admin scopes to similar products; a clear "needs Atlassian Org Admin" message is better than a soft-degraded experience that produces low-quality findings.
- **Three checks, not one.** Linear shipped V1 with one check because per-user pricing made even a single inactive user a real dollar finding. Atlassian's pricing is similar per-seat, but the dual-seat overlap is unique to multi-product tools and produces compound dollar findings (one user can save you ~$13.80/mo by itself when both products are in play). Worth the extra check.
- **Customer-supplied per-seat pricing.** Atlassian's pricing is sliding-scale per user count and varies by tier (Standard/Premium) and frequency (annual/monthly). Auto-detection via the billing API requires additional scopes and produces brittle results. Match Linear's pattern: ask the customer at connect time, document the list-price ranges as guidance.
- **Reuse `cost_leak_analyses`.** Same logic as every prior integration. JSONB schema absorbs Atlassian findings cleanly; only schema change is the provider CHECK extension.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ atlassianAuth.js                          OAuth code/refresh exchange + encryption + REST helper + accessible-resources lookup + paginated org directory pull
├─ services/
│  ├─ atlassianPricing.js                       Tier-guidance constants + PRICING_NOTE
│  ├─ atlassianCostLeakAnalysis.js              Aggregator + the three checks
│  └─ atlassianChecks/
│     ├─ inactiveJiraUser.js                    Check #1
│     ├─ inactiveConfluenceUser.js              Check #2
│     └─ singleProductDualSeat.js               Check #3
├─ controllers/
│  └─ atlassianController.js                    oauth/start, callback, validate, status, users, cost-leaks, disconnect
└─ sql/
   └─ 052_atlassian_provider.sql                Extends valid_provider CHECK to include 'Atlassian'
```

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/
│  └─ atlassian.ts                              UnifiedToolConfig — oauth + per-product cost inputs + analysisSupportsInactivity
└─ components/tools/
   └─ atlassian-view.tsx                        Data tab — org info + sites + members table with per-product license + lastActiveDate
```

**Wiring**

- `frontend/lib/tools/registry.ts` — register `atlassianConfig`
- `backend/src/routes/index.js` — register 7 controller routes
- `frontend/app/dashboard/tools/guide/page.tsx` — add Atlassian setup walkthrough
- `frontend/components/tools/tool-logos.tsx` — add Atlassian brand mark
- `docs/tool-analysis-reference.md` — add Atlassian entry

### Data flow

```
User clicks Connect Atlassian → fills connect form (clientId, clientSecret, jiraSeatCostUsd, confluenceSeatCostUsd)
  → POST /api/integrations { _pending_atlassian_creds, jira_seat_cost_usd, confluence_seat_cost_usd }
  → frontend hits GET /api/integrations/atlassian/oauth/start
  → backend builds authorize URL with state token + admin scopes, redirects browser
  → user approves on Atlassian (must be org admin) → Atlassian redirects to /api/integrations/atlassian/callback?code=...&state=...
  → backend verifies state, exchanges code for tokens via POST https://auth.atlassian.com/oauth/token
  → calls GET /oauth/token/accessible-resources — captures cloudId(s) and orgId
  → encrypts access_token + refresh_token at rest along with org/site metadata
  → flips status to "connected"; redirects to dashboard

Later: User clicks "Run Analysis" with chosen inactivity window
  → POST /api/integrations/atlassian/cost-leaks { inactivityDays }
  → controller: lookup, status check, 5-min duplicate-check
  → service: refresh access token if needed
  →   pull org directory users (one paginated call to admin/v1/orgs/{orgId}/directory/users)
  →   each user record carries productAccess[] with per-product lastActive
  →   run the three checks against the unified user list
  → aggregator: severity, drop zero, sort by potentialSavings desc
  → returns { findings, summary, warnings, parameters: { inactivityDays } }
  → frontend persists via /api/analysis-history
```

### The V1 checks — detail

#### Check 1: `inactive_jira_user`

- **Signal:** user has Jira Software product access AND `productAccess[where=jira-software].lastActive` is `null` OR older than `(today - inactivityDays)`. User must be `active === true` (not already deactivated — that's a different finding for V2).
- **Output:** one finding per match
  - `currentValue`: `jiraSeatCostUsd`
  - `potentialSavings`: `jiraSeatCostUsd`
  - `evidence`: `[user.account_id]`
  - `action`: `"User <email> hasn't used Jira in <N> days. Remove from jira-software-users group (Atlassian Admin → Groups) to free the seat."`

#### Check 2: `inactive_confluence_user`

- **Signal:** same shape, but for Confluence's `productAccess` entry.
- **Output:**
  - `currentValue`: `confluenceSeatCostUsd`
  - `potentialSavings`: `confluenceSeatCostUsd`
  - `action`: `"User <email> hasn't used Confluence in <N> days. Remove from confluence-users group to free the seat."`

#### Check 3: `single_product_dual_seat`

- **Signal:** user has BOTH `jira-software` and `confluence` in `productAccess[]`, AND only one product's `lastActive` is within the inactivity window. The OTHER product's seat is the savings.
- **Edge case:** if neither product was used, that user gets surfaced by checks 1 and 2 separately (combined savings == both seats). Don't double-count by also returning a `single_product_dual_seat` finding for them — gate this check on "exactly one of the two is active in window."
- **Output:**
  - `currentValue`: cost of the unused product seat
  - `potentialSavings`: cost of the unused product seat
  - `evidence`: `[user.account_id]`
  - `action`: `"User <email> uses <ActiveProduct> but hasn't touched <UnusedProduct> in <N> days. Remove them from <unused-product-group> — keep the active license."`

### Severity assignment

Same ladder as all prior integrations:

```javascript
function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}
```

Per-user findings will mostly be `low` (single seat = $6–$15 at Standard, ~$11–$15 at Premium). Aggregate `totalPotentialSavings` is the customer-facing headline.

### Auth model

**Customer creates an OAuth 2.0 (3LO) app in Atlassian Developer Console:**

1. Open https://developer.atlassian.com/console/myapps/
2. Click "Create" → "OAuth 2.0 integration"
3. Name: "Efficyon Cost Analyzer"
4. **Permissions** — add the following APIs:
   - **Jira API:** `read:jira-user`
   - **Confluence API:** `read:confluence-user.summary`
   - **User identity API:** `read:account`
   - **Org Admin API:** `read:directory:admin-atlassian` (THIS IS THE CRITICAL ONE)
5. **Authorization** → set Callback URL: `http://localhost:4000/api/integrations/atlassian/callback` (substitute production host on deploy)
6. Settings → Distribution → "Sharing" set to enabled (required for 3LO)
7. Copy Client ID + Client Secret
8. Paste both into Efficyon's connect form along with per-product seat costs

**OAuth flow:**

- Authorize URL: `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=...&scope=read:jira-user%20read:confluence-user.summary%20read:account%20read:directory:admin-atlassian%20offline_access&redirect_uri=...&state=...&response_type=code&prompt=consent`
- Token exchange: `POST https://auth.atlassian.com/oauth/token` with JSON body `{ grant_type, code, redirect_uri, client_id, client_secret }`
- Returns: `access_token` (~1 hour), `refresh_token`, `expires_in`, `token_type: "Bearer"`, `scope`

**Required scopes (V1):**

| Scope | Purpose |
|---|---|
| `read:jira-user` | List Jira users on a Cloud site |
| `read:confluence-user.summary` | List Confluence users on a Cloud site |
| `read:account` | Read connecting user's account info (used to confirm org-admin status during validate) |
| `read:directory:admin-atlassian` | Org Directory API — `lastActive` per product per user |
| `offline_access` | Issue refresh token |

**Token refresh:** when cached access token within 5 min of expiry, POST to `/oauth/token` with `grant_type=refresh_token`. Same in-process token cache pattern as Salesforce / Linear.

**Org / site discovery:**
- After token exchange: `GET https://api.atlassian.com/oauth/token/accessible-resources`
- Returns array of `{ id (cloudId), name, url, scopes, avatarUrl }` — one per Cloud site the user authorized.
- For org-level admin API, fetch `GET https://api.atlassian.com/admin/v1/orgs` to find the org id matching the connected user.

**Storage in `company_integrations.settings`:**

- `client_id_encrypted`
- `client_secret_encrypted`
- `access_token_encrypted`
- `refresh_token_encrypted`
- `org_id` — Atlassian Cloud organization id (used for Org Directory API)
- `org_name` — display
- `cloud_sites` — array of `{ cloudId, name, url }` snapshots from accessible-resources
- `jira_seat_cost_usd` — number, customer-supplied
- `confluence_seat_cost_usd` — number, customer-supplied
- `last_validated_at`

### Connect form

```typescript
authType: "oauth"
authFields: [
  { name: "consumerKey",    label: "Atlassian OAuth Client ID",     type: "text",     required: true,  hint: "From developer.atlassian.com/console/myapps/ → your OAuth 2.0 integration" },
  { name: "consumerSecret", label: "Atlassian OAuth Client Secret", type: "password", required: true },
  { name: "jiraSeatCostUsd",       label: "Jira Software seat cost (USD/user/mo)",  type: "number", required: true,
    hint: "Standard ~$7.75, Premium ~$15.25 (annual). Enter your actual per-seat rate." },
  { name: "confluenceSeatCostUsd", label: "Confluence seat cost (USD/user/mo)",     type: "number", required: true,
    hint: "Standard ~$6.05, Premium ~$11.55 (annual). Enter your actual per-seat rate." },
]
oauthStartEndpoint: "/api/integrations/atlassian/oauth/start"
quickSetup: {
  title: "How to create an Atlassian OAuth integration",
  steps: [
    "Open developer.atlassian.com/console/myapps/ → Create → OAuth 2.0 integration",
    "Name: 'Efficyon Cost Analyzer'",
    "Permissions: add Jira API (read:jira-user), Confluence API (read:confluence-user.summary), User identity API (read:account), Org Admin API (read:directory:admin-atlassian)",
    "Authorization → set Callback URL: http://localhost:4000/api/integrations/atlassian/callback (use production host when deployed)",
    "Settings → Distribution → set Sharing to enabled",
    "Copy the Client ID + Secret from the Settings page",
    "Paste them above with your per-product seat costs and click Connect",
    "On the Atlassian consent screen you must be signed in as an Atlassian Cloud Org Admin",
  ],
  warning: "An Atlassian Cloud Organization Admin must approve the install — this is required for the Org Directory API that surfaces last-active dates per product. Non-admin installs will be rejected at validate-time.",
}
```

### Token revocation

`tokenRevocation.automated: true` — Atlassian exposes a revoke endpoint at `POST https://auth.atlassian.com/oauth/token/revoke`. Call on disconnect with the refresh token. Manual fallback note: *"To revoke access manually: developer.atlassian.com/console/myapps/ → 'Efficyon Cost Analyzer' → Delete. Or admin.atlassian.com → Settings → Connected apps → revoke."*

### Routes

```
GET    /api/integrations/atlassian/oauth/start  requireAuth + requireRole("owner","editor")           Build authorize URL with admin scope set + base64-encoded JSON state
GET    /api/integrations/atlassian/callback     (no auth — Atlassian's browser redirect)              Exchange code for tokens, fetch accessible-resources + orgs, persist, redirect
POST   /api/integrations/atlassian/validate     requireAuth + requireRole("owner","editor")           Manual re-validate; confirm read:directory:admin-atlassian still in granted scope
GET    /api/integrations/atlassian/status       requireAuth + requireRole("owner","editor","viewer")  Connection metadata
GET    /api/integrations/atlassian/users        requireAuth + requireRole("owner","editor","viewer")  Org user list with productAccess + lastActive (Data tab)
POST   /api/integrations/atlassian/cost-leaks   requireAuth + requireRole("owner","editor")           Run the 3 checks
DELETE /api/integrations/atlassian               requireAuth + requireRole("owner","editor")           Disconnect; call revoke endpoint best-effort
```

The callback route is the only one without `requireAuth` — same OAuth-redirect rationale as Linear / Salesforce / Notion. State parameter is base64-encoded JSON `{ company_id, integration_id }`.

### Error handling

| Failure | Response |
|---|---|
| Bad client_id/client_secret on token exchange | 400 with hint about re-checking OAuth app credentials |
| Customer denies consent | redirect to `/dashboard/tools?atlassian_consent=denied` |
| Granted scopes missing `read:directory:admin-atlassian` (non-admin install) | 403 with `code: "atlassian_org_admin_required"`, message "Atlassian Cloud Org Admin permission required — please reconnect with an org admin account" + link to docs |
| No Cloud sites accessible | 400 with `code: "atlassian_no_sites"` |
| Refresh token revoked / expired | 401 with `code: "atlassian_credentials_revoked"`, message "Atlassian credentials revoked — please reconnect" |
| Org Directory API 401 (token rejected) | 401 + reconnect hint |
| Org Directory API 403 (insufficient scope) | 403 with `atlassian_org_admin_required` |
| Org Directory API 429 (rate limit) | 503 with retry-after suggestion |
| Single check throws | partial findings + `warnings: [{ check, error }]`; analysis still saved |

### Frontend behavior

- **Data tab (`atlassian-view.tsx`):**
  - **Org info** — name, accessible Cloud sites (count + list), per-product seat cost shown back to user, total members, active members, last validated
  - **Members table** — name, email, account status (active/inactive), per-product license badges (Jira / Confluence), last-active per product (relative), admin flag
- **Analysis tab:** uses shared `analysis-tab.tsx`. Inactivity dropdown via `analysisSupportsInactivity: true` (30 / 60 / 90 / 180)
- **History tab:** shared `history-tab.tsx`
- **Brand color:** `#0052CC` (Atlassian blue)

### Storage shape

Reuses existing `cost_leak_analyses` row format. Migration `052_atlassian_provider.sql` only extends the provider CHECK to include `'Atlassian'`.

```jsonb
summary: {
  totalFindings: 18,
  totalCurrentValue: 207.20,
  totalPotentialSavings: 207.20,
  healthScore: 64,
  criticalSeverity: 0,
  highSeverity: 1,
  mediumSeverity: 2,
  lowSeverity: 15,
  pricingNote: "Savings shown at the per-seat costs you entered. Atlassian's published list-price guidance: Jira Software Standard ~$7.75 / Premium ~$15.25, Confluence Standard ~$6.05 / Premium ~$11.55 per user/mo (annual). Apply your negotiated discount for actual recovery.",
  jiraActiveUserCount: 42,
  confluenceActiveUserCount: 38,
  totalUserCount: 56,
  cloudSiteCount: 2,
}
analysis_data: {
  findings: [
    {
      check: "single_product_dual_seat",
      title: "Dual-seat overlap: alice@acme.com",
      severity: "low",
      currency: "USD",
      currentValue: 6.05,
      potentialSavings: 6.05,
      evidence: ["accountId:557058:abc-..."],
      action: "User alice@acme.com uses Jira but hasn't touched Confluence in 87 days. Remove them from confluence-users — keep their Jira license.",
    },
    {
      check: "inactive_jira_user",
      title: "Inactive Jira user: bob@acme.com",
      severity: "low",
      currency: "USD",
      currentValue: 7.75,
      potentialSavings: 7.75,
      evidence: ["accountId:557058:def-..."],
      action: "User bob@acme.com hasn't used Jira in 124 days. Remove from jira-software-users group to free the seat.",
    },
    ...
  ],
  warnings: [],
  parameters: { inactivityDays: 60 },
  org: { id, name, cloud_sites: [...] }
}
```

### Pricing constants (`atlassianPricing.js`)

```javascript
// Atlassian Cloud published list-price guidance in USD/user/mo (annual billing).
// Pricing is sliding-scale by user count and varies between Standard / Premium tiers.
// We capture the most-common mid-band defaults here as connect-form hints only —
// the analysis uses the per-product cost the customer enters at connect time.

const TIER_GUIDANCE = {
  jira: {
    standard: 7.75,
    premium:  15.25,
  },
  confluence: {
    standard: 6.05,
    premium:  11.55,
  },
}

const PRICING_NOTE =
  "Savings shown at the per-seat costs you entered. Atlassian's published list-price guidance: " +
  "Jira Software Standard ~$7.75 / Premium ~$15.25, Confluence Standard ~$6.05 / Premium ~$11.55 " +
  "per user/mo (annual). Apply your negotiated discount for actual recovery."

module.exports = { TIER_GUIDANCE, PRICING_NOTE }
```

### Out of scope V1 (deferred V2)

- Jira Service Management seat optimization (separate license, separate pricing tier — needs `read:jira-service-management-user` scope)
- Bitbucket Cloud integration (separate billing / API)
- Compass / Atlas integration
- Premium-tier-feature-utilization check ("you're on Premium but no one uses sandboxes / advanced roadmaps")
- Plan tier downgrade candidates (requires per-tier feature usage analysis)
- Multi-org support (one Atlassian Cloud account = one connection in V1)
- Per-site cost-center tagging (multi-site orgs aggregate today)
- Free tier auto-detection short-circuit (Atlassian Free is ≤10 users, no per-seat cost)
- Deactivated-but-still-licensed cleanup finding (security/process finding rather than direct-cost — V2)
- External / customer-portal users on full seats (Service Management only)
- Background scheduled syncs

## Testing

Per CLAUDE.md no test runner. Verification is manual against a real Atlassian Cloud org.

Plan:
1. Use a Free Atlassian Cloud org for the dev plumbing — `<workspace>.atlassian.net` is free for ≤10 users. Note: Free tier won't surface dollar findings (no per-seat cost), so production-style verification needs a Standard org.
2. developer.atlassian.com/console/myapps/ → create OAuth 2.0 integration with the four required scopes
3. Configure callback URL per the connect-form quickSetup
4. Connect via Efficyon as the Org Admin
5. Manually deactivate a user / leave one inactive in Jira but active in Confluence (or vice-versa) to seed the dual-seat overlap check
6. Run analysis with default 60-day inactivity
7. Verify findings: inactive Jira/Confluence users, dual-seat overlaps render with severity badges
8. Verify error paths:
   - Bad client_id
   - Denied consent
   - Manually revoke OAuth app from Atlassian
   - Connect as a non-admin user → should fail at validate with `atlassian_org_admin_required`
9. Verify token refresh: artificially expire access token, re-run analysis, confirm refresh succeeds
10. Verify disconnect calls revoke endpoint and clears settings

## Open questions before implementation

None — all decisions resolved.

## Implementation order (rough)

1. SQL migration `052_atlassian_provider.sql` (apply via Supabase MCP)
2. `atlassianPricing.js` constants
3. `atlassianAuth.js` — OAuth code exchange, refresh, encryption, REST helper, accessible-resources lookup, paginated org directory pull
4. `atlassianController.js` skeleton — oauth/start, callback, validate, status, disconnect
5. Wire connect/oauth/status routes; manual end-to-end OAuth dance verification
6. Frontend `atlassian.ts` config + placeholder view + registry entry
7. (USER) Manual verification of full connect flow with a real Atlassian Cloud org admin account
8. Data endpoint (`/users`) + filled-in `atlassian-view.tsx`
9. The three check modules (parallel — they're independent)
10. Aggregator + `/cost-leaks` endpoint + History tab integration
11. Setup-guide page section + brand logo + reference doc
12. (USER) End-to-end manual verification with seeded inactive + dual-seat-overlap users
