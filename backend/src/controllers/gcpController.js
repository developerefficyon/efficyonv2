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

module.exports = {
  validateGcp:           async (req, res) => res.status(501).json({ error: "not implemented" }),
  getGcpStatus:          async (req, res) => res.status(501).json({ error: "not implemented" }),
  getGcpProjects:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  analyzeGcpCostLeaks:   async (req, res) => res.status(501).json({ error: "not implemented" }),
  disconnectGcp:         async (req, res) => res.status(501).json({ error: "not implemented" }),
}
