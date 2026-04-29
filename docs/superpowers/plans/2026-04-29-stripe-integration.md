# Stripe Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe as Efficyon's 16th integration — V1 detects 4 revenue-recovery signals (failed payments, card-expiry churn, past-due subs, disputes) from a customer's own Stripe account via a pasted restricted API key.

**Architecture:** Customer pastes a Stripe restricted key, encrypted at rest. The aggregator (`stripeRevenueLeakAnalysis.js`) fans out to 4 single-purpose check modules using `Promise.allSettled`, applies the standard severity ladder (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and returns findings. Findings ride in the existing `cost_leak_analyses` shape — only schema change is extending the provider CHECK constraint.

**Tech Stack:** Backend Express/CommonJS + Supabase + `stripe` SDK v15 (already installed). Frontend Next.js 16 / React 19 / TypeScript / Tailwind v4. Auth via existing `requireAuth` + `requireRole` middleware. Credential encryption via existing `utils/encryption.js`.

## Important context for the implementer

- **No test runner.** CLAUDE.md is explicit: `backend/package.json` test script exits with error; frontend has none. **Each task's "verification" step is a manual `curl` / browser check, not an automated test.** Don't fabricate test commands.
- **TypeScript build errors are silently ignored** (`frontend/next.config.mjs` has `typescript.ignoreBuildErrors: true`). Run `tsc --noEmit` from `frontend/` manually if you need real type-checking.
- **No RLS** — access control lives in `requireAuth` + `requireRole` middleware. Every new route must use both.
- **Naming collision:** the existing `backend/src/controllers/stripeController.js` is for Efficyon's *own* Stripe billing. The integration controller is **`stripeIntegrationController.js`** — a different file.
- **Cost-leak save pattern:** the cost-leak endpoint **returns** findings but does **not** save them. The frontend's existing flow POSTs the response to `/api/analysis-history` to persist. (Confirm by reading `backend/src/controllers/githubController.js:296-342`.)
- **Stripe SDK init:** `new Stripe(restrictedKey, { apiVersion: "2025-04-30.basil" })`. Pin the version explicitly so future Stripe API changes don't break the integration.
- **Stripe restricted-key prefix:** `rk_live_` (production) or `rk_test_` (test mode). The validate handler should accept both.
- **Currency normalization:** Stripe amounts are integer cents in the smallest unit. Always divide by 100 when displaying USD/EUR/GBP/SEK; for zero-decimal currencies (JPY, KRW, etc.) keep as-is. The `Stripe.Charge` `currency` field is the lowercase ISO code.
- **Pagination cap:** `auto_pagination` via `stripe.invoices.list().autoPagingToArray({ limit: 1000 })`. Cap at 1000 records per resource per analysis to bound memory.

---

## File Structure

**Backend (new files):**

```
backend/src/utils/stripeAuth.js                      Encrypt/decrypt restricted key, validate via GET /v1/account
backend/src/services/stripeRevenueLeakAnalysis.js    Aggregator: fans out to 4 checks, severity, sort
backend/src/services/stripeChecks/
  ├─ failedPaymentRecovery.js                        invoices.list({ status: 'open' })
  ├─ cardExpiryChurn.js                              customers + payment_methods + active subs
  ├─ pastDueSubscriptions.js                         subscriptions.list({ status: 'past_due' | 'unpaid' })
  └─ disputes.js                                     disputes.list({ created.gte })
backend/src/controllers/stripeIntegrationController.js  Connect/disconnect/data/analyze handlers
backend/sql/048_stripe_provider.sql                  Extends valid_provider CHECK to include 'Stripe'
```

**Backend (modify):**

```
backend/src/routes/index.js                          Wire 8 new routes
```

**Frontend (new):**

```
frontend/lib/tools/configs/stripe.ts                 UnifiedToolConfig
frontend/components/tools/stripe-view.tsx            Data tab (subs / invoices / disputes panels)
```

**Frontend (modify):**

```
frontend/lib/tools/registry.ts                       Register stripeConfig
```

---

## Task 1: SQL migration — add Stripe provider

**Files:**
- Create: `backend/sql/048_stripe_provider.sql`

- [ ] **Step 1: Write the migration**

Create `backend/sql/048_stripe_provider.sql`:

```sql
-- Allow Stripe as a provider for persisted cost-leak analyses.
-- Findings come from Stripe revenue-leak analysis (failed payments,
-- card-expiry churn, past-due subscriptions, disputes) via a customer-pasted
-- restricted API key.

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
    'Stripe'
  ));
```

- [ ] **Step 2: Apply the migration**

Open the Supabase project's SQL Editor (Dashboard → SQL Editor → New query). Paste the file contents and click Run. There is no migration runner — manual application is the established pattern (see CLAUDE.md "Database" section).

- [ ] **Step 3: Verify the constraint includes Stripe**

In Supabase SQL Editor run:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.cost_leak_analyses'::regclass
  AND conname = 'valid_provider';
```

Expected: the returned constraint definition contains `'Stripe'` in the `IN` list.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/048_stripe_provider.sql
git commit -m "feat(stripe): add provider migration for cost_leak_analyses"
```

---

## Task 2: Auth utility — encrypt/decrypt + validate restricted key

**Files:**
- Create: `backend/src/utils/stripeAuth.js`

- [ ] **Step 1: Write `stripeAuth.js`**

Create `backend/src/utils/stripeAuth.js`:

```javascript
/**
 * Stripe Auth Utility (per-customer restricted API key).
 *
 * Customer creates a restricted key in their Stripe Dashboard with read-only
 * scopes for Charges, Customers, Disputes, Invoices, Payment Intents, and
 * Subscriptions, then pastes it into Efficyon. We encrypt it at rest and use
 * it directly with the Stripe SDK on each analysis run.
 */

const Stripe = require("stripe")
const { encrypt, decrypt } = require("./encryption")

const STRIPE_API_VERSION = "2025-04-30.basil"

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function encryptStripeKey(restrictedKey) {
  if (!restrictedKey) {
    throw typedError("KEY_MISSING", "restrictedKey is required")
  }
  if (!restrictedKey.startsWith("rk_live_") && !restrictedKey.startsWith("rk_test_")) {
    throw typedError("KEY_INVALID_FORMAT", "Stripe restricted keys start with rk_live_ or rk_test_")
  }
  return { restricted_key_encrypted: encrypt(restrictedKey) }
}

function decryptStripeKey(settings) {
  const key = settings?.restricted_key_encrypted ? decrypt(settings.restricted_key_encrypted) : null
  if (!key) {
    throw typedError("KEY_DECRYPT_FAILED", "Unable to decrypt Stripe restricted key")
  }
  return key
}

function makeClient(restrictedKey) {
  return new Stripe(restrictedKey, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    timeout: 30000, // 30s per request — spec requirement
  })
}

/**
 * Validate the restricted key against Stripe's GET /v1/account.
 * Returns { id, default_currency, business_name } on success.
 * Throws typed errors with httpStatus on failure.
 */
async function validateStripeKey(restrictedKey) {
  const stripe = makeClient(restrictedKey)
  try {
    const account = await stripe.accounts.retrieve()
    return {
      id: account.id,
      default_currency: account.default_currency,
      business_name: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
    }
  } catch (e) {
    const err = typedError("STRIPE_VALIDATE_FAILED", e.message || "Stripe rejected the credentials")
    err.httpStatus = e.statusCode || 500
    err.stripeCode = e.code || null
    throw err
  }
}

module.exports = {
  encryptStripeKey,
  decryptStripeKey,
  makeClient,
  validateStripeKey,
  STRIPE_API_VERSION,
}
```

- [ ] **Step 2: Verify it loads**

Run from `backend/`:

```bash
node -e "const m = require('./src/utils/stripeAuth'); console.log(Object.keys(m));"
```

Expected output: `[ 'encryptStripeKey', 'decryptStripeKey', 'makeClient', 'validateStripeKey', 'STRIPE_API_VERSION' ]`

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/stripeAuth.js
git commit -m "feat(stripe): add restricted-key encryption + validation utility"
```

---

## Task 3: Controller scaffolding — connect/validate/disconnect/status

**Files:**
- Create: `backend/src/controllers/stripeIntegrationController.js`

- [ ] **Step 1: Write the controller scaffold**

Create `backend/src/controllers/stripeIntegrationController.js`:

```javascript
/**
 * Stripe Integration Controller (cost-leak / revenue-recovery findings).
 *
 * Auth = Per-customer Stripe restricted API key. The customer creates a
 * read-only restricted key in their own Stripe dashboard and pastes it into
 * Efficyon. The key is encrypted at rest and used directly with the Stripe SDK
 * on each analysis run.
 *
 * Findings: failed-payment recovery, card-expiry churn, past-due subscriptions,
 * disputes/chargebacks.
 *
 * NOTE: separate from backend/src/controllers/stripeController.js which handles
 * Efficyon's own billing (subscriptions, payment intents, webhooks).
 */

const { supabase } = require("../config/supabase")
const {
  encryptStripeKey,
  decryptStripeKey,
  makeClient,
  validateStripeKey,
} = require("../utils/stripeAuth")

const STRIPE_PROVIDER = "Stripe"

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
    .ilike("provider", STRIPE_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Stripe integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapStripeError(e) {
  const code = e?.code || ""
  if (code === "KEY_INVALID_FORMAT") {
    return { status: 400, message: e.message, hint: "Stripe restricted keys start with rk_live_ or rk_test_." }
  }
  if (code === "KEY_DECRYPT_FAILED") {
    return { status: 500, message: e.message, hint: "Re-connect the Stripe integration to refresh the encrypted key." }
  }
  if (e.httpStatus === 401) {
    return {
      status: 401,
      message: "Stripe credentials invalid — please reconnect.",
      hint: "The restricted key may have been deleted or rolled in your Stripe dashboard.",
    }
  }
  if (e.httpStatus === 403) {
    return {
      status: 403,
      message: "Stripe rejected the request — restricted key is missing a required scope.",
      hint: "Required: Read access to Charges, Customers, Disputes, Invoices, Payment Intents, Subscriptions.",
    }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Stripe throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Stripe error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: validateStripe
// On first validate, encrypts _pending_stripe_key into restricted_key_encrypted,
// then calls Stripe's accounts.retrieve and stores account metadata.
// ---------------------------------------------------------------------------
async function validateStripe(req, res) {
  const endpoint = "POST /api/integrations/stripe/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  let { integration } = lookup

  // Upgrade plaintext-on-first-validate -> encrypted persistent form.
  if (integration.settings?._pending_stripe_key) {
    try {
      const encrypted = encryptStripeKey(integration.settings._pending_stripe_key)
      const { _pending_stripe_key, ...rest } = integration.settings
      const newSettings = { ...rest, ...encrypted }
      const { data: updated, error: upErr } = await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
        .select()
        .single()
      if (upErr) {
        log("error", endpoint, "failed to persist encrypted key", { message: upErr.message })
        return res.status(500).json({ error: "Failed to save encrypted credentials." })
      }
      integration = updated
    } catch (e) {
      const mapped = mapStripeError(e)
      log("error", endpoint, "key encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  try {
    const restrictedKey = decryptStripeKey(integration.settings)
    const account = await validateStripeKey(restrictedKey)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          stripe_account_id: account.id,
          default_currency: account.default_currency,
          business_name: account.business_name,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      accountId: account.id,
      defaultCurrency: account.default_currency,
      businessName: account.business_name,
      lastValidatedAt: nowIso,
    })
  } catch (e) {
    const mapped = mapStripeError(e)
    log("error", endpoint, "validation failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getStripeStatus
// Returns integration metadata from settings — no Stripe call needed.
// ---------------------------------------------------------------------------
async function getStripeStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    accountId: s.stripe_account_id || null,
    defaultCurrency: s.default_currency || null,
    businessName: s.business_name || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectStripe
// Clears encrypted creds, keeps audit breadcrumb, flips status to disconnected.
// ---------------------------------------------------------------------------
async function disconnectStripe(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorAccountId = integration.settings?.stripe_account_id || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_stripe_account_id: priorAccountId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  validateStripe,
  getStripeStatus,
  disconnectStripe,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapStripeError,
  log,
  STRIPE_PROVIDER,
}
```

- [ ] **Step 2: Verify it loads**

```bash
node -e "const m = require('./src/controllers/stripeIntegrationController'); console.log(Object.keys(m));"
```

Expected: `[ 'validateStripe', 'getStripeStatus', 'disconnectStripe', 'getIntegrationForUser', 'mapStripeError', 'log', 'STRIPE_PROVIDER' ]`

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/stripeIntegrationController.js
git commit -m "feat(stripe): scaffold integration controller with connect/disconnect"
```

---

## Task 4: Wire connect/validate/disconnect/status routes

**Files:**
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add the require + route registrations**

Open `backend/src/routes/index.js`. Find the GitHub controller require block (around line 190) and add a new require below it:

```javascript
// Stripe Integration Controller - per-customer restricted API key cost analysis
// (Distinct from stripeController.js which handles Efficyon's own billing.)
const {
  validateStripe,
  getStripeStatus,
  disconnectStripe,
} = require("../controllers/stripeIntegrationController")
```

Then find the GitHub routes block (around line 488) and add directly below it:

```javascript
// Stripe Integration routes (revenue-leak analysis)
router.post(  "/api/integrations/stripe/validate",   requireAuth, requireRole("owner", "editor"),           validateStripe)
router.get(   "/api/integrations/stripe/status",     requireAuth, requireRole("owner", "editor", "viewer"), getStripeStatus)
router.delete("/api/integrations/stripe",            requireAuth, requireRole("owner", "editor"),           disconnectStripe)
```

- [ ] **Step 2: Boot the server and verify routes load**

```bash
cd backend && npm run dev
```

Expected: server boots on `:4000` with no errors. Look for "Server listening on port 4000" or equivalent. If you see `SyntaxError` or `Cannot find module`, the require path is wrong.

Stop the server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/index.js
git commit -m "feat(stripe): wire validate/status/disconnect routes"
```

---

## Task 5: Frontend config + register tool

**Files:**
- Create: `frontend/lib/tools/configs/stripe.ts`
- Create: `frontend/components/tools/stripe-view.tsx` (placeholder; filled in Task 8)
- Modify: `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Write the placeholder view component**

Create `frontend/components/tools/stripe-view.tsx`:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function StripeView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Stripe Account</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Account ID</dt>
          <dd className="font-mono">{statusInfo?.accountId || settings.stripe_account_id || "—"}</dd>
          <dt className="text-muted-foreground">Currency</dt>
          <dd className="uppercase">{statusInfo?.defaultCurrency || settings.default_currency || "—"}</dd>
          <dt className="text-muted-foreground">Business name</dt>
          <dd>{statusInfo?.businessName || settings.business_name || "—"}</dd>
        </dl>
      </section>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
```

- [ ] **Step 2: Write the tool config**

Create `frontend/lib/tools/configs/stripe.ts`:

```typescript
import type { UnifiedToolConfig } from "../types"
import { StripeView } from "@/components/tools/stripe-view"

export const stripeConfig: UnifiedToolConfig = {
  provider: "Stripe",
  id: "stripe",
  label: "Stripe",
  category: "Finance",
  description: "Failed payment recovery, card-expiry churn, past-due subscriptions, and disputes",
  brandColor: "#635BFF",
  authType: "apiKey",
  authFields: [
    {
      name: "restrictedKey",
      label: "Stripe Restricted API Key",
      type: "password",
      required: true,
      placeholder: "rk_live_...",
      hint: "Stripe Dashboard → Developers → API keys → Restricted keys",
      validate: (v) =>
        v && (v.startsWith("rk_live_") || v.startsWith("rk_test_"))
          ? null
          : "Must be a Stripe restricted key (starts with rk_live_ or rk_test_)",
    },
  ],
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Stripe",
        connection_type: "apiKey",
        status: "pending",
        settings: {
          _pending_stripe_key: values.restrictedKey,
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to get your Stripe restricted key",
    steps: [
      "Open Stripe Dashboard → Developers → API keys",
      "Click 'Create restricted key'",
      "Name it 'Efficyon Cost Analyzer'",
      "Grant Read access to: Charges, Customers, Disputes, Invoices, Payment Intents, Subscriptions",
      "Click 'Create key', then reveal and copy the rk_live_... key",
      "Paste it into Efficyon",
    ],
  },
  endpoints: [
    { key: "status", path: "/api/integrations/stripe/status" },
  ],
  defaultTab: "status",
  viewComponent: StripeView,
  connectingToast: "Validating Stripe credentials…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, go to Stripe Dashboard → Developers → API keys → find 'Efficyon Cost Analyzer' → Roll or Delete.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/stripe/cost-leaks",
  analysisSupportsDateRange: true,
}
```

- [ ] **Step 3: Register in the tool registry**

Open `frontend/lib/tools/registry.ts`. Add the import alphabetically with the others and the registry entry:

```typescript
import { stripeConfig } from "./configs/stripe"
```

Add `Stripe: stripeConfig,` to the `TOOL_REGISTRY` object (alphabetically, after `Slack` would be natural).

- [ ] **Step 4: Verify the frontend type-checks**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors related to `stripe.ts`, `stripe-view.tsx`, or `registry.ts`. (Pre-existing errors elsewhere are fine — `next.config.mjs` ignores them at build time anyway.)

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/tools/configs/stripe.ts frontend/components/tools/stripe-view.tsx frontend/lib/tools/registry.ts
git commit -m "feat(stripe): add tool config + placeholder view + registry entry"
```

---

## Task 6: End-to-end manual test of the connect flow

This is verification, not implementation. No new files.

- [ ] **Step 1: Create a Stripe test-mode restricted key**

Open https://dashboard.stripe.com/test/apikeys → Restricted keys → Create restricted key. Name it "Efficyon Local Test". Grant **Read** access to: Charges, Customers, Disputes, Invoices, Payment Intents, Subscriptions. Click Create, reveal, and copy the `rk_test_...` value.

- [ ] **Step 2: Boot both apps**

```bash
cd backend && npm run dev    # in one terminal
cd frontend && npm run dev   # in another terminal
```

- [ ] **Step 3: Connect via the dashboard**

Open http://localhost:3000/dashboard, log in, navigate to the Tools / Integrations area, click "Connect Stripe", paste the `rk_test_...` key, submit.

Expected:
- Toast shows "Validating Stripe credentials…"
- Stripe tool appears in the connected list with status "connected"
- The detail page shows the Stripe account ID and default currency in the placeholder view

- [ ] **Step 4: Verify with curl that status returns**

```bash
curl -s http://localhost:4000/api/integrations/stripe/status \
  -H "Authorization: Bearer $YOUR_JWT" | jq
```

Expected: `{ "status": "connected", "accountId": "acct_...", "defaultCurrency": "...", "businessName": ..., "lastValidatedAt": "..." }`

- [ ] **Step 5: Verify error path — bad key**

In the dashboard, disconnect Stripe, then try to reconnect with `rk_test_garbage`. Expected: 401 from `/validate` with message "Stripe credentials invalid — please reconnect."

- [ ] **Step 6: Verify disconnect**

Click Disconnect in the UI. Expected: integration row in `company_integrations` has `status = 'disconnected'` and `settings` no longer contains `restricted_key_encrypted`.

- [ ] **Step 7: No commit (verification-only step)**

---

## Task 7: Data endpoints — subscriptions, invoices, disputes, account

**Files:**
- Modify: `backend/src/controllers/stripeIntegrationController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add four data handlers to the controller**

Open `backend/src/controllers/stripeIntegrationController.js`. Insert the four handlers below `disconnectStripe`, and update the `module.exports` block to include them.

```javascript
// ---------------------------------------------------------------------------
// Handler: getStripeAccount
// Returns Stripe account metadata (live, not from settings cache).
// ---------------------------------------------------------------------------
async function getStripeAccount(req, res) {
  const endpoint = "GET /api/integrations/stripe/account"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const restrictedKey = decryptStripeKey(integration.settings)
    const stripe = makeClient(restrictedKey)
    const account = await stripe.accounts.retrieve()
    return res.json({ account })
  } catch (e) {
    const mapped = mapStripeError(e)
    log("error", endpoint, "getAccount failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getStripeSubscriptions
// Returns most recent 50 subscriptions across all statuses for the Data tab.
// ---------------------------------------------------------------------------
async function getStripeSubscriptions(req, res) {
  const endpoint = "GET /api/integrations/stripe/subscriptions"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const restrictedKey = decryptStripeKey(integration.settings)
    const stripe = makeClient(restrictedKey)
    const page = await stripe.subscriptions.list({
      limit: 50,
      status: "all",
      expand: ["data.customer", "data.default_payment_method"],
    })
    return res.json({ subscriptions: page.data })
  } catch (e) {
    const mapped = mapStripeError(e)
    log("error", endpoint, "list subscriptions failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getStripeInvoices
// Returns most recent 50 invoices for the Data tab.
// ---------------------------------------------------------------------------
async function getStripeInvoices(req, res) {
  const endpoint = "GET /api/integrations/stripe/invoices"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const restrictedKey = decryptStripeKey(integration.settings)
    const stripe = makeClient(restrictedKey)
    const page = await stripe.invoices.list({ limit: 50, expand: ["data.customer"] })
    return res.json({ invoices: page.data })
  } catch (e) {
    const mapped = mapStripeError(e)
    log("error", endpoint, "list invoices failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getStripeDisputes
// Returns most recent 50 disputes for the Data tab.
// ---------------------------------------------------------------------------
async function getStripeDisputes(req, res) {
  const endpoint = "GET /api/integrations/stripe/disputes"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const restrictedKey = decryptStripeKey(integration.settings)
    const stripe = makeClient(restrictedKey)
    const page = await stripe.disputes.list({ limit: 50, expand: ["data.charge"] })
    return res.json({ disputes: page.data })
  } catch (e) {
    const mapped = mapStripeError(e)
    log("error", endpoint, "list disputes failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

Update the module export at the bottom of the file to include all four:

```javascript
module.exports = {
  validateStripe,
  getStripeStatus,
  disconnectStripe,
  getStripeAccount,
  getStripeSubscriptions,
  getStripeInvoices,
  getStripeDisputes,
  getIntegrationForUser,
  mapStripeError,
  log,
  STRIPE_PROVIDER,
}
```

Also add the missing imports at the top of the file (under the existing `decryptStripeKey` import), so the new handlers can call `makeClient`:

```javascript
// (already imported in Task 3 — confirm `makeClient` and `decryptStripeKey` are in the require destructure)
```

- [ ] **Step 2: Wire the four routes**

Open `backend/src/routes/index.js`. Update the existing destructure:

```javascript
const {
  validateStripe,
  getStripeStatus,
  disconnectStripe,
  getStripeAccount,
  getStripeSubscriptions,
  getStripeInvoices,
  getStripeDisputes,
} = require("../controllers/stripeIntegrationController")
```

Add four new routes immediately below the existing Stripe integration routes:

```javascript
router.get(   "/api/integrations/stripe/account",       requireAuth, requireRole("owner", "editor", "viewer"), getStripeAccount)
router.get(   "/api/integrations/stripe/subscriptions", requireAuth, requireRole("owner", "editor", "viewer"), getStripeSubscriptions)
router.get(   "/api/integrations/stripe/invoices",      requireAuth, requireRole("owner", "editor", "viewer"), getStripeInvoices)
router.get(   "/api/integrations/stripe/disputes",      requireAuth, requireRole("owner", "editor", "viewer"), getStripeDisputes)
```

- [ ] **Step 3: Boot and curl-test each endpoint**

```bash
cd backend && npm run dev
```

In another terminal (substitute your JWT):

```bash
TOKEN="your-jwt-here"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/stripe/account | jq '.account.id'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/stripe/subscriptions | jq '.subscriptions | length'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/stripe/invoices | jq '.invoices | length'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/integrations/stripe/disputes | jq '.disputes | length'
```

Expected: each returns valid JSON. On a fresh test account, lengths may be 0 — that's fine, you'll seed data in Task 16.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/stripeIntegrationController.js backend/src/routes/index.js
git commit -m "feat(stripe): add account/subscriptions/invoices/disputes data endpoints"
```

---

## Task 8: Fill in the Data tab UI

**Files:**
- Modify: `frontend/components/tools/stripe-view.tsx`
- Modify: `frontend/lib/tools/configs/stripe.ts` — extend `endpoints`

- [ ] **Step 1: Update the config to fetch the 3 data lists**

In `frontend/lib/tools/configs/stripe.ts`, replace the `endpoints` array with:

```typescript
endpoints: [
  { key: "status", path: "/api/integrations/stripe/status" },
  { key: "subscriptions", path: "/api/integrations/stripe/subscriptions", pick: ["subscriptions"], fallback: [] },
  { key: "invoices", path: "/api/integrations/stripe/invoices", pick: ["invoices"], fallback: [] },
  { key: "disputes", path: "/api/integrations/stripe/disputes", pick: ["disputes"], fallback: [] },
],
defaultTab: "subscriptions",
```

- [ ] **Step 2: Replace the placeholder view with three panels**

Overwrite `frontend/components/tools/stripe-view.tsx`:

```typescript
"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface StripeSubscription {
  id: string
  status: string
  current_period_end: number
  customer?: { id: string; email?: string | null; name?: string | null } | string
  items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string; recurring?: { interval?: string } } }> }
}

interface StripeInvoice {
  id: string
  status: string
  number?: string | null
  amount_due: number
  amount_remaining: number
  currency: string
  due_date?: number | null
  created: number
  customer?: { id: string; email?: string | null; name?: string | null } | string
}

interface StripeDispute {
  id: string
  status: string
  reason: string
  amount: number
  currency: string
  created: number
  evidence_details?: { due_by?: number | null }
}

function formatMoney(amountCents: number, currency = "usd") {
  const dollars = amountCents / 100
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(dollars)
}

function formatDate(unixSec?: number | null) {
  if (!unixSec) return "—"
  return new Date(unixSec * 1000).toLocaleDateString()
}

function customerLabel(c: any) {
  if (!c) return "—"
  if (typeof c === "string") return c
  return c.email || c.name || c.id || "—"
}

export function StripeView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const subs: StripeSubscription[] = (info?.subscriptions as StripeSubscription[] | undefined) || []
  const invoices: StripeInvoice[] = (info?.invoices as StripeInvoice[] | undefined) || []
  const disputes: StripeDispute[] = (info?.disputes as StripeDispute[] | undefined) || []

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Stripe Account</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Account ID</dt>
          <dd className="font-mono">{statusInfo?.accountId || settings.stripe_account_id || "—"}</dd>
          <dt className="text-muted-foreground">Currency</dt>
          <dd className="uppercase">{statusInfo?.defaultCurrency || settings.default_currency || "—"}</dd>
          <dt className="text-muted-foreground">Business name</dt>
          <dd>{statusInfo?.businessName || settings.business_name || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Subscriptions ({subs.length})</h2>
        {subs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No subscriptions returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Customer</th>
                <th>Status</th>
                <th>MRR</th>
                <th>Period end</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const item = s.items?.data?.[0]?.price
                const interval = item?.recurring?.interval || "month"
                const monthly = item?.unit_amount ? (interval === "year" ? item.unit_amount / 12 : item.unit_amount) : 0
                return (
                  <tr key={s.id} className="border-t">
                    <td className="py-2">{customerLabel(s.customer)}</td>
                    <td>{s.status}</td>
                    <td>{formatMoney(monthly, item?.currency || "usd")}</td>
                    <td>{formatDate(s.current_period_end)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No invoices returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Number</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="py-2 font-mono">{i.number || i.id.slice(0, 12)}</td>
                  <td>{customerLabel(i.customer)}</td>
                  <td>{i.status}</td>
                  <td>{formatMoney(i.amount_due, i.currency)}</td>
                  <td>{formatDate(i.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Disputes ({disputes.length})</h2>
        {disputes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No disputes returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Reason</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Evidence due</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-2">{d.reason}</td>
                  <td>{d.status}</td>
                  <td>{formatMoney(d.amount, d.currency)}</td>
                  <td>{formatDate(d.created)}</td>
                  <td>{formatDate(d.evidence_details?.due_by)}</td>
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

- [ ] **Step 3: Browser test**

With both servers running, open http://localhost:3000/dashboard/tools/stripe-(or-your-id). Expected:
- Account section shows ID and currency
- Subscriptions / Invoices / Disputes panels render with whatever data the test account has (likely empty until Task 16 seeds data)
- Loading state shows briefly
- No console errors

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/tools/configs/stripe.ts frontend/components/tools/stripe-view.tsx
git commit -m "feat(stripe): render data tab — account, subscriptions, invoices, disputes"
```

---

## Task 9: Check 1 — failed payment recovery

**Files:**
- Create: `backend/src/services/stripeChecks/failedPaymentRecovery.js`

- [ ] **Step 1: Write the check**

Create `backend/src/services/stripeChecks/failedPaymentRecovery.js`:

```javascript
/**
 * Check 1 — Failed payment recovery.
 *
 * Pulls open invoices that have already failed at least one collection attempt
 * inside the lookback window and quantifies dollars-on-the-floor that smart
 * dunning could still recover.
 *
 * Output: one finding per currency (most accounts use just one).
 */

const RECOVERY_RATE = 0.65 // B2B SaaS dunning recovery benchmark

async function check({ stripe, lookbackDays }) {
  const lookbackStart = Math.floor(Date.now() / 1000) - lookbackDays * 86400
  const list = stripe.invoices.list({
    status: "open",
    collection_method: "charge_automatically",
    created: { gte: lookbackStart },
    limit: 100,
  })
  const items = await list.autoPagingToArray({ limit: 1000 })

  const failed = items.filter((inv) => inv.attempt_count >= 1 && inv.status === "open")

  // Group by currency
  const byCurrency = new Map()
  for (const inv of failed) {
    const cur = inv.currency
    if (!byCurrency.has(cur)) byCurrency.set(cur, { count: 0, totalCents: 0, evidence: [] })
    const entry = byCurrency.get(cur)
    entry.count += 1
    entry.totalCents += inv.amount_remaining || 0
    if (entry.evidence.length < 10) entry.evidence.push(inv.id)
  }

  const findings = []
  for (const [currency, agg] of byCurrency.entries()) {
    const totalAmount = agg.totalCents / 100
    const recoverable = totalAmount * RECOVERY_RATE
    findings.push({
      check: "failed_payment_recovery",
      title: `${agg.count} failed payments awaiting recovery`,
      currency,
      currentValue: totalAmount,
      potentialRecovery: Math.round(recoverable * 100) / 100,
      evidence: agg.evidence,
      action:
        "Enable Stripe Smart Retries with at least 4 attempts over 14 days. " +
        "Verify Adaptive Acceptance is on. Customer outreach for the 35% Smart Retries cannot recover.",
    })
  }
  return { findings }
}

module.exports = { check, RECOVERY_RATE }
```

- [ ] **Step 2: Manual verification — run against the test account**

Create a one-off script `backend/scripts/probe-stripe-check.js` (don't commit it):

```javascript
const { makeClient } = require("../src/utils/stripeAuth")
const { check } = require("../src/services/stripeChecks/failedPaymentRecovery")

async function main() {
  const stripe = makeClient(process.env.STRIPE_RK_TEST)
  const result = await check({ stripe, lookbackDays: 90 })
  console.log(JSON.stringify(result, null, 2))
}
main().catch(console.error)
```

```bash
STRIPE_RK_TEST=rk_test_yourkey node backend/scripts/probe-stripe-check.js
```

Expected: `{ findings: [...] }` — likely empty on a fresh account, or one finding per currency if you've seeded failed invoices via Stripe CLI.

Delete the probe script after verifying:

```bash
rm backend/scripts/probe-stripe-check.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/stripeChecks/failedPaymentRecovery.js
git commit -m "feat(stripe): check 1 — failed payment recovery"
```

---

## Task 10: Shared check helper — monthlyAmount

**Files:**
- Create: `backend/src/services/stripeChecks/_helpers.js`

- [ ] **Step 1: Write the helper**

Create `backend/src/services/stripeChecks/_helpers.js`:

```javascript
/**
 * Shared helpers for the four Stripe check modules.
 */

/**
 * Normalize a Stripe Price to a per-month integer-cents amount.
 * Returns 0 if the price isn't recurring or required fields are missing.
 */
function monthlyAmount(price) {
  if (!price?.unit_amount || !price?.recurring?.interval) return 0
  const interval = price.recurring.interval
  const count = price.recurring.interval_count || 1
  const cents = price.unit_amount
  if (interval === "month") return cents / count
  if (interval === "year") return cents / (12 * count)
  if (interval === "week") return (cents * 4.33) / count
  if (interval === "day") return (cents * 30) / count
  return 0
}

module.exports = { monthlyAmount }
```

- [ ] **Step 2: Verify it loads**

```bash
node -e "const m = require('./src/services/stripeChecks/_helpers'); console.log(m.monthlyAmount({ unit_amount: 1200, recurring: { interval: 'month', interval_count: 1 }}));"
```

Expected output: `1200`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/stripeChecks/_helpers.js
git commit -m "feat(stripe): add shared check helper (monthlyAmount)"
```

---

## Task 11: Check 2 — card-expiry preventable churn

**Files:**
- Create: `backend/src/services/stripeChecks/cardExpiryChurn.js`

- [ ] **Step 1: Write the check**

Create `backend/src/services/stripeChecks/cardExpiryChurn.js`:

```javascript
/**
 * Check 2 — Card-expiry preventable churn.
 *
 * For every customer with at least one ACTIVE subscription, fetch the default
 * payment method. Flag any with a card expiring in the next 60 days.
 * Potential loss = sum of monthly-normalized MRR across the customer's active subs.
 */

const { monthlyAmount } = require("./_helpers")

const EXPIRY_HORIZON_DAYS = 60

async function check({ stripe }) {
  const horizonMs = Date.now() + EXPIRY_HORIZON_DAYS * 86400 * 1000

  // Pull active subscriptions; that gives us the customers we care about and
  // their MRR in one pass without iterating every customer.
  const subList = stripe.subscriptions.list({
    status: "active",
    expand: ["data.customer", "data.default_payment_method"],
    limit: 100,
  })
  const subs = await subList.autoPagingToArray({ limit: 1000 })

  // Group by customer
  const customerSubs = new Map() // customerId -> { defaultPm, monthlyTotalCents, currency, customer }
  for (const sub of subs) {
    const cust = sub.customer
    if (!cust || typeof cust === "string") continue
    const cid = cust.id
    let pm = sub.default_payment_method
    // Fall back to customer's invoice_settings default if subscription has none
    if (!pm && cust.invoice_settings?.default_payment_method) {
      pm = cust.invoice_settings.default_payment_method
    }
    if (!customerSubs.has(cid)) {
      customerSubs.set(cid, { customer: cust, defaultPm: pm, monthlyTotalCents: 0, currency: null })
    }
    const entry = customerSubs.get(cid)
    if (!entry.defaultPm && pm) entry.defaultPm = pm
    for (const item of sub.items?.data || []) {
      entry.monthlyTotalCents += monthlyAmount(item.price)
      if (!entry.currency && item.price?.currency) entry.currency = item.price.currency
    }
  }

  // Resolve payment methods that came back as IDs (not expanded)
  const findings = []
  for (const [cid, entry] of customerSubs.entries()) {
    let pm = entry.defaultPm
    if (typeof pm === "string") {
      try {
        pm = await stripe.paymentMethods.retrieve(pm)
      } catch {
        continue
      }
    }
    const card = pm?.card
    if (!card?.exp_year || !card?.exp_month) continue
    const expiryDate = new Date(card.exp_year, card.exp_month, 0).getTime() // last day of exp_month
    if (expiryDate > horizonMs) continue

    const monthly = entry.monthlyTotalCents / 100
    findings.push({
      check: "card_expiry_churn",
      title: `Card expiring ${card.exp_month}/${card.exp_year} for ${entry.customer.email || cid}`,
      currency: entry.currency || "usd",
      currentValue: monthly,
      potentialRecovery: monthly, // full MRR at risk for at least one month
      evidence: [cid],
      action:
        "Email the customer to update their card before expiry. " +
        "Enable Stripe's automatic card-updater (free for most US issuers).",
    })
  }
  return { findings }
}

module.exports = { check, EXPIRY_HORIZON_DAYS }
```

- [ ] **Step 2: Manual verification — run against the test account**

Create a one-off script `backend/scripts/probe-stripe-check.js` (don't commit it):

```javascript
const { makeClient } = require("../src/utils/stripeAuth")
const { check } = require("../src/services/stripeChecks/cardExpiryChurn")

async function main() {
  const stripe = makeClient(process.env.STRIPE_RK_TEST)
  const result = await check({ stripe })
  console.log(JSON.stringify(result, null, 2))
}
main().catch(console.error)
```

Run it:

```bash
STRIPE_RK_TEST=rk_test_yourkey node backend/scripts/probe-stripe-check.js
```

Expected: `{ findings: [...] }`. Likely empty unless you've manually attached an expiring card to a test customer with an active subscription.

Delete the probe script:

```bash
rm backend/scripts/probe-stripe-check.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/stripeChecks/cardExpiryChurn.js
git commit -m "feat(stripe): check 2 — card-expiry preventable churn"
```

---

## Task 12: Check 3 — past-due subscriptions

**Files:**
- Create: `backend/src/services/stripeChecks/pastDueSubscriptions.js`

- [ ] **Step 1: Write the check**

Create `backend/src/services/stripeChecks/pastDueSubscriptions.js`:

```javascript
/**
 * Check 3 — Past-due subscriptions.
 *
 * Lists subscriptions in `past_due` and `unpaid` states. Each becomes a finding
 * with that subscription's monthly-normalized MRR as the at-risk amount.
 */

const { monthlyAmount } = require("./_helpers")

async function listByStatus(stripe, status) {
  const list = stripe.subscriptions.list({
    status,
    expand: ["data.customer"],
    limit: 100,
  })
  return list.autoPagingToArray({ limit: 1000 })
}

async function check({ stripe }) {
  const [pastDue, unpaid] = await Promise.all([
    listByStatus(stripe, "past_due"),
    listByStatus(stripe, "unpaid"),
  ])
  const subs = [...pastDue, ...unpaid]

  const findings = []
  for (const sub of subs) {
    let monthlyCents = 0
    let currency = "usd"
    for (const item of sub.items?.data || []) {
      monthlyCents += monthlyAmount(item.price)
      if (item.price?.currency) currency = item.price.currency
    }
    const monthly = monthlyCents / 100
    if (monthly <= 0) continue

    const cust = sub.customer
    const label =
      typeof cust === "string"
        ? cust
        : cust?.email || cust?.name || cust?.id || sub.id
    findings.push({
      check: "past_due_subscription",
      title: `Past-due subscription for ${label}`,
      currency,
      currentValue: monthly,
      potentialRecovery: monthly,
      evidence: [sub.id],
      action:
        sub.status === "unpaid"
          ? "Subscription is unpaid — immediate manual outreach required to prevent cancellation."
          : "Subscription is past_due — verify dunning schedule and consider personal outreach.",
    })
  }
  return { findings }
}

module.exports = { check }
```

- [ ] **Step 2: Manual verification**

Create a one-off script `backend/scripts/probe-stripe-check.js` (don't commit it):

```javascript
const { makeClient } = require("../src/utils/stripeAuth")
const { check } = require("../src/services/stripeChecks/pastDueSubscriptions")

async function main() {
  const stripe = makeClient(process.env.STRIPE_RK_TEST)
  const result = await check({ stripe })
  console.log(JSON.stringify(result, null, 2))
}
main().catch(console.error)
```

Run it:

```bash
STRIPE_RK_TEST=rk_test_yourkey node backend/scripts/probe-stripe-check.js
```

Expected: `{ findings: [...] }`. Likely empty unless your test account has past-due subscriptions.

Delete the probe script:

```bash
rm backend/scripts/probe-stripe-check.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/stripeChecks/pastDueSubscriptions.js
git commit -m "feat(stripe): check 3 — past-due subscriptions"
```

---

## Task 13: Check 4 — disputes / chargebacks

**Files:**
- Create: `backend/src/services/stripeChecks/disputes.js`

- [ ] **Step 1: Write the check**

Create `backend/src/services/stripeChecks/disputes.js`:

```javascript
/**
 * Check 4 — Disputes / chargebacks.
 *
 * Aggregates all disputes opened inside the lookback window. Stripe charges a
 * fixed dispute fee per chargeback (modal value $15 for US cards) which we
 * approximate since the fee isn't returned in the dispute object.
 */

const DISPUTE_FEE_USD = 15

async function check({ stripe, lookbackDays }) {
  const lookbackStart = Math.floor(Date.now() / 1000) - lookbackDays * 86400
  const list = stripe.disputes.list({
    created: { gte: lookbackStart },
    limit: 100,
  })
  const items = await list.autoPagingToArray({ limit: 1000 })

  // Group by currency
  const byCurrency = new Map()
  for (const d of items) {
    const cur = d.currency
    if (!byCurrency.has(cur)) byCurrency.set(cur, { count: 0, totalCents: 0, evidence: [] })
    const entry = byCurrency.get(cur)
    entry.count += 1
    entry.totalCents += d.amount || 0
    if (entry.evidence.length < 10) entry.evidence.push(d.id)
  }

  const findings = []
  for (const [currency, agg] of byCurrency.entries()) {
    const totalLost = agg.totalCents / 100
    const feesPaid = agg.count * DISPUTE_FEE_USD // approx; fees vary by region/brand
    findings.push({
      check: "disputes",
      title: `${agg.count} disputes in the last window`,
      currency,
      currentValue: totalLost,
      potentialRecovery: totalLost + feesPaid,
      evidence: agg.evidence,
      action:
        "Review each dispute and submit evidence within Stripe's deadline. " +
        "If chargeback rate is rising, audit for friendly fraud and weak 3DS coverage.",
    })
  }
  return { findings }
}

module.exports = { check, DISPUTE_FEE_USD }
```

- [ ] **Step 2: Manual verification**

Create a one-off script `backend/scripts/probe-stripe-check.js` (don't commit it):

```javascript
const { makeClient } = require("../src/utils/stripeAuth")
const { check } = require("../src/services/stripeChecks/disputes")

async function main() {
  const stripe = makeClient(process.env.STRIPE_RK_TEST)
  const result = await check({ stripe, lookbackDays: 90 })
  console.log(JSON.stringify(result, null, 2))
}
main().catch(console.error)
```

Run it:

```bash
STRIPE_RK_TEST=rk_test_yourkey node backend/scripts/probe-stripe-check.js
```

Expected: `{ findings: [...] }`. Empty on a fresh account; one finding per currency if you've triggered disputes via `stripe trigger charge.dispute.created`.

Delete the probe script:

```bash
rm backend/scripts/probe-stripe-check.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/stripeChecks/disputes.js
git commit -m "feat(stripe): check 4 — disputes / chargebacks"
```

---

## Task 14: Aggregator + cost-leaks endpoint

**Files:**
- Create: `backend/src/services/stripeRevenueLeakAnalysis.js`
- Modify: `backend/src/controllers/stripeIntegrationController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Write the aggregator**

Create `backend/src/services/stripeRevenueLeakAnalysis.js`:

```javascript
/**
 * Stripe revenue-leak analysis aggregator.
 *
 * Fans out to the four V1 checks via Promise.allSettled, merges findings,
 * applies the standard severity ladder (≥$500 critical / ≥$100 high /
 * ≥$25 medium / >$0 low), and produces a summary suitable for cost_leak_analyses.
 */

const failedPaymentRecovery = require("./stripeChecks/failedPaymentRecovery")
const cardExpiryChurn = require("./stripeChecks/cardExpiryChurn")
const pastDueSubscriptions = require("./stripeChecks/pastDueSubscriptions")
const disputes = require("./stripeChecks/disputes")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeStripeRevenueLeaks({ stripe, lookbackDays = 90 }) {
  const checks = [
    { name: "failed_payment_recovery", run: () => failedPaymentRecovery.check({ stripe, lookbackDays }) },
    { name: "card_expiry_churn",       run: () => cardExpiryChurn.check({ stripe }) },
    { name: "past_due_subscription",   run: () => pastDueSubscriptions.check({ stripe }) },
    { name: "disputes",                run: () => disputes.check({ stripe, lookbackDays }) },
  ]

  const settled = await Promise.allSettled(checks.map((c) => c.run()))

  const allFindings = []
  const warnings = []
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      for (const f of res.value.findings || []) {
        const sev = severityFor(f.potentialRecovery)
        if (!sev) continue
        allFindings.push({ ...f, severity: sev })
      }
    } else {
      warnings.push({ check: checks[i].name, error: res.reason?.message || String(res.reason) })
    }
  })

  // Sort by potentialRecovery desc
  allFindings.sort((a, b) => (b.potentialRecovery || 0) - (a.potentialRecovery || 0))

  // Severity counts
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let totalCurrentValue = 0
  let totalPotentialSavings = 0
  for (const f of allFindings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    totalCurrentValue += f.currentValue || 0
    totalPotentialSavings += f.potentialRecovery || 0
  }

  // Health score: 100 minus severity-weighted findings, floored at 0
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
    },
  }
}

module.exports = { analyzeStripeRevenueLeaks, severityFor }
```

- [ ] **Step 2: Add the analyze handler to the controller**

Open `backend/src/controllers/stripeIntegrationController.js`. Add the import at the top:

```javascript
const { analyzeStripeRevenueLeaks } = require("../services/stripeRevenueLeakAnalysis")
```

Add this handler before the `module.exports` block:

```javascript
// ---------------------------------------------------------------------------
// Handler: analyzeStripeCostLeaks
// Duplicate-check, run aggregator, return findings (frontend persists via
// /api/analysis-history, matching the GitHub/Zoom pattern).
// ---------------------------------------------------------------------------
async function analyzeStripeCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/stripe/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-run validate first." })
  }

  // Parse lookback (30 / 90 / 180 days, default 90)
  const startDate = req.body?.startDate ? new Date(req.body.startDate) : null
  const endDate = req.body?.endDate ? new Date(req.body.endDate) : null
  let lookbackDays = 90
  if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    lookbackDays = Math.max(1, Math.round((endDate - startDate) / 86400000))
  }
  if (![30, 90, 180].includes(lookbackDays)) {
    // Snap to nearest allowed value
    lookbackDays = lookbackDays <= 60 ? 30 : lookbackDays <= 135 ? 90 : 180
  }

  // Duplicate-check: same integration within 5 minutes -> 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", STRIPE_PROVIDER)
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
    const restrictedKey = decryptStripeKey(integration.settings)
    const stripe = makeClient(restrictedKey)
    const result = await analyzeStripeRevenueLeaks({ stripe, lookbackDays })
    return res.json({
      summary: result.summary,
      findings: result.findings,
      warnings: result.warnings,
      parameters: { lookbackDays },
    })
  } catch (e) {
    const mapped = mapStripeError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}
```

Update the `module.exports` block to include `analyzeStripeCostLeaks: analyzeStripeCostLeaksHandler`.

- [ ] **Step 3: Wire the route**

Open `backend/src/routes/index.js`. Update the destructure:

```javascript
const {
  validateStripe,
  getStripeStatus,
  disconnectStripe,
  getStripeAccount,
  getStripeSubscriptions,
  getStripeInvoices,
  getStripeDisputes,
  analyzeStripeCostLeaks,
} = require("../controllers/stripeIntegrationController")
```

Add the route in the Stripe block:

```javascript
router.post(  "/api/integrations/stripe/cost-leaks",   requireAuth, requireRole("owner", "editor"),           analyzeStripeCostLeaks)
```

- [ ] **Step 4: End-to-end manual test**

Boot the backend, then with a connected test-mode integration:

```bash
TOKEN="your-jwt"
curl -s -X POST http://localhost:4000/api/integrations/stripe/cost-leaks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-01-29","endDate":"2026-04-29"}' | jq
```

Expected: JSON with `summary`, `findings`, `warnings`, `parameters`. On a fresh test account: `findings: []`, `summary.totalFindings: 0`, `summary.healthScore: 100`.

Seed at least one failed invoice with the Stripe CLI:

```bash
stripe trigger invoice.payment_failed
```

Re-run the curl. Expected: at least one finding under `failed_payment_recovery` (if the invoice is still in `open` status with `attempt_count >= 1`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/stripeRevenueLeakAnalysis.js backend/src/controllers/stripeIntegrationController.js backend/src/routes/index.js
git commit -m "feat(stripe): aggregator + /cost-leaks endpoint with 4 V1 checks"
```

---

## Task 15: Update tool-analysis-reference doc

**Files:**
- Modify: `docs/tool-analysis-reference.md`

- [ ] **Step 1: Add Stripe to the doc**

Open `docs/tool-analysis-reference.md`. Insert a new section after the GitHub section, before the "Usage-Summary Tools" heading:

```markdown
### Stripe — Revenue recovery

Analysis: [stripeRevenueLeakAnalysis.js](../backend/src/services/stripeRevenueLeakAnalysis.js)
Data source: Stripe API — invoices, subscriptions, customers/payment methods, disputes.

Checks (V1, recovery-only):
- **Failed payment recovery** — open invoices with `attempt_count ≥ 1`; recoverable estimate = 65% of total at risk (B2B SaaS dunning benchmark). Severity by total $ per currency.
- **Card-expiry preventable churn** — active subscriptions whose default payment method is a card expiring in the next 60 days. Potential loss = monthly-normalized MRR per customer.
- **Past-due subscriptions** — `status = past_due` or `status = unpaid`. Severity by MRR.
- **Disputes / chargebacks** — `disputes.list` over the lookback window. Loss = dispute amount + approximate $15/dispute Stripe fee.

Severity ladder: ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — same as AWS/Azure/GCP.
Lookback: user-selectable 30 / 90 / 180 days, default 90.
```

Also append `Stripe | Cost-leak | failed payment recovery, card-expiry churn, past-due subs, disputes |` to the quick-reference table.

- [ ] **Step 2: Commit**

```bash
git add docs/tool-analysis-reference.md
git commit -m "docs: add Stripe to tool-analysis reference"
```

---

## Task 16: End-to-end browser verification

This is verification only. No new files.

- [ ] **Step 1: Seed a fuller test data set**

Use Stripe CLI fixtures or the Stripe Dashboard test-mode tools to create:
- 5+ failed invoices (`stripe trigger invoice.payment_failed` repeatedly)
- 2 active customers with cards expiring in <30 days (use Stripe Dashboard → Customers → Add card with manual exp date)
- 1 subscription forced into `past_due` (advance the test clock, or use `stripe trigger invoice.payment_failed` enough times that the subscription transitions)
- 2 disputes (`stripe trigger charge.dispute.created`)

- [ ] **Step 2: Run the analysis from the dashboard**

Open the Stripe tool detail page → Analysis tab → choose 90 days → click Run Analysis.

Expected:
- Loading state shows briefly
- Findings list renders with at least one finding from each check that has data
- Severity badges colored correctly per the ladder
- Total potential recovery shown in the summary card

- [ ] **Step 3: Verify the run is persisted to History**

Click the History tab. Expected: the run appears with timestamp, total findings count, total potential savings/recovery.

- [ ] **Step 4: Verify error path — bad key**

In Supabase, manually corrupt `restricted_key_encrypted` for the test integration (set it to `"garbage"`). Re-run the analysis from the dashboard. Expected: error toast saying "Stripe credentials invalid" or similar; no analysis written to History.

Restore the integration by disconnecting and reconnecting in the UI.

- [ ] **Step 5: Verify the type checker is clean**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no Stripe-related errors.

- [ ] **Step 6: No commit (verification-only)**

---

## Self-review checklist

After completing all 16 tasks:

- All 16 tools should appear in the dashboard's tool list (Stripe being the new one)
- A connected Stripe integration's detail page renders without errors
- The Analysis tab shows findings, severity badges, and a summary card
- The History tab shows past runs
- Disconnect cleanly removes the encrypted key and flips status

## Out of scope reminders (DO NOT implement)

These are deliberately deferred from V1 and listed in the design spec. Don't build them as part of this plan:

- Pricing-hygiene checks (stale prices, idle products, pricing drift, monthly→annual upsells, coupon overuse)
- Fee/compliance checks (effective fee %, EU tax IDs, 3DS/SCA, webhook health)
- Stripe Connect OAuth as an alternative auth path
- Multi-currency FX conversion
- Background scheduled syncs
- Recoverability decay scoring per finding
- Trend-over-time deltas

If you find yourself reaching for these, stop — they belong in a future V2 plan.
