/**
 * Airtable Controller (cost-leak analysis).
 *
 * Auth = customer-managed Airtable OAuth 2.0 + PKCE. Customer pastes Client ID
 * + Secret + plan tier + per-seat cost (and optionally subscribed/active
 * seats) in the connect form. We do the standard authorization-code flow
 * against airtable.com with S256 PKCE, persist encrypted access + refresh
 * tokens, then fetch /meta/whoami to capture user identity.
 *
 * Findings (4 V1 checks, see services/airtableCostLeakAnalysis.js):
 *   - inactive_user           (skipped without Enterprise SCIM visibility)
 *   - seat_overprovisioning   (works from customer-provided seat counts)
 *   - plan_tier_overspec      (Business → Team downgrade if base count fits)
 *   - editor_misclassified    (skipped without Enterprise SCIM visibility)
 */

const { supabase } = require("../config/supabase")
const { analyzeAirtableCostLeaks } = require("../services/airtableCostLeakAnalysis")
const {
  AIRTABLE_AUTH_HOST,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  generatePkceVerifier,
  pkceChallenge,
  encryptPkceVerifier,
  decryptPkceVerifier,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  revokeToken,
  evictToken,
  fetchMe,
  listBases,
  fetchUsersAndWorkspace,
} = require("../utils/airtableAuth")

const AIRTABLE_PROVIDER = "airtable"

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
    .ilike("provider", AIRTABLE_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Airtable integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapAirtableError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Airtable to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Airtable to obtain a refresh token." }
  }
  if (code === "OAUTH_REFRESH_FAILED" && (e.airtableError === "invalid_grant" || e.airtableError === "invalid_token")) {
    return { status: 401, code: "airtable_credentials_revoked", message: "Airtable credentials revoked — please reconnect.", hint: "The OAuth integration may have been revoked, or the refresh token expired (60-day max)." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.airtableError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Airtable Builder Hub OAuth integration page." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Airtable rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Airtable throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Airtable error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startAirtableOAuth
// Generates a fresh PKCE verifier, persists it encrypted, and redirects to
// Airtable's authorize endpoint.
// ---------------------------------------------------------------------------
async function startAirtableOAuth(req, res) {
  const endpoint = "GET /api/integrations/airtable/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_airtable_creds → encrypted on first OAuth start
  if (integration.settings?._pending_airtable_creds) {
    try {
      const pending = integration.settings._pending_airtable_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_airtable_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        seat_cost_usd: Number(pending.seatCostUsd) || 0,
        subscribed_seats: pending.subscribedSeats != null && pending.subscribedSeats !== ""
          ? Number(pending.subscribedSeats) || 0
          : null,
        active_seats: pending.activeSeats != null && pending.activeSeats !== ""
          ? Number(pending.activeSeats) || 0
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
        return res.status(500).json({ error: "Failed to save Airtable credentials — please try again.", hint: null })
      }
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapAirtableError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Airtable Client ID not configured. Reconnect first." })
  }

  // PKCE: generate, persist encrypted, send challenge to Airtable
  const verifier = generatePkceVerifier()
  const challenge = pkceChallenge(verifier)
  const pkceFields = encryptPkceVerifier(verifier)
  const { error: pkceError } = await supabase
    .from("company_integrations")
    .update({ settings: { ...(integration.settings || {}), ...pkceFields } })
    .eq("id", integration.id)
  if (pkceError) {
    log("error", endpoint, "failed to persist PKCE verifier", { message: pkceError.message })
    return res.status(500).json({ error: "Failed to start OAuth flow — please try again.", hint: null })
  }

  const redirectUri =
    process.env.AIRTABLE_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/airtable/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${AIRTABLE_AUTH_HOST}/oauth2/v1/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", FULL_SCOPES.join(" "))
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("code_challenge", challenge)
  authUrl.searchParams.set("code_challenge_method", "S256")

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: airtableOAuthCallback
// No requireAuth — Airtable's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function airtableOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/airtable/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const codeVerifier = decryptPkceVerifier(integration.settings || {})
  if (!codeVerifier) {
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent("PKCE verifier missing — restart the connect flow")}`)
  }

  const redirectUri =
    process.env.AIRTABLE_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/airtable/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri, codeVerifier })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  const encryptedTokens = encryptTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  const nowIso = new Date().toISOString()
  // Strip the consumed PKCE verifier from settings so it can't be reused.
  const { _pkce_verifier_encrypted, ...preserved } = integration.settings || {}
  const { error: persistError } = await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...preserved,
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
    return res.redirect(`${frontendUrl}/dashboard/tools?airtable_consent=error&msg=${encodeURIComponent("Failed to save connection — please try again.")}`)
  }

  // Best-effort: enrich with whoami + base count
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const me = await fetchMe(refreshed)
      const bases = await listBases(refreshed).catch(() => [])
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshed.settings || {}),
            connected_user_id: me.id,
            connected_user_email: me.email,
            base_count: bases.length,
            granted_scopes_array: Array.isArray(me.scopes) ? me.scopes : null,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "whoami/bases enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?airtable_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateAirtable
// ---------------------------------------------------------------------------
async function validateAirtable(req, res) {
  const endpoint = "POST /api/integrations/airtable/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  try {
    const me = await fetchMe(integration)
    const bases = await listBases(integration).catch(() => [])
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          connected_user_id: me.id,
          connected_user_email: me.email,
          base_count: bases.length,
          granted_scopes_array: Array.isArray(me.scopes) ? me.scopes : null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      lastValidatedAt: nowIso,
      connectedUserEmail: me.email,
      baseCount: bases.length,
      grantedScopes: me.scopes || null,
    })
  } catch (e) {
    const mapped = mapAirtableError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getAirtableStatus
// ---------------------------------------------------------------------------
async function getAirtableStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    connectedUserId: s.connected_user_id || null,
    connectedUserEmail: s.connected_user_email || null,
    baseCount: typeof s.base_count === "number" ? s.base_count : null,
    planTier: s.plan_tier || null,
    seatCostUsd: s.seat_cost_usd ?? null,
    subscribedSeats: s.subscribed_seats ?? null,
    activeSeats: s.active_seats ?? null,
    primaryDomains: s.primary_domains || null,
    grantedScopes: Array.isArray(s.granted_scopes_array) ? s.granted_scopes_array : null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectAirtable
// ---------------------------------------------------------------------------
async function disconnectAirtable(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorUserId = integration.settings?.connected_user_id || null

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
      settings: { disconnected_at: nowIso, prior_connected_user_id: priorUserId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  if (disconnectError) {
    log("error", "DELETE /api/integrations/airtable", "supabase update on disconnect failed", { message: disconnectError.message })
    return res.status(500).json({ error: "Failed to disconnect — please try again.", hint: null })
  }
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// ---------------------------------------------------------------------------
// Handler: getAirtableUsers — feeds the Data tab.
// Without enterprise SCIM scopes this returns the connecting user only.
// ---------------------------------------------------------------------------
async function getAirtableUsers(req, res) {
  const endpoint = "GET /api/integrations/airtable/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Airtable integration is not connected", status: integration.status })
  }
  try {
    const { users, workspace } = await fetchUsersAndWorkspace(integration)
    return res.json({
      workspace: {
        id: workspace?.id || null,
        name: workspace?.name || null,
        primaryDomain: workspace?.primaryDomain || null,
        baseCount: workspace?.baseCount ?? null,
        bases: Array.isArray(workspace?.bases) ? workspace.bases : [],
        grantedScopes: Array.isArray(workspace?.grantedScopes) ? workspace.grantedScopes : null,
      },
      users,
      counts: {
        total: users.length,
        active: users.filter((u) => u.isActive && !u.isGuest).length,
        guests: users.filter((u) => u.isGuest).length,
        admins: users.filter((u) => u.isAdmin).length,
        deactivated: users.filter((u) => !u.isActive).length,
      },
      visibilityNote:
        users.length <= 1
          ? "Airtable's public OAuth API exposes only the connecting user without Enterprise SCIM scopes. Subscribed/active seat counts you provide on the connect form drive the seat-based checks."
          : null,
    })
  } catch (e) {
    const mapped = mapAirtableError(e)
    log("error", endpoint, "users fetch failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeAirtableCostLeaksEndpoint
// Returns findings; the frontend persists via /api/analysis-history.
// ---------------------------------------------------------------------------
async function analyzeAirtableCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/airtable/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Airtable integration is not connected", status: integration.status })
  }

  const inactivityDays = Math.max(7, Math.min(365, Number(req.query?.inactivityDays) || 60))

  try {
    const result = await analyzeAirtableCostLeaks({
      fetchUsersAndWorkspace,
      integration,
      inactivityDays,
    })
    return res.json({
      ...result,
      overallSummary: result.summary,
      parameters: { inactivityDays },
      workspace: {
        name: integration.settings?.workspace_name || null,
        plan_tier: integration.settings?.plan_tier || null,
        subscribed_seats: integration.settings?.subscribed_seats ?? null,
        active_seats: integration.settings?.active_seats ?? null,
        base_count: integration.settings?.base_count ?? null,
      },
    })
  } catch (e) {
    const mapped = mapAirtableError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint })
  }
}

module.exports = {
  startAirtableOAuth,
  airtableOAuthCallback,
  validateAirtable,
  getAirtableStatus,
  disconnectAirtable,
  getAirtableUsers,
  analyzeAirtableCostLeaksEndpoint,
  getIntegrationForUser,
  mapAirtableError,
  log,
  AIRTABLE_PROVIDER,
}
