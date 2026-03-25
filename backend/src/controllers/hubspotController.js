/**
 * HubSpot Controller
 * Handles all HubSpot integration operations: OAuth, users, seats, cost analysis
 */

const { supabase } = require("../config/supabase")
const { analyzeHubSpotCostLeaks } = require("../services/hubspotCostLeakAnalysis")
const { encryptOAuthData, decryptOAuthData, decryptIntegrationSettings } = require("../utils/encryption")

// Helper for logging
const log = (level, endpoint, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${endpoint} - ${message}`
  if (data) {
    console[level](logMessage, data)
  } else {
    console[level](logMessage)
  }
}

// Rate limiting for HubSpot API (100 requests per 10 seconds)
const hubspotRateLimit = new Map()

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = hubspotRateLimit.get(accessToken)

  if (!limit || now > limit.resetTime) {
    // Clean up expired entries to prevent unbounded Map growth across token refreshes
    for (const [token, entry] of hubspotRateLimit) {
      if (now > entry.resetTime) hubspotRateLimit.delete(token)
    }
    hubspotRateLimit.set(accessToken, { count: 1, resetTime: now + 10000 }) // 10 seconds
    return { allowed: true, remaining: 99 }
  }

  if (limit.count >= 100) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetIn: waitTime,
      message: `Rate limit exceeded. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`
    }
  }

  limit.count++
  return { allowed: true, remaining: 100 - limit.count }
}

// Token refresh locks — Promise-based to block concurrent refreshes per integration
const tokenRefreshLocks = new Map()

// Helper function to perform the actual HubSpot token refresh
async function doHubSpotTokenRefresh(integration, tokens) {
  const now = Math.floor(Date.now() / 1000)

  log("log", "Token refresh", "Performing HubSpot token refresh")

  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret || ""

  if (!clientId || !clientSecret) {
    throw new Error("Client ID or Client Secret not found in integration settings")
  }

  const tokenEndpoint = "https://api.hubapi.com/oauth/v1/token"

  const refreshResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
    }).toString(),
  })

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text()
    log("error", "Token refresh", `Failed: ${errorText}`)

    let errorData = {}
    try { errorData = JSON.parse(errorText) } catch (e) { /* Not JSON */ }

    if (errorData.status === "BAD_AUTH" || errorData.error === "invalid_grant") {
      await supabase
        .from("company_integrations")
        .update({ status: "expired" })
        .eq("id", integration.id)

      const error = new Error("Token expired. Please reconnect your HubSpot integration.")
      error.code = "TOKEN_EXPIRED"
      error.requiresReconnect = true
      throw error
    }

    throw new Error("Token refresh failed. Please reconnect HubSpot.")
  }

  const refreshData = await refreshResponse.json()
  const expiresIn = refreshData.expires_in || 1800
  const newExpiresAt = now + expiresIn

  const currentOauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data || {})
  const currentTokens = currentOauthData.tokens || {}
  const updatedOauthData = {
    ...currentOauthData,
    tokens: {
      ...currentTokens,
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || currentTokens.refresh_token,
      expires_in: expiresIn,
      expires_at: newExpiresAt,
    },
  }

  const encryptedOauthData = encryptOAuthData(updatedOauthData)
  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings, oauth_data: encryptedOauthData }

  const { error: updateError } = await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings, status: "connected" })
    .eq("id", integration.id)

  if (updateError) {
    log("error", "Token refresh", `Failed to persist new token: ${updateError.message}`)
    // Continue — new token is still valid in memory for this request
  }

  log("log", "Token refresh", "Token refreshed successfully")
  return refreshData.access_token
}

// Helper function to refresh token if needed (Promise-based lock prevents concurrent refreshes)
async function refreshHubSpotTokenIfNeeded(integration, tokens) {
  const integrationId = integration.id

  // If integration is already marked expired, fail fast without hitting the API
  if (integration.status === "expired") {
    const error = new Error("Token expired. Please reconnect your HubSpot integration.")
    error.code = "TOKEN_EXPIRED"
    error.requiresReconnect = true
    throw error
  }

  // If a refresh is already in progress, await that same Promise
  if (tokenRefreshLocks.has(integrationId)) {
    log("log", "Token refresh", "Waiting for existing refresh to complete")
    try {
      return await tokenRefreshLocks.get(integrationId)
    } catch (error) {
      // Existing refresh failed — re-fetch integration to get any tokens that may have been saved
      const { data: freshIntegration } = await supabase
        .from("company_integrations")
        .select("*")
        .eq("id", integrationId)
        .maybeSingle()

      if (freshIntegration) {
        const freshOauthData = decryptOAuthData(freshIntegration.settings?.oauth_data || {})
        const freshTokens = freshOauthData?.tokens
        if (freshTokens?.access_token) return freshTokens.access_token
      }
      throw error
    }
  }

  // Check if token actually needs refresh (5 minute buffer)
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)

  if (!expiresAt || now < (expiresAt - 300)) {
    return tokens.access_token
  }

  // Token needs refresh — acquire lock so concurrent requests share this refresh
  log("log", "Token refresh", "HubSpot token refresh needed, acquiring lock")
  const refreshPromise = doHubSpotTokenRefresh(integration, tokens)
  tokenRefreshLocks.set(integrationId, refreshPromise)

  try {
    return await refreshPromise
  } finally {
    tokenRefreshLocks.delete(integrationId)
  }
}

// Helper function to fetch HubSpot API data
async function fetchHubSpotData(endpoint, accessToken, scopeName) {
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
  }

  const url = endpoint.startsWith("https://") ? endpoint : `https://api.hubapi.com${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) { /* Not JSON */ }

    if (response.status === 403) {
      const errorMessage = errorData.message || errorText || "Access denied"
      throw new Error(`Missing ${scopeName} permission: ${errorMessage}`)
    }

    if (response.status === 401) {
      throw new Error("Access token expired or invalid. Please reconnect HubSpot.")
    }

    throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Helper to get integration for current user
async function getIntegrationForUser(user, provider = "HubSpot") {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    log("error", "getIntegrationForUser", `No company found for user ${user.id}`)
    return { error: "No company associated with this user", status: 400 }
  }

  // First try exact match
  let { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // If not found, try case-insensitive match
  if (!integration && !integrationError) {
    const { data: allIntegrations } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })

    if (allIntegrations) {
      integration = allIntegrations.find(i =>
        i.provider?.toLowerCase() === provider.toLowerCase()
      )
      if (integration) {
        log("log", "getIntegrationForUser", `Found integration with provider "${integration.provider}" (case-insensitive match)`)
      }
    }
  }

  if (integrationError || !integration) {
    log("error", "getIntegrationForUser", `${provider} integration not found for company ${profile.company_id}`)
    return { error: `${provider} integration not configured for this company`, status: 400 }
  }

  log("log", "getIntegrationForUser", `Found ${provider} integration, id: ${integration.id}, status: ${integration.status}`)
  return { integration, companyId: profile.company_id }
}

// OAuth Start
async function startHubSpotOAuth(req, res) {
  const endpoint = "GET /api/integrations/hubspot/oauth/start"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "HubSpot")
  if (result.error) {
    log("error", endpoint, `Failed to get integration: ${result.error}`)
    return res.status(result.status).json({ error: result.error })
  }

  const { integration, companyId } = result
  log("log", endpoint, `Found integration for company ${companyId}, integration id: ${integration.id}`)

  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id || integration?.client_id

  if (!clientId) {
    log("error", endpoint, "Client ID not found in integration settings")
    return res.status(400).json({
      error: "HubSpot Client ID not configured",
      details: "Please update the integration with your Client ID and Client Secret."
    })
  }

  const redirectUri = process.env.HUBSPOT_REDIRECT_URI || "http://localhost:4000/api/integrations/hubspot/callback"

  // Scopes for user and billing data access
  const scope = "settings.users.read settings.users.write account-info.security.read crm.objects.contacts.read"

  const authUrl = new URL("https://app.hubspot.com/oauth/authorize")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", scope)

  const statePayload = { company_id: companyId }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()

  log("log", endpoint, `Starting HubSpot OAuth for company ${companyId}, redirect_uri: ${redirectUri}`)

  const acceptHeader = req.headers.accept || ""
  if (acceptHeader.includes("application/json")) {
    return res.json({ url: authUrlString })
  }

  return res.redirect(authUrlString)
}

// OAuth Callback
async function hubspotOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/hubspot/callback"
  log("log", endpoint, "Request received", { query: req.query })

  if (!supabase) {
    return res.status(500).send("Supabase not configured on backend")
  }

  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  try {
  const { code, state, error, error_description } = req.query

  log("log", endpoint, `Callback params - code: ${code ? "present" : "missing"}, state: ${state ? "present" : "missing"}, error: ${error || "none"}`)

  // Helper to clean up pending integration on OAuth failure
  const cleanupPendingIntegration = async (companyId) => {
    try {
      const { data: pending } = await supabase
        .from("company_integrations")
        .select("id, status")
        .eq("company_id", companyId)
        .ilike("provider", "hubspot")
        .eq("status", "pending")
        .maybeSingle()
      if (pending) {
        await supabase.from("company_integrations").delete().eq("id", pending.id)
        log("log", endpoint, `Cleaned up pending HubSpot integration ${pending.id}`)
      }
    } catch (e) {
      log("error", endpoint, `Failed to cleanup pending integration: ${e.message}`)
    }
  }

  if (error) {
    log("error", endpoint, `Error from HubSpot: ${error} ${error_description || ""}`)
    if (state) {
      try {
        const s = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
        if (s.company_id) await cleanupPendingIntegration(s.company_id)
      } catch { /* ignore parse errors */ }
    }
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error&error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    log("error", endpoint, `Missing params - code: ${!!code}, state: ${!!state}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_missing_code`)
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
    log("log", endpoint, `Decoded state - company_id: ${decodedState.company_id}`)
  } catch (e) {
    log("error", endpoint, `Failed to decode state: ${e.message}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_invalid_state`)
  }

  const companyId = decodedState.company_id

  // Try both "HubSpot" and "hubspot" to handle case sensitivity
  let integration = null
  let integrationError = null

  // First try exact match
  const { data: exactMatch, error: exactError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "HubSpot")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (exactMatch) {
    integration = exactMatch
    log("log", endpoint, `Found integration with provider "HubSpot", id: ${integration.id}`)
  } else {
    // Try case-insensitive match
    const { data: allIntegrations, error: allError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (allIntegrations) {
      integration = allIntegrations.find(i =>
        i.provider?.toLowerCase() === "hubspot"
      )
      if (integration) {
        log("log", endpoint, `Found integration with provider "${integration.provider}" (case-insensitive), id: ${integration.id}`)
      } else {
        log("error", endpoint, `No HubSpot integration found. Available providers: ${allIntegrations.map(i => i.provider).join(", ")}`)
      }
    }
    integrationError = exactError || allError
  }

  if (integrationError || !integration) {
    log("error", endpoint, `Integration not found for company ${companyId}`, { error: integrationError?.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_integration_not_found`)
  }

  // Decrypt settings to get client credentials
  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret

  log("log", endpoint, `Credentials check - clientId: ${clientId ? "present" : "missing"}, clientSecret: ${clientSecret ? "present" : "missing"}`)

  if (!clientId || !clientSecret) {
    log("error", endpoint, "Client ID or Secret missing from integration settings")
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_missing_credentials`)
  }

  const redirectUri = process.env.HUBSPOT_REDIRECT_URI || "http://localhost:4000/api/integrations/hubspot/callback"
  log("log", endpoint, `Using redirect URI: ${redirectUri}`)

  try {
    // Exchange code for tokens
    const tokenEndpoint = "https://api.hubapi.com/oauth/v1/token"

    log("log", endpoint, "Exchanging authorization code for tokens...")

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: String(code),
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      log("error", endpoint, `Token exchange failed (${tokenResponse.status}): ${errorText}`)
      if (integration.status === "pending") await cleanupPendingIntegration(companyId)
      // Include more detail in the redirect for debugging
      return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_token&details=${encodeURIComponent(errorText.substring(0, 100))}`)
    }

    const tokenData = await tokenResponse.json()
    log("log", endpoint, `Token exchange successful - access_token: ${tokenData.access_token ? "present" : "missing"}, refresh_token: ${tokenData.refresh_token ? "present" : "missing"}`)

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = tokenData.expires_in || 1800 // 30 minutes default
    const expiresAt = now + expiresIn

    const newOauthData = {
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: expiresIn,
        expires_at: expiresAt,
        token_type: tokenData.token_type || "Bearer",
      },
    }

    // Encrypt sensitive OAuth data before saving
    const encryptedOauthData = encryptOAuthData(newOauthData)

    const currentSettings = integration.settings || {}
    const updatedSettings = { ...currentSettings, oauth_data: encryptedOauthData }

    // Auto-detect paid seats if not provided by the user
    const decryptedSettings = decryptIntegrationSettings(currentSettings)
    const existingSeats = decryptedSettings?.pricing?.paid_seats
    if (!existingSeats) {
      try {
        log("log", endpoint, "No paid seats configured, auto-detecting from HubSpot users API...")
        const usersData = await fetchHubSpotData("/settings/v3/users", tokenData.access_token, "settings.users.read")
        const userCount = usersData.results?.length || 0
        if (userCount > 0) {
          updatedSettings.pricing = {
            ...(updatedSettings.pricing || {}),
            paid_seats: userCount,
            seats_auto_detected: true,
          }
          log("log", endpoint, `Auto-detected ${userCount} users as paid seats`)
        }
      } catch (seatsError) {
        log("warn", endpoint, `Could not auto-detect seats: ${seatsError.message}`)
        // Non-fatal — continue without auto-detected seats
      }
    }

    // Update integration with new tokens
    log("log", endpoint, `Updating integration ${integration.id} with new tokens...`)
    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings, status: "connected" })
      .eq("id", integration.id)

    if (updateError) {
      log("error", endpoint, `Failed to save tokens: ${updateError.message}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_saving_tokens`)
    }

    log("log", endpoint, `HubSpot OAuth completed successfully for integration ${integration.id}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=connected`)
  } catch (e) {
    log("error", endpoint, `Unexpected error (inner): ${e.message}`, { stack: e.stack })
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_unexpected&details=${encodeURIComponent((e.message || "Unknown error").substring(0, 150))}`)
  }
  } catch (outerError) {
    log("error", endpoint, `Unexpected error (outer): ${outerError.message}`, { stack: outerError.stack })
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_unexpected&details=${encodeURIComponent((outerError.message || "Unknown error").substring(0, 150))}`)
  }
}

// Get HubSpot Users (with seat info)
async function getHubSpotUsers(req, res) {
  const endpoint = "GET /api/integrations/hubspot/users"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "HubSpot")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect HubSpot." })
  }

  try {
    const accessToken = await refreshHubSpotTokenIfNeeded(integration, tokens)

    // Fetch users from HubSpot Settings API
    const usersData = await fetchHubSpotData("/settings/v3/users", accessToken, "settings.users.read")

    return res.json({
      success: true,
      users: usersData.results || [],
      total: usersData.results?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get HubSpot Account Info
async function getHubSpotAccountInfo(req, res) {
  const endpoint = "GET /api/integrations/hubspot/account"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "HubSpot")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect HubSpot." })
  }

  try {
    const accessToken = await refreshHubSpotTokenIfNeeded(integration, tokens)

    // Get access token info which includes Hub ID and account details
    const tokenInfo = await fetchHubSpotData(`/oauth/v1/access-tokens/${accessToken}`, accessToken, "account-info")

    return res.json({
      success: true,
      account: {
        hubId: tokenInfo.hub_id,
        hubDomain: tokenInfo.hub_domain,
        userId: tokenInfo.user_id,
        userEmail: tokenInfo.user,
        appId: tokenInfo.app_id,
        scopes: tokenInfo.scopes,
      },
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Analyze HubSpot Cost Leaks (Seat Usage)
async function analyzeHubSpotCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/hubspot/cost-leaks"
  log("log", endpoint, "Request received")

  // Get inactivity threshold parameter (default: 30 days)
  const inactivityDays = parseInt(req.query.inactivityDays) || 30
  log("log", endpoint, `Using inactivity threshold: ${inactivityDays} days`)

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "HubSpot")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  // Decrypt settings to get pricing info and OAuth data
  const settings = decryptIntegrationSettings(integration.settings || {})
  const oauthData = decryptOAuthData(settings.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  // Get pricing info from integration settings
  const pricing = settings.pricing || null
  if (pricing) {
    log("log", endpoint, `Found pricing info: ${pricing.hub_type} ${pricing.tier}, ${pricing.paid_seats} seats`)
  } else {
    log("warn", endpoint, "No pricing info found in integration settings, will use default estimate")
  }

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect HubSpot." })
  }

  try {
    const accessToken = await refreshHubSpotTokenIfNeeded(integration, tokens)

    // Fetch users data for analysis
    const usersData = await fetchHubSpotData("/settings/v3/users", accessToken, "settings.users.read")

    // Get account info for context
    let accountInfo = null
    try {
      accountInfo = await fetchHubSpotData(`/oauth/v1/access-tokens/${accessToken}`, accessToken, "account-info")
    } catch (e) {
      log("warn", endpoint, `Could not fetch account info: ${e.message}`)
    }

    const users = usersData.results || []

    // Log user data structure for debugging (first user only)
    if (users.length > 0) {
      log("log", endpoint, `Sample user fields: ${Object.keys(users[0]).join(", ")}`)
      // Log all users with their key fields for debugging
      users.forEach((u, i) => {
        log("log", endpoint, `User ${i + 1}: ${u.email} | superAdmin: ${u.superAdmin} | roleIds: ${JSON.stringify(u.roleIds)} | status: ${u.status || 'N/A'} | userProvisioningState: ${u.userProvisioningState || 'N/A'}`)
      })
    }

    // Run cost leak analysis with inactivity threshold and pricing info
    const analysis = analyzeHubSpotCostLeaks(users, accountInfo, {
      inactiveDays: inactivityDays,
      pricing: pricing,
    })

    // Add inactivity threshold to response
    analysis.inactivityThreshold = inactivityDays

    log("log", endpoint, `Analysis completed, ${analysis.summary?.issuesFound || 0} findings, potential savings: $${analysis.summary?.potentialMonthlySavings || 0}/month`)

    // Enhance with AI
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    if (OPENROUTER_KEY) {
      try {
        const openaiService = require("../services/openaiService")

        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalUsers: users.length,
            issuesFound: analysis.summary?.issuesFound || 0,
            potentialMonthlySavings: analysis.summary?.potentialMonthlySavings || 0,
            healthScore: analysis.summary?.healthScore || 0,
          },
          findings: analysis.findings || [],
        })

        if (aiSummary) {
          analysis.aiSummary = aiSummary
        }

        const findings = analysis.findings || []
        if (findings.length > 0) {
          const enhancedFindings = await openaiService.enhanceFindingsWithAI(findings)
          if (enhancedFindings && Array.isArray(enhancedFindings) && enhancedFindings.length > 0) {
            analysis.findings = enhancedFindings
          }
        }

        analysis.aiEnhanced = true
        analysis.enhancedAt = new Date().toISOString()
      } catch (aiError) {
        log("error", endpoint, "AI enhancement failed:", aiError.message)
        analysis.aiError = aiError.message
      }
    }

    return res.json(analysis)
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({
      error: error.message || "Failed to analyze HubSpot cost leaks",
      details: error.stack || "No additional details"
    })
  }
}

// Revoke HubSpot token (called when disconnecting/deleting integration)
async function revokeHubSpotToken(refreshToken) {
  const endpoint = "revokeHubSpotToken"

  if (!refreshToken) {
    log("warn", endpoint, "No refresh token provided for revocation")
    return { success: false, error: "No refresh token" }
  }

  try {
    log("log", endpoint, "Revoking HubSpot refresh token...")

    // HubSpot token revocation endpoint
    const response = await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${refreshToken}`, {
      method: "DELETE",
    })

    if (response.ok || response.status === 204) {
      log("log", endpoint, "HubSpot token revoked successfully")
      return { success: true }
    } else {
      const errorText = await response.text()
      log("warn", endpoint, `Token revocation returned ${response.status}: ${errorText}`)
      // Don't fail the deletion if revocation fails - the token will expire eventually
      return { success: false, error: errorText }
    }
  } catch (error) {
    log("error", endpoint, `Token revocation error: ${error.message}`)
    // Don't fail the deletion if revocation fails
    return { success: false, error: error.message }
  }
}

// Disconnect HubSpot integration (revoke token and update status)
async function disconnectHubSpot(req, res) {
  const endpoint = "DELETE /api/integrations/hubspot/disconnect"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "HubSpot")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  // Get the refresh token to revoke
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || {})
  const refreshToken = oauthData?.tokens?.refresh_token

  // Revoke the token from HubSpot
  if (refreshToken) {
    await revokeHubSpotToken(refreshToken)
  }

  // Update integration status to disconnected and clear oauth data
  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings, oauth_data: null }

  const { error: updateError } = await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings, status: "disconnected" })
    .eq("id", integration.id)

  if (updateError) {
    log("error", endpoint, `Failed to update integration: ${updateError.message}`)
    return res.status(500).json({ error: "Failed to disconnect HubSpot" })
  }

  log("log", endpoint, "HubSpot disconnected successfully")
  return res.json({ success: true, message: "HubSpot disconnected. You will need to re-authorize when reconnecting." })
}

module.exports = {
  startHubSpotOAuth,
  hubspotOAuthCallback,
  getHubSpotUsers,
  getHubSpotAccountInfo,
  analyzeHubSpotCostLeaks: analyzeHubSpotCostLeaksEndpoint,
  disconnectHubSpot,
  revokeHubSpotToken,
  // Export helpers for use in comparison controller
  refreshHubSpotTokenIfNeeded,
  fetchHubSpotData,
  getIntegrationForUser,
}
