/**
 * Zoom Auth Utility
 *
 * Zoom Server-to-Server OAuth: each customer creates an S2S app in their own
 * Zoom account and gives us account_id + client_id + client_secret. We encrypt
 * all three (the secret at minimum must be encrypted) and mint app-only access
 * tokens via:
 *
 *   POST https://zoom.us/oauth/token
 *     grant_type=account_credentials
 *     account_id=<customer's account id>
 *     Authorization: Basic base64(client_id:client_secret)
 *
 * Token cache: 55-minute effective TTL.
 */

const { encryptOAuthData, decryptOAuthData } = require("./encryption")

const TOKEN_URL = "https://zoom.us/oauth/token"
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const tokenCache = new Map()

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

/**
 * Encrypt the three Zoom credentials for persistence in settings.
 */
function encryptZoomCredentials({ accountId, clientId, clientSecret }) {
  if (!accountId || !clientId || !clientSecret) {
    throw typedError("CREDS_MISSING", "account_id, client_id, and client_secret are all required")
  }
  return {
    account_id_encrypted: encryptOAuthData(accountId),
    client_id_encrypted: encryptOAuthData(clientId),
    client_secret_encrypted: encryptOAuthData(clientSecret),
  }
}

/**
 * Decrypt the three credentials from settings. Returns plaintext.
 */
function decryptZoomCredentials(settings) {
  const accountId = settings.account_id_encrypted ? decryptOAuthData(settings.account_id_encrypted) : null
  const clientId = settings.client_id_encrypted ? decryptOAuthData(settings.client_id_encrypted) : null
  const clientSecret = settings.client_secret_encrypted ? decryptOAuthData(settings.client_secret_encrypted) : null
  if (!accountId || !clientId || !clientSecret) {
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt Zoom credentials from settings")
  }
  return { accountId, clientId, clientSecret }
}

async function getZoomAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.token

  const { accountId, clientId, clientSecret } = decryptZoomCredentials(integration.settings || {})
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw typedError("TOKEN_FETCH_FAILED", body.reason || body.message || body.error_description || `HTTP ${res.status}`)
  }

  const token = body.access_token
  const expiresAt = Date.now() + (Number(body.expires_in) || 3600) * 1000
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = { encryptZoomCredentials, decryptZoomCredentials, getZoomAccessToken, evictToken }
