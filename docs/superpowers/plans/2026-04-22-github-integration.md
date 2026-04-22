# GitHub (Per-Customer GitHub App) Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to work task-by-task.

**Goal:** Add GitHub as the 15th cost-leak integration. Per-customer GitHub App auth (customer creates the App in their own org; we mint installation tokens by signing JWTs with the customer's private key). Three finding generators: inactive Copilot seats + inactive paid members + Copilot over-provisioning. Declarative 5-field connect form. **Zero operator-side env vars.**

**Architecture:** No SDK. JWT signing via Node built-in `crypto.sign("RSA-SHA256", ...)`. All three secrets (App ID, Private Key PEM, Installation ID) encrypted at rest via existing `encrypt()` / `decrypt()` helpers. Tokens cached per-integration for 55 min.

**Tech Stack:** Backend — Express 5 CommonJS, `fetch`, Supabase, no new deps. Frontend — Next.js 16, React 19, declarative form.

**Reference spec:** [`docs/superpowers/specs/2026-04-22-github-integration-design.md`](../specs/2026-04-22-github-integration-design.md)

---

## Phase 1 — Pure Backend Modules

### Task 1: `githubAuth.js` — JWT signing + installation-token exchange + encryption

**File:** `backend/src/utils/githubAuth.js`

```js
/**
 * GitHub Auth Utility (per-customer GitHub App).
 *
 * Customer creates a GitHub App in their own org, installs it, and gives us
 * App ID + Private Key PEM + Installation ID. We encrypt all three at rest.
 * Per analysis, we sign a 10-minute RS256 JWT with the customer's private key
 * (Node built-in crypto — no new deps), exchange it for a 1-hour installation
 * token via POST /app/installations/{id}/access_tokens, and cache the token.
 */

const crypto = require("crypto")
const { encrypt, decrypt } = require("./encryption")

const API_BASE = "https://api.github.com"
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const tokenCache = new Map() // integrationId -> { token, expiresAt }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function encryptGitHubCredentials({ appId, privateKey, installationId }) {
  if (!appId || !privateKey || !installationId) {
    throw typedError("CREDS_MISSING", "appId, privateKey, and installationId are all required")
  }
  return {
    app_id_encrypted: encrypt(String(appId)),
    private_key_encrypted: encrypt(privateKey),
    installation_id_encrypted: encrypt(String(installationId)),
  }
}

function decryptGitHubCredentials(settings) {
  const appId = settings.app_id_encrypted ? decrypt(settings.app_id_encrypted) : null
  const privateKey = settings.private_key_encrypted ? decrypt(settings.private_key_encrypted) : null
  const installationId = settings.installation_id_encrypted ? decrypt(settings.installation_id_encrypted) : null
  if (!appId || !privateKey || !installationId) {
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt GitHub credentials from settings")
  }
  return { appId, privateKey, installationId }
}

function signAppJWT({ appId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const payload = { iss: appId, iat: now - 60, exp: now + 600 }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signingInput = `${headerB64}.${payloadB64}`
  let signature
  try {
    signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKeyPem)
  } catch (e) {
    throw typedError("JWT_SIGN_FAILED", `Private Key couldn't sign a JWT: ${e.message}`)
  }
  return `${signingInput}.${signature.toString("base64url")}`
}

async function getGitHubInstallationToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.token

  const { appId, privateKey, installationId } = decryptGitHubCredentials(integration.settings || {})
  const jwt = signAppJWT({ appId, privateKeyPem: privateKey })

  const res = await fetch(
    `${API_BASE}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("INSTALL_TOKEN_FAILED", body.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    throw err
  }

  const token = body.token
  const expiresAt = new Date(body.expires_at).getTime()
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = {
  encryptGitHubCredentials,
  decryptGitHubCredentials,
  signAppJWT,
  getGitHubInstallationToken,
  evictToken,
  API_BASE,
}
```

Verify:
```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { encryptGitHubCredentials, getGitHubInstallationToken, signAppJWT } = require('./src/utils/githubAuth');
  try { encryptGitHubCredentials({}); } catch (e) { console.log('missing creds:', e.code); }
  (async () => {
    try { await getGitHubInstallationToken(null); } catch (e) { console.log('null:', e.code); }
    try { await getGitHubInstallationToken({ id: 'x', settings: {} }); } catch (e) { console.log('empty settings:', e.code); }
  })();
  try { signAppJWT({ appId: '123', privateKeyPem: 'not-a-pem' }); } catch (e) { console.log('bad key:', e.code); }
"
```

Expected:
```
missing creds: CREDS_MISSING
null: INTEGRATION_MISSING
empty settings: CREDS_DECRYPT_FAILED
bad key: JWT_SIGN_FAILED
```

Commit: `feat(github): add GitHub App auth utility with JWT signing + encrypted credentials`

---

### Task 2: `githubUsageAnalysis.js` — three finding generators

**File:** `backend/src/services/githubUsageAnalysis.js`

```js
/**
 * GitHub usage analysis service.
 *
 * Three finding generators:
 *   1. Inactive Copilot seats (last_activity_at older than threshold)
 *   2. Inactive paid org members (no public events in the window)
 *   3. Copilot over-provisioning (total seats > 1.25 × active_this_cycle)
 */

const API = "https://api.github.com"

const PLAN_PRICING = { team: 4, enterprise: 21 }
const COPILOT_PRICING = { none: 0, business: 19, enterprise: 39 }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

async function githubRequest(token, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("GITHUB_REQUEST_FAILED", body.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    throw err
  }
  return { body, headers: res.headers }
}

/**
 * Paginate a standard list endpoint. Returns up to `cap` items.
 */
async function paginate(token, urlBase, cap = 500) {
  const out = []
  let url = urlBase + (urlBase.includes("?") ? "&" : "?") + "per_page=100"
  for (let i = 0; i < 30 && url; i++) {
    const { body, headers } = await githubRequest(token, url)
    const items = Array.isArray(body) ? body : (body.seats || body.items || [])
    out.push(...items)
    if (out.length >= cap) return out.slice(0, cap)
    const link = headers.get ? headers.get("link") : null
    const next = parseNextLink(link)
    url = next
  }
  return out
}

function parseNextLink(link) {
  if (!link) return null
  const m = link.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1] : null
}

async function getOrgFromInstallation(token, installationSettings) {
  if (installationSettings?.org_login) return installationSettings.org_login
  // Fallback: use /installation/repositories → first repo's owner login
  const { body } = await githubRequest(token, `${API}/installation/repositories?per_page=1`)
  const repo = (body.repositories || [])[0]
  return repo?.owner?.login || null
}

async function listMembers(token, org) {
  return paginate(token, `${API}/orgs/${org}/members?role=all`, 500)
}

async function listCopilotSeats(token, org) {
  // GET /orgs/{org}/copilot/billing/seats returns { total_seats, seats: [...] }
  const out = []
  let url = `${API}/orgs/${org}/copilot/billing/seats?per_page=50`
  for (let i = 0; i < 20 && url; i++) {
    const { body, headers } = await githubRequest(token, url)
    out.push(...(body.seats || []))
    if (out.length >= 1000) break
    const next = parseNextLink(headers.get ? headers.get("link") : null)
    url = next
  }
  return out
}

async function getCopilotBillingSummary(token, org) {
  try {
    const { body } = await githubRequest(token, `${API}/orgs/${org}/copilot/billing`)
    return body
  } catch (e) {
    return null
  }
}

async function getUserRecentEvent(token, username, sinceIso) {
  try {
    const { body } = await githubRequest(token, `${API}/users/${username}/events?per_page=10`)
    const events = Array.isArray(body) ? body : []
    const sinceMs = new Date(sinceIso).getTime()
    for (const ev of events) {
      if (ev.created_at && new Date(ev.created_at).getTime() >= sinceMs) return ev
    }
    return null
  } catch (e) {
    return null
  }
}

function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function findingInactiveCopilotSeat(seat, copilotTier, inactivityDays) {
  const price = COPILOT_PRICING[copilotTier] ?? COPILOT_PRICING.business
  const login = seat.assignee?.login || "unknown"
  return {
    id: `github-inactive-copilot-${login}`,
    source: "github_usage",
    severity: null,
    category: "inactive_copilot_seat",
    title: `Inactive Copilot seat: ${login}`,
    region: null,
    resource: {
      type: "github-copilot-seat",
      id: login,
      accountId: null, // set by caller with org
      region: null,
    },
    currentCost: price,
    projectedSavings: price,
    currency: "USD",
    recommendation: `Revoke Copilot access for ${login} — no activity in ${inactivityDays}+ days`,
    actionSteps: [
      "Open GitHub → Organization settings → Copilot → Access",
      `Find ${login} and click Remove`,
      "Confirm the change takes effect at the next billing cycle",
    ],
    raw: seat,
  }
}

function findingInactivePaidMember(member, planTier, inactivityDays) {
  const price = PLAN_PRICING[planTier] ?? PLAN_PRICING.team
  return {
    id: `github-inactive-member-${member.login}`,
    source: "github_usage",
    severity: null,
    category: "inactive_paid_member",
    title: `Inactive paid GitHub member: ${member.login}`,
    region: null,
    resource: {
      type: "github-user",
      id: member.login,
      accountId: null,
      region: null,
    },
    currentCost: price,
    projectedSavings: price,
    currency: "USD",
    recommendation: `Remove ${member.login} from the organization — no activity in ${inactivityDays}+ days`,
    actionSteps: [
      "Confirm the member is truly inactive (check with their manager)",
      "Open GitHub → Organization → People → find the member",
      "Remove from organization (reclaims the paid seat)",
    ],
    raw: member,
  }
}

function findingCopilotOverProvision(billing, copilotTier) {
  const total = Number(billing?.seat_breakdown?.total || 0)
  const active = Number(billing?.seat_breakdown?.active_this_cycle || 0)
  const surplus = Math.max(0, total - Math.ceil(active * 1.25))
  if (surplus === 0) return null
  const price = COPILOT_PRICING[copilotTier] ?? COPILOT_PRICING.business
  return {
    id: `github-copilot-over-provision-${total}`,
    source: "github_usage",
    severity: null,
    category: "copilot_over_provision",
    title: `Copilot over-provisioned: ${surplus} surplus seats`,
    region: null,
    resource: { type: "github-copilot-seat", id: "account", accountId: null, region: null },
    currentCost: surplus * price,
    projectedSavings: surplus * price,
    currency: "USD",
    recommendation: `Reduce Copilot seat count by ${surplus} at next renewal (${total} total, ${active} active this cycle)`,
    actionSteps: [
      "Review Copilot seat assignments",
      "Unassign the least-active users",
      "Adjust seat count in billing settings",
    ],
    raw: billing,
  }
}

async function runUsageAnalysis(token, settings) {
  const inactivityDays = settings?.inactivity_days || 30
  const planTier = settings?.plan_tier || "team"
  const copilotTier = settings?.copilot_tier || "business"

  const findings = []
  const errors = []

  const org = await getOrgFromInstallation(token, settings)
  if (!org) {
    errors.push({ stage: "resolveOrg", message: "Could not resolve org login from installation", code: "NO_ORG" })
    return { findings, errors, org: null, memberCount: 0, seatCount: 0 }
  }

  // 1. Inactive Copilot seats
  let seats = []
  if (copilotTier !== "none") {
    try {
      seats = await listCopilotSeats(token, org)
      const sinceIso = daysAgoIso(inactivityDays)
      const sinceMs = new Date(sinceIso).getTime()
      for (const seat of seats) {
        const last = seat.last_activity_at ? new Date(seat.last_activity_at).getTime() : 0
        if (last < sinceMs) {
          const f = findingInactiveCopilotSeat(seat, copilotTier, inactivityDays)
          f.resource.accountId = org
          findings.push(f)
        }
      }
    } catch (e) {
      errors.push({ stage: "copilotSeats", message: e.message, code: e.code || "COPILOT_LIST_FAILED", httpStatus: e.httpStatus })
    }
  }

  // 2. Inactive paid members
  let members = []
  try {
    members = await listMembers(token, org)
    const sinceIso = daysAgoIso(inactivityDays)
    // cap per-member event calls
    const CAP = 500
    const checked = members.slice(0, CAP)
    for (const m of checked) {
      const recent = await getUserRecentEvent(token, m.login, sinceIso)
      if (!recent) {
        const f = findingInactivePaidMember(m, planTier, inactivityDays)
        f.resource.accountId = org
        findings.push(f)
      }
    }
  } catch (e) {
    errors.push({ stage: "members", message: e.message, code: e.code || "MEMBERS_LIST_FAILED", httpStatus: e.httpStatus })
  }

  // 3. Copilot over-provisioning
  if (copilotTier !== "none") {
    const billing = await getCopilotBillingSummary(token, org)
    if (billing) {
      const f = findingCopilotOverProvision(billing, copilotTier)
      if (f) {
        f.resource.accountId = org
        findings.push(f)
      }
    }
  }

  return { findings, errors, org, memberCount: members.length, seatCount: seats.length }
}

module.exports = {
  runUsageAnalysis,
  listMembers,
  listCopilotSeats,
  getCopilotBillingSummary,
  getOrgFromInstallation,
  findingInactiveCopilotSeat,
  findingInactivePaidMember,
  findingCopilotOverProvision,
  PLAN_PRICING,
  COPILOT_PRICING,
}
```

Verify (fixture for the Copilot normalizer):
```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { findingInactiveCopilotSeat } = require('./src/services/githubUsageAnalysis');
  const out = findingInactiveCopilotSeat({ assignee: { login: 'alice' }, last_activity_at: '2025-01-01T00:00:00Z' }, 'business', 30);
  console.log('source:', out.source);
  console.log('category:', out.category);
  console.log('savings (Business = 19):', out.projectedSavings);
  console.log('resource.id:', out.resource.id);
"
```

Expected:
```
source: github_usage
category: inactive_copilot_seat
savings (Business = 19): 19
resource.id: alice
```

Commit: `feat(github): add usage analysis service with three finding generators`

---

### Task 3: `githubCostLeakAnalysis.js` — aggregator

**File:** `backend/src/services/githubCostLeakAnalysis.js`

Mirror Zoom's aggregator. Assigns severity, drops zero-savings, sorts by savings desc. Summary:

```js
const summary = {
  totalPotentialSavings: Number(totalPotentialSavings.toFixed(2)),
  currency: "USD",
  totalFindings: findings.length,
  findingsBySeverity: countBy(findings, "severity"),
  findingsBySource: countBy(findings, "source"),
  analyzedOrg: result.org,
  memberCount: result.memberCount,
  copilotSeatCount: result.seatCount,
  planTier: settings?.plan_tier || "team",
  copilotTier: settings?.copilot_tier || "business",
  sourceErrors: (result.errors || []).map((e) => ({ source: "github_usage", ...e })),
}
```

Fixture-verify severity + aggregate shape (pattern matches Zoom Task 3).

Commit: `feat(github): add cost-leak aggregator`

---

## Phase 2 — Database

### Task 4: Migration 047

**File:** `backend/sql/047_github_provider.sql`

```sql
ALTER TABLE public.cost_leak_analyses DROP CONSTRAINT IF EXISTS valid_provider;
ALTER TABLE public.cost_leak_analyses ADD CONSTRAINT valid_provider CHECK (provider IN (
  'Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify',
  'OpenAI', 'Anthropic', 'Gemini', 'GoogleWorkspace', 'Slack',
  'GCP', 'AWS', 'Azure', 'Zoom', 'GitHub'
));
```

DB apply deferred; commit.

---

## Phase 3 — Backend Controller + Routes

### Task 5: `githubController.js` with all 6 handlers

Single combined task (matches Zoom Tasks 5-7 pattern). Create `backend/src/controllers/githubController.js` with:

- Imports: `supabase`, `encryptGitHubCredentials`, `decryptGitHubCredentials`, `getGitHubInstallationToken`, `evictToken`; `analyzeGitHubCostLeaks` from aggregator; `runUsageAnalysis` helpers; `saveAnalysis` from history.
- Constants + helpers: `GITHUB_PROVIDER = "GitHub"`, `log`, `getIntegrationForUser`, `mapGitHubError` (covers INSTALL_TOKEN_FAILED/401 → 401, 404 → 404, 403 "Resource not accessible" → 403, 403 Copilot-specific → 409, rate-limit → 503, JWT_SIGN_FAILED → 500 with hint).
- Six handlers fully implemented (no stubs). Same shape as Zoom:
  - `validateGitHub`: handles `_pending_github_creds` → encrypted upgrade (mirror of Zoom's `_pending_zoom_creds`); fetches installation metadata (`GET /app/installations/{id}`) to populate `org_login`, `installation_target_type`, `repository_selection`; flips status to connected.
  - `getGitHubStatus`: reads settings, returns shape `{status, orgLogin, planTier, copilotTier, memberCount, copilotSeatCount, lastValidatedAt}`.
  - `getGitHubMembers`: token → `listMembers(token, org)` → return `{members}` (cap 500).
  - `getGitHubOrg`: token → `GET /orgs/{org}` → return org info.
  - `analyzeGitHubCostLeaksHandler` (exported as `analyzeGitHubCostLeaks`): duplicate-check keyed on `{planTier, copilotTier, inactivityDays}` within 5 minutes → 409; then token → `analyzeGitHubCostLeaks(token, settings)`; strip `sourceErrors` before `saveAnalysis`; pass `parameters: { planTier, copilotTier, inactivityDays }`.
  - `disconnectGitHub`: clear encrypted creds, keep audit breadcrumb `{disconnected_at, prior_org_login}`, flip status, `evictToken(integration.id)`.

Verify controller loads (all 6 handler exports are functions). Commit: `feat(github): add controller with all six handlers`

---

### Task 6: Routes + history branches

**File mods:** `backend/src/routes/index.js`, `backend/src/controllers/analysisHistoryController.js`

Add (after Zoom block in each):

```js
// GitHub Controller - per-customer GitHub App cost analysis
const {
  validateGitHub,
  getGitHubStatus,
  getGitHubMembers,
  getGitHubOrg,
  analyzeGitHubCostLeaks,
  disconnectGitHub,
} = require("../controllers/githubController")
```

```js
// GitHub routes
router.post(  "/api/integrations/github/validate",     requireAuth, requireRole("owner", "editor"),           validateGitHub)
router.get(   "/api/integrations/github/status",       requireAuth, requireRole("owner", "editor", "viewer"), getGitHubStatus)
router.get(   "/api/integrations/github/members",      requireAuth, requireRole("owner", "editor", "viewer"), getGitHubMembers)
router.get(   "/api/integrations/github/org",          requireAuth, requireRole("owner", "editor", "viewer"), getGitHubOrg)
router.post(  "/api/integrations/github/cost-leaks",   requireAuth, requireRole("owner", "editor"),           analyzeGitHubCostLeaks)
router.delete("/api/integrations/github",              requireAuth, requireRole("owner", "editor"),           disconnectGitHub)
```

In `analysisHistoryController.js`, after the Zoom branches:

```js
// duplicate-check
} else if (provider === "GitHub") {
  duplicateQuery = duplicateQuery
    .eq("parameters->>planTier", params.planTier || "")
    .eq("parameters->>copilotTier", params.copilotTier || "")
    .eq("parameters->>inactivityDays", String(params.inactivityDays || 30))
}

// extractSummary
} else if (provider === "GitHub") {
  const s = analysisData.summary || {}
  summary.totalFindings = s.totalFindings || 0
  summary.totalPotentialSavings = s.totalPotentialSavings || 0
  const bySev = s.findingsBySeverity || {}
  summary.highSeverity = (bySev.critical || 0) + (bySev.high || 0)
  summary.mediumSeverity = bySev.medium || 0
  summary.lowSeverity = bySev.low || 0
  summary.healthScore = null
}
```

Verify both files load. Commit: `feat(github): register GitHub routes + history branches`

---

## Phase 4 — Frontend

### Task 7: `githubConfig` + `GitHubView`

**Files:**
- `frontend/lib/tools/configs/github.ts` — declarative 5-field form (see spec for exact authFields shape). `buildConnectRequest` puts values under `settings._pending_github_creds`. `analysisSupportsInactivity: true`.
- `frontend/components/tools/github-view.tsx` — org summary panel + members table with filter tabs (All / Admins / Inactive) + Copilot seats table. Pattern-match `zoom-view.tsx`.

Verify tsc. Commit: `feat(github): add frontend config + GitHubView`

---

### Task 8: Extend auto-validate useEffect to GitHub

**File:** `frontend/app/dashboard/tools/[id]/page.tsx`

- Expand the provider list: `["AWS", "Azure", "Zoom", "GitHub"]`
- Add an endpoint branch:
  ```js
  : config.provider === "GitHub" ? "/api/integrations/github/validate"
  ```
- Add a prerequisite guard:
  ```js
  if (config.provider === "GitHub" && !settings._pending_github_creds && !settings.private_key_encrypted) return
  ```

Commit: `feat(github): extend auto-validate effect to GitHub pending integrations`

---

### Task 9: TOOL_REGISTRY + brand logo

- Add `GitHub: githubConfig` after `Zoom: zoomConfig`.
- Add `github:` entry in `TOOL_BRANDS` with color `#181717` and the classic Octocat mark (simple-icons):

```tsx
github: {
  color: "#181717",
  path: (
    <path
      fill="#181717"
      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
    />
  ),
},
```

Verify tsc. Commit: `feat(github): register GitHub in TOOL_REGISTRY and add brand logo`

---

### Task 10: Guide section

Add `{ id: "github", label: "GitHub", color: "#181717", desc: "Developer Tools" }` to the INTEGRATIONS tab list. Add a full section at the bottom of the guide file following the Zoom section's structure. Six steps covering:
1. Go to your GitHub org → Settings → Developer settings → GitHub Apps → New GitHub App
2. Fill in name, homepage URL; disable webhook
3. Grant the 3 org-level Read permissions (Members / Administration / Copilot Business)
4. Create the app, then generate the private key (downloads a .pem file)
5. Install the app on your org; copy the Installation ID from the URL
6. Back in Efficyon, paste App ID + full PEM contents + Installation ID, pick tiers, Connect

InfoBox: pricing math caveat.
SecurityBox: private key encrypted at rest, read-only scopes, revoke by uninstalling/deleting the App.

Commit: `feat(github): add GitHub setup guide section`

---

## Phase 5 — End-to-End Verification

### Task 11: Manual E2E

- [ ] Apply migration 047 via Supabase MCP.
- [ ] Sandbox: GitHub org with Copilot Business enabled.
- [ ] Create the App, generate private key, install, collect App ID + PEM + Installation ID.
- [ ] Add integration → GitHub → paste 3 secrets + tiers → Connect.
- [ ] Auto-validate fires, status → connected.
- [ ] Data tab populates with org + members + Copilot seats.
- [ ] Run Analysis → findings appear.
- [ ] Supabase row check: `SELECT provider, summary->>'totalPotentialSavings', summary->>'totalFindings' FROM cost_leak_analyses WHERE provider = 'GitHub' ORDER BY created_at DESC LIMIT 1;`
- [ ] Negative: uninstall the App → re-run → expect 404 + reinstall hint.
- [ ] Disconnect → encrypted creds cleared. Reconnect works.

---

## Final Checklist

- [ ] Task 1: `githubAuth.js` built + JWT sign input-validation verified
- [ ] Task 2: Usage analysis service + normalizer fixture-verified
- [ ] Task 3: Aggregator + severity/shape verified
- [ ] Task 4: Migration 047 (apply deferred)
- [ ] Task 5: Controller with 6 handlers
- [ ] Task 6: Routes + history branches
- [ ] Task 7: Frontend config + GitHubView
- [ ] Task 8: Auto-validate extended
- [ ] Task 9: Registry + brand logo
- [ ] Task 10: Guide section
- [ ] Task 11: Full manual E2E
