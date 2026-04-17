/**
 * Slack Controller
 * Handles Slack integration operations: BYO-app OAuth, users, team info, cost-leak analysis.
 *
 * Slack user tokens do not expire by default — there is no refresh flow.
 * Revocation is via auth.revoke.
 */

const { supabase } = require("../config/supabase")
const { analyzeSlackCostLeaks } = require("../services/slackCostLeakAnalysis")
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

module.exports = {
  // OAuth
  startSlackOAuth:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  slackOAuthCallback:     async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Data
  getSlackUsers:          async (req, res) => res.status(501).json({ error: "not implemented" }),
  getSlackTeam:           async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Analysis
  analyzeSlackCostLeaks:  async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Disconnect
  disconnectSlack:        async (req, res) => res.status(501).json({ error: "not implemented" }),
}
