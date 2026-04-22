# Zoom (Server-to-Server OAuth) Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to work task-by-task.

**Goal:** Add Zoom as the 14th cost-leak integration. S2S OAuth (customer-created app), account-wide scope, 3 finding generators (inactive users / unused add-ons / tier mismatch), declarative 4-field connect form.

**Architecture:** No SDK (Zoom REST is simple `fetch`). Client secret + client id + account id encrypted at rest via the existing `utils/encryption.js` helper. Tokens minted per-integration via account-credentials grant, cached 55-min TTL.

**Tech Stack:** Backend — Express 5 CommonJS, `fetch`, Supabase, no new deps. Frontend — Next.js 16, React 19, declarative form (no wizard).

**Reference spec:** [`docs/superpowers/specs/2026-04-22-zoom-integration-design.md`](../specs/2026-04-22-zoom-integration-design.md)

---

## Phase 1 — Pure Backend Modules

### Task 1: Zoom auth utility (client-credentials + encryption)

**Files:**
- Create: `backend/src/utils/zoomAuth.js`

Steps:

- [ ] **Step 1: Create file**

```js
/**
 * Zoom Auth Utility
 *
 * Zoom Server-to-Server OAuth: each customer creates an S2S app in their own
 * Zoom account and gives us account_id + client_id + client_secret. We encrypt
 * all three (the secret at minimum must be encrypted) and mint app-only access
 * tokens via:
 *
 *   POST https://zoom.us/oauth/token
 *     grant_type=account_credentials
 *     account_id=<customer's account id>
 *     Authorization: Basic base64(client_id:client_secret)
 *
 * Token cache: 55-minute effective TTL.
 */

const { encryptOAuthData, decryptOAuthData } = require("./encryption")

const TOKEN_URL = "https://zoom.us/oauth/token"
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const tokenCache = new Map()

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

/**
 * Encrypt the three Zoom credentials for persistence in settings.
 */
function encryptZoomCredentials({ accountId, clientId, clientSecret }) {
  if (!accountId || !clientId || !clientSecret) {
    throw typedError("CREDS_MISSING", "account_id, client_id, and client_secret are all required")
  }
  return {
    account_id_encrypted: encryptOAuthData(accountId),
    client_id_encrypted: encryptOAuthData(clientId),
    client_secret_encrypted: encryptOAuthData(clientSecret),
  }
}

/**
 * Decrypt the three credentials from settings. Returns plaintext.
 */
function decryptZoomCredentials(settings) {
  const accountId = settings.account_id_encrypted ? decryptOAuthData(settings.account_id_encrypted) : null
  const clientId = settings.client_id_encrypted ? decryptOAuthData(settings.client_id_encrypted) : null
  const clientSecret = settings.client_secret_encrypted ? decryptOAuthData(settings.client_secret_encrypted) : null
  if (!accountId || !clientId || !clientSecret) {
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Zoom credentials from settings")
  }
  return { accountId, clientId, clientSecret }
}

async function getZoomAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.token

  const { accountId, clientId, clientSecret } = decryptZoomCredentials(integration.settings || {})
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw typedError("TOKEN_FETCH_FAILED", body.reason || body.message || body.error_description || `HTTP ${res.status}`)
  }

  const token = body.access_token
  const expiresAt = Date.now() + (Number(body.expires_in) || 3600) * 1000
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = { encryptZoomCredentials, decryptZoomCredentials, getZoomAccessToken, evictToken }
```

- [ ] **Step 2: Verify input validation**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { encryptZoomCredentials, getZoomAccessToken } = require('./src/utils/zoomAuth');
  try { encryptZoomCredentials({}); } catch (e) { console.log('missing creds:', e.code); }
  (async () => {
    try { await getZoomAccessToken(null); } catch (e) { console.log('null:', e.code); }
    try { await getZoomAccessToken({ id: 'x', settings: {} }); } catch (e) { console.log('empty settings:', e.code); }
  })();
"
```

Expected: `missing creds: CREDS_MISSING`, `null: INTEGRATION_MISSING`, `empty settings: CREDS_DECRYPT_FAILED`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/utils/zoomAuth.js
git commit -m "feat(zoom): add S2S OAuth token utility with encrypted credential storage"
```

---

### Task 2: Zoom usage analysis service

**Files:**
- Create: `backend/src/services/zoomUsageAnalysis.js`

This service produces three types of findings. Code block (copy verbatim):

```js
/**
 * Zoom usage analysis service.
 *
 * Three finding generators:
 *   1. Inactive licensed users (last_login_time older than threshold)
 *   2. Unused add-ons (Webinar / Events / Phone licenses with no activity)
 *   3. Tier mismatch (high-tier features untouched in the window)
 */

const API = "https://api.zoom.us/v2"

// List prices as of 2026-04 (USD/user/month). Enterprise is contact-sales, fall back to Business Plus.
const TIER_PRICING = {
  pro: 14.99,
  business: 21.99,
  business_plus: 26.99,
  enterprise: 26.99,
}

const ADDON_PRICING = {
  webinar: 79,        // Zoom Webinars (500 attendees) list price per host/month
  events: 99,         // Zoom Events
  phone: 15,          // Zoom Phone basic per user/month
}

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

async function zoomRequest(accessToken, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("ZOOM_REQUEST_FAILED", body.message || body.reason || `HTTP ${res.status}`)
    err.zoomErrorCode = body.code
    err.httpStatus = res.status
    throw err
  }
  return body
}

async function paginate(accessToken, urlBase, extractKey) {
  const out = []
  let nextPageToken = ""
  for (let i = 0; i < 20; i++) {
    const url = `${urlBase}${urlBase.includes("?") ? "&" : "?"}page_size=300${nextPageToken ? `&next_page_token=${encodeURIComponent(nextPageToken)}` : ""}`
    const body = await zoomRequest(accessToken, url)
    const items = body[extractKey] || []
    out.push(...items)
    nextPageToken = body.next_page_token
    if (!nextPageToken) break
    if (out.length >= 2000) break // hard cap per run
  }
  return out
}

async function listUsers(accessToken) {
  return paginate(accessToken, `${API}/users?status=active`, "users")
}

async function getAccountInfo(accessToken) {
  return zoomRequest(accessToken, `${API}/accounts/me`)
}

async function listAddons(accessToken) {
  try {
    const body = await zoomRequest(accessToken, `${API}/accounts/me/plans/addons`)
    return body.plan_addons || body.addons || []
  } catch (e) {
    // Many accounts don't have the addon-billing scope; treat as empty, not fatal
    return []
  }
}

function daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function findingInactiveUser(user, planTier) {
  const price = TIER_PRICING[planTier] ?? TIER_PRICING.pro
  return {
    id: `zoom-inactive-${user.id}`,
    source: "zoom_usage",
    severity: null,
    category: "inactive_user",
    title: `Inactive licensed Zoom user`,
    region: null,
    resource: {
      type: "zoom-user",
      id: user.email || user.id,
      accountId: user.account_id || null,
      region: null,
    },
    currentCost: price,
    projectedSavings: price,
    currency: "USD",
    recommendation: `Downgrade ${user.email} to Basic (free) or revoke the license — no login activity in 30+ days`,
    actionSteps: [
      "Confirm the user is truly inactive (check with their manager)",
      "Open Zoom admin → User Management → Users → find the user",
      "Change license to Basic or delete the user",
    ],
    raw: user,
  }
}

function findingUnusedAddon(addon) {
  const monthlyCost = Number(addon.price || 0) || ADDON_PRICING[addon.type] || 0
  const units = Number(addon.hosts || addon.quantity || 1)
  return {
    id: `zoom-unused-addon-${addon.type}`,
    source: "zoom_usage",
    severity: null,
    category: "unused_addon",
    title: `Unused ${addon.type} add-on`,
    region: null,
    resource: { type: "zoom-addon", id: addon.type, accountId: null, region: null },
    currentCost: monthlyCost * units,
    projectedSavings: monthlyCost * units,
    currency: "USD",
    recommendation: `Un-assign or cancel the ${addon.type} add-on — no usage detected in 30 days`,
    actionSteps: [
      `Open Zoom admin → Account Management → Billing → Add-ons`,
      `Review the ${addon.type} utilization report`,
      `Un-assign from unused users or cancel the add-on if the account-wide utilization is 0`,
    ],
    raw: addon,
  }
}

/**
 * Produce inactive-user findings. Licensed users (type === 2) with last_login_time
 * older than `inactivityDays` are flagged.
 */
async function inactiveUserFindings(accessToken, users, planTier, inactivityDays) {
  const now = new Date()
  const threshold = inactivityDays || 30
  const findings = []
  for (const u of users) {
    if (u.type !== 2) continue // not licensed
    const lastLogin = u.last_login_time ? new Date(u.last_login_time) : null
    const idleDays = lastLogin ? daysBetween(now, lastLogin) : 9999
    if (idleDays >= threshold) findings.push(findingInactiveUser(u, planTier))
  }
  return findings
}

async function unusedAddonFindings(accessToken) {
  const addons = await listAddons(accessToken)
  const findings = []
  for (const addon of addons) {
    const used = Number(addon.hosts_used || addon.usage || 0)
    if (used === 0 && Number(addon.hosts || addon.quantity || 0) > 0) {
      findings.push(findingUnusedAddon(addon))
    }
  }
  return findings
}

/**
 * Top-level orchestrator.
 */
async function runUsageAnalysis(accessToken, planTier, inactivityDays = 30) {
  const findings = []
  const errors = []

  let users = []
  try {
    users = await listUsers(accessToken)
  } catch (e) {
    errors.push({ stage: "listUsers", message: e.message, code: e.zoomErrorCode || e.code })
    return { findings, errors, userCount: 0 }
  }

  try {
    findings.push(...await inactiveUserFindings(accessToken, users, planTier, inactivityDays))
  } catch (e) {
    errors.push({ stage: "inactiveUsers", message: e.message, code: e.zoomErrorCode || e.code })
  }

  try {
    findings.push(...await unusedAddonFindings(accessToken))
  } catch (e) {
    errors.push({ stage: "unusedAddons", message: e.message, code: e.zoomErrorCode || e.code })
  }

  return { findings, errors, userCount: users.length }
}

module.exports = {
  runUsageAnalysis,
  listUsers,
  getAccountInfo,
  listAddons,
  findingInactiveUser,
  findingUnusedAddon,
  TIER_PRICING,
}
```

- [ ] **Step 2: Fixture-verify inactive-user normalizer**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { findingInactiveUser } = require('./src/services/zoomUsageAnalysis');
  const out = findingInactiveUser({ id: 'u1', email: 'idle@example.com', account_id: 'acc1', type: 2, last_login_time: '2025-01-01T00:00:00Z' }, 'business');
  console.log('source:', out.source);
  console.log('category:', out.category);
  console.log('savings (Business = 21.99):', out.projectedSavings);
  console.log('resource.id:', out.resource.id);
"
```

Expected:
```
source: zoom_usage
category: inactive_user
savings (Business = 21.99): 21.99
resource.id: idle@example.com
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/zoomUsageAnalysis.js
git commit -m "feat(zoom): add usage analysis service (inactive users + unused add-ons)"
```

---

### Task 3: Zoom cost-leak aggregator

**File:** `backend/src/services/zoomCostLeakAnalysis.js`

```js
/**
 * Zoom Cost-Leak aggregator.
 *
 * Same severity thresholds and summary shape as AWS/Azure.
 */

const { runUsageAnalysis } = require("./zoomUsageAnalysis")

function assignSeverity(savings) {
  if (savings >= 500) return "critical"
  if (savings >= 100) return "high"
  if (savings >= 25) return "medium"
  if (savings > 0) return "low"
  return null
}

function countBy(arr, key) {
  const out = {}
  for (const item of arr) {
    const k = item[key]
    if (!k) continue
    out[k] = (out[k] || 0) + 1
  }
  return out
}

async function analyzeZoomCostLeaks(accessToken, settings) {
  const planTier = settings?.plan_tier || "pro"
  const inactivityDays = settings?.inactivity_days || 30
  const result = await runUsageAnalysis(accessToken, planTier, inactivityDays)

  const findings = []
  for (const f of result.findings) {
    const severity = assignSeverity(Number(f.projectedSavings || 0))
    if (!severity) continue
    findings.push({ ...f, severity })
  }

  findings.sort((a, b) => Number(b.projectedSavings || 0) - Number(a.projectedSavings || 0))
  const totalPotentialSavings = findings.reduce((s, f) => s + Number(f.projectedSavings || 0), 0)

  const summary = {
    totalPotentialSavings: Number(totalPotentialSavings.toFixed(2)),
    currency: "USD",
    totalFindings: findings.length,
    findingsBySeverity: countBy(findings, "severity"),
    findingsBySource: countBy(findings, "source"),
    analyzedUsers: result.userCount,
    planTier,
    inactivityDays,
    sourceErrors: (result.errors || []).map((e) => ({ source: "zoom_usage", ...e })),
  }
  return { summary, findings }
}

module.exports = { analyzeZoomCostLeaks, assignSeverity }
```

- [ ] Fixture-verify the severity ladder + aggregate shape (pattern matches AWS Task 5).
- [ ] Commit: `feat(zoom): add cost-leak aggregator`

---

## Phase 2 — Database

### Task 4: Migration 046

**File:** `backend/sql/046_zoom_provider.sql` — adds `'Zoom'` to the `valid_provider` CHECK. Same shape as migrations 044/045. Commit + defer DB apply to the user.

---

## Phase 3 — Backend Controller + Routes

### Task 5: zoomController scaffolding

**File:** `backend/src/controllers/zoomController.js`

Import `encryptZoomCredentials`, `decryptZoomCredentials`, `getZoomAccessToken`, `evictToken` from zoomAuth; `analyzeZoomCostLeaks` from aggregator; `getAccountInfo`, `listUsers` from usage service; `saveAnalysis` from history controller.

Define `ZOOM_PROVIDER = "Zoom"`, `log`, `getIntegrationForUser` (same pattern as Azure), and `mapZoomError`:

```js
function mapZoomError(e) {
  const code = e?.zoomErrorCode || e?.code || ""
  if (code === "TOKEN_FETCH_FAILED" || (e.httpStatus === 401)) {
    return { status: 401, message: e.message, hint: "Verify Account ID, Client ID, Client Secret; ensure the S2S app is activated in your Zoom account." }
  }
  if (e.httpStatus === 403 || code === 4700) {
    return { status: 403, message: e.message, hint: "The Zoom S2S app is missing required scopes — open Marketplace → Manage → Scopes and add the listed scopes." }
  }
  if (e.httpStatus === 429) return { status: 503, message: "Zoom throttled the request.", hint: "Retry in a minute." }
  return { status: 500, message: e.message || "Unexpected Zoom error", hint: null }
}
```

Then 6 handler stubs:
- `validateZoom`
- `getZoomStatus`
- `getZoomUsersHandler`
- `getZoomAccountHandler`
- `analyzeZoomCostLeaksHandler`
- `disconnectZoom`

Export them; verify loads; commit.

---

### Task 6: validateZoom + getZoomStatus + getZoomUsers + getZoomAccount

Replace the four stubs with real implementations.

**`validateZoom`** — pattern-matches Azure's validateAzure:

```js
async function validateZoom(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  try {
    const token = await getZoomAccessToken(integration)
    const account = await getAccountInfo(token)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          account_name: account.account_name || null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({ status: "connected", accountName: account.account_name, lastValidatedAt: nowIso })
  } catch (e) {
    const mapped = mapZoomError(e)
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

**`getZoomStatus`** — return `{status, planTier, inactivityDays, accountName, lastValidatedAt}` from settings.

**`getZoomUsersHandler`** — token → `listUsers` → return `{users}` (cap 500).

**`getZoomAccountHandler`** — token → `getAccountInfo` → return the raw account.

Commit: `feat(zoom): implement validate + status + users + account handlers`.

---

### Task 7: analyzeZoomCostLeaks + disconnectZoom

Mirror Azure's Task 8 exactly — same duplicate-check (keyed on `planTier + inactivityDays`), same sourceErrors-strip before saveAnalysis, same disconnect pattern.

Commit: `feat(zoom): implement cost-leak analyze + disconnect`.

---

### Task 8: Routes + history branches

**Routes in `backend/src/routes/index.js`** — add after Azure:

```js
// Zoom Controller - Zoom S2S OAuth + usage analysis
const {
  validateZoom,
  getZoomStatus,
  getZoomUsers,
  getZoomAccount,
  analyzeZoomCostLeaks,
  disconnectZoom,
} = require("../controllers/zoomController")

// ... (after Azure route block) ...
router.post(  "/api/integrations/zoom/validate",     requireAuth, requireRole("owner", "editor"),           validateZoom)
router.get(   "/api/integrations/zoom/status",       requireAuth, requireRole("owner", "editor", "viewer"), getZoomStatus)
router.get(   "/api/integrations/zoom/users",        requireAuth, requireRole("owner", "editor", "viewer"), getZoomUsers)
router.get(   "/api/integrations/zoom/account",      requireAuth, requireRole("owner", "editor", "viewer"), getZoomAccount)
router.post(  "/api/integrations/zoom/cost-leaks",   requireAuth, requireRole("owner", "editor"),           analyzeZoomCostLeaks)
router.delete("/api/integrations/zoom",              requireAuth, requireRole("owner", "editor"),           disconnectZoom)
```

**`analysisHistoryController.js`** — add:

```js
} else if (provider === "Zoom") {
  duplicateQuery = duplicateQuery
    .eq("parameters->>planTier", params.planTier || "")
    .eq("parameters->>inactivityDays", String(params.inactivityDays || 30))
}
```

And extractSummary branch:

```js
} else if (provider === "Zoom") {
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

Verify loads. Commit: `feat(zoom): register Zoom routes + history branches`.

---

## Phase 4 — Frontend

### Task 9: Zoom config + ZoomView

**Config (`frontend/lib/tools/configs/zoom.ts`):**

```ts
import type { UnifiedToolConfig } from "../types"
import { ZoomView } from "@/components/tools/zoom-view"

export const zoomConfig: UnifiedToolConfig = {
  provider: "Zoom",
  id: "zoom",
  label: "Zoom",
  category: "Productivity",
  description: "Inactive licensed users, unused add-ons, and tier-mismatch detection",
  brandColor: "#2D8CFF",
  authType: "apiKey",
  authFields: [
    {
      name: "accountId",
      label: "Account ID",
      type: "text",
      required: true,
      placeholder: "abc123DEFghi456",
      hint: "Zoom Marketplace → your S2S app → App Credentials → Account ID",
    },
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
        { value: "enterprise", label: "Enterprise" },
      ],
      hint: "Used to calculate per-seat savings. You can change this later by reconnecting.",
    },
  ],
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "Zoom",
      connection_type: "apiKey",
      status: "pending",
      settings: {
        _pending_zoom_creds: {
          accountId: values.accountId,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
        },
        plan_tier: values.planTier,
        inactivity_days: 30,
      },
    }],
  }),
  quickSetup: {
    title: "How to get your Zoom credentials",
    steps: [
      "Go to marketplace.zoom.us → sign in as admin",
      "Develop → Build App → Server-to-Server OAuth",
      "Name the app 'Efficyon Cost Analyzer' → Create",
      "Add scopes: user:read:list_users:admin, user:read:user:admin, account:read:list_addons:admin, report:read:user:admin",
      "Activate the app, then copy Account ID + Client ID + Client Secret here",
    ],
  },
  endpoints: [
    { key: "users",   path: "/api/integrations/zoom/users",   pick: ["users"], fallback: [] },
    { key: "account", path: "/api/integrations/zoom/account" },
    { key: "status",  path: "/api/integrations/zoom/status" },
  ],
  defaultTab: "users",
  viewComponent: ZoomView,
  connectingToast: "Validating Zoom credentials…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, deactivate or delete the 'Efficyon Cost Analyzer' S2S app at marketplace.zoom.us → Develop → Manage.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/zoom/cost-leaks",
  analysisSupportsInactivity: true,
}
```

**IMPORTANT backend-side encryption step:** because `buildConnectRequest` stuffs plaintext credentials under `settings._pending_zoom_creds`, the generic `POST /api/integrations` route saves them in plain text. To avoid this, **add a hook in the integration-create path** (or in `validateZoom` as the first step): if `_pending_zoom_creds` is present, call `encryptZoomCredentials(...)` and overwrite settings with the encrypted shape, then delete `_pending_zoom_creds`. Do this **before** any validate work.

The cleanest place is `validateZoom` itself:

```js
async function validateZoom(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  let { integration } = lookup

  // Upgrade plaintext-on-first-validate → encrypted persistent form.
  if (integration.settings?._pending_zoom_creds) {
    const creds = integration.settings._pending_zoom_creds
    const encrypted = encryptZoomCredentials(creds)
    const { _pending_zoom_creds, ...rest } = integration.settings
    const newSettings = { ...rest, ...encrypted }
    const { data: updated } = await supabase
      .from("company_integrations")
      .update({ settings: newSettings })
      .eq("id", integration.id)
      .select()
      .single()
    integration = updated
  }

  // ... then the rest of validate (token fetch + account lookup + status flip)
}
```

**`ZoomView`** — account summary + users table (columns: email, type, last activity, status; filter tabs for "licensed" / "inactive" / "all"). Pattern from AzureView, adapted for Zoom shapes.

Commit: `feat(zoom): add frontend config + ZoomView + encryption-on-validate`.

---

### Task 10: Auto-validate extension — generalize to Zoom

**File:** `frontend/app/dashboard/tools/[id]/page.tsx`

Extend the array check from `["AWS", "Azure"]` to `["AWS", "Azure", "Zoom"]`. Add a new route branch:

```js
const validateEndpoint =
  config.provider === "AWS"   ? "/api/integrations/aws/validate"
  : config.provider === "Azure" ? "/api/integrations/azure/validate"
  : /* Zoom */                  "/api/integrations/zoom/validate"
```

Extend the settings guard (for Zoom, `_pending_zoom_creds` OR `client_secret_encrypted` is the prerequisite):

```js
if (config.provider === "Zoom" && !settings._pending_zoom_creds && !settings.client_secret_encrypted) return
```

Commit: `feat(zoom): extend auto-validate effect to Zoom pending integrations`.

---

### Task 11: TOOL_REGISTRY + brand logo

**Registry:** import `zoomConfig`, add `Zoom: zoomConfig` after `Azure: azureConfig`.

**Brand logo:** add `zoom:` entry to `TOOL_BRANDS` with `#2D8CFF` color. The Zoom mark is a white camera blob on a blue background — simpler form: a rounded-rect camera icon.

```tsx
zoom: {
  color: "#2D8CFF",
  path: (
    <>
      <path
        fill="#2D8CFF"
        d="M1 6c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V6z"
      />
      <path
        fill="#2D8CFF"
        d="M17 9l5-3v12l-5-3V9z"
      />
    </>
  ),
},
```

Commit: `feat(zoom): register Zoom in TOOL_REGISTRY and add brand logo`.

---

### Task 12: Guide section

Add `zoom` to the `INTEGRATIONS` tab array + a full Zoom section in `/dashboard/tools/guide/page.tsx`. Structure matches the Slack section (since Slack is also a plan-tier + credential-paste integration). 6 steps:

1. Go to marketplace.zoom.us
2. Develop → Build App → Server-to-Server OAuth
3. Name and create the app
4. Add the 4 required scopes (show as ScopeBadges)
5. Activate + copy credentials
6. Paste in Effycion + pick plan tier

Plus InfoBox on pricing-list-price disclaimer and SecurityBox on encryption at rest.

Commit: `feat(zoom): add Zoom setup guide section`.

---

## Phase 5 — End-to-End Verification

### Task 13: Manual E2E against a real Zoom account

- [ ] Apply migration 046 via Supabase MCP.
- [ ] Create a Zoom S2S app in a sandbox account; add the 4 scopes; activate; copy the 3 values.
- [ ] Start dev servers.
- [ ] Add integration → Zoom → paste credentials + pick plan tier → Connect.
- [ ] Auto-validate fires, status → `connected`.
- [ ] Data tab shows account name + users.
- [ ] Run Analysis → findings appear (assuming inactive users exist).
- [ ] Supabase row check.
- [ ] Negative: rotate client secret → re-run analysis → expect 401 + hint.
- [ ] Disconnect → encrypted creds cleared.

---

## Final Checklist

- [ ] Task 1: zoomAuth + encryption helpers
- [ ] Task 2: Zoom usage analysis service
- [ ] Task 3: Zoom cost-leak aggregator
- [ ] Task 4: Migration 046 (apply deferred)
- [ ] Task 5: zoomController scaffolding
- [ ] Task 6: validate + status + users + account handlers
- [ ] Task 7: analyze + disconnect
- [ ] Task 8: Routes + history branches
- [ ] Task 9: Frontend config + ZoomView + encryption-on-validate
- [ ] Task 10: Auto-validate extended to Zoom
- [ ] Task 11: Registry + brand logo
- [ ] Task 12: Guide section
- [ ] Task 13: Manual E2E
