/**
 * Azure Controller
 *
 * Auth = OAuth 2.0 admin consent + client-credentials grant. No per-user
 * tokens; we operate on customer tenants via app-only access tokens minted
 * from our AZURE_CLIENT_ID / AZURE_CLIENT_SECRET pair.
 */

const { supabase } = require("../config/supabase")
const { getAzureAccessToken, evictToken, parseTenantId } = require("../utils/azureAuth")
const { analyzeAzureCostLeaks } = require("../services/azureCostLeakAnalysis")
const { listSubscriptions } = require("../services/azureAdvisorAnalysis")
const { saveAnalysis } = require("./analysisHistoryController")

const AZURE_PROVIDER = "Azure"
const LOGIN_BASE = "https://login.microsoftonline.com"

function log(level, endpoint, message, data = null) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).maybeSingle()
  if (!profile?.company_id) return { error: "No company associated with this user", status: 400 }
  const { data: integration, error } = await supabase
    .from("company_integrations").select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", AZURE_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Azure integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapAzureError(e) {
  const code = e?.azureErrorCode || e?.code || ""
  if (code === "AuthorizationFailed") {
    return {
      status: 403,
      message: e.message,
      hint: "Grant the 'Efficyon Cost Analyzer (Azure)' service principal the Reader role at tenant-root management group, then retry.",
    }
  }
  if (code === "SubscriptionNotRegistered" || (e.message || "").includes("Microsoft.Advisor")) {
    return { status: 409, message: e.message, hint: "Register the Microsoft.Advisor resource provider on the subscription(s)." }
  }
  if (code === "TOKEN_FETCH_FAILED" || code === "invalid_client") {
    return { status: 401, message: e.message, hint: "Efficyon's Azure app credentials are invalid — contact support." }
  }
  if (e.httpStatus === 429) return { status: 503, message: "Azure throttled the request.", hint: "Retry in a minute." }
  return { status: 500, message: e.message || "Unexpected Azure error", hint: null }
}

// Handler stubs — filled in by Tasks 6–8.
async function initiateAzureConsent(req, res) {
  const endpoint = "GET /api/integrations/azure/consent"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  const clientId = process.env.AZURE_CLIENT_ID
  const redirectUri = process.env.AZURE_CONSENT_REDIRECT_URL
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "Azure app not configured on server." })
  }

  // Ensure external_id exists (mint if missing).
  const externalId = integration.settings?.external_id ||
    require("crypto").randomBytes(16).toString("hex")
  if (!integration.settings?.external_id) {
    await supabase
      .from("company_integrations")
      .update({ settings: { ...(integration.settings || {}), external_id: externalId } })
      .eq("id", integration.id)
  }

  const state = `${integration.id}:${externalId}`
  const consentUrl =
    `${LOGIN_BASE}/organizations/v2.0/adminconsent` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent("https://management.azure.com/.default")}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`

  return res.json({ consentUrl })
}

async function handleAzureConsentCallback(req, res) {
  const endpoint = "GET /api/integrations/azure/consent-callback"
  const { admin_consent, tenant, state, error, error_description } = req.query || {}
  const frontendBase = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "/"

  if (!state || typeof state !== "string" || !state.includes(":")) {
    return res.redirect(`${frontendBase}/dashboard/tools?azure_consent=error&msg=${encodeURIComponent("Missing state")}`)
  }
  const [integrationId, externalId] = state.split(":")

  const { data: integration, error: iErr } = await supabase
    .from("company_integrations").select("*").eq("id", integrationId).maybeSingle()
  if (iErr || !integration) {
    return res.redirect(`${frontendBase}/dashboard/tools?azure_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }
  if (integration.settings?.external_id !== externalId) {
    log("warn", endpoint, "CSRF: external_id mismatch", { integrationId })
    return res.redirect(`${frontendBase}/dashboard/tools?azure_consent=error&msg=${encodeURIComponent("Security check failed")}`)
  }

  if (admin_consent !== "True" || !tenant) {
    const msg = error_description || error || "Consent not granted"
    return res.redirect(`${frontendBase}/dashboard/tools/${integrationId}?azure_consent=error&msg=${encodeURIComponent(msg)}`)
  }

  try {
    parseTenantId(tenant)
  } catch {
    return res.redirect(`${frontendBase}/dashboard/tools/${integrationId}?azure_consent=error&msg=${encodeURIComponent("Invalid tenant id")}`)
  }

  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        tenant_id: tenant,
        consent_granted_at: nowIso,
      },
      status: "pending", // stays pending until validateAzure confirms Reader role + subscriptions
      updated_at: nowIso,
    })
    .eq("id", integrationId)

  return res.redirect(`${frontendBase}/dashboard/tools/${integrationId}?azure_consent=ok`)
}
async function validateAzure(req, res) {
  const endpoint = "POST /api/integrations/azure/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  if (!integration.settings?.tenant_id) {
    return res.status(409).json({ error: "Consent not granted yet. Complete the admin-consent step first." })
  }

  // Poll for Reader role: try listSubscriptions up to 12 times, 5s apart = 60s total.
  let subs = null
  let lastErr = null
  for (let i = 0; i < 12; i++) {
    try {
      const token = await getAzureAccessToken(integration)
      subs = await listSubscriptions(token)
      if (subs.length > 0) break
      lastErr = new Error("No subscriptions visible yet (Reader role may still be propagating)")
    } catch (e) {
      lastErr = e
      if (e?.azureErrorCode && e.azureErrorCode !== "AuthorizationFailed") break // real error, not propagation
    }
    await new Promise((r) => setTimeout(r, 5000))
  }

  if (!subs || subs.length === 0) {
    const mapped = mapAzureError(lastErr || new Error("No subscriptions accessible"))
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        active_subscriptions: subs,
        subscriptions_refreshed_at: nowIso,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)

  return res.json({
    status: "connected",
    tenantId: integration.settings.tenant_id,
    subscriptions: subs,
    lastValidatedAt: nowIso,
  })
}

async function getAzureStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const s = lookup.integration.settings || {}
  return res.json({
    status: lookup.integration.status,
    tenantId: s.tenant_id || null,
    consentGrantedAt: s.consent_granted_at || null,
    activeSubscriptions: s.active_subscriptions || [],
    subscriptionsRefreshedAt: s.subscriptions_refreshed_at || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

async function getAzureSubscriptions(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  return res.json({
    subscriptions: lookup.integration.settings?.active_subscriptions || [],
    subscriptionsRefreshedAt: lookup.integration.settings?.subscriptions_refreshed_at || null,
  })
}

async function refreshAzureSubscriptions(req, res) {
  const endpoint = "POST /api/integrations/azure/subscriptions/refresh"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  let subs
  try {
    const token = await getAzureAccessToken(integration)
    subs = await listSubscriptions(token)
  } catch (e) {
    const mapped = mapAzureError(e)
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
  const nowIso = new Date().toISOString()
  await supabase
    .from("company_integrations")
    .update({
      settings: { ...(integration.settings || {}), active_subscriptions: subs, subscriptions_refreshed_at: nowIso },
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  return res.json({ subscriptions: subs, subscriptionsRefreshedAt: nowIso })
}
async function analyzeAzureCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/azure/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-run validate first." })
  }

  // Duplicate-check: same tenant within 5 minutes → 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", AZURE_PROVIDER)
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
    const token = await getAzureAccessToken(integration)
    result = await analyzeAzureCostLeaks(token, integration.settings)
  } catch (e) {
    const mapped = mapAzureError(e)
    log("error", endpoint, "analysis failed", { code: e.code, azureErrorCode: e.azureErrorCode, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // Strip sourceErrors before persistence (matches AWS pattern).
  const { sourceErrors, ...persistedSummary } = result.summary
  try {
    await saveAnalysis({
      companyId,
      provider: AZURE_PROVIDER,
      integrationId: integration.id,
      analysisData: { summary: persistedSummary, findings: result.findings },
      parameters: { tenantId: integration.settings?.tenant_id || "" },
    })
  } catch (e) {
    log("error", endpoint, "saveAnalysis failed", { message: e.message })
  }

  return res.json(result)
}

async function disconnectAzure(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorTenantId = integration.settings?.tenant_id || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_tenant_id: priorTenantId },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  initiateAzureConsent,
  handleAzureConsentCallback,
  validateAzure,
  getAzureStatus,
  getAzureSubscriptions,
  refreshAzureSubscriptions,
  analyzeAzureCostLeaks: analyzeAzureCostLeaksHandler,
  disconnectAzure,
  // exported for later tasks:
  getIntegrationForUser, mapAzureError, log, AZURE_PROVIDER, LOGIN_BASE,
}
