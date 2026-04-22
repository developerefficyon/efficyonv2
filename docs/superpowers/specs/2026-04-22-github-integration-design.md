# GitHub Integration — Design Spec

- **Date:** 2026-04-22
- **Topic:** GitHub cost-leak integration (Copilot seat waste + inactive paid org members + add-on over-provisioning)
- **Status:** Design ready; ready for implementation plan

## Summary

Add GitHub as the 15th cost-leak integration. **Customer creates their own GitHub App in their org**, installs it on their org, and pastes three credentials (App ID, Private Key PEM, Installation ID) + plan tier + Copilot tier into Efficyon's connect form. Efficyon encrypts the secrets at rest, mints installation tokens via JWT-signed `POST /app/installations/{id}/access_tokens`, and pulls Copilot seat + member data to produce findings for inactive Copilot seats, inactive paid org members, and Copilot over-provisioning.

**Zero operator-side setup. No Efficyon GitHub App, no operator env vars.** Matches Zoom / Fortnox / QuickBooks pattern.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **Auth:** per-customer GitHub App (customer-created); per-integration installation tokens via JWT signed with the customer's own private key |
| 2 | **Scope:** organization-level (one install = one org) |
| 3 | **Findings:** inactive Copilot seats + inactive paid org members + Copilot over-provisioning |
| 4 | **Pricing:** customer selects plan tier (Team / Enterprise) + Copilot tier (None / Business / Enterprise) in the connect form |
| 5 | **Connect UX:** declarative 5-field form (App ID, Private Key textarea, Installation ID, Plan Tier, Copilot Tier); no wizard. Matches Zoom/Fortnox. |
| 6 | **Code layout:** `githubAuth.js` + `githubUsageAnalysis.js` + thin `githubCostLeakAnalysis.js` aggregator |
| 7 | **Encryption:** Private Key PEM + App ID + Installation ID encrypted at rest via existing `encrypt()` / `decrypt()` helpers (string-level, same as Zoom) |

## Why this shape

- **Per-customer GitHub App over public-marketplace App.** User explicit requirement: zero operator setup, same pattern as Fortnox / QuickBooks / Zoom. Each customer's auth is isolated — a compromise of one customer's private key has no blast radius into other customers. Trade-off: ~10 minutes of one-time customer work (creating the App in their org's developer settings).
- **Installation-token auth over PAT.** PATs are user-scoped and expire; GitHub App installation tokens are org-scoped, auto-rotate hourly, have 5× higher rate limits (5000/hr), and use fine-grained per-permission scopes. We accept the 10-minute setup cost for the stronger auth model.
- **Copilot as the primary waste signal.** Copilot Business ($19/seat/mo) + Copilot Enterprise ($39/seat/mo) are paid per-seat with an explicit `last_activity_at` field in the `/orgs/{org}/copilot/billing/seats` response. Inactive seats are the highest-confidence, highest-savings finding we can emit. A 100-seat org with 25 inactive seats = $475/mo wasted = well above "critical" severity.
- **Plan-tier + Copilot-tier dropdowns.** Base-plan seat pricing isn't exposed granularly via API, so customer selects. Same pattern as Slack/Zoom.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ githubAuth.js                      Credential encryption + JWT RS256 signing + installation-token exchange + per-integration cache
├─ services/
│  ├─ githubUsageAnalysis.js             Org + members + Copilot seats; three finding generators
│  └─ githubCostLeakAnalysis.js          Aggregator (same shape as Zoom/Azure)
├─ controllers/
│  └─ githubController.js                validate / status / members / org / analyze / disconnect
└─ sql/
   └─ 047_github_provider.sql            Extends valid_provider CHECK to include 'GitHub'
```

**Backend (modified)**

- `backend/src/routes/index.js` — register GitHub routes
- `backend/src/controllers/analysisHistoryController.js` — `GitHub` branch in extractSummary + duplicate-check

**No env var changes.** Zero operator setup.

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/github.ts           UnifiedToolConfig — declarative 5-field form, no connectComponent needed
└─ components/tools/github-view.tsx      Data tab: org summary + members table + Copilot seats table
```

**Frontend (modified)**

- `frontend/lib/tools/registry.ts` — register `githubConfig`
- `frontend/app/dashboard/tools/[id]/page.tsx` — extend auto-validate to "GitHub"
- `frontend/components/tools/tool-logos.tsx` — GitHub Octocat mark
- `frontend/app/dashboard/tools/guide/page.tsx` — GitHub tab + guide section

## Auth flow

### Customer-side one-time setup (in their GitHub org)

1. Open customer's GitHub Organization → Settings → Developer settings → **GitHub Apps** → **New GitHub App**.
2. Name: `Efficyon Cost Analyzer`. Homepage URL: `https://efficyon.com` (or placeholder).
3. **Webhook:** uncheck "Active" (we don't use webhooks).
4. **Permissions (organization-level, read-only):**
   - Organization: **Members** → Read
   - Organization: **Administration** → Read
   - Organization: **Copilot Business** → Read
5. Click **Create GitHub App**.
6. On the app settings page:
   - Copy the **App ID** (shown near the top).
   - Click **Generate a private key** — downloads a `.pem` file.
   - On the left sidebar, click **Install App** → select the customer's org → select repository access (All or Selected — analysis works with either) → Install.
   - After install, the URL shows `/installations/<id>` — copy the **Installation ID**.
7. Back in Efficyon: paste **App ID**, full **Private Key PEM contents**, and **Installation ID** into the connect form, pick **Plan Tier** and **Copilot Tier**, click Connect.

### Per-analysis token flow

```js
// backend/src/utils/githubAuth.js
const crypto = require("crypto")

function signAppJWT({ appId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const payload = { iss: appId, iat: now - 60, exp: now + 600 }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signingInput = `${headerB64}.${payloadB64}`
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKeyPem).toString("base64url")
  return `${signingInput}.${signature}`
}

async function getGitHubInstallationToken(integration) {
  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token

  const { appId, privateKey, installationId } = decryptGitHubCredentials(integration.settings)
  const jwt = signAppJWT({ appId, privateKeyPem: privateKey })

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )
  const body = await res.json()
  if (!res.ok) throw typedError("INSTALL_TOKEN_FAILED", body.message || `HTTP ${res.status}`)

  const token = body.token
  const expiresAt = new Date(body.expires_at).getTime()
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}
```

Node's built-in `crypto.sign("RSA-SHA256", ...)` — no new dependency. Per-integration cache, 55-min effective TTL.

### Credential storage

All three secrets (`appId`, `privateKey`, `installationId`) are encrypted via the existing string-level `encrypt()` helper, same as Zoom. `privateKey` is the critical secret (anyone with the PEM can sign JWTs for the customer's app); `appId` and `installationId` aren't secrets per se but are encrypted for symmetry.

Settings shape:

```json
{
  "app_id_encrypted": "...",
  "private_key_encrypted": "...",
  "installation_id_encrypted": "...",
  "org_login": "acme-corp",
  "plan_tier": "team",
  "copilot_tier": "business",
  "installed_at": "2026-04-22T10:00:00Z",
  "last_validated_at": "2026-04-22T10:00:05Z"
}
```

The connect form submits plaintext under `settings._pending_github_creds`; `validateGitHub` performs the encryption-on-first-validate step before any network work (same pattern as Zoom's `_pending_zoom_creds` upgrade).

## Data model

### Migration 047

```sql
ALTER TABLE public.cost_leak_analyses DROP CONSTRAINT IF EXISTS valid_provider;
ALTER TABLE public.cost_leak_analyses ADD CONSTRAINT valid_provider CHECK (provider IN (
  'Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify',
  'OpenAI', 'Anthropic', 'Gemini', 'GoogleWorkspace', 'Slack',
  'GCP', 'AWS', 'Azure', 'Zoom', 'GitHub'
));
```

### Finding shape

Same canonical shape as every other integration. For GitHub:

- `source: "github_usage"`
- `category` ∈ `{"inactive_copilot_seat", "inactive_paid_member", "copilot_over_provision"}`
- `resource.type` ∈ `{"github-user", "github-copilot-seat"}`
- `resource.id` = GitHub username
- `resource.accountId` = org login

### Severity mapping

Same thresholds as Zoom/AWS/Azure (500/100/25/0 USD/month).

## Analysis pipeline

### Finding generators

**Inactive Copilot seats** (biggest win):
- `GET /orgs/{org}/copilot/billing/seats?per_page=50` (paginated)
- For each seat, if `last_activity_at` is older than `inactivity_days` (default 30): emit finding with savings = Copilot tier price (Business $19 or Enterprise $39)
- Recommendation: revoke the seat in Copilot admin

**Inactive paid org members**:
- `GET /orgs/{org}/members?role=all&per_page=100` (paginated)
- For each member, `GET /users/{username}/events?per_page=10` — check if any event is within `inactivity_days` window (hit-based; stop once a recent event is seen)
- Cap at 500 members to avoid rate-limit pressure (sort priority: admins first to err on the side of NOT false-flagging admins)
- Savings = plan tier's per-seat price (Team $4, Enterprise $21)
- Recommendation: remove from org or downgrade role

**Copilot over-provisioning**:
- `GET /orgs/{org}/copilot/billing` → `seat_breakdown.total` vs `active_this_cycle`
- If `total > active_this_cycle × 1.25`, emit one finding for the surplus × Copilot tier price
- Recommendation: reduce seat count at next renewal

### Rate limits

5000 req/hr per installation. Typical analysis (100-500 member org):
- 10 paginated calls for Copilot seats
- 5 paginated calls for members  
- 500 per-member event calls (capped)
- Total: ~515 calls — well under limit

### Error taxonomy

| Condition | HTTP | Message |
|---|---|---|
| JWT sign failure (invalid key) | 500 | "The Private Key you provided couldn't sign a JWT — verify it's the full PEM including BEGIN/END lines" |
| 401 on `/app/installations/{id}/access_tokens` | 401 | "GitHub rejected the App credentials — verify App ID and Private Key match the same GitHub App" |
| 404 on installation | 404 | "Installation ID not found — make sure the app is installed on your org and the ID is correct" |
| 403 "Resource not accessible by integration" | 403 | "The GitHub App is missing a required permission — re-check the three org-level permissions and reinstall" |
| 403 Copilot-specific | 409 | "Copilot Business isn't enabled on this org, or the App lacks the Copilot Business Read permission" |
| 403 secondary rate limit | 503 | "GitHub throttled the request — retry in a minute" |

## Routes

```
POST   /api/integrations/github/validate    validateGitHub
GET    /api/integrations/github/status      getGitHubStatus
GET    /api/integrations/github/members     getGitHubMembers
GET    /api/integrations/github/org         getGitHubOrg
POST   /api/integrations/github/cost-leaks  analyzeGitHubCostLeaks
DELETE /api/integrations/github             disconnectGitHub
```

No install callback — customer installs in their own GitHub dashboard, then pastes credentials into our form.

## Frontend

### `githubConfig` — declarative 5-field form

```ts
authFields: [
  { name: "appId",          label: "App ID",          type: "text",     required: true, placeholder: "1234567",
    hint: "GitHub → Org Settings → Developer settings → GitHub Apps → your app → App ID" },
  { name: "privateKey",     label: "Private Key (PEM)", type: "textarea", required: true,
    placeholder: "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
    hint: "Paste the entire .pem file contents including the BEGIN/END lines" },
  { name: "installationId", label: "Installation ID", type: "text",     required: true, placeholder: "12345678",
    hint: "After installing the app, the install URL shows /installations/<id>" },
  { name: "planTier",       label: "GitHub Plan",     type: "select",   required: true,
    options: [
      { value: "team",       label: "Team ($4/user/mo)" },
      { value: "enterprise", label: "Enterprise ($21/user/mo)" },
    ] },
  { name: "copilotTier",    label: "Copilot Tier",    type: "select",   required: true,
    options: [
      { value: "none",       label: "None" },
      { value: "business",   label: "Copilot Business ($19/user/mo)" },
      { value: "enterprise", label: "Copilot Enterprise ($39/user/mo)" },
    ] },
],
```

No `connectComponent` — `authFields` handles the whole form. Simplest frontend of any integration since Slack.

### `GitHubView` — Data tab

- Org summary (org login, plan tier, Copilot tier, total members, Copilot seats used/total, last validated)
- Members table with filter tabs (All / Admins / Inactive)
- Copilot seats table: username, last_activity_at, pending_cancellation_date

## Environment variables

**None.** Zero operator setup.

## Verification plan (manual E2E)

1. Apply migration 047.
2. In a sandbox GitHub org with Copilot Business enabled: create the App, generate private key, install, copy the 3 values.
3. In Efficyon dashboard: Add → GitHub → paste App ID / Private Key / Installation ID / pick tiers → Connect.
4. Auto-validate fires; status flips to `connected` within a few seconds.
5. Data tab shows org summary + members + seats.
6. Run Analysis → inactive-seat findings appear.
7. Supabase row check.
8. Negative: revoke the app's Copilot permission → re-run → expect 403 with the re-permission hint.
9. Negative: uninstall the app in GitHub → re-run → expect 404 with reinstall hint.
10. Disconnect → encrypted creds cleared. Reconnect with the same values works (or with a new app also works).

## Out of scope (v1)

- GitHub Actions minute cost analysis (separate meter; complex pricing tiers)
- GitHub Advanced Security committer analysis (requires code-scanning permission)
- GitHub Packages storage cost
- Self-hosted GitHub Enterprise Server (different API URL)
- Repository-scoped findings (only org-scoped for v1)

## References

- Zoom integration spec (closest precedent — encrypt-on-validate + plan-tier input): [2026-04-22-zoom-integration-design.md](2026-04-22-zoom-integration-design.md)
- GitHub App authentication: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app
- Copilot Business API: https://docs.github.com/en/rest/copilot/copilot-user-management
