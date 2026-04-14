/**
 * Test Analysis Runner Service
 * Adapter that feeds test workspace data into existing analysis services.
 * Reuses production analysis logic without modification.
 */

const axios = require("axios")
const { supabase } = require("../config/supabase")
const { analyzeCostLeaks } = require("./costLeakAnalysis")
const { analyzeM365CostLeaks } = require("./microsoft365CostLeakAnalysis")
const { analyzeHubSpotCostLeaks } = require("./hubspotCostLeakAnalysis")
const { calculateCrossplatformMetrics } = require("./comparisonAnalysisService")
const { analyzeProfitLoss } = require("./profitLossAnalysis")

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const AI_MODEL = process.env.ANALYSIS_MODEL || "anthropic/claude-sonnet-4-5"

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
    profitLoss: null,
    saas: null, // SaaS CSV data (invoices, licenses, usage, users, company)
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

    // Detect SaaS CSV data (has fields like vendor, amount_sek instead of SupplierNumber, Total)
    const hasSaasInvoices = Array.isArray(f.invoices) && f.invoices.length > 0 &&
      f.invoices[0] && (f.invoices[0].vendor || f.invoices[0].amount_sek)
    const hasSaasLicenses = Array.isArray(f.licenses) && f.licenses.length > 0 &&
      f.licenses[0] && (f.licenses[0].price_per_seat_sek || f.licenses[0].licensed_seats)
    const hasSaasUsage = Array.isArray(f.usage_reports) && f.usage_reports.length > 0 &&
      f.usage_reports[0] && (f.usage_reports[0].has_license !== undefined || f.usage_reports[0].active_last_30d !== undefined)
    const hasSaasUsers = Array.isArray(f.users) && f.users.length > 0 &&
      f.users[0] && (f.users[0].employee_id || f.users[0].first_name)
    const hasSaasCompany = f.accounts && !Array.isArray(f.accounts) && f.accounts.company_id ||
      (Array.isArray(f.accounts) && f.accounts.length === 1 && f.accounts[0]?.company_id)

    const isSaasData = hasSaasInvoices || hasSaasLicenses || hasSaasUsage

    if (isSaasData) {
      // Transform SaaS CSV invoices → supplier invoices format for costLeakAnalysis
      const supplierInvoices = hasSaasInvoices
        ? f.invoices.map((inv) => ({
            SupplierNumber: inv.vendor || "",
            SupplierName: inv.vendor || "Unknown",
            InvoiceDate: inv.invoice_date || null,
            DueDate: null,
            Total: parseFloat(inv.amount_sek) || 0,
            Balance: 0,
            InvoiceNumber: inv.invoice_id || "",
            GivenNumber: inv.invoice_id || "",
            Booked: inv.payment_status === "paid",
            // Preserve original fields for SaaS analysis
            _plan: inv.plan,
            _costCenter: inv.cost_center,
            _costCenterName: inv.cost_center_name,
            _currency: inv.currency,
          }))
        : []

      data.fortnox = {
        supplierInvoices,
        invoices: [],
        customers: [],
        expenses: [],
        vouchers: [],
        accounts: [],
        articles: [],
      }

      // Store SaaS-specific data for deeper analysis
      data.saas = {
        invoices: f.invoices || [],
        licenses: f.licenses || [],
        usage: f.usage_reports || [],
        users: f.users || [],
        company: hasSaasCompany
          ? (Array.isArray(f.accounts) ? f.accounts[0] : f.accounts)
          : null,
      }
    } else {
      // Standard Fortnox API data
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

  // Assemble Profit & Loss data (from Fortnox Resultatrapport uploads)
  if (byIntegration.Fortnox?.profit_loss) {
    data.profitLoss = byIntegration.Fortnox.profit_loss
  }

  return data
}

/**
 * Analyze SaaS-specific data (licenses, usage, users) for cost optimization findings
 * Cross-references subscriptions with actual usage to find waste.
 */
function analyzeSaasData(saas) {
  const findings = []
  const { invoices, licenses, usage, users, company } = saas

  // 1. Analyze license utilization from usage data
  if (usage.length > 0) {
    // Group usage by tool
    const byTool = {}
    usage.forEach((row) => {
      const tool = row.tool || "Unknown"
      if (!byTool[tool]) byTool[tool] = []
      byTool[tool].push(row)
    })

    for (const [tool, records] of Object.entries(byTool)) {
      const licensed = records.filter((r) => String(r.has_license).toLowerCase() === "true")
      const inactive = licensed.filter((r) => String(r.active_last_30d).toLowerCase() === "false")
      const neverLoggedIn = licensed.filter((r) => !r.last_login || r.last_login === "")

      // Find the license cost for this tool
      const license = licenses.find((l) =>
        l.vendor?.toLowerCase() === tool.toLowerCase() ||
        l.plan?.toLowerCase().includes(tool.toLowerCase())
      )
      const costPerSeat = parseFloat(license?.price_per_seat_sek) || 0

      // Inactive users with licenses
      if (inactive.length > 0 && licensed.length > 0) {
        const wastePerMonth = inactive.length * costPerSeat
        findings.push({
          type: "inactive_licenses",
          severity: inactive.length >= 3 ? "high" : "medium",
          title: `${tool}: ${inactive.length} inactive user${inactive.length !== 1 ? "s" : ""} with active licenses`,
          description: `${inactive.length} of ${licensed.length} licensed users have been inactive for 30+ days. ${inactive.map((r) => r.email || r.employee_id).slice(0, 5).join(", ")}${inactive.length > 5 ? ` and ${inactive.length - 5} more` : ""}`,
          potentialSavings: wastePerMonth,
          platform: "Fortnox",
        })
      }

      // Never logged in
      if (neverLoggedIn.length > 0) {
        const wastePerMonth = neverLoggedIn.length * costPerSeat
        findings.push({
          type: "never_activated",
          severity: "high",
          title: `${tool}: ${neverLoggedIn.length} user${neverLoggedIn.length !== 1 ? "s" : ""} never logged in`,
          description: `License provisioned but never activated for: ${neverLoggedIn.map((r) => r.email || r.employee_id).slice(0, 5).join(", ")}${neverLoggedIn.length > 5 ? ` and ${neverLoggedIn.length - 5} more` : ""}`,
          potentialSavings: wastePerMonth,
          platform: "Fortnox",
        })
      }

      // Low usage (has license, active but < 3 logins)
      const lowUsage = licensed.filter((r) =>
        String(r.active_last_30d).toLowerCase() === "true" &&
        parseInt(r.logins_last_30d) > 0 &&
        parseInt(r.logins_last_30d) < 3
      )
      if (lowUsage.length > 0) {
        findings.push({
          type: "low_usage",
          severity: "low",
          title: `${tool}: ${lowUsage.length} user${lowUsage.length !== 1 ? "s" : ""} with very low usage`,
          description: `Users with fewer than 3 logins in 30 days: ${lowUsage.map((r) => r.email || r.employee_id).slice(0, 5).join(", ")}`,
          potentialSavings: lowUsage.length * costPerSeat * 0.5, // Partial savings estimate
          platform: "Fortnox",
        })
      }
    }
  }

  // 2. Analyze license costs — find overpriced or redundant subscriptions
  if (licenses.length > 0) {
    const totalMonthly = licenses.reduce((sum, l) => sum + (parseFloat(l.total_monthly_sek) || 0), 0)
    const totalSeats = licenses.reduce((sum, l) => sum + (parseInt(l.licensed_seats) || 0), 0)

    // Check for tools with high per-seat cost
    licenses.forEach((lic) => {
      const perSeat = parseFloat(lic.price_per_seat_sek) || 0
      if (perSeat > 500) {
        // Find usage for this tool
        const toolUsage = usage.filter((u) =>
          u.tool?.toLowerCase() === lic.vendor?.toLowerCase()
        )
        const activeUsers = toolUsage.filter((u) => String(u.active_last_30d).toLowerCase() === "true").length
        const totalLicensed = parseInt(lic.licensed_seats) || 0

        if (totalLicensed > 0 && activeUsers < totalLicensed * 0.5) {
          findings.push({
            type: "underutilized_subscription",
            severity: "medium",
            title: `${lic.vendor}: Only ${activeUsers} of ${totalLicensed} seats actively used`,
            description: `${lic.vendor} (${lic.plan}) costs ${perSeat} SEK/seat/month with ${totalLicensed} seats, but only ${activeUsers} are actively used. Consider downsizing.`,
            potentialSavings: (totalLicensed - activeUsers) * perSeat,
            platform: "Fortnox",
          })
        }
      }
    })
  }

  // 3. Detect price increases from invoice data
  if (invoices.length > 0) {
    const byVendor = {}
    invoices.forEach((inv) => {
      const vendor = inv.vendor || "Unknown"
      if (!byVendor[vendor]) byVendor[vendor] = []
      byVendor[vendor].push(inv)
    })

    for (const [vendor, vendorInvoices] of Object.entries(byVendor)) {
      const sorted = vendorInvoices
        .filter((inv) => inv.invoice_date)
        .sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date))

      if (sorted.length >= 3) {
        // Compare early vs late invoices
        const earlyAvg = sorted.slice(0, 3).reduce((s, i) => s + (parseFloat(i.amount_sek) || 0), 0) / 3
        const lateAvg = sorted.slice(-3).reduce((s, i) => s + (parseFloat(i.amount_sek) || 0), 0) / 3

        if (earlyAvg > 0 && lateAvg > earlyAvg * 1.1) {
          const increase = ((lateAvg - earlyAvg) / earlyAvg * 100).toFixed(0)
          const monthlyIncrease = Math.round(lateAvg - earlyAvg)
          findings.push({
            type: "price_increase",
            severity: monthlyIncrease > 500 ? "high" : "medium",
            title: `${vendor}: Price increased ${increase}%`,
            description: `${vendor} monthly cost went from ~${Math.round(earlyAvg)} SEK to ~${Math.round(lateAvg)} SEK (+${monthlyIncrease} SEK/month, ~${monthlyIncrease * 12} SEK/year)`,
            potentialSavings: monthlyIncrease,
            platform: "Fortnox",
          })
        }
      }

      // Detect billing gaps (missing months)
      if (sorted.length >= 4) {
        const dates = sorted.map((i) => new Date(i.invoice_date))
        let gaps = 0
        for (let i = 1; i < dates.length; i++) {
          const daysDiff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)
          if (daysDiff > 45) gaps++ // More than 45 days between invoices = missed month
        }
        if (gaps > 0) {
          const totalMonths = Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24 * 30))
          findings.push({
            type: "billing_inconsistency",
            severity: "medium",
            title: `${vendor}: Inconsistent billing (${sorted.length} invoices over ${totalMonths} months)`,
            description: `${vendor} has ${gaps} gap${gaps !== 1 ? "s" : ""} in billing — ${sorted.length} invoices found over ~${totalMonths} months. Investigate missing invoices or billing errors.`,
            potentialSavings: 0,
            platform: "Fortnox",
          })
        }
      }
    }
  }

  // Sort by severity
  const order = { high: 0, medium: 1, low: 2 }
  findings.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))

  // Build summary
  const totalSavings = findings.reduce((s, f) => s + (f.potentialSavings || 0), 0)
  return {
    findings,
    summary: {
      totalFindings: findings.length,
      totalPotentialSavings: totalSavings,
      highSeverity: findings.filter((f) => f.severity === "high").length,
      mediumSeverity: findings.filter((f) => f.severity === "medium").length,
      lowSeverity: findings.filter((f) => f.severity === "low").length,
    },
  }
}

/**
 * Run LLM-powered deep analysis on the assembled data.
 * Sends a data summary + rule-based findings to Claude/GPT for deeper insights.
 */
async function runLlmAnalysis(saasData, ruleBasedFindings) {
  if (!OPENROUTER_API_KEY) {
    console.warn("[LLM] API key not configured, skipping AI analysis")
    return null
  }

  try {
    // Build a concise data summary for the LLM
    const { invoices, licenses, usage, users, company } = saasData

    // Summarize invoices by vendor
    const invoiceSummary = {}
    invoices.forEach((inv) => {
      const v = inv.vendor || "Unknown"
      if (!invoiceSummary[v]) invoiceSummary[v] = { count: 0, total: 0, amounts: [] }
      invoiceSummary[v].count++
      invoiceSummary[v].total += parseFloat(inv.amount_sek) || 0
      invoiceSummary[v].amounts.push(parseFloat(inv.amount_sek) || 0)
    })

    // Summarize usage by tool
    const usageSummary = {}
    usage.forEach((row) => {
      const tool = row.tool || "Unknown"
      if (!usageSummary[tool]) usageSummary[tool] = { total: 0, active: 0, inactive: 0, neverLoggedIn: 0 }
      usageSummary[tool].total++
      if (String(row.active_last_30d).toLowerCase() === "true") usageSummary[tool].active++
      else usageSummary[tool].inactive++
      if (!row.last_login || row.last_login === "") usageSummary[tool].neverLoggedIn++
    })

    const dataContext = `
COMPANY: ${company?.name || "Unknown"} (${company?.industry || "Unknown industry"}, ${company?.employees || "?"} employees)
CURRENCY: SEK

SaaS SUBSCRIPTIONS (${licenses.length} tools):
${licenses.map((l) => `- ${l.vendor} (${l.plan}): ${l.price_per_seat_sek} SEK/seat × ${l.licensed_seats} seats = ${l.total_monthly_sek} SEK/month | Contract: ${l.contract_start} to ${l.contract_end}`).join("\n")}

INVOICE SUMMARY (${invoices.length} invoices over ~${invoices.length > 0 ? Math.round((new Date(invoices[invoices.length - 1]?.invoice_date) - new Date(invoices[0]?.invoice_date)) / (1000 * 60 * 60 * 24 * 30)) : 0} months):
${Object.entries(invoiceSummary).map(([v, d]) => `- ${v}: ${d.count} invoices, total ${Math.round(d.total)} SEK, avg ${Math.round(d.total / d.count)} SEK/month`).join("\n")}

USER & LICENSE USAGE (${users.length} employees):
${Object.entries(usageSummary).map(([tool, d]) => `- ${tool}: ${d.active} active / ${d.inactive} inactive / ${d.neverLoggedIn} never logged in (${d.total} total)`).join("\n")}

EMPLOYEE ROSTER:
${users.map((u) => `- ${u.employee_id} ${u.first_name} ${u.last_name} (${u.department}, ${u.role}) - ${u.status}`).join("\n")}

RULE-BASED FINDINGS (${ruleBasedFindings.length} found):
${ruleBasedFindings.map((f) => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description} ${f.potentialSavings ? `(${f.potentialSavings} SEK/month)` : ""}`).join("\n")}
`.trim()

    const systemPrompt = `You are an expert SaaS cost optimization analyst. Analyze this company's software spending data and provide a comprehensive cost analysis report.

Focus on:
1. **Wasted spend** — inactive licenses, unused seats, over-provisioned plans
2. **Price anomalies** — price increases, billing gaps, inconsistent charges
3. **Optimization opportunities** — downgrade options, consolidation, renegotiation
4. **Security risks** — tools without SSO, unmanaged access, offboarding gaps
5. **Cross-tool insights** — redundant tools, overlapping functionality

Be specific with numbers. Reference actual employees, tools, and amounts from the data.
Format with markdown headers, tables, and bold amounts. Use SEK as currency.
End with a prioritized action plan with estimated annual savings for each action.`

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this company's SaaS spending:\n\n${dataContext}` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://efficyon.com",
        },
      }
    )

    const aiResponse = response.data.choices[0].message.content
    console.log(`[LLM] AI analysis generated (${aiResponse.length} chars)`)
    return aiResponse
  } catch (error) {
    console.error("[LLM] AI analysis failed:", error.message)
    return null
  }
}

/**
 * Run analysis on a test workspace
 */
async function runTestAnalysis(workspaceId, params) {
  const { analysisType, integrationLabels, uploadIds = null, options = {}, template = null, userId } = params
  const startTime = Date.now()

  // Fetch uploads for this workspace filtered by requested integrations
  let uploadQuery = supabase
    .from("test_uploads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("integration_label", integrationLabels)

  if (uploadIds && uploadIds.length > 0) {
    uploadQuery = uploadQuery.in("id", uploadIds)
  }

  const { data: uploads, error: uploadError } = await uploadQuery

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
      // Run Fortnox invoice analysis (works for both API data and SaaS CSV data)
      if (assembledData.fortnox && integrationLabels.includes("Fortnox")) {
        result.fortnox = await analyzeCostLeaks(assembledData.fortnox, { fromFileUpload: true })
      }

      // Run SaaS-specific analysis (license utilization, usage, price drift)
      if (assembledData.saas) {
        result.saasAnalysis = analyzeSaasData(assembledData.saas)
        // Run LLM deep analysis
        const allFindings = [
          ...(result.fortnox?.supplierInvoiceAnalysis?.findings || []),
          ...(result.saasAnalysis?.findings || []),
        ]
        result.aiAnalysis = await runLlmAnalysis(assembledData.saas, allFindings)
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
      if (assembledData.profitLoss && integrationLabels.includes("Fortnox")) {
        result.profitLoss = analyzeProfitLoss(assembledData.profitLoss)
      }
    }

    if (analysisType === "cross_platform") {
      const fortnoxCompData = assembledData.fortnox
        ? {
            supplierInvoices: assembledData.fortnox.supplierInvoices,
            costLeaks: result.fortnox || (await analyzeCostLeaks(assembledData.fortnox, { fromFileUpload: true })),
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

      // Also run SaaS analysis in cross_platform mode
      if (assembledData.saas) {
        result.saasAnalysis = analyzeSaasData(assembledData.saas)
        const allFindings = [
          ...(result.fortnox?.supplierInvoiceAnalysis?.findings || []),
          ...(result.saasAnalysis?.findings || []),
        ]
        result.aiAnalysis = await runLlmAnalysis(assembledData.saas, allFindings)
      }
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

    await logTestRun(workspaceId, analysis.id, "info", "Analysis completed", {
      duration_ms: durationMs,
      integrations: integrationLabels,
      findings_count: result.overallSummary?.totalFindings || 0,
    })

    return { analysisId: analysis.id, result, durationMs }
  } catch (error) {
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

  if (result.saasAnalysis?.summary) {
    const s = result.saasAnalysis.summary
    summary.totalFindings += s.totalFindings || 0
    summary.totalPotentialSavings += s.totalPotentialSavings || 0
    summary.highSeverity += s.highSeverity || 0
    summary.mediumSeverity += s.mediumSeverity || 0
    summary.lowSeverity += s.lowSeverity || 0
    summary.platformResults.saas = s
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

  if (result.profitLoss?.overallSummary) {
    const s = result.profitLoss.overallSummary
    summary.totalFindings += s.totalFindings || 0
    summary.totalPotentialSavings += s.totalPotentialSavings || 0
    summary.highSeverity += s.highSeverity || 0
    summary.mediumSeverity += s.mediumSeverity || 0
    summary.lowSeverity += s.lowSeverity || 0
    summary.platformResults.profitLoss = s
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

module.exports = { runTestAnalysis, assembleDataFromUploads, analyzeSaasData, logTestRun }
