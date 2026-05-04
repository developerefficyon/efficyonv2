# Linear Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Linear as Efficyon's 19th integration — V1 detects inactive billable users in a customer's Linear workspace via a customer-managed OAuth app + Linear's GraphQL API.

**Architecture:** Customer creates an OAuth application in their Linear workspace and pastes Client ID + Secret + plan tier into Efficyon. Backend does OAuth via `linear.app` / `api.linear.app`, persists encrypted access + refresh tokens (with refresh-on-demand pattern), and runs a single GraphQL query per analysis to identify users with `active = true` and stale `lastSeenAt`. Findings ride in the existing `cost_leak_analyses` table; only schema change is the provider CHECK extension.

**Tech Stack:** Backend Express/CommonJS + Supabase + native `fetch` for Linear's GraphQL API. Frontend Next.js 16 / React 19 / TypeScript / Tailwind v4. Auth via existing `requireAuth` + `requireRole` middleware. Credential encryption via existing `utils/encryption.js`. Pattern reference: `salesforceController.js` for OAuth dance + token refresh, `notionController.js` for the simpler scope.

## Important context for the implementer

- **No test runner.** CLAUDE.md is explicit. Each task's verification is a manual `node -e` smoke test, `curl`, or browser check.
- **Linear API is GraphQL-only.** Single endpoint: `POST https://api.linear.app/graphql`. All requests use `Content-Type: application/json` with `{ query, variables }` body. Auth header: `Authorization: Bearer <access_token>`.
- **Linear OAuth tokens DO expire** (~10 hours) — refresh logic IS needed. Same in-process token cache pattern as Salesforce's `salesforceAuth.getAccessToken`.
- **OAuth host:** authorize URL is on `linear.app`, token endpoint is on `api.linear.app`. Don't confuse them.
- **OAuth scope:** single `read` scope covers everything we need.
- **State token:** base64-encoded JSON `{ company_id, integration_id }`, matches QuickBooks / Salesforce / Notion pattern.
- **Pagination:** Linear caps `first` at 250. Loop with `pageInfo.endCursor` until `hasNextPage = false`. Hard cap at 1000 users (4 pages) for safety.
- **Cost-leak save pattern:** the `/cost-leaks` endpoint **returns** findings; the frontend POSTs to `/api/analysis-history` to persist (matches all prior cost-leak integrations).
- **No RLS** — `requireAuth` + `requireRole` on every authenticated route. The OAuth `/callback` route is the only one without auth.
- **Branch:** work on `feat/linear-integration`. Do NOT push to remote unless the user requests it.

---

## File Structure

**Backend (new files):**

```
backend/src/utils/linearAuth.js                          OAuth host helpers + token exchange + refresh + encryption + GraphQL request + paginated users pull
backend/src/services/linearPricing.js                    Plan tier list-price map
backend/src/services/linearCostLeakAnalysis.js           Aggregator + the single check
backend/src/services/linearChecks/inactiveUsers.js       Inactive user detection
backend/src/controllers/linearController.js              oauth/start, callback, validate, status, users, cost-leaks, disconnect
backend/sql/051_linear_provider.sql                      Provider CHECK extension
```

**Backend (modify):**

```
backend/src/routes/index.js                              Wire 7 new routes
```

**Frontend (new):**

```
frontend/lib/tools/configs/linear.ts                     UnifiedToolConfig — oauth + planTier select + analysisSupportsInactivity
frontend/components/tools/linear-view.tsx                Data tab — workspace info + members table with lastSeenAt
```

**Frontend (modify):**

```
frontend/lib/tools/registry.ts                           Register linearConfig
frontend/components/tools/tool-logos.tsx                 Add Linear brand mark
frontend/app/dashboard/tools/guide/page.tsx              Add Linear setup section + INTEGRATIONS array entry
docs/tool-analysis-reference.md                          Add Linear summary
```

---

## Task 1: SQL migration

**Files:** Create `backend/sql/051_linear_provider.sql`

- [ ] **Step 1: Write migration**

Create `backend/sql/051_linear_provider.sql`:

```sql
-- Allow Linear as a provider for persisted cost-leak analyses.
-- Findings come from Linear cost-leak analysis (inactive billable users)
-- via a customer-managed OAuth application.

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
    'Linear'
  ));
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with name `051_linear_provider`.

- [ ] **Step 3: Verify**

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.cost_leak_analyses'::regclass
  AND conname = 'valid_provider';
```

Expected: returned definition contains `'Linear'`.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/051_linear_provider.sql
git commit -m "feat(linear): add provider migration for cost_leak_analyses"
```

---

## Task 2: Pricing constants

**Files:** Create `backend/src/services/linearPricing.js`

- [ ] **Step 1: Write file**

Create `backend/src/services/linearPricing.js` with these EXACT contents:

```javascript
/**
 * Linear list-price map. Values are USD/user/mo (annual billing).
 *
 * Customers typically negotiate 10–20% on Plus and 30%+ on Enterprise.
 * The cost-leak summary's `pricingNote` instructs them to apply their
 * actual discount. Update annually.
 */

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

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/services/linearPricing'); console.log(m.resolvePlanPrice('standard'), m.resolvePlanPrice('PLUS'), m.resolvePlanPrice('enterprise'), m.resolvePlanPrice('unknown'));"
```

Expected: `8 14 25 0`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/linearPricing.js
git commit -m "feat(linear): add list-price map for plan tiers"
```

---

## Task 3: Auth utility

**Files:** Create `backend/src/utils/linearAuth.js`

- [ ] **Step 1: Write file**

Create `backend/src/utils/linearAuth.js` with these EXACT contents:

```javascript
/**
 * Linear Auth Utility (per-customer OAuth app + OAuth 2.0).
 *
 * Customer creates an OAuth application at Linear → Settings → API → OAuth
 * applications. We do the standard authorization-code flow:
 *   - Authorize URL: https://linear.app/oauth/authorize
 *   - Token URL:     https://api.linear.app/oauth/token (form-encoded)
 *
 * Linear access tokens expire in ~10 hours. We refresh on demand using the
 * cached refresh token. In-process token cache avoids repeated refresh calls.
 *
 * GraphQL endpoint: https://api.linear.app/graphql
 */

const { encrypt, decrypt } = require("./encryption")

const LINEAR_AUTHORIZE_HOST = "https://linear.app"
const LINEAR_API_HOST = "https://api.linear.app"
const LINEAR_GRAPHQL = `${LINEAR_API_HOST}/graphql`
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Linear OAuth credentials")
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
// State encoding (matches QuickBooks / Salesforce / Notion pattern)
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
// OAuth code → tokens exchange (form-encoded body)
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(`${LINEAR_API_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.linearError = body.error
    throw err
  }
  return body // { access_token, refresh_token, token_type, expires_in, scope }
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(`${LINEAR_API_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.linearError = body.error
    throw err
  }
  return body
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
  const expiresIn = result.expires_in || 36000 // default 10h
  const expiresAt = Date.now() + expiresIn * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// Authenticated GraphQL request against api.linear.app
// ---------------------------------------------------------------------------
async function linearGraphQL(integration, query, variables = {}) {
  const accessToken = await getAccessToken(integration)
  const res = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("LINEAR_REQUEST_FAILED", body.errors?.[0]?.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    throw err
  }
  if (body.errors?.length) {
    const err = typedError("LINEAR_GRAPHQL_ERROR", body.errors[0].message)
    err.httpStatus = 400
    err.graphqlErrors = body.errors
    throw err
  }
  return body.data
}

// ---------------------------------------------------------------------------
// Paginated users pull (cursor-based, capped at 1000 users)
// ---------------------------------------------------------------------------
const USERS_QUERY = `
  query Users($after: String) {
    users(first: 250, after: $after, includeArchived: false) {
      nodes {
        id
        name
        displayName
        email
        active
        admin
        lastSeenAt
        createdAt
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

async function listAllUsers(integration, cap = 1000) {
  const out = []
  let after = null
  for (let i = 0; i < 5; i++) {
    const data = await linearGraphQL(integration, USERS_QUERY, { after })
    const nodes = data?.users?.nodes || []
    out.push(...nodes)
    if (out.length >= cap) return out.slice(0, cap)
    if (!data?.users?.pageInfo?.hasNextPage) break
    after = data.users.pageInfo.endCursor
  }
  return out
}

// ---------------------------------------------------------------------------
// Workspace (organization) metadata — captured at connect time
// ---------------------------------------------------------------------------
const WORKSPACE_QUERY = `
  query Workspace {
    organization {
      id
      name
      urlKey
      userCount
    }
    viewer { id email }
  }
`

async function fetchWorkspace(integration) {
  return linearGraphQL(integration, WORKSPACE_QUERY)
}

module.exports = {
  LINEAR_AUTHORIZE_HOST,
  LINEAR_API_HOST,
  LINEAR_GRAPHQL,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  refreshAccessToken,
  getAccessToken,
  evictToken,
  linearGraphQL,
  listAllUsers,
  fetchWorkspace,
  USERS_QUERY,
  WORKSPACE_QUERY,
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "
const m = require('./src/utils/linearAuth');
console.log('keys:', Object.keys(m).sort().filter(k => !k.endsWith('_QUERY') && !k.startsWith('LINEAR_')).join(','));
console.log('authorize host:', m.LINEAR_AUTHORIZE_HOST);
console.log('api host:', m.LINEAR_API_HOST);
console.log('graphql:', m.LINEAR_GRAPHQL);
const s = m.encodeState({ company_id: 'co1', integration_id: 'in1' });
console.log('state roundtrip:', JSON.stringify(m.decodeState(s)));
"
```

Expected output (5 lines):
```
keys: decodeState,decryptOAuthCreds,decryptTokens,encodeState,encryptOAuthCreds,encryptTokens,evictToken,exchangeCodeForTokens,fetchWorkspace,getAccessToken,linearGraphQL,listAllUsers,refreshAccessToken
authorize host: https://linear.app
api host: https://api.linear.app
graphql: https://api.linear.app/graphql
state roundtrip: {"company_id":"co1","integration_id":"in1"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/linearAuth.js
git commit -m "feat(linear): OAuth dance + refresh + GraphQL helper + paginated users pull"
```

---

## Task 4: Controller scaffold

**Files:** Create `backend/src/controllers/linearController.js`

This task adds the connection-management surface (oauth/start, callback, validate, status, disconnect). Data and analyze handlers come in Tasks 8 and 11.

- [ ] **Step 1: Write file**

Create `backend/src/controllers/linearController.js` with these EXACT contents:

```javascript
/**
 * Linear Controller (cost-leak analysis).
 *
 * Auth = per-customer OAuth application. Customer pastes Client ID + Secret +
 * plan tier in the connect form. We do an OAuth 2.0 web-server flow against
 * Linear, persist encrypted access + refresh tokens, and use them to query
 * Linear's GraphQL API for workspace users.
 *
 * Findings: inactive billable users (active=true + lastSeenAt older than threshold).
 */

const { supabase } = require("../config/supabase")
const {
  LINEAR_AUTHORIZE_HOST,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  getAccessToken,
  evictToken,
  fetchWorkspace,
} = require("../utils/linearAuth")

const LINEAR_PROVIDER = "Linear"

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
    .ilike("provider", LINEAR_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Linear integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapLinearError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Linear to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Linear to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.linearError === "invalid_grant" || e.linearError === "invalid_token")) {
    return { status: 401, message: "Linear credentials revoked — please reconnect.", hint: "The OAuth app may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.linearError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Linear OAuth app page." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Linear rejected the access token — please reconnect.", hint: "The OAuth app may have been revoked." }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Linear throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Linear error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startLinearOAuth
// ---------------------------------------------------------------------------
async function startLinearOAuth(req, res) {
  const endpoint = "GET /api/integrations/linear/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_linear_creds → encrypted on first OAuth start
  if (integration.settings?._pending_linear_creds) {
    try {
      const pending = integration.settings._pending_linear_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_linear_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        plan_tier: pending.planTier || "standard",
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapLinearError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Linear Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.LINEAR_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/linear/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${LINEAR_AUTHORIZE_HOST}/oauth/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "read")
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("actor", "user")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: linearOAuthCallback
// No requireAuth — Linear's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function linearOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/linear/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.LINEAR_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/linear/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  // Persist encrypted tokens. Then fetch workspace metadata using the new token.
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
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  // Best-effort fetch of workspace metadata (don't fail callback if it errors)
  try {
    const { data: refreshedIntegration } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshedIntegration) {
      const data = await fetchWorkspace(refreshedIntegration)
      const org = data?.organization || {}
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshedIntegration.settings || {}),
            workspace_id: org.id || null,
            workspace_name: org.name || null,
            workspace_url_key: org.urlKey || null,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "workspace metadata fetch failed (non-fatal)", { message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?linear_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateLinear
// Uses the cached/refreshed token to ping the workspace endpoint.
// ---------------------------------------------------------------------------
async function validateLinear(req, res) {
  const endpoint = "POST /api/integrations/linear/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const data = await fetchWorkspace(integration)
    const org = data?.organization || {}
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          workspace_id: org.id || integration.settings?.workspace_id || null,
          workspace_name: org.name || integration.settings?.workspace_name || null,
          workspace_url_key: org.urlKey || integration.settings?.workspace_url_key || null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso, workspace: org })
  } catch (e) {
    const mapped = mapLinearError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getLinearStatus
// ---------------------------------------------------------------------------
async function getLinearStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    workspaceId: s.workspace_id || null,
    workspaceName: s.workspace_name || null,
    workspaceUrlKey: s.workspace_url_key || null,
    planTier: s.plan_tier || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectLinear
// ---------------------------------------------------------------------------
async function disconnectLinear(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorWorkspaceId = integration.settings?.workspace_id || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_workspace_id: priorWorkspaceId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapLinearError,
  log,
  LINEAR_PROVIDER,
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/controllers/linearController'); console.log(Object.keys(m).sort().join(','));"
```

Expected: `LINEAR_PROVIDER,disconnectLinear,getIntegrationForUser,getLinearStatus,linearOAuthCallback,log,mapLinearError,startLinearOAuth,validateLinear`

(Supabase env-var warning may print — harmless.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/linearController.js
git commit -m "feat(linear): scaffold controller with oauth + disconnect handlers"
```

---

## Task 5: Wire OAuth + connection routes

**Files:** Modify `backend/src/routes/index.js`

- [ ] **Step 1: Add controller require**

Find the existing Notion controller require block (search for `notionController`). Add this DIRECTLY BELOW the closing `})` of the Notion require:

```javascript
// Linear Integration Controller - per-customer OAuth application
const {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
} = require("../controllers/linearController")
```

- [ ] **Step 2: Add routes**

Find the existing Notion routes block (search for `// Notion Integration routes`). Add this DIRECTLY BELOW the Notion routes block:

```javascript
// Linear Integration routes (cost-leak analysis)
router.get(   "/api/integrations/linear/oauth/start", requireAuth, requireRole("owner", "editor"),           startLinearOAuth)
router.get(   "/api/integrations/linear/callback",                                                            linearOAuthCallback) // NO AUTH — Linear browser redirect; state param verifies
router.post(  "/api/integrations/linear/validate",    requireAuth, requireRole("owner", "editor"),           validateLinear)
router.get(   "/api/integrations/linear/status",      requireAuth, requireRole("owner", "editor", "viewer"), getLinearStatus)
router.delete("/api/integrations/linear",             requireAuth, requireRole("owner", "editor"),           disconnectLinear)
```

CRITICAL: do NOT touch any other integration's routes.

- [ ] **Step 3: Boot test**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot. Port-in-use → DONE_WITH_CONCERNS. SyntaxError → BLOCKED.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/index.js
git commit -m "feat(linear): wire oauth/start, callback, validate, status, disconnect routes"
```

---

## Task 6: Frontend config + view + registry

**Files:**
- Create `frontend/lib/tools/configs/linear.ts`
- Create `frontend/components/tools/linear-view.tsx` (placeholder; filled in Task 9)
- Modify `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Write placeholder view**

Create `frontend/components/tools/linear-view.tsx`:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function LinearView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Linear Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Workspace</dt>
          <dd>{statusInfo?.workspaceName || settings.workspace_name || "—"}</dd>
          <dt className="text-muted-foreground">URL key</dt>
          <dd className="font-mono">{statusInfo?.workspaceUrlKey || settings.workspace_url_key || "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{statusInfo?.planTier || settings.plan_tier || "—"}</dd>
          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{statusInfo?.lastValidatedAt || settings.last_validated_at || "—"}</dd>
        </dl>
      </section>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
```

- [ ] **Step 2: Write tool config**

Create `frontend/lib/tools/configs/linear.ts`:

```typescript
import type { UnifiedToolConfig } from "../types"
import { LinearView } from "@/components/tools/linear-view"

export const linearConfig: UnifiedToolConfig = {
  provider: "Linear",
  id: "linear",
  label: "Linear",
  category: "Productivity",
  description: "Inactive billable users — flagged for suspension to free seats",
  brandColor: "#5E6AD2",
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Linear OAuth Client ID",
      type: "text",
      required: true,
      hint: "From Linear → Settings → Account → API → OAuth applications → your app",
    },
    {
      name: "consumerSecret",
      label: "Linear OAuth Client Secret",
      type: "password",
      required: true,
      hint: "Same OAuth applications page",
    },
    {
      name: "planTier",
      label: "Plan Tier",
      type: "select",
      required: true,
      options: [
        { value: "standard",   label: "Standard ($8/user/mo)" },
        { value: "plus",       label: "Plus ($14/user/mo)" },
        { value: "enterprise", label: "Enterprise ($25/user/mo default)" },
      ],
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/linear/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Linear",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_linear_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            planTier: values.planTier,
          },
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to create a Linear OAuth application",
    steps: [
      "Open Linear → Settings → Account → API",
      "Under 'OAuth applications', click 'Create new'",
      "Name: 'Efficyon Cost Analyzer'. Redirect URI: http://localhost:4000/api/integrations/linear/callback (use prod URL when deploying)",
      "Scopes: 'read' (single read scope is enough)",
      "Save. Copy the Client ID + Client Secret from the app's page",
      "Paste them above along with your plan tier, then click Connect",
    ],
  },
  endpoints: [
    { key: "status", path: "/api/integrations/linear/status" },
  ],
  defaultTab: "status",
  viewComponent: LinearView,
  connectingToast: "Redirecting to Linear to authorize…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access: Linear → Settings → Account → API → OAuth applications → 'Efficyon Cost Analyzer' → Revoke. Or delete the OAuth app entirely.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/linear/cost-leaks",
  analysisSupportsInactivity: true,
}
```

- [ ] **Step 3: Register in tool registry**

Open `frontend/lib/tools/registry.ts`. Add this import alongside the existing imports:

```typescript
import { linearConfig } from "./configs/linear"
```

Add `Linear: linearConfig,` to the `TOOL_REGISTRY` object (alphabetical between `HubSpot` and `Microsoft365` is fine).

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "linear|Linear" || echo "No Linear-related errors"
```

Expected: `No Linear-related errors`. Pre-existing errors elsewhere are fine.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/tools/configs/linear.ts frontend/components/tools/linear-view.tsx frontend/lib/tools/registry.ts
git commit -m "feat(linear): add tool config + placeholder view + registry entry"
```

---

## Task 7: USER ACTION — Manual OAuth dance against a real Linear workspace

This is verification, not implementation. Pause here.

The user must:

1. Open Linear → Settings → Account → API → "Create new" under OAuth applications
2. Name "Efficyon Cost Analyzer", Redirect URI `http://localhost:4000/api/integrations/linear/callback`, Scope `read`
3. Save and copy Client ID + Client Secret
4. In Efficyon dashboard: Connect Linear → paste credentials + plan tier → Connect
5. Browser redirects to Linear → grant access → redirect back with `?linear_consent=success`
6. Verify: status `connected`, `workspace_id` + `workspace_name` populated
7. Test disconnect: status flips to `disconnected`

Reply when this works to continue with Task 8. No commit on this task.

---

## Task 8: Data endpoint — workspace users

**Files:**
- Modify `backend/src/controllers/linearController.js`
- Modify `backend/src/routes/index.js`

- [ ] **Step 1: Add `listAllUsers` to the existing import**

Open `backend/src/controllers/linearController.js`. Find the existing destructure from `linearAuth`:

```javascript
const {
  LINEAR_AUTHORIZE_HOST,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  getAccessToken,
  evictToken,
  fetchWorkspace,
} = require("../utils/linearAuth")
```

Add `listAllUsers` to the list:

```javascript
const {
  LINEAR_AUTHORIZE_HOST,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  getAccessToken,
  evictToken,
  fetchWorkspace,
  listAllUsers,
} = require("../utils/linearAuth")
```

- [ ] **Step 2: Add the handler before module.exports**

Insert this handler IMMEDIATELY BEFORE the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: getLinearUsers
// Returns all workspace users (capped at 1000) for the Data tab.
// ---------------------------------------------------------------------------
async function getLinearUsers(req, res) {
  const endpoint = "GET /api/integrations/linear/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const users = await listAllUsers(integration)
    return res.json({ users })
  } catch (e) {
    const mapped = mapLinearError(e)
    log("error", endpoint, "getUsers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

- [ ] **Step 3: Update module.exports**

Current:

```javascript
module.exports = {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapLinearError,
  log,
  LINEAR_PROVIDER,
}
```

Replace with:

```javascript
module.exports = {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  getLinearUsers,
  // exported for use by analyze handler added in later tasks:
  getIntegrationForUser,
  mapLinearError,
  log,
  LINEAR_PROVIDER,
}
```

- [ ] **Step 4: Wire route in routes/index.js**

Open `backend/src/routes/index.js`. Update the existing destructure of `linearController`:

```javascript
const {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  getLinearUsers,
} = require("../controllers/linearController")
```

Add the route in the Linear block, IMMEDIATELY AFTER the `/status` line:

```javascript
router.get(   "/api/integrations/linear/users",       requireAuth, requireRole("owner", "editor", "viewer"), getLinearUsers)
```

- [ ] **Step 5: Boot test**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/linearController.js backend/src/routes/index.js
git commit -m "feat(linear): add /users data endpoint"
```

---

## Task 9: Fill in Data tab UI

**Files:**
- Modify `frontend/lib/tools/configs/linear.ts`
- Modify `frontend/components/tools/linear-view.tsx`

- [ ] **Step 1: Update config endpoints**

In `frontend/lib/tools/configs/linear.ts`, replace the `endpoints` and `defaultTab` fields with:

```typescript
  endpoints: [
    { key: "status", path: "/api/integrations/linear/status" },
    { key: "users",  path: "/api/integrations/linear/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",
```

- [ ] **Step 2: Replace the placeholder view**

Overwrite `frontend/components/tools/linear-view.tsx` ENTIRELY with:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface LinearUser {
  id: string
  name?: string | null
  displayName?: string | null
  email?: string | null
  active: boolean
  admin: boolean
  lastSeenAt?: string | null
  createdAt?: string | null
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString()
}

export function LinearView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: LinearUser[] = (info?.users as LinearUser[] | undefined) || []
  const activeUsers = users.filter((u) => u.active)
  const admins = users.filter((u) => u.admin)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Linear Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Workspace</dt>
          <dd>{statusInfo?.workspaceName || settings.workspace_name || "—"}</dd>
          <dt className="text-muted-foreground">URL key</dt>
          <dd className="font-mono">{statusInfo?.workspaceUrlKey || settings.workspace_url_key || "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{statusInfo?.planTier || settings.plan_tier || "—"}</dd>
          <dt className="text-muted-foreground">Total members</dt>
          <dd>{users.length}</dd>
          <dt className="text-muted-foreground">Active members (billable)</dt>
          <dd>{activeUsers.length}</dd>
          <dt className="text-muted-foreground">Admins</dt>
          <dd>{admins.length}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Members ({users.length})</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Active</th>
                <th>Admin</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.displayName || u.name || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.active ? "Yes" : "No"}</td>
                  <td>{u.admin ? "Yes" : "No"}</td>
                  <td>{formatDate(u.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "linear|Linear" || echo "No Linear-related errors"
```

Expected: `No Linear-related errors`.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/tools/configs/linear.ts frontend/components/tools/linear-view.tsx
git commit -m "feat(linear): render data tab — workspace info + members table"
```

---

## Task 10: Inactive users check module

**Files:** Create `backend/src/services/linearChecks/inactiveUsers.js`

The directory `backend/src/services/linearChecks/` will be auto-created on first Write.

- [ ] **Step 1: Write file**

Create `backend/src/services/linearChecks/inactiveUsers.js` with these EXACT contents:

```javascript
/**
 * Check 1 (V1's only check) — Inactive billable Linear users.
 *
 * Filters workspace users to those marked active (= billable in Linear's
 * pricing model) but with no recent activity. One finding per user, priced
 * at the customer's plan tier.
 */

const { resolvePlanPrice } = require("../linearPricing")

async function check({ users, settings, inactivityDays }) {
  const planTier = settings?.plan_tier
  const planPrice = resolvePlanPrice(planTier)
  if (planPrice === 0) return { findings: [] }

  const cutoffMs = Date.now() - inactivityDays * 86400 * 1000

  const findings = []
  for (const u of users || []) {
    if (!u.active) continue
    const lastSeenMs = u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : null
    const isInactive = lastSeenMs === null || lastSeenMs < cutoffMs
    if (!isInactive) continue

    const daysSince = lastSeenMs === null
      ? null
      : Math.floor((Date.now() - lastSeenMs) / 86400000)
    const sinceLabel = daysSince === null ? "never logged in" : `last seen ${daysSince} days ago`

    findings.push({
      check: "inactive_user",
      title: `Inactive Linear user: ${u.email || u.displayName || u.name || u.id}`,
      currency: "USD",
      currentValue: planPrice,
      potentialSavings: planPrice,
      evidence: [u.id],
      action: `User ${u.email || u.displayName || u.name || u.id} hasn't logged into Linear (${sinceLabel}). Set them to inactive in Settings → Members to free the seat at $${planPrice}/mo.`,
    })
  }
  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/services/linearChecks/inactiveUsers'); console.log(typeof m.check);"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/linearChecks/inactiveUsers.js
git commit -m "feat(linear): inactive billable users check"
```

---

## Task 11: Aggregator + cost-leaks endpoint

**Files:**
- Create `backend/src/services/linearCostLeakAnalysis.js`
- Modify `backend/src/controllers/linearController.js`
- Modify `backend/src/routes/index.js`

- [ ] **Step 1: Write aggregator**

Create `backend/src/services/linearCostLeakAnalysis.js`:

```javascript
/**
 * Linear cost-leak analysis aggregator.
 *
 * Pulls workspace users once, runs the inactive-users check on them, applies
 * the standard severity ladder, and produces a summary suitable for
 * cost_leak_analyses storage. Single check in V1 — Promise.allSettled is
 * overkill for one item but kept for symmetry with other integrations.
 */

const inactiveUsers = require("./linearChecks/inactiveUsers")
const { PRICING_NOTE } = require("./linearPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeLinearCostLeaks({ listAllUsers, integration, inactivityDays = 60 }) {
  const settings = integration.settings || {}
  const users = await listAllUsers(integration)

  const checks = [
    { name: "inactive_user", run: () => inactiveUsers.check({ users, settings, inactivityDays }) },
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

  return {
    findings: allFindings,
    warnings,
    summary: {
      totalFindings: allFindings.length,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
      healthScore,
      criticalSeverity: counts.critical,
      highSeverity: counts.high,
      mediumSeverity: counts.medium,
      lowSeverity: counts.low,
      pricingNote: PRICING_NOTE,
      activeUserCount: users.filter((u) => u.active).length,
      totalUserCount: users.length,
    },
  }
}

module.exports = { analyzeLinearCostLeaks, severityFor }
```

- [ ] **Step 2: Verify aggregator**

```bash
cd backend && node -e "const m = require('./src/services/linearCostLeakAnalysis'); console.log(typeof m.analyzeLinearCostLeaks, m.severityFor(750), m.severityFor(50));"
```

Expected: `function critical medium`

- [ ] **Step 3: Add analyze handler to controller**

Open `backend/src/controllers/linearController.js`. Add this require IMMEDIATELY AFTER the existing `linearAuth` import block:

```javascript
const { analyzeLinearCostLeaks } = require("../services/linearCostLeakAnalysis")
```

Insert this handler IMMEDIATELY BEFORE the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: analyzeLinearCostLeaks
// ---------------------------------------------------------------------------
async function analyzeLinearCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/linear/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-validate first." })
  }

  // Parse inactivity window (30 / 60 / 90 / 180, default 60)
  let inactivityDays = parseInt(req.body?.inactivityDays, 10)
  if (![30, 60, 90, 180].includes(inactivityDays)) inactivityDays = 60

  // Duplicate-check: same integration within 5 minutes -> 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", LINEAR_PROVIDER)
    .eq("integration_id", integration.id)
    .gte("created_at", fiveMinAgo)
    .limit(1)
    .maybeSingle()
  if (recent) {
    return res.status(409).json({
      error: "An analysis was just run for this integration. Please wait a few minutes.",
      recentAnalysisId: recent.id,
    })
  }

  try {
    const result = await analyzeLinearCostLeaks({ listAllUsers, integration, inactivityDays })
    return res.json({
      summary: result.summary,
      findings: result.findings,
      warnings: result.warnings,
      parameters: { inactivityDays },
    })
  } catch (e) {
    const mapped = mapLinearError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

Update `module.exports` to include the analyze handler:

```javascript
module.exports = {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  getLinearUsers,
  analyzeLinearCostLeaks: analyzeLinearCostLeaksHandler,
  getIntegrationForUser,
  mapLinearError,
  log,
  LINEAR_PROVIDER,
}
```

- [ ] **Step 4: Wire the route**

Open `backend/src/routes/index.js`. Update the destructure to include `analyzeLinearCostLeaks`:

```javascript
const {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  getLinearUsers,
  analyzeLinearCostLeaks,
} = require("../controllers/linearController")
```

Add the route IMMEDIATELY BEFORE the DELETE route. Order should become: oauth/start, callback, validate, status, users, cost-leaks, DELETE.

```javascript
router.post(  "/api/integrations/linear/cost-leaks",  requireAuth, requireRole("owner", "editor"),           analyzeLinearCostLeaks)
```

- [ ] **Step 5: Boot test**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/linearCostLeakAnalysis.js backend/src/controllers/linearController.js backend/src/routes/index.js
git commit -m "feat(linear): aggregator + /cost-leaks endpoint with inactive-users check"
```

---

## Task 12: Docs + brand logo + guide page section

**Files:**
- Modify `docs/tool-analysis-reference.md`
- Modify `frontend/components/tools/tool-logos.tsx`
- Modify `frontend/app/dashboard/tools/guide/page.tsx`

- [ ] **Step 1: Add Linear to reference doc**

Open `docs/tool-analysis-reference.md`. Find the Notion section. Insert a new Linear section AFTER Notion and BEFORE the next section (Stripe or "Usage-Summary Tools"):

```markdown
### Linear — Inactive billable users

Analysis: [linearCostLeakAnalysis.js](../backend/src/services/linearCostLeakAnalysis.js)
Data source: Linear GraphQL API — `users` query with `lastSeenAt`.

Checks (V1, focused — one strong check):
- **Inactive billable users** — `active = true` users with `lastSeenAt` older than the inactivity window (30 / 60 / 90 / 180 days). One finding per user at the customer's plan price.

Pricing: list-price defaults — Standard $8, Plus $14, Enterprise $25. `pricingNote` in summary explains.
Severity ladder: ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low.
Inactivity window: user-selectable, default 60 days.
**Customer-supplied at connect:** plan tier only. Linear's per-active-user pricing means we don't need a separate seat-count input — the bill IS `active_count × plan_price`.

```

Append to the quick-reference table:

```
| Linear | Cost-leak | inactive billable users (lastSeenAt-driven) |
```

- [ ] **Step 2: Add Linear brand logo**

Open `frontend/components/tools/tool-logos.tsx`. Find the existing `notion:` entry. Add this directly AFTER the notion entry's closing `},`:

```typescript
  linear: {
    color: "#5E6AD2",
    // Linear's official mark from simple-icons.
    path: (
      <path
        fill="#5E6AD2"
        d="M.403 13.795l9.802 9.802c5.974-.567 10.696-5.29 11.262-11.263L9.918.064C4.85.64.64 4.85.064 9.918l8.74 8.74-2.81 2.81L.403 13.795zM.002 9.485a12.78 12.78 0 010-1.65l13.948 13.948a12.78 12.78 0 01-1.65 0L.002 9.485zM.246 5.733L18.267 23.754a11.94 11.94 0 002.067-1.064L1.31 3.667a11.94 11.94 0 00-1.064 2.066zm2.07-3.717L21.984 21.684a12.07 12.07 0 001.7-1.764L4.08.317a12.07 12.07 0 00-1.764 1.7z"
      />
    ),
  },
```

- [ ] **Step 3: Add Linear to guide page**

Open `frontend/app/dashboard/tools/guide/page.tsx`. Find the `INTEGRATIONS` array. Add this entry (alphabetical placement is fine):

```typescript
  { id: "linear", label: "Linear", color: "#5E6AD2", desc: "Productivity" },
```

Find the existing Notion section (search for `{/* Notion Section */}`). Insert the new Linear section AFTER the Notion section's closing `</section>`:

```tsx
      {/* Linear Section */}
      <section id="linear" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "linear" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#5E6AD2]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="linear" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Linear</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#5E6AD2]/50 mt-1">&#8226;</span>Workspace admin permissions in Linear</li>
              <li className="flex items-start gap-2"><span className="text-[#5E6AD2]/50 mt-1">&#8226;</span>Permission to create OAuth applications under Settings → API</li>
              <li className="flex items-start gap-2"><span className="text-[#5E6AD2]/50 mt-1">&#8226;</span>Knowledge of your plan tier (Standard / Plus / Enterprise)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open Linear &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Settings</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Account</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">API</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth applications</span>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create new</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Set the Redirect URI to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">http://localhost:4000/api/integrations/linear/callback</span> (substitute your deployed host in production).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#5E6AD2" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Set <strong>Scopes</strong> to:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>read</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save. Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the OAuth app's page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-[#5E6AD2]/80 hover:text-[#5E6AD2] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Linear. Paste the Client ID + Secret. Pick your plan tier. Click Connect.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve the OAuth consent in Linear. You&apos;ll be redirected back to the dashboard with status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span>. Switch to the Analysis tab and run analysis.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            One V1 check: <strong>inactive billable users</strong>. Linear bills per active user per workspace, so any user with <code>active = true</code> who hasn&apos;t logged in within your chosen window (30 / 60 / 90 / 180 days; default 60) is flagged. Pricing uses Linear list rates — Standard $8, Plus $14, Enterprise $25 default. Apply your negotiated discount for actual savings.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access token + refresh token are encrypted at rest with AES-256-GCM before persisting. The OAuth scope is <code>read</code> only — Efficyon can list users and read workspace info but cannot create or modify any Linear data. Access tokens expire in ~10 hours and we refresh them automatically using the refresh token. To revoke any time: Linear &rsaquo; Settings &rsaquo; Account &rsaquo; API &rsaquo; OAuth applications &rsaquo; <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> &rsaquo; Revoke.
          </SecurityBox>
        </div>
      </section>
```

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "linear|Linear" || echo "No Linear-related errors"
```

Expected: `No Linear-related errors`.

- [ ] **Step 5: Commit**

```bash
git add docs/tool-analysis-reference.md frontend/components/tools/tool-logos.tsx frontend/app/dashboard/tools/guide/page.tsx
git commit -m "feat(linear): docs + brand logo + setup-guide section"
```

---

## Task 13: USER ACTION — Final manual browser verification

This is verification only. Pause and tell the user.

The user must:

1. Confirm Task 7 OAuth dance still works
2. Identify or create at least one inactive user in their Linear workspace (set someone to `active = true` but ensure they haven't logged in for 60+ days)
3. In Efficyon: Linear → Analysis tab → choose inactivity window → Run Analysis
4. Verify findings render: at least one `inactive_user` finding per stale user, priced at the plan tier
5. Click History tab → verify the run is persisted
6. Test error path: in Linear, revoke the OAuth app. Re-run analysis. Expected: 401 with "Linear credentials revoked — please reconnect"
7. Reconnect after testing

When passes, reply "done" and we'll merge to main + push.

---

## Self-review checklist

After completing all 13 tasks:

- 19 tools should appear in the dashboard (Linear being the new one)
- A connected Linear integration's detail page renders: workspace info + members table with lastSeenAt
- The Analysis tab shows findings + summary card + pricing note + active/total user counts
- Disconnect cleanly removes encrypted creds + tokens, evicts cache, flips status to disconnected
- The setup-guide page covers Linear alongside the other 18 tools

## Out of scope reminders (DO NOT implement)

These are deliberately deferred from V1:

- Bot/integration user detection (V2)
- Admin over-permissioning audit (V2 — security finding, not cost)
- Plan tier downgrade candidates (V2 — needs feature usage analysis)
- Guest billing audit (V2)
- Workspace consolidation (V2)
- Background scheduled syncs

If you find yourself reaching for any of these, stop — they belong in a future V2 plan.
