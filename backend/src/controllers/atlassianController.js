/**
 * Atlassian Controller (cost-leak analysis).
 *
 * Auth = customer-managed Atlassian OAuth 2.0 (3LO) integration. Customer
 * pastes Client ID + Secret + per-product seat costs in the connect form.
 * We do an OAuth web-server flow against auth.atlassian.com, persist
 * encrypted access + refresh tokens, then capture cloudId(s) and orgId for
 * use by the Org Directory API.
 *
 * Findings (3 V1 checks, see services/atlassianCostLeakAnalysis.js):
 *   - inactive_jira_user
 *   - inactive_confluence_user
 *   - single_product_dual_seat
 */

const { supabase } = require("../config/supabase")
const {
  ATLASSIAN_AUTH_HOST,
  REQUIRED_SCOPE,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  revokeToken,
  evictToken,
  listAccessibleResources,
  findOrgId,
  hasOrgAdminScope,
} = require("../utils/atlassianAuth")

const ATLASSIAN_PROVIDER = "Atlassian"

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
    .ilike("provider", ATLASSIAN_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Atlassian integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapAtlassianError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Atlassian to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Atlassian to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.atlassianError === "invalid_grant" || e.atlassianError === "invalid_token")) {
    return { status: 401, code: "atlassian_credentials_revoked", message: "Atlassian credentials revoked — please reconnect.", hint: "The OAuth integration may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.atlassianError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Atlassian Developer Console app page." }
  }
  if (code === "ATLASSIAN_NO_ORGS") {
    return { status: 403, code: "atlassian_org_admin_required", message: e.message, hint: "Reconnect with an Atlassian Cloud Organization Admin account." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Atlassian rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 403) {
    return { status: 403, code: "atlassian_org_admin_required", message: "Atlassian denied the request (insufficient scope). Reconnect as an Org Admin.", hint: null }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Atlassian throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Atlassian error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startAtlassianOAuth
// ---------------------------------------------------------------------------
async function startAtlassianOAuth(req, res) {
  const endpoint = "GET /api/integrations/atlassian/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_atlassian_creds → encrypted on first OAuth start
  if (integration.settings?._pending_atlassian_creds) {
    try {
      const pending = integration.settings._pending_atlassian_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_atlassian_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        jira_seat_cost_usd: Number(pending.jiraSeatCostUsd) || 0,
        confluence_seat_cost_usd: Number(pending.confluenceSeatCostUsd) || 0,
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapAtlassianError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Atlassian Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.ATLASSIAN_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/atlassian/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${ATLASSIAN_AUTH_HOST}/authorize`)
  authUrl.searchParams.set("audience", "api.atlassian.com")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", FULL_SCOPES.join(" "))
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("prompt", "consent")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: atlassianOAuthCallback
// No requireAuth — Atlassian's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function atlassianOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/atlassian/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.ATLASSIAN_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/atlassian/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  // Reject install if org-admin scope was not granted
  if (!hasOrgAdminScope(tokens.scope)) {
    log("warn", endpoint, "missing org-admin scope on grant", { scope: tokens.scope })
    return res.redirect(`${frontendUrl}/dashboard/tools?atlassian_consent=error&msg=${encodeURIComponent("Atlassian Cloud Org Admin permission required (read:directory:admin-atlassian). Reconnect with an org admin account.")}`)
  }

  // Persist encrypted tokens. Then capture sites + orgId using the new token.
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
        granted_scopes: tokens.scope || null,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  // Best-effort: enrich with cloud sites + org id
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const sites = await listAccessibleResources(refreshed)
      const { orgId, orgName } = await findOrgId(refreshed)
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshed.settings || {}),
            cloud_sites: sites,
            org_id: orgId,
            org_name: orgName,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "site/org enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?atlassian_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateAtlassian
// ---------------------------------------------------------------------------
async function validateAtlassian(req, res) {
  const endpoint = "POST /api/integrations/atlassian/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  // Re-check granted scope
  const granted = integration.settings?.granted_scopes
  if (!hasOrgAdminScope(granted)) {
    return res.status(403).json({
      error: "Atlassian Cloud Org Admin permission required.",
      code: "atlassian_org_admin_required",
      hint: "Disconnect and reconnect with an Atlassian Cloud Organization Admin account.",
    })
  }

  try {
    const sites = await listAccessibleResources(integration)
    const { orgId, orgName } = await findOrgId(integration)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          cloud_sites: sites,
          org_id: orgId,
          org_name: orgName,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso, orgId, orgName, cloudSites: sites })
  } catch (e) {
    const mapped = mapAtlassianError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getAtlassianStatus
// ---------------------------------------------------------------------------
async function getAtlassianStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    orgId: s.org_id || null,
    orgName: s.org_name || null,
    cloudSites: s.cloud_sites || [],
    jiraSeatCostUsd: s.jira_seat_cost_usd ?? null,
    confluenceSeatCostUsd: s.confluence_seat_cost_usd ?? null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectAtlassian
// ---------------------------------------------------------------------------
async function disconnectAtlassian(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorOrgId = integration.settings?.org_id || null

  // Best-effort revoke of refresh token
  try {
    const settings = integration.settings || {}
    const { clientId, clientSecret } = decryptOAuthCreds(settings)
    const { refresh_token } = decryptTokens(settings)
    if (refresh_token) {
      await revokeToken({ clientId, clientSecret, token: refresh_token })
    }
  } catch (_) {
    // best-effort only
  }

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

module.exports = {
  startAtlassianOAuth,
  atlassianOAuthCallback,
  validateAtlassian,
  getAtlassianStatus,
  disconnectAtlassian,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapAtlassianError,
  log,
  ATLASSIAN_PROVIDER,
}
