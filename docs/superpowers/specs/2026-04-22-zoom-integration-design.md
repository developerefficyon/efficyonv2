# Zoom Integration — Design Spec

- **Date:** 2026-04-22
- **Topic:** Zoom cost-leak integration (inactive licenses + add-on waste + tier mismatch)
- **Status:** Design ready; ready for implementation plan

## Summary

Add Zoom as the 14th cost-leak integration. Customer creates a **Server-to-Server OAuth (S2S) app** in their own Zoom account and pastes `account_id` + `client_id` + `client_secret` into Efficyon's connect form along with their plan tier. Efficyon mints app-only access tokens per integration via Zoom's client-credentials grant, pulls user + activity data, and emits findings for inactive licensed users, under-utilized add-ons (Webinar / Events / Phone), and license-tier mismatches.

Shares ~70% of its shape with the Slack integration (plan-tier input for pricing, per-user activity analysis) and ~20% with Azure (client-credentials token flow per tenant/account).

## Decisions recap

| # | Decision |
|---|---|
| 1 | **Auth:** Server-to-Server OAuth (customer-created S2S app); `account_id` + `client_id` + `client_secret` stored per integration |
| 2 | **Scope:** account-wide (one S2S app covers every user on the account) |
| 3 | **Findings:** inactive licensed users + add-on under-utilization + license-tier mismatch |
| 4 | **Pricing:** customer-selected plan tier dropdown (Pro / Business / Business Plus / Enterprise); list-price per tier applied to seat counts |
| 5 | **Connect UX:** declarative 4-field form (`accountId`, `clientId`, `clientSecret`, `planTier`); no wizard needed |
| 6 | **Code layout:** `zoomAuth.js` + `zoomUsageAnalysis.js` + thin `zoomCostLeakAnalysis.js` aggregator |

## Why this shape

- **S2S over user OAuth.** User OAuth requires per-user consent flows, refresh-token handling, and expires on password change. S2S is app-level, account-scoped, and permanent until the customer deletes the app. Matches how DataDog, Notion, and Spot integrate with Zoom.
- **S2S over Marketplace-published OAuth.** A Zoom Marketplace app requires 3–6 weeks of Zoom review for public publication. S2S is usable on day one and most Zoom customers can create one without IT approval because the scopes are self-granted within their own account.
- **Account-wide scope.** Zoom doesn't have a workspace/sub-account hierarchy equivalent to AWS Organizations. An account is the billing boundary.
- **Plan-tier dropdown.** Zoom's API does not expose per-user billing costs. Slack solved this the same way — customer inputs tier; we apply public list pricing (Pro $14.99 / Business $21.99 / Business Plus $26.99 / Enterprise $240/yr-floor per seat). Tier can be updated without disconnecting.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ zoomAuth.js                        Client-credentials + account_id token exchange; per-integration cache (55-min TTL)
├─ services/
│  ├─ zoomUsageAnalysis.js               Pulls users + activity + add-ons; normalizes into findings
│  └─ zoomCostLeakAnalysis.js            Aggregator: severity mapping + rollup
├─ controllers/
│  └─ zoomController.js                  connect / validate / getStatus / getUsers / getAccount /
│                                        analyze / disconnect
└─ sql/
   └─ 046_zoom_provider.sql              Extends cost_leak_analyses.valid_provider CHECK to include 'Zoom'
```

**Backend (modified)**

- `backend/src/routes/index.js` — register Zoom routes
- `backend/src/controllers/analysisHistoryController.js` — `Zoom` branch in `extractSummary` + duplicate-check

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/zoom.ts             UnifiedToolConfig, 4 authFields, no connectComponent needed
└─ components/tools/zoom-view.tsx        Data tab: account summary, user activity table with filters
```

**Frontend (modified)**

- `frontend/lib/tools/registry.ts` — register `zoomConfig`
- `frontend/components/tools/tool-logos.tsx` — add Zoom brand entry
- `frontend/app/dashboard/tools/guide/page.tsx` — add Zoom tab + guide section

## Auth flow

### Per-customer one-time setup (in customer's Zoom account)

1. Sign in to [marketplace.zoom.us](https://marketplace.zoom.us).
2. Develop → Build App → **Server-to-Server OAuth**.
3. Name: `Efficyon Cost Analyzer`.
4. Under **Scopes**, add:
   - `user:read:list_users:admin` (list users)
   - `user:read:user:admin` (user details incl. type + last_login_time)
   - `report:read:list_meeting_participants:admin` (activity)
   - `report:read:user:admin` (per-user historical activity)
   - `dashboard:read:list_meetings:admin` (meeting metrics)
   - `account:read:list_addons:admin` (add-on billing)
5. Activate the app.
6. Copy **Account ID**, **Client ID**, **Client Secret** from the App Credentials page.
7. Paste the three values + plan tier into Effycion's Zoom connect form.

### Per-analysis token flow

```js
// backend/src/utils/zoomAuth.js
async function getZoomAccessToken(integration) {
  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token

  const { client_id, client_secret, account_id } = decryptSettings(integration.settings)
  const auth = Buffer.from(`${client_id}:${client_secret}`).toString("base64")

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw typedError("TOKEN_FETCH_FAILED", body.reason || body.message || `HTTP ${res.status}`)

  const token = body.access_token
  const expiresAt = Date.now() + (body.expires_in || 3600) * 1000
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}
```

Per-integration in-process cache; 55-min effective TTL. Zoom tokens are 1h.

### Credential storage

`client_secret` is a long-lived secret and **must be encrypted at rest** (same pattern as the existing `encryption.js` utility used for GCP's service-account key). `client_id` and `account_id` are not as sensitive but are encrypted alongside for symmetry.

Settings shape:

```json
{
  "account_id_encrypted": "...",
  "client_id_encrypted": "...",
  "client_secret_encrypted": "...",
  "plan_tier": "business",
  "inactivity_days": 30,
  "last_validated_at": "2026-04-22T10:00:00Z"
}
```

## Data model

### `company_integrations.settings`

See above.

### Migration 046

```sql
ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify',
    'OpenAI', 'Anthropic', 'Gemini', 'GoogleWorkspace', 'Slack',
    'GCP', 'AWS', 'Azure', 'Zoom'
  ));
```

### Finding shape

Same canonical shape as every other integration (source, severity, category, title, resource, currentCost, projectedSavings, currency, recommendation, actionSteps, raw). For Zoom:

- `source: "zoom_usage"`
- `category` ∈ `{"inactive_user", "unused_addon", "tier_mismatch"}`
- `resource.type` ∈ `{"zoom-user", "zoom-addon"}`
- `resource.id` = user email or add-on name
- `resource.accountId` = Zoom account ID

### Severity mapping

Same thresholds as AWS/Azure (≥500/≥100/≥25/>0 USD/month). For Zoom, these are usually smaller per-finding amounts but add up (e.g., 50 inactive Pro users × $14.99 = $749/mo → critical total).

## Analysis pipeline

### Entry point

```
POST /api/integrations/zoom/cost-leaks
  body: { integrationId }
  auth: requireAuth + requireRole("owner", "editor")
```

### Flow

```
1. Load integration, assert status=connected
2. Duplicate-check (inactivityDays + planTier, last 5 minutes → 409)
3. Get Zoom token via zoomAuth
4. runUsageAnalysis(token, planTier, inactivityDays):
   a. List all users: GET /users?status=active&page_size=300
   b. Get per-user activity: GET /users/:id → last_login_time, last_client_version
   c. Get add-on utilization: GET /accounts/me/plans/addons
   d. Normalize into findings (inactive_user / unused_addon / tier_mismatch)
5. aggregate(result) → assign severity, drop zero-savings, sort desc, roll up
6. Strip sourceErrors before saveAnalysis (same as AWS/Azure)
7. saveAnalysis + return { summary, findings }
```

### Finding generators

**Inactive licensed user:**
- Criteria: `user.type === 2` (Licensed) AND `last_login_time` older than `inactivity_days`
- Savings: 1 × planTier list price / month
- Action: downgrade to Basic (free) or revoke license

**Unused add-on:**
- Criteria: add-on license assigned to user but no activity in the add-on's feature in ≥30 days (Webinar → no hosted webinars; Phone → no calls logged)
- Savings: add-on list price / month
- Action: un-assign the add-on from the user

**Tier mismatch:**
- Criteria: account on Business Plus / Enterprise tier but no user has touched tier-exclusive features (Large Meetings, Cloud Storage > X GB, SSO usage) in 30 days
- Savings: difference between current tier and recommended tier × seat count
- Action: downgrade recommendation with a caveat

### Zoom rate limits

Zoom rate limits: 30 req/sec for Light APIs, 80 req/sec for Medium, 10 req/sec for Heavy. Admin `GET /users` is Medium; we paginate at `page_size=300` and paginate through `next_page_token`. For a 1000-user account, that's 4 list calls + 1000 detail calls ≈ 12s throttled. Cap per-user detail calls at 500 users (sorted by type=Licensed first; if customer has >500 licensed users, we surface this in summary).

### Error taxonomy

| Condition | HTTP | Message |
|---|---|---|
| Token fetch 400 / 401 | 401 | "Invalid Zoom credentials — verify Account ID, Client ID, Client Secret and that the S2S app is activated" |
| Missing scope | 403 | "The Zoom S2S app is missing required scopes — add the listed scopes and re-activate" |
| Rate limit 429 | 503 | "Zoom throttled the request — retry in a minute" |
| User not found | 404 | "Account ID not recognized by Zoom" |

## Routes

```
POST   /api/integrations/zoom/validate          validateZoom
GET    /api/integrations/zoom/status            getZoomStatus
GET    /api/integrations/zoom/users             getZoomUsers
GET    /api/integrations/zoom/account           getZoomAccount
POST   /api/integrations/zoom/cost-leaks        analyzeZoomCostLeaks
DELETE /api/integrations/zoom                   disconnectZoom
```

No consent callback needed — no browser redirect flow. The generic `POST /api/integrations` handles row creation; `validateZoom` is fired client-side on detail-page load if status=pending (using the same auto-validate useEffect, extended again).

## Frontend

### `zoomConfig` — declarative 4-field form

```ts
export const zoomConfig: UnifiedToolConfig = {
  provider: "Zoom",
  id: "zoom",
  label: "Zoom",
  category: "Productivity",
  description: "Inactive licensed users, unused add-ons, and tier-mismatch detection",
  brandColor: "#2D8CFF",
  authType: "apiKey",
  authFields: [
    { name: "accountId", label: "Account ID", type: "text", required: true, placeholder: "abc123DEFghi456" },
    { name: "clientId", label: "Client ID", type: "text", required: true },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true },
    {
      name: "planTier",
      label: "Plan Tier",
      type: "select",
      required: true,
      options: [
        { value: "pro", label: "Pro ($14.99/seat/mo)" },
        { value: "business", label: "Business ($21.99/seat/mo)" },
        { value: "business_plus", label: "Business Plus ($26.99/seat/mo)" },
        { value: "enterprise", label: "Enterprise (contact sales)" },
      ],
    },
  ],
  // ... rest matches Slack's config shape
}
```

No `connectComponent` — `authFields` handles it. This is the simplest integration shape since AWS; no wizard needed.

### `ZoomView` — data tab

- **Account summary** — plan tier, total users, licensed users, basic users, last validated.
- **User table** — email, type (Licensed/Basic), last activity, status. Filter by "inactive" / "licensed" / "all". This replaces the AWS "Accounts" or Azure "Subscriptions" table.

### Guide section, registry, brand logo

Standard additions. Brand color `#2D8CFF` (Zoom blue). Inline SVG of the camera-blob logo.

## Environment variables

No Efficyon-side env vars. All auth lives per-integration in the customer's own S2S app. One-time operator setup overhead: zero.

## Verification plan (manual E2E)

1. Apply migration 046 via Supabase MCP.
2. Create a Zoom S2S app in a sandbox Zoom account; add scopes; activate.
3. Copy the three credentials + note the plan tier.
4. Dashboard → Add Integration → Zoom → paste credentials + pick tier → Connect.
5. Detail page auto-fires validate; status flips to `connected` within a few seconds.
6. Overview + Data tabs show account + users.
7. Run Analysis → findings within 10–30s (depending on user count).
8. Supabase check: `SELECT provider, summary->>'totalPotentialSavings', summary->>'totalFindings' FROM cost_leak_analyses WHERE provider = 'Zoom' ORDER BY created_at DESC LIMIT 1;` non-zero.
9. Negative path: change the client secret on Zoom → re-run analysis → expect 401 with verify-credentials hint.
10. Disconnect → settings cleared. Reconnect works.

## Out of scope (v1)

- Zoom Marketplace public app (v2; requires review)
- Meeting recording storage analysis (requires extra API calls; likely medium-impact findings)
- Zoom Phone call-log cost analysis (separate finding category; if Phone add-on is flagged as unused, that's covered in v1)
- SSO-based user provisioning optimization

## References

- Azure integration spec (sibling, completed): [2026-04-22-azure-billing-integration-design.md](2026-04-22-azure-billing-integration-design.md)
- Slack integration spec (closest pattern precedent — plan-tier input): [2026-04-17-slack-integration-design.md](2026-04-17-slack-integration-design.md)
- Zoom Server-to-Server OAuth docs: https://developers.zoom.us/docs/internal-apps/
- Zoom API reference: https://developers.zoom.us/docs/api/
