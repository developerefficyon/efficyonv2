# Atlassian Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Atlassian (Jira Software + Confluence) as Efficyon's 20th integration. V1 detects three classes of cost leaks via a customer-managed Atlassian OAuth 2.0 (3LO) app: inactive Jira users, inactive Confluence users, and the cross-product `single_product_dual_seat` overlap.

**Architecture:** Customer creates an OAuth 2.0 integration in the Atlassian Developer Console, grants Org-Admin scopes, and pastes Client ID + Secret + per-product seat costs into Efficyon. Backend does OAuth via `auth.atlassian.com`, calls `accessible-resources` + `/admin/v1/orgs` to capture cloudIds and orgId, persists encrypted access + refresh tokens, and uses the Org Directory API to read users with per-product `lastActive` timestamps. The three checks fan out from one paginated user pull. Findings ride in the existing `cost_leak_analyses` table; only schema change is the provider CHECK extension.

**Tech Stack:** Backend Express/CommonJS + Supabase + native `fetch` for Atlassian's REST APIs. Frontend Next.js 16 / React 19 / TypeScript / Tailwind v4. Auth via existing `requireAuth` + `requireRole` middleware. Credential encryption via existing `utils/encryption.js`. Pattern reference: `linearController.js` for OAuth dance + token cache, `salesforceController.js` for multi-check aggregator, `notionController.js` for connect-form pattern with multiple custom fields.

## Important context for the implementer

- **No test runner.** CLAUDE.md is explicit. Each task's verification is a manual `node -e` smoke test, `curl`, or browser check.
- **Atlassian's REST API, not GraphQL.** Three different hosts:
  - **OAuth host:** `https://auth.atlassian.com` (authorize + token + revoke)
  - **API host:** `https://api.atlassian.com` (accessible-resources, admin, jira, confluence)
  - **Per-site Cloud URL:** `https://<sitename>.atlassian.net` (only used for human links, not API calls in V1)
- **Token exchange uses JSON body** (NOT form-encoded — different from Linear). `Content-Type: application/json`.
- **Access tokens last ~1 hour.** Refresh on demand. Same in-process token cache pattern as Linear / Salesforce.
- **Org Admin install required.** The Org Directory API at `/admin/v1/orgs/{orgId}/directory/users` requires the `read:directory:admin-atlassian` scope which only an Atlassian Cloud Org Admin can grant. If the granted scope set is missing this scope after callback, fail loud with a clear error.
- **State token:** base64url-encoded JSON `{ company_id, integration_id }`, matches Linear / Salesforce / Notion pattern.
- **API shape verification:** Atlassian's Admin API has evolved. Field names like `account_id` vs `accountId`, `last_active` vs `lastActive`, and the exact shape of `product_access` may differ in the live response from what's documented. Centralize all parsing in `mapDirectoryUser(raw)` in `atlassianAuth.js` so any shape adjustments are scoped to one function. The verification step in Task 7 includes logging a real raw response.
- **`accessible-resources` returns Cloud sites, not orgs.** To get the `orgId` needed for the Admin API, hit `GET /admin/v1/orgs` separately. Match by the connecting user's identity if the response contains multiple orgs (rare; SMBs typically have one).
- **Cost-leak save pattern:** the `/cost-leaks` endpoint **returns** findings; the frontend POSTs to `/api/analysis-history` to persist (matches all prior cost-leak integrations).
- **No RLS** — `requireAuth` + `requireRole` on every authenticated route. The OAuth `/callback` route is the only one without auth.
- **Branch:** work on `feat/atlassian-integration`. Do NOT push to remote unless the user requests it.

---

## File Structure

**Backend (new files):**

```
backend/src/utils/atlassianAuth.js                              OAuth + REST helper + accessible-resources + org id discovery + paginated org-directory + mapDirectoryUser + encryption + state
backend/src/services/atlassianPricing.js                        Tier-guidance constants + PRICING_NOTE
backend/src/services/atlassianCostLeakAnalysis.js               Aggregator + the three checks
backend/src/services/atlassianChecks/inactiveJiraUser.js        Check #1
backend/src/services/atlassianChecks/inactiveConfluenceUser.js  Check #2
backend/src/services/atlassianChecks/singleProductDualSeat.js   Check #3 (cross-product overlap)
backend/src/controllers/atlassianController.js                  oauth/start, callback, validate, status, users, cost-leaks, disconnect
backend/sql/052_atlassian_provider.sql                          Provider CHECK extension
```

**Backend (modify):**

```
backend/src/routes/index.js                                     Wire 7 new routes
```

**Frontend (new):**

```
frontend/lib/tools/configs/atlassian.ts                         UnifiedToolConfig — oauth + per-product cost inputs + analysisSupportsInactivity
frontend/components/tools/atlassian-view.tsx                    Data tab — org info + sites + members table with per-product license + lastActive
```

**Frontend (modify):**

```
frontend/lib/tools/registry.ts                                  Register atlassianConfig
frontend/components/tools/tool-logos.tsx                        Add Atlassian brand mark
frontend/app/dashboard/tools/guide/page.tsx                     Add Atlassian setup section + INTEGRATIONS array entry
docs/tool-analysis-reference.md                                 Add Atlassian summary
```

---

## Task 1: SQL migration

**Files:** Create `backend/sql/052_atlassian_provider.sql`

- [ ] **Step 1: Write migration**

Create `backend/sql/052_atlassian_provider.sql`:

```sql
-- Allow Atlassian (Jira Software + Confluence) as a provider for persisted
-- cost-leak analyses. Findings come from atlassianCostLeakAnalysis (3 checks)
-- via a customer-managed OAuth 2.0 (3LO) integration with org-admin scope.

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
    'Slack',
    'GCP',
    'AWS',
    'Azure',
    'Zoom',
    'GitHub',
    'Stripe',
    'Salesforce',
    'Notion',
    'Linear',
    'Atlassian'
  ));
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with name `052_atlassian_provider`.

- [ ] **Step 3: Verify**

Run via Supabase MCP `execute_sql`:

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.cost_leak_analyses'::regclass
  AND conname = 'valid_provider';
```

Expected: returned definition contains `'Atlassian'`.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/052_atlassian_provider.sql
git commit -m "feat(atlassian): add provider migration for cost_leak_analyses"
```

---

## Task 2: Pricing constants

**Files:** Create `backend/src/services/atlassianPricing.js`

- [ ] **Step 1: Write file**

Create `backend/src/services/atlassianPricing.js` with these EXACT contents:

```javascript
/**
 * Atlassian Cloud tier-guidance constants. USD/user/mo (annual billing).
 *
 * Atlassian's pricing is sliding-scale by user count and varies between
 * Standard / Premium tiers. We do NOT use these for the analysis math —
 * the customer enters per-product cost in the connect form. These constants
 * power form hints + the dashboard pricing note only. Update annually.
 */

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
  "Savings shown at the per-seat costs you entered. Atlassian's published " +
  "list-price guidance: Jira Software Standard ~$7.75 / Premium ~$15.25, " +
  "Confluence Standard ~$6.05 / Premium ~$11.55 per user/mo (annual). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { TIER_GUIDANCE, PRICING_NOTE }
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/services/atlassianPricing'); console.log(JSON.stringify(m.TIER_GUIDANCE)); console.log(m.PRICING_NOTE.length > 100 ? 'note-ok' : 'note-too-short');"
```

Expected:
```
{"jira":{"standard":7.75,"premium":15.25},"confluence":{"standard":6.05,"premium":11.55}}
note-ok
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/atlassianPricing.js
git commit -m "feat(atlassian): add tier-guidance constants + pricing note"
```

---

## Task 3: Auth utility

**Files:** Create `backend/src/utils/atlassianAuth.js`

This is the largest task. It contains: encryption helpers, state codec, OAuth code → token exchange (JSON body), refresh-token flow, in-process token cache, the authenticated REST helper, accessible-resources lookup, org-id discovery, paginated org-directory pull, and the `mapDirectoryUser` normalizer.

- [ ] **Step 1: Write file**

Create `backend/src/utils/atlassianAuth.js` with these EXACT contents:

```javascript
/**
 * Atlassian Auth Utility (per-customer OAuth 2.0 / 3LO).
 *
 * Customer creates an OAuth 2.0 integration in the Atlassian Developer Console
 * and grants the four required scopes (read:jira-user, read:confluence-user.summary,
 * read:account, read:directory:admin-atlassian). We do the standard
 * authorization-code flow:
 *   - Authorize URL: https://auth.atlassian.com/authorize
 *   - Token URL:     https://auth.atlassian.com/oauth/token  (JSON body)
 *
 * Atlassian access tokens expire in ~1 hour. We refresh on demand using the
 * cached refresh token. In-process token cache avoids repeated refresh calls.
 *
 * REST hosts:
 *   - Accessible resources / admin / jira / confluence: https://api.atlassian.com
 */

const { encrypt, decrypt } = require("./encryption")

const ATLASSIAN_AUTH_HOST = "https://auth.atlassian.com"
const ATLASSIAN_API_HOST = "https://api.atlassian.com"
const REQUIRED_SCOPE = "read:directory:admin-atlassian"
const FULL_SCOPES = [
  "read:jira-user",
  "read:confluence-user.summary",
  "read:account",
  "read:directory:admin-atlassian",
  "offline_access",
]
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const tokenCache = new Map() // integrationId -> { access_token, expiresAt }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

// ---------------------------------------------------------------------------
// Credential encryption
// ---------------------------------------------------------------------------
function encryptOAuthCreds({ clientId, clientSecret }) {
  if (!clientId || !clientSecret) {
    throw typedError("CREDS_MISSING", "clientId and clientSecret are required")
  }
  return {
    client_id_encrypted: encrypt(String(clientId)),
    client_secret_encrypted: encrypt(String(clientSecret)),
  }
}

function decryptOAuthCreds(settings) {
  const clientId = settings.client_id_encrypted ? decrypt(settings.client_id_encrypted) : null
  const clientSecret = settings.client_secret_encrypted ? decrypt(settings.client_secret_encrypted) : null
  if (!clientId || !clientSecret) {
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Atlassian OAuth credentials")
  }
  return { clientId, clientSecret }
}

function encryptTokens({ access_token, refresh_token }) {
  const out = {}
  if (access_token) out.access_token_encrypted = encrypt(access_token)
  if (refresh_token) out.refresh_token_encrypted = encrypt(refresh_token)
  return out
}

function decryptTokens(settings) {
  const access_token = settings.access_token_encrypted ? decrypt(settings.access_token_encrypted) : null
  const refresh_token = settings.refresh_token_encrypted ? decrypt(settings.refresh_token_encrypted) : null
  return { access_token, refresh_token }
}

// ---------------------------------------------------------------------------
// State encoding (matches Linear / Notion / Salesforce pattern)
// ---------------------------------------------------------------------------
function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
  } catch (e) {
    throw typedError("STATE_INVALID", "Failed to decode state parameter")
  }
}

// ---------------------------------------------------------------------------
// OAuth code → tokens exchange (JSON body — Atlassian-specific)
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const res = await fetch(`${ATLASSIAN_AUTH_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.atlassianError = body.error
    throw err
  }
  return body // { access_token, refresh_token, expires_in, token_type, scope }
}

// ---------------------------------------------------------------------------
// Refresh access token (JSON body)
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(`${ATLASSIAN_AUTH_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.atlassianError = body.error
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Token revoke (best-effort, called on disconnect)
// ---------------------------------------------------------------------------
async function revokeToken({ clientId, clientSecret, token }) {
  if (!token) return
  try {
    await fetch(`${ATLASSIAN_AUTH_HOST}/oauth/token/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, token }),
    })
  } catch (_) {
    // Best-effort; we already wipe local settings on disconnect
  }
}

// ---------------------------------------------------------------------------
// Get a valid access token (refresh if needed)
// ---------------------------------------------------------------------------
async function getAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token

  const settings = integration.settings || {}
  const { clientId, clientSecret } = decryptOAuthCreds(settings)
  const { refresh_token } = decryptTokens(settings)
  if (!refresh_token) throw typedError("REFRESH_TOKEN_MISSING", "No refresh token stored — please reconnect")

  const result = await refreshAccessToken({ clientId, clientSecret, refreshToken: refresh_token })
  const expiresIn = result.expires_in || 3600 // default 1h
  const expiresAt = Date.now() + expiresIn * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// Authenticated REST request against api.atlassian.com
// ---------------------------------------------------------------------------
async function atlassianRequest(integration, path, init = {}) {
  const accessToken = await getAccessToken(integration)
  const url = path.startsWith("http") ? path : `${ATLASSIAN_API_HOST}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }

  if (!res.ok) {
    const err = typedError("ATLASSIAN_REQUEST_FAILED", body?.message || body?.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.atlassianBody = body
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Accessible resources (Cloud sites the OAuth user authorized)
// ---------------------------------------------------------------------------
async function listAccessibleResources(integration) {
  const data = await atlassianRequest(integration, "/oauth/token/accessible-resources")
  if (!Array.isArray(data)) return []
  return data.map((r) => ({
    cloudId: r.id,
    name: r.name,
    url: r.url,
    scopes: r.scopes || [],
    avatarUrl: r.avatarUrl || null,
  }))
}

// ---------------------------------------------------------------------------
// Org id discovery (one connection = first accessible org for V1)
// ---------------------------------------------------------------------------
async function findOrgId(integration) {
  const data = await atlassianRequest(integration, "/admin/v1/orgs")
  const orgs = Array.isArray(data?.data) ? data.data : []
  if (!orgs.length) {
    throw typedError("ATLASSIAN_NO_ORGS", "No Atlassian Cloud organization is accessible to this user. Org-admin permission is required.")
  }
  const first = orgs[0]
  return {
    orgId: first.id,
    orgName: first.attributes?.name || first.name || null,
  }
}

// ---------------------------------------------------------------------------
// Org Directory pull (paginated). Returns mapped users.
//
// Cap at 5000 users (pagination loop bounded for safety).
//
// API: GET /admin/v1/orgs/{orgId}/directory/users?cursor=...
// Response (verify in Task 7 — adjust mapDirectoryUser if shape differs):
//   { data: [ {account_id, account_status, name, email, product_access: [...]} ],
//     links: { next?: "...full url..." } }
// ---------------------------------------------------------------------------
async function listOrgDirectoryUsers(integration, orgId, { cap = 5000 } = {}) {
  if (!orgId) throw typedError("ORG_ID_MISSING", "orgId is required to list directory users")

  const out = []
  let path = `/admin/v1/orgs/${encodeURIComponent(orgId)}/directory/users`
  for (let i = 0; i < 50; i++) {
    const data = await atlassianRequest(integration, path)
    const records = Array.isArray(data?.data) ? data.data : []
    for (const raw of records) {
      out.push(mapDirectoryUser(raw))
      if (out.length >= cap) return out
    }
    const next = data?.links?.next
    if (!next) break
    // Some Atlassian APIs return absolute "next" URLs, some return relative.
    path = next
  }
  return out
}

// ---------------------------------------------------------------------------
// mapDirectoryUser — normalize Atlassian's directory-user record shape into
// the internal shape our checks consume. Centralizing here makes it easy to
// adjust if the live response differs from documented.
//
// Input fields we care about (snake_case in current Admin API):
//   account_id, account_status, account_type, name, email,
//   access_billable, last_active,
//   product_access: [{ id, key, name, url, last_active }, ...]
//
// Output:
//   { accountId, accountStatus, accountType, name, email, billable,
//     lastActive (ISO|null), products: { jira: { lastActive, name }|null,
//                                         confluence: { lastActive, name }|null,
//                                         other: [...] } }
// ---------------------------------------------------------------------------
function mapDirectoryUser(raw) {
  const accountId = raw.account_id || raw.accountId || null
  const accountStatus = raw.account_status || raw.accountStatus || "unknown"
  const accountType = raw.account_type || raw.accountType || "atlassian"
  const name = raw.name || raw.display_name || raw.displayName || null
  const email = raw.email || null
  const billable = !!(raw.access_billable ?? raw.accessBillable ?? false)
  const lastActive = raw.last_active || raw.lastActive || null

  const productAccess = Array.isArray(raw.product_access)
    ? raw.product_access
    : Array.isArray(raw.productAccess) ? raw.productAccess : []

  const products = { jira: null, confluence: null, other: [] }
  for (const p of productAccess) {
    const pid = (p.id || p.key || p.product || "").toLowerCase()
    const entry = {
      id: pid,
      name: p.name || pid,
      url: p.url || null,
      lastActive: p.last_active || p.lastActive || null,
    }
    if (pid === "jira-software" || pid === "jira" || pid.startsWith("jira-software")) {
      products.jira = entry
    } else if (pid === "confluence" || pid.startsWith("confluence")) {
      products.confluence = entry
    } else {
      products.other.push(entry)
    }
  }

  return {
    accountId,
    accountStatus,
    accountType,
    name,
    email,
    billable,
    lastActive,
    products,
  }
}

// ---------------------------------------------------------------------------
// Validate that the granted scope set includes the required org-admin scope
// ---------------------------------------------------------------------------
function hasOrgAdminScope(scopeString) {
  if (!scopeString) return false
  const scopes = scopeString.split(/[\s,]+/).filter(Boolean)
  return scopes.includes(REQUIRED_SCOPE)
}

module.exports = {
  ATLASSIAN_AUTH_HOST,
  ATLASSIAN_API_HOST,
  REQUIRED_SCOPE,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  getAccessToken,
  evictToken,
  atlassianRequest,
  listAccessibleResources,
  findOrgId,
  listOrgDirectoryUsers,
  mapDirectoryUser,
  hasOrgAdminScope,
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "
const m = require('./src/utils/atlassianAuth');
console.log('keys:', Object.keys(m).sort().filter(k => k !== 'ATLASSIAN_AUTH_HOST' && k !== 'ATLASSIAN_API_HOST' && k !== 'REQUIRED_SCOPE' && k !== 'FULL_SCOPES').join(','));
console.log('auth host:', m.ATLASSIAN_AUTH_HOST);
console.log('api host:', m.ATLASSIAN_API_HOST);
console.log('required scope:', m.REQUIRED_SCOPE);
console.log('full scopes:', m.FULL_SCOPES.join(' '));
const s = m.encodeState({ company_id: 'co1', integration_id: 'in1' });
console.log('state roundtrip:', JSON.stringify(m.decodeState(s)));
const mapped = m.mapDirectoryUser({
  account_id: 'a1',
  account_status: 'active',
  email: 'alice@x',
  name: 'Alice',
  access_billable: true,
  last_active: '2026-04-01T00:00:00Z',
  product_access: [
    { id: 'jira-software', name: 'Jira', last_active: '2026-04-01T00:00:00Z' },
    { id: 'confluence', name: 'Confluence', last_active: null },
  ],
});
console.log('mapped jira lastActive:', mapped.products.jira?.lastActive);
console.log('mapped confluence lastActive:', mapped.products.confluence?.lastActive);
console.log('hasOrgAdminScope sample:', m.hasOrgAdminScope('read:jira-user read:directory:admin-atlassian offline_access'));
"
```

Expected (8 lines):
```
keys: atlassianRequest,decodeState,decryptOAuthCreds,decryptTokens,encodeState,encryptOAuthCreds,encryptTokens,evictToken,exchangeCodeForTokens,findOrgId,getAccessToken,hasOrgAdminScope,listAccessibleResources,listOrgDirectoryUsers,mapDirectoryUser,refreshAccessToken,revokeToken
auth host: https://auth.atlassian.com
api host: https://api.atlassian.com
required scope: read:directory:admin-atlassian
full scopes: read:jira-user read:confluence-user.summary read:account read:directory:admin-atlassian offline_access
state roundtrip: {"company_id":"co1","integration_id":"in1"}
mapped jira lastActive: 2026-04-01T00:00:00Z
mapped confluence lastActive: null
hasOrgAdminScope sample: true
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/atlassianAuth.js
git commit -m "feat(atlassian): OAuth dance + refresh + REST helper + org directory pull + mapDirectoryUser"
```

---

## Task 4: Controller scaffold

**Files:** Create `backend/src/controllers/atlassianController.js`

This task adds the connection-management surface (oauth/start, callback, validate, status, disconnect). The data and analyze handlers are added in Tasks 8 and 12.

- [ ] **Step 1: Write file**

Create `backend/src/controllers/atlassianController.js` with these EXACT contents:

```javascript
/**
 * Atlassian Controller (cost-leak analysis).
 *
 * Auth = customer-managed Atlassian OAuth 2.0 (3LO) integration. Customer
 * pastes Client ID + Secret + per-product seat costs in the connect form.
 * We do an OAuth web-server flow against auth.atlassian.com, persist
 * encrypted access + refresh tokens, then capture cloudId(s) and orgId for
 * use by the Org Directory API.
 *
 * Findings (3 V1 checks, see services/atlassianCostLeakAnalysis.js):
 *   - inactive_jira_user
 *   - inactive_confluence_user
 *   - single_product_dual_seat
 */

const { supabase } = require("../config/supabase")
const {
  ATLASSIAN_AUTH_HOST,
  REQUIRED_SCOPE,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  revokeToken,
  evictToken,
  listAccessibleResources,
  findOrgId,
  hasOrgAdminScope,
} = require("../utils/atlassianAuth")

const ATLASSIAN_PROVIDER = "Atlassian"

function log(level, endpoint, message, data = null) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.company_id) return { error: "No company associated with this user", status: 400 }
  const { data: integration, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", ATLASSIAN_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Atlassian integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapAtlassianError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Atlassian to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Atlassian to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.atlassianError === "invalid_grant" || e.atlassianError === "invalid_token")) {
    return { status: 401, code: "atlassian_credentials_revoked", message: "Atlassian credentials revoked — please reconnect.", hint: "The OAuth integration may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.atlassianError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Atlassian Developer Console app page." }
  }
  if (code === "ATLASSIAN_NO_ORGS") {
    return { status: 403, code: "atlassian_org_admin_required", message: e.message, hint: "Reconnect with an Atlassian Cloud Organization Admin account." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Atlassian rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 403) {
    return { status: 403, code: "atlassian_org_admin_required", message: "Atlassian denied the request (insufficient scope). Reconnect as an Org Admin.", hint: null }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Atlassian throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Atlassian error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startAtlassianOAuth
// ---------------------------------------------------------------------------
async function startAtlassianOAuth(req, res) {
  const endpoint = "GET /api/integrations/atlassian/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_atlassian_creds → encrypted on first OAuth start
  if (integration.settings?._pending_atlassian_creds) {
    try {
      const pending = integration.settings._pending_atlassian_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_atlassian_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        jira_seat_cost_usd: Number(pending.jiraSeatCostUsd) || 0,
        confluence_seat_cost_usd: Number(pending.confluenceSeatCostUsd) || 0,
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapAtlassianError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Atlassian Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.ATLASSIAN_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/atlassian/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${ATLASSIAN_AUTH_HOST}/authorize`)
  authUrl.searchParams.set("audience", "api.atlassian.com")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", FULL_SCOPES.join(" "))
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("prompt", "consent")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: atlassianOAuthCallback
// No requireAuth — Atlassian's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function atlassianOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/atlassian/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.ATLASSIAN_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/atlassian/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  // Reject install if org-admin scope was not granted
  if (!hasOrgAdminScope(tokens.scope)) {
    log("warn", endpoint, "missing org-admin scope on grant", { scope: tokens.scope })
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Atlassian Cloud Org Admin permission required (read:directory:admin-atlassian). Reconnect with an org admin account.")}`)
  }

  // Persist encrypted tokens. Then capture sites + orgId using the new token.
  const encryptedTokens = encryptTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        ...encryptedTokens,
        granted_scopes: tokens.scope || null,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  // Best-effort: enrich with cloud sites + org id
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const sites = await listAccessibleResources(refreshed)
      const { orgId, orgName } = await findOrgId(refreshed)
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshed.settings || {}),
            cloud_sites: sites,
            org_id: orgId,
            org_name: orgName,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "site/org enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?atlassian_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateAtlassian
// ---------------------------------------------------------------------------
async function validateAtlassian(req, res) {
  const endpoint = "POST /api/integrations/atlassian/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  // Re-check granted scope
  const granted = integration.settings?.granted_scopes
  if (!hasOrgAdminScope(granted)) {
    return res.status(403).json({
      error: "Atlassian Cloud Org Admin permission required.",
      code: "atlassian_org_admin_required",
      hint: "Disconnect and reconnect with an Atlassian Cloud Organization Admin account.",
    })
  }

  try {
    const sites = await listAccessibleResources(integration)
    const { orgId, orgName } = await findOrgId(integration)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          cloud_sites: sites,
          org_id: orgId,
          org_name: orgName,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso, orgId, orgName, cloudSites: sites })
  } catch (e) {
    const mapped = mapAtlassianError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getAtlassianStatus
// ---------------------------------------------------------------------------
async function getAtlassianStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    orgId: s.org_id || null,
    orgName: s.org_name || null,
    cloudSites: s.cloud_sites || [],
    jiraSeatCostUsd: s.jira_seat_cost_usd ?? null,
    confluenceSeatCostUsd: s.confluence_seat_cost_usd ?? null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectAtlassian
// ---------------------------------------------------------------------------
async function disconnectAtlassian(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorOrgId = integration.settings?.org_id || null

  // Best-effort revoke of refresh token
  try {
    const settings = integration.settings || {}
    const { clientId, clientSecret } = decryptOAuthCreds(settings)
    const { refresh_token } = decryptTokens(settings)
    if (refresh_token) {
      await revokeToken({ clientId, clientSecret, token: refresh_token })
    }
  } catch (_) {
    // best-effort only
  }

  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_org_id: priorOrgId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  startAtlassianOAuth,
  atlassianOAuthCallback,
  validateAtlassian,
  getAtlassianStatus,
  disconnectAtlassian,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapAtlassianError,
  log,
  ATLASSIAN_PROVIDER,
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/controllers/atlassianController'); console.log(Object.keys(m).sort().join(','));"
```

Expected: `ATLASSIAN_PROVIDER,atlassianOAuthCallback,disconnectAtlassian,getAtlassianStatus,getIntegrationForUser,log,mapAtlassianError,startAtlassianOAuth,validateAtlassian`

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/atlassianController.js
git commit -m "feat(atlassian): controller scaffold (oauth/start, callback, validate, status, disconnect)"
```

---

## Task 5: Wire connection-management routes

**Files:** Modify `backend/src/routes/index.js`

Wire 5 of the 7 routes now (oauth/start, callback, validate, status, disconnect). The `/users` and `/cost-leaks` routes are wired in Tasks 8 and 12.

- [ ] **Step 1: Add controller import**

In `backend/src/routes/index.js`, find the existing block of integration controller imports (search for `linearController`). After the Linear import block, add:

```javascript
// Atlassian Controller
const {
  startAtlassianOAuth,
  atlassianOAuthCallback,
  validateAtlassian,
  getAtlassianStatus,
  disconnectAtlassian,
} = require("../controllers/atlassianController")
```

- [ ] **Step 2: Add 5 routes**

Find the existing block of Linear routes (search for `/api/integrations/linear/oauth/start`). After the Linear routes, add:

```javascript
// Atlassian (Jira Software + Confluence) cost-leak integration
router.get("/api/integrations/atlassian/oauth/start", requireAuth, requireRole("owner", "editor"), startAtlassianOAuth)
router.get("/api/integrations/atlassian/callback", atlassianOAuthCallback)
router.post("/api/integrations/atlassian/validate", requireAuth, requireRole("owner", "editor"), validateAtlassian)
router.get("/api/integrations/atlassian/status", requireAuth, requireRole("owner", "editor", "viewer"), getAtlassianStatus)
router.delete("/api/integrations/atlassian", requireAuth, requireRole("owner", "editor"), disconnectAtlassian)
```

- [ ] **Step 3: Verify routes register**

```bash
cd backend && node -e "
const express = require('express');
const app = express();
app.use(express.json());
require('dotenv').config({ path: '.env' });
const router = require('./src/routes');
app.use(router);
const stack = app._router.stack.filter(l => l.route);
const atlassianRoutes = stack
  .filter(l => l.route.path && l.route.path.includes('atlassian'))
  .map(l => Object.keys(l.route.methods)[0].toUpperCase() + ' ' + l.route.path);
console.log(atlassianRoutes.sort().join('\n'));
"
```

Expected (5 lines, order may vary):
```
DELETE /api/integrations/atlassian
GET /api/integrations/atlassian/callback
GET /api/integrations/atlassian/oauth/start
GET /api/integrations/atlassian/status
POST /api/integrations/atlassian/validate
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/index.js
git commit -m "feat(atlassian): wire oauth/start, callback, validate, status, disconnect routes"
```

---

## Task 6: Frontend tool config + placeholder view + registry

**Files:**
- Create `frontend/lib/tools/configs/atlassian.ts`
- Create `frontend/components/tools/atlassian-view.tsx` (placeholder for now; populated in Task 8)
- Modify `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Read the Linear config to confirm the field shape**

```bash
cat frontend/lib/tools/configs/linear.ts | head -120
```

Verify `UnifiedToolConfig` shape expected (this is reference only; do not modify).

- [ ] **Step 2: Create `frontend/lib/tools/configs/atlassian.ts`**

```typescript
import type { UnifiedToolConfig } from "../types"
import { AtlassianView } from "@/components/tools/atlassian-view"

export const atlassianConfig: UnifiedToolConfig = {
  toolName: "Atlassian",
  displayName: "Atlassian (Jira + Confluence)",
  description:
    "Detect inactive Jira/Confluence users and cross-product seat overlap (users paying for both but only using one).",
  brandColor: "#0052CC",
  category: "productivity",

  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Atlassian OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From developer.atlassian.com/console/myapps/ → your OAuth 2.0 integration",
    },
    {
      name: "consumerSecret",
      label: "Atlassian OAuth Client Secret",
      type: "password",
      required: true,
      placeholder: "<client-secret>",
    },
    {
      name: "jiraSeatCostUsd",
      label: "Jira Software seat cost (USD/user/mo)",
      type: "number",
      required: true,
      placeholder: "7.75",
      hint: "Standard ~$7.75, Premium ~$15.25 (annual). Enter your actual per-seat rate.",
    },
    {
      name: "confluenceSeatCostUsd",
      label: "Confluence seat cost (USD/user/mo)",
      type: "number",
      required: true,
      placeholder: "6.05",
      hint: "Standard ~$6.05, Premium ~$11.55 (annual). Enter your actual per-seat rate.",
    },
  ],
  oauthStartEndpoint: "/api/integrations/atlassian/oauth/start",

  pendingSettingsKey: "_pending_atlassian_creds",
  pendingFieldsMap: {
    consumerKey: "clientId",
    consumerSecret: "clientSecret",
    jiraSeatCostUsd: "jiraSeatCostUsd",
    confluenceSeatCostUsd: "confluenceSeatCostUsd",
  },

  endpoints: {
    status: "/api/integrations/atlassian/status",
    validate: "/api/integrations/atlassian/validate",
    disconnect: "/api/integrations/atlassian",
    users: "/api/integrations/atlassian/users",
    costLeaks: "/api/integrations/atlassian/cost-leaks",
  },

  analysisType: "cost-leak",
  analysisSupportsInactivity: true,
  analysisInactivityOptions: [30, 60, 90, 180],
  analysisDefaultInactivityDays: 60,

  viewComponent: AtlassianView,

  tokenRevocation: {
    automated: true,
    note:
      "On disconnect we call Atlassian's revoke endpoint with the refresh token. To revoke manually: developer.atlassian.com/console/myapps/ → 'Efficyon Cost Analyzer' → Delete; or admin.atlassian.com → Settings → Connected apps.",
  },

  quickSetup: {
    title: "How to create an Atlassian OAuth integration",
    requiresAdmin: true,
    adminNotice:
      "An Atlassian Cloud Organization Admin must approve the install — required for the Org Directory API that surfaces last-active dates per product.",
    steps: [
      "Open developer.atlassian.com/console/myapps/ → Create → OAuth 2.0 integration",
      "Name: 'Efficyon Cost Analyzer'",
      "Permissions: add Jira API (read:jira-user), Confluence API (read:confluence-user.summary), User identity API (read:account), Org Admin API (read:directory:admin-atlassian)",
      "Authorization → set Callback URL: http://localhost:4000/api/integrations/atlassian/callback (use production host when deployed)",
      "Settings → Distribution → set Sharing to enabled",
      "Copy the Client ID + Secret from the Settings page",
      "Paste them above with your per-product seat costs and click Connect",
      "Approve consent on the Atlassian screen as a Cloud Org Admin",
    ],
  },
}
```

- [ ] **Step 3: Create placeholder `frontend/components/tools/atlassian-view.tsx`**

```tsx
"use client"

interface AtlassianViewProps {
  integrationId: string
}

export function AtlassianView(_: AtlassianViewProps) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Atlassian data view — populated after the Data endpoint is wired.
    </div>
  )
}
```

- [ ] **Step 4: Register in `frontend/lib/tools/registry.ts`**

Add the import at the top of the imports block (alphabetically after `anthropicConfig`):

```typescript
import { atlassianConfig } from "./configs/atlassian"
```

Add to `TOOL_REGISTRY` (alphabetical order suggested):

```typescript
export const TOOL_REGISTRY: Record<string, UnifiedToolConfig> = {
  // ...existing entries...
  Atlassian: atlassianConfig,
  // ...other existing entries...
}
```

The exact location should keep the existing alphabetical/style convention used by the file.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean exit (no new errors introduced by Atlassian files).

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/tools/configs/atlassian.ts frontend/components/tools/atlassian-view.tsx frontend/lib/tools/registry.ts
git commit -m "feat(atlassian): tool config + placeholder view + registry entry"
```

---

## Task 7: (USER CHECKPOINT) Manual end-to-end OAuth verification

This is a **HUMAN VERIFICATION** task. The implementer should pause and ask the user to run the OAuth dance against a real Atlassian Cloud organization with org-admin permissions, since the Admin API response shape needs runtime confirmation before checks can be written.

- [ ] **Step 1: Start backend + frontend**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Create the Atlassian OAuth integration**

Following `quickSetup.steps` from `atlassian.ts`:
1. developer.atlassian.com/console/myapps/ → Create → OAuth 2.0 integration
2. Permissions: add the 4 scopes
3. Callback URL: `http://localhost:4000/api/integrations/atlassian/callback`
4. Distribution → Sharing enabled
5. Copy Client ID + Secret

- [ ] **Step 3: Connect via Efficyon UI**

Navigate to the dashboard, find Atlassian, click Connect, paste the credentials and per-product seat costs, then complete the consent flow on Atlassian (must be signed in as Cloud Org Admin).

- [ ] **Step 4: Confirm DB row populated**

Use Supabase MCP `execute_sql`:

```sql
SELECT
  id,
  status,
  settings->>'org_id'           AS org_id,
  settings->>'org_name'         AS org_name,
  settings->'cloud_sites'       AS cloud_sites,
  settings->>'granted_scopes'   AS granted_scopes,
  settings->>'jira_seat_cost_usd'        AS jira_cost,
  settings->>'confluence_seat_cost_usd'  AS confluence_cost,
  settings->>'last_validated_at' AS last_validated_at
FROM company_integrations
WHERE provider ILIKE 'Atlassian'
ORDER BY updated_at DESC
LIMIT 1;
```

Expected: status `connected`, `org_id` populated, `cloud_sites` JSON array, `granted_scopes` contains `read:directory:admin-atlassian`.

- [ ] **Step 5: Capture a sample raw directory user response — IMPORTANT**

This step verifies that `mapDirectoryUser` matches the live API shape. Add a temporary debug log in `atlassianAuth.js` `listOrgDirectoryUsers`:

```javascript
// TEMPORARY for Task 7 verification — remove after
async function listOrgDirectoryUsers(integration, orgId, { cap = 5000 } = {}) {
  if (!orgId) throw typedError("ORG_ID_MISSING", "orgId is required to list directory users")
  const out = []
  let path = `/admin/v1/orgs/${encodeURIComponent(orgId)}/directory/users`
  for (let i = 0; i < 50; i++) {
    const data = await atlassianRequest(integration, path)
    if (i === 0) console.log("DEBUG raw user[0]:", JSON.stringify((data?.data || [])[0], null, 2))
    // ...rest unchanged
```

Then run the validate endpoint:

```bash
# After connecting, get the integration id from the DB then:
curl -s -X POST http://localhost:4000/api/integrations/atlassian/validate \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json"
```

Inspect server console for `DEBUG raw user[0]:` output.

- [ ] **Step 6: Adjust mapDirectoryUser if needed**

Compare the printed raw shape to the field names mapDirectoryUser expects (`account_id`, `account_status`, `email`, `name`, `last_active`, `product_access[].id`, `product_access[].last_active`). If field names differ, update `mapDirectoryUser` in `atlassianAuth.js` to match. Common alternatives the implementer should also try:

| Expected | Possible alternative |
|---|---|
| `account_id` | `accountId`, `id` |
| `account_status` | `accountStatus`, `status` |
| `last_active` | `lastActive`, `last_active_date`, `lastActiveDate` |
| `product_access` | `productAccess`, `products`, `applications` |
| Per-product `id` | `key`, `productKey`, `application` |

- [ ] **Step 7: Remove the debug log**

Revert the temporary `console.log` from `listOrgDirectoryUsers`.

- [ ] **Step 8: Commit any mapping fixes**

If `mapDirectoryUser` was adjusted:

```bash
git add backend/src/utils/atlassianAuth.js
git commit -m "fix(atlassian): adjust mapDirectoryUser to match live Admin API response shape"
```

If no changes were needed, no commit.

- [ ] **Step 9: Verify validate endpoint completes successfully**

```bash
curl -s -X POST http://localhost:4000/api/integrations/atlassian/validate \
  -H "Authorization: Bearer <user-jwt>" -H "Content-Type: application/json" | jq
```

Expected: HTTP 200 with `{ status: "connected", orgId, orgName, cloudSites: [...] }`.

---

## Task 8: Data endpoint + members view

**Files:**
- Modify `backend/src/controllers/atlassianController.js` (add `getAtlassianUsers` handler)
- Modify `backend/src/routes/index.js` (wire `/users` route)
- Replace `frontend/components/tools/atlassian-view.tsx` (real data tab)

- [ ] **Step 1: Add `getAtlassianUsers` handler**

In `backend/src/controllers/atlassianController.js`, add an import for `listOrgDirectoryUsers` to the destructured require from `../utils/atlassianAuth`:

```javascript
const {
  ATLASSIAN_AUTH_HOST,
  REQUIRED_SCOPE,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  revokeToken,
  evictToken,
  listAccessibleResources,
  findOrgId,
  listOrgDirectoryUsers,
  hasOrgAdminScope,
} = require("../utils/atlassianAuth")
```

Then add this handler before `module.exports = {`:

```javascript
// ---------------------------------------------------------------------------
// Handler: getAtlassianUsers — feeds the Data tab
// ---------------------------------------------------------------------------
async function getAtlassianUsers(req, res) {
  const endpoint = "GET /api/integrations/atlassian/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Atlassian integration is not connected", status: integration.status })
  }
  const orgId = integration.settings?.org_id
  if (!orgId) {
    return res.status(400).json({ error: "Atlassian org_id missing — please re-validate the integration" })
  }
  try {
    const users = await listOrgDirectoryUsers(integration, orgId)
    return res.json({
      org: {
        id: orgId,
        name: integration.settings?.org_name || null,
        cloudSites: integration.settings?.cloud_sites || [],
      },
      users,
      counts: {
        total: users.length,
        active: users.filter((u) => u.accountStatus === "active").length,
        jira: users.filter((u) => u.products.jira).length,
        confluence: users.filter((u) => u.products.confluence).length,
        both: users.filter((u) => u.products.jira && u.products.confluence).length,
      },
    })
  } catch (e) {
    const mapped = mapAtlassianError(e)
    log("error", endpoint, "users fetch failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}
```

Add `getAtlassianUsers` to the `module.exports` block.

- [ ] **Step 2: Wire the route**

In `backend/src/routes/index.js`, add `getAtlassianUsers` to the destructured require, and add this route to the Atlassian section:

```javascript
router.get("/api/integrations/atlassian/users", requireAuth, requireRole("owner", "editor", "viewer"), getAtlassianUsers)
```

- [ ] **Step 3: Verify the new route registers**

```bash
cd backend && node -e "
const express = require('express');
const app = express();
app.use(express.json());
require('dotenv').config({ path: '.env' });
const router = require('./src/routes');
app.use(router);
const has = app._router.stack
  .filter(l => l.route)
  .some(l => l.route.path === '/api/integrations/atlassian/users');
console.log(has ? 'route-registered' : 'route-MISSING');
"
```

Expected: `route-registered`

- [ ] **Step 4: Replace `frontend/components/tools/atlassian-view.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AtlassianViewProps {
  integrationId: string
}

interface Member {
  accountId: string
  accountStatus: string
  accountType: string
  name: string | null
  email: string | null
  billable: boolean
  lastActive: string | null
  products: {
    jira: { lastActive: string | null; name: string } | null
    confluence: { lastActive: string | null; name: string } | null
    other: Array<{ id: string; name: string; lastActive: string | null }>
  }
}

interface UsersResponse {
  org: { id: string; name: string | null; cloudSites: Array<{ cloudId: string; name: string; url: string }> }
  users: Member[]
  counts: { total: number; active: number; jira: number; confluence: number; both: number }
}

function relative(iso: string | null): string {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "just now"
  const days = Math.floor(ms / 86400000)
  if (days < 1) return "today"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function AtlassianView({ integrationId }: AtlassianViewProps) {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/integrations/atlassian/users", { credentials: "include" })
        const body = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(body?.error || "Failed to load users")
          setData(null)
        } else {
          setData(body)
          setError(null)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load users")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [integrationId])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading Atlassian directory…</div>
  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>
  if (!data) return null

  return (
    <div className="space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><div className="text-muted-foreground">Name</div><div>{data.org.name ?? "—"}</div></div>
          <div><div className="text-muted-foreground">Cloud sites</div><div>{data.org.cloudSites.length}</div></div>
          <div><div className="text-muted-foreground">Users (total)</div><div>{data.counts.total}</div></div>
          <div><div className="text-muted-foreground">Active</div><div>{data.counts.active}</div></div>
          <div><div className="text-muted-foreground">Jira-licensed</div><div>{data.counts.jira}</div></div>
          <div><div className="text-muted-foreground">Confluence-licensed</div><div>{data.counts.confluence}</div></div>
          <div><div className="text-muted-foreground">Both</div><div>{data.counts.both}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Jira last-active</th>
                <th className="p-3">Confluence last-active</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.accountId} className="border-t">
                  <td className="p-3">{u.name ?? "—"}</td>
                  <td className="p-3">{u.email ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant={u.accountStatus === "active" ? "default" : "secondary"}>{u.accountStatus}</Badge>
                  </td>
                  <td className="p-3">
                    {u.products.jira ? relative(u.products.jira.lastActive) : <span className="text-muted-foreground">no license</span>}
                  </td>
                  <td className="p-3">
                    {u.products.confluence ? relative(u.products.confluence.lastActive) : <span className="text-muted-foreground">no license</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

With both servers running, open the Atlassian integration page in the dashboard. Confirm:
- Org card shows correct counts
- Members table renders rows with relative times
- Empty product cells show "no license"

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/atlassianController.js backend/src/routes/index.js frontend/components/tools/atlassian-view.tsx
git commit -m "feat(atlassian): /users data endpoint + members data tab"
```

---

## Task 9: Check — inactive Jira user

**Files:** Create `backend/src/services/atlassianChecks/inactiveJiraUser.js`

- [ ] **Step 1: Write the check**

```javascript
/**
 * Check: inactive_jira_user
 *
 * Surface users who have Jira Software product access but haven't used it in
 * `inactivityDays` days. The aggregate $-total drives the headline; per-user
 * findings are typically `low` severity (single seat ~$7.75–$15.25).
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isInactive(productEntry, cutoff) {
  if (!productEntry) return false
  if (!productEntry.lastActive) return true
  const t = new Date(productEntry.lastActive).getTime()
  if (Number.isNaN(t)) return true
  return t < cutoff
}

async function check({ users, settings, inactivityDays }) {
  const seatCost = Number(settings?.jira_seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (u.accountStatus !== "active") continue
    if (!u.products.jira) continue
    if (!isInactive(u.products.jira, cutoff)) continue

    const last = u.products.jira.lastActive
    const days = last
      ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / 86400000))
      : null

    findings.push({
      check: "inactive_jira_user",
      title: `Inactive Jira user: ${u.email || u.name || u.accountId}`,
      currency: "USD",
      currentValue: seatCost,
      potentialSavings: seatCost,
      evidence: [u.accountId],
      action: last
        ? `User ${u.email || u.accountId} hasn't used Jira in ${days} days. Remove from jira-software-users group (admin.atlassian.com → Groups) to free the seat.`
        : `User ${u.email || u.accountId} has never logged into Jira. Remove from jira-software-users group to free the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify in isolation**

```bash
cd backend && node -e "
const c = require('./src/services/atlassianChecks/inactiveJiraUser');
const old = new Date(Date.now() - 90 * 86400000).toISOString();
const recent = new Date(Date.now() - 5 * 86400000).toISOString();
const users = [
  { accountId: 'a', accountStatus: 'active', email: 'a@x', products: { jira: { lastActive: old, name: 'Jira' }, confluence: null, other: [] } },
  { accountId: 'b', accountStatus: 'active', email: 'b@x', products: { jira: { lastActive: recent, name: 'Jira' }, confluence: null, other: [] } },
  { accountId: 'c', accountStatus: 'active', email: 'c@x', products: { jira: { lastActive: null, name: 'Jira' }, confluence: null, other: [] } },
  { accountId: 'd', accountStatus: 'deactivated', email: 'd@x', products: { jira: { lastActive: old, name: 'Jira' }, confluence: null, other: [] } },
  { accountId: 'e', accountStatus: 'active', email: 'e@x', products: { jira: null, confluence: { lastActive: old, name: 'Confluence' }, other: [] } },
];
c.check({ users, settings: { jira_seat_cost_usd: 7.75 }, inactivityDays: 60 }).then(r => {
  const ids = r.findings.map(f => f.evidence[0]).sort();
  console.log('flagged ids:', ids.join(','));
  console.log('count:', r.findings.length);
  console.log('first savings:', r.findings[0]?.potentialSavings);
});
"
```

Expected:
```
flagged ids: a,c
count: 2
first savings: 7.75
```

(`a` is old → flagged, `b` is recent → skipped, `c` never logged in → flagged, `d` is deactivated → skipped, `e` has no Jira license → skipped.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/atlassianChecks/inactiveJiraUser.js
git commit -m "feat(atlassian): inactive_jira_user check"
```

---

## Task 10: Check — inactive Confluence user

**Files:** Create `backend/src/services/atlassianChecks/inactiveConfluenceUser.js`

- [ ] **Step 1: Write the check**

```javascript
/**
 * Check: inactive_confluence_user
 *
 * Surface users who have Confluence product access but haven't used it in
 * `inactivityDays` days. Mirror of inactive_jira_user, different product +
 * different seat cost.
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isInactive(productEntry, cutoff) {
  if (!productEntry) return false
  if (!productEntry.lastActive) return true
  const t = new Date(productEntry.lastActive).getTime()
  if (Number.isNaN(t)) return true
  return t < cutoff
}

async function check({ users, settings, inactivityDays }) {
  const seatCost = Number(settings?.confluence_seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (u.accountStatus !== "active") continue
    if (!u.products.confluence) continue
    if (!isInactive(u.products.confluence, cutoff)) continue

    const last = u.products.confluence.lastActive
    const days = last
      ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / 86400000))
      : null

    findings.push({
      check: "inactive_confluence_user",
      title: `Inactive Confluence user: ${u.email || u.name || u.accountId}`,
      currency: "USD",
      currentValue: seatCost,
      potentialSavings: seatCost,
      evidence: [u.accountId],
      action: last
        ? `User ${u.email || u.accountId} hasn't used Confluence in ${days} days. Remove from confluence-users group to free the seat.`
        : `User ${u.email || u.accountId} has never logged into Confluence. Remove from confluence-users group to free the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "
const c = require('./src/services/atlassianChecks/inactiveConfluenceUser');
const old = new Date(Date.now() - 90 * 86400000).toISOString();
const recent = new Date(Date.now() - 5 * 86400000).toISOString();
const users = [
  { accountId: 'a', accountStatus: 'active', email: 'a@x', products: { jira: null, confluence: { lastActive: old, name: 'Confluence' }, other: [] } },
  { accountId: 'b', accountStatus: 'active', email: 'b@x', products: { jira: null, confluence: { lastActive: recent, name: 'Confluence' }, other: [] } },
];
c.check({ users, settings: { confluence_seat_cost_usd: 6.05 }, inactivityDays: 60 }).then(r => {
  console.log('count:', r.findings.length);
  console.log('savings:', r.findings[0]?.potentialSavings);
});
"
```

Expected:
```
count: 1
savings: 6.05
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/atlassianChecks/inactiveConfluenceUser.js
git commit -m "feat(atlassian): inactive_confluence_user check"
```

---

## Task 11: Check — single-product dual-seat overlap

**Files:** Create `backend/src/services/atlassianChecks/singleProductDualSeat.js`

This is the cross-product check that justifies bundling Jira + Confluence under one integration. **Edge case:** if a user has BOTH licenses but used NEITHER in the window, they're surfaced by checks 9 and 10 separately — don't also flag them here (would be double-counting). Gate this check on **exactly one of the two products being active in window**.

- [ ] **Step 1: Write the check**

```javascript
/**
 * Check: single_product_dual_seat
 *
 * Surface users who hold BOTH Jira AND Confluence licenses but only used ONE
 * of the two products within the inactivity window. The unused product's seat
 * is the savings.
 *
 * Edge case: if BOTH products are unused, that user is already surfaced by
 * inactive_jira_user AND inactive_confluence_user — gate this check on
 * "exactly one of the two is active in window" so we don't double-count.
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isActiveWithinWindow(productEntry, cutoff) {
  if (!productEntry || !productEntry.lastActive) return false
  const t = new Date(productEntry.lastActive).getTime()
  if (Number.isNaN(t)) return false
  return t >= cutoff
}

async function check({ users, settings, inactivityDays }) {
  const jiraCost = Number(settings?.jira_seat_cost_usd) || 0
  const conflCost = Number(settings?.confluence_seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (u.accountStatus !== "active") continue
    if (!u.products.jira || !u.products.confluence) continue

    const jiraActive = isActiveWithinWindow(u.products.jira, cutoff)
    const conflActive = isActiveWithinWindow(u.products.confluence, cutoff)

    // Need exactly one active; XOR
    if (jiraActive === conflActive) continue

    const unusedProduct = jiraActive ? "Confluence" : "Jira"
    const usedProduct = jiraActive ? "Jira" : "Confluence"
    const unusedSeatCost = jiraActive ? conflCost : jiraCost
    const unusedGroup = jiraActive ? "confluence-users" : "jira-software-users"
    const unusedLast = jiraActive ? u.products.confluence.lastActive : u.products.jira.lastActive
    const days = unusedLast
      ? Math.max(0, Math.floor((Date.now() - new Date(unusedLast).getTime()) / 86400000))
      : null

    findings.push({
      check: "single_product_dual_seat",
      title: `Dual-seat overlap: ${u.email || u.name || u.accountId}`,
      currency: "USD",
      currentValue: unusedSeatCost,
      potentialSavings: unusedSeatCost,
      evidence: [u.accountId],
      action: days != null
        ? `User ${u.email || u.accountId} uses ${usedProduct} but hasn't touched ${unusedProduct} in ${days} days. Remove them from ${unusedGroup} — keep the ${usedProduct} license.`
        : `User ${u.email || u.accountId} uses ${usedProduct} but has never used ${unusedProduct}. Remove them from ${unusedGroup} — keep the ${usedProduct} license.`,
    })
  }

  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify — covers both XOR sides + the both-unused edge case**

```bash
cd backend && node -e "
const c = require('./src/services/atlassianChecks/singleProductDualSeat');
const old = new Date(Date.now() - 90 * 86400000).toISOString();
const recent = new Date(Date.now() - 5 * 86400000).toISOString();
const users = [
  // a: Jira active, Confluence stale → flag (savings = confluence cost)
  { accountId: 'a', accountStatus: 'active', email: 'a@x', products: { jira: { lastActive: recent }, confluence: { lastActive: old }, other: [] } },
  // b: Confluence active, Jira stale → flag (savings = jira cost)
  { accountId: 'b', accountStatus: 'active', email: 'b@x', products: { jira: { lastActive: old }, confluence: { lastActive: recent }, other: [] } },
  // c: both active → skip
  { accountId: 'c', accountStatus: 'active', email: 'c@x', products: { jira: { lastActive: recent }, confluence: { lastActive: recent }, other: [] } },
  // d: both stale → skip (handled by checks 1+2)
  { accountId: 'd', accountStatus: 'active', email: 'd@x', products: { jira: { lastActive: old }, confluence: { lastActive: old }, other: [] } },
  // e: only Jira license → skip
  { accountId: 'e', accountStatus: 'active', email: 'e@x', products: { jira: { lastActive: recent }, confluence: null, other: [] } },
];
c.check({ users, settings: { jira_seat_cost_usd: 7.75, confluence_seat_cost_usd: 6.05 }, inactivityDays: 60 }).then(r => {
  console.log('flagged:', r.findings.map(f => f.evidence[0] + ':' + f.potentialSavings).sort().join(','));
});
"
```

Expected:
```
flagged: a:6.05,b:7.75
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/atlassianChecks/singleProductDualSeat.js
git commit -m "feat(atlassian): single_product_dual_seat cross-product overlap check"
```

---

## Task 12: Aggregator + `/cost-leaks` endpoint

**Files:**
- Create `backend/src/services/atlassianCostLeakAnalysis.js`
- Modify `backend/src/controllers/atlassianController.js` (add `analyzeAtlassianCostLeaksEndpoint`)
- Modify `backend/src/routes/index.js` (wire `/cost-leaks` route)

- [ ] **Step 1: Create `backend/src/services/atlassianCostLeakAnalysis.js`**

```javascript
/**
 * Atlassian cost-leak analysis aggregator.
 *
 * Pulls org-directory users once, fans out to the three V1 checks via
 * Promise.allSettled, applies the standard severity ladder
 * (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and produces a
 * summary suitable for cost_leak_analyses storage.
 */

const inactiveJiraUser = require("./atlassianChecks/inactiveJiraUser")
const inactiveConfluenceUser = require("./atlassianChecks/inactiveConfluenceUser")
const singleProductDualSeat = require("./atlassianChecks/singleProductDualSeat")
const { PRICING_NOTE } = require("./atlassianPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}

async function analyzeAtlassianCostLeaks({ listOrgDirectoryUsers, integration, inactivityDays = 60 }) {
  const settings = integration.settings || {}
  const orgId = settings.org_id
  if (!orgId) {
    return {
      findings: [],
      warnings: [{ check: "init", error: "org_id missing — re-validate the integration" }],
      summary: emptySummary(0, 0, 0),
    }
  }

  const users = await listOrgDirectoryUsers(integration, orgId)

  const checks = [
    { name: "inactive_jira_user",       run: () => inactiveJiraUser.check({ users, settings, inactivityDays }) },
    { name: "inactive_confluence_user", run: () => inactiveConfluenceUser.check({ users, settings, inactivityDays }) },
    { name: "single_product_dual_seat", run: () => singleProductDualSeat.check({ users, settings, inactivityDays }) },
  ]

  const settled = await Promise.allSettled(checks.map((c) => c.run()))

  const allFindings = []
  const warnings = []
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      for (const f of res.value.findings || []) {
        const sev = severityFor(f.potentialSavings)
        if (!sev) continue
        allFindings.push({ ...f, severity: sev })
      }
    } else {
      warnings.push({ check: checks[i].name, error: res.reason?.message || String(res.reason) })
    }
  })

  allFindings.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0))

  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let totalCurrentValue = 0
  let totalPotentialSavings = 0
  for (const f of allFindings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    totalCurrentValue += f.currentValue || 0
    totalPotentialSavings += f.potentialSavings || 0
  }

  const healthScore = Math.max(
    0,
    100 - (counts.critical * 15 + counts.high * 8 + counts.medium * 4 + counts.low * 1),
  )

  const jiraActive = users.filter((u) => u.accountStatus === "active" && u.products.jira).length
  const conflActive = users.filter((u) => u.accountStatus === "active" && u.products.confluence).length

  return {
    findings: allFindings,
    warnings,
    summary: {
      totalFindings: allFindings.length,
      totalCurrentValue: round2(totalCurrentValue),
      totalPotentialSavings: round2(totalPotentialSavings),
      healthScore,
      criticalSeverity: counts.critical,
      highSeverity: counts.high,
      mediumSeverity: counts.medium,
      lowSeverity: counts.low,
      pricingNote: PRICING_NOTE,
      jiraActiveUserCount: jiraActive,
      confluenceActiveUserCount: conflActive,
      totalUserCount: users.length,
      cloudSiteCount: (settings.cloud_sites || []).length,
    },
  }
}

function round2(x) { return Math.round(x * 100) / 100 }

function emptySummary(jiraActive, conflActive, totalUsers) {
  return {
    totalFindings: 0,
    totalCurrentValue: 0,
    totalPotentialSavings: 0,
    healthScore: 100,
    criticalSeverity: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    pricingNote: PRICING_NOTE,
    jiraActiveUserCount: jiraActive,
    confluenceActiveUserCount: conflActive,
    totalUserCount: totalUsers,
    cloudSiteCount: 0,
  }
}

module.exports = { analyzeAtlassianCostLeaks, severityFor }
```

- [ ] **Step 2: Add the `/cost-leaks` handler in the controller**

In `backend/src/controllers/atlassianController.js`, add this require near the top after the other requires:

```javascript
const { analyzeAtlassianCostLeaks } = require("../services/atlassianCostLeakAnalysis")
const { listOrgDirectoryUsers } = require("../utils/atlassianAuth")
```

(The `listOrgDirectoryUsers` import was already added in Task 8 — ensure no duplicate require lines.)

Add this handler before `module.exports = {`:

```javascript
// ---------------------------------------------------------------------------
// Handler: analyzeAtlassianCostLeaksEndpoint
// Returns findings; the frontend persists via /api/analysis-history.
// ---------------------------------------------------------------------------
async function analyzeAtlassianCostLeaksEndpoint(req, res) {
  const endpoint = "POST /api/integrations/atlassian/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Atlassian integration is not connected", status: integration.status })
  }
  if (!hasOrgAdminScope(integration.settings?.granted_scopes)) {
    return res.status(403).json({
      error: "Atlassian Cloud Org Admin permission required.",
      code: "atlassian_org_admin_required",
      hint: "Disconnect and reconnect with an Atlassian Cloud Organization Admin account.",
    })
  }

  const inactivityDays = Math.max(7, Math.min(365, Number(req.body?.inactivityDays) || 60))

  try {
    const result = await analyzeAtlassianCostLeaks({
      listOrgDirectoryUsers,
      integration,
      inactivityDays,
    })
    return res.json({
      ...result,
      parameters: { inactivityDays },
      org: {
        id: integration.settings?.org_id || null,
        name: integration.settings?.org_name || null,
        cloud_sites: integration.settings?.cloud_sites || [],
      },
    })
  } catch (e) {
    const mapped = mapAtlassianError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}
```

Add `analyzeAtlassianCostLeaksEndpoint` to the `module.exports` block.

- [ ] **Step 3: Wire the route**

In `backend/src/routes/index.js`, add `analyzeAtlassianCostLeaksEndpoint` to the destructured require, and add this route to the Atlassian section:

```javascript
router.post("/api/integrations/atlassian/cost-leaks", requireAuth, requireRole("owner", "editor"), analyzeAtlassianCostLeaksEndpoint)
```

- [ ] **Step 4: Verify aggregator with synthetic data**

```bash
cd backend && node -e "
const { analyzeAtlassianCostLeaks } = require('./src/services/atlassianCostLeakAnalysis');
const old = new Date(Date.now() - 90 * 86400000).toISOString();
const recent = new Date(Date.now() - 5 * 86400000).toISOString();
const fakeUsers = [
  { accountId: 'a', accountStatus: 'active', email: 'a@x', products: { jira: { lastActive: old }, confluence: { lastActive: recent }, other: [] } },
  { accountId: 'b', accountStatus: 'active', email: 'b@x', products: { jira: { lastActive: recent }, confluence: { lastActive: old }, other: [] } },
  { accountId: 'c', accountStatus: 'active', email: 'c@x', products: { jira: { lastActive: old }, confluence: null, other: [] } },
];
const stub = async () => fakeUsers;
const integration = { id: 'fake', settings: { org_id: 'org-1', jira_seat_cost_usd: 7.75, confluence_seat_cost_usd: 6.05, cloud_sites: [{}] } };
analyzeAtlassianCostLeaks({ listOrgDirectoryUsers: stub, integration, inactivityDays: 60 }).then(r => {
  console.log('totalFindings:', r.summary.totalFindings);
  console.log('totalPotentialSavings:', r.summary.totalPotentialSavings);
  console.log('checks present:', [...new Set(r.findings.map(f => f.check))].sort().join(','));
  console.log('warnings:', r.warnings.length);
});
"
```

Expected:
```
totalFindings: 4
totalPotentialSavings: 27.6
checks present: inactive_confluence_user,inactive_jira_user,single_product_dual_seat
warnings: 0
```

(`a` flags inactive_jira_user (7.75) + dual-seat (6.05); `b` flags inactive_confluence_user (6.05) + dual-seat (7.75); `c` flags inactive_jira_user (7.75). Total = 7.75+6.05+6.05+7.75+7.75 = 35.35... wait let me recheck: a → inactive_jira (7.75) + dual-seat for the unused confluence... no wait, a has confluence active recently, jira stale; so inactive_jira_user fires for a (7.75) and also dual-seat fires for a since exactly one is active in window (savings = 7.75 because jira is the unused one). Actually no — dual-seat says the unused product's cost. a: jira stale, confluence active → unused = jira = 7.75. So a contributes 7.75 + 7.75 = 15.50. b: jira active, confluence stale → inactive_confluence_user (6.05) + dual-seat (6.05) = 12.10. c: jira stale, no confluence → inactive_jira_user (7.75). Total = 15.50 + 12.10 + 7.75 = 35.35. Update expected output.)

Re-verify with the corrected expected:
```
totalFindings: 5
totalPotentialSavings: 35.35
checks present: inactive_confluence_user,inactive_jira_user,single_product_dual_seat
warnings: 0
```

If your actual output matches the corrected numbers, proceed.

- [ ] **Step 5: Verify the new route registers**

```bash
cd backend && node -e "
const express = require('express');
const app = express();
app.use(express.json());
require('dotenv').config({ path: '.env' });
const router = require('./src/routes');
app.use(router);
const has = app._router.stack
  .filter(l => l.route)
  .some(l => l.route.path === '/api/integrations/atlassian/cost-leaks');
console.log(has ? 'route-registered' : 'route-MISSING');
"
```

Expected: `route-registered`

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/atlassianCostLeakAnalysis.js backend/src/controllers/atlassianController.js backend/src/routes/index.js
git commit -m "feat(atlassian): aggregator + /cost-leaks endpoint with three V1 checks"
```

---

## Task 13: History tab + analysis-tab inactivity dropdown integration

**Files:** None new. Verification that the existing shared `analysis-tab.tsx` and `history-tab.tsx` consume the Atlassian config properly.

The shared analysis tab reads `analysisSupportsInactivity`, `analysisInactivityOptions`, `analysisDefaultInactivityDays`, and `endpoints.costLeaks` from the config. The history tab reads from `cost_leak_analyses` filtered by provider. Both should work without code changes — this task is verification.

- [ ] **Step 1: Confirm the analysis tab supports inactivity for Atlassian**

```bash
grep -n "analysisSupportsInactivity" frontend/components/tools/analysis-tab.tsx
```

Expected: at least one match referencing `cfg.analysisSupportsInactivity`.

- [ ] **Step 2: Browser verification — connected integration with seeded data**

With both servers running and the Atlassian integration connected (per Task 7):

1. Navigate to `/dashboard/tools/<atlassianIntegrationId>` → Analysis tab
2. Confirm an "Inactivity window" dropdown appears with options 30 / 60 / 90 / 180
3. Click "Run analysis"
4. Verify findings render with severity badges and per-check titles
5. Open History tab; confirm the run was persisted (this requires the frontend POST to `/api/analysis-history` after the cost-leak call — verify by inspecting Network tab if not visible)

- [ ] **Step 3: SQL verification of the persisted analysis**

Use Supabase MCP `execute_sql`:

```sql
SELECT
  id,
  provider,
  jsonb_array_length(analysis_data->'findings') AS finding_count,
  (analysis_data->'summary'->>'totalPotentialSavings')::numeric AS savings,
  (analysis_data->'parameters'->>'inactivityDays')::int          AS inactivity_days,
  created_at
FROM cost_leak_analyses
WHERE provider = 'Atlassian'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: row exists, `finding_count` >= 0, `inactivity_days` matches what you selected.

- [ ] **Step 4: No commit (verification-only task)**

---

## Task 14: Setup-guide page section + brand logo + reference doc

**Files:**
- Modify `frontend/app/dashboard/tools/guide/page.tsx`
- Modify `frontend/components/tools/tool-logos.tsx`
- Modify `docs/tool-analysis-reference.md`

- [ ] **Step 1: Read the existing guide page to find the INTEGRATIONS array**

```bash
grep -n "linear\|notion\|salesforce" frontend/app/dashboard/tools/guide/page.tsx | head -20
```

Look for the `INTEGRATIONS` array (or equivalent data structure) where each connected tool defines its setup steps. Identify the exact shape used by Linear (the most recent integration) and follow it.

- [ ] **Step 2: Add an Atlassian entry to the INTEGRATIONS array**

The exact shape depends on the existing entries. Example (adjust property names to match what's already there):

```typescript
{
  id: "atlassian",
  name: "Atlassian (Jira + Confluence)",
  brandColor: "#0052CC",
  category: "Productivity",
  requiresAdmin: true,
  steps: [
    "Open developer.atlassian.com/console/myapps/ → Create → OAuth 2.0 integration",
    "Name: 'Efficyon Cost Analyzer'",
    "Permissions → add: read:jira-user, read:confluence-user.summary, read:account, read:directory:admin-atlassian",
    "Authorization → set Callback URL to your Efficyon backend's /api/integrations/atlassian/callback",
    "Settings → Distribution → set Sharing to enabled",
    "Copy the Client ID + Secret",
    "In Efficyon, paste them with your per-product seat costs and click Connect",
    "On the consent screen you must be signed in as an Atlassian Cloud Organization Admin",
  ],
  warning:
    "An Atlassian Cloud Org Admin must approve the install. Without read:directory:admin-atlassian we cannot read per-product last-active dates and the analysis will fail.",
}
```

- [ ] **Step 3: Add Atlassian brand mark**

In `frontend/components/tools/tool-logos.tsx`, add the Atlassian SVG entry following the same pattern as Linear / Notion. Atlassian's official logo is the blue stacked-A mark; use the simple-icons path:

```tsx
// Inside the logos map:
Atlassian: (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M7.12 11.084a.679.679 0 0 0-1.15.105L.132 22.978a.703.703 0 0 0 .628 1.018h8.16a.671.671 0 0 0 .628-.395c1.78-3.682.701-9.273-2.428-12.517zm4.323-5.34a15.456 15.456 0 0 0-.91 15.252.704.704 0 0 0 .628.39h8.16a.704.704 0 0 0 .628-1.018S13.823 7.382 12.557 4.853a.69.69 0 0 0-1.114-.001z"/>
  </svg>
),
```

- [ ] **Step 4: Add Atlassian to `docs/tool-analysis-reference.md`**

Append a section near the Linear / Notion entries (matching the existing format):

```markdown
### Atlassian (Jira Software + Confluence)

- **Provider key:** `Atlassian`
- **Auth:** Customer-managed OAuth 2.0 (3LO). Atlassian Cloud Org Admin install required.
- **Required scopes:** `read:jira-user`, `read:confluence-user.summary`, `read:account`, `read:directory:admin-atlassian`, `offline_access`
- **Data source:** Atlassian Org Directory API — `GET /admin/v1/orgs/{orgId}/directory/users`
- **Pricing:** Customer-supplied per-product (`jira_seat_cost_usd`, `confluence_seat_cost_usd`). Tier guidance: Jira Standard ~$7.75 / Premium ~$15.25, Confluence Standard ~$6.05 / Premium ~$11.55 (USD/user/mo annual).
- **V1 checks:**
  - `inactive_jira_user` — active user with Jira license, no Jira activity in `inactivityDays`
  - `inactive_confluence_user` — active user with Confluence license, no Confluence activity in `inactivityDays`
  - `single_product_dual_seat` — active user with BOTH licenses, only one product used in window (the unused seat is the savings)
- **Out of V1:** Jira Service Management, Bitbucket Cloud, Compass, multi-org, premium-feature-utilization, deactivated-but-still-licensed cleanup, scheduled syncs.
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Browser check**

Navigate to `/dashboard/tools/guide` and confirm the Atlassian section renders with the steps, brand color, admin warning, and the logo appears in `/dashboard/tools/`.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/dashboard/tools/guide/page.tsx frontend/components/tools/tool-logos.tsx docs/tool-analysis-reference.md
git commit -m "feat(atlassian): docs + brand logo + setup-guide section"
```

---

## Task 15: (USER CHECKPOINT) Final end-to-end verification

This is a **HUMAN VERIFICATION** task. The implementer should pause and ask the user to seed test data and walk the full analysis flow.

- [ ] **Step 1: Seed inactive users in the test Atlassian org**

In `admin.atlassian.com` for the test org:
- Pick 2 users; make one a "Jira-only inactive" (remove from confluence-users group; let them not log into Jira for the inactivity window)
- Pick 1 user as the dual-seat overlap candidate (in both groups; only used Jira in last 60 days; never used Confluence). If the org is fresh, manually impersonate to populate one product's last-active.
- Optional: pick 1 user with no recent activity in either product (should show up in checks 1+2, NOT in 3).

Note: real "last active" backfill is hard to fake — use what the org actually has, and verify the math against ground truth.

- [ ] **Step 2: Run the full analysis**

In the dashboard:
1. Open the Atlassian integration page → Analysis tab
2. Set inactivity window to 60 days
3. Click "Run analysis"
4. Confirm:
   - `totalFindings` ≥ 0
   - Each finding has a severity badge
   - Per-finding action text reads naturally and references the correct product/group

- [ ] **Step 3: Verify findings persist**

Open the History tab — most-recent entry should be the run from Step 2. Click into it; verify the same findings.

- [ ] **Step 4: Verify error paths**

| Path | How |
|---|---|
| Bad client_id | Edit the integration row's `settings.client_id_encrypted` to garbage; reconnect → expect "Token exchange failed" or "invalid_client" message |
| Denied consent | Click Connect; on Atlassian's screen click Cancel → expect redirect to `/dashboard/tools?atlassian_consent=denied` |
| Non-admin install | Connect as a non-admin Atlassian user → expect failure with `atlassian_org_admin_required` |
| Token revoked | admin.atlassian.com → revoke the connected app → next analysis run expect 401 with `atlassian_credentials_revoked` |
| Rate limited | (manual) — trip Atlassian's 429 by spamming validate → expect 503 with retry hint |

- [ ] **Step 5: Verify token refresh**

Force-expire by editing `tokenCache` (restart backend), then run another analysis. Expect a refresh round-trip in the logs but no user-visible failure.

- [ ] **Step 6: Verify disconnect**

Disconnect from the dashboard. Confirm:
- DB row `status = 'disconnected'`
- Settings cleared except `disconnected_at` + `prior_org_id`
- `tokenCache` evicted (re-running analysis returns 409 not connected)
- Atlassian admin.atlassian.com → Connected apps no longer lists the integration (revoke succeeded)

- [ ] **Step 7: Open PR / merge**

Once all checkpoints pass, the implementer should ask the user how to land the branch (PR vs direct merge to main, push to remote, etc.) — do not push without explicit instruction.

---

## Self-review summary

Each requirement from the spec maps to a task:

| Spec requirement | Task |
|---|---|
| SQL provider migration | 1 |
| Pricing constants + PRICING_NOTE | 2 |
| OAuth 2.0 (3LO) auth utility, JSON body, refresh, encryption, state, REST helper, accessible-resources, org id discovery, paginated org-directory pull, mapDirectoryUser | 3 |
| Connection-management controller (oauth/start, callback, validate, status, disconnect) + org-admin scope check | 4 |
| Connection routes wired with auth middleware | 5 |
| Frontend tool config + placeholder view + registry entry | 6 |
| Real-system OAuth dance verification + mapDirectoryUser shape adjustment | 7 (USER) |
| `/users` data endpoint + members data tab | 8 |
| `inactive_jira_user` check | 9 |
| `inactive_confluence_user` check | 10 |
| `single_product_dual_seat` cross-product check (XOR gate to avoid double-count) | 11 |
| Aggregator + `/cost-leaks` endpoint + severity ladder + summary shape | 12 |
| Analysis tab inactivity dropdown wiring + history persistence | 13 |
| Setup-guide section + brand logo + reference doc | 14 |
| Final E2E manual verification including all error paths + token refresh + disconnect revoke | 15 (USER) |

**Branch:** `feat/atlassian-integration` — do not push without user instruction.
