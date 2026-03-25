/**
 * Shopify Controller
 * Handles all Shopify integration operations: OAuth, orders, products, inventory, cost analysis
 *
 * KEY DIFFERENCES FROM OTHER PROVIDERS:
 * - Shopify access tokens are PERMANENT (no refresh token, no expiry)
 * - Per-shop URLs: every API call uses https://{shop_domain}/admin/api/2024-01/
 * - Auth header: X-Shopify-Access-Token (NOT Bearer)
 * - Shop domain stored in settings.shop_domain and oauth_data.shop_domain
 */

const crypto = require("crypto")
const { supabase } = require("../config/supabase")
const { analyzeShopifyCostLeaks } = require("../services/shopifyCostLeakAnalysis")
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

// Rate limiting for Shopify API (4 requests per second — bucket leak)
const shopifyRateLimit = new Map()

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = shopifyRateLimit.get(accessToken)

  if (!limit || now > limit.resetTime) {
    // Clean up expired entries to prevent unbounded Map growth
    for (const [token, entry] of shopifyRateLimit) {
      if (now > entry.resetTime) shopifyRateLimit.delete(token)
    }
    shopifyRateLimit.set(accessToken, { count: 1, resetTime: now + 1000 }) // 1 second window
    return { allowed: true, remaining: 3 }
  }

  if (limit.count >= 4) {
    const waitTime = Math.ceil((limit.resetTime - now))
    return {
      allowed: false,
      remaining: 0,
      resetIn: waitTime,
      message: `Rate limit exceeded. Please wait ${waitTime}ms before trying again.`
    }
  }

  limit.count++
  return { allowed: true, remaining: 4 - limit.count }
}

/**
 * Validate that a Shopify access token exists and is not empty.
 * Shopify tokens are permanent — no refresh logic needed.
 * If the token is missing or empty, throw an error indicating reconnection is required.
 *
 * @param {Object} integration - The company_integrations row
 * @returns {Object} - { accessToken, shopDomain }
 */
function ensureShopifyToken(integration) {
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data || {})
  const tokens = oauthData?.tokens || {}
  const accessToken = tokens.access_token || oauthData?.access_token

  if (!accessToken || accessToken.trim() === "") {
    const error = new Error("No valid Shopify access token. Please reconnect your Shopify integration.")
    error.code = "TOKEN_MISSING"
    error.requiresReconnect = true
    throw error
  }

  // Shop domain from oauth_data (set during callback) or from integration settings
  const settings = decryptIntegrationSettings(integration.settings || {})
  const shopDomain = oauthData.shop_domain || settings.shop_domain

  if (!shopDomain) {
    throw new Error("Shop domain not found. Please reconnect your Shopify integration.")
  }

  return { accessToken, shopDomain }
}

/**
 * Fetch data from the Shopify Admin API.
 * URL: https://{shopDomain}/admin/api/2024-01{endpoint}
 * Auth: X-Shopify-Access-Token header
 *
 * @param {string} endpoint - API path starting with / (e.g., /shop.json)
 * @param {string} accessToken - Shopify permanent access token
 * @param {string} shopDomain - The myshopify.com domain (e.g., store-name.myshopify.com)
 * @returns {Object} - Parsed JSON response
 */
async function fetchShopifyAPI(endpoint, accessToken, shopDomain) {
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
  }

  const url = `https://${shopDomain}/admin/api/2024-01${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) { /* Not JSON */ }

    if (response.status === 401) {
      throw new Error("Shopify access token is invalid or the app has been uninstalled. Please reconnect Shopify.")
    }

    if (response.status === 403) {
      const errorMessage = errorData.errors || errorText || "Access denied"
      throw new Error(`Missing Shopify permission: ${errorMessage}`)
    }

    if (response.status === 429) {
      throw new Error("Shopify API rate limit exceeded. Please try again in a moment.")
    }

    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Mark an integration as expired when a 401 is received from Shopify.
 * This means the app was likely uninstalled from the store.
 */
async function markShopifyExpired(integrationId) {
  const { error } = await supabase
    .from("company_integrations")
    .update({ status: "expired" })
    .eq("id", integrationId)

  if (error) {
    log("error", "markShopifyExpired", `Failed to mark integration ${integrationId} as expired: ${error.message}`)
  }
}

// Helper to get integration for current user
async function getIntegrationForUser(user, provider = "Shopify") {
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
async function startShopifyOAuth(req, res) {
  const endpoint = "GET /api/integrations/shopify/oauth/start"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    log("error", endpoint, `Failed to get integration: ${result.error}`)
    return res.status(result.status).json({ error: result.error })
  }

  const { integration, companyId } = result
  log("log", endpoint, `Found integration for company ${companyId}, integration id: ${integration.id}`)

  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id || integration?.client_id
  const shopDomain = settings.shop_domain

  if (!clientId) {
    log("error", endpoint, "Client ID not found in integration settings")
    return res.status(400).json({
      error: "Shopify Client ID not configured",
      details: "Please update the integration with your Client ID, Client Secret, and Shop Domain."
    })
  }

  if (!shopDomain) {
    log("error", endpoint, "Shop domain not found in integration settings")
    return res.status(400).json({
      error: "Shopify Shop Domain not configured",
      details: "Please update the integration with your Shop Domain (e.g., store-name.myshopify.com)."
    })
  }

  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || "http://localhost:4000/api/integrations/shopify/callback"

  // Scopes for Shopify data access
  const scope = "read_orders,read_products,read_inventory,read_analytics,read_billing"

  const statePayload = { company_id: companyId, shop_domain: shopDomain }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")

  const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", scope)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()

  log("log", endpoint, `Starting Shopify OAuth for company ${companyId}, shop: ${shopDomain}, redirect_uri: ${redirectUri}`)

  const acceptHeader = req.headers.accept || ""
  if (acceptHeader.includes("application/json")) {
    return res.json({ url: authUrlString })
  }

  return res.redirect(authUrlString)
}

// OAuth Callback
async function shopifyOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/shopify/callback"
  log("log", endpoint, "Request received", { query: req.query })

  if (!supabase) {
    return res.status(500).send("Supabase not configured on backend")
  }

  const { code, state, shop, hmac, timestamp } = req.query
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  log("log", endpoint, `Callback params - code: ${code ? "present" : "missing"}, state: ${state ? "present" : "missing"}, shop: ${shop || "missing"}, hmac: ${hmac ? "present" : "missing"}`)

  // Helper to clean up pending integration on OAuth failure
  const cleanupPendingIntegration = async (companyId) => {
    try {
      const { data: pending } = await supabase
        .from("company_integrations")
        .select("id, status")
        .eq("company_id", companyId)
        .ilike("provider", "shopify")
        .eq("status", "pending")
        .maybeSingle()
      if (pending) {
        await supabase.from("company_integrations").delete().eq("id", pending.id)
        log("log", endpoint, `Cleaned up pending Shopify integration ${pending.id}`)
      }
    } catch (e) {
      log("error", endpoint, `Failed to cleanup pending integration: ${e.message}`)
    }
  }

  if (!code || !state) {
    log("error", endpoint, `Missing params - code: ${!!code}, state: ${!!state}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_missing_code`)
  }

  // Validate HMAC to verify request authenticity
  if (hmac) {
    // Build the message from all query params except hmac
    const queryParams = { ...req.query }
    delete queryParams.hmac

    const sortedKeys = Object.keys(queryParams).sort()
    const message = sortedKeys.map(key => `${key}=${queryParams[key]}`).join("&")

    // We need the client secret from the integration to verify HMAC
    // For now, decode state to get company_id and look up credentials
    let tempState
    try {
      tempState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
    } catch (e) {
      log("error", endpoint, `Failed to decode state for HMAC validation: ${e.message}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_invalid_state`)
    }

    // Look up integration to get client_secret for HMAC verification
    const { data: tempIntegration } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", tempState.company_id)
      .eq("provider", "Shopify")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tempIntegration) {
      const tempSettings = decryptIntegrationSettings(tempIntegration.settings || {})
      const clientSecret = tempSettings.client_secret || tempIntegration.client_secret

      if (clientSecret) {
        const computedHmac = crypto
          .createHmac("sha256", clientSecret)
          .update(message)
          .digest("hex")

        if (computedHmac !== hmac) {
          log("error", endpoint, "HMAC validation failed - request may not be authentic")
          if (tempIntegration.status === "pending") await cleanupPendingIntegration(tempState.company_id)
          return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_hmac_invalid`)
        }
        log("log", endpoint, "HMAC validation passed")
      } else {
        log("warn", endpoint, "Client secret not found, skipping HMAC validation")
      }
    }
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
    log("log", endpoint, `Decoded state - company_id: ${decodedState.company_id}, shop_domain: ${decodedState.shop_domain}`)
  } catch (e) {
    log("error", endpoint, `Failed to decode state: ${e.message}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_invalid_state`)
  }

  const companyId = decodedState.company_id
  const shopDomain = shop || decodedState.shop_domain

  if (!shopDomain) {
    log("error", endpoint, "Shop domain not found in callback params or state")
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_missing_shop`)
  }

  // Try both "Shopify" and "shopify" to handle case sensitivity
  let integration = null
  let integrationError = null

  // First try exact match
  const { data: exactMatch, error: exactError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "Shopify")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (exactMatch) {
    integration = exactMatch
    log("log", endpoint, `Found integration with provider "Shopify", id: ${integration.id}`)
  } else {
    // Try case-insensitive match
    const { data: allIntegrations, error: allError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (allIntegrations) {
      integration = allIntegrations.find(i =>
        i.provider?.toLowerCase() === "shopify"
      )
      if (integration) {
        log("log", endpoint, `Found integration with provider "${integration.provider}" (case-insensitive), id: ${integration.id}`)
      } else {
        log("error", endpoint, `No Shopify integration found. Available providers: ${allIntegrations.map(i => i.provider).join(", ")}`)
      }
    }
    integrationError = exactError || allError
  }

  if (integrationError || !integration) {
    log("error", endpoint, `Integration not found for company ${companyId}`, { error: integrationError?.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_integration_not_found`)
  }

  // Decrypt settings to get client credentials
  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret

  log("log", endpoint, `Credentials check - clientId: ${clientId ? "present" : "missing"}, clientSecret: ${clientSecret ? "present" : "missing"}`)

  if (!clientId || !clientSecret) {
    log("error", endpoint, "Client ID or Secret missing from integration settings")
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_missing_credentials`)
  }

  try {
    // Exchange code for permanent access token
    const tokenEndpoint = `https://${shopDomain}/admin/oauth/access_token`

    log("log", endpoint, "Exchanging authorization code for access token...")

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      log("error", endpoint, `Token exchange failed (${tokenResponse.status}): ${errorText}`)
      if (integration.status === "pending") await cleanupPendingIntegration(companyId)
      return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_token&details=${encodeURIComponent(errorText.substring(0, 100))}`)
    }

    const tokenData = await tokenResponse.json()
    log("log", endpoint, `Token exchange successful - access_token: ${tokenData.access_token ? "present" : "missing"}, scope: ${tokenData.scope || "N/A"}`)

    // Shopify tokens are permanent — no refresh_token, no expires_in
    const newOauthData = {
      tokens: {
        access_token: tokenData.access_token,
        token_type: "shopify_permanent",
        scope: tokenData.scope,
      },
      shop_domain: shopDomain,
    }

    // Encrypt sensitive OAuth data before saving
    const encryptedOauthData = encryptOAuthData(newOauthData)

    const currentSettings = integration.settings || {}
    const updatedSettings = {
      ...currentSettings,
      oauth_data: encryptedOauthData,
      shop_domain: shopDomain,
    }

    // Update integration with new token
    log("log", endpoint, `Updating integration ${integration.id} with new access token...`)
    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings, status: "connected" })
      .eq("id", integration.id)

    if (updateError) {
      log("error", endpoint, `Failed to save token: ${updateError.message}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_saving_tokens`)
    }

    log("log", endpoint, `Shopify OAuth completed successfully for integration ${integration.id}, shop: ${shopDomain}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=connected`)
  } catch (e) {
    log("error", endpoint, `Unexpected error: ${e.message}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?shopify=error_unexpected`)
  }
}

// Get Shopify Shop Info
async function getShopifyShopInfo(req, res) {
  const endpoint = "GET /api/integrations/shopify/shop"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  try {
    const { accessToken, shopDomain } = ensureShopifyToken(integration)

    const data = await fetchShopifyAPI("/shop.json", accessToken, shopDomain)

    return res.json({
      success: true,
      shop: data.shop || data,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("invalid") || error.message.includes("uninstalled") || error.message.includes("reconnect")) {
      await markShopifyExpired(integration.id)
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Shopify Orders
async function getShopifyOrders(req, res) {
  const endpoint = "GET /api/integrations/shopify/orders"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  try {
    const { accessToken, shopDomain } = ensureShopifyToken(integration)

    const data = await fetchShopifyAPI("/orders.json?status=any&limit=250", accessToken, shopDomain)

    return res.json({
      success: true,
      orders: data.orders || [],
      total: data.orders?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("invalid") || error.message.includes("uninstalled") || error.message.includes("reconnect")) {
      await markShopifyExpired(integration.id)
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Shopify Products
async function getShopifyProducts(req, res) {
  const endpoint = "GET /api/integrations/shopify/products"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  try {
    const { accessToken, shopDomain } = ensureShopifyToken(integration)

    const data = await fetchShopifyAPI("/products.json?limit=250", accessToken, shopDomain)

    return res.json({
      success: true,
      products: data.products || [],
      total: data.products?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("invalid") || error.message.includes("uninstalled") || error.message.includes("reconnect")) {
      await markShopifyExpired(integration.id)
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Shopify Recurring Application Charges (App Subscriptions)
async function getShopifyAppCharges(req, res) {
  const endpoint = "GET /api/integrations/shopify/app-charges"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  try {
    const { accessToken, shopDomain } = ensureShopifyToken(integration)

    const data = await fetchShopifyAPI("/recurring_application_charges.json", accessToken, shopDomain)

    return res.json({
      success: true,
      charges: data.recurring_application_charges || [],
      total: data.recurring_application_charges?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("invalid") || error.message.includes("uninstalled") || error.message.includes("reconnect")) {
      await markShopifyExpired(integration.id)
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get Shopify Inventory Levels (multi-step: locations first, then inventory)
async function getShopifyInventoryLevels(req, res) {
  const endpoint = "GET /api/integrations/shopify/inventory"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  try {
    const { accessToken, shopDomain } = ensureShopifyToken(integration)

    // Step 1: Get all locations
    log("log", endpoint, "Fetching locations...")
    const locationsData = await fetchShopifyAPI("/locations.json", accessToken, shopDomain)
    const locations = locationsData.locations || []

    if (locations.length === 0) {
      log("warn", endpoint, "No locations found for this shop")
      return res.json({
        success: true,
        locations: [],
        inventory_levels: [],
        total: 0,
      })
    }

    const locationIds = locations.map(loc => loc.id).join(",")
    log("log", endpoint, `Found ${locations.length} locations, fetching inventory levels...`)

    // Step 2: Get inventory levels for all locations
    const inventoryData = await fetchShopifyAPI(`/inventory_levels.json?location_ids=${locationIds}&limit=250`, accessToken, shopDomain)

    return res.json({
      success: true,
      locations: locations,
      inventory_levels: inventoryData.inventory_levels || [],
      total: inventoryData.inventory_levels?.length || 0,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("invalid") || error.message.includes("uninstalled") || error.message.includes("reconnect")) {
      await markShopifyExpired(integration.id)
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Analyze Shopify Cost Leaks
async function analyzeShopifyCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/shopify/cost-leaks"
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

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  // Decrypt settings to get pricing info and OAuth data
  const settings = decryptIntegrationSettings(integration.settings || {})
  const pricing = settings.pricing || null
  if (pricing) {
    log("log", endpoint, `Found pricing info: ${pricing.plan || "unknown"} plan`)
  } else {
    log("warn", endpoint, "No pricing info found in integration settings, will use default estimate")
  }

  try {
    const { accessToken, shopDomain } = ensureShopifyToken(integration)

    log("log", endpoint, `Fetching Shopify data in parallel for shop: ${shopDomain}`)

    // Fetch all data in parallel
    const [ordersData, productsData, chargesData, locationsData] = await Promise.all([
      fetchShopifyAPI("/orders.json?status=any&limit=250", accessToken, shopDomain).catch(e => {
        log("warn", endpoint, `Failed to fetch orders: ${e.message}`)
        return { orders: [] }
      }),
      fetchShopifyAPI("/products.json?limit=250", accessToken, shopDomain).catch(e => {
        log("warn", endpoint, `Failed to fetch products: ${e.message}`)
        return { products: [] }
      }),
      fetchShopifyAPI("/recurring_application_charges.json", accessToken, shopDomain).catch(e => {
        log("warn", endpoint, `Failed to fetch app charges: ${e.message}`)
        return { recurring_application_charges: [] }
      }),
      fetchShopifyAPI("/locations.json", accessToken, shopDomain).catch(e => {
        log("warn", endpoint, `Failed to fetch locations: ${e.message}`)
        return { locations: [] }
      }),
    ])

    // Fetch inventory levels using location IDs
    let inventoryLevels = []
    const locations = locationsData.locations || []
    if (locations.length > 0) {
      const locationIds = locations.map(loc => loc.id).join(",")
      try {
        const inventoryData = await fetchShopifyAPI(`/inventory_levels.json?location_ids=${locationIds}&limit=250`, accessToken, shopDomain)
        inventoryLevels = inventoryData.inventory_levels || []
      } catch (e) {
        log("warn", endpoint, `Failed to fetch inventory levels: ${e.message}`)
      }
    }

    const orders = ordersData.orders || []
    const products = productsData.products || []
    const appCharges = chargesData.recurring_application_charges || []

    log("log", endpoint, `Data fetched - orders: ${orders.length}, products: ${products.length}, app charges: ${appCharges.length}, inventory levels: ${inventoryLevels.length}`)

    // Run cost leak analysis
    const analysis = analyzeShopifyCostLeaks(orders, products, appCharges, {
      inventoryLevels,
      locations,
      inactiveDays: inactivityDays,
      pricing,
      shopDomain,
    })

    // Add inactivity threshold to response
    analysis.inactivityThreshold = inactivityDays

    log("log", endpoint, `Analysis completed, ${analysis.summary?.issuesFound || 0} findings, potential savings: $${analysis.summary?.potentialMonthlySavings || 0}/month`)

    return res.json(analysis)
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    if (error.message.includes("invalid") || error.message.includes("uninstalled") || error.message.includes("reconnect")) {
      await markShopifyExpired(integration.id)
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({
      error: error.message || "Failed to analyze Shopify cost leaks",
      details: error.stack || "No additional details"
    })
  }
}

// Disconnect Shopify integration (clear oauth data and set status)
// Note: Shopify has no token revocation endpoint for custom/public apps.
// The token becomes invalid only when the merchant uninstalls the app.
async function disconnectShopify(req, res) {
  const endpoint = "DELETE /api/integrations/shopify/disconnect"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const result = await getIntegrationForUser(user, "Shopify")
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  const { integration } = result

  // Update integration status to disconnected and clear oauth data
  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings, oauth_data: null }

  const { error: updateError } = await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings, status: "disconnected" })
    .eq("id", integration.id)

  if (updateError) {
    log("error", endpoint, `Failed to update integration: ${updateError.message}`)
    return res.status(500).json({ error: "Failed to disconnect Shopify" })
  }

  log("log", endpoint, "Shopify disconnected successfully")
  return res.json({ success: true, message: "Shopify disconnected. You will need to re-authorize when reconnecting." })
}

module.exports = {
  startShopifyOAuth,
  shopifyOAuthCallback,
  getShopifyShopInfo,
  getShopifyOrders,
  getShopifyProducts,
  getShopifyAppCharges,
  getShopifyInventoryLevels,
  analyzeShopifyCostLeaks: analyzeShopifyCostLeaksEndpoint,
  disconnectShopify,
  // Export helpers for use in comparison controller
  ensureShopifyToken,
  fetchShopifyAPI,
  getIntegrationForUser,
}
