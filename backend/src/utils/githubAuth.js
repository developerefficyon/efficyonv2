/**
 * GitHub Auth Utility (per-customer GitHub App).
 *
 * Customer creates a GitHub App in their own org, installs it, and gives us
 * App ID + Private Key PEM + Installation ID. We encrypt all three at rest.
 * Per analysis, we sign a 10-minute RS256 JWT with the customer's private key
 * (Node built-in crypto — no new deps), exchange it for a 1-hour installation
 * token via POST /app/installations/{id}/access_tokens, and cache the token.
 */

const crypto = require("crypto")
const { encrypt, decrypt } = require("./encryption")

const API_BASE = "https://api.github.com"
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const tokenCache = new Map() // integrationId -> { token, expiresAt }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function encryptGitHubCredentials({ appId, privateKey, installationId }) {
  if (!appId || !privateKey || !installationId) {
    throw typedError("CREDS_MISSING", "appId, privateKey, and installationId are all required")
  }
  return {
    app_id_encrypted: encrypt(String(appId)),
    private_key_encrypted: encrypt(privateKey),
    installation_id_encrypted: encrypt(String(installationId)),
  }
}

function decryptGitHubCredentials(settings) {
  const appId = settings.app_id_encrypted ? decrypt(settings.app_id_encrypted) : null
  const privateKey = settings.private_key_encrypted ? decrypt(settings.private_key_encrypted) : null
  const installationId = settings.installation_id_encrypted ? decrypt(settings.installation_id_encrypted) : null
  if (!appId || !privateKey || !installationId) {
    throw typedError("CREDS_DECRYPT_FAILED", "Unable to decrypt GitHub credentials from settings")
  }
  return { appId, privateKey, installationId }
}

function signAppJWT({ appId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  // GitHub's JWT spec requires the iss claim to be the App ID as an integer.
  const payload = { iss: Number(appId), iat: now - 60, exp: now + 600 }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signingInput = `${headerB64}.${payloadB64}`
  let signature
  try {
    signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKeyPem)
  } catch (e) {
    throw typedError("JWT_SIGN_FAILED", `Private Key couldn't sign a JWT: ${e.message}`)
  }
  return `${signingInput}.${signature.toString("base64url")}`
}

async function getGitHubInstallationToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.token

  const { appId, privateKey, installationId } = decryptGitHubCredentials(integration.settings || {})
  const jwt = signAppJWT({ appId, privateKeyPem: privateKey })

  const res = await fetch(
    `${API_BASE}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("INSTALL_TOKEN_FAILED", body.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    throw err
  }

  const token = body.token
  const expiresAt = new Date(body.expires_at).getTime()
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = {
  encryptGitHubCredentials,
  decryptGitHubCredentials,
  signAppJWT,
  getGitHubInstallationToken,
  evictToken,
  API_BASE,
}
