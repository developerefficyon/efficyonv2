/**
 * Salesforce Controller (cost-leak analysis).
 *
 * Auth = per-customer Connected App. Customer pastes Consumer Key + Consumer
 * Secret in the connect form (encrypted at rest), chooses orgType, optionally
 * supplies a My Domain URL. We do an OAuth 2.0 web-server flow, persist
 * encrypted access + refresh tokens, and use them to query SOQL.
 *
 * Findings: inactive licensed users, frozen-but-billed users, unused PSLs.
 */

const { supabase } = require("../config/supabase")
const {
  API_VERSION,
  resolveOAuthHost,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  getAccessToken,
  evictToken,
} = require("../utils/salesforceAuth")

const SALESFORCE_PROVIDER = "Salesforce"

function log(level, endpoint, message, data = null) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.company_id) return { error: "No company associated with this user", status: 400 }
  const { data: integration, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", SALESFORCE_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Salesforce integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapSalesforceError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Salesforce to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Salesforce to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && e.salesforceError === "invalid_grant") {
    return { status: 401, message: "Salesforce credentials revoked — please reconnect.", hint: "The Connected App may have been deleted, or the user authorization was revoked." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Salesforce rejected the access token.", hint: "Reconnect to refresh credentials." }
  }
  if (e.httpStatus === 403) {
    return { status: 403, message: "Salesforce rejected the request — the OAuth scope is insufficient.", hint: "The Connected App needs the 'api' scope at minimum." }
  }
  if (e.salesforceError === "REQUEST_LIMIT_EXCEEDED") {
    return { status: 503, message: "Salesforce daily API limit exhausted — retry tomorrow.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Salesforce error", hint: null }
}

// ---------------------------------------------------------------------------
// SOQL helper — execute a single SOQL query against the integration's instance
// ---------------------------------------------------------------------------
async function executeSOQL(integration, soql) {
  const accessToken = await getAccessToken(integration)
  const instanceUrl = integration.settings?.instance_url
  if (!instanceUrl) {
    const err = new Error("instance_url not set — please reconnect")
    err.code = "INSTANCE_URL_MISSING"
    err.httpStatus = 400
    throw err
  }
  const url = `${instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(body[0]?.message || `HTTP ${r.status}`)
    err.httpStatus = r.status
    err.salesforceError = body[0]?.errorCode
    throw err
  }
  return body
}

// ---------------------------------------------------------------------------
// Handler: startSalesforceOAuth
// Builds the authorize URL and either redirects or returns JSON.
// ---------------------------------------------------------------------------
async function startSalesforceOAuth(req, res) {
  const endpoint = "GET /api/integrations/salesforce/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_salesforce_creds → encrypted on first OAuth start
  if (integration.settings?._pending_salesforce_creds) {
    try {
      const pending = integration.settings._pending_salesforce_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_salesforce_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        org_type: pending.orgType || "production",
        my_domain: pending.myDomain || null,
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapSalesforceError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Salesforce Consumer Key not configured. Reconnect first." })
  }

  const host = resolveOAuthHost({
    org_type: integration.settings?.org_type,
    my_domain: integration.settings?.my_domain,
  })
  const redirectUri =
    process.env.SALESFORCE_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/salesforce/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${host}/services/oauth2/authorize`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "api refresh_token offline_access id profile email")
  authUrl.searchParams.set("state", state)

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: salesforceOAuthCallback
// No requireAuth — Salesforce's browser redirect can't carry our session.
// State parameter encodes (company_id, integration_id) for verification.
// ---------------------------------------------------------------------------
async function salesforceOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/salesforce/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const host = resolveOAuthHost({
    org_type: integration.settings?.org_type,
    my_domain: integration.settings?.my_domain,
  })
  const redirectUri =
    process.env.SALESFORCE_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/salesforce/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ host, clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?salesforce_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  // Persist encrypted tokens + instance metadata
  const encryptedTokens = encryptTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        ...encryptedTokens,
        instance_url: tokens.instance_url,
        org_id: extractOrgIdFromIdUrl(tokens.id),
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?salesforce_consent=success`)
}

// Salesforce's `id` field looks like https://login.salesforce.com/id/<orgId>/<userId>
function extractOrgIdFromIdUrl(idUrl) {
  if (!idUrl) return null
  const m = idUrl.match(/\/id\/([^/]+)\//)
  return m ? m[1] : null
}

// ---------------------------------------------------------------------------
// Handler: validateSalesforce
// Re-pings Salesforce to confirm connection still works (used by "Refresh status" button).
// ---------------------------------------------------------------------------
async function validateSalesforce(req, res) {
  const endpoint = "POST /api/integrations/salesforce/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const accessToken = await getAccessToken(integration)
    const instanceUrl = integration.settings?.instance_url
    if (!instanceUrl) return res.status(400).json({ error: "instance_url not set — please reconnect." })

    const url = `${instanceUrl}/services/data/${API_VERSION}/sobjects/User/describe`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      const err = new Error(body[0]?.message || `HTTP ${r.status}`)
      err.httpStatus = r.status
      err.salesforceError = body[0]?.errorCode
      throw err
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({ settings: { ...(integration.settings || {}), last_validated_at: nowIso }, status: "connected", updated_at: nowIso })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getSalesforceStatus
// Returns settings metadata — no Salesforce call.
// ---------------------------------------------------------------------------
async function getSalesforceStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    orgType: s.org_type || null,
    myDomain: s.my_domain || null,
    instanceUrl: s.instance_url || null,
    orgId: s.org_id || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectSalesforce
// Clears tokens + creds, evicts cache, flips status.
// ---------------------------------------------------------------------------
async function disconnectSalesforce(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorOrgId = integration.settings?.org_id || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_org_id: priorOrgId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// ---------------------------------------------------------------------------
// Handler: getSalesforceUsers
// Returns the 50 most recent users for the Data tab.
// ---------------------------------------------------------------------------
async function getSalesforceUsers(req, res) {
  const endpoint = "GET /api/integrations/salesforce/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const soql =
      "SELECT Id, Username, Name, Email, IsActive, LastLoginDate, " +
      "Profile.Name, Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey " +
      "FROM User " +
      "WHERE UserType = 'Standard' " +
      "ORDER BY LastLoginDate DESC NULLS LAST " +
      "LIMIT 50"
    const result = await executeSOQL(integration, soql)
    return res.json({ users: result.records || [] })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "getUsers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getSalesforceLicenses
// Returns UserLicense allocation table.
// ---------------------------------------------------------------------------
async function getSalesforceLicenses(req, res) {
  const endpoint = "GET /api/integrations/salesforce/licenses"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const soql =
      "SELECT Id, MasterLabel, LicenseDefinitionKey, Name, Status, TotalLicenses, UsedLicenses " +
      "FROM UserLicense " +
      "ORDER BY MasterLabel"
    const result = await executeSOQL(integration, soql)
    return res.json({ licenses: result.records || [] })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "getLicenses failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getSalesforcePSLs
// Returns PermissionSetLicense allocation table.
// ---------------------------------------------------------------------------
async function getSalesforcePSLs(req, res) {
  const endpoint = "GET /api/integrations/salesforce/psls"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const soql =
      "SELECT Id, MasterLabel, DeveloperName, Status, TotalLicenses, UsedLicenses, ExpirationDate " +
      "FROM PermissionSetLicense " +
      "ORDER BY MasterLabel"
    const result = await executeSOQL(integration, soql)
    return res.json({ psls: result.records || [] })
  } catch (e) {
    const mapped = mapSalesforceError(e)
    log("error", endpoint, "getPSLs failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

module.exports = {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  getSalesforceUsers,
  getSalesforceLicenses,
  getSalesforcePSLs,
  executeSOQL,
  // exported for use by analyze handler added in later tasks:
  getIntegrationForUser,
  mapSalesforceError,
  log,
  SALESFORCE_PROVIDER,
}
