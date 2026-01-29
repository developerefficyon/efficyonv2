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

// Token refresh lock to prevent race conditions
const tokenRefreshLock = new Map()

// Helper function to refresh token if needed
async function refreshHubSpotTokenIfNeeded(integration, tokens) {
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  // HubSpot tokens expire in 30 minutes - refresh if token expires within 5 minutes
  if (expiresAt && now >= (expiresAt - 300)) {
    const lockKey = integration.id

    // Check if another request is already refreshing
    if (tokenRefreshLock.get(lockKey)) {
      log("log", "Token refresh", "Another request is refreshing token, waiting...")
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Re-fetch integration to get updated tokens
      const { data: updatedIntegration } = await supabase
        .from("company_integrations")
        .select("*")
        .eq("id", integration.id)
        .single()
      if (updatedIntegration) {
        const updatedOauthData = decryptOAuthData(updatedIntegration.settings?.oauth_data || {})
        return updatedOauthData.tokens?.access_token || accessToken
      }
      return accessToken
    }

    tokenRefreshLock.set(lockKey, true)

    try {
      log("log", "Token refresh", "HubSpot token refresh needed")

      // Decrypt settings to get client credentials
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
        throw new Error("Token refresh failed. Please reconnect HubSpot.")
      }

      const refreshData = await refreshResponse.json()
      const expiresIn = refreshData.expires_in || 1800 // 30 minutes default
      const newExpiresAt = now + expiresIn

      // Decrypt current OAuth data to get existing values
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

      // Encrypt before saving
      const encryptedOauthData = encryptOAuthData(updatedOauthData)
      const currentSettings = integration.settings || {}
      const updatedSettings = { ...currentSettings, oauth_data: encryptedOauthData }

      await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings, status: "connected" })
        .eq("id", integration.id)

      accessToken = refreshData.access_token
      log("log", "Token refresh", "Token refreshed successfully")
    } finally {
      tokenRefreshLock.delete(lockKey)
    }
  }

  return accessToken
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

  const { code, state, error, error_description } = req.query
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  log("log", endpoint, `Callback params - code: ${code ? "present" : "missing"}, state: ${state ? "present" : "missing"}, error: ${error || "none"}`)

  if (error) {
    log("error", endpoint, `Error from HubSpot: ${error} ${error_description || ""}`)
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
    log("error", endpoint, `Unexpected error: ${e.message}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?hubspot=error_unexpected`)
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

    // Run cost leak analysis
    const analysis = analyzeHubSpotCostLeaks(users, accountInfo)

    log("log", endpoint, `Analysis completed, ${analysis.summary?.issuesFound || 0} findings`)

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
