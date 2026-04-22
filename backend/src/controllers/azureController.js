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
async function initiateAzureConsent(req, res)       { res.status(501).json({ error: "initiateAzureConsent not implemented" }) }
async function handleAzureConsentCallback(req, res) { res.status(501).send("handleAzureConsentCallback not implemented") }
async function validateAzure(req, res)              { res.status(501).json({ error: "validateAzure not implemented" }) }
async function getAzureStatus(req, res)             { res.status(501).json({ error: "getAzureStatus not implemented" }) }
async function getAzureSubscriptions(req, res)      { res.status(501).json({ error: "getAzureSubscriptions not implemented" }) }
async function refreshAzureSubscriptions(req, res)  { res.status(501).json({ error: "refreshAzureSubscriptions not implemented" }) }
async function analyzeAzureCostLeaksHandler(req, res) { res.status(501).json({ error: "analyze not implemented" }) }
async function disconnectAzure(req, res)            { res.status(501).json({ error: "disconnectAzure not implemented" }) }

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
