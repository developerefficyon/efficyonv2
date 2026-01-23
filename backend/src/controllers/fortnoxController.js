/**
 * Fortnox Controller
 * Handles all Fortnox integration operations: OAuth, customers, invoices, cost analysis
 */

const { supabase } = require("../config/supabase")
const { analyzeCostLeaks } = require("../services/costLeakAnalysis")
const tokenService = require("../services/tokenService")
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

// Rate limiting for Fortnox API calls (25 requests per 5 seconds per access token)
const fortnoxRateLimit = new Map()

// Token refresh lock to prevent race conditions when multiple requests try to refresh simultaneously
const tokenRefreshLocks = new Map()

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = fortnoxRateLimit.get(accessToken)

  if (!limit || now > limit.resetTime) {
    fortnoxRateLimit.set(accessToken, { count: 1, resetTime: now + 5000 })
    return { allowed: true, remaining: 24 }
  }

  if (limit.count >= 25) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetIn: waitTime,
      message: `Rate limit exceeded. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`
    }
  }

  limit.count++
  return { allowed: true, remaining: 25 - limit.count }
}

// Helper function to perform the actual token refresh
async function doTokenRefresh(integration, tokens) {
  const now = Math.floor(Date.now() / 1000)

  log("log", "Token refresh", "Performing token refresh")

  // Decrypt settings to get client_id and client_secret
  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret || ""

  if (!clientId) {
    throw new Error("Client ID not found in integration settings")
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
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
    log("error", "Token refresh", `Refresh failed: ${refreshResponse.status} ${errorText}`)

    // Check if it's an invalid_grant error (expired/revoked refresh token)
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) { /* Not JSON */ }

    if (errorData.error === "invalid_grant") {
      // Mark the integration as needing reconnection
      await supabase
        .from("company_integrations")
        .update({ status: "expired" })
        .eq("id", integration.id)

      const error = new Error("Token expired. Please reconnect your Fortnox integration.")
      error.code = "TOKEN_EXPIRED"
      error.requiresReconnect = true
      throw error
    }

    throw new Error("Token refresh failed")
  }

  const refreshData = await refreshResponse.json()
  const expiresIn = refreshData.expires_in || 3600
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
      scope: refreshData.scope || currentTokens.scope,
    },
  }

  // Encrypt before saving
  const encryptedOauthData = encryptOAuthData(updatedOauthData)
  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings, oauth_data: encryptedOauthData }

  await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings })
    .eq("id", integration.id)

  log("log", "Token refresh", "Token refreshed successfully")
  return refreshData.access_token
}

// Helper function to refresh token if needed (with lock to prevent race conditions)
async function refreshTokenIfNeeded(integration, tokens) {
  const integrationId = integration.id

  // If a refresh is already in progress for this integration, wait for it
  if (tokenRefreshLocks.has(integrationId)) {
    log("log", "Token refresh", "Waiting for existing refresh to complete")
    try {
      const newToken = await tokenRefreshLocks.get(integrationId)
      return newToken
    } catch (error) {
      // If the existing refresh failed, we need to re-fetch the integration
      // to get potentially updated tokens and try again
      log("log", "Token refresh", "Existing refresh failed, re-fetching integration")
      const { data: freshIntegration } = await supabase
        .from("company_integrations")
        .select("*")
        .eq("id", integrationId)
        .maybeSingle()

      if (freshIntegration) {
        // Decrypt the oauth_data before reading tokens
        const freshOauthData = decryptOAuthData(freshIntegration.settings?.oauth_data || {})
        const freshTokens = freshOauthData?.tokens
        if (freshTokens?.access_token) {
          return freshTokens.access_token
        }
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

  // Token is still valid, return current access token
  if (!expiresAt || now < (expiresAt - 300)) {
    return tokens.access_token
  }

  // Token needs refresh - acquire lock and refresh
  log("log", "Token refresh", "Token refresh needed, acquiring lock")

  const refreshPromise = doTokenRefresh(integration, tokens)
  tokenRefreshLocks.set(integrationId, refreshPromise)

  try {
    const newToken = await refreshPromise
    return newToken
  } finally {
    // Always release the lock when done
    tokenRefreshLocks.delete(integrationId)
  }
}

// Helper function to fetch Fortnox data
async function fetchFortnoxData(endpoint, accessToken, requiredScope, scopeName) {
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
  }

  const response = await fetch(`https://api.fortnox.se/3${endpoint}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
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
      const errorMessage = errorData.ErrorInformation?.message || errorText || "Access denied"
      if (errorMessage.includes("behörighet") || errorMessage.includes("permission") || errorMessage.includes("scope")) {
        throw new Error(`Missing ${scopeName} scope: ${errorMessage}`)
      }
    }

    if (response.status === 400) {
      const errorMessage = errorData.ErrorInformation?.message || errorText || "Bad Request"
      const lowerMessage = errorMessage.toLowerCase()
      if (lowerMessage.includes("behörighet") || lowerMessage.includes("permission") ||
          lowerMessage.includes("scope") || lowerMessage.includes("saknas") || lowerMessage.includes("missing")) {
        throw new Error(`Missing ${scopeName} scope: ${errorMessage}`)
      }
      throw new Error(`Endpoint not available: ${errorMessage}`)
    }

    throw new Error(`Fortnox API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Generic endpoint handler factory
function createFortnoxDataHandler(endpoint, requiredScope, scopeName, dataKey) {
  return async (req, res) => {
    const endpointName = endpoint.replace(/^\//, "").replace(/\//g, "-")
    log("log", `GET /api/integrations/fortnox/${endpointName}`, "Request received")

    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured on backend" })
    }

    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("provider", "Fortnox")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (integrationError || !integration) {
      return res.status(400).json({ error: "Fortnox integration not configured for this company" })
    }

    // Decrypt OAuth data when reading from database
    const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
    const tokens = oauthData?.tokens
    if (!tokens?.access_token) {
      return res.status(400).json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
    }

    const grantedScope = (tokens.scope || "").toLowerCase()
    if (requiredScope && !grantedScope.includes(requiredScope.toLowerCase())) {
      return res.status(403).json({
        error: `Missing permission to access ${scopeName} data`,
        details: `Please reconnect your integration and ensure you grant '${requiredScope}' permissions.`,
        currentScope: tokens.scope || 'none',
        action: "reconnect"
      })
    }

    try {
      let accessToken
      try {
        accessToken = await refreshTokenIfNeeded(integration, tokens)
      } catch (refreshError) {
        // Use 400 instead of 401 to prevent frontend from treating this as auth failure
        return res.status(400).json({
          error: refreshError.message || "Token refresh failed. Please reconnect your integration.",
          code: refreshError.code || "TOKEN_REFRESH_FAILED",
          action: "reconnect",
          requiresReconnect: true
        })
      }

      try {
        const data = await fetchFortnoxData(endpoint, accessToken, requiredScope, scopeName)
        const result = data[dataKey] || data[dataKey.charAt(0).toUpperCase() + dataKey.slice(1)] || data
        return res.json({ [dataKey]: Array.isArray(result) ? result : [result] })
      } catch (fetchError) {
        if (fetchError.message && fetchError.message.includes("Missing") && fetchError.message.includes("scope")) {
          return res.status(403).json({
            error: fetchError.message,
            action: "reconnect",
            scope_required: requiredScope
          })
        }
        throw fetchError
      }
    } catch (error) {
      log("error", `GET /api/integrations/fortnox/${endpointName}`, "Error:", error.message)

      if (error.message.includes("Rate limit")) {
        return res.status(429).json({ error: error.message })
      }

      if (error.message.includes("Endpoint not available")) {
        return res.status(404).json({ error: error.message, read_only: true })
      }

      return res.status(500).json({
        error: error.message || "Failed to fetch data from Fortnox",
        details: error.stack || "No additional details available"
      })
    }
  }
}

// Create specific data handlers
const getFortnoxInvoices = createFortnoxDataHandler("/invoices", "invoice", "invoice", "Invoices")
const getFortnoxSupplierInvoices = createFortnoxDataHandler("/supplierinvoices", "supplierinvoice", "supplier invoice", "SupplierInvoices")
const getFortnoxExpenses = createFortnoxDataHandler("/expenses", "salary", "expense", "Expenses")
const getFortnoxVouchers = createFortnoxDataHandler("/vouchers", "bookkeeping", "voucher", "Vouchers")
const getFortnoxAccounts = createFortnoxDataHandler("/accounts", "bookkeeping", "account", "Accounts")
const getFortnoxArticles = createFortnoxDataHandler("/articles", "article", "article", "Articles")
const getFortnoxSuppliers = createFortnoxDataHandler("/suppliers", "supplier", "supplier", "Suppliers")

// OAuth Start
async function startFortnoxOAuth(req, res) {
  const endpoint = "GET /api/integrations/fortnox/oauth/start"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    return res.status(400).json({
      error: "Fortnox integration not found",
      details: "Please save the Fortnox integration with Client ID and Client Secret first."
    })
  }

  const settings = integration?.settings || {}
  const clientId = settings.client_id || integration?.client_id

  if (!clientId) {
    return res.status(400).json({
      error: "Fortnox Client ID not configured",
      details: "Please update the integration with your Client ID and Client Secret."
    })
  }

  if (clientId.includes("@") || (clientId.includes(".") && clientId.length < 20)) {
    return res.status(400).json({
      error: "Invalid Fortnox Client ID",
      details: `The Client ID "${clientId}" appears to be an email address. Please enter your actual Fortnox Client ID.`
    })
  }

  const environment = settings.environment || integration.environment || "sandbox"
  const redirectUri = process.env.FORTNOX_REDIRECT_URI || "http://localhost:4000/api/integrations/fortnox/callback"

  const scopeEnv = process.env.FORTNOX_OAUTH_SCOPE
  let scope = scopeEnv !== undefined ? scopeEnv.trim() : "companyinformation settings profile archive inbox invoice supplierinvoice bookkeeping salary article customer supplier"

  if (scope && scope !== "") {
    scope = scope.toLowerCase().replace(/\s+/g, ' ').trim()
  } else {
    scope = "customer"
  }

  const authUrl = new URL("https://apps.fortnox.se/oauth-v1/auth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scope)
  authUrl.searchParams.set("access_type", "offline")

  const statePayload = { company_id: companyId, environment }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()

  log("log", endpoint, `Requesting scope: "${scope}"`)

  const acceptHeader = req.headers.accept || ""
  if (acceptHeader.includes("application/json")) {
    return res.json({ url: authUrlString })
  }

  return res.redirect(authUrlString)
}

// OAuth Callback
async function fortnoxOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/fortnox/callback"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).send("Supabase not configured on backend")
  }

  const { code, state, error, error_description } = req.query
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  if (error) {
    log("error", endpoint, `Error from Fortnox: ${error} ${error_description || ""}`)
    let errorType = "error"
    if (error === "error_missing_license" || error_description?.includes("not licensed")) {
      errorType = "error_missing_license"
    } else if (error === "invalid_scope") {
      errorType = "error_invalid_scope"
    }
    return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=${errorType}&error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=error_missing_code`)
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=error_invalid_state`)
  }

  const companyId = decodedState.company_id
  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=error_integration_not_found`)
  }

  // Decrypt settings to get client_id and client_secret
  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id || integration?.client_id
  const clientSecret = settings.client_secret || integration?.client_secret
  const redirectUri = process.env.FORTNOX_REDIRECT_URI || "http://localhost:4000/api/integrations/fortnox/callback"

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64")

    const tokenResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
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
      return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=error_token`)
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

    // Encrypt sensitive OAuth data before saving
    const encryptedOauthData = encryptOAuthData(newOauthData)

    const grantedScopeLower = (grantedScope || "").toLowerCase()
    const hasCustomerScope = grantedScopeLower.includes("customer")
    const hasCompanyInfoScope = grantedScopeLower.includes("companyinformation") || grantedScopeLower.includes("company")
    let integrationStatus = (hasCustomerScope || hasCompanyInfoScope) ? "connected" : "warning"

    const currentSettings = integration.settings || {}
    const updatedSettings = { ...currentSettings, oauth_data: encryptedOauthData }

    const maxAttempts = 3
    let updateError = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings, status: integrationStatus })
        .eq("id", integration.id)

      if (!error) {
        updateError = null
        break
      }
      updateError = error
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 300))
      }
    }

    if (updateError) {
      return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=error_saving_tokens`)
    }

    log("log", endpoint, "Tokens saved successfully")
    return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=connected`)
  } catch (e) {
    log("error", endpoint, "Unexpected error:", e.message)
    return res.redirect(`${frontendUrl}/dashboard/tools?fortnox=error_unexpected`)
  }
}

// Sync Fortnox Customers
async function syncFortnoxCustomers(req, res) {
  const endpoint = "POST /api/integrations/fortnox/sync-customers"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) {
    return res.status(400).json({ error: "Fortnox integration not configured for this company" })
  }

  // Decrypt OAuth data when reading from database
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
  }

  try {
    const accessToken = await refreshTokenIfNeeded(integration, tokens)
    const rateLimitCheck = checkRateLimit(accessToken)
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ error: rateLimitCheck.message })
    }

    const settings = integration.settings || {}
    const response = await fetch("https://api.fortnox.se/3/customers?filter=active", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": settings.client_id || integration.client_id,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    const customers = data.Customers || data.customers || []
    const activeCustomersCount = Array.isArray(customers) ? customers.length : 0
    const lastSyncedAt = new Date().toISOString()

    log("log", endpoint, `Success, active customers: ${activeCustomersCount}`)
    return res.json({ active_customers_count: activeCustomersCount, last_synced_at: lastSyncedAt })
  } catch (e) {
    log("error", endpoint, "Error:", e.message)
    if (e.code === "TOKEN_EXPIRED" || e.requiresReconnect) {
      return res.status(400).json({
        error: e.message,
        code: "TOKEN_EXPIRED",
        action: "reconnect",
        requiresReconnect: true
      })
    }
    return res.status(500).json({ error: "Unexpected error while syncing customers" })
  }
}

// Get Fortnox Customers (View)
async function getFortnoxCustomers(req, res) {
  const endpoint = "GET /api/integrations/fortnox/customers"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) {
    return res.status(400).json({ error: "Fortnox integration not configured" })
  }

  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshTokenIfNeeded(integration, tokens)
    const data = await fetchFortnoxData("/customers", accessToken, "customer", "customer")
    return res.json({ customers: data.Customers || [] })
  } catch (error) {
    log("error", endpoint, "Error:", error.message)
    if (error.code === "TOKEN_EXPIRED" || error.requiresReconnect) {
      return res.status(400).json({
        error: error.message,
        code: "TOKEN_EXPIRED",
        action: "reconnect",
        requiresReconnect: true
      })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Fortnox Company Info
async function getFortnoxCompanyInfo(req, res) {
  const endpoint = "GET /api/integrations/fortnox/company"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) {
    return res.status(400).json({ error: "Fortnox integration not configured" })
  }

  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshTokenIfNeeded(integration, tokens)
    const data = await fetchFortnoxData("/companyinformation", accessToken, "companyinformation", "company information")
    return res.json({ companyInformation: data.CompanyInformation || data })
  } catch (error) {
    log("error", endpoint, "Error:", error.message)
    if (error.code === "TOKEN_EXPIRED" || error.requiresReconnect) {
      return res.status(400).json({
        error: error.message,
        code: "TOKEN_EXPIRED",
        action: "reconnect",
        requiresReconnect: true
      })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Fortnox Settings
async function getFortnoxSettings(req, res) {
  return res.status(404).json({
    error: "Settings endpoint not available",
    details: "The Fortnox API /3/settings endpoint is not available or requires special permissions.",
    read_only: true
  })
}

// Get Fortnox Profile
async function getFortnoxProfile(req, res) {
  return res.status(404).json({
    error: "Profile endpoint not available",
    details: "The Fortnox API does not have a /3/profile endpoint. The 'profile' scope is for OAuth authorization only.",
    read_only: true
  })
}

// Analyze Cost Leaks
async function analyzeFortnoxCostLeaks(req, res) {
  const endpoint = "GET /api/integrations/fortnox/cost-leaks"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Check token balance before analysis (single source = 1 token)
  const tokenCost = 1
  const { hasEnough, available } = await tokenService.checkTokenBalance(user.id, tokenCost)

  if (!hasEnough) {
    log("warn", endpoint, `Insufficient tokens for user ${user.id}: has ${available}, needs ${tokenCost}`)
    return res.status(402).json({
      error: "INSUFFICIENT_TOKENS",
      message: "You don't have enough tokens for this analysis",
      available,
      required: tokenCost,
      upgradeRequired: true,
    })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) {
    return res.status(400).json({ error: "Fortnox integration not configured" })
  }

  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const tokens = oauthData?.tokens

  if (!tokens?.access_token) {
    return res.status(400).json({ error: "No access token. Please reconnect." })
  }

  try {
    const accessToken = await refreshTokenIfNeeded(integration, tokens)
    log("log", endpoint, `Using access token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'NONE'}`)

    const [invoicesRes, supplierInvoicesRes] = await Promise.allSettled([
      fetchFortnoxData("/invoices", accessToken, "invoice", "invoice").catch((err) => {
        log("error", endpoint, `Failed to fetch invoices: ${err.message}`)
        return { Invoices: [] }
      }),
      fetchFortnoxData("/supplierinvoices", accessToken, "supplierinvoice", "supplier invoice").catch((err) => {
        log("error", endpoint, `Failed to fetch supplier invoices: ${err.message}`)
        return { SupplierInvoices: [] }
      }),
    ])

    const invoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value.Invoices || []) : []
    const supplierInvoices = supplierInvoicesRes.status === "fulfilled" ? (supplierInvoicesRes.value.SupplierInvoices || []) : []

    log("log", endpoint, `Fetched ${invoices.length} invoices, ${supplierInvoices.length} supplier invoices`)

    const data = {
      invoices,
      supplierInvoices,
      expenses: [],
      vouchers: [],
      accounts: [],
      articles: [],
    }

    const analysis = analyzeCostLeaks(data)

    log("log", endpoint, `Analysis completed, ${analysis.overallSummary?.totalFindings || 0} findings`)

    // Enhance with AI if available
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (OPENAI_API_KEY) {
      try {
        const openaiService = require("../services/openaiService")

        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalInvoices: analysis.supplierInvoiceAnalysis?.summary?.totalInvoices || 0,
            totalAmount: analysis.supplierInvoiceAnalysis?.summary?.totalAmount || 0,
            duplicatePayments: analysis.supplierInvoiceAnalysis?.summary?.duplicatePayments || [],
            unusualAmounts: analysis.supplierInvoiceAnalysis?.summary?.unusualAmounts || [],
            recurringSubscriptions: analysis.supplierInvoiceAnalysis?.summary?.recurringSubscriptions || [],
            overdueInvoices: analysis.supplierInvoiceAnalysis?.summary?.overdueInvoices || [],
            priceIncreases: analysis.supplierInvoiceAnalysis?.summary?.priceIncreases || [],
          },
          findings: analysis.supplierInvoiceAnalysis?.findings || [],
        })

        if (aiSummary) {
          analysis.aiSummary = aiSummary
        }

        const invoiceFindings = analysis.supplierInvoiceAnalysis?.findings || []
        if (invoiceFindings.length > 0) {
          const enhancedFindings = await openaiService.enhanceFindingsWithAI(invoiceFindings)
          if (analysis.supplierInvoiceAnalysis?.findings) {
            analysis.supplierInvoiceAnalysis.findings = enhancedFindings
          }
        }

        analysis.aiEnhanced = true
        analysis.enhancedAt = new Date().toISOString()
      } catch (aiError) {
        log("error", endpoint, "AI enhancement failed:", aiError.message)
        analysis.aiError = aiError.message
      }
    }

    // Consume token after successful analysis
    const consumeResult = await tokenService.consumeTokens(user.id, tokenCost, "single_source_analysis", {
      integrationSources: ["fortnox"],
      description: "Fortnox cost leak analysis",
    })

    if (consumeResult.success) {
      log("log", endpoint, `Consumed ${tokenCost} token for user ${user.id}. Remaining: ${consumeResult.balanceAfter}`)
      analysis.tokensUsed = tokenCost
      analysis.tokensRemaining = consumeResult.balanceAfter
    }

    return res.json(analysis)
  } catch (error) {
    log("error", endpoint, "Error:", error.message)
    if (error.code === "TOKEN_EXPIRED" || error.requiresReconnect) {
      return res.status(400).json({
        error: error.message,
        code: "TOKEN_EXPIRED",
        action: "reconnect",
        requiresReconnect: true
      })
    }
    return res.status(500).json({
      error: error.message || "Failed to analyze cost leaks",
      details: error.stack || "No additional details"
    })
  }
}

module.exports = {
  startFortnoxOAuth,
  fortnoxOAuthCallback,
  syncFortnoxCustomers,
  getFortnoxCustomers,
  getFortnoxCompanyInfo,
  getFortnoxSettings,
  getFortnoxProfile,
  getFortnoxInvoices,
  getFortnoxSupplierInvoices,
  getFortnoxExpenses,
  getFortnoxVouchers,
  getFortnoxAccounts,
  getFortnoxArticles,
  getFortnoxSuppliers,
  analyzeFortnoxCostLeaks,
}
