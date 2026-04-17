# Slack Integration — Design Spec

**Status:** Draft — ready for review
**Date:** 2026-04-17
**Owner:** tayawaaean@gmail.com

---

## 1. Purpose

Add Slack as the 7th data-source cost-leak integration in Efficyon. Detect wasted spend on inactive billable seats in a customer's Slack workspace and surface recoverable savings via the existing Tools dashboard.

## 2. Scope (v1)

**In scope:**
- BYO (bring-your-own) Slack app OAuth connection, matching the HubSpot pattern
- Single-workspace Slack installations (Free / Pro / Business+)
- Inactive billable seat detection with user-configurable inactivity threshold (default 30 days)
- Plan tier + billable seat auto-detection with optional manual override
- Standard cost-leak persistence to `cost_leak_analyses`, surfaced on the History tab

**Out of scope (v1):**
- Enterprise Grid multi-workspace orgs (returns an "UNSUPPORTED_PLAN" finding with "coming soon" UI)
- App/integration usage auditing
- Storage/file volume auditing
- Message-level activity scanning (`conversations.history`) — rate-limit and scope explosion
- Publishing Efficyon as a public app in the Slack App Directory

## 3. Success Criteria

1. A customer can create a Slack app in their workspace, enter `client_id` + `client_secret` in Efficyon, complete OAuth, and see their workspace users populated within the Tools detail page.
2. Running a cost-leak analysis returns a list of inactive billable seats and a calculated monthly savings figure.
3. The analysis is persisted to `cost_leak_analyses` and appears on the History tab alongside other providers.
4. Disconnecting Slack revokes the token on Slack's side and clears stored credentials.
5. Free-plan and Enterprise Grid workspaces do not break the flow — they return a friendly "unsupported for savings" state.

## 4. Architecture

Slack slots into the existing data-source integration pattern. No new architectural concepts; clone the HubSpot / Google Workspace shape.

```
Frontend (Next.js)                              Backend (Express)                    Slack
──────────────────                              ─────────────────                    ─────
User clicks "Connect Slack"
  enters clientId/clientSecret  ──── POST ───▶  /api/integrations (upsert pending)
                                                  │
User clicks "Authorize"         ──── GET ────▶  /api/integrations/slack/oauth/start
                                                  │
                                                  └──── 302 ──────────────────────▶  oauth/v2/authorize
                                                                                        │
                                                                             user grants │
                                                                                        ▼
                                                /api/integrations/slack/oauth/callback ◀──── 302 with code
                                                  │
                                                  ├─ POST oauth.v2.access ──────────────▶
                                                  ├─ encrypt + persist token
                                                  └─ 302 back to dashboard

User clicks "Run Analysis"      ──── POST ───▶  /api/integrations/slack/cost-leaks?inactivityDays=N
                                                  │
                                                  ├─ users.list (paginated) ─────────────▶
                                                  ├─ team.billableInfo ───────────────────▶
                                                  ├─ team.info ───────────────────────────▶
                                                  ├─ slackCostLeakAnalysis service
                                                  ├─ analysisHistoryController.saveAnalysis
                                                  └─ returns { findings, summary, savings, analysisId }

Tools detail page (config-driven) renders Overview / Analysis / History / Data tabs unchanged.
```

## 5. Files Touched

### New backend files

| Path | Purpose |
|---|---|
| `backend/src/controllers/slackController.js` | OAuth start/callback, getUsers, getTeamInfo, getStatus, disconnect, runCostLeaks |
| `backend/src/services/slackCostLeakAnalysis.js` | Finding detection, savings calc |
| `backend/src/utils/slackPricing.js` | Plan → per-seat-rate lookup table |
| `backend/sql/042_slack_provider.sql` | Extend `valid_provider` CHECK constraint to include `'Slack'` |

### New frontend files

| Path | Purpose |
|---|---|
| `frontend/lib/tools/configs/slack.ts` | `UnifiedToolConfig` entry |
| `frontend/components/tools/slack-view.tsx` | Data tab view (users table, plan card, filters) |

### Edited files

| Path | Change |
|---|---|
| `backend/src/routes/index.js` | Register `/api/integrations/slack/*` routes |
| `frontend/lib/tools/registry.ts` | Add `slack` entry to `TOOL_REGISTRY` |
| `frontend/app/dashboard/tools/page.tsx` | Add Slack tile to the "Add integration" grid (color `#4A154B`, category `Communication`) |

**Not touched** (intentionally — config-driven): `tool-detail-tabs.tsx`, `overview-tab.tsx`, `analysis-tab.tsx`, `history-tab.tsx`, `data-tab.tsx`, `analysisHistoryController.js`.

## 6. OAuth Flow (BYO App)

### Scopes required (user-token scopes)

```
users:read        — for users.list
users:read.email  — for email in users.list
team:read         — for team.info + team.billableInfo
```

Three scopes. No admin scopes. No bot token. Minimal approval friction for customer admins.

### Setup instructions shown to customer (quickSetup.steps)

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name: "Efficyon Cost Leak Analyzer" (or anything), pick the workspace
3. Under **OAuth & Permissions** add the 3 user-token scopes above
4. Add redirect URL: `<efficyon-host>/api/integrations/slack/oauth/callback`
5. Under **Basic Information** copy the **Client ID** and **Client Secret** into Efficyon
6. Click "Authorize" — Efficyon will redirect to Slack for installation

### Token lifecycle

Slack user OAuth tokens do **not expire by default** (unlike HubSpot). No refresh logic needed. If the user revokes the app in Slack, the next API call returns `invalid_auth` → mark integration `expired` → UI prompts reconnect.

## 7. Cost Leak Analysis

### Entry point

```js
// backend/src/services/slackCostLeakAnalysis.js
async function analyzeSlackCostLeaks({
  users,          // from users.list
  billableInfo,   // from team.billableInfo → { [userId]: { billing_active: boolean } }
  teamInfo,       // from team.info → { plan: 'std' | 'plus' | 'free' | 'compass', ... }
  inactivityDays, // number, default 30
  overridePlan,   // optional user-entered plan
  overrideSeats,  // optional user-entered paid-seat count
}) → { findings, summary, savings }
```

### Finding types

| Type | Rule | Severity | Notes |
|---|---|---|---|
| `INACTIVE_BILLABLE_SEAT` | `billable[id] === true` AND `!deleted` AND `!is_bot` AND `daysSince(user.updated) > inactivityDays` | high | Primary waste signal |
| `DEACTIVATED_BUT_BILLABLE` | `deleted === true` AND `billable[id] === true` | critical | Slack data-lag bug; rare but real |
| `MULTI_CHANNEL_GUEST_BILLABLE` | `is_restricted && !is_ultra_restricted && billable[id] === true` | medium | Often unintended on Business+ |
| `UNSUPPORTED_PLAN` | `plan === 'free'` OR `plan === 'compass'` (Enterprise Grid) | info | No savings calc; friendly UI state |

### Stable finding hash

```js
hash = md5(`${type}:${userId}`)
```

Matches HubSpot's `generateFindingHash` convention. Lets History tab compute deltas (newly-flagged vs. persistent vs. resolved).

### Exclusions from billable count

- `is_bot === true`
- `id === 'USLACKBOT'`
- `deleted === true`
- `is_ultra_restricted === true` (single-channel guests; usually free on paid plans)

### "Last active" proxy

Slack's `users.list` doesn't expose a `last_active_at` field on non-Enterprise plans. We use `user.updated` as a proxy — this field updates on presence changes, profile edits, channel joins, and other activity signals. Good enough for 30/60/90-day windows. Documented in code comments as a known approximation.

### Savings calculation

```js
potentialMonthlySavings = inactiveBillableCount × perSeatRate(plan)
potentialAnnualSavings  = potentialMonthlySavings × 12
```

If `plan` is `free` or `compass`, return `savings = null` and add the `UNSUPPORTED_PLAN` finding.

## 8. Pricing Util

```js
// backend/src/utils/slackPricing.js
// Rates assumed USD/month, annual-billing pricing (most common).
// Source: slack.com/pricing as of 2026.
const SLACK_PLAN_RATES = {
  free:     { perSeat: 0,     label: "Free",                billable: false },
  standard: { perSeat: 8.75,  label: "Pro (annual)",        billable: true  }, // team.info returns "std"
  plus:     { perSeat: 15.00, label: "Business+ (annual)",  billable: true  },
  compass:  { perSeat: null,  label: "Enterprise Grid",     billable: true  }, // v1 unsupported
};

function getPerSeatCost(planKey) { /* defensive lookup, returns 0 for unknown */ }
function calculatePotentialSavings(inactiveCount, planKey) { /* × rate, null for unsupported */ }
function getPricingDisplayInfo(planKey) { /* { label, perSeat, monthly, annual } */ }
```

Same export shape as `hubspotPricing.js` so the cost-leak service can be near-identical.

## 9. Frontend Config

```ts
// frontend/lib/tools/configs/slack.ts
export const slackConfig: UnifiedToolConfig = {
  provider: "Slack",
  id: "slack",
  label: "Slack",
  category: "Communication",
  description: "Users, channels & seat cost analysis",
  brandColor: "#4A154B",
  authType: "oauth",
  authFields: [
    { name: "clientId",     label: "Client ID",     type: "text",     required: true },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true },
    {
      name: "tier", label: "Plan Tier", type: "select", required: false,
      options: [
        { value: "free",     label: "Free" },
        { value: "standard", label: "Pro (~$8.75/seat)" },
        { value: "plus",     label: "Business+ (~$15/seat)" },
      ],
    },
    {
      name: "paidSeats", label: "Paid Seats", type: "text", required: false,
      placeholder: "Auto-detected after connection",
      validate: (v) => { /* positive integer or null */ },
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/slack/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "Slack",
      connection_type: "oauth",
      status: "pending",
      client_id: values.clientId,
      client_secret: values.clientSecret,
      pricing: {
        tier: values.tier || null, // null → auto-detect from team.info
        ...(values.paidSeats ? { paid_seats: parseInt(values.paidSeats, 10) } : {}),
      },
    }],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Create a Slack app at api.slack.com/apps (From scratch, pick your workspace)",
      "Under OAuth & Permissions add user-token scopes: users:read, users:read.email, team:read",
      "Add redirect URL: <host>/api/integrations/slack/oauth/callback",
      "Copy Client ID and Client Secret from Basic Information and paste here",
    ],
    note: "Requires workspace admin. Tokens do not expire — one-time setup.",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/slack/users", pick: ["users"],           fallback: [] },
    { key: "team",  path: "/api/integrations/slack/team",  pick: ["team", "teamInfo"] },
  ],
  defaultTab: "users",
  viewComponent: SlackView,
  connectingToast: "Redirecting to Slack to authorize…",
  tokenRevocation: { automated: true }, // uses auth.revoke
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/slack/cost-leaks",
  analysisSupportsInactivity: true,
};
```

## 10. Frontend View (`slack-view.tsx`)

Structure mirrors `hubspot-view.tsx`:

- **Plan summary card** — plan label (auto-detected or override), billable seat count, estimated monthly cost, workspace name
- **Users table** — columns: Name, Email, Status badge (Active / Inactive Xd / Guest / Bot / Deleted), Billable (Y/N), Last Updated
- **Filter chips** — All / Billable only / Inactive / Guests / Deleted
- **Empty states** — "Not connected", "No users yet", "You're on Free — no paid seats to audit"

No new UI primitives. Reuses existing `Table`, `Card`, `Badge`, `FilterChip` from `components/ui`.

## 11. Database

### Migration: `backend/sql/042_slack_provider.sql`

```sql
-- Allow Slack as a provider for persisted cost-leak analyses.
ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox',
    'Microsoft365',
    'HubSpot',
    'QuickBooks',
    'Shopify',
    'OpenAI',
    'Anthropic',
    'Gemini',
    'GoogleWorkspace',
    'Slack'
  ));
```

No new columns. Plan tier and billable seat override live in the existing `integrations.metadata` JSONB field.

## 12. Error Handling & Edge Cases

| Case | Behavior |
|---|---|
| Free plan detected | Add `UNSUPPORTED_PLAN` finding, `savings = null`, UI shows "You're on Free — no paid seats to audit" |
| Enterprise Grid (`compass`) | Add `UNSUPPORTED_PLAN`, UI shows "Enterprise Grid support coming soon" with link to contact form |
| `team.billableInfo` rejected / empty | Fall back to counting non-bot, non-deleted, non-ultra-restricted users; response includes `billableSource: "fallback"` flag |
| User revokes token in Slack | Next API call returns `invalid_auth` → mark integration `expired` → UI prompts reconnect |
| Rate limit (Tier 2 `users.list` ~20 req/min, Tier 1 `team.info` ~100 req/min) | Retry once honoring `Retry-After` header; second failure returns 429 with friendly UI message |
| Workspace with 50k+ users | Cursor-paginate `users.list` with loop until `response_metadata.next_cursor` empty; hard stop at 100k with warning |
| OAuth state param tampered | Reject with 400 "Invalid state parameter" |
| Token fetch network error | Store integration status as `error`, message surfaces on Tools page; manual retry via "Run Analysis" |

## 13. Security

- **Client secret** stored in `integrations.client_secret`, encrypted with the same key and pattern as Fortnox/HubSpot.
- **Access token** stored in `integrations.access_token`, encrypted at rest.
- **OAuth state** generated with `crypto.randomBytes(16).toString('hex')`, stored server-side in a short-lived table or signed JWT, verified on callback (matches HubSpot pattern).
- **Scopes are minimal** — no admin, no message, no channel scopes.
- **PII** — user emails stored in Slack view. Already the norm for HubSpot / M365 / Google Workspace.
- **RLS reminder** — no Supabase RLS. Enforcement is `requireAuth` + `requireRole("owner", "editor")` on every route.

## 14. Testing Plan

No test runner configured in this repo. Manual verification:

1. Create a dev Slack workspace on the Free plan; upgrade a copy to Pro trial for paid-plan testing.
2. Create a Slack app with the 3 scopes, configure redirect URL to `localhost:4000/api/integrations/slack/oauth/callback`.
3. Start backend + frontend dev servers.
4. Connect Slack via UI → confirm redirect → grant scopes → verify stored token.
5. Visit Tools detail page → Data tab → confirm users populated, plan auto-detected.
6. Run Analysis with inactivity = 30d → confirm at least one `INACTIVE_BILLABLE_SEAT` finding (use a stale test user).
7. Adjust inactivity slider to 90d → re-run → confirm fewer findings.
8. Confirm row in `cost_leak_analyses`; confirm History tab shows it.
9. Switch to Free-plan workspace → confirm `UNSUPPORTED_PLAN` finding and friendly UI.
10. Disconnect → verify `auth.revoke` call succeeds and integration row cleared.
11. Reconnect same workspace → verify clean state.
12. Manually revoke token in Slack → next analysis surfaces `expired` state.

## 15. Open Questions

None remaining for v1. The following are explicitly deferred:

- **Distribution as a public Slack app** (bypasses BYO friction) — phase 2, after product validation.
- **Enterprise Grid support** — phase 2; requires org-level admin scopes and multi-workspace iteration.
- **Deep activity scan via `conversations.history`** — phase 3; only if `user.updated` proxy proves insufficient in practice.

## 16. Rollout Notes

- Feature is gated by presence of the Slack tile on the Tools page — no feature flag needed.
- Migration `042_slack_provider.sql` must be applied to Supabase before the first production deploy.
- No scheduler wiring required in v1 — analysis is on-demand. If periodic auto-analysis is added later, wire via existing `agentScheduler` pattern.
