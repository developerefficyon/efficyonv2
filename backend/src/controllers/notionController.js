/**
 * Notion Controller (cost-leak analysis).
 *
 * Auth = per-customer public OAuth integration. Customer pastes Client ID +
 * Secret + plan tier + seat counts in the connect form. We do an OAuth 2.0
 * web-server flow, persist encrypted access token, and use it to query
 * /v1/users.
 *
 * Findings: bot users billed as paid seats, seat-utilization gap, Notion AI
 * over-provisioning.
 */

const { supabase } = require("../config/supabase")
const {
  NOTION_API_BASE,
  NOTION_VERSION,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptAccessToken,
  decryptAccessToken,
  encodeState,
  decodeState,
  exchangeCodeForToken,
  notionGet,
} = require("../utils/notionAuth")

const NOTION_PROVIDER = "Notion"

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
    .ilike("provider", NOTION_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Notion integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapNotionError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Notion to provide fresh OAuth credentials." }
  }
  if (code === "TOKEN_DECRYPT_FAILED" || code === "TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Notion." }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.notionError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify on your Notion integration page." }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Notion rejected the access token — please reconnect.", hint: "The integration may have been disconnected from the workspace." }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Notion throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Notion error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: startNotionOAuth
// Builds the authorize URL with state, redirects or returns JSON.
// ---------------------------------------------------------------------------
async function startNotionOAuth(req, res) {
  const endpoint = "GET /api/integrations/notion/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_notion_creds → encrypted on first OAuth start
  if (integration.settings?._pending_notion_creds) {
    try {
      const pending = integration.settings._pending_notion_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_notion_creds, ...rest } = integration.settings
      const newSettings = {
        ...rest,
        ...encrypted,
        plan_tier: pending.planTier || "free",
        total_seats: parseInt(pending.totalSeats, 10) || 0,
        has_ai: pending.hasAI === "yes" || pending.hasAI === true,
        ai_seats: parseInt(pending.aiSeats, 10) || 0,
      }
      await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapNotionError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Notion Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.NOTION_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/notion/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${NOTION_API_BASE}/v1/oauth/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("owner", "user")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// ---------------------------------------------------------------------------
// Handler: notionOAuthCallback
// No requireAuth — Notion's browser redirect can't carry our session.
// ---------------------------------------------------------------------------
async function notionOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/notion/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.NOTION_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/notion/callback"

  let token
  try {
    token = await exchangeCodeForToken({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?notion_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  const encrypted = encryptAccessToken(token.access_token)
  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        ...encrypted,
        bot_id: token.bot_id || null,
        workspace_id: token.workspace_id || null,
        workspace_name: token.workspace_name || null,
        workspace_icon: token.workspace_icon || null,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?notion_consent=success`)
}

// ---------------------------------------------------------------------------
// Handler: validateNotion
// Pings /v1/users with limit=1 to confirm token still works.
// ---------------------------------------------------------------------------
async function validateNotion(req, res) {
  const endpoint = "POST /api/integrations/notion/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    await notionGet(integration, "/v1/users?page_size=1")
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({ settings: { ...(integration.settings || {}), last_validated_at: nowIso }, status: "connected", updated_at: nowIso })
      .eq("id", integration.id)
    return res.json({ status: "connected", lastValidatedAt: nowIso })
  } catch (e) {
    const mapped = mapNotionError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getNotionStatus
// Returns settings metadata — no Notion call.
// ---------------------------------------------------------------------------
async function getNotionStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    workspaceId: s.workspace_id || null,
    workspaceName: s.workspace_name || null,
    workspaceIcon: s.workspace_icon || null,
    planTier: s.plan_tier || null,
    totalSeats: s.total_seats ?? null,
    hasAI: s.has_ai === true,
    aiSeats: s.ai_seats ?? null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: disconnectNotion
// Clears tokens + creds, flips status.
// ---------------------------------------------------------------------------
async function disconnectNotion(req, res) {
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
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  startNotionOAuth,
  notionOAuthCallback,
  validateNotion,
  getNotionStatus,
  disconnectNotion,
  // exported for use by data + analyze handlers added in later tasks:
  getIntegrationForUser,
  mapNotionError,
  log,
  NOTION_PROVIDER,
}
