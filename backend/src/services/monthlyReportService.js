/**
 * Monthly Report Service
 * Generates and sends automated monthly reports for all companies.
 * Compares current vs previous analysis data, calls Claude for a summary,
 * and delivers the report via email.
 */

const { supabase } = require("../config/supabase")
const { callClaude } = require("./claudeService")
const { getUpcomingRenewals, detectRenewals } = require("./renewalDetectionService")
const { sendMonthlyReport } = require("./emailService")

const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [MonthlyReport] ${message}`
  if (data) {
    console[level](logMessage, data)
  } else {
    console[level](logMessage)
  }
}

/**
 * Determine if the current month is a quarterly deep-dive month
 */
function isQuarterlyMonth(date = new Date()) {
  const month = date.getMonth() // 0-indexed
  return [0, 3, 6, 9].includes(month) // Jan, Apr, Jul, Oct
}

/**
 * Get the first day of the current month as a date string
 */
function getFirstOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

/**
 * Format month for display
 */
function formatReportMonth(date = new Date()) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/**
 * Compare two analyses and produce a diff
 */
function diffAnalyses(current, previous) {
  if (!current) return null

  const currentSummary = current.summary || {}
  const previousSummary = previous?.summary || {}

  const savingsDelta = (currentSummary.totalPotentialSavings || 0) - (previousSummary.totalPotentialSavings || 0)
  const findingsDelta = (currentSummary.totalFindings || 0) - (previousSummary.totalFindings || 0)
  const healthScoreDelta = (currentSummary.healthScore || 0) - (previousSummary.healthScore || 0)

  // Compare findings by hash
  const currentFindings = extractFindingHashes(current.analysis_data)
  const previousFindings = previous ? extractFindingHashes(previous.analysis_data) : new Set()

  const newFindings = [...currentFindings].filter(h => !previousFindings.has(h))
  const resolvedFindings = [...previousFindings].filter(h => !currentFindings.has(h))

  return {
    provider: current.provider,
    current: {
      totalPotentialSavings: currentSummary.totalPotentialSavings || 0,
      totalFindings: currentSummary.totalFindings || 0,
      healthScore: currentSummary.healthScore || null,
      highSeverity: currentSummary.highSeverity || 0,
      mediumSeverity: currentSummary.mediumSeverity || 0,
      lowSeverity: currentSummary.lowSeverity || 0,
    },
    deltas: {
      savings: savingsDelta,
      findings: findingsDelta,
      healthScore: healthScoreDelta,
    },
    newFindingsCount: newFindings.length,
    resolvedFindingsCount: resolvedFindings.length,
    hasPrevious: !!previous,
  }
}

/**
 * Extract finding hashes from analysis data
 */
function extractFindingHashes(analysisData) {
  const hashes = new Set()
  if (!analysisData) return hashes

  // Fortnox findings
  const supplierAnalysis = analysisData.supplierInvoiceAnalysis || {}
  const fortnoxCategories = [
    "duplicatePayments", "unusualAmounts", "recurringSubscriptions",
    "overdueInvoices", "priceDrift",
  ]
  for (const cat of fortnoxCategories) {
    if (supplierAnalysis[cat]) {
      for (const finding of supplierAnalysis[cat]) {
        if (finding.findingHash) hashes.add(finding.findingHash)
      }
    }
  }

  // M365, HubSpot, etc. — generic findings array
  if (analysisData.licenseAnalysis?.findings) {
    for (const f of analysisData.licenseAnalysis.findings) {
      if (f.findingHash) hashes.add(f.findingHash)
    }
  }
  if (analysisData.findings) {
    for (const f of analysisData.findings) {
      if (f.findingHash) hashes.add(f.findingHash)
    }
  }

  return hashes
}

/**
 * Generate a monthly report for a single company
 */
async function generateMonthlyReport(companyId) {
  log("log", `Generating report for company ${companyId}`)

  // Get connected integrations
  const { data: integrations, error: intError } = await supabase
    .from("company_integrations")
    .select("id, provider")
    .eq("company_id", companyId)
    .in("status", ["connected", "warning"])

  if (intError || !integrations || integrations.length === 0) {
    log("log", `No connected integrations for company ${companyId}, skipping`)
    return null
  }

  // Get diffs per provider
  const providerDiffs = []
  for (const integration of integrations) {
    const { data: analyses } = await supabase
      .from("cost_leak_analyses")
      .select("id, provider, summary, analysis_data, created_at")
      .eq("company_id", companyId)
      .eq("integration_id", integration.id)
      .order("created_at", { ascending: false })
      .limit(2)

    if (analyses && analyses.length > 0) {
      const diff = diffAnalyses(analyses[0], analyses[1] || null)
      if (diff) providerDiffs.push(diff)
    }
  }

  if (providerDiffs.length === 0) {
    log("log", `No analyses found for company ${companyId}, skipping`)
    return null
  }

  // Get cumulative savings
  const { data: allAnalyses } = await supabase
    .from("cost_leak_analyses")
    .select("summary")
    .eq("company_id", companyId)

  const totalWasteIdentified = (allAnalyses || []).reduce(
    (sum, a) => sum + (a.summary?.totalPotentialSavings || 0), 0
  )

  const { data: appliedRecs } = await supabase
    .from("applied_recommendations")
    .select("potential_savings")
    .eq("company_id", companyId)
    .eq("status", "applied")

  const savingsRealized = (appliedRecs || []).reduce(
    (sum, r) => sum + parseFloat(r.potential_savings || 0), 0
  )

  // Refresh and get renewal alerts
  await detectRenewals(companyId).catch(() => {})
  const renewalAlerts = await getUpcomingRenewals(companyId, 90)

  const isQuarterly = isQuarterlyMonth()
  const reportMonth = getFirstOfMonth()

  // Call Claude for AI summary
  let aiSummary = null
  let recommendedAction = null

  const systemPrompt = isQuarterly
    ? `You are Efficyon's quarterly report writer. Write a concise, executive-friendly summary of this company's cost optimization status over the past quarter. Include specific ROI numbers. Keep it under 300 words. Also provide one prioritized recommended action with an estimated saving. Return JSON: { "summary": "...", "recommendedAction": "..." }`
    : `You are Efficyon's monthly report writer. Write a concise, executive-friendly summary of this company's cost optimization status. Keep it under 200 words. Include one specific recommended action with an estimated saving. Return JSON: { "summary": "...", "recommendedAction": "..." }`

  const reportContext = JSON.stringify({
    providers: providerDiffs,
    totalWasteIdentified: Math.round(totalWasteIdentified),
    savingsRealized: Math.round(savingsRealized),
    upcomingRenewals: renewalAlerts.length,
    renewalDetails: renewalAlerts.slice(0, 5).map(r => ({
      supplier: r.supplier_name,
      amount: r.average_amount,
      cadence: r.cadence,
      renewsOn: r.projected_renewal_date,
    })),
    isQuarterly,
  })

  try {
    const aiResult = await callClaude(systemPrompt, reportContext, isQuarterly ? 1200 : 800)
    aiSummary = aiResult?.summary || null
    recommendedAction = aiResult?.recommendedAction || null
  } catch (err) {
    log("error", "Claude API call failed, continuing without AI summary", err.message)
  }

  // Fallback if Claude fails
  if (!aiSummary) {
    const totalCurrentSavings = providerDiffs.reduce((s, d) => s + d.current.totalPotentialSavings, 0)
    const totalCurrentFindings = providerDiffs.reduce((s, d) => s + d.current.totalFindings, 0)
    aiSummary = `This month, ${providerDiffs.length} connected tool${providerDiffs.length !== 1 ? "s" : ""} show ${totalCurrentFindings} finding${totalCurrentFindings !== 1 ? "s" : ""} with $${Math.round(totalCurrentSavings).toLocaleString()} in potential savings. ${renewalAlerts.length > 0 ? `${renewalAlerts.length} renewal${renewalAlerts.length !== 1 ? "s" : ""} coming up in the next 90 days.` : ""}`
  }
  if (!recommendedAction) {
    recommendedAction = "Log into Efficyon and run a cross-platform analysis to uncover deeper savings."
  }

  // Store the report
  const reportData = {
    providerDiffs,
    totalWasteIdentified: Math.round(totalWasteIdentified * 100) / 100,
    savingsRealized: Math.round(savingsRealized * 100) / 100,
    renewalAlerts: renewalAlerts.map(r => ({
      supplier_name: r.supplier_name,
      average_amount: r.average_amount,
      cadence: r.cadence,
      projected_renewal_date: r.projected_renewal_date,
    })),
  }

  const { error: upsertError } = await supabase
    .from("monthly_report_snapshots")
    .upsert({
      company_id: companyId,
      report_month: reportMonth,
      report_data: reportData,
      ai_summary: aiSummary,
      recommended_action: recommendedAction,
      renewal_alerts: renewalAlerts,
      is_quarterly: isQuarterly,
    }, { onConflict: "company_id,report_month" })

  if (upsertError) {
    log("error", `Failed to store report for company ${companyId}`, upsertError.message)
    return null
  }

  // Send email to company owner(s)
  const { data: owners } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("status", "active")

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle()

  const companyName = company?.name || "Your Company"

  if (owners && owners.length > 0) {
    for (const owner of owners) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", owner.user_id)
        .maybeSingle()

      if (ownerProfile?.email) {
        // Build changes HTML
        let changesHTML = ""
        if (providerDiffs.length > 0) {
          changesHTML = `<div style="margin: 20px 0;">
            <h3 style="color: #d1d5db; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">What Changed</h3>`
          for (const diff of providerDiffs) {
            const arrow = diff.deltas.savings > 0 ? "&#x25B2;" : diff.deltas.savings < 0 ? "&#x25BC;" : "&#x2014;"
            const deltaColor = diff.deltas.savings > 0 ? "#f87171" : diff.deltas.savings < 0 ? "#34d399" : "#9ca3af"
            changesHTML += `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 12px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #d1d5db; font-weight: 600; font-size: 13px;">${diff.provider}</span>
                <span style="color: ${deltaColor}; font-size: 12px;">${arrow} $${Math.abs(Math.round(diff.deltas.savings)).toLocaleString()} savings change</span>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin: 6px 0 0;">${diff.current.totalFindings} finding${diff.current.totalFindings !== 1 ? "s" : ""} &middot; ${diff.newFindingsCount} new &middot; ${diff.resolvedFindingsCount} resolved</p>
            </div>`
          }
          changesHTML += "</div>"
        }

        // Build renewal alerts HTML
        let renewalAlertsHTML = ""
        if (renewalAlerts.length > 0) {
          renewalAlertsHTML = `<div style="margin: 20px 0;">
            <h3 style="color: #fbbf24; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Upcoming Renewals</h3>
            <div style="background: rgba(251, 191, 36, 0.03); border: 1px solid rgba(251, 191, 36, 0.12); border-radius: 8px; padding: 16px;">`
          for (const r of renewalAlerts.slice(0, 5)) {
            const renewDate = new Date(r.projected_renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            renewalAlertsHTML += `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
              <span style="color: #d1d5db; font-size: 13px;">${r.supplier_name}</span>
              <span style="color: #fbbf24; font-size: 12px;">~${r.average_amount.toLocaleString()} ${r.currency || "SEK"} &middot; ${renewDate}</span>
            </div>`
          }
          renewalAlertsHTML += "</div></div>"
        }

        // Build quarterly CTA
        let quarterlyCtaHTML = ""
        if (isQuarterly) {
          quarterlyCtaHTML = `<div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #a78bfa; margin: 0 0 8px; font-size: 16px;">Quarterly Deep-Dive Available</h3>
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">It&rsquo;s time for your quarterly cost review. Run a comprehensive cross-platform analysis to uncover structural savings.</p>
          </div>`
        }

        const result = await sendMonthlyReport({
          email: ownerProfile.email,
          companyName,
          reportMonth: formatReportMonth(),
          aiSummary: aiSummary || "",
          recommendedAction: recommendedAction || "",
          totalWaste: totalWasteIdentified,
          savingsRealized,
          changesHTML,
          renewalAlertsHTML,
          quarterlyCtaHTML,
          isQuarterly,
        })

        if (result.error) {
          log("error", `Failed to send email to ${ownerProfile.email}`, result.error)
        } else {
          log("log", `Report emailed to ${ownerProfile.email}`)
          // Mark as sent
          await supabase
            .from("monthly_report_snapshots")
            .update({ sent_at: new Date().toISOString() })
            .eq("company_id", companyId)
            .eq("report_month", reportMonth)
        }
      }
    }
  }

  log("log", `Report generated for company ${companyId}`)
  return { companyId, reportMonth, isQuarterly, providerCount: providerDiffs.length }
}

/**
 * Generate monthly reports for all companies with connected integrations
 */
async function generateAllMonthlyReports() {
  log("log", "Starting monthly report generation for all companies")

  // Get all distinct company IDs with connected integrations
  const { data: integrations, error } = await supabase
    .from("company_integrations")
    .select("company_id")
    .in("status", ["connected", "warning"])

  if (error || !integrations) {
    log("error", "Failed to fetch companies", error?.message)
    return { total: 0, success: 0, failed: 0 }
  }

  // Deduplicate company IDs
  const companyIds = [...new Set(integrations.map(i => i.company_id))]
  log("log", `Found ${companyIds.length} companies to process`)

  let success = 0
  let failed = 0

  for (const companyId of companyIds) {
    try {
      const result = await generateMonthlyReport(companyId)
      if (result) {
        success++
      } else {
        failed++
      }
    } catch (err) {
      log("error", `Failed to generate report for company ${companyId}`, err.message)
      failed++
    }
  }

  log("log", `Report generation complete: ${success} success, ${failed} failed out of ${companyIds.length}`)
  return { total: companyIds.length, success, failed }
}

module.exports = { generateMonthlyReport, generateAllMonthlyReports }
