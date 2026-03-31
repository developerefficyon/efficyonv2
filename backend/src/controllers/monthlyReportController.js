/**
 * Monthly Report Controller
 * Handles retrieving and manually triggering monthly reports
 */

const { supabase } = require("../config/supabase")
const { generateMonthlyReport } = require("../services/monthlyReportService")

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
 * Get paginated list of monthly reports for the user's company
 */
async function getMonthlyReports(req, res) {
  const endpoint = "GET /api/dashboard/monthly-reports"
  log("log", endpoint, "Request received")

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const limit = Math.min(parseInt(req.query.limit) || 12, 50)
    const offset = parseInt(req.query.offset) || 0

    const { data: reports, error, count } = await supabase
      .from("monthly_report_snapshots")
      .select("id, report_month, ai_summary, recommended_action, is_quarterly, sent_at, created_at, report_data, renewal_alerts", { count: "exact" })
      .eq("company_id", profile.company_id)
      .order("report_month", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      log("error", endpoint, "Failed to fetch reports", error.message)
      return res.status(500).json({ error: "Failed to fetch reports" })
    }

    return res.json({
      success: true,
      reports: reports || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get a single monthly report by month (format: YYYY-MM)
 */
async function getMonthlyReportByMonth(req, res) {
  const endpoint = "GET /api/dashboard/monthly-reports/:month"
  log("log", endpoint, "Request received")

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const monthParam = req.params.month // Expected: YYYY-MM
    const reportMonth = `${monthParam}-01`

    const { data: report, error } = await supabase
      .from("monthly_report_snapshots")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("report_month", reportMonth)
      .maybeSingle()

    if (error) {
      log("error", endpoint, "Failed to fetch report", error.message)
      return res.status(500).json({ error: "Failed to fetch report" })
    }

    if (!report) {
      return res.status(404).json({ error: "Report not found for this month" })
    }

    return res.json({ success: true, report })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Manually trigger monthly report generation for the user's company
 */
async function triggerMonthlyReport(req, res) {
  const endpoint = "POST /api/dashboard/monthly-reports/generate"
  log("log", endpoint, "Manual trigger request received")

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const result = await generateMonthlyReport(profile.company_id)

    if (!result) {
      return res.status(400).json({ error: "No data available to generate a report" })
    }

    return res.json({ success: true, ...result })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = { getMonthlyReports, getMonthlyReportByMonth, triggerMonthlyReport }
