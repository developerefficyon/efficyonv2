# Azure Billing (Azure Advisor) Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to work through this task-by-task. Steps use checkbox syntax.

**Goal:** Add Azure as the 13th cost-leak integration. Multi-tenant app-registration auth (client-credentials grant), tenant-wide scope, Azure Advisor Cost-category recommendations, admin-consent wizard.

**Architecture:** No SDK (plain `fetch` + OAuth tokens — Azure REST is simple). Tokens cached per integration. Fan-out over `settings.active_subscriptions`. Findings normalized to the same shape as AWS/GCP.

**Tech Stack:** Backend — Express 5 CommonJS, `fetch` (Node 20 built-in), Supabase, no new deps. Frontend — Next.js 16, React 19, reuses `UnifiedToolConfig.connectComponent` added in the AWS work.

**Reference spec:** [`docs/superpowers/specs/2026-04-22-azure-billing-integration-design.md`](../specs/2026-04-22-azure-billing-integration-design.md)

**Testing note:** Per `CLAUDE.md` this repo has no test runner. Pure-JS modules verify via `node -e` fixtures; integrated flows verify via dev-server + curl; final Phase 4 (Task 14) is end-to-end against a real Azure tenant.

---

## Phase 1 — Pure Backend Modules

### Task 1: Azure auth utility (client-credentials grant + token cache)

**Files:**
- Create: `backend/src/utils/azureAuth.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/utils/azureAuth.js`

```js
/**
 * Azure Auth Utility
 *
 * Client-credentials grant against a customer tenant. The app registration
 * lives in Efficyon's tenant; customers grant admin consent which creates a
 * Service Principal in their tenant. After consent + Reader role assignment,
 * we can mint app-only tokens for each customer tenant via:
 *
 *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *     grant_type=client_credentials
 *     scope=https://management.azure.com/.default
 *     client_id=<our AZURE_CLIENT_ID>
 *     client_secret=<our AZURE_CLIENT_SECRET>
 *
 * Token cache: 55-minute effective TTL (tokens are 1h; refresh 5min early).
 */

const TOKEN_URL = (tenantId) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
const SCOPE = "https://management.azure.com/.default"
const REFRESH_BUFFER_MS = 5 * 60 * 1000

const tokenCache = new Map() // integrationId -> { token, expiresAt }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

/**
 * Validate an Azure tenant ID (GUID format).
 */
function parseTenantId(tenantId) {
  if (typeof tenantId !== "string" || !tenantId) {
    throw typedError("TENANT_ID_MISSING", "tenant_id is required")
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw typedError("TENANT_ID_INVALID", `Invalid Azure tenant ID: ${tenantId}`)
  }
  return tenantId.toLowerCase()
}

async function getAzureAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")
  const settings = integration.settings || {}
  const tenantId = parseTenantId(settings.tenant_id)

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.token

  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw typedError("AZURE_APP_NOT_CONFIGURED", "AZURE_CLIENT_ID / AZURE_CLIENT_SECRET env vars must be set")
  }

  const res = await fetch(TOKEN_URL(tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
      grant_type: "client_credentials",
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("TOKEN_FETCH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.azureErrorCode = body.error
    throw err
  }

  const token = body.access_token
  const expiresAt = Date.now() + (Number(body.expires_in) || 3600) * 1000
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = { parseTenantId, getAzureAccessToken, evictToken }
```

- [ ] **Step 2: Fixture-verify `parseTenantId`**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { parseTenantId } = require('./src/utils/azureAuth');
  console.log('valid:', parseTenantId('12345678-1234-1234-1234-123456789abc'));
  try { parseTenantId(''); } catch (e) { console.log('empty:', e.code); }
  try { parseTenantId('not-a-guid'); } catch (e) { console.log('bad:', e.code); }
"
```

Expected:
```
valid: 12345678-1234-1234-1234-123456789abc
empty: TENANT_ID_MISSING
bad: TENANT_ID_INVALID
```

- [ ] **Step 3: Fixture-verify `getAzureAccessToken` input validation**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  (async () => {
    const { getAzureAccessToken } = require('./src/utils/azureAuth');
    try { await getAzureAccessToken(null); } catch (e) { console.log('null:', e.code); }
    try { await getAzureAccessToken({ id: 'x', settings: {} }); } catch (e) { console.log('no tenant:', e.code); }
  })();
"
```

Expected:
```
null: INTEGRATION_MISSING
no tenant: TENANT_ID_MISSING
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/utils/azureAuth.js
git commit -m "feat(azure): add client-credentials token utility with per-tenant cache

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Azure Advisor analysis service

**Files:**
- Create: `backend/src/services/azureAdvisorAnalysis.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/services/azureAdvisorAnalysis.js`

```js
/**
 * Azure Advisor analysis service.
 *
 * Per subscription, fetches all Cost-category recommendations. Paginated
 * via `nextLink`. Each response normalized into the shared cost-leak
 * finding shape.
 */

const ARM = "https://management.azure.com"
const API_VERSION = "2023-01-01"
const PER_CALL_CAP = 500

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

async function advisorRequest(accessToken, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("ADVISOR_REQUEST_FAILED", body?.error?.message || `HTTP ${res.status}`)
    err.azureErrorCode = body?.error?.code
    err.httpStatus = res.status
    throw err
  }
  return body
}

async function paginate(accessToken, startUrl) {
  const out = []
  let url = startUrl
  for (let i = 0; i < 20 && url; i++) {
    const body = await advisorRequest(accessToken, url)
    const items = body.value || []
    out.push(...items)
    if (out.length >= PER_CALL_CAP) return out.slice(0, PER_CALL_CAP)
    url = body.nextLink
  }
  return out
}

async function listSubscriptions(accessToken) {
  const body = await advisorRequest(accessToken, `${ARM}/subscriptions?api-version=2022-12-01`)
  return (body.value || []).map((s) => ({
    id: s.subscriptionId,
    name: s.displayName,
    state: s.state,
  }))
}

/**
 * Normalize one Advisor Cost recommendation into a cost-leak finding.
 */
function normalizeAdvisor(rec, subscriptionId) {
  const props = rec.properties || {}
  const rm = props.resourceMetadata || {}
  const ep = props.extendedProperties || {}

  // Savings: Advisor puts amounts in multiple shapes across recommendation types.
  // annualSavingsAmount is the most common; divide by 12 for monthly.
  const monthlySavings =
    Number(ep.savingsAmount || 0) ||
    Number(ep.annualSavingsAmount || 0) / 12 ||
    Number(ep.monthlySavings || 0) ||
    0

  const category = ((ep.recommendationTypeId || "") + "").toLowerCase().includes("reserved")
    ? "reservation"
    : (props.shortDescription?.problem || "").toLowerCase().includes("idle")
      ? "idle"
      : "rightsizing"

  const resourceArm = rm.resourceId || rec.id || ""
  const region = rm.region || ep.region || null

  return {
    id: `azure-advisor-${rec.name || rec.id}`,
    source: "azure_advisor",
    severity: null,
    category,
    title: props.shortDescription?.problem || "Azure cost optimization opportunity",
    region,
    resource: {
      type: rm.source || "azure-resource",
      id: resourceArm,
      accountId: subscriptionId,
      region,
    },
    currentCost: 0, // Advisor doesn't consistently expose current cost
    projectedSavings: Number(monthlySavings.toFixed(2)),
    currency: ep.savingsCurrency || "USD",
    recommendation: props.shortDescription?.solution || "See Azure Advisor console for detail",
    actionSteps: [
      "Open Azure Portal → Advisor → Cost",
      "Review the recommendation's detail view",
      "Apply via the portal's one-click remediation when available",
    ],
    raw: rec,
  }
}

async function fetchRecommendationsForSubscription(accessToken, subscriptionId) {
  const url =
    `${ARM}/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations` +
    `?api-version=${API_VERSION}&$filter=${encodeURIComponent("Category eq 'Cost'")}`
  const raw = await paginate(accessToken, url)
  return raw.map((rec) => normalizeAdvisor(rec, subscriptionId))
}

async function runAdvisorAnalysis(accessToken, subscriptions) {
  const findings = []
  const errors = []
  for (const sub of subscriptions) {
    if (sub.state && sub.state !== "Enabled") continue
    try {
      const items = await fetchRecommendationsForSubscription(accessToken, sub.id)
      findings.push(...items)
    } catch (e) {
      errors.push({
        subscriptionId: sub.id,
        message: e.message,
        code: e.azureErrorCode || e.code,
        httpStatus: e.httpStatus,
      })
    }
  }
  return { findings, errors }
}

module.exports = {
  runAdvisorAnalysis,
  listSubscriptions,
  normalizeAdvisor,
  fetchRecommendationsForSubscription,
}
```

- [ ] **Step 2: Fixture-verify normalizer**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { normalizeAdvisor } = require('./src/services/azureAdvisorAnalysis');
  const rec = {
    id: '/subscriptions/sub1/providers/Microsoft.Advisor/recommendations/rec1',
    name: 'rec1',
    properties: {
      shortDescription: {
        problem: 'Right-size or shut down underutilized virtual machines',
        solution: 'Consider stopping or resizing this VM'
      },
      resourceMetadata: {
        resourceId: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
        source: 'Microsoft.Compute/virtualMachines',
        region: 'eastus'
      },
      extendedProperties: {
        annualSavingsAmount: '1200',
        savingsCurrency: 'USD'
      }
    }
  };
  const out = normalizeAdvisor(rec, 'sub1');
  console.log('source:', out.source);
  console.log('category:', out.category);
  console.log('monthly savings (expected 100):', out.projectedSavings);
  console.log('resource.accountId:', out.resource.accountId);
  console.log('resource.id starts with /subscriptions/:', out.resource.id.startsWith('/subscriptions/'));
  console.log('region:', out.region);
"
```

Expected:
```
source: azure_advisor
category: rightsizing
monthly savings (expected 100): 100
resource.accountId: sub1
resource.id starts with /subscriptions/: true
region: eastus
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/azureAdvisorAnalysis.js
git commit -m "feat(azure): add Azure Advisor analysis service

Sequential per-subscription fan-out; paginates Advisor Cost recommendations;
normalizes into the shared cost-leak finding shape with monthly savings
derived from annualSavingsAmount/12.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Azure cost-leak aggregator

**Files:**
- Create: `backend/src/services/azureCostLeakAnalysis.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/services/azureCostLeakAnalysis.js`

```js
/**
 * Azure Cost-Leak Analysis aggregator.
 *
 * Takes Advisor findings, assigns severity by USD savings thresholds,
 * drops zero-savings findings, sorts by savings desc, rolls up summary.
 * Mirrors the AWS aggregator's shape so the frontend + history path treat
 * all providers uniformly.
 */

const { runAdvisorAnalysis } = require("./azureAdvisorAnalysis")

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

function uniq(arr) {
  return Array.from(new Set(arr.filter((x) => x != null)))
}

async function analyzeAzureCostLeaks(accessToken, settings) {
  const subscriptions = Array.isArray(settings?.active_subscriptions) ? settings.active_subscriptions : []
  const result = await runAdvisorAnalysis(accessToken, subscriptions)

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
    analyzedAccounts: Math.max(
      uniq(findings.map((f) => f.resource?.accountId)).length,
      findings.length > 0 ? 1 : 0,
    ),
    analyzedSubscriptions: subscriptions.length,
    sourceErrors: (result.errors || []).map((e) => ({ source: "azure_advisor", ...e })),
  }

  return { summary, findings }
}

module.exports = { analyzeAzureCostLeaks, assignSeverity }
```

- [ ] **Step 2: Fixture-verify via stubbed Advisor service**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const path = require('path');
  const advisorPath = path.resolve('./src/services/azureAdvisorAnalysis.js');
  require.cache[advisorPath] = { exports: { runAdvisorAnalysis: async () => ({
    findings: [
      { id: 'a1', source: 'azure_advisor', projectedSavings: 600, currency: 'USD', resource: { accountId: 'sub1' } },
      { id: 'a2', source: 'azure_advisor', projectedSavings: 50,  currency: 'USD', resource: { accountId: 'sub2' } },
      { id: 'a3', source: 'azure_advisor', projectedSavings: 0,   currency: 'USD', resource: { accountId: 'sub1' } },
    ],
    errors: [{ subscriptionId: 'sub3', message: 'AuthorizationFailed', code: 'AuthorizationFailed' }],
  })}};
  const { analyzeAzureCostLeaks } = require('./src/services/azureCostLeakAnalysis');
  (async () => {
    const out = await analyzeAzureCostLeaks('tok', { active_subscriptions: [{id:'sub1'},{id:'sub2'},{id:'sub3'}] });
    console.log(JSON.stringify(out.summary, null, 2));
    console.log('top severity:', out.findings[0].severity);
    console.log('zero dropped:', !out.findings.find(f => f.id === 'a3'));
  })();
"
```

Expected summary has `totalPotentialSavings: 650`, `totalFindings: 2`, `findingsBySeverity: { critical: 1, medium: 1 }`, `analyzedAccounts: 2`, `analyzedSubscriptions: 3`, `sourceErrors` length 1. `top severity: critical`, `zero dropped: true`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/azureCostLeakAnalysis.js
git commit -m "feat(azure): add cost-leak aggregator

Same severity thresholds and summary shape as AWS (critical/high/medium/
low at 500/100/25/0 USD/month); drops zero-savings findings; floors
analyzedAccounts at 1 when findings exist.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Database

### Task 4: Migration for `Azure` provider

**Files:**
- Create: `backend/sql/045_azure_provider.sql`

- [ ] **Step 1: Create migration**

```sql
-- Allow Azure as a provider for persisted cost-leak analyses.
-- Findings come from Azure Advisor (Cost category).

ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify',
    'OpenAI', 'Anthropic', 'Gemini', 'GoogleWorkspace', 'Slack',
    'GCP', 'AWS', 'Azure'
  ));
```

- [ ] **Step 2: DB apply deferred to user** (will apply via Supabase MCP after merge).

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/sql/045_azure_provider.sql
git commit -m "feat(azure): allow 'Azure' provider in cost_leak_analyses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Backend Controller + Routes

### Task 5: Controller scaffolding

**Files:**
- Create: `backend/src/controllers/azureController.js`

- [ ] **Step 1: Create file**

Path: `backend/src/controllers/azureController.js`

```js
/**
 * Azure Controller
 *
 * Auth = OAuth 2.0 admin consent + client-credentials grant. No per-user
 * tokens; we operate on customer tenants via app-only access tokens minted
 * from our AZURE_CLIENT_ID / AZURE_CLIENT_SECRET pair.
 */

const { supabase } = require("../config/supabase")
const { getAzureAccessToken, evictToken, parseTenantId } = require("../utils/azureAuth")
const { analyzeAzureCostLeaks } = require("../services/azureCostLeakAnalysis")
const { listSubscriptions } = require("../services/azureAdvisorAnalysis")
const { saveAnalysis } = require("./analysisHistoryController")

const AZURE_PROVIDER = "Azure"
const LOGIN_BASE = "https://login.microsoftonline.com"

function log(level, endpoint, message, data = null) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).maybeSingle()
  if (!profile?.company_id) return { error: "No company associated with this user", status: 400 }
  const { data: integration, error } = await supabase
    .from("company_integrations").select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", AZURE_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Azure integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapAzureError(e) {
  const code = e?.azureErrorCode || e?.code || ""
  if (code === "AuthorizationFailed") {
    return {
      status: 403,
      message: e.message,
      hint: "Grant the 'Efficyon Cost Analyzer (Azure)' service principal the Reader role at tenant-root management group, then retry.",
    }
  }
  if (code === "SubscriptionNotRegistered" || (e.message || "").includes("Microsoft.Advisor")) {
    return { status: 409, message: e.message, hint: "Register the Microsoft.Advisor resource provider on the subscription(s)." }
  }
  if (code === "TOKEN_FETCH_FAILED" || code === "invalid_client") {
    return { status: 401, message: e.message, hint: "Efficyon's Azure app credentials are invalid — contact support." }
  }
  if (e.httpStatus === 429) return { status: 503, message: "Azure throttled the request.", hint: "Retry in a minute." }
  return { status: 500, message: e.message || "Unexpected Azure error", hint: null }
}

// Handler stubs — filled in by Tasks 6–8.
async function initiateAzureConsent(req, res)       { res.status(501).json({ error: "initiateAzureConsent not implemented" }) }
async function handleAzureConsentCallback(req, res) { res.status(501).send("handleAzureConsentCallback not implemented") }
async function validateAzure(req, res)              { res.status(501).json({ error: "validateAzure not implemented" }) }
async function getAzureStatus(req, res)             { res.status(501).json({ error: "getAzureStatus not implemented" }) }
async function getAzureSubscriptions(req, res)      { res.status(501).json({ error: "getAzureSubscriptions not implemented" }) }
async function refreshAzureSubscriptions(req, res)  { res.status(501).json({ error: "refreshAzureSubscriptions not implemented" }) }
async function analyzeAzureCostLeaksHandler(req, res) { res.status(501).json({ error: "analyze not implemented" }) }
async function disconnectAzure(req, res)            { res.status(501).json({ error: "disconnectAzure not implemented" }) }

module.exports = {
  initiateAzureConsent,
  handleAzureConsentCallback,
  validateAzure,
  getAzureStatus,
  getAzureSubscriptions,
  refreshAzureSubscriptions,
  analyzeAzureCostLeaks: analyzeAzureCostLeaksHandler,
  disconnectAzure,
  // exported for later tasks:
  getIntegrationForUser, mapAzureError, log, AZURE_PROVIDER, LOGIN_BASE,
}
```

- [ ] **Step 2: Verify loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/azureController'); console.log('ok');"
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/azureController.js
git commit -m "feat(azure): add controller scaffolding

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Consent flow handlers (`initiateAzureConsent` + `handleAzureConsentCallback`)

**Files:**
- Modify: `backend/src/controllers/azureController.js`

- [ ] **Step 1: Replace `initiateAzureConsent` stub**

Find: `async function initiateAzureConsent(req, res)       { res.status(501).json({ error: "initiateAzureConsent not implemented" }) }`

Replace with:

```js
async function initiateAzureConsent(req, res) {
  const endpoint = "GET /api/integrations/azure/consent"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  const clientId = process.env.AZURE_CLIENT_ID
  const redirectUri = process.env.AZURE_CONSENT_REDIRECT_URL
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "Azure app not configured on server." })
  }

  // Ensure external_id exists (mint if missing).
  const externalId = integration.settings?.external_id ||
    require("crypto").randomBytes(16).toString("hex")
  if (!integration.settings?.external_id) {
    await supabase
      .from("company_integrations")
      .update({ settings: { ...(integration.settings || {}), external_id: externalId } })
      .eq("id", integration.id)
  }

  const state = `${integration.id}:${externalId}`
  const consentUrl =
    `${LOGIN_BASE}/organizations/v2.0/adminconsent` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent("https://management.azure.com/.default")}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`

  return res.json({ consentUrl })
}
```

- [ ] **Step 2: Replace `handleAzureConsentCallback` stub**

Find: `async function handleAzureConsentCallback(req, res) { res.status(501).send("handleAzureConsentCallback not implemented") }`

Replace with:

```js
async function handleAzureConsentCallback(req, res) {
  const endpoint = "GET /api/integrations/azure/consent-callback"
  const { admin_consent, tenant, state, error, error_description } = req.query || {}
  const frontendBase = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "/"

  if (!state || typeof state !== "string" || !state.includes(":")) {
    return res.redirect(`${frontendBase}/dashboard/tools?azure_consent=error&msg=${encodeURIComponent("Missing state")}`)
  }
  const [integrationId, externalId] = state.split(":")

  const { data: integration, error: iErr } = await supabase
    .from("company_integrations").select("*").eq("id", integrationId).maybeSingle()
  if (iErr || !integration) {
    return res.redirect(`${frontendBase}/dashboard/tools?azure_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }
  if (integration.settings?.external_id !== externalId) {
    log("warn", endpoint, "CSRF: external_id mismatch", { integrationId })
    return res.redirect(`${frontendBase}/dashboard/tools?azure_consent=error&msg=${encodeURIComponent("Security check failed")}`)
  }

  if (admin_consent !== "True" || !tenant) {
    const msg = error_description || error || "Consent not granted"
    return res.redirect(`${frontendBase}/dashboard/tools/${integrationId}?azure_consent=error&msg=${encodeURIComponent(msg)}`)
  }

  try {
    parseTenantId(tenant)
  } catch {
    return res.redirect(`${frontendBase}/dashboard/tools/${integrationId}?azure_consent=error&msg=${encodeURIComponent("Invalid tenant id")}`)
  }

  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        tenant_id: tenant,
        consent_granted_at: nowIso,
      },
      status: "pending", // stays pending until validateAzure confirms Reader role + subscriptions
      updated_at: nowIso,
    })
    .eq("id", integrationId)

  return res.redirect(`${frontendBase}/dashboard/tools/${integrationId}?azure_consent=ok`)
}
```

- [ ] **Step 3: Verify loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/azureController'); console.log('ok');"
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/azureController.js
git commit -m "feat(azure): implement admin-consent initiate + callback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `validateAzure` + `getAzureStatus` + subscriptions handlers

**Files:**
- Modify: `backend/src/controllers/azureController.js`

- [ ] **Step 1: Replace `validateAzure` stub**

```js
async function validateAzure(req, res) {
  const endpoint = "POST /api/integrations/azure/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (!integration.settings?.tenant_id) {
    return res.status(409).json({ error: "Consent not granted yet. Complete the admin-consent step first." })
  }

  // Poll for Reader role: try listSubscriptions up to 12 times, 5s apart = 60s total.
  let subs = null
  let lastErr = null
  for (let i = 0; i < 12; i++) {
    try {
      const token = await getAzureAccessToken(integration)
      subs = await listSubscriptions(token)
      if (subs.length > 0) break
      lastErr = new Error("No subscriptions visible yet (Reader role may still be propagating)")
    } catch (e) {
      lastErr = e
      if (e?.azureErrorCode && e.azureErrorCode !== "AuthorizationFailed") break // real error, not propagation
    }
    await new Promise((r) => setTimeout(r, 5000))
  }

  if (!subs || subs.length === 0) {
    const mapped = mapAzureError(lastErr || new Error("No subscriptions accessible"))
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        active_subscriptions: subs,
        subscriptions_refreshed_at: nowIso,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  return res.json({
    status: "connected",
    tenantId: integration.settings.tenant_id,
    subscriptions: subs,
    lastValidatedAt: nowIso,
  })
}
```

- [ ] **Step 2: Replace `getAzureStatus` stub**

```js
async function getAzureStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const s = lookup.integration.settings || {}
  return res.json({
    status: lookup.integration.status,
    tenantId: s.tenant_id || null,
    consentGrantedAt: s.consent_granted_at || null,
    activeSubscriptions: s.active_subscriptions || [],
    subscriptionsRefreshedAt: s.subscriptions_refreshed_at || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}
```

- [ ] **Step 3: Replace `getAzureSubscriptions` stub**

```js
async function getAzureSubscriptions(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  return res.json({
    subscriptions: lookup.integration.settings?.active_subscriptions || [],
    subscriptionsRefreshedAt: lookup.integration.settings?.subscriptions_refreshed_at || null,
  })
}
```

- [ ] **Step 4: Replace `refreshAzureSubscriptions` stub**

```js
async function refreshAzureSubscriptions(req, res) {
  const endpoint = "POST /api/integrations/azure/subscriptions/refresh"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  let subs
  try {
    const token = await getAzureAccessToken(integration)
    subs = await listSubscriptions(token)
  } catch (e) {
    const mapped = mapAzureError(e)
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: { ...(integration.settings || {}), active_subscriptions: subs, subscriptions_refreshed_at: nowIso },
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  return res.json({ subscriptions: subs, subscriptionsRefreshedAt: nowIso })
}
```

- [ ] **Step 5: Verify loads + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/azureController'); console.log('ok');"
cd ".."
git add backend/src/controllers/azureController.js
git commit -m "feat(azure): implement validate + status + subscriptions handlers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `analyzeAzureCostLeaks` + `disconnectAzure` handlers

**Files:**
- Modify: `backend/src/controllers/azureController.js`

- [ ] **Step 1: Replace `analyzeAzureCostLeaksHandler` stub**

```js
async function analyzeAzureCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/azure/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-run validate first." })
  }

  // Duplicate-check: same tenant within 5 minutes → 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", AZURE_PROVIDER)
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

  let result
  try {
    const token = await getAzureAccessToken(integration)
    result = await analyzeAzureCostLeaks(token, integration.settings)
  } catch (e) {
    const mapped = mapAzureError(e)
    log("error", endpoint, "analysis failed", { code: e.code, azureErrorCode: e.azureErrorCode, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // Strip sourceErrors before persistence (matches AWS pattern).
  const { sourceErrors, ...persistedSummary } = result.summary
  try {
    await saveAnalysis({
      companyId,
      provider: AZURE_PROVIDER,
      integrationId: integration.id,
      analysisData: { summary: persistedSummary, findings: result.findings },
      parameters: { tenantId: integration.settings?.tenant_id || "" },
    })
  } catch (e) {
    log("error", endpoint, "saveAnalysis failed", { message: e.message })
  }

  return res.json(result)
}
```

- [ ] **Step 2: Replace `disconnectAzure` stub**

```js
async function disconnectAzure(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorTenantId = integration.settings?.tenant_id || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_tenant_id: priorTenantId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}
```

- [ ] **Step 3: Verify + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/azureController'); console.log('ok');"
cd ".."
git add backend/src/controllers/azureController.js
git commit -m "feat(azure): implement cost-leak analyze + disconnect

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Wire routes + history branches + env docs

**Files:**
- Modify: `backend/src/routes/index.js`
- Modify: `backend/src/controllers/analysisHistoryController.js`
- Modify: `backend/env.example.backend.txt`

- [ ] **Step 1: Import Azure controller in `routes/index.js`**

After the AWS import block:

```js
// Azure Controller - Azure Advisor cost analysis
const {
  initiateAzureConsent,
  handleAzureConsentCallback,
  validateAzure,
  getAzureStatus,
  getAzureSubscriptions,
  refreshAzureSubscriptions,
  analyzeAzureCostLeaks,
  disconnectAzure,
} = require("../controllers/azureController")
```

- [ ] **Step 2: Register Azure routes**

After the AWS route block:

```js
// Azure routes
router.get(   "/api/integrations/azure/consent",                 requireAuth, requireRole("owner", "editor"),           initiateAzureConsent)
router.get(   "/api/integrations/azure/consent-callback",                                                               handleAzureConsentCallback) // NO AUTH — Microsoft redirect
router.post(  "/api/integrations/azure/validate",                requireAuth, requireRole("owner", "editor"),           validateAzure)
router.get(   "/api/integrations/azure/status",                  requireAuth, requireRole("owner", "editor", "viewer"), getAzureStatus)
router.get(   "/api/integrations/azure/subscriptions",           requireAuth, requireRole("owner", "editor", "viewer"), getAzureSubscriptions)
router.post(  "/api/integrations/azure/subscriptions/refresh",   requireAuth, requireRole("owner", "editor"),           refreshAzureSubscriptions)
router.post(  "/api/integrations/azure/cost-leaks",              requireAuth, requireRole("owner", "editor"),           analyzeAzureCostLeaks)
router.delete("/api/integrations/azure",                         requireAuth, requireRole("owner", "editor"),           disconnectAzure)
```

- [ ] **Step 3: Add `"Azure"` branch to `extractSummary`**

Find the `"AWS"` branch in `extractSummary` (added during the AWS work). Insert after it, before the outer chain closes:

```js
  } else if (provider === "Azure") {
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

- [ ] **Step 4: Add `"Azure"` branch to duplicate-check**

After the AWS branch:

```js
  } else if (provider === "Azure") {
    duplicateQuery = duplicateQuery
      .eq("parameters->>tenantId", params.tenantId || "")
  }
```

- [ ] **Step 5: Env var docs**

Append to `backend/env.example.backend.txt`:

```
# Azure Cost-Leak Integration (Azure Advisor)
# A fresh multi-tenant app registration in Efficyon's Entra ID tenant;
# customers grant admin consent during wizard. See docs/superpowers/specs/2026-04-22-azure-billing-integration-design.md.
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_CONSENT_REDIRECT_URL=
```

- [ ] **Step 6: Verify loads + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/routes'); console.log('routes ok');"
node -e "const c = require('./src/controllers/analysisHistoryController'); console.log('history ok:', typeof c.saveAnalysis);"
cd ".."
git add backend/src/routes/index.js backend/src/controllers/analysisHistoryController.js backend/env.example.backend.txt
git commit -m "feat(azure): register Azure routes + history branches + env docs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Frontend

### Task 10: Azure config + `AzureConnectForm` + `AzureView`

**Files:**
- Create: `frontend/lib/tools/configs/azure.ts`
- Create: `frontend/components/tools/azure-connect-form.tsx`
- Create: `frontend/components/tools/azure-view.tsx`

- [ ] **Step 1: Create `azure.ts`**

```ts
import type { UnifiedToolConfig } from "../types"
import { AzureView } from "@/components/tools/azure-view"
import { AzureConnectForm } from "@/components/tools/azure-connect-form"

export const azureConfig: UnifiedToolConfig = {
  provider: "Azure",
  id: "azure",
  label: "Microsoft Azure",
  category: "Cloud Infrastructure",
  description: "Azure Advisor Cost recommendations across all subscriptions in your tenant",
  brandColor: "#0078D4",
  authType: "serviceAccount",
  authFields: [],
  connectComponent: AzureConnectForm,
  connectEndpoint: "/api/integrations",
  buildConnectRequest: () => ({
    integrations: [{
      tool_name: "Azure",
      connection_type: "serviceAccount",
      status: "pending",
      settings: {},
    }],
  }),
  endpoints: [
    { key: "subscriptions", path: "/api/integrations/azure/subscriptions", pick: ["subscriptions"], fallback: [] },
    { key: "status",        path: "/api/integrations/azure/status" },
  ],
  defaultTab: "subscriptions",
  viewComponent: AzureView,
  connectingToast: "Opening Azure admin consent…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To fully revoke access, remove the 'Efficyon Cost Analyzer (Azure)' enterprise application from your Azure AD tenant (Entra ID → Enterprise applications).",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/azure/cost-leaks",
  analysisSupportsInactivity: false,
}
```

- [ ] **Step 2: Create `AzureConnectForm`**

```tsx
"use client"

import { useState } from "react"
import type { ConnectComponentProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export function AzureConnectForm({ onSubmit, onCancel }: ConnectComponentProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGrantConsent() {
    setSubmitting(true)
    setError(null)
    try {
      // Create the integration row (status=pending) via the standard flow.
      await onSubmit({})

      // Fetch consent URL and redirect.
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      const res = await fetch(`${API_BASE}/api/integrations/azure/consent`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (!body.consentUrl) throw new Error("No consent URL returned")

      window.location.href = body.consentUrl
    } catch (e: any) {
      setError(e?.message || "Failed to start consent flow")
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 bg-muted/30 text-sm">
        <p>
          Efficyon will redirect you to Microsoft to sign in as an <strong>Azure AD Global Administrator</strong>.
          After you grant admin consent, we&apos;ll auto-validate access to your subscriptions.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          After consent, you&apos;ll still need to assign the <strong>Reader</strong> role to the
          &quot;Efficyon Cost Analyzer (Azure)&quot; service principal at your tenant-root management group.
          We poll for up to 60 seconds while the role assignment propagates.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button className="text-sm underline" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button
          className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          onClick={handleGrantConsent}
          disabled={submitting}
        >
          {submitting ? "Redirecting…" : "Grant consent in Azure AD"}
        </button>
      </div>
    </div>
  )
}

export default AzureConnectForm
```

- [ ] **Step 3: Create `AzureView`**

```tsx
"use client"

import { useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

type Subscription = { id: string; name: string; state: string }

export function AzureView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const settings: any = integration.settings || {}
  const subs: Subscription[] =
    (info?.subscriptions as Subscription[] | undefined) ||
    settings.active_subscriptions ||
    []
  const refreshedAt = settings.subscriptions_refreshed_at || null

  async function refresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      const res = await fetch(`${API_BASE}/api/integrations/azure/subscriptions/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await reload()
    } catch (e: any) {
      setRefreshError(e?.message || "Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border p-4 bg-background space-y-2">
        <h3 className="font-semibold">Tenant</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Tenant ID</dt>
          <dd className="font-mono truncate">{settings.tenant_id || "—"}</dd>
          <dt className="text-muted-foreground">Subscriptions</dt>
          <dd>{subs.length}</dd>
          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{settings.last_validated_at ? new Date(settings.last_validated_at).toLocaleString() : "—"}</dd>
        </dl>
      </section>

      <section className="rounded-md border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Subscriptions</h3>
          <button onClick={refresh} disabled={refreshing} className="text-xs underline disabled:opacity-50">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Subscription ID</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={3} className="px-4 py-4 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && subs.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-muted-foreground">No subscriptions visible.</td></tr>
              )}
              {subs.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {refreshedAt && <p className="px-4 py-2 text-xs text-muted-foreground">Last refreshed {new Date(refreshedAt).toLocaleString()}</p>}
        {refreshError && <p className="px-4 py-2 text-xs text-destructive">{refreshError}</p>}
      </section>
    </div>
  )
}

export default AzureView
```

- [ ] **Step 4: Verify types + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "azure" | head -10
```

Expected: no errors referencing azure files.

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/configs/azure.ts frontend/components/tools/azure-connect-form.tsx frontend/components/tools/azure-view.tsx
git commit -m "feat(azure): add frontend config + connect wizard + data view

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Detail-page auto-validate for Azure

**Files:**
- Modify: `frontend/app/dashboard/tools/[id]/page.tsx`

The AWS work added an auto-validate `useEffect` for pending AWS integrations. Azure uses the same flow; extend the condition.

- [ ] **Step 1: Find the existing AWS auto-validate `useEffect`**

It starts with: `if (config.provider !== "AWS" || integration.status !== "pending" || isAutoValidating) return`

- [ ] **Step 2: Generalize the provider check**

Replace that condition with:

```js
  if (!["AWS", "Azure"].includes(config.provider) || integration.status !== "pending" || isAutoValidating) return
```

Then replace the fetch URL line:

```js
        const res = await fetch(`${API_BASE}/api/integrations/aws/validate`, {
```

with:

```js
        const validateEndpoint =
          config.provider === "AWS"
            ? "/api/integrations/aws/validate"
            : "/api/integrations/azure/validate"
        const res = await fetch(`${API_BASE}${validateEndpoint}`, {
```

Update the success toast:

```js
          toast.success(`${config.label} connected`)
```

(instead of the hardcoded "AWS connected")

Update the Loader2 message:

```jsx
                Validating {config.label}…
```

Also update the `useEffect` dependency array — no change needed since it already tracks `config.provider`.

- [ ] **Step 3: Verify + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "\[id\]/page" | head -5
```

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/app/dashboard/tools/\[id\]/page.tsx
git commit -m "feat(azure): extend auto-validate effect to Azure pending integrations

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Register Azure in `TOOL_REGISTRY` + brand logo

**Files:**
- Modify: `frontend/lib/tools/registry.ts`
- Modify: `frontend/components/tools/tool-logos.tsx`

- [ ] **Step 1: Registry**

Add import after `awsConfig`:

```ts
import { azureConfig } from "./configs/azure"
```

Add entry after `AWS: awsConfig,`:

```ts
  Azure: azureConfig,
```

- [ ] **Step 2: Brand logo**

In `TOOL_BRANDS`, add an `azure:` entry after `aws:`. Microsoft Azure's official brand is a simplified "A" cloud mark in `#0078D4`. Inline SVG:

```tsx
  azure: {
    color: "#0078D4",
    // Stylized Azure "cloud A" mark on 24x24 viewBox.
    path: (
      <>
        <path
          fill="#0078D4"
          d="M13.05 4.24 7.54 19.82l-.01.03c-.07.2-.26.33-.47.33H3.44c-.27 0-.49-.22-.49-.5 0-.06.01-.12.03-.17L8.45 4.8c.08-.2.27-.33.48-.33h3.65c.2 0 .39.13.47.33z"
        />
        <path
          fill="#0078D4"
          d="M13.88 6.37 10.54 15.5l6.25.02 2.46 4.24c.09.16.26.26.44.26h3.42c.28 0 .5-.22.5-.49 0-.09-.02-.17-.06-.24L15.18 4.23c-.05-.1-.15-.16-.26-.16h-3.46c-.06 0-.12.01-.17.03l2.59 2.27z"
        />
      </>
    ),
  },
```

- [ ] **Step 3: Verify + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "(registry|tool-logos|azure)" | head -5
```

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/registry.ts frontend/components/tools/tool-logos.tsx
git commit -m "feat(azure): register Azure in TOOL_REGISTRY and add brand logo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Add Azure guide section

**Files:**
- Modify: `frontend/app/dashboard/tools/guide/page.tsx`

- [ ] **Step 1: Add Azure to `INTEGRATIONS` tab list** (after the AWS entry)

```ts
  { id: "azure", label: "Microsoft Azure", color: "#0078D4", desc: "Cloud Infrastructure" },
```

- [ ] **Step 2: Add Azure section** at the bottom of the guide sections (after AWS), before the closing `</div>`:

```tsx
      {/* Azure Section */}
      <section id="azure" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "azure" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0078D4]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="azure" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Microsoft Azure</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Cloud Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>An Azure AD (Entra ID) tenant with <strong>Global Administrator</strong> access</li>
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>Permission to assign roles at a subscription or management-group scope</li>
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>Subscriptions with the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Microsoft.Advisor</span> resource provider registered (default on most)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#0078D4]/80 hover:text-[#0078D4] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, and select <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Microsoft Azure</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Grant consent in Azure AD</span>. You&apos;ll be redirected to{" "}
                <a href="https://login.microsoftonline.com" target="_blank" rel="noopener noreferrer" className="text-[#0078D4]/80 hover:text-[#0078D4] inline-flex items-center gap-1 transition-colors">
                  login.microsoftonline.com <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#0078D4" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Sign in as <strong>Global Administrator</strong>. Review the consent screen — only these scopes are requested:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Azure Service Management / user_impersonation</ScopeBadge>
                </div>
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Accept</span>. You&apos;ll be redirected back to Effycion.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#0078D4" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Admin consent creates a Service Principal in your tenant but does <strong>not</strong> grant it any subscription access. Assign the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Reader</span> role:
                </p>
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Open{" "}
                  <a href="https://portal.azure.com/#view/Microsoft_Azure_ManagementGroups/ManagementGroupBrowseBlade" target="_blank" rel="noopener noreferrer" className="text-[#0078D4]/80 hover:text-[#0078D4] inline-flex items-center gap-1 transition-colors">
                    Azure Portal → Management Groups <ExternalLink className="w-3 h-3" />
                  </a>
                  {" "}→ select your <strong>Tenant Root Group</strong> → <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Access control (IAM)</span> → <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Add role assignment</span> → <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Reader</span> → select member <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer (Azure)</span> → save.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Effycion auto-polls for up to 60 seconds. Once the role assignment propagates, the status flips to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span> and the Data tab shows your subscriptions.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Switch to the Analysis tab and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Run Analysis</span>. Findings normally take 10–30 seconds depending on subscription count.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Efficyon pulls recommendations from <strong>Azure Advisor</strong> (Cost category) — Microsoft&apos;s pre-computed rightsizing, idle-resource, and reserved-instance opportunities. Savings come from Microsoft&apos;s own projections; most are derived from <code>annualSavingsAmount / 12</code>.
          </InfoBox>

          <SecurityBox>
            No long-lived Azure credentials are stored. Only the tenant ID is persisted. Every analysis issues a fresh 1-hour OAuth 2.0 app-only token (cached in-process only). All granted permissions are read-only — Efficyon cannot modify, create, or delete any Azure resource. Revoke access any time by removing the <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer (Azure)</span> enterprise application from your Entra ID tenant.
          </SecurityBox>
        </div>
      </section>
```

- [ ] **Step 3: Verify + commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "guide/page" | head -5
```

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/app/dashboard/tools/guide/page.tsx
git commit -m "feat(azure): add Azure setup guide section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — End-to-End Verification

### Task 14: Manual E2E against a real Azure tenant

- [ ] Apply migration 045 via Supabase MCP.
- [ ] **Efficyon ops setup** (one-time):
  - Create a multi-tenant app registration in Efficyon's Entra ID tenant (`Efficyon Cost Analyzer (Azure)`).
  - Add API permission: Azure Service Management → `user_impersonation`.
  - Add redirect URI: `<backend-url>/api/integrations/azure/consent-callback`.
  - Create a client secret; put values in backend `.env` as `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_CONSENT_REDIRECT_URL`.
- [ ] Start both dev servers.
- [ ] Dashboard → Add Integration → Microsoft Azure → Grant consent.
- [ ] Sign in to Azure as Global Admin → confirm consent page shows only Azure Service Management scope → Accept.
- [ ] Redirected back to Effycion; status shows "pending" with "Validating Microsoft Azure…" spinner.
- [ ] In Azure Portal, assign Reader role to the service principal at tenant-root management group.
- [ ] Within 60 seconds, status flips to `connected`. Data tab shows subscriptions.
- [ ] Run Analysis → non-zero findings within 30s (assuming the tenant has running workloads). If pristine, spin up an over-provisioned VM and wait a week for Advisor to pick it up.
- [ ] Supabase check: `SELECT provider, summary->>'totalPotentialSavings', summary->>'totalFindings' FROM cost_leak_analyses WHERE provider = 'Azure' ORDER BY created_at DESC LIMIT 1;` non-zero.
- [ ] Negative path: remove Reader role → re-run Analysis → expect 403 with the re-grant hint.
- [ ] Disconnect → `tenant_id` cleared, status `disconnected`.
- [ ] Reconnect — full flow works a second time.

---

## Final Checklist

- [ ] Task 1: `azureAuth.js` built + input-validation verified
- [ ] Task 2: `azureAdvisorAnalysis.js` built + normalizer fixture-verified
- [ ] Task 3: `azureCostLeakAnalysis.js` aggregator built + severity/aggregate verified
- [ ] Task 4: Migration `045_azure_provider.sql` (apply deferred)
- [ ] Task 5: Controller scaffolding loads
- [ ] Task 6: `initiateAzureConsent` + `handleAzureConsentCallback` implemented
- [ ] Task 7: `validateAzure` + `getAzureStatus` + subscription handlers implemented
- [ ] Task 8: `analyzeAzureCostLeaks` + `disconnectAzure` implemented
- [ ] Task 9: Routes wired + history branches + env docs
- [ ] Task 10: Frontend config + wizard + view
- [ ] Task 11: Detail page auto-validate extended
- [ ] Task 12: Registry entry + brand logo
- [ ] Task 13: Guide section
- [ ] Task 14: Full E2E against a real Azure tenant
