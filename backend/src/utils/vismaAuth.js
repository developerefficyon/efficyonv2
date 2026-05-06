/**
 * Visma eAccounting Auth Utility (per-customer OAuth 2.0).
 *
 * Customer registers an integration in the Visma Developer self-service portal
 * (https://selfservice.developer.vismaonline.com/) and pastes Client ID +
 * Secret on the connect form. We do the standard authorization-code flow:
 *   - Authorize:  https://identity.vismaonline.com/connect/authorize
 *   - Token:      https://identity.vismaonline.com/connect/token
 *   - Revoke:     https://identity.vismaonline.com/connect/revocation
 *
 * Token exchange uses HTTP Basic auth (base64(clientId:clientSecret)) and an
 * application/x-www-form-urlencoded body. PKCE is NOT required.
 *
 * Access tokens expire in 1 hour. Refresh tokens are valid 2 years (and
 * rotate — every refresh returns a new refresh_token that must be persisted).
 *
 * Scopes for read-only cost-leak analysis:
 *   ea:api offline_access ea:sales_readonly ea:accounting_readonly ea:purchase_readonly
 *
 * REST API base host: https://eaccountingapi.vismaonline.com/v2
 *   (sandbox host: https://eaccountingapi-sandbox.vismaonline.com/v2)
 */

const { encrypt, decrypt } = require("./encryption")

const VISMA_AUTH_HOST = "https://identity.vismaonline.com"
const VISMA_API_HOST = process.env.VISMA_API_HOST || "https://eaccountingapi.vismaonline.com/v2"
const FULL_SCOPES = [
  "ea:api",
  "offline_access",
  "ea:sales_readonly",
  "ea:accounting_readonly",
  "ea:purchase_readonly",
]
const REFRESH_BUFFER_MS = 5 * 60 * 1000

// In-process token cache keyed by integration id. Keeps requests within a
// single hot worker from refreshing repeatedly.
const tokenCache = new Map() // integrationId -> { access_token, expiresAt }

// Per-integration refresh locks to prevent concurrent refresh races.
const tokenRefreshLocks = new Map() // integrationId -> Promise<string>

// Per-token rate-limit tracker. Visma's documented limit is 200 req/min per
// access token; we throttle to 100 req/min for safety.
const rateBuckets = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 100

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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Visma OAuth credentials")
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
// State encoding
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
// Visma uses HTTP Basic auth header + form-encoded body.
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(`${VISMA_AUTH_HOST}/connect/token`, {
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
    err.vismaError = json.error
    throw err
  }
  return json
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
  const res = await fetch(`${VISMA_AUTH_HOST}/connect/token`, {
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
    err.vismaError = json.error
    throw err
  }
  return json
}

async function revokeToken({ clientId, clientSecret, token, tokenTypeHint = "refresh_token" }) {
  if (!token) return
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    const body = new URLSearchParams({ token, token_type_hint: tokenTypeHint })
    await fetch(`${VISMA_AUTH_HOST}/connect/revocation`, {
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

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// persistRefreshedTokens — write rotated tokens back to Supabase.
// Called from inside the refresh lock so subsequent reads see the new tokens.
// ---------------------------------------------------------------------------
async function persistRefreshedTokens({ supabase, integration, tokenResponse }) {
  const expiresIn = tokenResponse.expires_in || 3600
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
  const encrypted = encryptTokens({
    access_token: tokenResponse.access_token,
    // Visma rotates the refresh token on every refresh — fall back to existing
    // if the response (defensively) omits it.
    refresh_token: tokenResponse.refresh_token,
  })
  // Preserve any existing access/refresh fields we may not be overwriting.
  const settings = integration.settings || {}
  const newSettings = {
    ...settings,
    ...encrypted,
    access_token_expires_at: expiresAt,
    granted_scopes: tokenResponse.scope || settings.granted_scopes || null,
  }
  if (!tokenResponse.refresh_token && settings.refresh_token_encrypted) {
    // Keep the prior refresh_token_encrypted untouched.
    newSettings.refresh_token_encrypted = settings.refresh_token_encrypted
  }
  const { error } = await supabase
    .from("company_integrations")
    .update({ settings: newSettings })
    .eq("id", integration.id)
  if (error) {
    // Don't throw — the new access token is still usable in memory for this
    // request. The caller will retry next time with stale settings.
    return { persisted: false, error }
  }
  return { persisted: true, settings: newSettings, expiresAt }
}

// ---------------------------------------------------------------------------
// getAccessToken — concurrency-safe accessor.
//
// Behaviour mirrors the Fortnox controller's refreshTokenIfNeeded:
//   - If integration.status === "expired" → fail fast.
//   - If a refresh is already in flight for this integration → await it.
//   - If cached token is fresh → return it.
//   - Otherwise refresh under a per-integration lock, persist rotated tokens,
//     and update the in-process cache.
// ---------------------------------------------------------------------------
async function getAccessToken({ supabase, integration }) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")
  const integrationId = integration.id

  if (integration.status === "expired") {
    const err = typedError("TOKEN_EXPIRED", "Token expired. Please reconnect your Visma integration.")
    err.requiresReconnect = true
    throw err
  }

  const cached = tokenCache.get(integrationId)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token

  // Wait for an in-flight refresh if there is one
  if (tokenRefreshLocks.has(integrationId)) {
    try {
      return await tokenRefreshLocks.get(integrationId)
    } catch (_) {
      // fall through and start a fresh refresh attempt
    }
  }

  const settings = integration.settings || {}
  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(settings))
  } catch (e) {
    evictToken(integrationId)
    throw e
  }
  const { refresh_token } = decryptTokens(settings)
  if (!refresh_token) {
    evictToken(integrationId)
    throw typedError("REFRESH_TOKEN_MISSING", "No refresh token stored — please reconnect")
  }

  const refreshPromise = (async () => {
    let result
    try {
      result = await refreshAccessToken({ clientId, clientSecret, refreshToken: refresh_token })
    } catch (e) {
      // Mark integration expired on hard refresh failure so subsequent calls
      // fail fast rather than hammering the OAuth endpoint.
      if (e.code === "OAUTH_REFRESH_FAILED" && (e.vismaError === "invalid_grant" || e.vismaError === "invalid_token")) {
        try {
          await supabase
            .from("company_integrations")
            .update({ status: "expired" })
            .eq("id", integrationId)
        } catch (_) { /* ignore */ }
        const err = typedError("TOKEN_EXPIRED", "Token expired. Please reconnect your Visma integration.")
        err.requiresReconnect = true
        throw err
      }
      throw e
    }
    if (!result.access_token) throw typedError("OAUTH_REFRESH_FAILED", "Refresh response missing access_token")
    await persistRefreshedTokens({ supabase, integration, tokenResponse: result })
    const expiresIn = result.expires_in || 3600
    const expiresAt = Date.now() + expiresIn * 1000
    tokenCache.set(integrationId, { access_token: result.access_token, expiresAt })
    return result.access_token
  })()

  tokenRefreshLocks.set(integrationId, refreshPromise)
  try {
    return await refreshPromise
  } finally {
    tokenRefreshLocks.delete(integrationId)
  }
}

// ---------------------------------------------------------------------------
// Rate-limit helper. Returns true if the call should proceed.
// ---------------------------------------------------------------------------
function checkRateLimit(accessToken) {
  const now = Date.now()
  const bucket = rateBuckets.get(accessToken)
  if (!bucket || now > bucket.resetAt) {
    // Garbage-collect stale buckets so the map doesn't grow unbounded.
    for (const [k, v] of rateBuckets) {
      if (now > v.resetAt) rateBuckets.delete(k)
    }
    rateBuckets.set(accessToken, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true, remaining: RATE_MAX - 1 }
  }
  if (bucket.count >= RATE_MAX) {
    const waitMs = bucket.resetAt - now
    return { allowed: false, remaining: 0, waitMs, message: `Rate limit reached — retry in ${Math.ceil(waitMs / 1000)}s` }
  }
  bucket.count++
  return { allowed: true, remaining: RATE_MAX - bucket.count }
}

// ---------------------------------------------------------------------------
// Authenticated REST request against Visma eAccounting.
// ---------------------------------------------------------------------------
async function vismaRequest({ supabase, integration, path, init = {} }) {
  const accessToken = await getAccessToken({ supabase, integration })

  const rl = checkRateLimit(accessToken)
  if (!rl.allowed) {
    const err = typedError("RATE_LIMITED", rl.message)
    err.httpStatus = 429
    err.waitMs = rl.waitMs
    throw err
  }

  const url = path.startsWith("http") ? path : `${VISMA_API_HOST}${path}`
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
    // 401 → token may have been revoked between cache hit and the call. Evict
    // the cache entry so the next call refreshes.
    if (res.status === 401) evictToken(integration.id)
    const errMsg =
      body?.Message ||
      body?.error_description ||
      body?.error ||
      body?.DeveloperErrorMessage ||
      (Array.isArray(body?.errors) && body.errors[0]?.message) ||
      `HTTP ${res.status}`
    const err = typedError("VISMA_REQUEST_FAILED", typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg))
    err.httpStatus = res.status
    err.vismaBody = body
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Paginated list helper — eAccounting v2 uses $skip / $top with a Meta
// envelope ({ Meta: { TotalNumberOfPages, CurrentPage }, Data: [...] }).
// Some endpoints return a flat array. We tolerate both shapes.
// ---------------------------------------------------------------------------
async function vismaPaginatedList({ supabase, integration, basePath, query = {}, top = 200, cap = 5000, dataKey = "Data" }) {
  const out = []
  let skip = 0
  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams({ ...query })
    params.set("$top", String(top))
    params.set("$skip", String(skip))
    const sep = basePath.includes("?") ? "&" : "?"
    const path = `${basePath}${sep}${params.toString()}`
    const body = await vismaRequest({ supabase, integration, path })
    const records = Array.isArray(body) ? body : Array.isArray(body?.[dataKey]) ? body[dataKey] : []
    out.push(...records)
    if (out.length >= cap) return out.slice(0, cap)
    if (records.length < top) break // no more pages
    skip += top
    // Brief delay between pages to stay friendly with the rate limit.
    await new Promise((r) => setTimeout(r, 150))
  }
  return out
}

// ---------------------------------------------------------------------------
// Company info — used to detect home currency and display the company name.
// ---------------------------------------------------------------------------
async function fetchCompanySettings({ supabase, integration }) {
  return vismaRequest({ supabase, integration, path: "/companysettings" })
}

module.exports = {
  VISMA_AUTH_HOST,
  VISMA_API_HOST,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  getAccessToken,
  evictToken,
  vismaRequest,
  vismaPaginatedList,
  fetchCompanySettings,
  checkRateLimit,
  persistRefreshedTokens,
}
