/**
 * Renewal Detection Service
 * Analyzes Fortnox recurring subscription findings to detect
 * upcoming SaaS contract renewals and persist them.
 */

const { supabase } = require("../config/supabase")

const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [RenewalDetection] ${message}`
  if (data) {
    console[level](logMessage, data)
  } else {
    console[level](logMessage)
  }
}

/**
 * Map average interval in days to a cadence label
 */
function intervalToCadence(days) {
  if (days <= 45) return { cadence: "monthly", cadence_days: 30 }
  if (days <= 105) return { cadence: "quarterly", cadence_days: 90 }
  if (days <= 210) return { cadence: "semi_annual", cadence_days: 180 }
  if (days <= 400) return { cadence: "annual", cadence_days: 365 }
  return { cadence: "unknown", cadence_days: Math.round(days) }
}

/**
 * Calculate confidence based on invoice count and regularity
 */
function calculateConfidence(invoiceCount) {
  if (invoiceCount >= 12) return 0.95
  if (invoiceCount >= 6) return 0.85
  if (invoiceCount >= 4) return 0.70
  if (invoiceCount >= 3) return 0.60
  return 0.40
}

/**
 * Detect renewals for a company by analyzing recurring subscription findings
 * from the latest Fortnox cost leak analysis.
 */
async function detectRenewals(companyId) {
  log("log", `Detecting renewals for company ${companyId}`)

  // Find Fortnox integrations for this company
  const { data: integrations, error: intError } = await supabase
    .from("company_integrations")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", "Fortnox")
    .in("status", ["connected", "warning"])

  if (intError || !integrations || integrations.length === 0) {
    log("log", "No connected Fortnox integration found")
    return { detected: 0, updated: 0 }
  }

  let totalDetected = 0
  let totalUpdated = 0

  for (const integration of integrations) {
    // Get the latest Fortnox analysis
    const { data: analyses, error: analysisError } = await supabase
      .from("cost_leak_analyses")
      .select("analysis_data")
      .eq("company_id", companyId)
      .eq("integration_id", integration.id)
      .eq("provider", "Fortnox")
      .order("created_at", { ascending: false })
      .limit(1)

    if (analysisError || !analyses || analyses.length === 0) {
      continue
    }

    const analysisData = analyses[0].analysis_data
    const recurringFindings = analysisData?.supplierInvoiceAnalysis?.recurringSubscriptions || []

    for (const finding of recurringFindings) {
      if (!finding.supplier?.number && !finding.supplier?.name) continue

      const frequencyStr = finding.frequency || ""
      const intervalDays = parseInt(frequencyStr) || 30
      const { cadence, cadence_days } = intervalToCadence(intervalDays)

      // Get last invoice date from the finding's invoices
      let lastInvoiceDate = null
      if (finding.invoices && finding.invoices.length > 0) {
        const dates = finding.invoices
          .map(inv => new Date(inv.InvoiceDate || inv.invoiceDate))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => b - a)
        if (dates.length > 0) {
          lastInvoiceDate = dates[0].toISOString().split("T")[0]
        }
      }

      // Project next renewal date
      let projectedRenewalDate = null
      if (lastInvoiceDate) {
        const lastDate = new Date(lastInvoiceDate)
        const projected = new Date(lastDate)
        projected.setDate(projected.getDate() + cadence_days)
        // If projected date is in the past, advance to next cycle
        const now = new Date()
        while (projected < now) {
          projected.setDate(projected.getDate() + cadence_days)
        }
        projectedRenewalDate = projected.toISOString().split("T")[0]
      }

      const invoiceCount = finding.invoices?.length || 0
      const confidence = calculateConfidence(invoiceCount)

      const renewalRecord = {
        company_id: companyId,
        integration_id: integration.id,
        supplier_number: finding.supplier?.number || null,
        supplier_name: finding.supplier?.name || "Unknown",
        average_amount: Math.round((finding.averageAmount || 0) * 100) / 100,
        currency: "SEK",
        cadence,
        cadence_days,
        last_invoice_date: lastInvoiceDate,
        projected_renewal_date: projectedRenewalDate,
        confidence,
        invoice_count: invoiceCount,
        updated_at: new Date().toISOString(),
      }

      // Upsert based on unique constraint (company_id, supplier_number, cadence)
      const { error: upsertError } = await supabase
        .from("detected_renewals")
        .upsert(renewalRecord, {
          onConflict: "company_id,supplier_number,cadence",
        })

      if (upsertError) {
        log("error", `Failed to upsert renewal for ${finding.supplier?.name}`, upsertError.message)
      } else {
        totalDetected++
      }
    }

    totalUpdated++
  }

  log("log", `Detection complete: ${totalDetected} renewals detected from ${totalUpdated} integration(s)`)
  return { detected: totalDetected, updated: totalUpdated }
}

/**
 * Get upcoming renewals for a company within a given window
 */
async function getUpcomingRenewals(companyId, daysAhead = 90) {
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await supabase
    .from("detected_renewals")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .gte("projected_renewal_date", now.toISOString().split("T")[0])
    .lte("projected_renewal_date", futureDate.toISOString().split("T")[0])
    .order("projected_renewal_date", { ascending: true })

  if (error) {
    log("error", "Failed to fetch upcoming renewals", error.message)
    return []
  }

  return data || []
}

module.exports = { detectRenewals, getUpcomingRenewals }
