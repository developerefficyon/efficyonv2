const { supabase } = require("../config/supabase")
const openaiService = require("../services/openaiService")
const comparisonAnalysisService = require("../services/comparisonAnalysisService")
const tokenService = require("../services/tokenService")
const { getModelPreference } = require("../services/modelPreferenceService")

// Token cost for deep research (same for all types)
const DEEP_RESEARCH_TOKEN_COST = 1

/**
 * Load recent conversation history from Supabase for LLM context.
 */
async function loadConversationHistory(conversationId, maxMessages = 20) {
  if (!conversationId) return []
  try {
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
    if (error || !messages || messages.length === 0) return []
    return messages.slice(-maxMessages)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error loading conversation history:`, err.message)
    return []
  }
}

/**
 * Chat with cross-platform comparison context
 * Supports any 2+ platforms connected (Fortnox, Microsoft 365, HubSpot)
 * If cachedResearchData is provided, uses it (free follow-up)
 * If no cached data, fetches from connected platforms (costs 1 token for deep research)
 */
async function chatComparison(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/chat/comparison`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { question, cachedResearchData, conversationId, stream } = req.body

    if (!question) {
      return res.status(400).json({ error: "question is required" })
    }

    // Load conversation history for multi-turn context
    const conversationHistory = await loadConversationHistory(conversationId)

    // Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with user" })
    }

    // Get all supported integrations (Fortnox, Microsoft 365, HubSpot)
    const { data: integrations, error: intError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("status", "connected")
      .in("provider", [
        "Fortnox", "fortnox",
        "Microsoft365", "microsoft365", "Microsoft 365", "microsoft 365",
        "HubSpot", "hubspot",
        "QuickBooks", "quickbooks",
        "Shopify", "shopify"
      ])

    if (intError) {
      console.error(`[${new Date().toISOString()}] Error fetching integrations:`, intError.message)
      return res.status(500).json({ error: "Failed to fetch integrations" })
    }

    // Find each platform's integration
    const fortnoxIntegration = integrations?.find(i =>
      i.provider?.toLowerCase() === "fortnox"
    )
    const m365Integration = integrations?.find(i =>
      i.provider?.toLowerCase() === "microsoft365" ||
      i.provider?.toLowerCase() === "microsoft 365"
    )
    const hubspotIntegration = integrations?.find(i =>
      i.provider?.toLowerCase() === "hubspot"
    )
    const quickbooksIntegration = integrations?.find(i =>
      i.provider?.toLowerCase() === "quickbooks"
    )
    const shopifyIntegration = integrations?.find(i =>
      i.provider?.toLowerCase() === "shopify"
    )

    // Count connected platforms
    const connectedPlatforms = [fortnoxIntegration, m365Integration, hubspotIntegration, quickbooksIntegration, shopifyIntegration].filter(Boolean)

    if (connectedPlatforms.length < 2) {
      const connected = []
      const missing = []
      if (fortnoxIntegration) connected.push("Fortnox")
      else missing.push("Fortnox")
      if (m365Integration) connected.push("Microsoft 365")
      else missing.push("Microsoft 365")
      if (hubspotIntegration) connected.push("HubSpot")
      else missing.push("HubSpot")
      if (quickbooksIntegration) connected.push("QuickBooks")
      else missing.push("QuickBooks")
      if (shopifyIntegration) connected.push("Shopify")
      else missing.push("Shopify")

      return res.status(400).json({
        error: `Cross-platform comparison requires at least 2 platforms connected. You have ${connectedPlatforms.length} connected (${connected.join(", ") || "none"}). Connect one of: ${missing.join(", ")}`
      })
    }

    // Get model preference for this user's team
    const modelPref = await getModelPreference(user.id)
    const modelOpts = { modelId: modelPref.modelId }

    let fortnoxData = null
    let m365Data = null
    let hubspotData = null
    let quickbooksData = null
    let shopifyData = null
    let metrics = null
    let tokensUsed = 0
    let isDeepResearch = false

    // Check if we have cached research data (free follow-up)
    // We consider it cached if at least 2 platforms have data
    const hasCachedData = cachedResearchData && (
      (cachedResearchData.fortnoxData && cachedResearchData.m365Data) ||
      (cachedResearchData.fortnoxData && cachedResearchData.hubspotData) ||
      (cachedResearchData.m365Data && cachedResearchData.hubspotData)
    )

    if (hasCachedData) {
      console.log(`[${new Date().toISOString()}] Using cached research data (free follow-up)`)
      fortnoxData = cachedResearchData.fortnoxData || null
      m365Data = cachedResearchData.m365Data || null
      hubspotData = cachedResearchData.hubspotData || null
      quickbooksData = cachedResearchData.quickbooksData || null
      shopifyData = cachedResearchData.shopifyData || null
      // Recalculate metrics from cached data
      metrics = comparisonAnalysisService.calculateCrossplatformMetrics(fortnoxData, m365Data, hubspotData)
    } else {
      // Need to fetch new data - this is a deep research request (costs 1 token)
      isDeepResearch = true
      console.log(`[${new Date().toISOString()}] Deep research requested - checking token balance`)

      // Calculate cost with model multiplier
      const tokenCost = DEEP_RESEARCH_TOKEN_COST * modelPref.multiplier

      // Check token balance before fetching
      const tokenCheck = await tokenService.checkTokenBalance(user.id, tokenCost)
      if (!tokenCheck.hasEnough) {
        return res.status(402).json({
          error: "INSUFFICIENT_TOKENS",
          message: `Cross-platform deep research requires ${tokenCost} token(s) (${modelPref.label}). You have ${tokenCheck.available} token(s) available.`,
          required: tokenCost,
          available: tokenCheck.available,
        })
      }

      // Fetch data from connected platforms in parallel
      console.log(`[${new Date().toISOString()}] Fetching data from ${connectedPlatforms.length} platforms...`)

      const fetchPromises = []
      const platformNames = []

      if (fortnoxIntegration) {
        fetchPromises.push(fetchFortnoxComparisonData(fortnoxIntegration, req))
        platformNames.push("fortnox")
      }
      if (m365Integration) {
        fetchPromises.push(fetchM365ComparisonData(m365Integration, req))
        platformNames.push("m365")
      }
      if (hubspotIntegration) {
        fetchPromises.push(fetchHubSpotComparisonData(hubspotIntegration, req))
        platformNames.push("hubspot")
      }
      if (quickbooksIntegration) {
        fetchPromises.push(fetchQuickBooksComparisonData(quickbooksIntegration, req))
        platformNames.push("quickbooks")
      }
      if (shopifyIntegration) {
        fetchPromises.push(fetchShopifyComparisonData(shopifyIntegration, req))
        platformNames.push("shopify")
      }

      const results = await Promise.all(fetchPromises)

      // Map results back to their platform variables
      platformNames.forEach((name, index) => {
        if (name === "fortnox") fortnoxData = results[index]
        else if (name === "m365") m365Data = results[index]
        else if (name === "hubspot") hubspotData = results[index]
        else if (name === "quickbooks") quickbooksData = results[index]
        else if (name === "shopify") shopifyData = results[index]
      })

      // Calculate cross-platform metrics
      console.log(`[${new Date().toISOString()}] Calculating cross-platform metrics...`)
      metrics = comparisonAnalysisService.calculateCrossplatformMetrics(fortnoxData, m365Data, hubspotData)

      // Consume token after successful data fetch
      const consumeResult = await tokenService.consumeTokens(user.id, tokenCost, "advanced_ai_deep_dive", {
        question: question.substring(0, 100),
        platformsAnalyzed: connectedPlatforms.length,
        fortnoxDataPoints: fortnoxData?.supplierInvoices?.length || 0,
        m365DataPoints: m365Data?.users?.length || 0,
        hubspotDataPoints: hubspotData?.users?.length || 0,
        modelUsed: modelPref.model,
      })

      if (consumeResult.success) {
        tokensUsed = tokenCost
        console.log(`[${new Date().toISOString()}] Consumed ${tokenCost} token(s) for deep research (${modelPref.label}). Remaining: ${consumeResult.balanceAfter}`)
      }
    }

    // Generate AI response with comparison context
    console.log(`[${new Date().toISOString()}] Generating AI response...`)
    const aiOpts = { ...modelOpts, conversationHistory }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")
      res.setHeader("X-Accel-Buffering", "no")
      res.flushHeaders()

      // Send metadata before streaming AI content
      const metadata = {
        researchData: { fortnoxData, m365Data, hubspotData, quickbooksData, shopifyData },
        isDeepResearch,
        tokensUsed,
      }
      res.write(`data: ${JSON.stringify({ metadata })}\n\n`)

      aiOpts.stream = true
      aiOpts.res = res
      await openaiService.chatWithComparisonContext(
        question, fortnoxData, m365Data, metrics, hubspotData, quickbooksData, shopifyData, aiOpts
      )
      return // Response already ended by streamChatCompletion
    }

    const response = await openaiService.chatWithComparisonContext(
      question,
      fortnoxData,
      m365Data,
      metrics,
      hubspotData,
      quickbooksData,
      shopifyData,
      aiOpts
    )

    return res.json({
      success: true,
      response,
      // Return research data so frontend can cache it for follow-ups
      researchData: {
        fortnoxData,
        m365Data,
        hubspotData,
        quickbooksData,
        shopifyData,
      },
      metrics: {
        costMetrics: metrics.costMetrics,
        activityMetrics: metrics.activityMetrics,
        efficiencyMetrics: metrics.efficiencyMetrics,
        gapAnalysis: {
          gapScore: metrics.gapAnalysis.gapScore,
          gapDescription: metrics.gapAnalysis.gapDescription,
          combinedSavings: metrics.gapAnalysis.combinedSavings,
        },
      },
      isDeepResearch,
      tokensUsed,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in chatComparison:`, error.message)

    // Token expiry from any platform — surface as 401 so the frontend can prompt reconnect
    const isTokenExpiry = error.message.toLowerCase().includes("expired") ||
      error.message.toLowerCase().includes("reconnect") ||
      error.message.toLowerCase().includes("token refresh failed")
    if (isTokenExpiry) {
      return res.status(401).json({
        error: "TOKEN_EXPIRED",
        message: error.message,
        action: "reconnect",
      })
    }

    res.status(500).json({ error: error.message })
  }
}

/**
 * Fetch Fortnox data for comparison analysis
 */
async function fetchFortnoxComparisonData(integration, req) {
  const fortnoxController = require("./fortnoxController")
  const mockReq = { ...req, user: req.user }

  const data = {
    supplierInvoices: null,
    costLeaks: null,
  }

  try {
    // Fetch supplier invoices
    const supplierInvoicesResult = await callControllerMethod(
      fortnoxController.getFortnoxSupplierInvoices,
      mockReq
    )
    data.supplierInvoices = supplierInvoicesResult?.supplierInvoices ||
                            supplierInvoicesResult?.SupplierInvoices ||
                            []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Fortnox supplier invoices:`, error.message)
  }

  try {
    // Fetch cost leak analysis
    const costLeaksResult = await callControllerMethod(
      fortnoxController.analyzeFortnoxCostLeaks,
      mockReq
    )
    data.costLeaks = costLeaksResult?.analysis || costLeaksResult || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Fortnox cost leaks:`, error.message)
  }

  return data
}

/**
 * Fetch Microsoft 365 data for comparison analysis
 */
async function fetchM365ComparisonData(integration, req) {
  const microsoft365Controller = require("./microsoft365Controller")
  const mockReq = { ...req, user: req.user }

  const data = {
    licenses: null,
    users: null,
    costLeaks: null,
  }

  try {
    // Fetch licenses
    const licensesResult = await callControllerMethod(
      microsoft365Controller.getMicrosoft365Licenses,
      mockReq
    )
    data.licenses = licensesResult?.licenses || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching M365 licenses:`, error.message)
  }

  try {
    // Fetch users with activity
    const usersResult = await callControllerMethod(
      microsoft365Controller.getMicrosoft365Users,
      mockReq
    )
    data.users = usersResult?.users || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching M365 users:`, error.message)
  }

  try {
    // Fetch cost leak analysis
    const costLeaksResult = await callControllerMethod(
      microsoft365Controller.analyzeMicrosoft365CostLeaks,
      mockReq
    )
    data.costLeaks = costLeaksResult?.analysis || costLeaksResult || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching M365 cost leaks:`, error.message)
  }

  return data
}

/**
 * Fetch HubSpot data for comparison analysis
 */
async function fetchHubSpotComparisonData(integration, req) {
  const hubspotController = require("./hubspotController")
  const mockReq = { ...req, user: req.user }

  const data = {
    users: null,
    accountInfo: null,
    costLeaks: null,
  }

  try {
    // Fetch users
    const usersResult = await callControllerMethod(
      hubspotController.getHubSpotUsers,
      mockReq
    )
    data.users = usersResult?.users || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching HubSpot users:`, error.message)
  }

  try {
    // Fetch account info
    const accountResult = await callControllerMethod(
      hubspotController.getHubSpotAccountInfo,
      mockReq
    )
    data.accountInfo = accountResult || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching HubSpot account info:`, error.message)
  }

  try {
    // Fetch cost leak analysis
    const costLeaksResult = await callControllerMethod(
      hubspotController.analyzeHubSpotCostLeaks,
      mockReq
    )
    data.costLeaks = costLeaksResult?.analysis || costLeaksResult || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching HubSpot cost leaks:`, error.message)
  }

  return data
}

/**
 * Helper to call controller methods and capture response data
 */
async function callControllerMethod(method, req) {
  return new Promise((resolve, reject) => {
    const mockRes = {
      json: (data) => resolve(data),
      status: (code) => ({
        json: (data) => {
          if (code >= 400) {
            reject(new Error(data.error || "Request failed"))
          } else {
            resolve(data)
          }
        }
      })
    }

    method(req, mockRes).catch(reject)
  })
}

/**
 * Fetch QuickBooks data for comparison analysis
 */
async function fetchQuickBooksComparisonData(integration, req) {
  const quickbooksController = require("./quickbooksController")
  const mockReq = { ...req, user: req.user }

  const data = {
    bills: null,
    costLeaks: null,
  }

  try {
    const billsResult = await callControllerMethod(
      quickbooksController.getQuickBooksBills,
      mockReq
    )
    data.bills = billsResult?.bills || billsResult?.Bill || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching QuickBooks bills:`, error.message)
  }

  try {
    const costLeaksResult = await callControllerMethod(
      quickbooksController.analyzeQuickBooksCostLeaks,
      mockReq
    )
    data.costLeaks = costLeaksResult?.analysis || costLeaksResult || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching QuickBooks cost leaks:`, error.message)
  }

  return data
}

/**
 * Fetch Shopify data for comparison analysis
 */
async function fetchShopifyComparisonData(integration, req) {
  const shopifyController = require("./shopifyController")
  const mockReq = { ...req, user: req.user }

  const data = {
    orders: null,
    products: null,
    appCharges: null,
    costLeaks: null,
  }

  try {
    const ordersResult = await callControllerMethod(
      shopifyController.getShopifyOrders,
      mockReq
    )
    data.orders = ordersResult?.orders || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Shopify orders:`, error.message)
  }

  try {
    const productsResult = await callControllerMethod(
      shopifyController.getShopifyProducts,
      mockReq
    )
    data.products = productsResult?.products || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Shopify products:`, error.message)
  }

  try {
    const appChargesResult = await callControllerMethod(
      shopifyController.getShopifyAppCharges,
      mockReq
    )
    data.appCharges = appChargesResult?.appCharges || appChargesResult?.recurring_application_charges || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Shopify app charges:`, error.message)
  }

  try {
    const costLeaksResult = await callControllerMethod(
      shopifyController.analyzeShopifyCostLeaks,
      mockReq
    )
    data.costLeaks = costLeaksResult?.analysis || costLeaksResult || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Shopify cost leaks:`, error.message)
  }

  return data
}

/**
 * Check if user has at least 2 platforms connected for comparison
 */
async function checkComparisonAvailability(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/chat/comparison/availability`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return res.json({
        available: false,
        reason: "No company associated with user",
        fortnoxConnected: false,
        m365Connected: false,
        hubspotConnected: false,
        connectedCount: 0,
      })
    }

    // Get integrations
    const { data: integrations } = await supabase
      .from("company_integrations")
      .select("provider, status")
      .eq("company_id", profile.company_id)
      .eq("status", "connected")

    const fortnoxConnected = integrations?.some(i =>
      i.provider?.toLowerCase() === "fortnox"
    ) || false

    const m365Connected = integrations?.some(i =>
      i.provider?.toLowerCase() === "microsoft365" ||
      i.provider?.toLowerCase() === "microsoft 365"
    ) || false

    const hubspotConnected = integrations?.some(i =>
      i.provider?.toLowerCase() === "hubspot"
    ) || false

    const quickbooksConnected = integrations?.some(i =>
      i.provider?.toLowerCase() === "quickbooks"
    ) || false

    const shopifyConnected = integrations?.some(i =>
      i.provider?.toLowerCase() === "shopify"
    ) || false

    const connectedCount = [fortnoxConnected, m365Connected, hubspotConnected, quickbooksConnected, shopifyConnected].filter(Boolean).length
    const available = connectedCount >= 2

    // Build reason string
    let reason = null
    if (!available) {
      const missing = []
      if (!fortnoxConnected) missing.push("Fortnox")
      if (!m365Connected) missing.push("Microsoft 365")
      if (!hubspotConnected) missing.push("HubSpot")
      if (!quickbooksConnected) missing.push("QuickBooks")
      if (!shopifyConnected) missing.push("Shopify")
      reason = `Need at least 2 platforms connected. Missing: ${missing.join(", ")}`
    }

    return res.json({
      available,
      fortnoxConnected,
      m365Connected,
      hubspotConnected,
      quickbooksConnected,
      shopifyConnected,
      connectedCount,
      reason,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in checkComparisonAvailability:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  chatComparison,
  checkComparisonAvailability,
}
