/**
 * Atlassian Auth Utility (per-customer OAuth 2.0 / 3LO).
 *
 * Customer creates an OAuth 2.0 integration in the Atlassian Developer Console
 * and grants the four required scopes (read:jira-user, read:confluence-user.summary,
 * read:account, read:directory:admin-atlassian). We do the standard
 * authorization-code flow:
 *   - Authorize URL: https://auth.atlassian.com/authorize
 *   - Token URL:     https://auth.atlassian.com/oauth/token  (JSON body)
 *
 * Atlassian access tokens expire in ~1 hour. We refresh on demand using the
 * cached refresh token. In-process token cache avoids repeated refresh calls.
 *
 * REST hosts:
 *   - Accessible resources / admin / jira / confluence: https://api.atlassian.com
 */

const { encrypt, decrypt } = require("./encryption")

const ATLASSIAN_AUTH_HOST = "https://auth.atlassian.com"
const ATLASSIAN_API_HOST = "https://api.atlassian.com"
const REQUIRED_SCOPE = "read:directory:admin-atlassian"
const FULL_SCOPES = [
  "read:jira-user",
  "read:confluence-user.summary",
  "read:account",
  "read:directory:admin-atlassian",
  "offline_access",
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Atlassian OAuth credentials")
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
// State encoding (matches Linear / Notion / Salesforce pattern)
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
// OAuth code → tokens exchange (JSON body — Atlassian-specific)
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const res = await fetch(`${ATLASSIAN_AUTH_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.atlassianError = body.error
    throw err
  }
  return body // { access_token, refresh_token, expires_in, token_type, scope }
}

// ---------------------------------------------------------------------------
// Refresh access token (JSON body)
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(`${ATLASSIAN_AUTH_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.atlassianError = body.error
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Token revoke (best-effort, called on disconnect)
// ---------------------------------------------------------------------------
async function revokeToken({ clientId, clientSecret, token }) {
  if (!token) return
  try {
    await fetch(`${ATLASSIAN_AUTH_HOST}/oauth/token/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, token }),
    })
  } catch (_) {
    // Best-effort; we already wipe local settings on disconnect
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
  const expiresIn = result.expires_in || 3600 // default 1h
  const expiresAt = Date.now() + expiresIn * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// Authenticated REST request against api.atlassian.com
// ---------------------------------------------------------------------------
async function atlassianRequest(integration, path, init = {}) {
  const accessToken = await getAccessToken(integration)
  const url = path.startsWith("http") ? path : `${ATLASSIAN_API_HOST}${path}`
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
    const err = typedError("ATLASSIAN_REQUEST_FAILED", body?.message || body?.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.atlassianBody = body
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Accessible resources (Cloud sites the OAuth user authorized)
// ---------------------------------------------------------------------------
async function listAccessibleResources(integration) {
  const data = await atlassianRequest(integration, "/oauth/token/accessible-resources")
  if (!Array.isArray(data)) return []
  return data.map((r) => ({
    cloudId: r.id,
    name: r.name,
    url: r.url,
    scopes: r.scopes || [],
    avatarUrl: r.avatarUrl || null,
  }))
}

// ---------------------------------------------------------------------------
// Org id discovery (one connection = first accessible org for V1)
// ---------------------------------------------------------------------------
async function findOrgId(integration) {
  const data = await atlassianRequest(integration, "/admin/v1/orgs")
  const orgs = Array.isArray(data?.data) ? data.data : []
  if (!orgs.length) {
    throw typedError("ATLASSIAN_NO_ORGS", "No Atlassian Cloud organization is accessible to this user. Org-admin permission is required.")
  }
  const first = orgs[0]
  return {
    orgId: first.id,
    orgName: first.attributes?.name || first.name || null,
  }
}

// ---------------------------------------------------------------------------
// Org Directory pull (paginated). Returns mapped users.
//
// Cap at 5000 users (pagination loop bounded for safety).
//
// API: GET /admin/v1/orgs/{orgId}/directory/users?cursor=...
// Response (verify in Task 7 — adjust mapDirectoryUser if shape differs):
//   { data: [ {account_id, account_status, name, email, product_access: [...]} ],
//     links: { next?: "...full url..." } }
// ---------------------------------------------------------------------------
async function listOrgDirectoryUsers(integration, orgId, { cap = 5000 } = {}) {
  if (!orgId) throw typedError("ORG_ID_MISSING", "orgId is required to list directory users")

  const out = []
  let path = `/admin/v1/orgs/${encodeURIComponent(orgId)}/directory/users`
  for (let i = 0; i < 50; i++) {
    const data = await atlassianRequest(integration, path)
    const records = Array.isArray(data?.data) ? data.data : []
    for (const raw of records) {
      out.push(mapDirectoryUser(raw))
      if (out.length >= cap) return out
    }
    const next = data?.links?.next
    if (!next) break
    // Some Atlassian APIs return absolute "next" URLs, some return relative.
    path = next
  }
  return out
}

// ---------------------------------------------------------------------------
// mapDirectoryUser — normalize Atlassian's directory-user record shape into
// the internal shape our checks consume. Centralizing here makes it easy to
// adjust if the live response differs from documented.
//
// Input fields we care about (snake_case in current Admin API):
//   account_id, account_status, account_type, name, email,
//   access_billable, last_active,
//   product_access: [{ id, key, name, url, last_active }, ...]
//
// Output:
//   { accountId, accountStatus, accountType, name, email, billable,
//     lastActive (ISO|null), products: { jira: { lastActive, name }|null,
//                                         confluence: { lastActive, name }|null,
//                                         other: [...] } }
// ---------------------------------------------------------------------------
function mapDirectoryUser(raw) {
  const accountId = raw.account_id || raw.accountId || null
  const accountStatus = raw.account_status || raw.accountStatus || "unknown"
  const accountType = raw.account_type || raw.accountType || "atlassian"
  const name = raw.name || raw.display_name || raw.displayName || null
  const email = raw.email || null
  const billable = !!(raw.access_billable ?? raw.accessBillable ?? false)
  const lastActive = raw.last_active || raw.lastActive || null

  const productAccess = Array.isArray(raw.product_access)
    ? raw.product_access
    : Array.isArray(raw.productAccess) ? raw.productAccess : []

  const products = { jira: null, confluence: null, other: [] }
  for (const p of productAccess) {
    if (!p || typeof p !== "object") continue
    const pid = (p.id || p.key || p.product || "").toLowerCase()
    const entry = {
      id: pid,
      name: p.name || pid,
      url: p.url || null,
      lastActive: p.last_active || p.lastActive || null,
    }
    if (pid === "jira-software" || pid === "jira" || pid.startsWith("jira-software")) {
      products.jira = entry
    } else if (pid === "confluence" || pid.startsWith("confluence")) {
      products.confluence = entry
    } else {
      products.other.push(entry)
    }
  }

  return {
    accountId,
    accountStatus,
    accountType,
    name,
    email,
    billable,
    lastActive,
    products,
  }
}

// ---------------------------------------------------------------------------
// Validate that the granted scope set includes the required org-admin scope
// ---------------------------------------------------------------------------
function hasOrgAdminScope(scopeString) {
  if (!scopeString) return false
  const scopes = scopeString.split(/[\s,]+/).filter(Boolean)
  return scopes.includes(REQUIRED_SCOPE)
}

module.exports = {
  ATLASSIAN_AUTH_HOST,
  ATLASSIAN_API_HOST,
  REQUIRED_SCOPE,
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
  atlassianRequest,
  listAccessibleResources,
  findOrgId,
  listOrgDirectoryUsers,
  mapDirectoryUser,
  hasOrgAdminScope,
}
