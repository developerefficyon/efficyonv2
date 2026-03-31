/**
 * Renewal Controller
 * Handles renewal alert detection, retrieval, and management
 */

const { supabase } = require("../config/supabase")
const { detectRenewals, getUpcomingRenewals } = require("../services/renewalDetectionService")

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
 * Get upcoming renewal alerts for the user's company
 */
async function getRenewalAlerts(req, res) {
  const endpoint = "GET /api/dashboard/renewal-alerts"
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

    const daysAhead = parseInt(req.query.days) || 90
    const renewals = await getUpcomingRenewals(profile.company_id, daysAhead)

    return res.json({ success: true, renewals, count: renewals.length })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Dismiss a renewal alert
 */
async function dismissRenewal(req, res) {
  const endpoint = "PATCH /api/dashboard/renewal-alerts/:id/dismiss"
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

    const { id } = req.params

    const { error } = await supabase
      .from("detected_renewals")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", profile.company_id)

    if (error) {
      log("error", endpoint, "Failed to dismiss renewal", error.message)
      return res.status(500).json({ error: "Failed to dismiss renewal" })
    }

    return res.json({ success: true })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Refresh renewal detection (re-scan Fortnox data)
 */
async function refreshRenewals(req, res) {
  const endpoint = "POST /api/dashboard/renewal-alerts/refresh"
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

    const result = await detectRenewals(profile.company_id)

    return res.json({ success: true, ...result })
  } catch (err) {
    log("error", endpoint, "Unexpected error", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = { getRenewalAlerts, dismissRenewal, refreshRenewals }
