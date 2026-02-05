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

/**
 * Generate recommendations from findings for providers that don't have explicit recommendations
 * (Microsoft 365, Fortnox)
 */
function generateRecommendationsFromFindings(analysisData, provider, summary) {
  const recommendations = []

  if (provider === "Microsoft365") {
    // Extract from licenseAnalysis findings
    const findings = analysisData.licenseAnalysis?.findings || []
    const totalSavings = summary.totalPotentialSavings || 0

    // Group findings by type
    const inactiveCount = findings.filter(f => f.type === "inactive_license").length
    const orphanedCount = findings.filter(f => f.type === "orphaned_license").length
    const overProvisionedCount = findings.filter(f => f.type === "over_provisioned").length

    if (orphanedCount > 0) {
      const orphanedSavings = findings
        .filter(f => f.type === "orphaned_license")
        .reduce((sum, f) => sum + (f.potentialSavings || 0), 0)
      recommendations.push({
        priority: 1,
        action: "Remove Orphaned Licenses",
        description: `Remove ${orphanedCount} license(s) from disabled accounts to save $${orphanedSavings}/month`,
        impact: "high",
        effort: "low",
        savings: orphanedSavings,
      })
    }

    if (inactiveCount > 0) {
      const inactiveSavings = findings
        .filter(f => f.type === "inactive_license")
        .reduce((sum, f) => sum + (f.potentialSavings || 0), 0)
      recommendations.push({
        priority: 2,
        action: "Remove Inactive User Licenses",
        description: `Review ${inactiveCount} inactive user(s) and remove licenses to save $${inactiveSavings}/month`,
        impact: "high",
        effort: "medium",
        savings: inactiveSavings,
      })
    }

    if (overProvisionedCount > 0) {
      const overSavings = findings
        .filter(f => f.type === "over_provisioned")
        .reduce((sum, f) => sum + (f.potentialSavings || 0), 0)
      recommendations.push({
        priority: 3,
        action: "Review License Tiers",
        description: `${overProvisionedCount} user(s) may have over-provisioned licenses. Downgrading could save $${overSavings}/month`,
        impact: "medium",
        effort: "medium",
        savings: overSavings,
      })
    }

    // If no specific issues but we have data, add a positive recommendation
    if (recommendations.length === 0 && (analysisData.licenseAnalysis?.summary?.totalUsers > 0)) {
      recommendations.push({
        priority: 1,
        action: "Maintain Current Setup",
        description: "Your Microsoft 365 license allocation looks healthy. Continue monitoring usage.",
        impact: "low",
        effort: "low",
        savings: 0,
      })
    }
  } else if (provider === "Fortnox") {
    // Extract from supplierInvoiceAnalysis and other analyses
    const supplierFindings = analysisData.supplierInvoiceAnalysis?.findings || analysisData.findings || []
    const overallSummary = analysisData.overallSummary || {}
    const totalSavings = overallSummary.totalPotentialSavings || 0

    // Group by finding type
    const duplicates = supplierFindings.filter(f => f.type === "duplicate_payment" || f.category === "duplicates")
    const anomalies = supplierFindings.filter(f => f.type === "pricing_anomaly" || f.category === "anomalies")
    const overdue = supplierFindings.filter(f => f.type === "overdue_invoice" || f.category === "overdue")

    if (duplicates.length > 0) {
      const dupSavings = duplicates.reduce((sum, f) => sum + (f.potentialSavings || f.amount || 0), 0)
      recommendations.push({
        priority: 1,
        action: "Review Duplicate Payments",
        description: `Found ${duplicates.length} potential duplicate payment(s). Investigate to recover $${dupSavings.toFixed(2)}`,
        impact: "high",
        effort: "medium",
        savings: dupSavings,
      })
    }

    if (anomalies.length > 0) {
      const anomalySavings = anomalies.reduce((sum, f) => sum + (f.potentialSavings || 0), 0)
      recommendations.push({
        priority: 2,
        action: "Investigate Pricing Anomalies",
        description: `Found ${anomalies.length} pricing anomaly(ies) that may indicate overbilling`,
        impact: "medium",
        effort: "medium",
        savings: anomalySavings,
      })
    }

    if (overdue.length > 0) {
      recommendations.push({
        priority: 3,
        action: "Collect Overdue Invoices",
        description: `${overdue.length} invoice(s) are overdue. Follow up to improve cash flow`,
        impact: "medium",
        effort: "low",
        savings: 0,
      })
    }

    // If no issues found, add positive feedback
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 1,
        action: "Maintain Current Processes",
        description: "No significant cost leaks detected in your Fortnox data. Continue monitoring.",
        impact: "low",
        effort: "low",
        savings: 0,
      })
    }
  }

  return recommendations
}

/**
 * Helper to derive a category from action type
 */
function getCategoryFromAction(action) {
  if (!action) return "Optimization"
  const actionLower = action.toLowerCase()
  if (actionLower.includes("remove") || actionLower.includes("inactive")) return "License Cleanup"
  if (actionLower.includes("audit") || actionLower.includes("review")) return "Plan Optimization"
  if (actionLower.includes("downgrade") || actionLower.includes("upgrade")) return "Plan Optimization"
  if (actionLower.includes("seat") || actionLower.includes("license")) return "Seat Optimization"
  if (actionLower.includes("maintain") || actionLower.includes("monitor")) return "Monitoring"
  return "Optimization"
}

/**
 * Get dashboard summary - aggregates latest analysis from each integration
 * Returns data suitable for the main dashboard display
 */
async function getDashboardSummary(req, res) {
  const endpoint = "GET /api/dashboard/summary"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
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
    // Get all connected integrations for this company
    const { data: integrations, error: intError } = await supabase
      .from("company_integrations")
      .select("id, provider, status")
      .eq("company_id", companyId)
      .in("status", ["connected", "warning"])

    if (intError) {
      log("error", endpoint, `Failed to fetch integrations: ${intError.message}`)
      return res.status(500).json({ error: "Failed to fetch integrations" })
    }

    const connectedTools = integrations?.length || 0

    // If no integrations, return empty summary
    if (connectedTools === 0) {
      log("log", endpoint, "No connected integrations, returning empty summary")
      return res.json({
        success: true,
        hasData: false,
        summary: null,
        tools: [],
        recommendations: [],
        lastAnalysisAt: null,
      })
    }

    // Get the latest analysis for each integration
    const { data: latestAnalyses, error: analysisError } = await supabase
      .from("cost_leak_analyses")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (analysisError) {
      log("error", endpoint, `Failed to fetch analyses: ${analysisError.message}`)
      return res.status(500).json({ error: "Failed to fetch analyses" })
    }

    // If no analyses, return summary with integrations but no analysis data
    if (!latestAnalyses || latestAnalyses.length === 0) {
      log("log", endpoint, "No analyses found, returning integrations only")
      return res.json({
        success: true,
        hasData: false,
        summary: null,
        tools: integrations.map(i => ({
          id: i.id,
          name: i.provider,
          status: i.status,
          hasAnalysis: false,
        })),
        recommendations: [],
        lastAnalysisAt: null,
      })
    }

    // Get only the latest analysis per integration
    const latestByIntegration = new Map()
    for (const analysis of latestAnalyses) {
      if (!latestByIntegration.has(analysis.integration_id)) {
        latestByIntegration.set(analysis.integration_id, analysis)
      }
    }

    // Aggregate summary data
    let totalPotentialSavings = 0
    let totalFindings = 0
    let highSeverity = 0
    let mediumSeverity = 0
    let lowSeverity = 0
    let totalHealthScore = 0
    let healthScoreCount = 0
    let lastAnalysisAt = null

    const toolsWithAnalysis = []
    const allRecommendations = []

    for (const [integrationId, analysis] of latestByIntegration) {
      const summary = analysis.summary || {}
      const analysisData = analysis.analysis_data || {}

      totalPotentialSavings += summary.totalPotentialSavings || 0
      totalFindings += summary.totalFindings || 0
      highSeverity += summary.highSeverity || 0
      mediumSeverity += summary.mediumSeverity || 0
      lowSeverity += summary.lowSeverity || 0

      if (summary.healthScore !== null && summary.healthScore !== undefined) {
        totalHealthScore += summary.healthScore
        healthScoreCount++
      }

      if (!lastAnalysisAt || new Date(analysis.created_at) > new Date(lastAnalysisAt)) {
        lastAnalysisAt = analysis.created_at
      }

      // Build tool info
      const integration = integrations.find(i => i.id === integrationId)
      toolsWithAnalysis.push({
        id: integrationId,
        name: analysis.provider,
        status: integration?.status || "unknown",
        hasAnalysis: true,
        potentialSavings: summary.totalPotentialSavings || 0,
        findings: summary.totalFindings || 0,
        healthScore: summary.healthScore,
        lastAnalyzed: analysis.created_at,
        wasteLevel: summary.highSeverity > 0 ? "high" : summary.mediumSeverity > 0 ? "medium" : "low",
      })

      // Extract recommendations from analysis data
      // First check for explicit recommendations array (HubSpot style)
      let recs = analysisData.recommendations || []

      // If no recommendations array, generate from findings (MS365/Fortnox style)
      if (recs.length === 0) {
        recs = generateRecommendationsFromFindings(analysisData, analysis.provider, summary)
      }

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        allRecommendations.push({
          id: `${integrationId}-${i}`,
          type: rec.action || rec.type || "optimize",
          category: rec.category || getCategoryFromAction(rec.action),
          title: rec.action || rec.title || "Optimization Recommendation",
          description: rec.description || "",
          savings: rec.savings || 0,
          impact: rec.impact || "medium",
          effort: rec.effort || "medium",
          tool: analysis.provider,
          priority: rec.priority || 99,
          integrationId: integrationId,
        })
      }
    }

    // Add integrations without analysis
    for (const integration of integrations) {
      if (!latestByIntegration.has(integration.id)) {
        toolsWithAnalysis.push({
          id: integration.id,
          name: integration.provider,
          status: integration.status,
          hasAnalysis: false,
          potentialSavings: 0,
          findings: 0,
          healthScore: null,
          lastAnalyzed: null,
          wasteLevel: "unknown",
        })
      }
    }

    // Calculate average health score
    const avgHealthScore = healthScoreCount > 0 ? Math.round(totalHealthScore / healthScoreCount) : null

    // Calculate efficiency score (inverse of waste)
    // If we have savings data, efficiency = 100 - (waste percentage based on some baseline)
    // For now, use health score as efficiency, or default to null
    const efficiencyScore = avgHealthScore

    // Sort recommendations by priority/impact
    allRecommendations.sort((a, b) => {
      const priorityA = a.priority || (a.impact === "high" ? 1 : a.impact === "medium" ? 2 : 3)
      const priorityB = b.priority || (b.impact === "high" ? 1 : b.impact === "medium" ? 2 : 3)
      return priorityA - priorityB
    })

    const dashboardSummary = {
      totalPotentialSavings,
      totalFindings,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      efficiencyScore,
      avgHealthScore,
      connectedTools,
      analyzedTools: latestByIntegration.size,
    }

    log("log", endpoint, `Dashboard summary: ${connectedTools} tools, ${totalFindings} findings, $${totalPotentialSavings} potential savings, ${allRecommendations.length} recommendations`)

    return res.json({
      success: true,
      hasData: true,
      summary: dashboardSummary,
      tools: toolsWithAnalysis,
      recommendations: allRecommendations.slice(0, 10), // Top 10 recommendations
      lastAnalysisAt,
    })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  saveAnalysis,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
  getDashboardSummary,
}
