/**
 * Linear Controller (cost-leak analysis).
 *
 * Auth = per-customer OAuth application. Customer pastes Client ID + Secret +
 * plan tier in the connect form. We do an OAuth 2.0 web-server flow against
 * Linear, persist encrypted access + refresh tokens, and use them to query
 * Linear's GraphQL API for workspace users.
 *
 * Findings: inactive billable users (active=true + lastSeenAt older than threshold).
 */

const { supabase } = require("../config/supabase")
const {
  LINEAR_AUTHORIZE_HOST,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  getAccessToken,
  evictToken,
  fetchWorkspace,
  listAllUsers,
} = require("../utils/linearAuth")
const { analyzeLinearCostLeaks } = require("../services/linearCostLeakAnalysis")

const LINEAR_PROVIDER = "Linear"

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
    .ilike("provider", LINEAR_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Linear integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapLinearError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Linear to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Linear to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.linearError === "invalid_grant" || e.linearError === "invalid_token")) {
    return { status: 401, message: "Linear credentials revoked — please reconnect.", hint: "The OAuth app may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.linearError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Linear OAuth app page." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Linear rejected the access token — please reconnect.", hint: "The OAuth app may have been revoked." }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Linear throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Linear error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startLinearOAuth
// ---------------------------------------------------------------------------
async function startLinearOAuth(req, res) {
  const endpoint = "GET /api/integrations/linear/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_linear_creds → encrypted on first OAuth start
  if (integration.settings?._pending_linear_creds) {
    try {
      const pending = integration.settings._pending_linear_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_linear_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        plan_tier: pending.planTier || "standard",
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapLinearError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Linear Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.LINEAR_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/linear/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${LINEAR_AUTHORIZE_HOST}/oauth/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "read")
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("actor", "user")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: linearOAuthCallback
// No requireAuth — Linear's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function linearOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/linear/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.LINEAR_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/linear/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?linear_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  // Persist encrypted tokens. Then fetch workspace metadata using the new token.
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
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  // Best-effort fetch of workspace metadata (don't fail callback if it errors)
  try {
    const { data: refreshedIntegration } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshedIntegration) {
      const data = await fetchWorkspace(refreshedIntegration)
      const org = data?.organization || {}
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshedIntegration.settings || {}),
            workspace_id: org.id || null,
            workspace_name: org.name || null,
            workspace_url_key: org.urlKey || null,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "workspace metadata fetch failed (non-fatal)", { message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?linear_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateLinear
// ---------------------------------------------------------------------------
async function validateLinear(req, res) {
  const endpoint = "POST /api/integrations/linear/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const data = await fetchWorkspace(integration)
    const org = data?.organization || {}
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          workspace_id: org.id || integration.settings?.workspace_id || null,
          workspace_name: org.name || integration.settings?.workspace_name || null,
          workspace_url_key: org.urlKey || integration.settings?.workspace_url_key || null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso, workspace: org })
  } catch (e) {
    const mapped = mapLinearError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getLinearStatus
// ---------------------------------------------------------------------------
async function getLinearStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    workspaceId: s.workspace_id || null,
    workspaceName: s.workspace_name || null,
    workspaceUrlKey: s.workspace_url_key || null,
    planTier: s.plan_tier || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectLinear
// ---------------------------------------------------------------------------
async function disconnectLinear(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorWorkspaceId = integration.settings?.workspace_id || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_workspace_id: priorWorkspaceId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// ---------------------------------------------------------------------------
// Handler: getLinearUsers
// Returns all workspace users (capped at 1000) for the Data tab.
// ---------------------------------------------------------------------------
async function getLinearUsers(req, res) {
  const endpoint = "GET /api/integrations/linear/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const users = await listAllUsers(integration)
    return res.json({ users })
  } catch (e) {
    const mapped = mapLinearError(e)
    log("error", endpoint, "getUsers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeLinearCostLeaks
// ---------------------------------------------------------------------------
async function analyzeLinearCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/linear/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-validate first." })
  }

  // Parse inactivity window (30 / 60 / 90 / 180, default 60)
  let inactivityDays = parseInt(req.body?.inactivityDays, 10)
  if (![30, 60, 90, 180].includes(inactivityDays)) inactivityDays = 60

  // Duplicate-check: same integration within 5 minutes -> 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", LINEAR_PROVIDER)
    .eq("integration_id", integration.id)
    .gte("created_at", fiveMinAgo)
    .limit(1)
    .maybeSingle()
  if (recent) {
    return res.status(409).json({
      error: "An analysis was just run for this integration. Please wait a few minutes.",
      recentAnalysisId: recent.id,
    })
  }

  try {
    const result = await analyzeLinearCostLeaks({ listAllUsers, integration, inactivityDays })
    return res.json({
      summary: result.summary,
      findings: result.findings,
      warnings: result.warnings,
      parameters: { inactivityDays },
    })
  } catch (e) {
    const mapped = mapLinearError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

module.exports = {
  startLinearOAuth,
  linearOAuthCallback,
  validateLinear,
  getLinearStatus,
  disconnectLinear,
  getLinearUsers,
  analyzeLinearCostLeaks: analyzeLinearCostLeaksHandler,
  getIntegrationForUser,
  mapLinearError,
  log,
  LINEAR_PROVIDER,
}
