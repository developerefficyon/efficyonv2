/**
 * monday.com Auth Utility (per-customer OAuth 2.0 / 3LO).
 *
 * Customer creates an OAuth app in the monday.com developer center, pastes
 * Client ID + Secret + per-seat cost in the connect form. We do the standard
 * authorization-code flow:
 *   - Authorize URL: https://auth.monday.com/oauth2/authorize
 *   - Token URL:     https://auth.monday.com/oauth2/token  (form-encoded body)
 *
 * monday.com OAuth tokens default to long-lived (no expiry) but if the app is
 * configured for refresh tokens, tokens carry expires_in and rotate via the
 * refresh flow. We support both shapes.
 *
 * API host: https://api.monday.com/v2 (GraphQL only)
 */

const { encrypt, decrypt } = require("./encryption")

const MONDAY_AUTH_HOST = "https://auth.monday.com"
const MONDAY_API_URL = "https://api.monday.com/v2"
const FULL_SCOPES = [
  "me:read",
  "users:read",
  "account:read",
  "boards:read",
  "updates:read",
]
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt monday.com OAuth credentials")
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
// State encoding (matches Linear / Notion / Atlassian pattern)
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
// monday.com uses application/x-www-form-urlencoded body (NOT JSON, unlike Atlassian).
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(`${MONDAY_AUTH_HOST}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.mondayError = json.error
    throw err
  }
  return json // { access_token, refresh_token?, expires_in?, token_type, scope? }
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  const res = await fetch(`${MONDAY_AUTH_HOST}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.mondayError = json.error
    throw err
  }
  return json
}

// ---------------------------------------------------------------------------
// Get a valid access token (refresh if needed)
//
// monday.com tokens may be long-lived (no expires_in) when the OAuth app is
// configured without refresh tokens. We treat missing expires_in as "valid
// until 401" and short-circuit refresh until the API rejects.
// ---------------------------------------------------------------------------
async function getAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached) {
    if (cached.expiresAt === Infinity) return cached.access_token
    if (cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token
  }

  const settings = integration.settings || {}
  const { access_token, refresh_token } = decryptTokens(settings)

  // No refresh token → long-lived flow. Use stored access_token directly.
  if (!refresh_token) {
    if (!access_token) {
      evictToken(integration.id)
      throw typedError("ACCESS_TOKEN_MISSING", "No access token stored — please reconnect")
    }
    tokenCache.set(integration.id, { access_token, expiresAt: Infinity })
    return access_token
  }

  // Refresh-token flow.
  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(settings))
  } catch (e) {
    evictToken(integration.id)
    throw e
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
// GraphQL helper — single POST to api.monday.com/v2
// ---------------------------------------------------------------------------
async function mondayQuery(integration, query, variables = {}) {
  const accessToken = await getAccessToken(integration)
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }

  if (!res.ok) {
    const err = typedError("MONDAY_REQUEST_FAILED", body?.errors?.[0]?.message || body?.error_message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.mondayBody = body
    throw err
  }
  // monday returns 200 with errors[] for GraphQL-level failures (e.g. complexity, scope).
  if (Array.isArray(body?.errors) && body.errors.length) {
    const first = body.errors[0]
    const code = first?.extensions?.code || "MONDAY_GRAPHQL_ERROR"
    const err = typedError(code, first?.message || "monday GraphQL error")
    err.httpStatus = code === "ComplexityException" ? 429 : 400
    err.mondayBody = body
    throw err
  }
  return body.data
}

// ---------------------------------------------------------------------------
// Directory pull — single GraphQL request returning users + account/plan.
// Cap at 1000 users for V1.
// ---------------------------------------------------------------------------
const DIRECTORY_QUERY = `
  query MondayDirectory {
    users(limit: 1000) {
      id
      name
      email
      enabled
      is_pending
      is_view_only
      is_guest
      is_admin
      last_activity
      join_date
    }
    account {
      id
      name
      slug
      plan {
        max_users
        tier
        version
        period
      }
    }
  }
`

async function fetchUsersAndPlan(integration) {
  const data = await mondayQuery(integration, DIRECTORY_QUERY)
  const rawUsers = Array.isArray(data?.users) ? data.users : []
  const rawAccount = data?.account ?? null
  return {
    users: rawUsers.map(mapDirectoryUser),
    account: mapAccount(rawAccount),
  }
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------
function mapDirectoryUser(raw) {
  return {
    id: String(raw.id ?? ""),
    name: raw.name || null,
    email: raw.email || null,
    enabled: !!raw.enabled,
    isPending: !!raw.is_pending,
    isViewOnly: !!raw.is_view_only,
    isGuest: !!raw.is_guest,
    isAdmin: !!raw.is_admin,
    lastActivity: raw.last_activity || null,
    joinDate: raw.join_date || null,
  }
}

function mapAccount(raw) {
  if (!raw) return null
  const plan = raw.plan || {}
  return {
    id: raw.id ? String(raw.id) : null,
    name: raw.name || null,
    slug: raw.slug || null,
    plan: {
      maxUsers: plan.max_users != null ? Number(plan.max_users) : null,
      tier: typeof plan.tier === "string" ? plan.tier.toLowerCase() : null, // free|basic|standard|pro|enterprise
      version: plan.version || null,
      period: plan.period || null,
    },
  }
}

module.exports = {
  MONDAY_AUTH_HOST,
  MONDAY_API_URL,
  FULL_SCOPES,
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
  mondayQuery,
  fetchUsersAndPlan,
  mapDirectoryUser,
  mapAccount,
}
