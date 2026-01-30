/**
 * Analysis History Controller
 * Handles saving and retrieving cost leak analysis history
 */

const { supabase } = require("../config/supabase")

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

/**
 * Save a cost leak analysis to history
 */
async function saveAnalysis(req, res) {
  const endpoint = "POST /api/analysis-history"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { integrationId, provider, parameters, analysisData } = req.body

  if (!integrationId || !provider || !analysisData) {
    return res.status(400).json({ error: "Missing required fields: integrationId, provider, analysisData" })
  }

  // Get user's company
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    log("error", endpoint, "No company associated with user")
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  // Verify the integration belongs to this company
  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("id, provider")
    .eq("id", integrationId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (integrationError || !integration) {
    log("error", endpoint, "Integration not found or access denied")
    return res.status(404).json({ error: "Integration not found" })
  }

  // Extract summary from analysis data
  const summary = extractSummary(analysisData, provider)

  try {
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("cost_leak_analyses")
      .insert({
        company_id: companyId,
        integration_id: integrationId,
        provider: provider,
        parameters: parameters || {},
        summary: summary,
        analysis_data: analysisData,
      })
      .select()
      .single()

    if (saveError) {
      log("error", endpoint, `Failed to save analysis: ${saveError.message}`)
      return res.status(500).json({ error: "Failed to save analysis" })
    }

    log("log", endpoint, `Analysis saved successfully, id: ${savedAnalysis.id}`)
    return res.json({
      success: true,
      id: savedAnalysis.id,
      message: "Analysis saved to history",
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Get analysis history for an integration
 */
async function getAnalysisHistory(req, res) {
  const endpoint = "GET /api/analysis-history"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { integrationId, provider, limit = 20, offset = 0 } = req.query

  // Get user's company
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  try {
    let query = supabase
      .from("cost_leak_analyses")
      .select("id, provider, parameters, summary, created_at", { count: "exact" })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    // Filter by integration if provided
    if (integrationId) {
      query = query.eq("integration_id", integrationId)
    }

    // Filter by provider if provided
    if (provider) {
      query = query.eq("provider", provider)
    }

    const { data: analyses, error: fetchError, count } = await query

    if (fetchError) {
      log("error", endpoint, `Failed to fetch history: ${fetchError.message}`)
      return res.status(500).json({ error: "Failed to fetch analysis history" })
    }

    log("log", endpoint, `Found ${analyses?.length || 0} analyses`)
    return res.json({
      success: true,
      analyses: analyses || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Get a single analysis by ID (full data)
 */
async function getAnalysisById(req, res) {
  const endpoint = "GET /api/analysis-history/:id"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: "Analysis ID is required" })
  }

  // Get user's company
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  try {
    const { data: analysis, error: fetchError } = await supabase
      .from("cost_leak_analyses")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle()

    if (fetchError) {
      log("error", endpoint, `Failed to fetch analysis: ${fetchError.message}`)
      return res.status(500).json({ error: "Failed to fetch analysis" })
    }

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" })
    }

    log("log", endpoint, `Found analysis ${id}`)
    return res.json({
      success: true,
      analysis,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Delete an analysis from history
 */
async function deleteAnalysis(req, res) {
  const endpoint = "DELETE /api/analysis-history/:id"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: "Analysis ID is required" })
  }

  // Get user's company
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  try {
    const { error: deleteError } = await supabase
      .from("cost_leak_analyses")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)

    if (deleteError) {
      log("error", endpoint, `Failed to delete analysis: ${deleteError.message}`)
      return res.status(500).json({ error: "Failed to delete analysis" })
    }

    log("log", endpoint, `Deleted analysis ${id}`)
    return res.json({
      success: true,
      message: "Analysis deleted successfully",
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Extract summary from analysis data based on provider
 */
function extractSummary(analysisData, provider) {
  const summary = {
    totalFindings: 0,
    totalPotentialSavings: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    healthScore: null,
  }

  if (provider === "Fortnox") {
    const overall = analysisData.overallSummary || {}
    summary.totalFindings = overall.totalFindings || 0
    summary.totalPotentialSavings = overall.totalPotentialSavings || 0
    summary.highSeverity = overall.highSeverity || 0
    summary.mediumSeverity = overall.mediumSeverity || 0
    summary.lowSeverity = overall.lowSeverity || 0
  } else if (provider === "Microsoft365") {
    const overall = analysisData.overallSummary || {}
    summary.totalFindings = overall.totalFindings || 0
    summary.totalPotentialSavings = overall.totalPotentialSavings || 0
    summary.highSeverity = overall.highSeverity || 0
    summary.mediumSeverity = overall.mediumSeverity || 0
    summary.lowSeverity = overall.lowSeverity || 0
    // MS365 might have health score in license analysis
    if (analysisData.licenseAnalysis?.summary?.healthScore !== undefined) {
      summary.healthScore = analysisData.licenseAnalysis.summary.healthScore
    }
  } else if (provider === "HubSpot") {
    const summaryData = analysisData.summary || {}
    summary.totalFindings = summaryData.issuesFound || 0
    summary.totalPotentialSavings = summaryData.potentialMonthlySavings || 0
    summary.highSeverity = summaryData.highSeverityIssues || 0
    summary.mediumSeverity = summaryData.mediumSeverityIssues || 0
    summary.lowSeverity = summaryData.lowSeverityIssues || 0
    summary.healthScore = summaryData.healthScore || null
  }

  return summary
}

module.exports = {
  saveAnalysis,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
}
