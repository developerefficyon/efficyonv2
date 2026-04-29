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
