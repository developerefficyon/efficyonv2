/**
 * Azure Auth Utility
 *
 * Client-credentials grant against a customer tenant. The app registration
 * lives in Efficyon's tenant; customers grant admin consent which creates a
 * Service Principal in their tenant. After consent + Reader role assignment,
 * we can mint app-only tokens for each customer tenant via:
 *
 *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *     grant_type=client_credentials
 *     scope=https://management.azure.com/.default
 *     client_id=<our AZURE_CLIENT_ID>
 *     client_secret=<our AZURE_CLIENT_SECRET>
 *
 * Token cache: 55-minute effective TTL (tokens are 1h; refresh 5min early).
 */

const TOKEN_URL = (tenantId) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
const SCOPE = "https://management.azure.com/.default"
const REFRESH_BUFFER_MS = 5 * 60 * 1000

const tokenCache = new Map() // integrationId -> { token, expiresAt }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

/**
 * Validate an Azure tenant ID (GUID format).
 */
function parseTenantId(tenantId) {
  if (typeof tenantId !== "string" || !tenantId) {
    throw typedError("TENANT_ID_MISSING", "tenant_id is required")
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw typedError("TENANT_ID_INVALID", `Invalid Azure tenant ID: ${tenantId}`)
  }
  return tenantId.toLowerCase()
}

async function getAzureAccessToken(integration) {
  if (!integration?.id) throw typedError("INTEGRATION_MISSING", "integration.id is required")
  const settings = integration.settings || {}
  const tenantId = parseTenantId(settings.tenant_id)

  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) return cached.token

  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw typedError("AZURE_APP_NOT_CONFIGURED", "AZURE_CLIENT_ID / AZURE_CLIENT_SECRET env vars must be set")
  }

  const res = await fetch(TOKEN_URL(tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
      grant_type: "client_credentials",
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("TOKEN_FETCH_FAILED", body.error_description || body.error || `HTTP ${res.status}`)
    err.azureErrorCode = body.error
    throw err
  }

  const token = body.access_token
  const expiresAt = Date.now() + (Number(body.expires_in) || 3600) * 1000
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}

function evictToken(integrationId) {
  tokenCache.delete(integrationId)
}

module.exports = { parseTenantId, getAzureAccessToken, evictToken }
