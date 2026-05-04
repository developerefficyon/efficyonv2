/**
 * Notion Auth Utility (per-customer public integration + OAuth 2.0).
 *
 * Customer creates a public OAuth integration at notion.so/my-integrations,
 * gives us Client ID + Secret. We do the standard authorization-code dance
 * via api.notion.com. Notion access tokens DO NOT expire — there's no
 * refresh logic. We persist the encrypted token and reuse it on every call.
 *
 * One quirk vs Salesforce: Notion's token endpoint requires HTTP Basic auth
 * (Authorization: Basic base64(clientId:clientSecret)) with a JSON body.
 */

const { encrypt, decrypt } = require("./encryption")

const NOTION_API_BASE = "https://api.notion.com"
const NOTION_VERSION = "2022-06-28"

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
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Notion OAuth credentials")
  }
  return { clientId, clientSecret }
}

function encryptAccessToken(accessToken) {
  if (!accessToken) throw typedError("TOKEN_MISSING", "accessToken is required")
  return { access_token_encrypted: encrypt(accessToken) }
}

function decryptAccessToken(settings) {
  const token = settings?.access_token_encrypted ? decrypt(settings.access_token_encrypted) : null
  if (!token) throw typedError("TOKEN_DECRYPT_FAILED", "No Notion access token stored — please reconnect")
  return token
}

// ---------------------------------------------------------------------------
// State encoding (matches QuickBooks / Salesforce pattern — base64 JSON)
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
// OAuth code → token exchange (HTTP Basic auth, JSON body)
// ---------------------------------------------------------------------------
async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const res = await fetch(`${NOTION_API_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("OAUTH_EXCHANGE_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.notionError = body.error
    throw err
  }
  return body // { access_token, token_type, bot_id, workspace_name, workspace_icon, workspace_id, owner, duplicated_template_id }
}

// ---------------------------------------------------------------------------
// Authenticated GET against the Notion API
// ---------------------------------------------------------------------------
async function notionGet(integration, path) {
  const accessToken = decryptAccessToken(integration.settings || {})
  const url = `${NOTION_API_BASE}${path.startsWith("/") ? path : "/" + path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      Accept: "application/json",
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("NOTION_REQUEST_FAILED", body.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    err.notionError = body.code
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Paginated /v1/users pull (cursor pagination, capped at 1000 users)
// ---------------------------------------------------------------------------
async function listAllUsers(integration, cap = 1000) {
  const out = []
  let cursor = null
  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({ page_size: "100" })
    if (cursor) qs.set("start_cursor", cursor)
    const body = await notionGet(integration, `/v1/users?${qs.toString()}`)
    const items = Array.isArray(body.results) ? body.results : []
    out.push(...items)
    if (out.length >= cap) return out.slice(0, cap)
    if (!body.has_more || !body.next_cursor) break
    cursor = body.next_cursor
  }
  return out
}

module.exports = {
  NOTION_API_BASE,
  NOTION_VERSION,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptAccessToken,
  decryptAccessToken,
  encodeState,
  decodeState,
  exchangeCodeForToken,
  notionGet,
  listAllUsers,
}
