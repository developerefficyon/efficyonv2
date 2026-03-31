/**
 * Savings Controller
 * Provides cumulative savings summary for the dashboard
 */

const { supabase } = require("../config/supabase")

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
 * Get cumulative savings summary for the user's company
 * Returns both "total waste identified" and "savings realized"
 */
async function getSavingsSummary(req, res) {
  const endpoint = "GET /api/dashboard/savings-summary"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
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

    // Get all analyses for total waste identified
    const { data: analyses, error: analysesError } = await supabase
      .from("cost_leak_analyses")
      .select("summary, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true })

    if (analysesError) {
      log("error", endpoint, "Failed to fetch analyses", analysesError)
      return res.status(500).json({ error: "Failed to fetch analysis data" })
    }

    // Sum total waste identified across all analyses
    const totalWasteIdentified = (analyses || []).reduce(
      (sum, a) => sum + (a.summary?.totalPotentialSavings || 0), 0
    )

    // Get savings realized (applied recommendations)
    const { data: appliedRecs, error: recsError } = await supabase
      .from("applied_recommendations")
      .select("potential_savings")
      .eq("company_id", companyId)
      .eq("status", "applied")

    if (recsError) {
      log("error", endpoint, "Failed to fetch recommendations", recsError)
      return res.status(500).json({ error: "Failed to fetch recommendation data" })
    }

    const savingsRealized = (appliedRecs || []).reduce(
      (sum, r) => sum + parseFloat(r.potential_savings || 0), 0
    )

    // Get first analysis date (member since)
    const firstAnalysisDate = analyses && analyses.length > 0
      ? analyses[0].created_at
      : null

    log("log", endpoint, `Waste: $${totalWasteIdentified.toFixed(2)}, Realized: $${savingsRealized.toFixed(2)}`)

    return res.json({
      success: true,
      totalWasteIdentified: Math.round(totalWasteIdentified * 100) / 100,
      savingsRealized: Math.round(savingsRealized * 100) / 100,
      analysisCount: (analyses || []).length,
      appliedCount: (appliedRecs || []).length,
      trackingSince: firstAnalysisDate,
    })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = { getSavingsSummary }
