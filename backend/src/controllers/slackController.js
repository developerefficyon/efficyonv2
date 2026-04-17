/**
 * Slack Controller
 * Handles Slack integration operations: BYO-app OAuth, users, team info, cost-leak analysis.
 *
 * Slack user tokens do not expire by default — there is no refresh flow.
 * Revocation is via auth.revoke.
 */

const { supabase } = require("../config/supabase")
const { encryptOAuthData, decryptOAuthData, decryptIntegrationSettings } = require("../utils/encryption")

const SLACK_API = "https://slack.com/api"
const SLACK_PROVIDER = "Slack"

// Slack Tier 2 methods (users.list) ~20/min; Tier 1 (team.info) ~100/min.
// We apply a coarse per-token limiter of 15 requests / 60s to stay safely under Tier 2.
const slackRateLimit = new Map()

function log(level, endpoint, message, data = null) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = slackRateLimit.get(accessToken)
  if (!limit || now > limit.resetTime) {
    for (const [k, v] of slackRateLimit) {
      if (now > v.resetTime) slackRateLimit.delete(k)
    }
    slackRateLimit.set(accessToken, { count: 1, resetTime: now + 60000 })
    return { allowed: true }
  }
  if (limit.count >= 15) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return { allowed: false, message: `Slack rate limit exceeded. Please wait ${waitTime}s.` }
  }
  limit.count++
  return { allowed: true }
}

// Call a Slack Web API method. All Slack responses are JSON with { ok: boolean, error?: string }.
async function callSlack(method, accessToken, params = {}) {
  const limit = checkRateLimit(accessToken)
  if (!limit.allowed) throw new Error(limit.message)

  const url = new URL(`${SLACK_API}/${method}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })

  if (!res.ok) {
    throw new Error(`Slack HTTP ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  if (!json.ok) {
    const err = json.error || "unknown_error"
    if (err === "token_revoked" || err === "invalid_auth" || err === "account_inactive") {
      const e = new Error("Slack token invalid or revoked. Please reconnect.")
      e.code = "TOKEN_EXPIRED"
      e.requiresReconnect = true
      throw e
    }
    if (err === "rate_limited") {
      const retryAfter = parseInt(res.headers.get("retry-after") || "30", 10)
      const e = new Error(`Slack rate limited (retry in ${retryAfter}s).`)
      e.code = "RATE_LIMITED"
      throw e
    }
    throw new Error(`Slack API error on ${method}: ${err}`)
  }
  return json
}

// Paginated helper for users.list
async function listAllUsers(accessToken) {
  const users = []
  let cursor = undefined
  let iterations = 0
  do {
    const page = await callSlack("users.list", accessToken, {
      limit: 200,
      cursor,
    })
    users.push(...(page.members || []))
    cursor = page.response_metadata?.next_cursor || ""
    iterations++
    if (iterations > 500) break // hard stop at 100k users
  } while (cursor)
  return users
}

// Lookup the integration row for the current user's company
async function getIntegrationForUser(user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }

  // Exact match first
  let { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", SLACK_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Case-insensitive fallback (matches HubSpot pattern)
  if (!integration) {
    const { data: all } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
    if (all) {
      integration = all.find((i) => i.provider?.toLowerCase() === "slack")
    }
  }

  if (!integration) {
    return { error: "Slack integration not configured for this company", status: 400 }
  }
  return { integration, companyId: profile.company_id }
}

// --- handlers below, added in subsequent tasks ---

// OAuth Start — redirects the browser to Slack's authorize URL
async function startSlackOAuth(req, res) {
  const endpoint = "GET /api/integrations/slack/oauth/start"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })
  const { integration, companyId } = result

  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id || integration?.client_id
  if (!clientId) {
    return res.status(400).json({
      error: "Slack Client ID not configured",
      details: "Update the integration with your Slack app Client ID and Client Secret.",
    })
  }

  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/slack/callback"

  // User-token scopes only (no bot token needed for v1)
  const userScope = "users:read,users:read.email,team:read"

  const authUrl = new URL("https://slack.com/oauth/v2/authorize")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("user_scope", userScope)
  authUrl.searchParams.set("redirect_uri", redirectUri)

  const state = Buffer.from(JSON.stringify({ company_id: companyId })).toString("base64url")
  authUrl.searchParams.set("state", state)

  log("log", endpoint, `Starting Slack OAuth for company ${companyId}`)
  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// OAuth Callback — exchanges code for access_token and persists encrypted
async function slackOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/slack/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  try {
    const { code, state, error, error_description } = req.query
    if (error) {
      log("error", endpoint, `Slack error: ${error} ${error_description || ""}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error&error=${encodeURIComponent(String(error))}`)
    }
    if (!code || !state) {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_missing_code`)
    }

    let decoded
    try {
      decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"))
    } catch {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_invalid_state`)
    }
    const companyId = decoded.company_id

    // Look up the pending integration (case-insensitive)
    const { data: all } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
    const integration = all?.find((i) => i.provider?.toLowerCase() === "slack")
    if (!integration) {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_integration_not_found`)
    }

    const settings = decryptIntegrationSettings(integration.settings || {})
    const clientId = settings.client_id || integration.client_id
    const clientSecret = settings.client_secret || integration.client_secret
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_missing_credentials`)
    }

    const redirectUri =
      process.env.SLACK_REDIRECT_URI ||
      "http://localhost:4000/api/integrations/slack/callback"

    // Exchange code for tokens via oauth.v2.access
    const tokenRes = await fetch(`${SLACK_API}/oauth.v2.access`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: String(code),
      }).toString(),
    })

    const tokenJson = await tokenRes.json()
    if (!tokenJson.ok) {
      log("error", endpoint, `Token exchange failed: ${tokenJson.error}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_token&details=${encodeURIComponent(tokenJson.error || "unknown")}`)
    }

    // Slack v2 returns authed_user.access_token for user scopes
    const userToken = tokenJson.authed_user?.access_token
    if (!userToken) {
      log("error", endpoint, "No authed_user.access_token in response")
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_missing_user_token`)
    }

    const newOauthData = {
      tokens: {
        access_token: userToken,
        // Slack user tokens don't expire; no refresh token flow.
        expires_at: null,
        token_type: "user",
      },
      team: tokenJson.team || null,
      authed_user: { id: tokenJson.authed_user?.id || null },
      scope: tokenJson.authed_user?.scope || "",
    }
    const encryptedOauthData = encryptOAuthData(newOauthData)
    const updatedSettings = { ...(integration.settings || {}), oauth_data: encryptedOauthData }

    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings, status: "connected" })
      .eq("id", integration.id)

    if (updateError) {
      log("error", endpoint, `Failed to save tokens: ${updateError.message}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_saving_tokens`)
    }

    log("log", endpoint, `Slack OAuth completed for integration ${integration.id}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?slack=connected`)
  } catch (e) {
    log("error", endpoint, `Unexpected error: ${e.message}`, { stack: e.stack })
    return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_unexpected`)
  }
}

// Get enriched user list from the connected Slack workspace
async function getSlackUsers(req, res) {
  const endpoint = "GET /api/integrations/slack/users"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const accessToken = oauthData?.tokens?.access_token
  if (!accessToken) return res.status(400).json({ error: "No access token. Please reconnect Slack." })

  try {
    const members = await listAllUsers(accessToken)
    // Trim to the fields the frontend needs
    const users = members.map((u) => ({
      id: u.id,
      name: u.name,
      real_name: u.real_name,
      email: u.profile?.email || null,
      is_bot: !!u.is_bot,
      deleted: !!u.deleted,
      is_restricted: !!u.is_restricted,
      is_ultra_restricted: !!u.is_ultra_restricted,
      updated: u.updated || null,
    }))
    return res.json({ success: true, users, total: users.length })
  } catch (error) {
    log("error", endpoint, error.message)
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    if (error.code === "RATE_LIMITED") {
      return res.status(429).json({ error: error.message })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get team info + billable seat map
async function getSlackTeam(req, res) {
  const endpoint = "GET /api/integrations/slack/team"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const accessToken = oauthData?.tokens?.access_token
  if (!accessToken) return res.status(400).json({ error: "No access token. Please reconnect Slack." })

  try {
    const [teamJson, billableJson] = await Promise.all([
      callSlack("team.info", accessToken),
      // team.billableInfo may not be available on every plan — catch separately
      callSlack("team.billableInfo", accessToken).catch((e) => {
        log("warn", endpoint, `team.billableInfo unavailable: ${e.message}`)
        return null
      }),
    ])

    const teamInfo = teamJson.team
      ? {
          id: teamJson.team.id,
          name: teamJson.team.name,
          domain: teamJson.team.domain,
          plan: teamJson.team.plan || null,
        }
      : null

    return res.json({
      success: true,
      team: teamInfo,
      billableInfo: billableJson?.billable_info || null,
      billableSource: billableJson ? "team.billableInfo" : "unavailable",
    })
  } catch (error) {
    log("error", endpoint, error.message)
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

const { analyzeSlackCostLeaks: runAnalysis } = require("../services/slackCostLeakAnalysis")

// Analyze Slack cost leaks — the frontend (analysis-tab.tsx) POSTs the returned
// payload to /api/analysis-history for persistence, matching the pattern used
// by Fortnox, HubSpot, Shopify, M365, QuickBooks, and GoogleWorkspace.
async function analyzeSlackCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/slack/cost-leaks"
  const inactivityDays = parseInt(req.query.inactivityDays, 10) || 30

  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const settings = decryptIntegrationSettings(integration.settings || {})
  const oauthData = decryptOAuthData(settings.oauth_data || integration.oauth_data)
  const accessToken = oauthData?.tokens?.access_token
  if (!accessToken) return res.status(400).json({ error: "No access token. Please reconnect Slack." })

  const overridePlan = settings.pricing?.tier || null
  const overrideSeats = settings.pricing?.paid_seats || null

  try {
    const [members, teamJson, billableJson] = await Promise.all([
      listAllUsers(accessToken),
      callSlack("team.info", accessToken),
      callSlack("team.billableInfo", accessToken).catch((e) => {
        log("warn", endpoint, `team.billableInfo unavailable: ${e.message}`)
        return null
      }),
    ])

    const analysis = runAnalysis({
      users: members,
      billableInfo: billableJson?.billable_info || null,
      teamInfo: teamJson.team || {},
      inactivityDays,
      overridePlan,
      overrideSeats,
    })

    log("log", endpoint, `Analysis completed: ${analysis.summary.issuesFound} findings, $${analysis.summary.potentialMonthlySavings || 0}/mo savings`)
    return res.json(analysis)
  } catch (error) {
    log("error", endpoint, error.message)
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    if (error.code === "RATE_LIMITED") {
      return res.status(429).json({ error: error.message })
    }
    return res.status(500).json({
      error: error.message || "Failed to analyze Slack cost leaks",
    })
  }
}

// Revoke Slack token (auth.revoke)
async function revokeSlackToken(accessToken) {
  if (!accessToken) return { success: false, error: "No access token" }
  try {
    const res = await fetch(`${SLACK_API}/auth.revoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    const json = await res.json()
    if (json.ok && json.revoked) return { success: true }
    return { success: false, error: json.error || "unknown" }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function disconnectSlack(req, res) {
  const endpoint = "DELETE /api/integrations/slack/disconnect"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || {})
  const accessToken = oauthData?.tokens?.access_token
  if (accessToken) await revokeSlackToken(accessToken)

  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings, oauth_data: null }

  const { error: updateError } = await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings, status: "disconnected" })
    .eq("id", integration.id)

  if (updateError) {
    return res.status(500).json({ error: `Failed to disconnect: ${updateError.message}` })
  }

  return res.json({ success: true })
}

module.exports = {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackUsers,
  getSlackTeam,
  analyzeSlackCostLeaks: analyzeSlackCostLeaksEndpoint,
  disconnectSlack,
}
