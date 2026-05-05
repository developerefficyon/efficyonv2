/**
 * monday.com Controller (cost-leak analysis).
 *
 * Auth = customer-managed monday.com OAuth 2.0 (3LO) integration. Customer
 * pastes Client ID + Secret + per-seat cost in the connect form. We do the
 * standard authorization-code flow against auth.monday.com, persist encrypted
 * access (+ optional refresh) tokens, then capture account/plan via GraphQL.
 *
 * Findings (5 V1 checks, see services/mondayCostLeakAnalysis.js):
 *   - inactive_user
 *   - seat_tier_overprovisioning
 *   - disabled_user
 *   - pending_invite
 *   - view_only_member
 */

const { supabase } = require("../config/supabase")
const { analyzeMondayCostLeaks } = require("../services/mondayCostLeakAnalysis")
const {
  MONDAY_AUTH_HOST,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  evictToken,
  fetchUsersAndPlan,
} = require("../utils/mondayAuth")

const MONDAY_PROVIDER = "monday"

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
    .ilike("provider", MONDAY_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "monday.com integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapMondayError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect monday.com to provide fresh OAuth credentials." }
  }
  if (code === "ACCESS_TOKEN_MISSING" || code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect monday.com to obtain a token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.mondayError === "invalid_grant" || e.mondayError === "invalid_token")) {
    return { status: 401, code: "monday_credentials_revoked", message: "monday.com credentials revoked — please reconnect.", hint: "The OAuth integration may have been revoked, or the refresh token expired." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.mondayError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your monday.com developer center app page." }
  }
  if (code === "ComplexityException") {
    return { status: 503, message: "monday.com query complexity exceeded — retry in a minute.", hint: null }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "monday.com rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "monday.com throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected monday.com error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startMondayOAuth
// ---------------------------------------------------------------------------
async function startMondayOAuth(req, res) {
  const endpoint = "GET /api/integrations/monday/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_monday_creds → encrypted on first OAuth start
  if (integration.settings?._pending_monday_creds) {
    try {
      const pending = integration.settings._pending_monday_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_monday_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        seat_cost_usd: Number(pending.seatCostUsd) || 0,
      }
      const { error: upgradeError } = await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      if (upgradeError) {
        log("error", endpoint, "failed to persist encrypted credentials", { message: upgradeError.message })
        return res.status(500).json({ error: "Failed to save monday.com credentials — please try again.", hint: null })
      }
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapMondayError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "monday.com Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.MONDAY_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/monday/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${MONDAY_AUTH_HOST}/oauth2/authorize`)
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
// Handler: mondayOAuthCallback
// No requireAuth — monday.com's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function mondayOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/monday/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.MONDAY_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/monday/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
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
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  if (persistError) {
    log("error", endpoint, "failed to persist tokens", { message: persistError.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?monday_consent=error&msg=${encodeURIComponent("Failed to save connection — please try again.")}`)
  }

  // Best-effort: enrich with account + plan
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const { account } = await fetchUsersAndPlan(refreshed)
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshed.settings || {}),
            account_id: account?.id || null,
            account_name: account?.name || null,
            plan_tier: account?.plan?.tier || null,
            plan_max_users: account?.plan?.maxUsers || null,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "account enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?monday_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateMonday
// ---------------------------------------------------------------------------
async function validateMonday(req, res) {
  const endpoint = "POST /api/integrations/monday/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  try {
    const { account } = await fetchUsersAndPlan(integration)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          account_id: account?.id || null,
          account_name: account?.name || null,
          plan_tier: account?.plan?.tier || null,
          plan_max_users: account?.plan?.maxUsers || null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      lastValidatedAt: nowIso,
      accountId: account?.id || null,
      accountName: account?.name || null,
      planTier: account?.plan?.tier || null,
      planMaxUsers: account?.plan?.maxUsers || null,
    })
  } catch (e) {
    const mapped = mapMondayError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getMondayStatus
// ---------------------------------------------------------------------------
async function getMondayStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    accountId: s.account_id || null,
    accountName: s.account_name || null,
    planTier: s.plan_tier || null,
    planMaxUsers: s.plan_max_users || null,
    seatCostUsd: s.seat_cost_usd ?? null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectMonday
// ---------------------------------------------------------------------------
async function disconnectMonday(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorAccountId = integration.settings?.account_id || null

  const { error: disconnectError } = await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_account_id: priorAccountId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  if (disconnectError) {
    log("error", "DELETE /api/integrations/monday", "supabase update on disconnect failed", { message: disconnectError.message })
    return res.status(500).json({ error: "Failed to disconnect — please try again.", hint: null })
  }
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// ---------------------------------------------------------------------------
// Handler: getMondayUsers — feeds the Data tab
// ---------------------------------------------------------------------------
async function getMondayUsers(req, res) {
  const endpoint = "GET /api/integrations/monday/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "monday.com integration is not connected", status: integration.status })
  }
  try {
    const { users, account } = await fetchUsersAndPlan(integration)
    return res.json({
      account: {
        id: account?.id || null,
        name: account?.name || null,
        plan: account?.plan || null,
      },
      users,
      counts: {
        total: users.length,
        active: users.filter((u) => u.enabled && !u.isPending).length,
        pending: users.filter((u) => u.isPending).length,
        viewOnly: users.filter((u) => u.isViewOnly && !u.isGuest).length,
        guest: users.filter((u) => u.isGuest).length,
        disabled: users.filter((u) => !u.enabled).length,
      },
    })
  } catch (e) {
    const mapped = mapMondayError(e)
    log("error", endpoint, "users fetch failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeMondayCostLeaksEndpoint
// Returns findings; the frontend persists via /api/analysis-history.
// ---------------------------------------------------------------------------
async function analyzeMondayCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/monday/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "monday.com integration is not connected", status: integration.status })
  }

  const inactivityDays = Math.max(7, Math.min(365, Number(req.query?.inactivityDays) || 60))

  try {
    const result = await analyzeMondayCostLeaks({
      fetchUsersAndPlan,
      integration,
      inactivityDays,
    })
    return res.json({
      ...result,
      overallSummary: result.summary,
      parameters: { inactivityDays },
      account: {
        id: integration.settings?.account_id || null,
        name: integration.settings?.account_name || null,
        plan_tier: integration.settings?.plan_tier || null,
        plan_max_users: integration.settings?.plan_max_users || null,
      },
    })
  } catch (e) {
    const mapped = mapMondayError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

module.exports = {
  startMondayOAuth,
  mondayOAuthCallback,
  validateMonday,
  getMondayStatus,
  disconnectMonday,
  getMondayUsers,
  analyzeMondayCostLeaksEndpoint,
  getIntegrationForUser,
  mapMondayError,
  log,
  MONDAY_PROVIDER,
}
