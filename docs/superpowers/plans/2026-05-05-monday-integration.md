# monday.com Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monday.com as a cost-leak integration with 5 V1 checks (inactive_user, seat_tier_overprovisioning, disabled_user, pending_invite, view_only_member), following the Atlassian template merged in commit `8f042a9`.

**Architecture:** Per-customer OAuth 2.0 (3LO) against monday.com. GraphQL helper hits `https://api.monday.com/v2`. Five check modules each take `{users, account, settings, inactivityDays}` and return findings; aggregator composes them with `Promise.allSettled` and the standard severity ladder. Frontend follows the unified tool-config pattern — `monday.ts` config + `monday-view.tsx` data tab. Provider name is lowercase `monday` (brand presentation; lookups use `.ilike` so it's case-insensitive).

**Tech Stack:** Backend Express 5 / CommonJS / Node (no TS). Frontend Next.js 16 / React 19 / TS / Tailwind. Supabase Postgres (manual migration apply). No test runner — verification is manual via `npm run dev` and `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-05-monday-integration-design.md` (commit `0a4ae29`)

**Reference commit (template to mirror):** `8f042a9` (Atlassian merge)

---

## File structure

**Created:**
- `backend/sql/053_monday_provider.sql` — DB migration adding `monday` to `cost_leak_analyses.valid_provider`
- `backend/src/services/mondayPricing.js` — pure constants: tier guidance, seat-tier ladder, `nextLowerTier()`
- `backend/src/utils/mondayAuth.js` — OAuth dance, GraphQL helper (`mondayQuery`), directory pull (`fetchUsersAndPlan`), normalizer (`mapDirectoryUser`), token cache
- `backend/src/controllers/mondayController.js` — 7 handlers + `mapMondayError`
- `backend/src/services/mondayChecks/inactiveUser.js`
- `backend/src/services/mondayChecks/seatTierOverprovisioning.js`
- `backend/src/services/mondayChecks/disabledUser.js`
- `backend/src/services/mondayChecks/pendingInvite.js`
- `backend/src/services/mondayChecks/viewOnlyMember.js`
- `backend/src/services/mondayCostLeakAnalysis.js` — aggregator with severity ladder + summary
- `frontend/lib/tools/configs/monday.ts` — UnifiedToolConfig
- `frontend/components/tools/monday-view.tsx` — members data tab

**Modified:**
- `backend/src/routes/index.js` — import controller, wire 7 routes after the Atlassian block
- `frontend/lib/tools/registry.ts` — import + register `mondayConfig`
- `frontend/components/tools/tool-logos.tsx` — add `monday` to `TOOL_BRANDS`
- `frontend/app/dashboard/tools/guide/page.tsx` — add monday.com setup-guide section

**Verification posture:** No test runner exists. Each task ends with: server boot check (`cd backend && npm run dev`), TS typecheck where relevant (`cd frontend && npx tsc --noEmit`), and a commit.

---

## Task 1: DB migration — allow `monday` as a cost-leak provider

**Files:**
- Create: `backend/sql/053_monday_provider.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Allow monday.com as a provider for persisted cost-leak analyses. Findings
-- come from mondayCostLeakAnalysis (5 checks) via a customer-managed OAuth
-- 2.0 (3LO) integration with users:read + account:read scopes.

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
    'Atlassian',
    'monday'
  ));
```

- [ ] **Step 2: Apply the migration**

Apply manually against the Supabase project (this codebase has no migration runner). Use the Supabase SQL editor or CLI:

```bash
# Option A (Supabase CLI — preferred when local stack is up):
supabase db query "$(cat backend/sql/053_monday_provider.sql)"

# Option B (manual): copy-paste the file contents into Supabase Studio → SQL Editor → Run.
```

Expected: `ALTER TABLE` × 2 succeeds, no rows affected.

- [ ] **Step 3: Verify the constraint**

Use the Supabase MCP tool or SQL editor:

```sql
SELECT pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'cost_leak_analyses' AND c.conname = 'valid_provider';
```

Expected: returned definition contains `'monday'`.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/053_monday_provider.sql
git commit -m "feat(monday): add provider migration for cost_leak_analyses"
```

---

## Task 2: Pricing module — tier guidance + seat-tier ladder

**Files:**
- Create: `backend/src/services/mondayPricing.js`

- [ ] **Step 1: Create the file with full content**

```js
/**
 * monday.com tier-guidance constants. USD/seat/mo (annual billing).
 *
 * The customer enters their actual per-seat cost in the connect form. These
 * constants power form hints, the dashboard pricing note, and the seat-tier
 * downgrade math. Update annually if monday changes pricing.
 *
 * monday.com bills seats in fixed tiers — not arbitrary counts. A customer on
 * a 10-seat plan pays for 10 seats even if only 7 are active. To recover
 * spend, drop to the next lower tier that still fits the active count.
 */

const TIER_GUIDANCE = {
  basic:      { usdPerSeatMonthly: 9 },
  standard:   { usdPerSeatMonthly: 12 },
  pro:        { usdPerSeatMonthly: 19 },
  enterprise: { usdPerSeatMonthly: null }, // custom
}

const SEAT_TIERS = [3, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 500, 1000]

/**
 * Given the current seat tier (max_users) and active member count, return the
 * next-lower tier that still fits the active count, or null if no downgrade
 * is possible (already at lowest tier, or active count exceeds all lower tiers).
 */
function nextLowerTier(currentTier, activeCount) {
  const idx = SEAT_TIERS.indexOf(Number(currentTier))
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

module.exports = { TIER_GUIDANCE, SEAT_TIERS, nextLowerTier, PRICING_NOTE }
```

- [ ] **Step 2: Sanity-check the helper from a node REPL**

```bash
cd backend
node -e "const { nextLowerTier, SEAT_TIERS } = require('./src/services/mondayPricing'); console.log({ tier10_active7: nextLowerTier(10, 7), tier10_active5: nextLowerTier(10, 5), tier3_active2: nextLowerTier(3, 2), tiers: SEAT_TIERS })"
```

Expected output:
```
{ tier10_active7: null, tier10_active5: 5, tier3_active2: null, tiers: [3,5,10,15,20,25,30,40,50,100,200,500,1000] }
```

Note: `tier10_active7` returns `null` because the next-lower tier (5) does not fit 7 active users. `tier10_active5` returns `5` because 5 fits.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/mondayPricing.js
git commit -m "feat(monday): add tier-guidance constants + seat-tier ladder"
```

---

## Task 3: Auth utility — OAuth dance + GraphQL helper + directory pull

**Files:**
- Create: `backend/src/utils/mondayAuth.js`

- [ ] **Step 1: Create the file with full content**

```js
/**
 * monday.com Auth Utility (per-customer OAuth 2.0 / 3LO).
 *
 * Customer creates an OAuth app in the monday.com developer center, pastes
 * Client ID + Secret + per-seat cost in the connect form. We do the standard
 * authorization-code flow:
 *   - Authorize URL: https://auth.monday.com/oauth2/authorize
 *   - Token URL:     https://auth.monday.com/oauth2/token  (form-encoded body)
 *
 * monday.com OAuth tokens default to long-lived (no expiry) but if the app is
 * configured for refresh tokens, tokens carry expires_in and rotate via the
 * refresh flow. We support both shapes.
 *
 * API host: https://api.monday.com/v2 (GraphQL only)
 */

const { encrypt, decrypt } = require("./encryption")

const MONDAY_AUTH_HOST = "https://auth.monday.com"
const MONDAY_API_URL = "https://api.monday.com/v2"
const FULL_SCOPES = [
  "me:read",
  "users:read",
  "account:read",
  "boards:read",
  "updates:read",
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt monday.com OAuth credentials")
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
// State encoding (matches Linear / Notion / Atlassian pattern)
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
// OAuth code → tokens exchange
// monday.com uses application/x-www-form-urlencoded body (NOT JSON, unlike Atlassian).
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(`${MONDAY_AUTH_HOST}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.mondayError = json.error
    throw err
  }
  return json // { access_token, refresh_token?, expires_in?, token_type, scope? }
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  const res = await fetch(`${MONDAY_AUTH_HOST}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.mondayError = json.error
    throw err
  }
  return json
}

// ---------------------------------------------------------------------------
// Get a valid access token (refresh if needed)
//
// monday.com tokens may be long-lived (no expires_in) when the OAuth app is
// configured without refresh tokens. We treat missing expires_in as "valid
// until 401" and short-circuit refresh until the API rejects.
// ---------------------------------------------------------------------------
async function getAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token
  if (cached && cached.expiresAt === Infinity) return cached.access_token

  const settings = integration.settings || {}
  const { access_token, refresh_token } = decryptTokens(settings)

  // No refresh token → long-lived flow. Use stored access_token directly.
  if (!refresh_token) {
    if (!access_token) {
      evictToken(integration.id)
      throw typedError("ACCESS_TOKEN_MISSING", "No access token stored — please reconnect")
    }
    tokenCache.set(integration.id, { access_token, expiresAt: Infinity })
    return access_token
  }

  // Refresh-token flow.
  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(settings))
  } catch (e) {
    evictToken(integration.id)
    throw e
  }
  const result = await refreshAccessToken({ clientId, clientSecret, refreshToken: refresh_token })
  if (!result.access_token) {
    throw typedError("OAUTH_REFRESH_FAILED", "Refresh response missing access_token")
  }
  const expiresIn = result.expires_in || 3600
  const expiresAt = Date.now() + expiresIn * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// GraphQL helper — single POST to api.monday.com/v2
// ---------------------------------------------------------------------------
async function mondayQuery(integration, query, variables = {}) {
  const accessToken = await getAccessToken(integration)
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }

  if (!res.ok) {
    const err = typedError("MONDAY_REQUEST_FAILED", body?.errors?.[0]?.message || body?.error_message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.mondayBody = body
    throw err
  }
  // monday returns 200 with errors[] for GraphQL-level failures (e.g. complexity, scope).
  if (Array.isArray(body?.errors) && body.errors.length) {
    const first = body.errors[0]
    const code = first?.extensions?.code || "MONDAY_GRAPHQL_ERROR"
    const err = typedError(code, first?.message || "monday GraphQL error")
    err.httpStatus = code === "ComplexityException" ? 429 : 400
    err.mondayBody = body
    throw err
  }
  return body.data
}

// ---------------------------------------------------------------------------
// Directory pull — single GraphQL request returning users + account/plan.
// Cap at 1000 users for V1.
// ---------------------------------------------------------------------------
const DIRECTORY_QUERY = `
  query MondayDirectory {
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
`

async function fetchUsersAndPlan(integration) {
  const data = await mondayQuery(integration, DIRECTORY_QUERY)
  const rawUsers = Array.isArray(data?.users) ? data.users : []
  const rawAccount = Array.isArray(data?.account) ? data.account[0] : data?.account
  return {
    users: rawUsers.map(mapDirectoryUser),
    account: mapAccount(rawAccount),
  }
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------
function mapDirectoryUser(raw) {
  return {
    id: String(raw.id ?? ""),
    name: raw.name || null,
    email: raw.email || null,
    enabled: !!raw.enabled,
    isPending: !!raw.is_pending,
    isViewOnly: !!raw.is_view_only,
    isGuest: !!raw.is_guest,
    isAdmin: !!raw.is_admin,
    lastActivity: raw.last_activity || null,
    joinDate: raw.join_date || null,
  }
}

function mapAccount(raw) {
  if (!raw) return null
  const plan = raw.plan || {}
  return {
    id: raw.id ? String(raw.id) : null,
    name: raw.name || null,
    slug: raw.slug || null,
    plan: {
      maxUsers: plan.max_users != null ? Number(plan.max_users) : null,
      tier: typeof plan.tier === "string" ? plan.tier.toLowerCase() : null, // free|basic|standard|pro|enterprise
      version: plan.version || null,
      period: plan.period || null,
    },
  }
}

module.exports = {
  MONDAY_AUTH_HOST,
  MONDAY_API_URL,
  FULL_SCOPES,
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
  mondayQuery,
  fetchUsersAndPlan,
  mapDirectoryUser,
  mapAccount,
}
```

- [ ] **Step 2: Verify the file requires cleanly**

```bash
cd backend
node -e "require('./src/utils/mondayAuth'); console.log('OK')"
```

Expected: `OK` (no syntax errors, all imports resolve).

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/mondayAuth.js
git commit -m "feat(monday): OAuth dance + refresh + GraphQL helper + directory pull"
```

---

## Task 4: Controller — handlers + error mapper

**Files:**
- Create: `backend/src/controllers/mondayController.js`

- [ ] **Step 1: Create the file with full content**

```js
/**
 * monday.com Controller (cost-leak analysis).
 *
 * Auth = customer-managed monday.com OAuth 2.0 (3LO) integration. Customer
 * pastes Client ID + Secret + per-seat cost in the connect form. We do the
 * standard authorization-code flow against auth.monday.com, persist encrypted
 * access (+ optional refresh) tokens, then capture account/plan via GraphQL.
 *
 * Findings (5 V1 checks, see services/mondayCostLeakAnalysis.js):
 *   - inactive_user
 *   - seat_tier_overprovisioning
 *   - disabled_user
 *   - pending_invite
 *   - view_only_member
 */

const { supabase } = require("../config/supabase")
const { analyzeMondayCostLeaks } = require("../services/mondayCostLeakAnalysis")
const {
  MONDAY_AUTH_HOST,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  evictToken,
  fetchUsersAndPlan,
} = require("../utils/mondayAuth")

const MONDAY_PROVIDER = "monday"

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
    .ilike("provider", MONDAY_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "monday.com integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapMondayError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect monday.com to provide fresh OAuth credentials." }
  }
  if (code === "ACCESS_TOKEN_MISSING" || code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect monday.com to obtain a token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.mondayError === "invalid_grant" || e.mondayError === "invalid_token")) {
    return { status: 401, code: "monday_credentials_revoked", message: "monday.com credentials revoked — please reconnect.", hint: "The OAuth integration may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.mondayError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your monday.com developer center app page." }
  }
  if (code === "ComplexityException") {
    return { status: 503, message: "monday.com query complexity exceeded — retry in a minute.", hint: null }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "monday.com rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "monday.com throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected monday.com error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startMondayOAuth
// ---------------------------------------------------------------------------
async function startMondayOAuth(req, res) {
  const endpoint = "GET /api/integrations/monday/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_monday_creds → encrypted on first OAuth start
  if (integration.settings?._pending_monday_creds) {
    try {
      const pending = integration.settings._pending_monday_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_monday_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        seat_cost_usd: Number(pending.seatCostUsd) || 0,
      }
      const { error: upgradeError } = await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      if (upgradeError) {
        log("error", endpoint, "failed to persist encrypted credentials", { message: upgradeError.message })
        return res.status(500).json({ error: "Failed to save monday.com credentials — please try again.", hint: null })
      }
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapMondayError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "monday.com Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.MONDAY_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/monday/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${MONDAY_AUTH_HOST}/oauth2/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", FULL_SCOPES.join(" "))
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("response_type", "code")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: mondayOAuthCallback
// No requireAuth — monday.com's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function mondayOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/monday/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.MONDAY_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/monday/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  const encryptedTokens = encryptTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  const nowIso = new Date().toISOString()
  const { error: persistError } = await supabase
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
  if (persistError) {
    log("error", endpoint, "failed to persist tokens", { message: persistError.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Failed to save connection — please try again.")}`)
  }

  // Best-effort: enrich with account + plan
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const { account } = await fetchUsersAndPlan(refreshed)
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshed.settings || {}),
            account_id: account?.id || null,
            account_name: account?.name || null,
            plan_tier: account?.plan?.tier || null,
            plan_max_users: account?.plan?.maxUsers || null,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "account enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?monday_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateMonday
// ---------------------------------------------------------------------------
async function validateMonday(req, res) {
  const endpoint = "POST /api/integrations/monday/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  try {
    const { account } = await fetchUsersAndPlan(integration)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          account_id: account?.id || null,
          account_name: account?.name || null,
          plan_tier: account?.plan?.tier || null,
          plan_max_users: account?.plan?.maxUsers || null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      lastValidatedAt: nowIso,
      accountId: account?.id || null,
      accountName: account?.name || null,
      planTier: account?.plan?.tier || null,
      planMaxUsers: account?.plan?.maxUsers || null,
    })
  } catch (e) {
    const mapped = mapMondayError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getMondayStatus
// ---------------------------------------------------------------------------
async function getMondayStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    accountId: s.account_id || null,
    accountName: s.account_name || null,
    planTier: s.plan_tier || null,
    planMaxUsers: s.plan_max_users || null,
    seatCostUsd: s.seat_cost_usd ?? null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectMonday
// ---------------------------------------------------------------------------
async function disconnectMonday(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorAccountId = integration.settings?.account_id || null

  const { error: disconnectError } = await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_account_id: priorAccountId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  if (disconnectError) {
    log("error", "DELETE /api/integrations/monday", "supabase update on disconnect failed", { message: disconnectError.message })
    return res.status(500).json({ error: "Failed to disconnect — please try again.", hint: null })
  }
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// ---------------------------------------------------------------------------
// Handler: getMondayUsers — feeds the Data tab
// ---------------------------------------------------------------------------
async function getMondayUsers(req, res) {
  const endpoint = "GET /api/integrations/monday/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "monday.com integration is not connected", status: integration.status })
  }
  try {
    const { users, account } = await fetchUsersAndPlan(integration)
    return res.json({
      account: {
        id: account?.id || null,
        name: account?.name || null,
        plan: account?.plan || null,
      },
      users,
      counts: {
        total: users.length,
        active: users.filter((u) => u.enabled && !u.isPending).length,
        pending: users.filter((u) => u.isPending).length,
        viewOnly: users.filter((u) => u.isViewOnly && !u.isGuest).length,
        guest: users.filter((u) => u.isGuest).length,
        disabled: users.filter((u) => !u.enabled).length,
      },
    })
  } catch (e) {
    const mapped = mapMondayError(e)
    log("error", endpoint, "users fetch failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeMondayCostLeaksEndpoint
// Returns findings; the frontend persists via /api/analysis-history.
// ---------------------------------------------------------------------------
async function analyzeMondayCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/monday/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "monday.com integration is not connected", status: integration.status })
  }

  const inactivityDays = Math.max(7, Math.min(365, Number(req.query?.inactivityDays) || 60))

  try {
    const result = await analyzeMondayCostLeaks({
      fetchUsersAndPlan,
      integration,
      inactivityDays,
    })
    return res.json({
      ...result,
      overallSummary: result.summary,
      parameters: { inactivityDays },
      account: {
        id: integration.settings?.account_id || null,
        name: integration.settings?.account_name || null,
        plan_tier: integration.settings?.plan_tier || null,
        plan_max_users: integration.settings?.plan_max_users || null,
      },
    })
  } catch (e) {
    const mapped = mapMondayError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

module.exports = {
  startMondayOAuth,
  mondayOAuthCallback,
  validateMonday,
  getMondayStatus,
  disconnectMonday,
  getMondayUsers,
  analyzeMondayCostLeaksEndpoint,
  getIntegrationForUser,
  mapMondayError,
  log,
  MONDAY_PROVIDER,
}
```

- [ ] **Step 2: Verify the file requires cleanly**

Note: This requires the aggregator file to exist (`mondayCostLeakAnalysis.js`) — that's Task 11. For now, expect a require failure until the aggregator lands. Skip this verification step until then; the syntax check from `node --check` is sufficient:

```bash
cd backend
node --check src/controllers/mondayController.js
```

Expected: no output (clean parse).

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/mondayController.js
git commit -m "feat(monday): controller scaffold (oauth/start, callback, validate, status, disconnect, users, cost-leaks)"
```

---

## Task 5: Wire routes in `routes/index.js`

**Files:**
- Modify: `backend/src/routes/index.js` (insert near the Atlassian block around line 248-257 and 594-601)

- [ ] **Step 1: Add the controller import**

After the Atlassian import block (currently ending at line 257 with `} = require("../controllers/atlassianController")`), insert:

```js
// monday.com Controller - cost-leak integration
const {
  startMondayOAuth,
  mondayOAuthCallback,
  validateMonday,
  getMondayStatus,
  disconnectMonday,
  getMondayUsers,
  analyzeMondayCostLeaksEndpoint,
} = require("../controllers/mondayController")
```

- [ ] **Step 2: Add the route block**

After the Atlassian route block (currently ending at line 601 with `disconnectAtlassian`), insert:

```js
// monday.com cost-leak integration
router.get(   "/api/integrations/monday/oauth/start", requireAuth, requireRole("owner", "editor"),           startMondayOAuth)
router.get(   "/api/integrations/monday/callback",                                                            mondayOAuthCallback) // NO AUTH — monday browser redirect; state param verifies
router.post(  "/api/integrations/monday/validate",    requireAuth, requireRole("owner", "editor"),           validateMonday)
router.get(   "/api/integrations/monday/status",      requireAuth, requireRole("owner", "editor", "viewer"), getMondayStatus)
router.get(   "/api/integrations/monday/users",       requireAuth, requireRole("owner", "editor", "viewer"), getMondayUsers)
router.get(   "/api/integrations/monday/cost-leaks",  requireAuth, requireRole("owner", "editor"),           analyzeMondayCostLeaksEndpoint)
router.delete("/api/integrations/monday",             requireAuth, requireRole("owner", "editor"),           disconnectMonday)
```

- [ ] **Step 3: Verify the routes file parses cleanly**

The aggregator and check modules don't exist yet; the require at the top will fail at runtime. For now, just check the syntax:

```bash
cd backend
node --check src/routes/index.js
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/index.js
git commit -m "feat(monday): wire oauth/start, callback, validate, status, users, cost-leaks, disconnect routes"
```

---

## Task 6: Check — `inactiveUser`

**Files:**
- Create: `backend/src/services/mondayChecks/inactiveUser.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Check: inactive_user
 *
 * Surface paid members who haven't logged in for `inactivityDays` days.
 * Excludes guests (free), pending invites (handled by pending_invite check),
 * and disabled users (handled by disabled_user check).
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isInactive(lastActivityIso, cutoff) {
  if (!lastActivityIso) return false // never-logged-in handled by pending_invite
  const t = new Date(lastActivityIso).getTime()
  if (Number.isNaN(t)) return false
  return t < cutoff
}

async function check({ users, settings, inactivityDays }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (!u.enabled) continue
    if (u.isPending) continue
    if (u.isGuest) continue
    if (!isInactive(u.lastActivity, cutoff)) continue

    const days = Math.max(0, Math.floor((Date.now() - new Date(u.lastActivity).getTime()) / 86400000))

    findings.push({
      check: "inactive_user",
      title: `Inactive monday.com user: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `User ${u.email || u.id} hasn't logged into monday.com in ${days} days. Deactivate via Admin → Users to free the seat (and re-evaluate seat tier — see seat_tier_overprovisioning).`,
    })
  }

  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify the file parses**

```bash
cd backend
node --check src/services/mondayChecks/inactiveUser.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/mondayChecks/inactiveUser.js
git commit -m "feat(monday): inactive_user check"
```

---

## Task 7: Check — `seatTierOverprovisioning`

**Files:**
- Create: `backend/src/services/mondayChecks/seatTierOverprovisioning.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Check: seat_tier_overprovisioning
 *
 * monday.com bills seats in fixed tiers (3/5/10/15/20/25/30/40/50/100/200/500/
 * 1000). If active member count fits in a lower tier, the customer can drop
 * to that tier and recover the delta.
 *
 * Active count = enabled, non-pending, non-guest users.
 *
 * Returns at most one finding (account-level), severity decided by aggregator.
 */

const { nextLowerTier } = require("../mondayPricing")

async function check({ users, account, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const maxUsers = Number(account?.plan?.maxUsers) || 0

  if (!seatCost || !maxUsers) return { findings: [] }

  const activeCount = users.filter((u) => u.enabled && !u.isGuest && !u.isPending).length
  const lower = nextLowerTier(maxUsers, activeCount)
  if (!lower || lower >= maxUsers) return { findings: [] }

  const seatsFreed = maxUsers - lower
  const annualSavings = seatsFreed * seatCost * 12

  return {
    findings: [
      {
        check: "seat_tier_overprovisioning",
        title: `Seat tier overprovisioned: paying for ${maxUsers} seats, ${activeCount} active`,
        currency: "USD",
        currentValue: maxUsers * seatCost * 12,
        potentialSavings: annualSavings,
        evidence: [`tier:${maxUsers}`, `active:${activeCount}`, `recommended:${lower}`],
        action: `Plan billed at ${maxUsers} seats but only ${activeCount} active members. Drop to the ${lower}-seat tier (Admin → Billing) to save ${seatsFreed} seats × $${seatCost}/mo.`,
      },
    ],
  }
}

module.exports = { check }
```

- [ ] **Step 2: Verify the file parses**

```bash
cd backend
node --check src/services/mondayChecks/seatTierOverprovisioning.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/mondayChecks/seatTierOverprovisioning.js
git commit -m "feat(monday): seat_tier_overprovisioning check (signature)"
```

---

## Task 8: Check — `disabledUser`

**Files:**
- Create: `backend/src/services/mondayChecks/disabledUser.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Check: disabled_user
 *
 * Surface users with enabled=false who still appear in the directory.
 * monday.com sometimes keeps disabled users in the directory; whether they
 * still count toward the seat tier depends on plan/version. We surface as a
 * medium-confidence finding and ask the admin to verify in billing.
 */

async function check({ users, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0

  const findings = []
  for (const u of users) {
    if (u.enabled) continue
    if (u.isGuest) continue

    findings.push({
      check: "disabled_user",
      title: `Disabled user still in directory: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `User ${u.email || u.id} is disabled but still appears in the directory. Verify in Admin → Billing whether they're still counted toward your seat tier; if yes, fully delete the user (Admin → Users) to recover the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify**

```bash
cd backend
node --check src/services/mondayChecks/disabledUser.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/mondayChecks/disabledUser.js
git commit -m "feat(monday): disabled_user check"
```

---

## Task 9: Check — `pendingInvite`

**Files:**
- Create: `backend/src/services/mondayChecks/pendingInvite.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Check: pending_invite
 *
 * Surface users with is_pending=true whose invite is older than 14 days.
 * monday.com reserves the seat the moment the invite is sent; if the user
 * never accepts, the seat remains tied up.
 */

const PENDING_THRESHOLD_DAYS = 14

async function check({ users, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const cutoff = Date.now() - PENDING_THRESHOLD_DAYS * 86400000

  const findings = []
  for (const u of users) {
    if (!u.isPending) continue
    if (!u.joinDate) continue // no invite-age signal
    const t = new Date(u.joinDate).getTime()
    if (Number.isNaN(t) || t > cutoff) continue

    const days = Math.max(0, Math.floor((Date.now() - t) / 86400000))

    findings.push({
      check: "pending_invite",
      title: `Pending invite holding a seat: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `Invite to ${u.email || u.id} has been pending for ${days} days, never accepted. Cancel the invite (Admin → Users → Pending invites) to free the seat.`,
    })
  }

  return { findings }
}

module.exports = { check, PENDING_THRESHOLD_DAYS }
```

- [ ] **Step 2: Verify**

```bash
cd backend
node --check src/services/mondayChecks/pendingInvite.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/mondayChecks/pendingInvite.js
git commit -m "feat(monday): pending_invite check"
```

---

## Task 10: Check — `viewOnlyMember`

**Files:**
- Create: `backend/src/services/mondayChecks/viewOnlyMember.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Check: view_only_member
 *
 * On Pro/Enterprise plans, view-only access can be granted to unlimited free
 * guests. Users marked is_view_only=true on a paid plan are paying member
 * rates but only need view access — convert to Guest to recover the seat.
 *
 * Skip on Basic/Standard (no free guest tier on those plans).
 */

const ELIGIBLE_PLANS = new Set(["pro", "enterprise"])

async function check({ users, account, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const planTier = (account?.plan?.tier || "").toLowerCase()
  if (!ELIGIBLE_PLANS.has(planTier)) return { findings: [] }

  const findings = []
  for (const u of users) {
    if (!u.isViewOnly) continue
    if (u.isGuest) continue
    if (!u.enabled) continue

    findings.push({
      check: "view_only_member",
      title: `View-only on paid plan: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id, `plan:${planTier}`],
      action: `User ${u.email || u.id} is view-only on a ${planTier} plan. Convert to Guest (Admin → Users → Change to Guest) — ${planTier} allows unlimited free guests with view-only access.`,
    })
  }

  return { findings }
}

module.exports = { check, ELIGIBLE_PLANS }
```

- [ ] **Step 2: Verify**

```bash
cd backend
node --check src/services/mondayChecks/viewOnlyMember.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/mondayChecks/viewOnlyMember.js
git commit -m "feat(monday): view_only_member check"
```

---

## Task 11: Aggregator — `mondayCostLeakAnalysis.js`

**Files:**
- Create: `backend/src/services/mondayCostLeakAnalysis.js`

- [ ] **Step 1: Create the file**

```js
/**
 * monday.com cost-leak analysis aggregator.
 *
 * Pulls users + account/plan once, fans out to the 5 V1 checks via
 * Promise.allSettled, applies the standard severity ladder
 * (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and produces a
 * summary suitable for cost_leak_analyses storage.
 */

const inactiveUser = require("./mondayChecks/inactiveUser")
const seatTierOverprovisioning = require("./mondayChecks/seatTierOverprovisioning")
const disabledUser = require("./mondayChecks/disabledUser")
const pendingInvite = require("./mondayChecks/pendingInvite")
const viewOnlyMember = require("./mondayChecks/viewOnlyMember")
const { PRICING_NOTE, nextLowerTier } = require("./mondayPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}

async function analyzeMondayCostLeaks({ fetchUsersAndPlan, integration, inactivityDays = 60 }) {
  const settings = integration.settings || {}
  const { users, account } = await fetchUsersAndPlan(integration)

  const checks = [
    { name: "inactive_user",              run: () => inactiveUser.check({ users, settings, inactivityDays }) },
    { name: "seat_tier_overprovisioning", run: () => seatTierOverprovisioning.check({ users, account, settings }) },
    { name: "disabled_user",              run: () => disabledUser.check({ users, settings }) },
    { name: "pending_invite",             run: () => pendingInvite.check({ users, settings }) },
    { name: "view_only_member",           run: () => viewOnlyMember.check({ users, account, settings }) },
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

  const totalUsers = users.length
  const activeCount = users.filter((u) => u.enabled && !u.isGuest && !u.isPending).length
  const pendingCount = users.filter((u) => u.isPending).length
  const planTier = account?.plan?.tier || null
  const seatTier = account?.plan?.maxUsers || null
  const recommendedSeatTier = seatTier ? (nextLowerTier(seatTier, activeCount) ?? seatTier) : null

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
      totalUserCount: totalUsers,
      activeUserCount: activeCount,
      pendingInviteCount: pendingCount,
      planTier,
      seatTier,
      recommendedSeatTier,
    },
  }
}

function round2(x) { return Math.round(x * 100) / 100 }

module.exports = { analyzeMondayCostLeaks, severityFor }
```

- [ ] **Step 2: Verify the controller now requires cleanly**

Now that the aggregator exists, the controller's require chain should resolve:

```bash
cd backend
node -e "require('./src/controllers/mondayController'); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Boot the dev server to confirm no route conflicts**

```bash
cd backend
npm run dev
```

Expected: server starts on `:4000`, log line shows monday routes registered. `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/mondayCostLeakAnalysis.js
git commit -m "feat(monday): aggregator + 5-check fan-out with severity ladder"
```

---

## Task 12: Frontend view — `monday-view.tsx`

> **Order note:** the view must exist before the config (Task 13), because `monday.ts` imports `MondayView` as a value (`viewComponent: MondayView`).

**Files:**
- Create: `frontend/components/tools/monday-view.tsx`

- [ ] **Step 1: Create the view file**

```tsx
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface MondayUser {
  id: string
  name: string | null
  email: string | null
  enabled: boolean
  isPending: boolean
  isViewOnly: boolean
  isGuest: boolean
  isAdmin: boolean
  lastActivity: string | null
  joinDate: string | null
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

function seatLabel(u: MondayUser): string {
  if (!u.enabled) return "disabled"
  if (u.isPending) return "pending"
  if (u.isGuest) return "guest"
  if (u.isViewOnly) return "view-only"
  if (u.isAdmin) return "admin"
  return "member"
}

export function MondayView({ integration, info, isLoading }: ToolViewProps) {
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: MondayUser[] = (info?.users as MondayUser[] | undefined) || []

  const accountName = statusInfo?.accountName || integration.settings?.account_name || null
  const planTier = statusInfo?.planTier || integration.settings?.plan_tier || null
  const planMaxUsers = statusInfo?.planMaxUsers || integration.settings?.plan_max_users || null

  const total = users.length
  const active = users.filter((u) => u.enabled && !u.isPending).length
  const pending = users.filter((u) => u.isPending).length
  const viewOnly = users.filter((u) => u.isViewOnly && !u.isGuest).length
  const guests = users.filter((u) => u.isGuest).length
  const disabled = users.filter((u) => !u.enabled).length

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{accountName ?? "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd className="capitalize">{planTier ?? "—"}</dd>
          <dt className="text-muted-foreground">Seat tier (billed)</dt>
          <dd>{planMaxUsers ?? "—"}</dd>
          <dt className="text-muted-foreground">Active members</dt>
          <dd>{active}</dd>
          <dt className="text-muted-foreground">Pending invites</dt>
          <dd>{pending}</dd>
          <dt className="text-muted-foreground">View-only</dt>
          <dd>{viewOnly}</dd>
          <dt className="text-muted-foreground">Guests</dt>
          <dd>{guests}</dd>
          <dt className="text-muted-foreground">Disabled (still in dir)</dt>
          <dd>{disabled}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Members ({total})</h2>
        {total === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No users returned."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Seat type</th>
                  <th>Last activity</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2">{u.name ?? "—"}</td>
                    <td>{u.email ?? "—"}</td>
                    <td>
                      <span
                        className={
                          !u.enabled
                            ? "text-red-600"
                            : u.isPending
                            ? "text-amber-600"
                            : u.isGuest
                            ? "text-muted-foreground"
                            : "text-green-600"
                        }
                      >
                        {seatLabel(u)}
                      </span>
                    </td>
                    <td>{relative(u.lastActivity)}</td>
                    <td>{u.joinDate ? relative(u.joinDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: clean. If `ToolViewProps` complains about the `info` shape, mirror exactly what `atlassian-view.tsx` uses.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/tools/monday-view.tsx
git commit -m "feat(monday): members data tab view component"
```

---

## Task 13: Frontend tool config + registry + brand logo

**Files:**
- Create: `frontend/lib/tools/configs/monday.ts`
- Modify: `frontend/lib/tools/registry.ts`
- Modify: `frontend/components/tools/tool-logos.tsx`

- [ ] **Step 1: Create `frontend/lib/tools/configs/monday.ts`**

```ts
import type { UnifiedToolConfig } from "../types"
import { MondayView } from "@/components/tools/monday-view"

export const mondayConfig: UnifiedToolConfig = {
  // IDENTITY
  provider: "monday",
  id: "monday",
  label: "monday.com",

  // UI METADATA
  category: "Productivity",
  description:
    "Detect inactive users, seat-tier overprovisioning (monday's signature leak), pending invites holding paid seats, view-only members on paid plans, and disabled users still billing.",
  brandColor: "#FF3D57",

  // AUTH & CONNECT
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "monday.com OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From monday.com Developer Center → your app → OAuth & Permissions",
    },
    {
      name: "consumerSecret",
      label: "monday.com OAuth Client Secret",
      type: "password",
      required: true,
      placeholder: "<client-secret>",
    },
    {
      name: "seatCostUsd",
      label: "Per-seat cost (USD/user/mo)",
      type: "text",
      required: true,
      placeholder: "12",
      hint: "Basic ~$9, Standard ~$12, Pro ~$19 (annual). Enter your actual per-seat rate.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/monday/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
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
      },
    ],
  }),

  // UI HINTS
  callouts: [
    {
      type: "info",
      title: "Admin permission required",
      body: "Connect with a monday.com Admin account — required to read the user directory and account/plan info via the OAuth scopes (users:read, account:read).",
    },
  ],
  quickSetup: {
    title: "How to create a monday.com OAuth app",
    steps: [
      "Open monday.com → Avatar → Developers → Build apps",
      "Create app → Name: 'Efficyon Cost Analyzer'",
      "OAuth & Permissions → add scopes: me:read, users:read, account:read, boards:read, updates:read",
      "OAuth & Permissions → add Redirect URI: http://localhost:4000/api/integrations/monday/callback (use production host when deployed)",
      "Copy the Client ID and Client Secret from the Basic Information tab",
      "Paste them above with your per-seat cost and click Connect",
      "Approve consent on the monday.com screen as an Admin",
    ],
  },

  // DATA FETCHING
  endpoints: [
    { key: "status", path: "/api/integrations/monday/status" },
    { key: "users", path: "/api/integrations/monday/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",

  // DETAIL PAGE
  viewComponent: MondayView,

  // TOASTS
  connectingToast: "Redirecting to monday.com to authorize…",

  // DELETE FLOW
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke manually: monday.com → Avatar → Developers → 'Efficyon Cost Analyzer' → Delete; or Admin → Apps → installed apps → Uninstall.",
  },

  // ANALYSIS
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/monday/cost-leaks",
  analysisSupportsInactivity: true,
}
```

- [ ] **Step 2: Register in `frontend/lib/tools/registry.ts`**

Add the import after the `atlassianConfig` import (around line 33):

```ts
import { mondayConfig } from "./configs/monday"
```

Add the entry to `TOOL_REGISTRY` after the `Atlassian:` line (around line 55):

```ts
  Atlassian: atlassianConfig,
  monday: mondayConfig,
}
```

- [ ] **Step 3: Add brand logo entry in `frontend/components/tools/tool-logos.tsx`**

After the `atlassian:` entry in `TOOL_BRANDS` (around line 269-278), insert:

```tsx
  monday: {
    color: "#FF3D57",
    // monday.com logomark — three vertical bars (red/yellow/teal) approximated.
    // simple-icons does not include monday's official logo, so this is a
    // brand-faithful three-bar glyph.
    path: (
      <>
        <rect x="3"  y="6" width="3.5" height="12" rx="1.75" fill="#FF3D57" />
        <rect x="10.25" y="6" width="3.5" height="12" rx="1.75" fill="#FFCB00" />
        <rect x="17.5"  y="6" width="3.5" height="12" rx="1.75" fill="#00CA72" />
      </>
    ),
  },
```

- [ ] **Step 4: Type-check the frontend**

```bash
cd frontend
npx tsc --noEmit
```

Expected: clean (no errors). The Atlassian config is the closest reference for the `UnifiedToolConfig` shape; if `tsc` reports a missing field, copy from `atlassian.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/tools/configs/monday.ts frontend/lib/tools/registry.ts frontend/components/tools/tool-logos.tsx
git commit -m "feat(monday): tool config + registry entry + brand logo"
```

---

## Task 14: Setup-guide section

**Files:**
- Modify: `frontend/app/dashboard/tools/guide/page.tsx`

The Atlassian setup-guide section was added in commit `2859a0a`. Mirror that section's structure, swapping the content for monday.com.

- [ ] **Step 1: Read the existing file to understand its structure**

```bash
# (using the Read tool — find the Atlassian section and copy its layout)
```

Find the Atlassian section block. It's a JSX `<section>` with a heading, an ordered list of steps, and screenshots/inline notes if any.

- [ ] **Step 2: Add a monday.com section directly after the Atlassian section**

Use the same JSX structure with these contents:

```tsx
<section id="monday" className="scroll-mt-24 space-y-4">
  <h2 className="text-2xl font-semibold">monday.com</h2>
  <p className="text-muted-foreground">
    Connect your monday.com account to detect inactive users, seat-tier
    overprovisioning, view-only members on paid plans, and pending invites
    holding seats. Requires Admin access on monday.com.
  </p>
  <ol className="list-decimal space-y-2 pl-6 text-sm">
    <li>
      In monday.com, click your avatar → <strong>Developers</strong> →
      <strong> Build apps</strong>.
    </li>
    <li>
      Click <strong>Create app</strong> and name it "Efficyon Cost Analyzer".
    </li>
    <li>
      Open <strong>OAuth &amp; Permissions</strong> and add these scopes:
      <code> me:read users:read account:read boards:read updates:read</code>.
    </li>
    <li>
      Under <strong>Redirect URLs</strong> add:
      <code> http://localhost:4000/api/integrations/monday/callback</code>
      (use your production host when deployed).
    </li>
    <li>
      Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from
      the <strong>Basic Information</strong> tab.
    </li>
    <li>
      Back in Efficyon, open the monday.com tile, paste both values plus your
      per-seat cost, and click <strong>Connect</strong>.
    </li>
    <li>
      Approve consent on the monday.com screen as an Admin user.
    </li>
  </ol>
</section>
```

If the page has a table-of-contents at the top, add an entry pointing to `#monday`.

- [ ] **Step 3: Type-check + visual check**

```bash
cd frontend
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3000/dashboard/tools/guide` — confirm the monday.com section renders with all 7 steps. `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/tools/guide/page.tsx
git commit -m "feat(monday): setup-guide section"
```

---

## Task 15: End-to-end smoke test against a real monday.com OAuth app

This task is manual — no code changes. Verifies the full integration works end-to-end before merging.

- [ ] **Step 1: Create a real monday.com OAuth app**

In monday.com → Avatar → Developers → Build apps:
- Create app, name "Efficyon Local Test"
- OAuth & Permissions → scopes: `me:read users:read account:read boards:read updates:read`
- Redirect URL: `http://localhost:4000/api/integrations/monday/callback`
- Copy Client ID + Client Secret

- [ ] **Step 2: Boot both servers**

In two terminals:

```bash
cd backend && npm run dev   # :4000
```
```bash
cd frontend && npm run dev  # :3000
```

- [ ] **Step 3: Connect**

Open `http://localhost:3000/dashboard/tools` → click monday.com → paste Client ID, Client Secret, seat cost (e.g. `12`) → Connect.

Expected: redirected to `auth.monday.com`, approve consent, redirected back to `dashboard/tools/<id>?monday_consent=success`.

- [ ] **Step 4: Verify the directory data tab**

Navigate to the monday.com tool detail page, Data tab. Expected:
- Account name, plan tier, seat tier displayed
- Members table populated
- Counts strip shows total / active / pending / view-only / guest / disabled

- [ ] **Step 5: Run cost-leak analysis**

Click the Analyze button on the Analysis tab. Expected:
- 5 checks run, findings appear with severity badges
- Summary cards show totalPotentialSavings + healthScore
- Pricing note shows the seat-tier ladder explanation

- [ ] **Step 6: Verify persistence**

Run a second analysis, switch to History tab. Expected: 2 saved analyses, sortable by date.

Spot-check the database via Supabase MCP:

```sql
SELECT id, provider, total_potential_savings, created_at
FROM cost_leak_analyses
WHERE provider = 'monday'
ORDER BY created_at DESC
LIMIT 5;
```

Expected: rows with `provider = 'monday'`.

- [ ] **Step 7: Disconnect + reconnect cycle**

From the tool detail page, Disconnect. Expected: status changes to "disconnected", reconnect path works without re-entering Client ID/Secret (they were upgraded to encrypted storage on first connect).

- [ ] **Step 8: Final commit (if any docs/log adjustments came out of the smoke test)**

If smoke uncovered a polish issue (e.g. UI copy tweak), fix and commit:

```bash
git add <files>
git commit -m "fix(monday): <smoke-test polish>"
```

If no fixes needed, this step is a no-op.

---

## Self-review checklist (run after task completion, before opening the PR)

Pre-PR verification — none of these are "in the plan", they're a final sweep:

- [ ] All 5 checks return findings shape `{ check, title, currency, currentValue, potentialSavings, evidence, action }` — confirmed by running smoke test
- [ ] Aggregator severity ladder thresholds match Atlassian (`≥$500/100/25/>0`)
- [ ] `provider: 'monday'` (lowercase) appears in: migration, controller `MONDAY_PROVIDER`, registry key, config `provider`, `tool_name` in the connect form
- [ ] No new routes were registered without `requireAuth + requireRole` (except `/callback` which intentionally has neither)
- [ ] `cd frontend && npx tsc --noEmit` clean
- [ ] `cd backend && npm run dev` boots without route conflicts or require errors
