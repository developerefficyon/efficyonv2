/**
 * Airtable Auth Utility (per-customer OAuth 2.0 + PKCE).
 *
 * Customer creates an OAuth integration in their Airtable Builder Hub
 * (https://airtable.com/create/oauth) and pastes Client ID + Secret + per-seat
 * cost in the connect form.
 *
 * Airtable specifics that differ from Asana / monday.com:
 *   - PKCE is REQUIRED. We generate a random code_verifier on /oauth/start,
 *     persist it (encrypted) in integration.settings._pkce_verifier_encrypted,
 *     and send it back on /callback when exchanging the code.
 *   - Token exchange uses HTTP Basic auth (Authorization: Basic
 *     base64(clientId:clientSecret)) and an application/x-www-form-urlencoded
 *     body containing code, redirect_uri, grant_type, code_verifier.
 *   - Access tokens expire in 60 min; refresh tokens are valid 60 days.
 *   - Scopes used (read-only): user.email:read schema.bases:read
 *
 * Hosts:
 *   - Authorize: https://airtable.com/oauth2/v1/authorize
 *   - Token:     https://airtable.com/oauth2/v1/token
 *   - API:       https://api.airtable.com/v0
 *
 * Member visibility caveat: without enterprise SCIM scopes, Airtable's public
 * API only returns the connecting user via /meta/whoami. Workspace member
 * listing is gated to Enterprise plans. Aggregator handles this by surfacing
 * checks that are still computable from customer-supplied seat data, plus a
 * warning about the visibility gap.
 */

const crypto = require("crypto")
const { encrypt, decrypt } = require("./encryption")

const AIRTABLE_AUTH_HOST = "https://airtable.com"
const AIRTABLE_API_HOST = "https://api.airtable.com/v0"
const FULL_SCOPES = ["user.email:read", "schema.bases:read"]
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Airtable OAuth credentials")
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
// PKCE — Airtable requires S256
// ---------------------------------------------------------------------------
function generatePkceVerifier() {
  // 64 random bytes → 86-char base64url string (well within the 43-128 spec).
  return crypto.randomBytes(64).toString("base64url")
}

function pkceChallenge(verifier) {
  return crypto.createHash("sha256").update(String(verifier)).digest("base64url")
}

function encryptPkceVerifier(verifier) {
  return { _pkce_verifier_encrypted: encrypt(String(verifier)) }
}

function decryptPkceVerifier(settings) {
  const v = settings?._pkce_verifier_encrypted
  if (!v) return null
  try {
    return decrypt(v)
  } catch (_) {
    return null
  }
}

// ---------------------------------------------------------------------------
// State encoding (matches Asana / Linear pattern)
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
// Airtable: HTTP Basic auth header + form-encoded body + code_verifier (PKCE).
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri, codeVerifier }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  })
  const res = await fetch(`${AIRTABLE_AUTH_HOST}/oauth2/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.airtableError = json.error
    throw err
  }
  // { access_token, refresh_token, token_type, scope, expires_in, refresh_expires_in }
  return json
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  })
  const res = await fetch(`${AIRTABLE_AUTH_HOST}/oauth2/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.airtableError = json.error
    throw err
  }
  return json
}

// ---------------------------------------------------------------------------
// Token revoke (best-effort, called on disconnect)
// ---------------------------------------------------------------------------
async function revokeToken({ clientId, clientSecret, token }) {
  if (!token) return
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    const body = new URLSearchParams({ token })
    await fetch(`${AIRTABLE_AUTH_HOST}/oauth2/v1/token/revoke`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })
  } catch (_) {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Get a valid access token (refresh if needed)
// ---------------------------------------------------------------------------
async function getAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token

  const settings = integration.settings || {}
  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(settings))
  } catch (e) {
    evictToken(integration.id)
    throw e
  }
  const { refresh_token } = decryptTokens(settings)
  if (!refresh_token) {
    evictToken(integration.id)
    throw typedError("REFRESH_TOKEN_MISSING", "No refresh token stored — please reconnect")
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
// Authenticated REST request against api.airtable.com/v0
// ---------------------------------------------------------------------------
async function airtableRequest(integration, path, init = {}) {
  const accessToken = await getAccessToken(integration)
  const url = path.startsWith("http") ? path : `${AIRTABLE_API_HOST}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }

  if (!res.ok) {
    const errMsg =
      body?.error?.message ||
      body?.error?.type ||
      body?.error ||
      body?.message ||
      `HTTP ${res.status}`
    const err = typedError("AIRTABLE_REQUEST_FAILED", typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg))
    err.httpStatus = res.status
    err.airtableBody = body
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// /meta/whoami — connecting user identity + granted scopes
// ---------------------------------------------------------------------------
async function fetchMe(integration) {
  const data = await airtableRequest(integration, "/meta/whoami")
  if (!data?.id) throw typedError("AIRTABLE_ME_FAILED", "Airtable /meta/whoami returned no data")
  return {
    id: String(data.id),
    email: data.email || null,
    scopes: Array.isArray(data.scopes) ? data.scopes : null,
  }
}

// ---------------------------------------------------------------------------
// /meta/bases — list bases visible to the connecting user (paginated).
// ---------------------------------------------------------------------------
async function listBases(integration, { cap = 1000 } = {}) {
  const out = []
  let offset = null
  for (let i = 0; i < 50; i++) {
    const path = offset ? `/meta/bases?offset=${encodeURIComponent(offset)}` : "/meta/bases"
    const data = await airtableRequest(integration, path)
    const bases = Array.isArray(data?.bases) ? data.bases : []
    for (const b of bases) {
      out.push({
        id: b.id ? String(b.id) : null,
        name: b.name || null,
        permissionLevel: b.permissionLevel || null, // none | read | comment | edit | create
      })
      if (out.length >= cap) return out
    }
    if (!data?.offset) break
    offset = data.offset
  }
  return out
}

// ---------------------------------------------------------------------------
// Synthesize a single-user "directory" from /meta/whoami.
//
// Without enterprise SCIM scopes Airtable's public API does not expose other
// workspace members. The aggregator treats the connecting user as the only
// observable member and emits a visibility warning. Customer-supplied
// `subscribed_seats` and `active_seats` drive the seat-based checks.
// ---------------------------------------------------------------------------
async function fetchUsersAndWorkspace(integration) {
  const settings = integration.settings || {}
  const me = await fetchMe(integration)
  const bases = await listBases(integration).catch(() => [])

  const primaryDomain = me.email && me.email.includes("@")
    ? me.email.slice(me.email.lastIndexOf("@") + 1).toLowerCase()
    : null

  const users = [
    {
      id: me.id,
      email: me.email,
      name: me.email || null,
      isActive: true,
      isAdmin: true, // connecting user; treated as admin for display
      isGuest: false,
      createdAt: null,
      domain: primaryDomain,
    },
  ]

  const workspace = {
    id: settings.workspace_id || me.id,
    name: settings.workspace_name || (primaryDomain ? `${primaryDomain} workspace` : "Airtable workspace"),
    primaryDomain,
    baseCount: bases.length,
    bases,
    grantedScopes: me.scopes,
  }

  return { me, workspace, users }
}

module.exports = {
  AIRTABLE_AUTH_HOST,
  AIRTABLE_API_HOST,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  generatePkceVerifier,
  pkceChallenge,
  encryptPkceVerifier,
  decryptPkceVerifier,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  getAccessToken,
  evictToken,
  airtableRequest,
  fetchMe,
  listBases,
  fetchUsersAndWorkspace,
}
