/**
 * Test Analysis Runner Service
 * Adapter that feeds test workspace data into existing analysis services.
 * Reuses production analysis logic without modification.
 */

const { supabase } = require("../config/supabase")
const { analyzeCostLeaks } = require("./costLeakAnalysis")
const { analyzeM365CostLeaks } = require("./microsoft365CostLeakAnalysis")
const { analyzeHubSpotCostLeaks } = require("./hubspotCostLeakAnalysis")
const { calculateCrossplatformMetrics } = require("./comparisonAnalysisService")

/**
 * Assemble uploaded test data into the structures expected by existing analysis services
 * @param {Array} uploads - test_uploads rows for a workspace
 * @returns {Object} { fortnox, m365, hubspot } data objects
 */
function assembleDataFromUploads(uploads) {
  const data = {
    fortnox: null,
    m365: null,
    hubspot: null,
  }

  // Group uploads by integration
  const byIntegration = {}
  uploads.forEach((upload) => {
    if (!byIntegration[upload.integration_label]) {
      byIntegration[upload.integration_label] = {}
    }
    byIntegration[upload.integration_label][upload.data_type] = upload.file_data
  })

  // Assemble Fortnox data (matches costLeakAnalysis.analyzeCostLeaks input)
  if (byIntegration.Fortnox) {
    const f = byIntegration.Fortnox
    data.fortnox = {
      supplierInvoices: f.supplier_invoices || [],
      invoices: f.invoices || [],
      customers: f.customers || [],
      expenses: f.expenses || [],
      vouchers: f.vouchers || [],
      accounts: f.accounts || [],
      articles: f.articles || [],
    }
  }

  // Assemble M365 data (matches microsoft365CostLeakAnalysis.analyzeM365CostLeaks input)
  if (byIntegration.Microsoft365) {
    const m = byIntegration.Microsoft365
    data.m365 = {
      licenses: m.licenses || [],
      users: m.users || [],
      usageReports: m.usage_reports || [],
    }
  }

  // Assemble HubSpot data (matches hubspotCostLeakAnalysis.analyzeHubSpotCostLeaks input)
  if (byIntegration.HubSpot) {
    const h = byIntegration.HubSpot
    data.hubspot = {
      users: h.hubspot_users || [],
      accountInfo: h.hubspot_account || null,
    }
  }

  return data
}

/**
 * Run analysis on a test workspace
 * @param {string} workspaceId - test_workspaces.id
 * @param {Object} params - Analysis parameters
 * @param {string} params.analysisType - 'standard', 'deep', 'cross_platform'
 * @param {string[]} params.integrationLabels - Which integrations to include
 * @param {Object} params.options - Extra options (inactivityDays, startDate, endDate, etc.)
 * @param {Object|null} params.template - analysis_templates row (optional)
 * @param {string} params.userId - Who triggered it
 * @returns {Object} { analysisId, result }
 */
async function runTestAnalysis(workspaceId, params) {
  const { analysisType, integrationLabels, options = {}, template = null, userId } = params
  const startTime = Date.now()

  // Fetch uploads for this workspace filtered by requested integrations
  const { data: uploads, error: uploadError } = await supabase
    .from("test_uploads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("integration_label", integrationLabels)

  if (uploadError) {
    throw new Error(`Failed to fetch uploads: ${uploadError.message}`)
  }

  if (!uploads || uploads.length === 0) {
    throw new Error("No uploads found for the requested integrations in this workspace")
  }

  // Create analysis record
  const { data: analysis, error: createError } = await supabase
    .from("test_analyses")
    .insert({
      workspace_id: workspaceId,
      analysis_type: analysisType,
      template_id: template?.id || null,
      template_version: template?.version || null,
      integration_labels: integrationLabels,
      status: "running",
      input_upload_ids: uploads.map((u) => u.id),
      created_by: userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (createError) {
    throw new Error(`Failed to create analysis record: ${createError.message}`)
  }

  try {
    // Assemble data from uploads
    const assembledData = assembleDataFromUploads(uploads)
    let result = {}

    if (analysisType === "standard" || analysisType === "deep") {
      // Run individual platform analyses
      if (assembledData.fortnox && integrationLabels.includes("Fortnox")) {
        result.fortnox = analyzeCostLeaks(assembledData.fortnox, { fromFileUpload: true })
      }
      if (assembledData.m365 && integrationLabels.includes("Microsoft365")) {
        result.microsoft365 = analyzeM365CostLeaks(assembledData.m365, {
          inactivityDays: options.inactivityDays || 30,
        })
      }
      if (assembledData.hubspot && integrationLabels.includes("HubSpot")) {
        result.hubspot = analyzeHubSpotCostLeaks(
          assembledData.hubspot.users,
          assembledData.hubspot.accountInfo,
          { inactiveDays: options.inactivityDays || 30 }
        )
      }
    }

    if (analysisType === "cross_platform") {
      // Prepare data in the format comparisonAnalysisService expects
      const fortnoxCompData = assembledData.fortnox
        ? {
            supplierInvoices: assembledData.fortnox.supplierInvoices,
            costLeaks: result.fortnox || analyzeCostLeaks(assembledData.fortnox, { fromFileUpload: true }),
          }
        : null

      const m365CompData = assembledData.m365
        ? {
            licenses: assembledData.m365.licenses,
            users: assembledData.m365.users,
            costLeaks: result.microsoft365 || analyzeM365CostLeaks(assembledData.m365, {
              inactivityDays: options.inactivityDays || 30,
            }),
          }
        : null

      const hubspotCompData = assembledData.hubspot
        ? {
            users: assembledData.hubspot.users,
            costLeaks: result.hubspot || analyzeHubSpotCostLeaks(
              assembledData.hubspot.users,
              assembledData.hubspot.accountInfo,
              { inactiveDays: options.inactivityDays || 30 }
            ),
          }
        : null

      result.crossPlatform = calculateCrossplatformMetrics(fortnoxCompData, m365CompData, hubspotCompData)
    }

    // Build overall summary
    result.overallSummary = buildOverallSummary(result)

    const durationMs = Date.now() - startTime

    // Update analysis record with results
    const { error: updateError } = await supabase
      .from("test_analyses")
      .update({
        status: "completed",
        analysis_result: result,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysis.id)

    if (updateError) {
      console.error("Failed to update analysis record:", updateError.message)
    }

    // Log completion
    await logTestRun(workspaceId, analysis.id, "info", "Analysis completed", {
      duration_ms: durationMs,
      integrations: integrationLabels,
      findings_count: result.overallSummary?.totalFindings || 0,
    })

    return { analysisId: analysis.id, result, durationMs }
  } catch (error) {
    // Mark as failed
    await supabase
      .from("test_analyses")
      .update({
        status: "failed",
        error_log: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysis.id)

    await logTestRun(workspaceId, analysis.id, "error", `Analysis failed: ${error.message}`)

    throw error
  }
}

/**
 * Build a combined summary from all analysis results
 */
function buildOverallSummary(result) {
  const summary = {
    totalFindings: 0,
    totalPotentialSavings: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    platformResults: {},
  }

  if (result.fortnox?.overallSummary) {
    const s = result.fortnox.overallSummary
    summary.totalFindings += s.totalFindings || 0
    summary.totalPotentialSavings += s.totalPotentialSavings || 0
    summary.highSeverity += s.highSeverity || 0
    summary.mediumSeverity += s.mediumSeverity || 0
    summary.lowSeverity += s.lowSeverity || 0
    summary.platformResults.fortnox = s
  }

  if (result.microsoft365?.overallSummary) {
    const s = result.microsoft365.overallSummary
    summary.totalFindings += s.totalFindings || 0
    summary.totalPotentialSavings += s.totalPotentialSavings || 0
    summary.highSeverity += s.highSeverity || 0
    summary.mediumSeverity += s.mediumSeverity || 0
    summary.lowSeverity += s.lowSeverity || 0
    summary.platformResults.microsoft365 = s
  }

  if (result.hubspot?.summary) {
    const s = result.hubspot.summary
    summary.totalFindings += s.issuesFound || 0
    summary.totalPotentialSavings += s.potentialMonthlySavings || 0
    summary.highSeverity += s.highSeverityIssues || 0
    summary.mediumSeverity += s.mediumSeverityIssues || 0
    summary.lowSeverity += s.lowSeverityIssues || 0
    summary.platformResults.hubspot = s
  }

  if (result.crossPlatform) {
    summary.platformResults.crossPlatform = {
      totalMonthlySoftwareSpend: result.crossPlatform.costMetrics?.totalMonthlySoftwareSpend || 0,
      platformsIncluded: result.crossPlatform.platformsIncluded || [],
    }
  }

  return summary
}

/**
 * Write a log entry for a test run
 */
async function logTestRun(workspaceId, analysisId, level, message, details = null) {
  try {
    await supabase.from("test_run_logs").insert({
      workspace_id: workspaceId,
      analysis_id: analysisId,
      log_level: level,
      message,
      details,
    })
  } catch (err) {
    console.error("Failed to write test run log:", err.message)
  }
}

module.exports = { runTestAnalysis, assembleDataFromUploads, logTestRun }
