# monday.com Integration — V1 Design Spec

**Date:** 2026-05-05
**Status:** Approved (brainstorming)
**Predecessor:** Atlassian integration (merged 2026-05-05 in commit `8f042a9`) — this spec mirrors that template.

## Goal

Add monday.com as a cost-leak integration (provider name `monday`). Detect 5 categories of recoverable spend and surface them through the standard dashboard tool flow (connect → OAuth → directory pull → cost-leak analysis → save to `cost_leak_analyses`).

## Why monday.com matters

monday.com bills seats in **fixed tiers** (3 / 5 / 10 / 15 / 20 / 25 / 30 / 40 / 50 / 100 / 200 / 500 / 1000). A customer with a 10-seat Pro plan and 7 active members is paying for 3 unused seats — **and** can drop to the 5-seat tier (~$57/mo recoverable on Pro). This tier-step model is the integration's signature value proposition; no existing integration covers it.

## Architecture

Mirror the Atlassian template exactly. Same shape, swapping REST for GraphQL:

```
backend/src/utils/mondayAuth.js                    ← OAuth + GraphQL helper + directory pull
backend/src/controllers/mondayController.js        ← oauth/start, callback, validate, status, disconnect, /users, /cost-leaks
backend/src/services/mondayChecks/                 ← 5 check modules
  ├─ inactiveUser.js
  ├─ seatTierOverprovisioning.js
  ├─ disabledUser.js
  ├─ pendingInvite.js
  └─ viewOnlyMember.js
backend/src/services/mondayCostLeakAnalysis.js     ← aggregator, severity ladder, summary
backend/src/services/mondayPricing.js              ← plan rates + seat-tier ladder helpers
backend/sql/053_monday_provider.sql                ← add 'monday' to cost_leak_analyses.valid_provider
frontend/lib/tools/configs/monday.ts               ← UnifiedToolConfig
frontend/components/tools/monday-view.tsx          ← members data tab
frontend/lib/tools/registry.ts                     ← register
frontend/components/tools/tool-logos.tsx           ← logo entry
frontend/app/dashboard/tools/guide/page.tsx        ← setup-guide section
```

`backend/src/routes/index.js` gets the new monday routes wired with `requireAuth + requireRole("owner", "editor", "viewer")` (callback excluded — Atlassian pattern, since the browser redirect can't carry the session JWT).

## Auth model — per-customer OAuth (mirrors Atlassian/Linear/Notion/Salesforce)

The customer creates their own OAuth app in the monday.com developer center. Efficyon does **not** host a single global OAuth app for monday.com. The customer pastes Client ID + Secret + their per-seat costs in the connect form.

### OAuth endpoints
- Authorize: `https://auth.monday.com/oauth2/authorize`
- Token: `https://auth.monday.com/oauth2/token` (form-encoded body)

### Scopes (request all, mark `me:read` as required minimum)
- `me:read` — identify the connecting user
- `users:read` — directory + `last_activity`
- `account:read` — plan tier + `max_users` (seat tier)
- `boards:read` — needed for view-only / activity nuance
- `updates:read` — activity-log fallback (only used if `last_activity` null)

### Connect-form fields (`frontend/lib/tools/configs/monday.ts`)
- Client ID (text, required)
- Client Secret (password, required)
- Per-seat cost USD/user/mo (text, required) — single field; monday is single-product so no Jira/Confluence split

Plan tier is **detected** from the OAuth-authenticated `account.plan.tier` GraphQL field — no need to ask the customer. Captured into `integration.settings.plan_tier` during validate/callback.

The form stores `_pending_monday_creds` in `company_integrations.settings`; first call to `/oauth/start` upgrades it to encrypted creds (`client_id_encrypted`, `client_secret_encrypted`) — same pattern as Atlassian (`atlassianController.js:103-128`).

### Token storage
- `access_token_encrypted`, `refresh_token_encrypted` in `company_integrations.settings`
- In-process token cache keyed by `integration.id`, with `REFRESH_BUFFER_MS = 5 * 60 * 1000`
- 401 from API → evict cache → caller re-runs (Atlassian pattern)

## API approach — GraphQL helper

monday.com is GraphQL-only. The helper is `mondayQuery(integration, query, variables)`:

```js
async function mondayQuery(integration, query, variables = {}) {
  const accessToken = await getAccessToken(integration)
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.errors) {
    const err = new Error(body.errors?.[0]?.message || `HTTP ${res.status}`)
    err.code = "MONDAY_REQUEST_FAILED"
    err.httpStatus = res.status
    err.mondayBody = body
    throw err
  }
  return body.data
}
```

### Directory pull (`fetchUsersAndPlan`)

Single GraphQL query pulling everything needed for all 5 checks:

```graphql
query {
  users(limit: 1000) {
    id
    name
    email
    enabled
    is_pending
    is_view_only
    is_guest
    is_admin
    last_activity
    join_date
  }
  account {
    id
    name
    slug
    plan {
      max_users
      tier
      version
      period
    }
  }
}
```

Cap at 1000 users for V1 (matches Atlassian's `cap = 5000` shape — monday's smaller default still covers ~all real-world orgs). If response indicates more, log a warning; do not paginate in V1.

### `mapDirectoryUser` (normalizer)

```js
{
  id, name, email,
  enabled,            // boolean
  isPending,          // boolean
  isViewOnly,         // boolean
  isGuest,            // boolean
  isAdmin,            // boolean
  lastActivity,       // ISO string | null
  joinDate,           // ISO string | null
}
```

## Pricing reference (`mondayPricing.js`)

```js
// USD/seat/mo, billed annually. Per-seat cost the CUSTOMER enters in the
// connect form drives the analysis math; these constants are tier-guidance
// + form hints + dashboard pricing note. Update annually.
const TIER_GUIDANCE = {
  basic:      { usdPerSeatMonthly: 9 },
  standard:   { usdPerSeatMonthly: 12 },
  pro:        { usdPerSeatMonthly: 19 },
  enterprise: { usdPerSeatMonthly: null }, // custom
}

// monday.com bills in fixed seat tiers. Order matters — sorted ascending.
const SEAT_TIERS = [3, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 500, 1000]

// Given current max_users (the tier they're on) and active count, return the
// next-lower tier that still fits active users. Returns null if no downgrade.
function nextLowerTier(currentTier, activeCount) {
  const idx = SEAT_TIERS.indexOf(currentTier)
  if (idx <= 0) return null
  for (let i = idx - 1; i >= 0; i--) {
    if (SEAT_TIERS[i] >= activeCount) return SEAT_TIERS[i]
  }
  return null
}

const PRICING_NOTE =
  "Savings shown at the per-seat cost you entered. monday.com list prices: " +
  "Basic ~$9, Standard ~$12, Pro ~$19/seat/mo (annual). Seats bill in fixed " +
  "tiers (3/5/10/15/20/25/30/40/50/100/200/500/1000) — downgrading mid-tier " +
  "captures the next-step delta. Apply your negotiated discount for actual recovery."
```

## Check logic

All checks consume `{ users, settings, account }` and return `{ findings: [] }`. Severity is assigned by the aggregator using the standard ladder (`≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low`).

Each finding has shape:
```js
{
  check, title, currency: "USD",
  currentValue, potentialSavings,
  evidence: [userIdOrTier],
  action: "<concrete remediation step>",
}
```

### 1. `inactiveUser`
**Condition:** `enabled && !isGuest && !isPending && lastActivity != null && lastActivity < now - inactivityDays`
**Recovery:** `seatCost × 12` (annualized — matches Atlassian convention of reporting annual savings)
**Action text:** `"User <email> hasn't logged in for <N> days. Remove from monday.com (Admin → Users → Deactivate) to free the seat."`

### 2. `seatTierOverprovisioning`
**Condition:** `account.plan.max_users > activeCount && nextLowerTier(max_users, activeCount) != null`
where `activeCount = users.filter(u => u.enabled && !u.isGuest && !u.isPending).length`
**Recovery:** `(max_users − nextTier) × seatCost × 12`
**Action text:** `"Plan billed at <max_users> seats but only <activeCount> active members. Drop to the <nextTier>-seat tier (Admin → Billing) to save <seatsFreed> seats × $<seatCost>/mo."`
**Single finding per analysis** (account-level, not per-user).

### 3. `disabledUser`
**Condition:** `!enabled` (still in directory after deactivation)
**Recovery:** `seatCost × 12` per user
**Caveat:** monday.com sometimes keeps disabled users in the directory but they don't bill. Mark this check as **medium-confidence** in the action text and recommend admin verification: `"Disabled user <email> still appears in directory — verify in Admin → Billing whether they're still counted toward seat tier. If yes, fully delete to recover the seat."`

### 4. `pendingInvite`
**Condition:** `isPending && joinDate < now - 14d` (invite sent ≥14 days ago, never accepted)
**Recovery:** `seatCost × 12`
**Action text:** `"Invite to <email> pending for <N> days, never accepted. Cancel from Admin → Users → Pending invites to free the seat."`

### 5. `viewOnlyMember`
**Condition:** `isViewOnly && !isGuest && plan.tier ∈ {"pro", "enterprise"}` (only Pro+ supports unlimited free guests)
**Recovery:** `seatCost × 12` per user (full member rate, since guests are $0 on Pro+)
**Action text:** `"User <email> is view-only on a paid plan. Convert to Guest (Admin → Users → Change to Guest) — Pro/Enterprise allow unlimited free guests."`

## Aggregator (`mondayCostLeakAnalysis.js`)

```js
async function analyzeMondayCostLeaks({ fetchUsersAndPlan, integration, inactivityDays = 60 }) {
  const { users, account } = await fetchUsersAndPlan(integration)
  const settings = integration.settings || {}

  const checks = [
    { name: "inactive_user",                run: () => inactiveUser.check({ users, account, settings, inactivityDays }) },
    { name: "seat_tier_overprovisioning",   run: () => seatTierOverprovisioning.check({ users, account, settings }) },
    { name: "disabled_user",                run: () => disabledUser.check({ users, account, settings }) },
    { name: "pending_invite",               run: () => pendingInvite.check({ users, account, settings }) },
    { name: "view_only_member",             run: () => viewOnlyMember.check({ users, account, settings }) },
  ]
  // Promise.allSettled, severity ladder, sort by potentialSavings desc — same shape as atlassianCostLeakAnalysis.js
}
```

Summary fields (extends standard shape):
```js
{
  totalFindings, totalCurrentValue, totalPotentialSavings, healthScore,
  criticalSeverity, highSeverity, mediumSeverity, lowSeverity,
  pricingNote: PRICING_NOTE,
  totalUserCount, activeUserCount, pendingInviteCount,
  planTier: account.plan.tier,
  seatTier: account.plan.max_users,
  recommendedSeatTier: nextLowerTier(...) ?? account.plan.max_users,
}
```

## Routes

Wire in `backend/src/routes/index.js` (alphabetical near the other integrations):

```js
router.get("/integrations/monday/oauth/start",        requireAuth, requireRole("owner", "editor"), startMondayOAuth)
router.get("/integrations/monday/callback",                                                          mondayOAuthCallback)
router.post("/integrations/monday/validate",          requireAuth, requireRole("owner", "editor"), validateMonday)
router.get("/integrations/monday/status",             requireAuth, requireRole("owner", "editor", "viewer"), getMondayStatus)
router.delete("/integrations/monday",                 requireAuth, requireRole("owner"),            disconnectMonday)
router.get("/integrations/monday/users",              requireAuth, requireRole("owner", "editor", "viewer"), getMondayUsers)
router.get("/integrations/monday/cost-leaks",         requireAuth, requireRole("owner", "editor", "viewer"), analyzeMondayCostLeaksEndpoint)
```

(Match exact role assignments to whatever the Atlassian routes use — verify against `routes/index.js` during implementation.)

## Frontend tool config (`frontend/lib/tools/configs/monday.ts`)

```ts
{
  provider: "monday",
  id: "monday",
  label: "monday.com",
  category: "Productivity",
  description: "Detect inactive users, seat-tier overprovisioning, view-only members, and pending invites holding paid seats.",
  brandColor: "#FF3D57",
  authType: "oauth",
  authFields: [/* Client ID, Client Secret, seat cost, plan tier */],
  oauthStartEndpoint: "/api/integrations/monday/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "monday",
      connection_type: "oauth",
      status: "pending",
      settings: {
        _pending_monday_creds: {
          clientId: values.consumerKey,
          clientSecret: values.consumerSecret,
          seatCostUsd: values.seatCostUsd,
        },
      },
    }],
  }),
  endpoints: [
    { key: "status", path: "/api/integrations/monday/status" },
    { key: "users", path: "/api/integrations/monday/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",
  viewComponent: MondayView,
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/monday/cost-leaks",
  analysisSupportsInactivity: true,
  // quickSetup, callouts, tokenRevocation — copy Atlassian shape
}
```

Register in `TOOL_REGISTRY` (`registry.ts`). Add brand logo entry to `tool-logos.tsx`. Add setup-guide section to `app/dashboard/tools/guide/page.tsx`.

## Frontend view (`frontend/components/tools/monday-view.tsx`)

Members data tab. Mirror `atlassian-view.tsx` shape:
- Header: org name, plan tier, current seat tier, active count
- Members table: name | email | status (active/disabled/pending/guest/view-only) | last activity | seat type
- Filters: search, status filter
- Counts strip: total / active / pending / view-only / guest

## Database

Migration `backend/sql/053_monday_provider.sql`:

```sql
ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox','Microsoft365','HubSpot','QuickBooks','Shopify',
    'OpenAI','Anthropic','Gemini','GoogleWorkspace','Slack','GCP','AWS','Azure',
    'Zoom','GitHub','Stripe','Salesforce','Notion','Linear','Atlassian',
    'monday'
  ));
```

Provider name stored as lowercase `monday` (matches monday.com's own brand presentation; the `tool_name` in `company_integrations` uses the same string).

## Error handling

`mapMondayError(e)` (in `mondayController.js`):
- `CREDS_MISSING` / `CREDS_DECRYPT_FAILED` → 400, "Reconnect monday.com to provide fresh OAuth credentials."
- `REFRESH_TOKEN_MISSING` → 401, "Reconnect monday.com to obtain a refresh token."
- `OAUTH_REFRESH_FAILED` with `invalid_grant` → 401 with code `monday_credentials_revoked`
- `OAUTH_EXCHANGE_FAILED` with `invalid_client` → 400, "Verify Client ID/Secret in the monday.com developer center"
- `httpStatus === 401` → 401, "monday.com rejected the access token — please reconnect."
- `httpStatus === 429` → 503, "monday.com throttled the request — retry in a minute."
- monday GraphQL `errors[].extensions.code === "ComplexityException"` → 503, "Query complexity exceeded — retry in a minute."

## Edge cases

- **Free plan** → `max_users` undefined or `tier === "free"` → all checks return empty (no recoverable spend). Aggregator returns empty findings + healthScore 100.
- **`last_activity = null`** on never-logged-in user → treated as `pendingInvite` if also `isPending`, otherwise NOT counted as inactive (no signal).
- **Token cache eviction on disconnect** — required to prevent leaked tokens from a prior connection.
- **Customer on legacy/grandfathered plan** with non-standard seat tier → `nextLowerTier()` returns null; check 2 returns no finding (correct — we can't safely recommend a tier we don't know).
- **GraphQL complexity limits** — single query of 1000 users + account is well under limits. If we add board-level activity in V2, paginate.

## Out of scope (V1)

- Workspace-level analysis (Enterprise multi-workspace)
- Plan-feature usage detection (paying for Pro but not using formula columns / time tracking)
- Automated remediation actions (V1 surfaces recommendations only)
- Activity-log scraping for fine-grained "last edited" detection — `last_activity` is sufficient signal

## Implementation phases (informs the plan)

The plan should land in this order so each step is independently shippable:

1. **DB migration** (`053_monday_provider.sql`) — additive, deployable independently
2. **Pricing module** (`mondayPricing.js`) — pure constants + helpers, no deps
3. **Auth utility** (`mondayAuth.js`) — OAuth dance, GraphQL helper, directory pull, normalizer
4. **Controller** (`mondayController.js`) — handlers + error mapper
5. **Routes** wired in `routes/index.js`
6. **5 check modules** (`mondayChecks/*`) — each takes `{users, account, settings, inactivityDays}`
7. **Aggregator** (`mondayCostLeakAnalysis.js`) — composes the checks
8. **Frontend config + registry + logo** (`monday.ts`, `registry.ts`, `tool-logos.tsx`)
9. **Frontend view** (`monday-view.tsx`)
10. **Setup guide section** (`guide/page.tsx`)
11. **Manual smoke test** — connect a real monday.com OAuth app against the dev backend, run cost-leaks, verify findings save

## Verification (no test runner)

Per `CLAUDE.md`: no test runner configured. Verify by:
- `cd backend && npm run dev` — confirm server boots, no route conflicts
- `cd frontend && npm run dev` — confirm dashboard renders monday card
- Connect a real monday.com developer-test app, run analysis end-to-end, inspect `cost_leak_analyses` row
- `cd frontend && npx tsc --noEmit` — type check (since `next build` ignores TS errors)
