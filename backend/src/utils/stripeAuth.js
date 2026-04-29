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
