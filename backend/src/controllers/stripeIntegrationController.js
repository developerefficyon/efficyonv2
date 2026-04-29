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
