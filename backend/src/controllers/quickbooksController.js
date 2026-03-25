/**
 * QuickBooks Controller
 * Handles all QuickBooks integration operations: OAuth, company info, invoices, bills, expenses, vendors, accounts, cost analysis
 */

const { supabase } = require("../config/supabase")
const { encryptOAuthData, decryptOAuthData, decryptIntegrationSettings } = require("../utils/encryption")

// Lazy-load the cost leak analysis service (file may not exist yet)
let analyzeQuickBooksCostLeaksService = null
function getQuickBooksCostLeakAnalysis() {
  if (!analyzeQuickBooksCostLeaksService) {
    try {
      analyzeQuickBooksCostLeaksService = require("../services/quickbooksCostLeakAnalysis")
    } catch (e) {
      // Service not yet created — return null so callers can handle gracefully
      return null
    }
  }
  return analyzeQuickBooksCostLeaksService
}

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

// Rate limiting for QuickBooks API (500 requests per minute per realm)
const quickbooksRateLimit = new Map()

function checkRateLimit(realmId) {
  const now = Date.now()
  const limit = quickbooksRateLimit.get(realmId)

  if (!limit || now > limit.resetTime) {
    // Clean up expired entries to prevent unbounded Map growth across token refreshes
    for (const [realm, entry] of quickbooksRateLimit) {
      if (now > entry.resetTime) quickbooksRateLimit.delete(realm)
    }
    quickbooksRateLimit.set(realmId, { count: 1, resetTime: now + 60000 }) // 60 seconds
    return { allowed: true, remaining: 499 }
  }

  if (limit.count >= 500) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetIn: waitTime,
      message: `Rate limit exceeded. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`
    }
  }

  limit.count++
  return { allowed: true, remaining: 500 - limit.count }
}

// Token refresh locks — Promise-based to block concurrent refreshes per integration
const tokenRefreshLocks = new Map()

// Helper function to perform the actual QuickBooks token refresh
async function doQuickBooksTokenRefresh(integration, tokens) {
  const now = Math.floor(Date.now() / 1000)

  log("log", "Token refresh", "Performing QuickBooks token refresh")

  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret || ""

  if (!clientId || !clientSecret) {
    throw new Error("Client ID or Client Secret not found in integration settings")
  }

  const tokenEndpoint = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const refreshResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }).toString(),
  })

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text()
    log("error", "Token refresh", `Failed: ${errorText}`)

    let errorData = {}
    try { errorData = JSON.parse(errorText) } catch (e) { /* Not JSON */ }

    if (errorData.error === "invalid_grant" || errorData.error === "invalid_client") {
      await supabase
        .from("company_integrations")
        .update({ status: "expired" })
        .eq("id", integration.id)

      const error = new Error("Token expired. Please reconnect your QuickBooks integration.")
      error.code = "TOKEN_EXPIRED"
      error.requiresReconnect = true
      throw error
    }

    throw new Error("Token refresh failed. Please reconnect QuickBooks.")
  }

  const refreshData = await refreshResponse.json()
  const expiresIn = refreshData.expires_in || 3600
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
async function refreshQuickBooksTokenIfNeeded(integration, tokens) {
  const integrationId = integration.id

  // If integration is already marked expired, fail fast without hitting the API
  if (integration.status === "expired") {
    const error = new Error("Token expired. Please reconnect your QuickBooks integration.")
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
  log("log", "Token refresh", "QuickBooks token refresh needed, acquiring lock")
  const refreshPromise = doQuickBooksTokenRefresh(integration, tokens)
  tokenRefreshLocks.set(integrationId, refreshPromise)

  try {
    return await refreshPromise
  } finally {
    tokenRefreshLocks.delete(integrationId)
  }
}

// QuickBooks API base URL — use sandbox for development, production otherwise
const QB_API_BASE = process.env.NODE_ENV === "production"
  ? "https://quickbooks.api.intuit.com"
  : "https://sandbox-quickbooks.api.intuit.com"

// Helper function to fetch QuickBooks API data
async function fetchQuickBooksAPI(endpoint, accessToken, realmId, scopeName) {
  const rateLimitCheck = checkRateLimit(realmId)
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
  }

  const url = `${QB_API_BASE}/v3/company/${realmId}${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) { /* Not JSON */ }

    if (response.status === 403) {
      const errorMessage = errorData.Fault?.Error?.[0]?.Detail || errorText || "Access denied"
      throw new Error(`Missing ${scopeName} permission: ${errorMessage}`)
    }

    if (response.status === 401) {
      throw new Error("Access token expired or invalid. Please reconnect QuickBooks.")
    }

    if (response.status === 429) {
      throw new Error("QuickBooks API rate limit exceeded. Please try again later.")
    }

    throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Helper to get integration for current user
async function getIntegrationForUser(user, provider = "QuickBooks") {
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
async function startQuickBooksOAuth(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/oauth/start"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
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
      error: "QuickBooks Client ID not configured",
      details: "Please update the integration with your Client ID and Client Secret."
    })
  }

  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || "http://localhost:4000/api/integrations/quickbooks/callback"

  // Scope for QuickBooks accounting data access
  const scope = "com.intuit.quickbooks.accounting"

  const authUrl = new URL("https://appcenter.intuit.com/connect/oauth2")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scope)

  const statePayload = { company_id: companyId, client_id: clientId }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()

  log("log", endpoint, `Starting QuickBooks OAuth for company ${companyId}, redirect_uri: ${redirectUri}`)

  const acceptHeader = req.headers.accept || ""
  if (acceptHeader.includes("application/json")) {
    return res.json({ url: authUrlString })
  }

  return res.redirect(authUrlString)
}

// OAuth Callback
async function quickbooksOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/callback"
  log("log", endpoint, "Request received", { query: req.query })

  if (!supabase) {
    return res.status(500).send("Supabase not configured on backend")
  }

  const { code, state, error, error_description, realmId } = req.query
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  log("log", endpoint, `Callback params - code: ${code ? "present" : "missing"}, state: ${state ? "present" : "missing"}, realmId: ${realmId || "missing"}, error: ${error || "none"}`)

  // Helper to clean up pending integration on OAuth failure
  const cleanupPendingIntegration = async (companyId) => {
    try {
      const { data: pending } = await supabase
        .from("company_integrations")
        .select("id, status")
        .eq("company_id", companyId)
        .ilike("provider", "quickbooks")
        .eq("status", "pending")
        .maybeSingle()
      if (pending) {
        await supabase.from("company_integrations").delete().eq("id", pending.id)
        log("log", endpoint, `Cleaned up pending QuickBooks integration ${pending.id}`)
      }
    } catch (e) {
      log("error", endpoint, `Failed to cleanup pending integration: ${e.message}`)
    }
  }

  if (error) {
    log("error", endpoint, `Error from QuickBooks: ${error} ${error_description || ""}`)
    if (state) {
      try {
        const s = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
        if (s.company_id) await cleanupPendingIntegration(s.company_id)
      } catch { /* ignore parse errors */ }
    }
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error&error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    log("error", endpoint, `Missing params - code: ${!!code}, state: ${!!state}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_missing_code`)
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
    log("log", endpoint, `Decoded state - company_id: ${decodedState.company_id}`)
  } catch (e) {
    log("error", endpoint, `Failed to decode state: ${e.message}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_invalid_state`)
  }

  const companyId = decodedState.company_id

  // Try both "QuickBooks" and "quickbooks" to handle case sensitivity
  let integration = null
  let integrationError = null

  // First try exact match
  const { data: exactMatch, error: exactError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "QuickBooks")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (exactMatch) {
    integration = exactMatch
    log("log", endpoint, `Found integration with provider "QuickBooks", id: ${integration.id}`)
  } else {
    // Try case-insensitive match
    const { data: allIntegrations, error: allError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (allIntegrations) {
      integration = allIntegrations.find(i =>
        i.provider?.toLowerCase() === "quickbooks"
      )
      if (integration) {
        log("log", endpoint, `Found integration with provider "${integration.provider}" (case-insensitive), id: ${integration.id}`)
      } else {
        log("error", endpoint, `No QuickBooks integration found. Available providers: ${allIntegrations.map(i => i.provider).join(", ")}`)
      }
    }
    integrationError = exactError || allError
  }

  if (integrationError || !integration) {
    log("error", endpoint, `Integration not found for company ${companyId}`, { error: integrationError?.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_integration_not_found`)
  }

  // Decrypt settings to get client credentials
  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret

  log("log", endpoint, `Credentials check - clientId: ${clientId ? "present" : "missing"}, clientSecret: ${clientSecret ? "present" : "missing"}`)

  if (!clientId || !clientSecret) {
    log("error", endpoint, "Client ID or Secret missing from integration settings")
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_missing_credentials`)
  }

  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || "http://localhost:4000/api/integrations/quickbooks/callback"
  log("log", endpoint, `Using redirect URI: ${redirectUri}`)

  try {
    // Exchange code for tokens
    const tokenEndpoint = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    log("log", endpoint, "Exchanging authorization code for tokens...")

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      log("error", endpoint, `Token exchange failed (${tokenResponse.status}): ${errorText}`)
      if (integration.status === "pending") await cleanupPendingIntegration(companyId)
      return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_token&details=${encodeURIComponent(errorText.substring(0, 100))}`)
    }

    const tokenData = await tokenResponse.json()
    log("log", endpoint, `Token exchange successful - access_token: ${tokenData.access_token ? "present" : "missing"}, refresh_token: ${tokenData.refresh_token ? "present" : "missing"}`)

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = tokenData.expires_in || 3600 // 60 minutes default
    const expiresAt = now + expiresIn

    const newOauthData = {
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: expiresIn,
        expires_at: expiresAt,
        token_type: tokenData.token_type || "Bearer",
      },
      realmId: realmId || null,
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
      return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_saving_tokens`)
    }

    log("log", endpoint, `QuickBooks OAuth completed successfully for integration ${integration.id}, realmId: ${realmId}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=connected`)
  } catch (e) {
    log("error", endpoint, `Unexpected error: ${e.message}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?quickbooks=error_unexpected`)
  }
}

// Helper to extract realmId from integration's oauth_data
function getRealmId(oauthData) {
  return oauthData?.realmId || oauthData?.realm_id || null
}

// Get QuickBooks Company Info
async function getQuickBooksCompanyInfo(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/company-info"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    const data = await fetchQuickBooksAPI(`/companyinfo/${realmId}`, accessToken, realmId, "company-info")

    return res.json({
      success: true,
      companyInfo: data.CompanyInfo || data,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get QuickBooks Invoices
async function getQuickBooksInvoices(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/invoices"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    const query = "SELECT * FROM Invoice ORDERBY TxnDate DESC MAXRESULTS 500"
    const data = await fetchQuickBooksAPI(`/query?query=${encodeURIComponent(query)}`, accessToken, realmId, "invoices")

    return res.json({
      success: true,
      invoices: data.QueryResponse?.Invoice || [],
      total: data.QueryResponse?.totalCount || data.QueryResponse?.Invoice?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get QuickBooks Bills
async function getQuickBooksBills(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/bills"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    const query = "SELECT * FROM Bill ORDERBY TxnDate DESC MAXRESULTS 500"
    const data = await fetchQuickBooksAPI(`/query?query=${encodeURIComponent(query)}`, accessToken, realmId, "bills")

    return res.json({
      success: true,
      bills: data.QueryResponse?.Bill || [],
      total: data.QueryResponse?.totalCount || data.QueryResponse?.Bill?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get QuickBooks Expenses (Purchases)
async function getQuickBooksExpenses(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/expenses"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    const query = "SELECT * FROM Purchase ORDERBY TxnDate DESC MAXRESULTS 500"
    const data = await fetchQuickBooksAPI(`/query?query=${encodeURIComponent(query)}`, accessToken, realmId, "expenses")

    return res.json({
      success: true,
      expenses: data.QueryResponse?.Purchase || [],
      total: data.QueryResponse?.totalCount || data.QueryResponse?.Purchase?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get QuickBooks Vendors
async function getQuickBooksVendors(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/vendors"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    const query = "SELECT * FROM Vendor MAXRESULTS 500"
    const data = await fetchQuickBooksAPI(`/query?query=${encodeURIComponent(query)}`, accessToken, realmId, "vendors")

    return res.json({
      success: true,
      vendors: data.QueryResponse?.Vendor || [],
      total: data.QueryResponse?.totalCount || data.QueryResponse?.Vendor?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get QuickBooks Accounts (Chart of Accounts)
async function getQuickBooksAccounts(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/accounts"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    const query = "SELECT * FROM Account MAXRESULTS 500"
    const data = await fetchQuickBooksAPI(`/query?query=${encodeURIComponent(query)}`, accessToken, realmId, "accounts")

    return res.json({
      success: true,
      accounts: data.QueryResponse?.Account || [],
      total: data.QueryResponse?.totalCount || data.QueryResponse?.Account?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("expired") || error.message.includes("reconnect")) {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Analyze QuickBooks Cost Leaks
async function analyzeQuickBooksCostLeaks(req, res) {
  const endpoint = "GET /api/integrations/quickbooks/cost-leaks"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  // Decrypt settings to get pricing info and OAuth data
  const settings = decryptIntegrationSettings(integration.settings || {})
  const oauthData = decryptOAuthData(settings.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens
  const realmId = getRealmId(oauthData)

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect QuickBooks." })
  }

  if (!realmId) {
    return res.status(400).json({ error: "No realmId found. Please reconnect QuickBooks." })
  }

  try {
    const accessToken = await refreshQuickBooksTokenIfNeeded(integration, tokens)

    // Fetch invoices, bills, expenses, and vendors in parallel
    const invoiceQuery = "SELECT * FROM Invoice ORDERBY TxnDate DESC MAXRESULTS 500"
    const billQuery = "SELECT * FROM Bill ORDERBY TxnDate DESC MAXRESULTS 500"
    const expenseQuery = "SELECT * FROM Purchase ORDERBY TxnDate DESC MAXRESULTS 500"
    const vendorQuery = "SELECT * FROM Vendor MAXRESULTS 500"

    const [invoicesRes, billsRes, expensesRes, vendorsRes] = await Promise.allSettled([
      fetchQuickBooksAPI(`/query?query=${encodeURIComponent(invoiceQuery)}`, accessToken, realmId, "invoices").catch((err) => {
        log("error", endpoint, `Failed to fetch invoices: ${err.message}`)
        return { QueryResponse: {} }
      }),
      fetchQuickBooksAPI(`/query?query=${encodeURIComponent(billQuery)}`, accessToken, realmId, "bills").catch((err) => {
        log("error", endpoint, `Failed to fetch bills: ${err.message}`)
        return { QueryResponse: {} }
      }),
      fetchQuickBooksAPI(`/query?query=${encodeURIComponent(expenseQuery)}`, accessToken, realmId, "expenses").catch((err) => {
        log("error", endpoint, `Failed to fetch expenses: ${err.message}`)
        return { QueryResponse: {} }
      }),
      fetchQuickBooksAPI(`/query?query=${encodeURIComponent(vendorQuery)}`, accessToken, realmId, "vendors").catch((err) => {
        log("error", endpoint, `Failed to fetch vendors: ${err.message}`)
        return { QueryResponse: {} }
      }),
    ])

    const invoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value?.QueryResponse?.Invoice || []) : []
    const bills = billsRes.status === "fulfilled" ? (billsRes.value?.QueryResponse?.Bill || []) : []
    const expenses = expensesRes.status === "fulfilled" ? (expensesRes.value?.QueryResponse?.Purchase || []) : []
    const vendors = vendorsRes.status === "fulfilled" ? (vendorsRes.value?.QueryResponse?.Vendor || []) : []

    log("log", endpoint, `Fetched ${invoices.length} invoices, ${bills.length} bills, ${expenses.length} expenses, ${vendors.length} vendors`)

    const financialData = {
      invoices,
      bills,
      expenses,
      vendors,
    }

    // Run cost leak analysis if the service is available
    const costLeakService = getQuickBooksCostLeakAnalysis()
    let analysis

    if (costLeakService && typeof costLeakService.analyzeQuickBooksCostLeaks === "function") {
      analysis = costLeakService.analyzeQuickBooksCostLeaks(financialData)
    } else {
      // Fallback basic analysis when service is not yet available
      analysis = buildBasicAnalysis(financialData)
    }

    log("log", endpoint, `Analysis completed: ${analysis.overallSummary?.totalFindings || 0} total findings`)

    // Enhance with AI if available
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (OPENAI_API_KEY) {
      try {
        const openaiService = require("../services/openaiService")

        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalInvoices: invoices.length,
            totalBills: bills.length,
            totalExpenses: expenses.length,
            totalVendors: vendors.length,
            findings: analysis.overallSummary?.totalFindings || 0,
            potentialSavings: analysis.overallSummary?.totalPotentialSavings || 0,
          },
          findings: analysis.findings || [],
        })

        if (aiSummary) {
          analysis.aiSummary = aiSummary
        }

        const allFindings = analysis.findings || []
        if (allFindings.length > 0) {
          const enhancedFindings = await openaiService.enhanceFindingsWithAI(allFindings)
          if (enhancedFindings && Array.isArray(enhancedFindings) && enhancedFindings.length > 0) {
            analysis.findings = enhancedFindings
          }
        }

        analysis.aiEnhanced = true
        analysis.enhancedAt = new Date().toISOString()
      } catch (aiError) {
        log("error", endpoint, `AI enhancement failed: ${aiError.message}`)
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
      error: error.message || "Failed to analyze QuickBooks cost leaks",
      details: error.stack || "No additional details"
    })
  }
}

// Basic fallback analysis when dedicated service is not yet available
function buildBasicAnalysis(financialData) {
  const { invoices, bills, expenses, vendors } = financialData
  const findings = []

  // Detect duplicate bills (same vendor + same amount + close dates)
  const billsByVendor = {}
  for (const bill of bills) {
    const vendorRef = bill.VendorRef?.value || "unknown"
    if (!billsByVendor[vendorRef]) billsByVendor[vendorRef] = []
    billsByVendor[vendorRef].push(bill)
  }

  for (const [vendorId, vendorBills] of Object.entries(billsByVendor)) {
    for (let i = 0; i < vendorBills.length; i++) {
      for (let j = i + 1; j < vendorBills.length; j++) {
        const a = vendorBills[i]
        const b = vendorBills[j]
        if (
          a.TotalAmt === b.TotalAmt &&
          a.TotalAmt > 0 &&
          Math.abs(new Date(a.TxnDate) - new Date(b.TxnDate)) < 7 * 24 * 60 * 60 * 1000
        ) {
          findings.push({
            type: "duplicate_bill",
            severity: "high",
            description: `Potential duplicate bill for vendor ${a.VendorRef?.name || vendorId}: $${a.TotalAmt} on ${a.TxnDate} and ${b.TxnDate}`,
            amount: a.TotalAmt,
            potentialSavings: a.TotalAmt,
          })
        }
      }
    }
  }

  // Detect overdue invoices (revenue at risk)
  const now = new Date()
  for (const invoice of invoices) {
    if (invoice.Balance > 0 && invoice.DueDate) {
      const dueDate = new Date(invoice.DueDate)
      if (dueDate < now) {
        const daysOverdue = Math.floor((now - dueDate) / (24 * 60 * 60 * 1000))
        findings.push({
          type: "overdue_invoice",
          severity: daysOverdue > 60 ? "high" : daysOverdue > 30 ? "medium" : "low",
          description: `Invoice #${invoice.DocNumber || invoice.Id} is ${daysOverdue} days overdue with $${invoice.Balance} outstanding`,
          amount: invoice.Balance,
          revenueAtRisk: invoice.Balance,
        })
      }
    }
  }

  // Detect large unusual expenses
  const expenseAmounts = expenses.map(e => e.TotalAmt || 0).filter(a => a > 0)
  if (expenseAmounts.length > 0) {
    const avgExpense = expenseAmounts.reduce((s, a) => s + a, 0) / expenseAmounts.length
    const stdDev = Math.sqrt(expenseAmounts.reduce((s, a) => s + Math.pow(a - avgExpense, 2), 0) / expenseAmounts.length)
    const threshold = avgExpense + (2 * stdDev)

    for (const expense of expenses) {
      if (expense.TotalAmt > threshold && expense.TotalAmt > 0) {
        findings.push({
          type: "unusual_expense",
          severity: "medium",
          description: `Unusually large expense of $${expense.TotalAmt} (avg: $${Math.round(avgExpense)}) on ${expense.TxnDate}`,
          amount: expense.TotalAmt,
          potentialSavings: 0,
        })
      }
    }
  }

  const totalPotentialSavings = findings.reduce((sum, f) => sum + (f.potentialSavings || 0), 0)
  const totalRevenueAtRisk = findings.reduce((sum, f) => sum + (f.revenueAtRisk || 0), 0)

  return {
    overallSummary: {
      totalFindings: findings.length,
      totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
      totalRevenueAtRisk: Math.round(totalRevenueAtRisk * 100) / 100,
      invoicesAnalyzed: invoices.length,
      billsAnalyzed: bills.length,
      expensesAnalyzed: expenses.length,
      vendorsAnalyzed: vendors.length,
    },
    findings,
    rawCounts: {
      invoices: invoices.length,
      bills: bills.length,
      expenses: expenses.length,
      vendors: vendors.length,
    },
    currency: "USD",
  }
}

// Revoke QuickBooks token (called when disconnecting/deleting integration)
async function revokeQuickBooksToken(refreshToken) {
  const endpoint = "revokeQuickBooksToken"

  if (!refreshToken) {
    log("warn", endpoint, "No refresh token provided for revocation")
    return { success: false, error: "No refresh token" }
  }

  try {
    log("log", endpoint, "Revoking QuickBooks refresh token...")

    // QuickBooks token revocation endpoint
    const response = await fetch("https://developer.api.intuit.com/v2/oauth2/tokens/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        token: refreshToken,
      }),
    })

    if (response.ok || response.status === 204) {
      log("log", endpoint, "QuickBooks token revoked successfully")
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

// Disconnect QuickBooks integration (revoke token and update status)
async function disconnectQuickBooks(req, res) {
  const endpoint = "DELETE /api/integrations/quickbooks/disconnect"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "QuickBooks")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  // Get the refresh token to revoke
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || {})
  const refreshToken = oauthData?.tokens?.refresh_token

  // Revoke the token from QuickBooks
  if (refreshToken) {
    await revokeQuickBooksToken(refreshToken)
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
    return res.status(500).json({ error: "Failed to disconnect QuickBooks" })
  }

  log("log", endpoint, "QuickBooks disconnected successfully")
  return res.json({ success: true, message: "QuickBooks disconnected. You will need to re-authorize when reconnecting." })
}

module.exports = {
  startQuickBooksOAuth,
  quickbooksOAuthCallback,
  getQuickBooksCompanyInfo,
  getQuickBooksInvoices,
  getQuickBooksBills,
  getQuickBooksExpenses,
  getQuickBooksVendors,
  getQuickBooksAccounts,
  analyzeQuickBooksCostLeaks,
  disconnectQuickBooks,
  revokeQuickBooksToken,
  // Export helpers for use in comparison controller
  refreshQuickBooksTokenIfNeeded,
  fetchQuickBooksAPI,
  getIntegrationForUser,
}
