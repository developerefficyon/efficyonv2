/**
 * Linear Auth Utility (per-customer OAuth app + OAuth 2.0).
 *
 * Customer creates an OAuth application at Linear → Settings → API → OAuth
 * applications. We do the standard authorization-code flow:
 *   - Authorize URL: https://linear.app/oauth/authorize
 *   - Token URL:     https://api.linear.app/oauth/token (form-encoded)
 *
 * Linear access tokens expire in ~10 hours. We refresh on demand using the
 * cached refresh token. In-process token cache avoids repeated refresh calls.
 *
 * GraphQL endpoint: https://api.linear.app/graphql
 */

const { encrypt, decrypt } = require("./encryption")

const LINEAR_AUTHORIZE_HOST = "https://linear.app"
const LINEAR_API_HOST = "https://api.linear.app"
const LINEAR_GRAPHQL = `${LINEAR_API_HOST}/graphql`
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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Linear OAuth credentials")
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
// State encoding (matches QuickBooks / Salesforce / Notion pattern)
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
// OAuth code → tokens exchange (form-encoded body)
// ---------------------------------------------------------------------------
async function exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri }) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(`${LINEAR_API_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.linearError = body.error
    throw err
  }
  return body // { access_token, refresh_token, token_type, expires_in, scope }
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(`${LINEAR_API_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_REFRESH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.linearError = body.error
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Get a valid access token (refresh if needed)
// ---------------------------------------------------------------------------
async function getAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.access_token

  const settings = integration.settings || {}
  const { clientId, clientSecret } = decryptOAuthCreds(settings)
  const { refresh_token } = decryptTokens(settings)
  if (!refresh_token) throw typedError("REFRESH_TOKEN_MISSING", "No refresh token stored — please reconnect")

  const result = await refreshAccessToken({ clientId, clientSecret, refreshToken: refresh_token })
  const expiresIn = result.expires_in || 36000 // default 10h
  const expiresAt = Date.now() + expiresIn * 1000
  tokenCache.set(integration.id, { access_token: result.access_token, expiresAt })
  return result.access_token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

// ---------------------------------------------------------------------------
// Authenticated GraphQL request against api.linear.app
// ---------------------------------------------------------------------------
async function linearGraphQL(integration, query, variables = {}) {
  const accessToken = await getAccessToken(integration)
  const res = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("LINEAR_REQUEST_FAILED", body.errors?.[0]?.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    throw err
  }
  if (body.errors?.length) {
    const err = typedError("LINEAR_GRAPHQL_ERROR", body.errors[0].message)
    err.httpStatus = 400
    err.graphqlErrors = body.errors
    throw err
  }
  return body.data
}

// ---------------------------------------------------------------------------
// Paginated users pull (cursor-based, capped at 1000 users)
// ---------------------------------------------------------------------------
const USERS_QUERY = `
  query Users($after: String) {
    users(first: 250, after: $after, includeArchived: false) {
      nodes {
        id
        name
        displayName
        email
        active
        admin
        lastSeenAt
        createdAt
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

async function listAllUsers(integration, cap = 1000) {
  const out = []
  let after = null
  for (let i = 0; i < 5; i++) {
    const data = await linearGraphQL(integration, USERS_QUERY, { after })
    const nodes = data?.users?.nodes || []
    out.push(...nodes)
    if (out.length >= cap) return out.slice(0, cap)
    if (!data?.users?.pageInfo?.hasNextPage) break
    after = data.users.pageInfo.endCursor
  }
  return out
}

// ---------------------------------------------------------------------------
// Workspace (organization) metadata — captured at connect time
// ---------------------------------------------------------------------------
const WORKSPACE_QUERY = `
  query Workspace {
    organization {
      id
      name
      urlKey
      userCount
    }
    viewer { id email }
  }
`

async function fetchWorkspace(integration) {
  return linearGraphQL(integration, WORKSPACE_QUERY)
}

module.exports = {
  LINEAR_AUTHORIZE_HOST,
  LINEAR_API_HOST,
  LINEAR_GRAPHQL,
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
  linearGraphQL,
  listAllUsers,
  fetchWorkspace,
  USERS_QUERY,
  WORKSPACE_QUERY,
}
