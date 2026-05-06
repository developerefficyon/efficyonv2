/**
 * Asana Controller (cost-leak analysis).
 *
 * Auth = customer-managed Asana OAuth 2.0 (3LO). Customer pastes Client ID +
 * Secret + per-seat cost (and optionally subscribed seats / plan tier) in the
 * connect form. Standard authorization-code flow against app.asana.com,
 * persists encrypted access + refresh tokens, then captures workspace info
 * via REST.
 *
 * Findings (4 V1 checks, see services/asanaCostLeakAnalysis.js):
 *   - inactive_user
 *   - seat_overprovisioning
 *   - deactivated_member
 *   - guest_misclassified
 */

const { supabase } = require("../config/supabase")
const { analyzeAsanaCostLeaks } = require("../services/asanaCostLeakAnalysis")
const {
  ASANA_AUTH_HOST,
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
  fetchMe,
  pickWorkspace,
  fetchUsersAndWorkspace,
  fetchUserLastActivity,
} = require("../utils/asanaAuth")

const ASANA_PROVIDER = "asana"

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
    .ilike("provider", ASANA_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Asana integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapAsanaError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Asana to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Asana to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.asanaError === "invalid_grant" || e.asanaError === "invalid_token")) {
    return { status: 401, code: "asana_credentials_revoked", message: "Asana credentials revoked — please reconnect.", hint: "The OAuth integration may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.asanaError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Asana developer console app page." }
  }
  if (code === "ASANA_NO_WORKSPACE") {
    return { status: 400, message: e.message, hint: "Connect with an account that's a member of at least one Asana workspace or organization." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Asana rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Asana throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Asana error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startAsanaOAuth
// ---------------------------------------------------------------------------
async function startAsanaOAuth(req, res) {
  const endpoint = "GET /api/integrations/asana/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_asana_creds → encrypted on first OAuth start
  if (integration.settings?._pending_asana_creds) {
    try {
      const pending = integration.settings._pending_asana_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_asana_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        seat_cost_usd: Number(pending.seatCostUsd) || 0,
        subscribed_seats: pending.subscribedSeats != null && pending.subscribedSeats !== ""
          ? Number(pending.subscribedSeats) || 0
          : null,
        plan_tier: typeof pending.planTier === "string" ? pending.planTier.toLowerCase() : null,
        primary_domains: typeof pending.primaryDomains === "string" ? pending.primaryDomains : null,
      }
      const { error: upgradeError } = await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      if (upgradeError) {
        log("error", endpoint, "failed to persist encrypted credentials", { message: upgradeError.message })
        return res.status(500).json({ error: "Failed to save Asana credentials — please try again.", hint: null })
      }
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapAsanaError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Asana Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.ASANA_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/asana/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${ASANA_AUTH_HOST}/-/oauth_authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", FULL_SCOPES.join(" "))
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("response_type", "code")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: asanaOAuthCallback
// No requireAuth — Asana's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function asanaOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/asana/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.ASANA_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/asana/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  const encryptedTokens = encryptTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  const nowIso = new Date().toISOString()
  const { error: persistError } = await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        ...encryptedTokens,
        granted_scopes: tokens.scope || null,
        connected_user_gid: tokens?.data?.gid || tokens?.data?.id || null,
        connected_user_email: tokens?.data?.email || null,
        connected_user_name: tokens?.data?.name || null,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  if (persistError) {
    log("error", endpoint, "failed to persist tokens", { message: persistError.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?asana_consent=error&msg=${encodeURIComponent("Failed to save connection — please try again.")}`)
  }

  // Best-effort: enrich with workspace info
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const me = await fetchMe(refreshed)
      const workspace = pickWorkspace(me.workspaces, refreshed.settings?.workspace_gid)
      if (workspace) {
        await supabase
          .from("company_integrations")
          .update({
            settings: {
              ...(refreshed.settings || {}),
              workspace_gid: workspace.gid,
              workspace_name: workspace.name || null,
              workspace_is_organization: !!workspace.isOrganization,
              workspace_email_domains: Array.isArray(workspace.emailDomains) ? workspace.emailDomains : [],
            },
          })
          .eq("id", integration.id)
      }
    }
  } catch (e) {
    log("warn", endpoint, "workspace enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?asana_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateAsana
// ---------------------------------------------------------------------------
async function validateAsana(req, res) {
  const endpoint = "POST /api/integrations/asana/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  try {
    const me = await fetchMe(integration)
    const workspace = pickWorkspace(me.workspaces, integration.settings?.workspace_gid)
    if (!workspace) {
      return res.status(400).json({ error: "No Asana workspace accessible to this account.", hint: null })
    }
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          workspace_gid: workspace.gid,
          workspace_name: workspace.name || null,
          workspace_is_organization: !!workspace.isOrganization,
          workspace_email_domains: Array.isArray(workspace.emailDomains) ? workspace.emailDomains : [],
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      lastValidatedAt: nowIso,
      workspaceGid: workspace.gid,
      workspaceName: workspace.name || null,
      isOrganization: !!workspace.isOrganization,
    })
  } catch (e) {
    const mapped = mapAsanaError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getAsanaStatus
// ---------------------------------------------------------------------------
async function getAsanaStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    workspaceGid: s.workspace_gid || null,
    workspaceName: s.workspace_name || null,
    isOrganization: !!s.workspace_is_organization,
    planTier: s.plan_tier || null,
    seatCostUsd: s.seat_cost_usd ?? null,
    subscribedSeats: s.subscribed_seats ?? null,
    primaryDomains: s.primary_domains || null,
    workspaceEmailDomains: Array.isArray(s.workspace_email_domains) ? s.workspace_email_domains : [],
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectAsana
// ---------------------------------------------------------------------------
async function disconnectAsana(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorWorkspaceGid = integration.settings?.workspace_gid || null

  // Best-effort revoke
  try {
    const { clientId, clientSecret } = decryptOAuthCreds(integration.settings || {})
    const { access_token } = decryptTokens(integration.settings || {})
    if (access_token) await revokeToken({ clientId, clientSecret, token: access_token })
  } catch (_) {
    // ignore — credentials may already be unusable
  }

  const { error: disconnectError } = await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_workspace_gid: priorWorkspaceGid },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  if (disconnectError) {
    log("error", "DELETE /api/integrations/asana", "supabase update on disconnect failed", { message: disconnectError.message })
    return res.status(500).json({ error: "Failed to disconnect — please try again.", hint: null })
  }
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// ---------------------------------------------------------------------------
// Handler: getAsanaUsers — feeds the Data tab
// ---------------------------------------------------------------------------
async function getAsanaUsers(req, res) {
  const endpoint = "GET /api/integrations/asana/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Asana integration is not connected", status: integration.status })
  }
  try {
    const { users, workspace } = await fetchUsersAndWorkspace(integration)
    return res.json({
      workspace: {
        gid: workspace?.gid || null,
        name: workspace?.name || null,
        isOrganization: !!workspace?.isOrganization,
        emailDomains: Array.isArray(workspace?.emailDomains) ? workspace.emailDomains : [],
      },
      users,
      counts: {
        total: users.length,
        active: users.filter((u) => u.isActive && !u.isGuest).length,
        guests: users.filter((u) => u.isGuest).length,
        admins: users.filter((u) => u.isAdmin).length,
        deactivated: users.filter((u) => !u.isActive).length,
      },
    })
  } catch (e) {
    const mapped = mapAsanaError(e)
    log("error", endpoint, "users fetch failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeAsanaCostLeaksEndpoint
// Returns findings; the frontend persists via /api/analysis-history.
// ---------------------------------------------------------------------------
async function analyzeAsanaCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/asana/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Asana integration is not connected", status: integration.status })
  }

  const inactivityDays = Math.max(7, Math.min(365, Number(req.query?.inactivityDays) || 60))

  try {
    const result = await analyzeAsanaCostLeaks({
      fetchUsersAndWorkspace,
      fetchUserLastActivity,
      integration,
      inactivityDays,
    })
    return res.json({
      ...result,
      overallSummary: result.summary,
      parameters: { inactivityDays },
      workspace: {
        gid: integration.settings?.workspace_gid || null,
        name: integration.settings?.workspace_name || null,
        plan_tier: integration.settings?.plan_tier || null,
        subscribed_seats: integration.settings?.subscribed_seats ?? null,
      },
    })
  } catch (e) {
    const mapped = mapAsanaError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

module.exports = {
  startAsanaOAuth,
  asanaOAuthCallback,
  validateAsana,
  getAsanaStatus,
  disconnectAsana,
  getAsanaUsers,
  analyzeAsanaCostLeaksEndpoint,
  getIntegrationForUser,
  mapAsanaError,
  log,
  ASANA_PROVIDER,
}
