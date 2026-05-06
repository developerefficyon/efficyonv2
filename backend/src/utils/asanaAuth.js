/**
 * Asana Auth Utility (per-customer OAuth 2.0 / 3LO).
 *
 * Customer creates an OAuth 2.0 app in the Asana Developer Console
 * (https://app.asana.com/0/my-apps) and pastes Client ID + Secret + per-seat
 * cost in the connect form. We do the standard authorization-code flow:
 *   - Authorize URL: https://app.asana.com/-/oauth_authorize
 *   - Token URL:     https://app.asana.com/-/oauth_token  (form-encoded body)
 *
 * Asana access tokens expire in ~1 hour; refresh tokens are long-lived. We
 * refresh on demand using the cached refresh token. In-process token cache
 * avoids repeated refresh calls.
 *
 * REST API host: https://app.asana.com/api/1.0
 */

const { encrypt, decrypt } = require("./encryption")

const ASANA_AUTH_HOST = "https://app.asana.com"
const ASANA_API_HOST = "https://app.asana.com/api/1.0"
const FULL_SCOPES = ["default"] // Asana's broad read+write scope; we only read
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Asana OAuth credentials")
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
// State encoding (matches Linear / Notion / Atlassian / monday pattern)
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
// Asana uses application/x-www-form-urlencoded body (NOT JSON).
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(`${ASANA_AUTH_HOST}/-/oauth_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.asanaError = json.error
    throw err
  }
  // { access_token, refresh_token, expires_in, token_type, data: { gid, email, name } }
  return json
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
  const res = await fetch(`${ASANA_AUTH_HOST}/-/oauth_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", json.error_description || json.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.asanaError = json.error
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
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
    })
    await fetch(`${ASANA_AUTH_HOST}/-/oauth_revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
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
  const expiresIn = result.expires_in || 3600
  const expiresAt = Date.now() + expiresIn * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// Authenticated REST request against app.asana.com/api/1.0
// ---------------------------------------------------------------------------
async function asanaRequest(integration, path, init = {}) {
  const accessToken = await getAccessToken(integration)
  const url = path.startsWith("http") ? path : `${ASANA_API_HOST}${path}`
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
      body?.errors?.[0]?.message ||
      body?.error_description ||
      body?.error ||
      body?.message ||
      `HTTP ${res.status}`
    const err = typedError("ASANA_REQUEST_FAILED", errMsg)
    err.httpStatus = res.status
    err.asanaBody = body
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// /users/me — connecting user + their workspaces (used to pick a workspace)
// ---------------------------------------------------------------------------
async function fetchMe(integration) {
  const data = await asanaRequest(
    integration,
    "/users/me?opt_fields=gid,name,email,workspaces.gid,workspaces.name,workspaces.is_organization,workspaces.email_domains",
  )
  const me = data?.data || null
  if (!me) throw typedError("ASANA_ME_FAILED", "Asana /users/me returned no data")
  return {
    gid: me.gid || null,
    name: me.name || null,
    email: me.email || null,
    workspaces: Array.isArray(me.workspaces)
      ? me.workspaces.map((w) => ({
          gid: w.gid,
          name: w.name || null,
          isOrganization: !!w.is_organization,
          emailDomains: Array.isArray(w.email_domains) ? w.email_domains : [],
        }))
      : [],
  }
}

// ---------------------------------------------------------------------------
// pickWorkspace — choose the workspace this integration analyzes.
//
// Preference order:
//   1. integration.settings.workspace_gid (sticky after first connect)
//   2. First workspace where is_organization=true
//   3. First workspace returned
// ---------------------------------------------------------------------------
function pickWorkspace(workspaces, preferredGid) {
  if (!Array.isArray(workspaces) || workspaces.length === 0) return null
  if (preferredGid) {
    const match = workspaces.find((w) => String(w.gid) === String(preferredGid))
    if (match) return match
  }
  const org = workspaces.find((w) => w.isOrganization)
  return org || workspaces[0]
}

// ---------------------------------------------------------------------------
// Workspace memberships (paginated). Returns mapped users.
//
// API: GET /workspace_memberships?workspace={gid}&opt_fields=...&limit=100
// Response: { data: [...], next_page: { offset, path, uri } | null }
// ---------------------------------------------------------------------------
async function listWorkspaceMembers(integration, workspaceGid, { cap = 2000 } = {}) {
  if (!workspaceGid) throw typedError("WORKSPACE_MISSING", "workspaceGid is required")

  const out = []
  const optFields = [
    "user.gid",
    "user.name",
    "user.email",
    "is_active",
    "is_admin",
    "is_guest",
    "created_at",
    "vacation_dates",
  ].join(",")

  let path = `/workspace_memberships?workspace=${encodeURIComponent(workspaceGid)}&limit=100&opt_fields=${encodeURIComponent(optFields)}`
  for (let i = 0; i < 50; i++) {
    const data = await asanaRequest(integration, path)
    const records = Array.isArray(data?.data) ? data.data : []
    for (const raw of records) {
      out.push(mapWorkspaceMember(raw))
      if (out.length >= cap) return out
    }
    const next = data?.next_page
    if (!next || !next.offset) break
    path = `/workspace_memberships?workspace=${encodeURIComponent(workspaceGid)}&limit=100&offset=${encodeURIComponent(next.offset)}&opt_fields=${encodeURIComponent(optFields)}`
  }
  return out
}

// ---------------------------------------------------------------------------
// Per-user activity probe — used by the inactive_user check.
//
// Returns the most recent ISO modification timestamp across the user's
// recently-modified tasks in the workspace, or null if the user has no
// recently-modified tasks within the lookback window.
//
// API: GET /tasks?assignee={user_gid}&workspace={workspace_gid}&modified_since={iso}&limit=1&opt_fields=modified_at
// ---------------------------------------------------------------------------
async function fetchUserLastActivity(integration, { workspaceGid, userGid, sinceIso }) {
  if (!workspaceGid || !userGid) return null
  const params = new URLSearchParams({
    assignee: String(userGid),
    workspace: String(workspaceGid),
    limit: "1",
    opt_fields: "modified_at",
  })
  if (sinceIso) params.set("modified_since", sinceIso)
  try {
    const data = await asanaRequest(integration, `/tasks?${params.toString()}`)
    const records = Array.isArray(data?.data) ? data.data : []
    if (records.length === 0) return null
    return records[0]?.modified_at || null
  } catch (e) {
    // Don't fail the whole analysis on a single per-user 403/429 — return null.
    if (e.httpStatus === 403 || e.httpStatus === 401) return null
    throw e
  }
}

// ---------------------------------------------------------------------------
// Directory pull — fetch workspace + members in one call.
// ---------------------------------------------------------------------------
async function fetchUsersAndWorkspace(integration) {
  const settings = integration.settings || {}
  const me = await fetchMe(integration)
  const workspace = pickWorkspace(me.workspaces, settings.workspace_gid)
  if (!workspace) {
    throw typedError("ASANA_NO_WORKSPACE", "No Asana workspace is accessible to this user.")
  }
  const users = await listWorkspaceMembers(integration, workspace.gid)
  return { me, workspace, users }
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------
function mapWorkspaceMember(raw) {
  const u = raw?.user || {}
  return {
    membershipGid: raw?.gid ? String(raw.gid) : null,
    id: u.gid ? String(u.gid) : null,
    name: u.name || null,
    email: u.email || null,
    isActive: raw?.is_active !== false, // default true if omitted
    isAdmin: !!raw?.is_admin,
    isGuest: !!raw?.is_guest,
    createdAt: raw?.created_at || null,
    vacationDates: raw?.vacation_dates || null,
  }
}

module.exports = {
  ASANA_AUTH_HOST,
  ASANA_API_HOST,
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
  asanaRequest,
  fetchMe,
  pickWorkspace,
  listWorkspaceMembers,
  fetchUserLastActivity,
  fetchUsersAndWorkspace,
  mapWorkspaceMember,
}
