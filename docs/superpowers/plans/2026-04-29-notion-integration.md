# Notion Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Notion as Efficyon's 18th integration — V1 detects three light cost-leak signals (bot users counted as paid seats, seat-utilization gap, Notion AI over-provisioning) from a customer's own Notion workspace via a customer-managed public OAuth integration.

**Architecture:** Customer creates a public OAuth integration in their Notion workspace and pastes Client ID + Secret + plan tier + seat counts into Efficyon. Backend does OAuth via `api.notion.com`, persists the (non-expiring) encrypted access token, and pulls `/v1/users` on each analysis to detect bot accounts and seat-utilization gaps. Findings ride in the existing `cost_leak_analyses` table; only schema change is the provider CHECK extension.

**Tech Stack:** Backend Express/CommonJS + Supabase + native `fetch` for Notion REST API calls. Frontend Next.js 16 / React 19 / TypeScript / Tailwind v4. Auth via existing `requireAuth` + `requireRole` middleware. Credential encryption via existing `utils/encryption.js`. Pattern reference: `salesforceController.js` for OAuth dance, `salesforceCostLeakAnalysis.js` for the aggregator.

## Important context for the implementer

- **No test runner.** CLAUDE.md is explicit. Each task's "verification" step is a manual `node -e` smoke test, `curl`, or browser check.
- **Notion access tokens DO NOT expire** — unlike Salesforce, there's no refresh logic. Decrypt + use on every request. No in-process token cache needed.
- **Notion API base:** `https://api.notion.com/v1/...`. Required headers on every request: `Authorization: Bearer <token>`, `Notion-Version: 2022-06-28`.
- **OAuth token exchange uses HTTP Basic auth** (not body-encoded creds like Salesforce). The `Authorization: Basic base64(clientId:clientSecret)` header is required; the body is JSON `{ grant_type, code, redirect_uri }`.
- **Pagination:** Notion uses cursor pagination (`start_cursor`, `next_cursor`, `has_more`), not page-based. Max `page_size` is 100. Cap our pull at 1000 users (10 pages) for safety.
- **No RLS** — `requireAuth` + `requireRole` middleware on every authenticated route. The OAuth `/callback` route is the only one without auth (state param verifies).
- **Cost-leak save pattern:** the `/cost-leaks` endpoint **returns** findings; the frontend POSTs to `/api/analysis-history` to persist (matches GitHub / Stripe / Salesforce).
- **Branch:** create work on a fresh feature branch `feat/notion-integration` (already created if executing this plan via subagent-driven-development that started from this prompt). Do NOT push to remote unless the user requests it.

---

## File Structure

**Backend (new files):**

```
backend/src/utils/notionAuth.js                          OAuth host (single), token exchange, encryption (no refresh)
backend/src/services/notionPricing.js                    Plan tier + Notion AI list-price map
backend/src/services/notionCostLeakAnalysis.js           Aggregator — fans out to 3 checks, severity assignment
backend/src/services/notionChecks/
  ├─ botSeatsBilled.js                                   Filter type==="bot" from /v1/users
  ├─ seatUtilizationGap.js                               Compare paid_seats vs person count
  └─ notionAIOverprovisioning.js                         Compare ai_seats vs person count (only if has_ai)
backend/src/controllers/notionController.js              oauth/start, callback, validate, status, users, cost-leaks, disconnect
backend/sql/050_notion_provider.sql                      Provider CHECK extension
```

**Backend (modify):**

```
backend/src/routes/index.js                              Wire 7 new routes
```

**Frontend (new):**

```
frontend/lib/tools/configs/notion.ts                     UnifiedToolConfig — oauth + plan/seats/AI fields
frontend/components/tools/notion-view.tsx                Data tab — workspace info + members table + limitation banner
```

**Frontend (modify):**

```
frontend/lib/tools/registry.ts                           Register notionConfig
frontend/components/tools/tool-logos.tsx                 Add Notion brand mark
frontend/app/dashboard/tools/guide/page.tsx              Add Notion section + INTEGRATIONS array entry
docs/tool-analysis-reference.md                          Add Notion checks summary
```

---

## Task 1: SQL migration — add Notion provider

**Files:**
- Create: `backend/sql/050_notion_provider.sql`

- [ ] **Step 1: Write the migration**

Create `backend/sql/050_notion_provider.sql`:

```sql
-- Allow Notion as a provider for persisted cost-leak analyses.
-- Findings come from Notion cost-leak analysis (bot users billed as members,
-- seat-utilization gap, Notion AI over-provisioning) via a customer-managed
-- public OAuth integration.

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
    'Notion'
  ));
```

- [ ] **Step 2: Apply via Supabase MCP**

Apply via the Supabase MCP `apply_migration` tool (or paste into Dashboard → SQL Editor → Run).

- [ ] **Step 3: Verify**

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.cost_leak_analyses'::regclass
  AND conname = 'valid_provider';
```

Expected: returned definition contains `'Notion'`.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/050_notion_provider.sql
git commit -m "feat(notion): add provider migration for cost_leak_analyses"
```

---

## Task 2: Pricing constants

**Files:**
- Create: `backend/src/services/notionPricing.js`

- [ ] **Step 1: Write the file**

Create `backend/src/services/notionPricing.js` with these exact contents:

```javascript
/**
 * Notion list-price map. All values are USD/user/mo.
 *
 * Customers typically negotiate 10–30% discounts on Business and 30–50% on
 * Enterprise. The cost-leak summary includes a `pricingNote` instructing them
 * to apply their actual discount. Update annually.
 */

const PLAN_PRICES = {
  free: 0,
  plus: 10,        // $10/seat/mo (annual; $12 monthly)
  business: 18,    // $18/seat/mo (annual; $24 monthly)
  enterprise: 25,  // $25/seat/mo default — highly negotiated, range $20–30+
}

const NOTION_AI_PRICE = 10 // $10/seat/mo add-on, applies to any plan

function resolvePlanPrice(planTier) {
  if (!planTier) return 0
  return PLAN_PRICES[planTier.toLowerCase()] || 0
}

const PRICING_NOTE =
  "Savings shown at Notion list price. Plus $10, Business $18, Enterprise $25 (default — varies). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { PLAN_PRICES, NOTION_AI_PRICE, resolvePlanPrice, PRICING_NOTE }
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/services/notionPricing'); console.log(m.resolvePlanPrice('business'), m.NOTION_AI_PRICE, m.resolvePlanPrice('FREE'));"
```

Expected: `18 10 0`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/notionPricing.js
git commit -m "feat(notion): add list-price map for plans + AI add-on"
```

---

## Task 3: Auth utility

**Files:**
- Create: `backend/src/utils/notionAuth.js`

- [ ] **Step 1: Write the file**

Create `backend/src/utils/notionAuth.js` with these exact contents:

```javascript
/**
 * Notion Auth Utility (per-customer public integration + OAuth 2.0).
 *
 * Customer creates a public OAuth integration at notion.so/my-integrations,
 * gives us Client ID + Secret. We do the standard authorization-code dance
 * via api.notion.com. Notion access tokens DO NOT expire — there's no
 * refresh logic. We persist the encrypted token and reuse it on every call.
 *
 * One quirk vs Salesforce: Notion's token endpoint requires HTTP Basic auth
 * (Authorization: Basic base64(clientId:clientSecret)) with a JSON body.
 */

const { encrypt, decrypt } = require("./encryption")

const NOTION_API_BASE = "https://api.notion.com"
const NOTION_VERSION = "2022-06-28"

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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Notion OAuth credentials")
  }
  return { clientId, clientSecret }
}

function encryptAccessToken(accessToken) {
  if (!accessToken) throw typedError("TOKEN_MISSING", "accessToken is required")
  return { access_token_encrypted: encrypt(accessToken) }
}

function decryptAccessToken(settings) {
  const token = settings?.access_token_encrypted ? decrypt(settings.access_token_encrypted) : null
  if (!token) throw typedError("TOKEN_DECRYPT_FAILED", "No Notion access token stored — please reconnect")
  return token
}

// ---------------------------------------------------------------------------
// State encoding (matches QuickBooks / Salesforce pattern — base64 JSON)
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
// OAuth code → token exchange (HTTP Basic auth, JSON body)
// ---------------------------------------------------------------------------
async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const res = await fetch(`${NOTION_API_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.notionError = body.error
    throw err
  }
  return body // { access_token, token_type, bot_id, workspace_name, workspace_icon, workspace_id, owner, duplicated_template_id }
}

// ---------------------------------------------------------------------------
// Authenticated GET against the Notion API
// ---------------------------------------------------------------------------
async function notionGet(integration, path) {
  const accessToken = decryptAccessToken(integration.settings || {})
  const url = `${NOTION_API_BASE}${path.startsWith("/") ? path : "/" + path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      Accept: "application/json",
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("NOTION_REQUEST_FAILED", body.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.notionError = body.code
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Paginated /v1/users pull (cursor pagination, capped at 1000 users)
// ---------------------------------------------------------------------------
async function listAllUsers(integration, cap = 1000) {
  const out = []
  let cursor = null
  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({ page_size: "100" })
    if (cursor) qs.set("start_cursor", cursor)
    const body = await notionGet(integration, `/v1/users?${qs.toString()}`)
    const items = Array.isArray(body.results) ? body.results : []
    out.push(...items)
    if (out.length >= cap) return out.slice(0, cap)
    if (!body.has_more || !body.next_cursor) break
    cursor = body.next_cursor
  }
  return out
}

module.exports = {
  NOTION_API_BASE,
  NOTION_VERSION,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptAccessToken,
  decryptAccessToken,
  encodeState,
  decodeState,
  exchangeCodeForToken,
  notionGet,
  listAllUsers,
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "
const m = require('./src/utils/notionAuth');
console.log('keys:', Object.keys(m).sort().join(','));
const s = m.encodeState({ company_id: 'co1', integration_id: 'in1' });
console.log('state roundtrip:', JSON.stringify(m.decodeState(s)));
console.log('api base:', m.NOTION_API_BASE);
console.log('version:', m.NOTION_VERSION);
"
```

Expected:
```
keys: NOTION_API_BASE,NOTION_VERSION,decodeState,decryptAccessToken,decryptOAuthCreds,encodeState,encryptAccessToken,encryptOAuthCreds,exchangeCodeForToken,listAllUsers,notionGet
state roundtrip: {"company_id":"co1","integration_id":"in1"}
api base: https://api.notion.com
version: 2022-06-28
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/notionAuth.js
git commit -m "feat(notion): OAuth code exchange + encryption + paginated /v1/users pull"
```

---

## Task 4: Controller — connect / oauth / disconnect handlers

**Files:**
- Create: `backend/src/controllers/notionController.js`

This task creates the connection-management surface. Data and analyze handlers come in Tasks 8 and 11.

- [ ] **Step 1: Write the controller**

Create `backend/src/controllers/notionController.js` with these exact contents:

```javascript
/**
 * Notion Controller (cost-leak analysis).
 *
 * Auth = per-customer public OAuth integration. Customer pastes Client ID +
 * Secret + plan tier + seat counts in the connect form. We do an OAuth 2.0
 * web-server flow, persist encrypted access token, and use it to query
 * /v1/users.
 *
 * Findings: bot users billed as paid seats, seat-utilization gap, Notion AI
 * over-provisioning.
 */

const { supabase } = require("../config/supabase")
const {
  NOTION_API_BASE,
  NOTION_VERSION,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptAccessToken,
  decryptAccessToken,
  encodeState,
  decodeState,
  exchangeCodeForToken,
  notionGet,
} = require("../utils/notionAuth")

const NOTION_PROVIDER = "Notion"

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
    .ilike("provider", NOTION_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Notion integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapNotionError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Notion to provide fresh OAuth credentials." }
  }
  if (code === "TOKEN_DECRYPT_FAILED" || code === "TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Notion." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.notionError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Notion integration page." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Notion rejected the access token — please reconnect.", hint: "The integration may have been disconnected from the workspace." }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Notion throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Notion error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startNotionOAuth
// Builds the authorize URL with state, redirects or returns JSON.
// ---------------------------------------------------------------------------
async function startNotionOAuth(req, res) {
  const endpoint = "GET /api/integrations/notion/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_notion_creds → encrypted on first OAuth start
  if (integration.settings?._pending_notion_creds) {
    try {
      const pending = integration.settings._pending_notion_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_notion_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        plan_tier: pending.planTier || "free",
        total_seats: parseInt(pending.totalSeats, 10) || 0,
        has_ai: pending.hasAI === "yes" || pending.hasAI === true,
        ai_seats: parseInt(pending.aiSeats, 10) || 0,
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapNotionError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Notion Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.NOTION_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/notion/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${NOTION_API_BASE}/v1/oauth/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("owner", "user")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: notionOAuthCallback
// No requireAuth — Notion's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function notionOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/notion/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.NOTION_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/notion/callback"

  let token
  try {
    token = await exchangeCodeForToken({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  const encrypted = encryptAccessToken(token.access_token)
  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        ...encrypted,
        bot_id: token.bot_id || null,
        workspace_id: token.workspace_id || null,
        workspace_name: token.workspace_name || null,
        workspace_icon: token.workspace_icon || null,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?notion_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateNotion
// Pings /v1/users with limit=1 to confirm token still works.
// ---------------------------------------------------------------------------
async function validateNotion(req, res) {
  const endpoint = "POST /api/integrations/notion/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    await notionGet(integration, "/v1/users?page_size=1")
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({ settings: { ...(integration.settings || {}), last_validated_at: nowIso }, status: "connected", updated_at: nowIso })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso })
  } catch (e) {
    const mapped = mapNotionError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getNotionStatus
// Returns settings metadata — no Notion call.
// ---------------------------------------------------------------------------
async function getNotionStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    workspaceId: s.workspace_id || null,
    workspaceName: s.workspace_name || null,
    workspaceIcon: s.workspace_icon || null,
    planTier: s.plan_tier || null,
    totalSeats: s.total_seats ?? null,
    hasAI: s.has_ai === true,
    aiSeats: s.ai_seats ?? null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectNotion
// Clears tokens + creds, flips status.
// ---------------------------------------------------------------------------
async function disconnectNotion(req, res) {
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
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapNotionError,
  log,
  NOTION_PROVIDER,
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && node -e "const m = require('./src/controllers/notionController'); console.log(Object.keys(m).sort().join(','));"
```

Expected: `NOTION_PROVIDER,disconnectNotion,getIntegrationForUser,getNotionStatus,log,mapNotionError,notionOAuthCallback,startNotionOAuth,validateNotion`

(A Supabase env-var warning may print — harmless.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/notionController.js
git commit -m "feat(notion): scaffold controller with oauth + disconnect handlers"
```

---

## Task 5: Wire OAuth + connection routes

**Files:**
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add the require + route registrations**

Open `backend/src/routes/index.js`. Find the existing Salesforce controller require block (search for `salesforceController`). Add this DIRECTLY BELOW it:

```javascript
// Notion Integration Controller - per-customer public OAuth integration
const {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
} = require("../controllers/notionController")
```

Find the existing Salesforce routes block (search for `// Salesforce Integration routes`). Add this DIRECTLY BELOW the Salesforce block:

```javascript
// Notion Integration routes (cost-leak analysis)
router.get(   "/api/integrations/notion/oauth/start", requireAuth, requireRole("owner", "editor"),           startNotionOAuth)
router.get(   "/api/integrations/notion/callback",                                                            notionOAuthCallback) // NO AUTH — Notion browser redirect; state param verifies
router.post(  "/api/integrations/notion/validate",    requireAuth, requireRole("owner", "editor"),           validateNotion)
router.get(   "/api/integrations/notion/status",      requireAuth, requireRole("owner", "editor", "viewer"), getNotionStatus)
router.delete("/api/integrations/notion",             requireAuth, requireRole("owner", "editor"),           disconnectNotion)
```

CRITICAL: do NOT touch any other integration's routes.

- [ ] **Step 2: Boot the server**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot. If port-in-use → DONE_WITH_CONCERNS. Syntax error → BLOCKED.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/index.js
git commit -m "feat(notion): wire oauth/start, callback, validate, status, disconnect routes"
```

---

## Task 6: Frontend config + view + registry

**Files:**
- Create: `frontend/lib/tools/configs/notion.ts`
- Create: `frontend/components/tools/notion-view.tsx` (placeholder; filled in Task 9)
- Modify: `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Write the placeholder view**

Create `frontend/components/tools/notion-view.tsx`:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function NotionView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        Notion's public API doesn't expose per-user login activity. V1 findings cover bot detection
        and the seat-utilization gap. Inactive-user detection requires Audit Log API access (Enterprise
        plan only) and is on the V2 roadmap.
      </div>
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Notion Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Workspace</dt>
          <dd>{statusInfo?.workspaceName || settings.workspace_name || "—"}</dd>
          <dt className="text-muted-foreground">Workspace ID</dt>
          <dd className="font-mono">{statusInfo?.workspaceId || settings.workspace_id || "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{statusInfo?.planTier || settings.plan_tier || "—"}</dd>
          <dt className="text-muted-foreground">Total seats (entered)</dt>
          <dd>{statusInfo?.totalSeats ?? settings.total_seats ?? "—"}</dd>
          <dt className="text-muted-foreground">Notion AI</dt>
          <dd>{statusInfo?.hasAI ? `Yes — ${statusInfo?.aiSeats ?? settings.ai_seats ?? 0} seats` : "No"}</dd>
        </dl>
      </section>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
```

- [ ] **Step 2: Write the tool config**

Create `frontend/lib/tools/configs/notion.ts`:

```typescript
import type { UnifiedToolConfig } from "../types"
import { NotionView } from "@/components/tools/notion-view"

export const notionConfig: UnifiedToolConfig = {
  provider: "Notion",
  id: "notion",
  label: "Notion",
  category: "Productivity",
  description: "Bot users billed as paid seats, seat-utilization gaps, and Notion AI add-on exposure",
  brandColor: "#000000",
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Notion Integration Client ID",
      type: "text",
      required: true,
      hint: "From your Notion integration's secrets page (notion.so/my-integrations)",
    },
    {
      name: "consumerSecret",
      label: "Notion Integration Client Secret",
      type: "password",
      required: true,
      hint: "Same secrets page as the Client ID",
    },
    {
      name: "planTier",
      label: "Plan Tier",
      type: "select",
      required: true,
      options: [
        { value: "free", label: "Free ($0/seat)" },
        { value: "plus", label: "Plus ($10/seat/mo)" },
        { value: "business", label: "Business ($18/seat/mo)" },
        { value: "enterprise", label: "Enterprise ($25/seat/mo default)" },
      ],
    },
    {
      name: "totalSeats",
      label: "Total Paid Seats",
      type: "text",
      required: true,
      placeholder: "25",
      hint: "How many paid seats you purchased — check Notion → Settings → Plans",
    },
    {
      name: "hasAI",
      label: "Notion AI Add-On?",
      type: "select",
      required: true,
      options: [
        { value: "no", label: "No" },
        { value: "yes", label: "Yes — adds $10/seat/mo to detected exposure" },
      ],
    },
    {
      name: "aiSeats",
      label: "Total Notion AI Seats",
      type: "text",
      required: false,
      placeholder: "Leave blank if no AI",
      hint: "Only required if you have Notion AI",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/notion/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Notion",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_notion_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            planTier: values.planTier,
            totalSeats: values.totalSeats,
            hasAI: values.hasAI,
            aiSeats: values.aiSeats || "0",
          },
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to create a Notion public integration",
    steps: [
      "Go to https://www.notion.so/my-integrations",
      "Click 'New integration'. Type: Public. Name: 'Efficyon Cost Analyzer'",
      "Set Redirect URIs to: http://localhost:4000/api/integrations/notion/callback (use prod URL when deploying)",
      "Capabilities: 'Read content' + 'Read user information including email addresses'",
      "Save. Copy OAuth Client ID + Client Secret from the integration's Secrets page",
      "Paste them above along with your plan tier and seat counts, then click Connect",
    ],
    note: "Notion access tokens don't expire — once connected, no re-auth is needed unless you disconnect the integration in your workspace.",
  },
  endpoints: [
    { key: "status", path: "/api/integrations/notion/status" },
  ],
  defaultTab: "status",
  viewComponent: NotionView,
  connectingToast: "Redirecting to Notion to authorize…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access: Notion → Settings & members → Connections → 'Efficyon Cost Analyzer' → Disconnect. Or delete the integration entirely from notion.so/my-integrations.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/notion/cost-leaks",
  analysisSupportsInactivity: false,
}
```

- [ ] **Step 3: Register in the tool registry**

Open `frontend/lib/tools/registry.ts`. Add this import alongside the existing imports:

```typescript
import { notionConfig } from "./configs/notion"
```

Add `Notion: notionConfig,` to the `TOOL_REGISTRY` object (alphabetical placement is fine).

- [ ] **Step 4: Verify type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "notion|Notion" || echo "No Notion-related errors"
```

Expected: `No Notion-related errors`. Pre-existing errors elsewhere are fine.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/tools/configs/notion.ts frontend/components/tools/notion-view.tsx frontend/lib/tools/registry.ts
git commit -m "feat(notion): add tool config + placeholder view + registry entry"
```

---

## Task 7: USER ACTION — Manual OAuth dance against a real Notion workspace

This is verification, not implementation. Pause here.

The user must:

1. Go to https://www.notion.so/my-integrations and create a new **Public** integration named "Efficyon Cost Analyzer Test"
2. Configure capabilities (Read content + Read user info incl. emails)
3. Set Redirect URIs to `http://localhost:4000/api/integrations/notion/callback`
4. Copy OAuth Client ID + Client Secret
5. In Efficyon dashboard: Connect Notion → paste credentials + plan + seat numbers → Connect
6. Browser redirects to Notion → grant access → redirect back with `?notion_consent=success`
7. Verify: integration status `connected`, `workspace_id` + `workspace_name` populated
8. Test disconnect: status flips to `disconnected`

Tell the user explicitly: "Reply when this works and we'll continue with Task 8."

No commit on this task.

---

## Task 8: Data endpoint — workspace users

**Files:**
- Modify: `backend/src/controllers/notionController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add the users handler to the controller**

Open `backend/src/controllers/notionController.js`. Add this require to the existing destructure from `notionAuth` (add `listAllUsers` to the names being imported):

The current line is:
```javascript
const {
  NOTION_API_BASE,
  NOTION_VERSION,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptAccessToken,
  decryptAccessToken,
  encodeState,
  decodeState,
  exchangeCodeForToken,
  notionGet,
} = require("../utils/notionAuth")
```

Add `listAllUsers` to the destructure:

```javascript
const {
  NOTION_API_BASE,
  NOTION_VERSION,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptAccessToken,
  decryptAccessToken,
  encodeState,
  decodeState,
  exchangeCodeForToken,
  notionGet,
  listAllUsers,
} = require("../utils/notionAuth")
```

Insert this handler IMMEDIATELY BEFORE the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: getNotionUsers
// Returns all workspace users (capped at 1000) for the Data tab.
// ---------------------------------------------------------------------------
async function getNotionUsers(req, res) {
  const endpoint = "GET /api/integrations/notion/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const users = await listAllUsers(integration)
    return res.json({ users })
  } catch (e) {
    const mapped = mapNotionError(e)
    log("error", endpoint, "getUsers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

Update the `module.exports` block. The current block is:

```javascript
module.exports = {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapNotionError,
  log,
  NOTION_PROVIDER,
}
```

Replace with:

```javascript
module.exports = {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  getNotionUsers,
  // exported for use by analyze handler added in later tasks:
  getIntegrationForUser,
  mapNotionError,
  log,
  NOTION_PROVIDER,
}
```

- [ ] **Step 2: Wire the route**

Open `backend/src/routes/index.js`. Update the existing destructure of `notionController` to include `getNotionUsers`:

```javascript
const {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  getNotionUsers,
} = require("../controllers/notionController")
```

Add the route in the Notion block, immediately after `/status`:

```javascript
router.get(   "/api/integrations/notion/users",       requireAuth, requireRole("owner", "editor", "viewer"), getNotionUsers)
```

- [ ] **Step 3: Boot the server**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/notionController.js backend/src/routes/index.js
git commit -m "feat(notion): add /users data endpoint"
```

---

## Task 9: Fill in the Data tab UI

**Files:**
- Modify: `frontend/lib/tools/configs/notion.ts` — extend `endpoints`
- Modify: `frontend/components/tools/notion-view.tsx` — add members table

- [ ] **Step 1: Update the config**

In `frontend/lib/tools/configs/notion.ts`, replace the `endpoints` and `defaultTab` fields with:

```typescript
  endpoints: [
    { key: "status", path: "/api/integrations/notion/status" },
    { key: "users",  path: "/api/integrations/notion/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",
```

- [ ] **Step 2: Replace the placeholder view**

Overwrite `frontend/components/tools/notion-view.tsx` ENTIRELY with:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface NotionUser {
  id: string
  type: "person" | "bot"
  name?: string | null
  avatar_url?: string | null
  person?: { email?: string | null }
  bot?: any
}

export function NotionView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: NotionUser[] = (info?.users as NotionUser[] | undefined) || []
  const persons = users.filter((u) => u.type === "person")
  const bots = users.filter((u) => u.type === "bot")

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        Notion's public API doesn't expose per-user login activity. V1 findings cover bot detection
        and the seat-utilization gap. Inactive-user detection requires Audit Log API access (Enterprise
        plan only) and is on the V2 roadmap.
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Notion Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Workspace</dt>
          <dd>{statusInfo?.workspaceName || settings.workspace_name || "—"}</dd>
          <dt className="text-muted-foreground">Workspace ID</dt>
          <dd className="font-mono">{statusInfo?.workspaceId || settings.workspace_id || "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{statusInfo?.planTier || settings.plan_tier || "—"}</dd>
          <dt className="text-muted-foreground">Total seats (entered)</dt>
          <dd>{statusInfo?.totalSeats ?? settings.total_seats ?? "—"}</dd>
          <dt className="text-muted-foreground">Members (humans)</dt>
          <dd>{persons.length}</dd>
          <dt className="text-muted-foreground">Bots</dt>
          <dd>{bots.length}</dd>
          <dt className="text-muted-foreground">Notion AI</dt>
          <dd>{statusInfo?.hasAI ? `Yes — ${statusInfo?.aiSeats ?? settings.ai_seats ?? 0} seats` : "No"}</dd>
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
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.name || "—"}</td>
                  <td>{u.person?.email || "—"}</td>
                  <td>{u.type}</td>
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

- [ ] **Step 3: Verify type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "notion|Notion" || echo "No Notion-related errors"
```

Expected: `No Notion-related errors`.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/tools/configs/notion.ts frontend/components/tools/notion-view.tsx
git commit -m "feat(notion): render data tab — workspace info + members table"
```

---

## Task 10: Three check modules (bundled)

Three small checks bundled in one task. Three separate commits.

**Files:**
- Create: `backend/src/services/notionChecks/botSeatsBilled.js`
- Create: `backend/src/services/notionChecks/seatUtilizationGap.js`
- Create: `backend/src/services/notionChecks/notionAIOverprovisioning.js`

The directory `backend/src/services/notionChecks/` will be auto-created by Write on the first file.

- [ ] **Step 1: Write `botSeatsBilled.js`** (verbatim)

```javascript
/**
 * Check 1 — Bot users billed as paid seats.
 *
 * Notion bots are free, but customers occasionally tell finance that their
 * paid-seat count includes everything in /v1/users. We flag each bot so the
 * customer can verify their seat count excludes them.
 */

const { resolvePlanPrice } = require("../notionPricing")

async function check({ users, settings }) {
  const planTier = settings?.plan_tier
  const planPrice = resolvePlanPrice(planTier)

  const bots = (users || []).filter((u) => u.type === "bot")
  const findings = []
  for (const bot of bots) {
    findings.push({
      check: "bot_seats_billed",
      title: `Bot '${bot.name || bot.id}' may be miscounted as a paid seat`,
      currency: "USD",
      currentValue: planPrice,
      potentialSavings: planPrice,
      evidence: [bot.id],
      action:
        planPrice > 0
          ? `Bot '${bot.name || bot.id}' is in the workspace member list — make sure your ${planTier} seat count doesn't include it. Bots are free in Notion's billing.`
          : `Bot '${bot.name || bot.id}' is in the workspace member list. Bots are free in Notion's billing.`,
    })
  }
  return { findings }
}

module.exports = { check }
```

Verify + commit:

```bash
cd backend && node -e "const m = require('./src/services/notionChecks/botSeatsBilled'); console.log(typeof m.check);"
# Expected: function

git add backend/src/services/notionChecks/botSeatsBilled.js
git commit -m "feat(notion): check 1 — bot users billed as paid seats"
```

- [ ] **Step 2: Write `seatUtilizationGap.js`** (verbatim)

```javascript
/**
 * Check 2 — Seat-utilization gap.
 *
 * Customer enters their total paid seats at connect time. We compare against
 * the actual person count from /v1/users. Any positive gap = unused capacity.
 */

const { resolvePlanPrice } = require("../notionPricing")

async function check({ users, settings }) {
  const planTier = settings?.plan_tier
  const planPrice = resolvePlanPrice(planTier)
  const totalSeats = parseInt(settings?.total_seats, 10) || 0

  if (planPrice === 0 || totalSeats === 0) return { findings: [] }

  const persons = (users || []).filter((u) => u.type === "person")
  const personCount = persons.length
  const gap = totalSeats - personCount

  if (gap <= 0) return { findings: [] }

  const monthlySavings = gap * planPrice
  return {
    findings: [
      {
        check: "seat_utilization_gap",
        title: `${gap} unused seat${gap === 1 ? "" : "s"} on the ${planTier} plan`,
        currency: "USD",
        currentValue: monthlySavings,
        potentialSavings: monthlySavings,
        evidence: [],
        action: `You purchased ${totalSeats} seats but only ${personCount} humans are in the workspace. Reduce seat count to ${personCount} to save $${monthlySavings}/mo.`,
      },
    ],
  }
}

module.exports = { check }
```

Verify + commit:

```bash
cd backend && node -e "const m = require('./src/services/notionChecks/seatUtilizationGap'); console.log(typeof m.check);"
# Expected: function

git add backend/src/services/notionChecks/seatUtilizationGap.js
git commit -m "feat(notion): check 2 — seat-utilization gap"
```

- [ ] **Step 3: Write `notionAIOverprovisioning.js`** (verbatim)

```javascript
/**
 * Check 3 — Notion AI add-on over-provisioning.
 *
 * Conditional: only fires if customer indicated has_ai === true at connect.
 * Compare ai_seats vs person count, same gap pattern as check 2 but at the
 * $10/seat/mo Notion AI rate.
 */

const { NOTION_AI_PRICE } = require("../notionPricing")

async function check({ users, settings }) {
  if (!settings?.has_ai) return { findings: [] }

  const aiSeats = parseInt(settings?.ai_seats, 10) || 0
  if (aiSeats === 0) return { findings: [] }

  const persons = (users || []).filter((u) => u.type === "person")
  const personCount = persons.length
  const aiGap = aiSeats - personCount

  if (aiGap <= 0) return { findings: [] }

  const monthlySavings = aiGap * NOTION_AI_PRICE
  return {
    findings: [
      {
        check: "notion_ai_overprovisioning",
        title: `${aiGap} unused Notion AI seat${aiGap === 1 ? "" : "s"}`,
        currency: "USD",
        currentValue: monthlySavings,
        potentialSavings: monthlySavings,
        evidence: [],
        action: `You bought ${aiSeats} Notion AI seats but only ${personCount} humans are in the workspace. Reduce AI seats to ${personCount} to save $${monthlySavings}/mo.`,
      },
    ],
  }
}

module.exports = { check }
```

Verify + commit:

```bash
cd backend && node -e "const m = require('./src/services/notionChecks/notionAIOverprovisioning'); console.log(typeof m.check);"
# Expected: function

git add backend/src/services/notionChecks/notionAIOverprovisioning.js
git commit -m "feat(notion): check 3 — Notion AI over-provisioning"
```

---

## Task 11: Aggregator + cost-leaks endpoint

**Files:**
- Create: `backend/src/services/notionCostLeakAnalysis.js`
- Modify: `backend/src/controllers/notionController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Write the aggregator**

Create `backend/src/services/notionCostLeakAnalysis.js`:

```javascript
/**
 * Notion cost-leak analysis aggregator.
 *
 * Pulls workspace users once, fans out to the three V1 checks via
 * Promise.allSettled (each check is pure — operates on the cached users array).
 * Applies the standard severity ladder and produces a summary suitable for
 * cost_leak_analyses storage.
 */

const botSeatsBilled = require("./notionChecks/botSeatsBilled")
const seatUtilizationGap = require("./notionChecks/seatUtilizationGap")
const notionAIOverprovisioning = require("./notionChecks/notionAIOverprovisioning")
const { PRICING_NOTE } = require("./notionPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeNotionCostLeaks({ listAllUsers, integration }) {
  const settings = integration.settings || {}
  const users = await listAllUsers(integration)

  const checks = [
    { name: "bot_seats_billed",          run: () => botSeatsBilled.check({ users, settings }) },
    { name: "seat_utilization_gap",      run: () => seatUtilizationGap.check({ users, settings }) },
    { name: "notion_ai_overprovisioning", run: () => notionAIOverprovisioning.check({ users, settings }) },
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
      memberCount: users.filter((u) => u.type === "person").length,
      botCount: users.filter((u) => u.type === "bot").length,
    },
  }
}

module.exports = { analyzeNotionCostLeaks, severityFor }
```

- [ ] **Step 2: Verify aggregator**

```bash
cd backend && node -e "const m = require('./src/services/notionCostLeakAnalysis'); console.log(typeof m.analyzeNotionCostLeaks, m.severityFor(750), m.severityFor(50));"
```

Expected: `function critical medium`

- [ ] **Step 3: Add the analyze handler to the controller**

Open `backend/src/controllers/notionController.js`. Add this require IMMEDIATELY AFTER the existing `notionAuth` import block:

```javascript
const { analyzeNotionCostLeaks } = require("../services/notionCostLeakAnalysis")
```

Insert this handler IMMEDIATELY BEFORE the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: analyzeNotionCostLeaks
// Duplicate-check, run aggregator, return findings (frontend persists via
// /api/analysis-history, matching the GitHub/Stripe/Salesforce pattern).
// ---------------------------------------------------------------------------
async function analyzeNotionCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/notion/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-validate first." })
  }

  // Duplicate-check: same integration within 5 minutes -> 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", NOTION_PROVIDER)
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
    const result = await analyzeNotionCostLeaks({ listAllUsers, integration })
    return res.json({
      summary: result.summary,
      findings: result.findings,
      warnings: result.warnings,
      parameters: {},
    })
  } catch (e) {
    const mapped = mapNotionError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

The current `module.exports` block:

```javascript
module.exports = {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  getNotionUsers,
  // exported for use by analyze handler added in later tasks:
  getIntegrationForUser,
  mapNotionError,
  log,
  NOTION_PROVIDER,
}
```

Replace with:

```javascript
module.exports = {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  getNotionUsers,
  analyzeNotionCostLeaks: analyzeNotionCostLeaksHandler,
  getIntegrationForUser,
  mapNotionError,
  log,
  NOTION_PROVIDER,
}
```

- [ ] **Step 4: Wire the route**

Open `backend/src/routes/index.js`. Update the existing destructure to include `analyzeNotionCostLeaks`:

```javascript
const {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  getNotionUsers,
  analyzeNotionCostLeaks,
} = require("../controllers/notionController")
```

Add the new route in the Notion block, IMMEDIATELY BEFORE the DELETE route:

```javascript
router.post(  "/api/integrations/notion/cost-leaks",  requireAuth, requireRole("owner", "editor"),           analyzeNotionCostLeaks)
```

- [ ] **Step 5: Boot test**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/notionCostLeakAnalysis.js backend/src/controllers/notionController.js backend/src/routes/index.js
git commit -m "feat(notion): aggregator + /cost-leaks endpoint with 3 V1 checks"
```

---

## Task 12: Docs + brand logo + guide page section

**Files:**
- Modify: `docs/tool-analysis-reference.md`
- Modify: `frontend/components/tools/tool-logos.tsx`
- Modify: `frontend/app/dashboard/tools/guide/page.tsx`

- [ ] **Step 1: Add Notion to the reference doc**

Open `docs/tool-analysis-reference.md`. Find the Salesforce section (it ends with a "Inactivity window: user-selectable 30 / 60 / 90 days, default 60." line). Insert a new Notion section AFTER Salesforce and BEFORE the "Stripe" or "Usage-Summary Tools" header that follows.

Insert:

```markdown
### Notion — Seat math (thin V1)

Analysis: [notionCostLeakAnalysis.js](../backend/src/services/notionCostLeakAnalysis.js)
Data source: Notion REST API v1 — `/v1/users` (cursor-paginated).

Checks (V1, thin — Notion's public API has no per-user activity timestamp):
- **Bot users billed as paid seats** — flags every `type === "bot"` member; one finding per bot at the customer's plan price. Bots are free in Notion's billing but customers sometimes include them in their seat count.
- **Seat-utilization gap** — customer-entered `total_seats` minus actual person count. If positive, finding fires with `gap × plan_price` savings.
- **Notion AI over-provisioning** — only fires if customer indicated `has_ai === true`. Compares `ai_seats` vs person count at $10/seat/mo.

Pricing: list-price defaults — Plus $10, Business $18, Enterprise $25 (default — varies by contract). `pricingNote` in summary explains.
Severity ladder: ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — same as everything else.
**Customer-supplied at connect:** plan tier, total seats, has-AI flag, AI seats. Notion's API exposes neither billing nor login activity; these are required.
**No inactive-user detection in V1.** Page edit history scanning + Audit Log API integration deferred to V2.
```

Also append to the quick-reference table at the bottom:

```
| Notion | Cost-leak (thin) | bot seats billed, seat-utilization gap, Notion AI over-provisioning |
```

- [ ] **Step 2: Add Notion brand logo**

Open `frontend/components/tools/tool-logos.tsx`. Find the existing `salesforce:` entry. Add a new entry directly AFTER it:

```typescript
  notion: {
    color: "#000000",
    // Notion's monochrome "N" mark from simple-icons.
    path: (
      <path
        fill="#000000"
        d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.094-.514.28-.887.747-.933z"
      />
    ),
  },
```

- [ ] **Step 3: Add Notion to the guide page**

Open `frontend/app/dashboard/tools/guide/page.tsx`. Find the `INTEGRATIONS` array near the top. Add a new entry (alphabetical placement is fine):

```typescript
  { id: "notion", label: "Notion", color: "#000000", desc: "Productivity" },
```

Then find the existing Stripe section (search for `{/* Stripe Section */}`). Add the Notion section AFTER the Stripe section's closing `</section>`:

```tsx
      {/* Notion Section */}
      <section id="notion" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "notion" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="notion" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Notion</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-white/40 mt-1">&#8226;</span>Workspace owner permissions in your Notion workspace</li>
              <li className="flex items-start gap-2"><span className="text-white/40 mt-1">&#8226;</span>Permission to create public integrations at notion.so/my-integrations</li>
              <li className="flex items-start gap-2"><span className="text-white/40 mt-1">&#8226;</span>Knowledge of your plan tier + seat count (we ask for them at connect — Notion&apos;s API doesn&apos;t expose billing)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open{" "}
                <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                  notion.so/my-integrations <ExternalLink className="w-3 h-3" />
                </a>
                {" "}and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">+ New integration</span>. Choose <strong>Public</strong> (not Internal).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Set the Redirect URI to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">http://localhost:4000/api/integrations/notion/callback</span> (substitute your deployed host in production).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#000000" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Set <strong>Capabilities</strong> to:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Read content</ScopeBadge>
                  <ScopeBadge>Read user information including email addresses</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save. From the integration&apos;s <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Secrets</span> page, copy the <strong>OAuth Client ID</strong> and <strong>Client Secret</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-white/60 hover:text-white transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Notion. Paste the Client ID + Secret. Pick your plan tier. Enter your total paid seats (look it up in Notion → Settings → Plans). Indicate whether you have Notion AI and how many AI seats. Click Connect.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve the OAuth consent in Notion. You&apos;ll be redirected back to the dashboard with status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span>. Switch to the Analysis tab and run analysis.
              </p>
            </div>
          </div>

          <InfoBox title="About findings (and what's missing)">
            Three checks: <strong>bot detection</strong> (every `type === "bot"` member is flagged so you can verify your seat count excludes them), <strong>seat-utilization gap</strong> (your entered seat count minus actual humans, priced at your plan rate), and <strong>Notion AI over-provisioning</strong> (only if you have AI). Pricing uses Notion list rates; the summary tells you to apply your negotiated discount. <strong>Note:</strong> Notion&apos;s public API doesn&apos;t expose per-user login activity, so V1 doesn&apos;t flag individual inactive users — that requires Audit Log API access (Enterprise only) and is on the V2 roadmap.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access token are encrypted at rest with AES-256-GCM before persisting. The OAuth scopes are read-only — Efficyon can list users but cannot read or modify any pages, blocks, or databases. Notion access tokens don&apos;t expire (no refresh logic needed). To revoke any time: Notion → Settings & members → Connections → find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> → Disconnect.
          </SecurityBox>
        </div>
      </section>
```

- [ ] **Step 4: Verify type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "notion|Notion" || echo "No Notion-related errors"
```

Expected: `No Notion-related errors`.

- [ ] **Step 5: Commit**

```bash
git add docs/tool-analysis-reference.md frontend/components/tools/tool-logos.tsx frontend/app/dashboard/tools/guide/page.tsx
git commit -m "feat(notion): docs + brand logo + setup-guide section"
```

---

## Task 13: USER ACTION — Final manual browser verification

This is verification only. No new files. Pause and tell the user.

The user must:

1. Confirm Task 7 OAuth dance still works (or re-do if needed)
2. In their connect form, intentionally enter `total_seats` higher than actual workspace member count (e.g. enter 25 seats when there are only 3 humans)
3. Run analysis from the dashboard
4. Verify findings render: should see at least one `seat_utilization_gap` finding for `(25 - 3) × plan_price`
5. If the Notion workspace has any bot integrations (most do), verify a `bot_seats_billed` finding fires per bot
6. If they entered AI seats, verify the `notion_ai_overprovisioning` check fires
7. Click History tab; verify the run is persisted
8. Test error path: in Notion, disconnect the integration from Settings & members → Connections. Re-run analysis from Efficyon. Expected: 401 with "Notion rejected the access token — please reconnect"
9. Reconnect after testing

When everything passes: reply "done" and we'll merge / push.

---

## Self-review checklist

After completing all 13 tasks:

- 18 tools should appear in the dashboard (Notion being the new one)
- A connected Notion integration's detail page renders: limitation banner + workspace info + members table
- The Analysis tab shows findings with severity badges + summary card + pricing note
- The History tab shows past runs
- Disconnect cleanly removes encrypted creds + tokens, flips status to disconnected
- The setup-guide page covers Notion alongside the other 17 tools

## Out of scope reminders (DO NOT implement)

These are deliberately deferred from V1. Don't build them as part of this plan:

- Inactive user detection via page edit history scanning
- Audit Log API integration (Enterprise plan only)
- Workspace consolidation findings
- Plan tier downgrade recommendations
- Internal Integration Token alternative auth path
- Background scheduled syncs
- Guest-vs-member distinction beyond bot vs person

If you find yourself reaching for any of these, stop — they belong in a future V2 plan.
