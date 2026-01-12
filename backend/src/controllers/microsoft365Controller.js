/**
 * Microsoft 365 Controller
 * Handles all Microsoft 365 integration operations: OAuth, licenses, users, cost analysis
 */

const { supabase } = require("../config/supabase")
const { analyzeM365CostLeaks } = require("../services/microsoft365CostLeakAnalysis")

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

// Rate limiting for Microsoft Graph API (10,000 requests per 10 minutes per app)
const microsoftRateLimit = new Map()

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = microsoftRateLimit.get(accessToken)

  if (!limit || now > limit.resetTime) {
    microsoftRateLimit.set(accessToken, { count: 1, resetTime: now + 600000 }) // 10 minutes
    return { allowed: true, remaining: 9999 }
  }

  if (limit.count >= 10000) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetIn: waitTime,
      message: `Rate limit exceeded. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`
    }
  }

  limit.count++
  return { allowed: true, remaining: 10000 - limit.count }
}

// Helper function to refresh token if needed
async function refreshMicrosoft365TokenIfNeeded(integration, tokens) {
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  // Refresh if token expires within 5 minutes
  if (expiresAt && now >= (expiresAt - 300)) {
    log("log", "Token refresh", "Microsoft 365 token refresh needed")

    const settings = integration.settings || {}
    const tenantId = settings.tenant_id || integration.tenant_id
    const clientId = settings.client_id || integration.client_id
    const clientSecret = settings.client_secret || integration.client_secret || ""

    if (!tenantId || !clientId) {
      throw new Error("Tenant ID or Client ID not found in integration settings")
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

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
        scope: tokens.scope || "https://graph.microsoft.com/.default offline_access",
      }).toString(),
    })

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      log("error", "Token refresh", `Failed: ${errorText}`)
      throw new Error("Token refresh failed")
    }

    const refreshData = await refreshResponse.json()
    const expiresIn = refreshData.expires_in || 3600
    const newExpiresAt = now + expiresIn

    const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
    const currentTokens = currentOauthData.tokens || {}
    const updatedOauthData = {
      ...currentOauthData,
      tokens: {
        ...currentTokens,
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || currentTokens.refresh_token,
        expires_in: expiresIn,
        expires_at: newExpiresAt,
        scope: refreshData.scope || currentTokens.scope,
      },
    }

    const currentSettings = integration.settings || {}
    const updatedSettings = { ...currentSettings, oauth_data: updatedOauthData }

    await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings })
      .eq("id", integration.id)

    accessToken = refreshData.access_token
    log("log", "Token refresh", "Token refreshed successfully")
  }

  return accessToken
}

// Helper function to fetch Microsoft Graph API data
async function fetchMicrosoftGraphData(endpoint, accessToken, scopeName) {
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
  }

  const url = endpoint.startsWith("https://") ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`

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
      const errorMessage = errorData.error?.message || errorText || "Access denied"
      throw new Error(`Missing ${scopeName} permission: ${errorMessage}`)
    }

    if (response.status === 401) {
      throw new Error("Access token expired or invalid. Please reconnect.")
    }

    throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Helper to get integration for current user
async function getIntegrationForUser(user, provider = "Microsoft365") {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }

  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    return { error: `${provider} integration not configured for this company`, status: 400 }
  }

  return { integration, companyId: profile.company_id }
}

// OAuth Start
async function startMicrosoft365OAuth(req, res) {
  const endpoint = "GET /api/integrations/microsoft365/oauth/start"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Microsoft365")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration, companyId } = result
  const settings = integration?.settings || {}
  const tenantId = settings.tenant_id || integration?.tenant_id
  const clientId = settings.client_id || integration?.client_id

  if (!tenantId) {
    return res.status(400).json({
      error: "Microsoft 365 Tenant ID not configured",
      details: "Please update the integration with your Tenant ID, Client ID, and Client Secret."
    })
  }

  if (!clientId) {
    return res.status(400).json({
      error: "Microsoft 365 Client ID not configured",
      details: "Please update the integration with your Client ID and Client Secret."
    })
  }

  const redirectUri = process.env.MICROSOFT365_REDIRECT_URI || "http://localhost:4000/api/integrations/microsoft365/callback"

  // Scopes for license and user data access
  const scope = "https://graph.microsoft.com/User.Read.All https://graph.microsoft.com/Directory.Read.All https://graph.microsoft.com/AuditLog.Read.All https://graph.microsoft.com/Reports.Read.All offline_access"

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scope)
  authUrl.searchParams.set("response_mode", "query")

  const statePayload = { company_id: companyId, tenant_id: tenantId }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()

  log("log", endpoint, `Redirecting to Microsoft OAuth`)

  const acceptHeader = req.headers.accept || ""
  if (acceptHeader.includes("application/json")) {
    return res.json({ url: authUrlString })
  }

  return res.redirect(authUrlString)
}

// OAuth Callback
async function microsoft365OAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/microsoft365/callback"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).send("Supabase not configured on backend")
  }

  const { code, state, error, error_description } = req.query
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  if (error) {
    log("error", endpoint, `Error from Microsoft: ${error} ${error_description || ""}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error&error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error_missing_code`)
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error_invalid_state`)
  }

  const companyId = decodedState.company_id
  const tenantId = decodedState.tenant_id

  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "Microsoft365")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error_integration_not_found`)
  }

  const settings = integration?.settings || {}
  const clientId = settings.client_id || integration?.client_id
  const clientSecret = settings.client_secret || integration?.client_secret
  const redirectUri = process.env.MICROSOFT365_REDIRECT_URI || "http://localhost:4000/api/integrations/microsoft365/callback"

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret || "",
        code: String(code),
        redirect_uri: redirectUri,
        scope: "https://graph.microsoft.com/.default offline_access",
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      log("error", endpoint, `Token exchange failed: ${errorText}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error_token`)
    }

    const tokenData = await tokenResponse.json()
    const grantedScope = tokenData.scope || 'none'

    log("log", endpoint, `Tokens fetched, granted scope: ${grantedScope}`)

    const now = Date.now()
    const expiresIn = tokenData.expires_in || 3600
    const expiresAt = Math.floor((now + expiresIn * 1000) / 1000)

    const newOauthData = {
      ...(integration.settings?.oauth_data || integration.oauth_data || {}),
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: expiresIn,
        expires_at: expiresAt,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
      },
    }

    const currentSettings = integration.settings || {}
    const updatedSettings = { ...currentSettings, oauth_data: newOauthData }

    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings, status: "connected" })
      .eq("id", integration.id)

    if (updateError) {
      log("error", endpoint, "Failed to save tokens:", updateError)
      return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error_saving_tokens`)
    }

    log("log", endpoint, "Tokens saved successfully")
    return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=connected`)
  } catch (e) {
    log("error", endpoint, "Unexpected error:", e.message)
    return res.redirect(`${frontendUrl}/dashboard/tools?microsoft365=error_unexpected`)
  }
}

// Get Microsoft 365 Licenses (subscribed SKUs)
async function getMicrosoft365Licenses(req, res) {
  const endpoint = "GET /api/integrations/microsoft365/licenses"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Microsoft365")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshMicrosoft365TokenIfNeeded(integration, tokens)
    const data = await fetchMicrosoftGraphData("/subscribedSkus", accessToken, "licenses")
    return res.json({ licenses: data.value || [] })
  } catch (error) {
    log("error", endpoint, "Error:", error.message)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Microsoft 365 Users with license assignments and sign-in activity
async function getMicrosoft365Users(req, res) {
  const endpoint = "GET /api/integrations/microsoft365/users"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Microsoft365")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshMicrosoft365TokenIfNeeded(integration, tokens)

    // Fetch users with assigned licenses and sign-in activity
    const usersEndpoint = "/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,assignedLicenses,signInActivity,createdDateTime&$top=999"
    const data = await fetchMicrosoftGraphData(usersEndpoint, accessToken, "users")

    return res.json({ users: data.value || [] })
  } catch (error) {
    log("error", endpoint, "Error:", error.message)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Microsoft 365 Usage Reports
async function getMicrosoft365UsageReports(req, res) {
  const endpoint = "GET /api/integrations/microsoft365/usage"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Microsoft365")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshMicrosoft365TokenIfNeeded(integration, tokens)

    // Fetch usage reports in parallel
    const [activeUserDetail, mailboxUsage, teamsActivity] = await Promise.allSettled([
      fetchMicrosoftGraphData("/reports/getOffice365ActiveUserDetail(period='D30')", accessToken, "usage reports").catch(() => null),
      fetchMicrosoftGraphData("/reports/getMailboxUsageDetail(period='D30')", accessToken, "mailbox usage").catch(() => null),
      fetchMicrosoftGraphData("/reports/getTeamsUserActivityUserDetail(period='D30')", accessToken, "teams activity").catch(() => null),
    ])

    return res.json({
      activeUserDetail: activeUserDetail.status === "fulfilled" ? activeUserDetail.value : null,
      mailboxUsage: mailboxUsage.status === "fulfilled" ? mailboxUsage.value : null,
      teamsActivity: teamsActivity.status === "fulfilled" ? teamsActivity.value : null,
    })
  } catch (error) {
    log("error", endpoint, "Error:", error.message)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Analyze Microsoft 365 Cost Leaks
async function analyzeMicrosoft365CostLeaks(req, res) {
  const endpoint = "GET /api/integrations/microsoft365/cost-leaks"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Microsoft365")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshMicrosoft365TokenIfNeeded(integration, tokens)

    // Fetch all required data in parallel
    const [licensesRes, usersRes] = await Promise.allSettled([
      fetchMicrosoftGraphData("/subscribedSkus", accessToken, "licenses").catch(() => ({ value: [] })),
      fetchMicrosoftGraphData("/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,assignedLicenses,signInActivity,createdDateTime&$top=999", accessToken, "users").catch(() => ({ value: [] })),
    ])

    const licenses = licensesRes.status === "fulfilled" ? (licensesRes.value.value || []) : []
    const users = usersRes.status === "fulfilled" ? (usersRes.value.value || []) : []

    const data = {
      licenses,
      users,
    }

    const analysis = analyzeM365CostLeaks(data)

    log("log", endpoint, `Analysis completed, ${analysis.overallSummary?.totalFindings || 0} findings`)

    // Enhance with AI if available
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (OPENAI_API_KEY && analysis.overallSummary?.totalFindings > 0) {
      try {
        const openaiService = require("../services/openaiService")

        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalLicenses: analysis.licenseAnalysis?.summary?.totalLicenses || 0,
            totalUsers: analysis.licenseAnalysis?.summary?.totalUsers || 0,
            inactiveUsers: analysis.licenseAnalysis?.summary?.inactiveUsers || 0,
            overProvisionedUsers: analysis.licenseAnalysis?.summary?.overProvisionedUsers || 0,
          },
          findings: analysis.licenseAnalysis?.findings || [],
        })

        if (aiSummary) {
          analysis.aiSummary = aiSummary
        }

        const findings = analysis.licenseAnalysis?.findings || []
        if (findings.length > 0) {
          const enhancedFindings = await openaiService.enhanceFindingsWithAI(findings)
          if (analysis.licenseAnalysis?.findings) {
            analysis.licenseAnalysis.findings = enhancedFindings
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
    log("error", endpoint, "Error:", error.message)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({
      error: error.message || "Failed to analyze cost leaks",
      details: error.stack || "No additional details"
    })
  }
}

module.exports = {
  startMicrosoft365OAuth,
  microsoft365OAuthCallback,
  getMicrosoft365Licenses,
  getMicrosoft365Users,
  getMicrosoft365UsageReports,
  analyzeMicrosoft365CostLeaks,
}
