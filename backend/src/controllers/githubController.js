/**
 * GitHub Controller
 *
 * Auth = Per-customer GitHub App. Each customer creates a GitHub App in their
 * own org, installs it, and provides App ID + Private Key PEM + Installation ID.
 * All three secrets are encrypted at rest. Installation tokens (1-hour TTL) are
 * minted by signing a short-lived RS256 JWT with the customer's private key and
 * exchanging it via POST /app/installations/{id}/access_tokens.
 *
 * Three finding generators: inactive Copilot seats, inactive paid org members,
 * Copilot over-provisioning.
 *
 * Task 5: scaffolding + six handlers — mirrors Zoom Tasks 5-7 pattern.
 */

const { supabase } = require("../config/supabase")
const {
  encryptGitHubCredentials,
  decryptGitHubCredentials,
  getGitHubInstallationToken,
  evictToken,
  API_BASE,
} = require("../utils/githubAuth")
const { analyzeGitHubCostLeaks } = require("../services/githubCostLeakAnalysis")
const { listMembers } = require("../services/githubUsageAnalysis")

const GITHUB_PROVIDER = "GitHub"

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
    .ilike("provider", GITHUB_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "GitHub integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapGitHubError(e) {
  const code = e?.code || ""
  if (code === "JWT_SIGN_FAILED") {
    return {
      status: 500,
      message: e.message,
      hint: "The Private Key you provided couldn't sign a JWT — verify it's the full PEM including BEGIN/END lines.",
    }
  }
  if (code === "INSTALL_TOKEN_FAILED") {
    return {
      status: 401,
      message: e.message,
      hint: "GitHub rejected the App credentials — verify App ID and Private Key match the same GitHub App.",
    }
  }
  if (e.httpStatus === 401) {
    return {
      status: 401,
      message: e.message,
      hint: "GitHub returned 401 — the installation token may have expired or been revoked. Disconnect and reconnect.",
    }
  }
  if (e.httpStatus === 404) {
    return {
      status: 404,
      message: e.message,
      hint: "Installation ID not found — make sure the app is installed on your org and the ID is correct.",
    }
  }
  if (e.httpStatus === 403 && (e.message?.includes("Copilot") || e.message?.includes("copilot"))) {
    return {
      status: 409,
      message: e.message,
      hint: "Copilot Business isn't enabled on this org, or the App lacks the Copilot Business Read permission.",
    }
  }
  if (e.httpStatus === 403) {
    return {
      status: 403,
      message: e.message,
      hint: "The GitHub App is missing a required permission — re-check the three org-level permissions and reinstall.",
    }
  }
  if (e.httpStatus === 429 || e.message?.includes("rate limit")) {
    return {
      status: 503,
      message: e.message,
      hint: "GitHub throttled the request — retry in a minute.",
    }
  }
  return { status: 500, message: e.message || "Unexpected GitHub error", hint: null }
}

// ---------------------------------------------------------------------------
// Handler: validateGitHub
// Handles the _pending_github_creds → encrypted upgrade on first validate,
// then mints an installation token and confirms the installation is reachable.
// ---------------------------------------------------------------------------
async function validateGitHub(req, res) {
  const endpoint = "POST /api/integrations/github/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  let { integration } = lookup

  // Upgrade plaintext-on-first-validate → encrypted persistent form.
  if (integration.settings?._pending_github_creds) {
    try {
      const { appId, privateKey, installationId } = integration.settings._pending_github_creds
      const encrypted = encryptGitHubCredentials({ appId, privateKey, installationId })
      const { _pending_github_creds, ...rest } = integration.settings
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
      return res.status(400).json({ error: e.message, hint: "Ensure appId, privateKey, and installationId are all provided." })
    }
  }

  try {
    const token = await getGitHubInstallationToken(integration)

    // Resolve org login: call /installation/repositories?per_page=1 using the
    // installation token. The first repo's owner.login is the org (or user for
    // user-owned installs). If no repos returned, fall back to the installation
    // metadata endpoint using the app JWT.
    let orgLogin = null
    let installationTargetType = null
    let repositorySelection = null

    const reposRes = await fetch(`${API_BASE}/installation/repositories?per_page=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    const reposBody = await reposRes.json().catch(() => ({}))

    if (reposRes.ok) {
      repositorySelection = reposBody.repository_selection || null
      const firstRepo = (reposBody.repositories || [])[0]
      if (firstRepo?.owner?.login) {
        orgLogin = firstRepo.owner.login
        installationTargetType = firstRepo.owner.type === "Organization" ? "Organization" : "User"
      }
    }

    // Fallback: if no repos accessible, log a warning. org_login remains null
    // and the user will see it unset in the status endpoint. This is an edge case
    // for apps installed with no repo access or a brand-new empty org.
    if (!orgLogin) {
      log("warn", endpoint, "No repos found in installation — org_login will be null")
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          org_login: orgLogin,
          installation_target_type: installationTargetType,
          repository_selection: repositorySelection,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)

    return res.json({
      status: "connected",
      orgLogin,
      lastValidatedAt: nowIso,
    })
  } catch (e) {
    const mapped = mapGitHubError(e)
    log("error", endpoint, "validation failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getGitHubStatus
// Returns integration metadata from settings — no token needed.
// ---------------------------------------------------------------------------
async function getGitHubStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    orgLogin: s.org_login || null,
    planTier: s.plan_tier || null,
    copilotTier: s.copilot_tier || null,
    installedAt: s.installed_at || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// ---------------------------------------------------------------------------
// Handler: getGitHubMembersHandler (exported as getGitHubMembers)
// Fetches the org member list and caps it at 500.
// ---------------------------------------------------------------------------
async function getGitHubMembersHandler(req, res) {
  const endpoint = "GET /api/integrations/github/members"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const org = integration.settings?.org_login || null
  if (!org) {
    return res.status(400).json({ error: "Org login not set — run validate first." })
  }
  try {
    const token = await getGitHubInstallationToken(integration)
    const members = await listMembers(token, org)
    return res.json({ members: members.slice(0, 500) })
  } catch (e) {
    const mapped = mapGitHubError(e)
    log("error", endpoint, "listMembers failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: getGitHubOrgHandler (exported as getGitHubOrg)
// Returns the raw org info object from GitHub.
// ---------------------------------------------------------------------------
async function getGitHubOrgHandler(req, res) {
  const endpoint = "GET /api/integrations/github/org"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const org = integration.settings?.org_login || null
  if (!org) {
    return res.status(400).json({ error: "Org login not set — run validate first." })
  }
  try {
    const token = await getGitHubInstallationToken(integration)
    const orgRes = await fetch(`${API_BASE}/orgs/${org}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    const orgBody = await orgRes.json().catch(() => ({}))
    if (!orgRes.ok) {
      const err = new Error(orgBody.message || `HTTP ${orgRes.status}`)
      err.httpStatus = orgRes.status
      throw err
    }
    return res.json({ org: orgBody })
  } catch (e) {
    const mapped = mapGitHubError(e)
    log("error", endpoint, "getOrg failed", { code: e.code, message: e.message })
    if (e.httpStatus === 404) {
      return res.status(404).json({
        error: mapped.message,
        hint: "Installation may have been removed — re-install the GitHub App on your org and re-validate.",
      })
    }
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
}

// ---------------------------------------------------------------------------
// Handler: analyzeGitHubCostLeaksHandler (exported as analyzeGitHubCostLeaks)
// Duplicate-check → get token → run analysis → strip sourceErrors → saveAnalysis.
// ---------------------------------------------------------------------------
async function analyzeGitHubCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/github/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration not connected. Re-run validate first." })
  }

  const planTier = integration.settings?.plan_tier || ""
  const copilotTier = integration.settings?.copilot_tier || ""
  const inactivityDays = integration.settings?.inactivity_days || 30

  // Duplicate-check: same integration within 5 minutes → 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", GITHUB_PROVIDER)
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
    const token = await getGitHubInstallationToken(integration)
    result = await analyzeGitHubCostLeaks(token, integration.settings)
  } catch (e) {
    const mapped = mapGitHubError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // Strip sourceErrors from response. Persistence via the frontend's subsequent
  // POST /api/analysis-history (matches the 8 older integrations' pattern).
  const { sourceErrors, ...summaryWithoutSourceErrors } = result.summary
  return res.json({ summary: summaryWithoutSourceErrors, findings: result.findings })
}

// ---------------------------------------------------------------------------
// Handler: disconnectGitHub
// Clears encrypted creds, keeps audit breadcrumb, flips status, evicts token.
// ---------------------------------------------------------------------------
async function disconnectGitHub(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorOrgLogin = integration.settings?.org_login || null
  await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_org_login: priorOrgLogin },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}

module.exports = {
  validateGitHub,
  getGitHubStatus,
  getGitHubMembers: getGitHubMembersHandler,
  getGitHubOrg: getGitHubOrgHandler,
  analyzeGitHubCostLeaks: analyzeGitHubCostLeaksHandler,
  disconnectGitHub,
  // exported for Task 6 wiring:
  getIntegrationForUser,
  mapGitHubError,
  log,
  GITHUB_PROVIDER,
}
