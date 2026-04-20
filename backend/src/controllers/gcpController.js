/**
 * GCP Controller
 *
 * Service-account-JSON based auth. No OAuth. Tokens are minted per-run from
 * the stored (encrypted) service account key.
 */

const { supabase } = require("../config/supabase")
const {
  encryptOAuthData,
  decryptOAuthData,
  decryptIntegrationSettings,
} = require("../utils/encryption")
const { parseServiceAccountKey, exchangeServiceAccountKeyForToken } = require("../utils/gcpAuth")
const { analyzeGcpCostLeaks, listActiveProjects } = require("../services/gcpRecommenderAnalysis")

const GCP_PROVIDER = "GCP"

function log(level, endpoint, message, data = null) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

// Integration lookup (same pattern as Slack, case-insensitive fallback)
async function getIntegrationForUser(user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }

  let { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", GCP_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) {
    const { data: all } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
    if (all) {
      integration = all.find((i) => i.provider?.toLowerCase() === "gcp")
    }
  }

  if (!integration) {
    return { error: "GCP integration not configured for this company", status: 400 }
  }
  return { integration, companyId: profile.company_id }
}

// Decrypt and return { serviceAccountKey: object, organizationId: string }
// Throws on decryption / parse failure.
function getCredentialsFromIntegration(integration) {
  const settings = decryptIntegrationSettings(integration.settings || {})
  const rawKey = settings.service_account_key
  const organizationId = settings.organization_id
  if (!rawKey || !organizationId) {
    const err = new Error("GCP integration is missing service_account_key or organization_id")
    err.code = "SA_NOT_CONFIGURED"
    throw err
  }
  // rawKey may have been stored as a JSON string originally — parseServiceAccountKey handles both
  const serviceAccountKey = parseServiceAccountKey(rawKey)
  return { serviceAccountKey, organizationId }
}

// --- handlers below, added in subsequent tasks ---

// Validate — performs token exchange + projects.list, marks connected on success
async function validateGcp(req, res) {
  const endpoint = "POST /api/integrations/gcp/validate"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })
  const { integration } = result

  let credentials
  try {
    credentials = getCredentialsFromIntegration(integration)
  } catch (e) {
    log("error", endpoint, `Credentials error: ${e.message}`)
    return res.status(400).json({ error: e.message, code: e.code })
  }

  try {
    const { accessToken } = await exchangeServiceAccountKeyForToken(credentials.serviceAccountKey)
    const projects = await listActiveProjects(accessToken, credentials.organizationId)

    await supabase
      .from("company_integrations")
      .update({ status: "connected" })
      .eq("id", integration.id)

    return res.json({
      success: true,
      organizationId: credentials.organizationId,
      projectCount: projects.length,
    })
  } catch (e) {
    log("error", endpoint, e.message)
    if (e.code === "SA_UNAUTHORIZED" || e.code === "SA_TOKEN_EXCHANGE_FAILED") {
      await supabase
        .from("company_integrations")
        .update({ status: "expired" })
        .eq("id", integration.id)
      return res.status(401).json({
        error: "Service account key is invalid or revoked. Please paste a fresh key.",
        code: e.code,
      })
    }
    if (e.code === "MISSING_ORG_ROLE" || e.status === 403) {
      await supabase
        .from("company_integrations")
        .update({ status: "error" })
        .eq("id", integration.id)
      return res.status(403).json({
        error: e.message,
        code: "MISSING_ORG_ROLE",
      })
    }
    return res.status(500).json({ error: e.message || "Validation failed" })
  }
}

// Status — returns connection state without token exchange
async function getGcpStatus(req, res) {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })
  const { integration } = result

  const settings = decryptIntegrationSettings(integration.settings || {})
  return res.json({
    success: true,
    status: {
      status: integration.status,
      organizationId: settings.organization_id || null,
      updatedAt: integration.updated_at,
      createdAt: integration.created_at,
    },
  })
}

module.exports = {
  validateGcp,
  getGcpStatus,
  getGcpProjects:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  analyzeGcpCostLeaks:   async (req, res) => res.status(501).json({ error: "not implemented" }),
  disconnectGcp:         async (req, res) => res.status(501).json({ error: "not implemented" }),
}
