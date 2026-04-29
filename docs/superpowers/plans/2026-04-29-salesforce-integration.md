# Salesforce Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Salesforce as Efficyon's 17th integration — V1 detects three license-waste signals (inactive licensed users, frozen-but-billed users, unused PermissionSetLicenses) from a customer's own Salesforce org via a customer-managed Connected App + OAuth 2.0 web-server flow.

**Architecture:** Customer pastes Consumer Key + Consumer Secret + chooses orgType (production/sandbox). Backend does OAuth via the matching Salesforce login domain, persists encrypted refresh + access tokens, and uses them to query `User`, `UserLogin`, and `PermissionSetLicenseAssign` via SOQL on each analysis. Findings ride in the existing `cost_leak_analyses` table; only schema change is the provider CHECK extension.

**Tech Stack:** Backend Express/CommonJS + Supabase + native `fetch` for Salesforce REST API calls (no SDK needed). Frontend Next.js 16 / React 19 / TypeScript / Tailwind v4. Auth via existing `requireAuth` + `requireRole` middleware. Credential encryption via existing `utils/encryption.js`. Pattern reference: `quickbooksController.js` for the OAuth dance, `githubController.js` for the cost-leak handler.

## Important context for the implementer

- **No test runner.** CLAUDE.md is explicit: `backend/package.json` test script exits with error; frontend has none. **Each task's "verification" step is a manual `node -e` smoke test, `curl`, or browser check, not an automated test suite.** Don't fabricate test commands.
- **TypeScript build errors are silently ignored** at build time (`frontend/next.config.mjs` has `typescript.ignoreBuildErrors: true`). Run `npx tsc --noEmit` from `frontend/` manually if you need real type-checking.
- **No RLS** — access control lives in `requireAuth` + `requireRole` middleware. Every new authenticated route must use both. The OAuth `/callback` route is the only exception; it has no auth and verifies the request via the `state` parameter.
- **Cost-leak save pattern:** the `/cost-leaks` endpoint **returns** findings but does **not** save them. The frontend persists by POSTing the response to `/api/analysis-history` (matches the GitHub/Zoom/Stripe pattern; see `backend/src/controllers/githubController.js:296-342`).
- **Salesforce REST API base:** every API call uses `${instance_url}/services/data/v60.0/...`. The `instance_url` is captured at OAuth callback time (Salesforce returns it alongside the tokens).
- **Token lifetimes:** Salesforce access tokens default to 2 hours; refresh tokens last until revoked or unused for ~6 months. The auth utility refreshes when the cached access token is within 5 minutes of expiry.
- **OAuth host resolution:** `my_domain` (if set) → `https://test.salesforce.com` (if `org_type === "sandbox"`) → `https://login.salesforce.com` (default). Centralized in `salesforceAuth.resolveOAuthHost()`.
- **State token:** base64-encoded JSON `{ company_id, integration_id }`, matches QuickBooks/HubSpot pattern. NOT signed — that's a known gap across all OAuth integrations and not in scope for this V1.
- **Branch:** create work on a fresh feature branch `feat/salesforce-integration`. Commit after each task. Do NOT push to remote unless the user requests it.

---

## File Structure

**Backend (new files):**

```
backend/src/utils/salesforceAuth.js                       OAuth host resolution + code/refresh exchange + encrypt/decrypt + token cache
backend/src/services/salesforcePricing.js                 Hardcoded list-price map (User Licenses + PSLs) + lookup helpers
backend/src/services/salesforceCostLeakAnalysis.js        Aggregator — fans out to 3 checks, severity assignment
backend/src/services/salesforceChecks/
  ├─ inactiveUsers.js                                     SOQL on User filtered by LastLoginDate
  ├─ frozenButBilled.js                                   SOQL on UserLogin + User join
  └─ unusedPermissionSetLicenses.js                       SOQL on PermissionSetLicenseAssign + Assignee.LastLoginDate
backend/src/controllers/salesforceController.js           oauth/start, callback, validate, status, users, licenses, psls, cost-leaks, disconnect
backend/sql/049_salesforce_provider.sql                   Provider CHECK extension
```

**Backend (modify):**

```
backend/src/routes/index.js                               Wire 9 new routes
```

**Frontend (new):**

```
frontend/lib/tools/configs/salesforce.ts                  UnifiedToolConfig — oauth + sandbox toggle + analysisSupportsInactivity
frontend/components/tools/salesforce-view.tsx             Data tab — Users / License Allocations / PSL panels
```

**Frontend (modify):**

```
frontend/lib/tools/registry.ts                            Register salesforceConfig
frontend/components/tools/tool-logos.tsx                  Add Salesforce brand mark
frontend/app/dashboard/tools/guide/page.tsx               Add Salesforce setup walkthrough section + INTEGRATIONS array entry
docs/tool-analysis-reference.md                           Add Salesforce checks summary
```

---

## Task 1: SQL migration — add Salesforce provider

**Files:**
- Create: `backend/sql/049_salesforce_provider.sql`

- [ ] **Step 1: Write the migration**

Create `backend/sql/049_salesforce_provider.sql`:

```sql
-- Allow Salesforce as a provider for persisted cost-leak analyses.
-- Findings come from Salesforce cost-leak analysis (inactive licensed users,
-- frozen-but-billed users, unused PermissionSetLicenses) via a customer-managed
-- Connected App + OAuth 2.0 web-server flow.

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
    'Salesforce'
  ));
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP `apply_migration` tool (preferred) or paste the file contents into Supabase Dashboard → SQL Editor → Run.

- [ ] **Step 3: Verify the constraint**

Run via MCP `execute_sql` or in the Supabase SQL Editor:

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.cost_leak_analyses'::regclass
  AND conname = 'valid_provider';
```

Expected: returned constraint contains `'Salesforce'` in the IN list.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/049_salesforce_provider.sql
git commit -m "feat(salesforce): add provider migration for cost_leak_analyses"
```

---

## Task 2: Pricing constants

**Files:**
- Create: `backend/src/services/salesforcePricing.js`

- [ ] **Step 1: Write the pricing file**

Create `backend/src/services/salesforcePricing.js` with these exact contents:

```javascript
/**
 * Salesforce list-price map. All values are USD/user/mo unless noted as per-org.
 *
 * NOTE: customers typically negotiate 30–70% discounts. The cost-leak summary
 * includes a `pricingNote` instructing them to apply their actual discount.
 * Update this file annually as Salesforce revises list prices.
 */

// Keyed by Profile.UserLicense.LicenseDefinitionKey (the more granular ID
// returned by SOQL than the human-readable MasterLabel).
const USER_LICENSE_PRICES = {
  // Sales Cloud / Service Cloud editions
  "SFDC":                 165, // Sales Cloud Enterprise (most common standard license)
  "SalesforceUnlimited":  330, // Sales Cloud Unlimited
  "SalesforcePerformance": 450, // Performance Edition
  "SalesforceProfessional": 80, // Sales Cloud Pro
  "SalesforceEssentials":  25, // Salesforce Essentials
  // Platform & specialty licenses
  "SalesforcePlatform":    25,
  "ExternalAppsPlus":       5,
  "Customer Community":     0, // free tier — flagged but not billed
  "ChatterFree":            0,
  "ChatterExternal":        0,
}

// Keyed by PermissionSetLicense.DeveloperName.
const PSL_PRICES = {
  "SalesforceCPQ":          75,
  "SalesCloudEinstein":     50,
  "SalesforceInbox":        25,
  "HighVelocitySalesUser":  75,
  "SalesEngagementUser":    75, // newer rebrand of HVS
  "FieldServiceLightning":  50,
  "FieldServiceMobileApp":  50,
  // PardotPlus is per-org not per-user — flagged separately in checks
}

// Resolves a User Licence to a per-month USD price. Unknown keys return 0.
function resolveUserLicensePrice(licenseDefinitionKey) {
  if (!licenseDefinitionKey) return 0
  return USER_LICENSE_PRICES[licenseDefinitionKey] || 0
}

// Resolves a PermissionSetLicense DeveloperName to a per-month USD price.
// Unknown keys return null (signals "aggregate into the unknown-PSL finding").
function resolvePSLPrice(developerName) {
  if (!developerName) return null
  return PSL_PRICES[developerName] != null ? PSL_PRICES[developerName] : null
}

const PRICING_NOTE =
  "Savings shown at Salesforce list price. Multiply by (1 − your_negotiated_discount) " +
  "for actual recovery. Typical Salesforce contracts have 30–70% discounts off list."

module.exports = {
  USER_LICENSE_PRICES,
  PSL_PRICES,
  resolveUserLicensePrice,
  resolvePSLPrice,
  PRICING_NOTE,
}
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && node -e "const m = require('./src/services/salesforcePricing'); console.log(m.resolveUserLicensePrice('SFDC'), m.resolvePSLPrice('SalesforceCPQ'), m.resolvePSLPrice('UnknownPSL'));"
```

Expected output: `165 75 null`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/salesforcePricing.js
git commit -m "feat(salesforce): add list-price map for user licenses and PSLs"
```

---

## Task 3: Auth utility — OAuth + token refresh + encryption

**Files:**
- Create: `backend/src/utils/salesforceAuth.js`

- [ ] **Step 1: Write the auth utility**

Create `backend/src/utils/salesforceAuth.js`:

```javascript
/**
 * Salesforce Auth Utility (per-customer Connected App + OAuth 2.0 web-server flow).
 *
 * Customer creates a Connected App in their Salesforce org, gives us the
 * Consumer Key + Consumer Secret + chooses orgType (production / sandbox /
 * optional myDomain override). We do the OAuth dance, persist encrypted
 * access + refresh tokens, and refresh on demand.
 *
 * Salesforce specifics:
 *   - Access tokens default to ~2h. Refresh tokens last until revoked.
 *   - The OAuth host depends on org type: login (production), test (sandbox),
 *     or the customer's My Domain. Wrong host = `invalid_grant` errors.
 *   - On token exchange, Salesforce returns `instance_url` — that's the
 *     correct hostname for ALL subsequent REST API calls (NOT login.salesforce.com).
 */

const { encrypt, decrypt } = require("./encryption")

const API_VERSION = "v60.0"
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const tokenCache = new Map() // integrationId -> { access_token, expiresAt }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

// ---------------------------------------------------------------------------
// OAuth host resolution
// ---------------------------------------------------------------------------
function resolveOAuthHost({ org_type, my_domain }) {
  if (my_domain && /^https?:\/\//.test(my_domain)) {
    return my_domain.replace(/\/+$/, "") // strip trailing slash
  }
  if (org_type === "sandbox") return "https://test.salesforce.com"
  return "https://login.salesforce.com"
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Salesforce OAuth credentials")
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
// State encoding (matches QuickBooks pattern — base64 JSON, not signed)
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
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ host, clientId, clientSecret, code, redirectUri }) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(`${host}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.salesforceError = body.error
    throw err
  }
  return body // { access_token, refresh_token, instance_url, id, token_type, issued_at, signature }
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
async function refreshAccessToken({ host, clientId, clientSecret, refreshToken }) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  const res = await fetch(`${host}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.salesforceError = body.error
    throw err
  }
  return body // { access_token, instance_url, id, token_type, issued_at, signature }
}

// ---------------------------------------------------------------------------
// Get a valid access token for an integration (refresh if needed)
// ---------------------------------------------------------------------------
async function getAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token

  const settings = integration.settings || {}
  const { clientId, clientSecret } = decryptOAuthCreds(settings)
  const { refresh_token } = decryptTokens(settings)
  if (!refresh_token) throw typedError("REFRESH_TOKEN_MISSING", "No refresh token stored — please reconnect")

  const host = resolveOAuthHost({ org_type: settings.org_type, my_domain: settings.my_domain })
  const result = await refreshAccessToken({ host, clientId, clientSecret, refreshToken: refresh_token })

  // Salesforce doesn't return expires_in on refresh; assume 2h default
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = {
  API_VERSION,
  resolveOAuthHost,
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
}
```

- [ ] **Step 2: Verify it loads + check pure functions**

```bash
cd backend && node -e "
const m = require('./src/utils/salesforceAuth');
console.log('keys:', Object.keys(m).sort().join(','));
console.log('host (sandbox):', m.resolveOAuthHost({ org_type: 'sandbox' }));
console.log('host (production):', m.resolveOAuthHost({ org_type: 'production' }));
console.log('host (mydomain):', m.resolveOAuthHost({ org_type: 'production', my_domain: 'https://acme.my.salesforce.com/' }));
const s = m.encodeState({ company_id: 'co1', integration_id: 'in1' });
console.log('state roundtrip:', JSON.stringify(m.decodeState(s)));
"
```

Expected:

```
keys: API_VERSION,decodeState,decryptOAuthCreds,decryptTokens,encodeState,encryptOAuthCreds,encryptTokens,evictToken,exchangeCodeForTokens,getAccessToken,refreshAccessToken,resolveOAuthHost
host (sandbox): https://test.salesforce.com
host (production): https://login.salesforce.com
host (mydomain): https://acme.my.salesforce.com
state roundtrip: {"company_id":"co1","integration_id":"in1"}
```

If any line is missing or wrong, STOP and fix before committing.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/salesforceAuth.js
git commit -m "feat(salesforce): OAuth dance + refresh + encryption utility"
```

---

## Task 4: Controller — connect / oauth / disconnect handlers

**Files:**
- Create: `backend/src/controllers/salesforceController.js`

This task creates the controller's connection-management surface (oauth/start, callback, validate, status, disconnect). Data and analyze handlers come in Tasks 8 and 13.

- [ ] **Step 1: Write the controller scaffold**

Create `backend/src/controllers/salesforceController.js`:

```javascript
/**
 * Salesforce Controller (cost-leak analysis).
 *
 * Auth = per-customer Connected App. Customer pastes Consumer Key + Consumer
 * Secret in the connect form (encrypted at rest), chooses orgType, optionally
 * supplies a My Domain URL. We do an OAuth 2.0 web-server flow, persist
 * encrypted access + refresh tokens, and use them to query SOQL.
 *
 * Findings: inactive licensed users, frozen-but-billed users, unused PSLs.
 */

const { supabase } = require("../config/supabase")
const {
  API_VERSION,
  resolveOAuthHost,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  getAccessToken,
  evictToken,
} = require("../utils/salesforceAuth")

const SALESFORCE_PROVIDER = "Salesforce"

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
    .ilike("provider", SALESFORCE_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Salesforce integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapSalesforceError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Salesforce to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Salesforce to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && e.salesforceError === "invalid_grant") {
    return { status: 401, message: "Salesforce credentials revoked — please reconnect.", hint: "The Connected App may have been deleted, or the user authorization was revoked." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Salesforce rejected the access token.", hint: "Reconnect to refresh credentials." }
  }
  if (e.httpStatus === 403) {
    return { status: 403, message: "Salesforce rejected the request — the OAuth scope is insufficient.", hint: "The Connected App needs the 'api' scope at minimum." }
  }
  if (e.salesforceError === "REQUEST_LIMIT_EXCEEDED") {
    return { status: 503, message: "Salesforce daily API limit exhausted — retry tomorrow.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Salesforce error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startSalesforceOAuth
// Builds the authorize URL and either redirects or returns JSON.
// ---------------------------------------------------------------------------
async function startSalesforceOAuth(req, res) {
  const endpoint = "GET /api/integrations/salesforce/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_salesforce_creds → encrypted on first OAuth start
  if (integration.settings?._pending_salesforce_creds) {
    try {
      const pending = integration.settings._pending_salesforce_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_salesforce_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        org_type: pending.orgType || "production",
        my_domain: pending.myDomain || null,
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapSalesforceError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Salesforce Consumer Key not configured. Reconnect first." })
  }

  const host = resolveOAuthHost({
    org_type: integration.settings?.org_type,
    my_domain: integration.settings?.my_domain,
  })
  const redirectUri =
    process.env.SALESFORCE_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/salesforce/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${host}/services/oauth2/authorize`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "api refresh_token offline_access id profile email")
  authUrl.searchParams.set("state", state)

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: salesforceOAuthCallback
// No requireAuth — Salesforce's browser redirect can't carry our session.
// State parameter encodes (company_id, integration_id) for verification.
// ---------------------------------------------------------------------------
async function salesforceOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/salesforce/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const host = resolveOAuthHost({
    org_type: integration.settings?.org_type,
    my_domain: integration.settings?.my_domain,
  })
  const redirectUri =
    process.env.SALESFORCE_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/salesforce/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ host, clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  // Persist encrypted tokens + instance metadata
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
        instance_url: tokens.instance_url,
        org_id: extractOrgIdFromIdUrl(tokens.id),
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?salesforce_consent=success`)
}

// Salesforce's `id` field looks like https://login.salesforce.com/id/<orgId>/<userId>
function extractOrgIdFromIdUrl(idUrl) {
  if (!idUrl) return null
  const m = idUrl.match(/\/id\/([^/]+)\//)
  return m ? m[1] : null
}

// ---------------------------------------------------------------------------
// Handler: validateSalesforce
// Re-pings Salesforce to confirm connection still works (used by "Refresh status" button).
// ---------------------------------------------------------------------------
async function validateSalesforce(req, res) {
  const endpoint = "POST /api/integrations/salesforce/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const accessToken = await getAccessToken(integration)
    const instanceUrl = integration.settings?.instance_url
    if (!instanceUrl) return res.status(400).json({ error: "instance_url not set — please reconnect." })

    const url = `${instanceUrl}/services/data/${API_VERSION}/sobjects/User/describe`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      const err = new Error(body[0]?.message || `HTTP ${r.status}`)
      err.httpStatus = r.status
      err.salesforceError = body[0]?.errorCode
      throw err
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({ settings: { ...(integration.settings || {}), last_validated_at: nowIso }, status: "connected", updated_at: nowIso })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getSalesforceStatus
// Returns settings metadata — no Salesforce call.
// ---------------------------------------------------------------------------
async function getSalesforceStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    orgType: s.org_type || null,
    myDomain: s.my_domain || null,
    instanceUrl: s.instance_url || null,
    orgId: s.org_id || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectSalesforce
// Clears tokens + creds, evicts cache, flips status.
// ---------------------------------------------------------------------------
async function disconnectSalesforce(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorOrgId = integration.settings?.org_id || null
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
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapSalesforceError,
  log,
  SALESFORCE_PROVIDER,
}
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && node -e "const m = require('./src/controllers/salesforceController'); console.log(Object.keys(m).sort().join(','));"
```

Expected output: `SALESFORCE_PROVIDER,disconnectSalesforce,getIntegrationForUser,getSalesforceStatus,log,mapSalesforceError,salesforceOAuthCallback,startSalesforceOAuth,validateSalesforce`

If you see `Cannot find module`, STOP and report BLOCKED.

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/salesforceController.js
git commit -m "feat(salesforce): scaffold controller with oauth + disconnect handlers"
```

---

## Task 5: Wire OAuth + connection routes

**Files:**
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add the require + route registrations**

Open `backend/src/routes/index.js`. Find the existing Stripe Integration controller require block (around line 200, search for `stripeIntegrationController`). Add this directly below it:

```javascript
// Salesforce Integration Controller - per-customer Connected App + OAuth web-server flow
const {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
} = require("../controllers/salesforceController")
```

Then find the existing Stripe Integration routes block (search for `// Stripe Integration routes`). Add this DIRECTLY BELOW the Stripe routes block:

```javascript
// Salesforce Integration routes (cost-leak analysis)
router.get(   "/api/integrations/salesforce/oauth/start", requireAuth, requireRole("owner", "editor"),           startSalesforceOAuth)
router.get(   "/api/integrations/salesforce/callback",                                                            salesforceOAuthCallback) // NO AUTH — Salesforce browser redirect; state param verifies
router.post(  "/api/integrations/salesforce/validate",    requireAuth, requireRole("owner", "editor"),           validateSalesforce)
router.get(   "/api/integrations/salesforce/status",      requireAuth, requireRole("owner", "editor", "viewer"), getSalesforceStatus)
router.delete("/api/integrations/salesforce",             requireAuth, requireRole("owner", "editor"),           disconnectSalesforce)
```

- [ ] **Step 2: Boot the server and verify it loads**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: server boots cleanly with logs like "Server listening on port 4000". The `timeout 10` kills it after 10s.

If you see `SyntaxError`, `ReferenceError`, or `Cannot find module`, STOP and report BLOCKED.

If you see `EADDRINUSE` (port already in use), the user has a server running — report DONE_WITH_CONCERNS noting you couldn't fully verify boot.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/index.js
git commit -m "feat(salesforce): wire oauth/start, callback, validate, status, disconnect routes"
```

---

## Task 6: Frontend config + registry + placeholder view

**Files:**
- Create: `frontend/lib/tools/configs/salesforce.ts`
- Create: `frontend/components/tools/salesforce-view.tsx`
- Modify: `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Write the placeholder view component**

Create `frontend/components/tools/salesforce-view.tsx`:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function SalesforceView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Salesforce Org</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Org ID</dt>
          <dd className="font-mono">{statusInfo?.orgId || settings.org_id || "—"}</dd>
          <dt className="text-muted-foreground">Instance URL</dt>
          <dd className="break-all">{statusInfo?.instanceUrl || settings.instance_url || "—"}</dd>
          <dt className="text-muted-foreground">Org Type</dt>
          <dd>{statusInfo?.orgType || settings.org_type || "—"}</dd>
          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{statusInfo?.lastValidatedAt || settings.last_validated_at || "—"}</dd>
        </dl>
      </section>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
```

- [ ] **Step 2: Write the tool config**

Create `frontend/lib/tools/configs/salesforce.ts`:

```typescript
import type { UnifiedToolConfig } from "../types"
import { SalesforceView } from "@/components/tools/salesforce-view"

export const salesforceConfig: UnifiedToolConfig = {
  provider: "Salesforce",
  id: "salesforce",
  label: "Salesforce",
  category: "CRM/Marketing",
  description: "Inactive licensed users, frozen-but-billed users, and unused Permission Set Licenses",
  brandColor: "#00A1E0",
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Consumer Key",
      type: "text",
      required: true,
      placeholder: "3MVG9...",
      hint: "Setup → App Manager → your Connected App → Manage Consumer Details",
    },
    {
      name: "consumerSecret",
      label: "Consumer Secret",
      type: "password",
      required: true,
      hint: "Same Manage Consumer Details page as the Consumer Key",
    },
    {
      name: "orgType",
      label: "Org Type",
      type: "select",
      required: true,
      options: [
        { value: "production", label: "Production / Developer Edition" },
        { value: "sandbox", label: "Sandbox" },
      ],
    },
    {
      name: "myDomain",
      label: "My Domain URL (optional)",
      type: "text",
      required: false,
      placeholder: "https://acme.my.salesforce.com",
      hint: "Use only if your org has My Domain enforced. Leave blank otherwise.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/salesforce/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Salesforce",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_salesforce_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            orgType: values.orgType,
            myDomain: values.myDomain || null,
          },
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to create a Salesforce Connected App",
    steps: [
      "In Salesforce: Setup → App Manager → New Connected App",
      "Name it 'Efficyon Cost Analyzer', enter any contact email",
      "Check 'Enable OAuth Settings'",
      "Callback URL: http://localhost:4000/api/integrations/salesforce/callback (use your prod URL when deploying)",
      "Selected OAuth Scopes: 'Manage user data via APIs (api)', 'Perform requests on your behalf at any time (refresh_token, offline_access)', 'Access the identity URL service (id, profile, email)'",
      "Save. Wait ~10 minutes for the App to propagate, then copy the Consumer Key + Secret",
    ],
    note: "Salesforce takes up to 10 minutes for newly-created Connected Apps to propagate. First OAuth attempts before propagation often fail with confusing errors — wait, then retry.",
  },
  endpoints: [
    { key: "status", path: "/api/integrations/salesforce/status" },
  ],
  defaultTab: "status",
  viewComponent: SalesforceView,
  connectingToast: "Redirecting to Salesforce to authorize…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, go to your Salesforce org → Setup → Connected Apps OAuth Usage → find 'Efficyon Cost Analyzer' → Revoke. Or delete the Connected App entirely from App Manager.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/salesforce/cost-leaks",
  analysisSupportsInactivity: true,
}
```

- [ ] **Step 3: Register in the tool registry**

Open `frontend/lib/tools/registry.ts`. Add this import (alphabetical placement is fine; insert near the existing imports):

```typescript
import { salesforceConfig } from "./configs/salesforce"
```

Add `Salesforce: salesforceConfig,` to the `TOOL_REGISTRY` object. Alphabetical placement (e.g. between `QuickBooks` and `Shopify`) is fine.

- [ ] **Step 4: Verify the frontend type-checks**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "salesforce|Salesforce" || echo "No Salesforce-related errors"
```

Expected: `No Salesforce-related errors`. Pre-existing errors elsewhere are fine — the codebase has TS errors silently ignored at build time.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/tools/configs/salesforce.ts frontend/components/tools/salesforce-view.tsx frontend/lib/tools/registry.ts
git commit -m "feat(salesforce): add tool config + placeholder view + registry entry"
```

---

## Task 7: USER ACTION — Manual OAuth dance against a Developer Edition org

This is verification, not implementation. Pause here and tell the user.

The user must:

1. Sign up for a free Salesforce Developer Edition org at developer.salesforce.com (~5 min)
2. Setup → App Manager → New Connected App; configure per the quickSetup steps in the config (Task 6)
3. Wait ~10 minutes for the Connected App to propagate
4. In Efficyon dashboard: Connect Salesforce → paste Consumer Key + Secret + choose Production
5. Click Connect — browser redirects to Salesforce login → grant access → redirected back with `?salesforce_consent=success`
6. Verify: integration status `connected`, `instance_url` populated, `org_id` populated
7. Test error path: in Salesforce, manually revoke access (Setup → Connected Apps OAuth Usage → Revoke). Click "Refresh status" in Efficyon. Expected: 401 "credentials revoked".
8. Test disconnect: click Disconnect in UI. Expected: status flips to `disconnected`, encrypted tokens cleared from `company_integrations.settings`.

Tell the user explicitly: "Reply when this works and we'll continue with Task 8 (data endpoints). If anything breaks, paste the error and we'll debug."

No commit on this task.

---

## Task 8: Data endpoints — users, licenses, psls

**Files:**
- Modify: `backend/src/controllers/salesforceController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add three data handlers + a SOQL helper to the controller**

Open `backend/src/controllers/salesforceController.js`. Add this helper near the top of the file, immediately after `mapSalesforceError`:

```javascript
// ---------------------------------------------------------------------------
// SOQL helper — execute a single SOQL query against the integration's instance
// ---------------------------------------------------------------------------
async function executeSOQL(integration, soql) {
  const accessToken = await getAccessToken(integration)
  const instanceUrl = integration.settings?.instance_url
  if (!instanceUrl) {
    const err = new Error("instance_url not set — please reconnect")
    err.code = "INSTANCE_URL_MISSING"
    err.httpStatus = 400
    throw err
  }
  const url = `${instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(body[0]?.message || `HTTP ${r.status}`)
    err.httpStatus = r.status
    err.salesforceError = body[0]?.errorCode
    throw err
  }
  return body
}
```

Then insert the three data handlers BEFORE the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: getSalesforceUsers
// Returns the 50 most recent users for the Data tab.
// ---------------------------------------------------------------------------
async function getSalesforceUsers(req, res) {
  const endpoint = "GET /api/integrations/salesforce/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const soql =
      "SELECT Id, Username, Name, Email, IsActive, LastLoginDate, " +
      "Profile.Name, Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey " +
      "FROM User " +
      "WHERE UserType = 'Standard' " +
      "ORDER BY LastLoginDate DESC NULLS LAST " +
      "LIMIT 50"
    const result = await executeSOQL(integration, soql)
    return res.json({ users: result.records || [] })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "getUsers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getSalesforceLicenses
// Returns UserLicense allocation table.
// ---------------------------------------------------------------------------
async function getSalesforceLicenses(req, res) {
  const endpoint = "GET /api/integrations/salesforce/licenses"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const soql =
      "SELECT Id, MasterLabel, LicenseDefinitionKey, Name, Status, TotalLicenses, UsedLicenses " +
      "FROM UserLicense " +
      "ORDER BY MasterLabel"
    const result = await executeSOQL(integration, soql)
    return res.json({ licenses: result.records || [] })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "getLicenses failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getSalesforcePSLs
// Returns PermissionSetLicense allocation table.
// ---------------------------------------------------------------------------
async function getSalesforcePSLs(req, res) {
  const endpoint = "GET /api/integrations/salesforce/psls"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const soql =
      "SELECT Id, MasterLabel, DeveloperName, Status, TotalLicenses, UsedLicenses, ExpirationDate " +
      "FROM PermissionSetLicense " +
      "ORDER BY MasterLabel"
    const result = await executeSOQL(integration, soql)
    return res.json({ psls: result.records || [] })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "getPSLs failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

Update the `module.exports` block to include the three new handlers AND export `executeSOQL` for the check modules to reuse:

```javascript
module.exports = {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  getSalesforceUsers,
  getSalesforceLicenses,
  getSalesforcePSLs,
  executeSOQL,
  // exported for use by analyze handler added in later tasks:
  getIntegrationForUser,
  mapSalesforceError,
  log,
  SALESFORCE_PROVIDER,
}
```

- [ ] **Step 2: Wire the three routes**

Open `backend/src/routes/index.js`. Update the existing destructure of `salesforceController`:

```javascript
const {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  getSalesforceUsers,
  getSalesforceLicenses,
  getSalesforcePSLs,
} = require("../controllers/salesforceController")
```

Add three new GET routes immediately after the existing `/status` line in the Salesforce block:

```javascript
router.get(   "/api/integrations/salesforce/users",       requireAuth, requireRole("owner", "editor", "viewer"), getSalesforceUsers)
router.get(   "/api/integrations/salesforce/licenses",    requireAuth, requireRole("owner", "editor", "viewer"), getSalesforceLicenses)
router.get(   "/api/integrations/salesforce/psls",        requireAuth, requireRole("owner", "editor", "viewer"), getSalesforcePSLs)
```

- [ ] **Step 3: Boot the server**

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot. Same fallback rules as Task 5 (port-in-use → DONE_WITH_CONCERNS; syntax error → BLOCKED).

- [ ] **Step 4: curl each endpoint (assuming Task 7 connected a real org)**

```bash
TOKEN="your-jwt-here"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/salesforce/users | jq '.users | length'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/salesforce/licenses | jq '.licenses | length'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/salesforce/psls | jq '.psls | length'
```

Expected: each returns valid JSON; lengths reflect what's in the test org.

If Task 7 hasn't been completed (no real connection yet), skip Step 4 and just commit. The handlers will be exercised in Task 16.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/salesforceController.js backend/src/routes/index.js
git commit -m "feat(salesforce): add users/licenses/psls data endpoints + SOQL helper"
```

---

## Task 9: Fill in the Data tab UI

**Files:**
- Modify: `frontend/lib/tools/configs/salesforce.ts` — extend `endpoints`
- Modify: `frontend/components/tools/salesforce-view.tsx` — replace placeholder with three panels

- [ ] **Step 1: Update the config to fetch the 3 data lists**

In `frontend/lib/tools/configs/salesforce.ts`, find the existing `endpoints` array (currently has only the `status` entry) and `defaultTab`. Replace those two fields with:

```typescript
  endpoints: [
    { key: "status",    path: "/api/integrations/salesforce/status" },
    { key: "users",     path: "/api/integrations/salesforce/users", pick: ["users"], fallback: [] },
    { key: "licenses",  path: "/api/integrations/salesforce/licenses", pick: ["licenses"], fallback: [] },
    { key: "psls",      path: "/api/integrations/salesforce/psls", pick: ["psls"], fallback: [] },
  ],
  defaultTab: "users",
```

- [ ] **Step 2: Replace the placeholder view**

Overwrite `frontend/components/tools/salesforce-view.tsx` entirely with:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface SfUser {
  Id: string
  Username: string
  Name: string
  Email?: string
  IsActive: boolean
  LastLoginDate?: string | null
  Profile?: {
    Name?: string
    UserLicense?: { MasterLabel?: string; LicenseDefinitionKey?: string }
  }
}

interface SfLicense {
  Id: string
  MasterLabel: string
  LicenseDefinitionKey: string
  Status: string
  TotalLicenses: number
  UsedLicenses: number
}

interface SfPSL {
  Id: string
  MasterLabel: string
  DeveloperName: string
  Status: string
  TotalLicenses: number
  UsedLicenses: number
  ExpirationDate?: string | null
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString()
}

export function SalesforceView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: SfUser[] = (info?.users as SfUser[] | undefined) || []
  const licenses: SfLicense[] = (info?.licenses as SfLicense[] | undefined) || []
  const psls: SfPSL[] = (info?.psls as SfPSL[] | undefined) || []

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Salesforce Org</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Org ID</dt>
          <dd className="font-mono">{statusInfo?.orgId || settings.org_id || "—"}</dd>
          <dt className="text-muted-foreground">Instance URL</dt>
          <dd className="break-all">{statusInfo?.instanceUrl || settings.instance_url || "—"}</dd>
          <dt className="text-muted-foreground">Org Type</dt>
          <dd>{statusInfo?.orgType || settings.org_type || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Username</th>
                <th>Profile</th>
                <th>License</th>
                <th>Active</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.Id} className="border-t">
                  <td className="py-2">{u.Username}</td>
                  <td>{u.Profile?.Name || "—"}</td>
                  <td>{u.Profile?.UserLicense?.MasterLabel || "—"}</td>
                  <td>{u.IsActive ? "Yes" : "No"}</td>
                  <td>{formatDate(u.LastLoginDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">User License Allocations ({licenses.length})</h2>
        {licenses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No licenses returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">License</th>
                <th>Status</th>
                <th>Used</th>
                <th>Total</th>
                <th>Unused</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.Id} className="border-t">
                  <td className="py-2">{l.MasterLabel}</td>
                  <td>{l.Status}</td>
                  <td>{l.UsedLicenses}</td>
                  <td>{l.TotalLicenses}</td>
                  <td>{Math.max(0, l.TotalLicenses - l.UsedLicenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Permission Set Licenses ({psls.length})</h2>
        {psls.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No PSLs returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">PSL</th>
                <th>Status</th>
                <th>Used</th>
                <th>Total</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {psls.map((p) => (
                <tr key={p.Id} className="border-t">
                  <td className="py-2">{p.MasterLabel}</td>
                  <td>{p.Status}</td>
                  <td>{p.UsedLicenses}</td>
                  <td>{p.TotalLicenses}</td>
                  <td>{formatDate(p.ExpirationDate)}</td>
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
cd frontend && npx tsc --noEmit 2>&1 | grep -E "salesforce|Salesforce" || echo "No Salesforce-related errors"
```

Expected: `No Salesforce-related errors`.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/tools/configs/salesforce.ts frontend/components/tools/salesforce-view.tsx
git commit -m "feat(salesforce): render data tab — users, licenses, PSLs"
```

---

## Task 10: Check 1 — inactive licensed users

**Files:**
- Create: `backend/src/services/salesforceChecks/inactiveUsers.js`

The `backend/src/services/salesforceChecks/` directory is auto-created by Write on first file.

- [ ] **Step 1: Write the check**

Create `backend/src/services/salesforceChecks/inactiveUsers.js`:

```javascript
/**
 * Check 1 — Inactive licensed users.
 *
 * Pulls active Standard users whose LastLoginDate is older than the threshold
 * (or null = never logged in). Each becomes a finding priced from the user's
 * UserLicense via salesforcePricing.
 */

const { resolveUserLicensePrice } = require("../salesforcePricing")

async function check({ executeSOQL, integration, inactivityDays }) {
  const cutoffMs = Date.now() - inactivityDays * 86400 * 1000
  const cutoffIso = new Date(cutoffMs).toISOString()

  const soql =
    "SELECT Id, Username, Name, LastLoginDate, " +
    "Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey " +
    "FROM User " +
    "WHERE IsActive = true AND UserType = 'Standard' " +
    `AND (LastLoginDate < ${cutoffIso} OR LastLoginDate = null)`
  const result = await executeSOQL(integration, soql)
  const users = result.records || []

  const findings = []
  for (const u of users) {
    const sku = u.Profile?.UserLicense?.LicenseDefinitionKey
    const skuLabel = u.Profile?.UserLicense?.MasterLabel || "Unknown license"
    const monthly = resolveUserLicensePrice(sku)
    const daysSince = u.LastLoginDate
      ? Math.floor((Date.now() - new Date(u.LastLoginDate).getTime()) / 86400000)
      : null
    const sinceLabel = daysSince === null ? "never logged in" : `last login ${daysSince} days ago`

    findings.push({
      check: "inactive_user",
      title: `Inactive user: ${u.Username} (${skuLabel})`,
      currency: "USD",
      currentValue: monthly,
      potentialSavings: monthly,
      evidence: [u.Id],
      action:
        monthly > 0
          ? `Deactivate the user (Setup → Users) or downgrade their license — ${sinceLabel}.`
          : `Deactivate the user (Setup → Users) — ${sinceLabel}. License pricing not in catalog; verify in your Salesforce contract.`,
    })
  }
  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && node -e "const m = require('./src/services/salesforceChecks/inactiveUsers'); console.log(typeof m.check);"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/salesforceChecks/inactiveUsers.js
git commit -m "feat(salesforce): check 1 — inactive licensed users"
```

---

## Task 11: Check 2 — frozen-but-billed users

**Files:**
- Create: `backend/src/services/salesforceChecks/frozenButBilled.js`

- [ ] **Step 1: Write the check**

Create `backend/src/services/salesforceChecks/frozenButBilled.js`:

```javascript
/**
 * Check 2 — Frozen-but-billed users.
 *
 * Salesforce admins can "freeze" a user (Setup → Users → Login Information)
 * which prevents login but does NOT release the license slot. Admins frequently
 * forget to follow up with full deactivation. This is the equivalent of Slack's
 * "deactivated but still billable" data-lag bug.
 *
 * Two-step query: get all frozen UserLogin rows, then look up which of those
 * users still have IsActive = true (i.e., still consume a license slot).
 */

const { resolveUserLicensePrice } = require("../salesforcePricing")

async function check({ executeSOQL, integration }) {
  // Step 1: get all frozen UserLogin rows
  const frozenSoql = "SELECT UserId FROM UserLogin WHERE IsFrozen = true"
  const frozen = await executeSOQL(integration, frozenSoql)
  const frozenIds = (frozen.records || []).map((r) => r.UserId).filter(Boolean)
  if (frozenIds.length === 0) return { findings: [] }

  // Step 2: look up which of those are still IsActive (consuming licenses)
  const idList = frozenIds.map((id) => `'${id}'`).join(",")
  const userSoql =
    "SELECT Id, Username, Name, " +
    "Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey " +
    `FROM User WHERE IsActive = true AND Id IN (${idList})`
  const users = await executeSOQL(integration, userSoql)

  const findings = []
  for (const u of users.records || []) {
    const sku = u.Profile?.UserLicense?.LicenseDefinitionKey
    const skuLabel = u.Profile?.UserLicense?.MasterLabel || "Unknown license"
    const monthly = resolveUserLicensePrice(sku)
    findings.push({
      check: "frozen_but_billed",
      title: `Frozen user still billed: ${u.Username} (${skuLabel})`,
      currency: "USD",
      currentValue: monthly,
      potentialSavings: monthly,
      evidence: [u.Id],
      action:
        "User is frozen (Setup → Users → Login Information) but still IsActive — deactivate to free the license slot.",
    })
  }
  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && node -e "const m = require('./src/services/salesforceChecks/frozenButBilled'); console.log(typeof m.check);"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/salesforceChecks/frozenButBilled.js
git commit -m "feat(salesforce): check 2 — frozen-but-billed users"
```

---

## Task 12: Check 3 — unused PermissionSetLicenses

**Files:**
- Create: `backend/src/services/salesforceChecks/unusedPermissionSetLicenses.js`

- [ ] **Step 1: Write the check**

Create `backend/src/services/salesforceChecks/unusedPermissionSetLicenses.js`:

```javascript
/**
 * Check 3 — Unused PermissionSetLicenses.
 *
 * Paid feature licenses (CPQ, Sales Cloud Einstein, etc.) attached to users who
 * haven't logged in within the inactivity window. Two output shapes:
 *   - Known paid PSLs (in salesforcePricing.PSL_PRICES): per-assignment finding
 *     priced at list.
 *   - Unknown PSLs: aggregated into a single low-severity finding listing the
 *     count and PSL names — flagged for manual review.
 */

const { resolvePSLPrice } = require("../salesforcePricing")

async function check({ executeSOQL, integration, inactivityDays }) {
  const cutoffMs = Date.now() - inactivityDays * 86400 * 1000
  const cutoffIso = new Date(cutoffMs).toISOString()

  const soql =
    "SELECT Id, AssigneeId, PermissionSetLicenseId, " +
    "PermissionSetLicense.MasterLabel, PermissionSetLicense.DeveloperName, " +
    "Assignee.Username, Assignee.LastLoginDate, Assignee.IsActive " +
    "FROM PermissionSetLicenseAssign " +
    "WHERE Assignee.IsActive = true " +
    `AND (Assignee.LastLoginDate < ${cutoffIso} OR Assignee.LastLoginDate = null)`
  const result = await executeSOQL(integration, soql)
  const rows = result.records || []

  const findings = []
  const unknownPSLs = new Map() // developerName -> { count, label }

  for (const row of rows) {
    const developerName = row.PermissionSetLicense?.DeveloperName
    const label = row.PermissionSetLicense?.MasterLabel || developerName || "Unknown PSL"
    const username = row.Assignee?.Username || row.AssigneeId
    const monthly = resolvePSLPrice(developerName)

    if (monthly == null) {
      // Unknown PSL — aggregate
      if (!unknownPSLs.has(developerName)) {
        unknownPSLs.set(developerName, { count: 0, label, evidence: [] })
      }
      const u = unknownPSLs.get(developerName)
      u.count += 1
      if (u.evidence.length < 5) u.evidence.push(row.Id)
    } else if (monthly > 0) {
      findings.push({
        check: "unused_psl",
        title: `Unused PermissionSetLicense: ${label} → ${username}`,
        currency: "USD",
        currentValue: monthly,
        potentialSavings: monthly,
        evidence: [row.Id, row.AssigneeId],
        action: `Remove the PermissionSetLicenseAssign — assignee inactive for ≥${inactivityDays} days.`,
      })
    }
    // monthly === 0 → don't surface (free PSL, no waste)
  }

  // Aggregate unknown PSLs into a single review-level finding
  if (unknownPSLs.size > 0) {
    const totalCount = Array.from(unknownPSLs.values()).reduce((acc, u) => acc + u.count, 0)
    const labels = Array.from(unknownPSLs.values()).map((u) => `${u.label} (${u.count})`).join(", ")
    findings.push({
      check: "unused_psl_unknown",
      title: `${totalCount} unused Permission Set Licenses (pricing not in catalog)`,
      currency: "USD",
      currentValue: 0,
      potentialSavings: 0.01, // tiny non-zero so the aggregator keeps it as low-severity
      evidence: Array.from(unknownPSLs.values()).flatMap((u) => u.evidence),
      action: `Review these PSLs in your Salesforce contract: ${labels}. Remove unused assignments to free seats.`,
    })
  }

  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && node -e "const m = require('./src/services/salesforceChecks/unusedPermissionSetLicenses'); console.log(typeof m.check);"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/salesforceChecks/unusedPermissionSetLicenses.js
git commit -m "feat(salesforce): check 3 — unused PermissionSetLicenses"
```

---

## Task 13: Aggregator + cost-leaks endpoint

**Files:**
- Create: `backend/src/services/salesforceCostLeakAnalysis.js`
- Modify: `backend/src/controllers/salesforceController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Write the aggregator**

Create `backend/src/services/salesforceCostLeakAnalysis.js`:

```javascript
/**
 * Salesforce cost-leak analysis aggregator.
 *
 * Fans out to the three V1 checks via Promise.allSettled, applies the standard
 * severity ladder (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and
 * produces a summary suitable for cost_leak_analyses storage.
 */

const inactiveUsers = require("./salesforceChecks/inactiveUsers")
const frozenButBilled = require("./salesforceChecks/frozenButBilled")
const unusedPSLs = require("./salesforceChecks/unusedPermissionSetLicenses")
const { PRICING_NOTE } = require("./salesforcePricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeSalesforceCostLeaks({ executeSOQL, integration, inactivityDays = 60 }) {
  const checks = [
    { name: "inactive_user",     run: () => inactiveUsers.check({ executeSOQL, integration, inactivityDays }) },
    { name: "frozen_but_billed", run: () => frozenButBilled.check({ executeSOQL, integration }) },
    { name: "unused_psl",        run: () => unusedPSLs.check({ executeSOQL, integration, inactivityDays }) },
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

  // Sort by potentialSavings desc
  allFindings.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0))

  // Severity counts
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
    },
  }
}

module.exports = { analyzeSalesforceCostLeaks, severityFor }
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && node -e "const m = require('./src/services/salesforceCostLeakAnalysis'); console.log(typeof m.analyzeSalesforceCostLeaks, m.severityFor(750), m.severityFor(50));"
```

Expected: `function critical medium`

- [ ] **Step 3: Add the analyze handler to the controller**

Open `backend/src/controllers/salesforceController.js`. Add this require at the top, after the existing imports from `salesforceAuth`:

```javascript
const { analyzeSalesforceCostLeaks } = require("../services/salesforceCostLeakAnalysis")
```

Insert this handler immediately BEFORE the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: analyzeSalesforceCostLeaks
// Duplicate-check, run aggregator, return findings (frontend persists via
// /api/analysis-history, matching the GitHub/Stripe pattern).
// ---------------------------------------------------------------------------
async function analyzeSalesforceCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/salesforce/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-validate first." })
  }

  // Parse inactivity window (30 / 60 / 90, default 60)
  let inactivityDays = parseInt(req.body?.inactivityDays, 10)
  if (![30, 60, 90].includes(inactivityDays)) inactivityDays = 60

  // Duplicate-check: same integration within 5 minutes -> 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", SALESFORCE_PROVIDER)
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
    const result = await analyzeSalesforceCostLeaks({ executeSOQL, integration, inactivityDays })
    return res.json({
      summary: result.summary,
      findings: result.findings,
      warnings: result.warnings,
      parameters: { inactivityDays },
    })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

Update the `module.exports` block to include `analyzeSalesforceCostLeaks: analyzeSalesforceCostLeaksHandler`:

```javascript
module.exports = {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  getSalesforceUsers,
  getSalesforceLicenses,
  getSalesforcePSLs,
  analyzeSalesforceCostLeaks: analyzeSalesforceCostLeaksHandler,
  executeSOQL,
  getIntegrationForUser,
  mapSalesforceError,
  log,
  SALESFORCE_PROVIDER,
}
```

- [ ] **Step 4: Wire the route**

Open `backend/src/routes/index.js`. Update the existing destructure to include `analyzeSalesforceCostLeaks`:

```javascript
const {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  getSalesforceUsers,
  getSalesforceLicenses,
  getSalesforcePSLs,
  analyzeSalesforceCostLeaks,
} = require("../controllers/salesforceController")
```

Add the new route in the Salesforce block, immediately before the DELETE route:

```javascript
router.post(  "/api/integrations/salesforce/cost-leaks",  requireAuth, requireRole("owner", "editor"),           analyzeSalesforceCostLeaks)
```

- [ ] **Step 5: End-to-end manual test (assumes Task 7 connected an org)**

```bash
cd backend && npm run dev
```

In another terminal:

```bash
TOKEN="your-jwt"
curl -s -X POST http://localhost:4000/api/integrations/salesforce/cost-leaks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inactivityDays":60}' | jq
```

Expected: JSON with `summary`, `findings`, `warnings`, `parameters`. On a fresh Developer Edition org with no test data: `findings: []`, `summary.totalFindings: 0`, `summary.healthScore: 100`.

If Task 7 isn't done yet, skip Step 5 and just verify the boot test:

```bash
cd backend && timeout 10 npm run dev 2>&1 | head -20 || true
```

Expected: clean boot.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/salesforceCostLeakAnalysis.js backend/src/controllers/salesforceController.js backend/src/routes/index.js
git commit -m "feat(salesforce): aggregator + /cost-leaks endpoint with 3 V1 checks"
```

---

## Task 14: Docs + guide page section + brand logo

**Files:**
- Modify: `docs/tool-analysis-reference.md`
- Modify: `frontend/components/tools/tool-logos.tsx`
- Modify: `frontend/app/dashboard/tools/guide/page.tsx`

- [ ] **Step 1: Add Salesforce to tool-analysis-reference**

Open `docs/tool-analysis-reference.md`. Find the section for "GitHub — Copilot & paid seats" (it ends with the "Copilot over-provisioning" bullet). Insert a new section after GitHub and before "Stripe — Revenue recovery" (or before "Usage-Summary Tools" if Stripe isn't yet present):

```markdown
### Salesforce — License waste

Analysis: [salesforceCostLeakAnalysis.js](../backend/src/services/salesforceCostLeakAnalysis.js)
Data source: Salesforce REST API + SOQL — `User`, `UserLogin`, `UserLicense`, `PermissionSetLicenseAssign`.

Checks (V1):
- **Inactive licensed users** — `IsActive = true` Standard users with `LastLoginDate` older than the inactivity window (30 / 60 / 90 days). Severity by license SKU's list price.
- **Frozen-but-billed users** — `UserLogin.IsFrozen = true` AND `User.IsActive = true`. The user can't log in but still consumes a license slot.
- **Unused PermissionSetLicenses** — paid PSLs (CPQ, Sales Cloud Einstein, Inbox, High Velocity Sales, etc.) attached to users who haven't logged in within the inactivity window. Unknown PSLs aggregate into a single review-level finding.

Severity ladder: ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — same as AWS/Azure/GCP/Stripe.
Pricing: list-price defaults; output includes `pricingNote` instructing customers to apply their negotiated discount.
Inactivity window: user-selectable 30 / 60 / 90 days, default 60.
```

Also append `Salesforce | Cost-leak | inactive licensed users, frozen-but-billed, unused PermissionSetLicenses |` to the quick-reference table at the bottom of the file.

- [ ] **Step 2: Add Salesforce brand logo**

Open `frontend/components/tools/tool-logos.tsx`. Find the existing `stripe:` entry in `TOOL_BRANDS` (it's the most recent addition). Add a new entry directly after it:

```typescript
  salesforce: {
    color: "#00A1E0",
    // Salesforce cloud — simplified glyph evoking the official cloud mark
    // without redistributing Salesforce's trademarked vector.
    path: (
      <path
        fill="#00A1E0"
        d="M9.5 5.5C7.6 5.5 6 7.1 6 9c-.7-.3-1.5-.5-2.3-.5-2.6 0-4.7 2.1-4.7 4.7 0 .8.2 1.6.6 2.3.6 1.1 1.7 1.9 3 2.1.4.1.8.1 1.2.1h13c.4 0 .8 0 1.2-.1 1.3-.2 2.4-1 3-2.1.4-.7.6-1.5.6-2.3 0-2.6-2.1-4.7-4.7-4.7-.8 0-1.6.2-2.3.5 0-1.9-1.6-3.5-3.5-3.5-1.4 0-2.6.8-3.2 2-.6-1.2-1.8-2-3.2-2z"
      />
    ),
  },
```

- [ ] **Step 3: Add Salesforce to the setup-guide page**

Open `frontend/app/dashboard/tools/guide/page.tsx`. Find the `INTEGRATIONS` array near the top of the file. Add this entry (alphabetical placement is fine; insert near the bottom of the list):

```typescript
  { id: "salesforce", label: "Salesforce", color: "#00A1E0", desc: "CRM & Sales" },
```

Then find the existing GitHub guide section (the one that ends with the GitHub-specific `<SecurityBox>` and `</section>`). Add this BEFORE the Stripe section's `{/* Stripe Section */}` comment if Stripe is present, or at the end of the file before the closing `</div>` if it isn't:

```tsx
      {/* Salesforce Section */}
      <section id="salesforce" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "salesforce" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00A1E0]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="salesforce" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Salesforce</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">CRM & Sales</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#00A1E0]/50 mt-1">&#8226;</span>System Administrator (or equivalent) profile in your Salesforce org — required to create a Connected App</li>
              <li className="flex items-start gap-2"><span className="text-[#00A1E0]/50 mt-1">&#8226;</span>An org of any edition — Production, Developer Edition (free), or Sandbox all work</li>
              <li className="flex items-start gap-2"><span className="text-[#00A1E0]/50 mt-1">&#8226;</span>~10 minutes for the Connected App to propagate after creation (a Salesforce quirk — first OAuth attempts before propagation usually fail with confusing errors)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Salesforce: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Setup</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">App Manager</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">New Connected App</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Enter any contact email.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Check <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Enable OAuth Settings</span>. Set the <strong>Callback URL</strong> to your Efficyon callback (local dev: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">http://localhost:4000/api/integrations/salesforce/callback</span>; production: substitute your deployed host).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#00A1E0" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Selected OAuth Scopes</span>, add these three:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Manage user data via APIs (api)</ScopeBadge>
                  <ScopeBadge>Perform requests on your behalf at any time (refresh_token, offline_access)</ScopeBadge>
                  <ScopeBadge>Access the identity URL service (id, profile, email)</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save the Connected App. <strong>Wait ~10 minutes</strong> for propagation, then open the app and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Manage Consumer Details</span> to copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Consumer Key</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Consumer Secret</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-[#00A1E0]/80 hover:text-[#00A1E0] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Salesforce. Paste the Consumer Key + Secret, choose <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Production</span> or <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Sandbox</span>, optionally enter your My Domain URL, and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Efficyon redirects to Salesforce for OAuth consent. Approve the requested scopes and you&apos;ll be sent back to the dashboard with status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span>. Switch to the Analysis tab and run analysis.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Three checks: <strong>inactive licensed users</strong> (active Standard users with no login in the chosen window), <strong>frozen-but-billed users</strong> (frozen via Login Information but still IsActive — the equivalent of Slack&apos;s deactivated-but-billed bug), and <strong>unused PermissionSetLicenses</strong> (paid feature licenses like CPQ or Sales Cloud Einstein attached to inactive users). Pricing uses Salesforce list rates; the summary tells customers to apply their negotiated discount (typical contracts are 30–70% off list).
          </InfoBox>

          <SecurityBox>
            Your Consumer Key + Secret + access token + refresh token are encrypted at rest with AES-256-GCM before persisting — plaintext is never stored. The OAuth scopes are read-only-equivalent for our use case (we only call <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">/services/data/.../query</span> with SOQL SELECT statements). Refresh tokens last until revoked or unused for ~6 months. To revoke any time, go to <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Setup &rsaquo; Connected Apps OAuth Usage</span>, find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span>, click <strong>Revoke</strong>; or delete the Connected App entirely from App Manager.
          </SecurityBox>
        </div>
      </section>
```

- [ ] **Step 4: Verify type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "salesforce|Salesforce" || echo "No Salesforce-related errors"
```

Expected: `No Salesforce-related errors`.

- [ ] **Step 5: Commit**

```bash
git add docs/tool-analysis-reference.md frontend/components/tools/tool-logos.tsx frontend/app/dashboard/tools/guide/page.tsx
git commit -m "feat(salesforce): docs + brand logo + setup-guide section"
```

---

## Task 15: USER ACTION — Final manual browser verification with seeded data

This is verification only. No new files. Pause and tell the user.

The user must:

1. Confirm they completed Task 7 (Connected App + connect flow)
2. Seed test data in their Salesforce Developer Edition org:
   - 5+ users (Setup → Users → New User), assign Sales Cloud Enterprise licenses to each
   - Set 2 of them to never have logged in (just don't log in as them)
   - Freeze 1 user via Setup → Users → click the user → Login Information → Freeze
   - Assign 2 users a PermissionSetLicense (e.g. Salesforce Inbox if available, or any paid PSL the org has)
3. In Efficyon dashboard: Salesforce → Analysis tab → choose 60-day inactivity → Run Analysis
4. Verify findings render with:
   - Severity badges colored correctly per the ladder
   - Total potential savings shown in the summary card
   - The pricing note about negotiated discounts visible
5. Click History tab → verify the run is persisted there
6. Test error path: in Salesforce, manually revoke access (Setup → Connected Apps OAuth Usage → Revoke). Re-run analysis from Efficyon. Expected: 401 error with "credentials revoked" message; no analysis written to History.
7. Reconnect after testing (so the integration is in working state again).

Tell the user explicitly: "When all of the above passes, the Salesforce integration is shipped. Reply with confirmation and we'll prep the merge / PR."

No commit on this task.

---

## Self-review checklist

After completing all 15 tasks:

- All 17 tools should appear in the dashboard (Salesforce being the new one)
- A connected Salesforce integration's detail page renders 4 sections: org info, users, licenses, PSLs
- The Analysis tab shows findings with severity badges + summary card + pricing note
- The History tab shows past runs
- Disconnect cleanly removes encrypted creds + tokens, evicts the in-process token cache, flips status to disconnected
- The setup-guide page (/dashboard/tools/guide) covers Salesforce alongside the other 16 tools

## Out of scope reminders (DO NOT implement)

These are deliberately deferred from V1 and listed in the design spec. Don't build them as part of this plan:

- Edition downgrade candidate detection (requires per-customer pricing input)
- Communities / Experience Cloud audit
- External users on full licenses audit
- Custom price overrides per SKU
- JWT bearer flow as auth alternative
- Background scheduled syncs
- Permission Sets without Licenses (those are free, not a cost leak)
- Stale Connected Apps audit (the customer's own apps, not Efficyon's)

If you find yourself reaching for any of these, stop — they belong in a future V2 plan.
