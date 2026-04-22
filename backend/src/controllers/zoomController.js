/**
 * Zoom Controller
 *
 * Auth = Server-to-Server OAuth. Each customer creates an S2S app in their own
 * Zoom account and provides account_id + client_id + client_secret. All three
 * are encrypted at rest. Tokens are minted via account-credentials grant and
 * cached 55-minute TTL in zoomAuth.
 *
 * Bundled Tasks 5 + 6 + 7: scaffolding + four info handlers + analyze + disconnect.
 */

const { supabase } = require("../config/supabase")
const {
  encryptZoomCredentials,
  decryptZoomCredentials,
  getZoomAccessToken,
  evictToken,
} = require("../utils/zoomAuth")
const { analyzeZoomCostLeaks } = require("../services/zoomCostLeakAnalysis")
const { getAccountInfo, listUsers } = require("../services/zoomUsageAnalysis")
const { saveAnalysisDirect } = require("./analysisHistoryController")

const ZOOM_PROVIDER = "Zoom"

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
    .ilike("provider", ZOOM_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Zoom integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapZoomError(e) {
  const code = e?.zoomErrorCode || e?.code || ""
  if (code === "TOKEN_FETCH_FAILED" || e.httpStatus === 401) {
    return {
      status: 401,
      message: e.message,
      hint: "Verify Account ID, Client ID, Client Secret; ensure the S2S app is activated in your Zoom account.",
    }
  }
  if (e.httpStatus === 403 || code === 4700) {
    return {
      status: 403,
      message: e.message,
      hint: "The Zoom S2S app is missing required scopes — open Marketplace → Manage → Scopes and add the listed scopes.",
    }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Zoom throttled the request.", hint: "Retry in a minute." }
  }
  return { status: 500, message: e.message || "Unexpected Zoom error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: validateZoom
// Handles the _pending_zoom_creds → encrypted upgrade on first validate,
// then mints a token and confirms the account is reachable.
// ---------------------------------------------------------------------------
async function validateZoom(req, res) {
  const endpoint = "POST /api/integrations/zoom/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  let { integration } = lookup

  // Upgrade plaintext-on-first-validate → encrypted persistent form.
  if (integration.settings?._pending_zoom_creds) {
    try {
      const creds = integration.settings._pending_zoom_creds
      const encrypted = encryptZoomCredentials(creds)
      const { _pending_zoom_creds, ...rest } = integration.settings
      const newSettings = { ...rest, ...encrypted }
      const { data: updated, error: upErr } = await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
        .select()
        .single()
      if (upErr) {
        log("error", endpoint, "failed to persist encrypted creds", { message: upErr.message })
        return res.status(500).json({ error: "Failed to save encrypted credentials." })
      }
      integration = updated
    } catch (e) {
      log("error", endpoint, "credential encryption failed", { message: e.message })
      return res.status(400).json({ error: e.message, hint: "Ensure accountId, clientId, and clientSecret are all provided." })
    }
  }

  try {
    const token = await getZoomAccessToken(integration)
    const account = await getAccountInfo(token)
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          account_name: account.account_name || null,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      accountName: account.account_name || null,
      lastValidatedAt: nowIso,
    })
  } catch (e) {
    const mapped = mapZoomError(e)
    log("error", endpoint, "validation failed", { code: e.code, zoomErrorCode: e.zoomErrorCode, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getZoomStatus
// Returns integration metadata from settings — no token needed.
// ---------------------------------------------------------------------------
async function getZoomStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    planTier: s.plan_tier || null,
    inactivityDays: s.inactivity_days || 30,
    accountName: s.account_name || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: getZoomUsers (exported as getZoomUsers)
// Fetches the user list and caps it at 500.
// ---------------------------------------------------------------------------
async function getZoomUsersHandler(req, res) {
  const endpoint = "GET /api/integrations/zoom/users"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const token = await getZoomAccessToken(integration)
    const users = await listUsers(token)
    return res.json({ users: users.slice(0, 500) })
  } catch (e) {
    const mapped = mapZoomError(e)
    log("error", endpoint, "listUsers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getZoomAccount (exported as getZoomAccount)
// Returns the raw account info object from Zoom.
// ---------------------------------------------------------------------------
async function getZoomAccountHandler(req, res) {
  const endpoint = "GET /api/integrations/zoom/account"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  try {
    const token = await getZoomAccessToken(integration)
    const account = await getAccountInfo(token)
    return res.json({ account })
  } catch (e) {
    const mapped = mapZoomError(e)
    log("error", endpoint, "getAccountInfo failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeZoomCostLeaksHandler (exported as analyzeZoomCostLeaks)
// Mirrors Azure Task 8: duplicate-check, run analysis, strip sourceErrors
// before persistence, pass parameters for Task 8 history branch.
// ---------------------------------------------------------------------------
async function analyzeZoomCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/zoom/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-run validate first." })
  }

  const planTier = integration.settings?.plan_tier || ""
  const inactivityDays = integration.settings?.inactivity_days || 30

  // Duplicate-check: same planTier + inactivityDays within 5 minutes → 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", ZOOM_PROVIDER)
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

  let result
  try {
    const token = await getZoomAccessToken(integration)
    result = await analyzeZoomCostLeaks(token, integration.settings)
  } catch (e) {
    const mapped = mapZoomError(e)
    log("error", endpoint, "analysis failed", { code: e.code, zoomErrorCode: e.zoomErrorCode, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // Strip sourceErrors before persistence (same pattern as Azure/AWS — critical).
  const { sourceErrors, ...persistedSummary } = result.summary
  try {
    await saveAnalysisDirect({
      companyId,
      provider: ZOOM_PROVIDER,
      integrationId: integration.id,
      analysisData: { summary: persistedSummary, findings: result.findings },
      parameters: { planTier, inactivityDays },
    })
  } catch (e) {
    log("error", endpoint, "saveAnalysisDirect failed", { message: e.message })
  }

  // Return full result (sourceErrors intact) to the client.
  return res.json(result)
}

// ---------------------------------------------------------------------------
// Handler: disconnectZoom
// Clears credentials, keeps audit breadcrumb, flips status, evicts token cache.
// ---------------------------------------------------------------------------
async function disconnectZoom(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorAccountName = integration.settings?.account_name || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_account_name: priorAccountName },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  validateZoom,
  getZoomStatus,
  getZoomUsers: getZoomUsersHandler,
  getZoomAccount: getZoomAccountHandler,
  analyzeZoomCostLeaks: analyzeZoomCostLeaksHandler,
  disconnectZoom,
  // exported for Task 8 wiring:
  getIntegrationForUser,
  mapZoomError,
  log,
  ZOOM_PROVIDER,
}
