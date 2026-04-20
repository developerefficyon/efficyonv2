/**
 * GCP Auth Utility
 *
 * Exchanges a service-account JSON key for a short-lived (1-hour) OAuth 2.0
 * access token via the JWT-bearer grant. Uses Node's built-in `crypto` module;
 * no external dependency.
 *
 * Scope is fixed to cloud-platform.read-only — Recommender + Cloud Resource
 * Manager + Compute regions are all read-only operations.
 */

const crypto = require("crypto")

const SCOPE = "https://www.googleapis.com/auth/cloud-platform.read-only"
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"

function b64url(input) {
  return Buffer.from(input).toString("base64url")
}

/**
 * Parse and validate a service-account JSON key.
 * Throws on missing fields or wrong key type.
 */
function parseServiceAccountKey(raw) {
  let parsed
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      const err = new Error("Service account key is not valid JSON")
      err.code = "SA_INVALID_JSON"
      throw err
    }
  } else if (typeof raw === "object" && raw !== null) {
    parsed = raw
  } else {
    const err = new Error("Service account key must be a JSON string or object")
    err.code = "SA_INVALID_TYPE"
    throw err
  }

  if (parsed.type !== "service_account") {
    const err = new Error("Key is not a service-account key (type must be 'service_account')")
    err.code = "SA_WRONG_TYPE"
    throw err
  }
  if (!parsed.client_email || !parsed.private_key) {
    const err = new Error("Service account key missing client_email or private_key")
    err.code = "SA_MISSING_FIELDS"
    throw err
  }
  return parsed
}

/**
 * Sign a JWT (RS256) with the service account's private key and exchange it
 * for an access token.
 *
 * @param {object|string} serviceAccountKey - parsed or raw JSON
 * @returns {Promise<{ accessToken: string, expiresAt: number }>}
 */
async function exchangeServiceAccountKeyForToken(serviceAccountKey) {
  const sa = parseServiceAccountKey(serviceAccountKey)
  const tokenUri = sa.token_uri || DEFAULT_TOKEN_URI
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  }

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(signingInput)
  const signature = signer.sign(sa.private_key).toString("base64url")
  const jwt = `${signingInput}.${signature}`

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`GCP token exchange failed: ${res.status} ${body}`)
    err.code = res.status === 401 ? "SA_UNAUTHORIZED" : "SA_TOKEN_EXCHANGE_FAILED"
    err.status = res.status
    throw err
  }

  const json = await res.json()
  return {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in || 3600),
  }
}

module.exports = {
  SCOPE,
  parseServiceAccountKey,
  exchangeServiceAccountKeyForToken,
}
