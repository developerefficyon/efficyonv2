/**
 * Company Controller
 * Handles company, plans, and alerts operations
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

function getRoot(req, res) {
  res.json({ message: "Effycion backend API is running" })
}

async function upsertCompany(req, res) {
  const endpoint = "POST /api/company"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { name, size, industry, website, phone } = req.body || {}

  if (!name) {
    log("warn", endpoint, "Bad request: name is required")
    return res.status(400).json({ error: "Company name is required" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  let companyId = profile?.company_id || null

  if (companyId) {
    log("log", endpoint, `Updating existing company: ${companyId}`)
    const { data: company, error: updateError } = await supabase
      .from("companies")
      .update({ name, size, industry, website, phone })
      .eq("id", companyId)
      .select()
      .maybeSingle()

    if (updateError) {
      log("error", endpoint, "Error updating company:", updateError.message)
      return res.status(500).json({ error: updateError.message })
    }

    return res.json({ company })
  } else {
    log("log", endpoint, "Creating new company")
    const { data: company, error: insertError } = await supabase
      .from("companies")
      .insert({ user_id: user.id, name, size, industry, website, phone })
      .select()
      .maybeSingle()

    if (insertError) {
      log("error", endpoint, "Error creating company:", insertError.message)
      return res.status(500).json({ error: insertError.message })
    }

    companyId = company.id

    if (profile) {
      await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", user.id)
    }

    return res.json({ company })
  }
}

async function getCompany(req, res) {
  const endpoint = "GET /api/company"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    log("log", endpoint, "No company linked to profile")
    return res.json({ company: null })
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .maybeSingle()

  if (companyError) {
    log("error", endpoint, "Error fetching company:", companyError.message)
    return res.status(500).json({ error: companyError.message })
  }

  return res.json({ company })
}

async function upsertPlans(req, res) {
  const endpoint = "POST /api/plans"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { plans } = req.body || {}

  if (!Array.isArray(plans) || plans.length === 0) {
    log("warn", endpoint, "Bad request: plans array is required")
    return res.status(400).json({ error: "plans array is required" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    log("warn", endpoint, "No company linked to profile")
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  const rows = plans.map((p) => ({
    company_id: companyId,
    tool_name: p.tool_name,
    current_plan: p.current_plan || null,
    seats: p.seats || null,
    price_per_seat: p.price_per_seat || null,
    billing_cycle: p.billing_cycle || null,
    renewal_date: p.renewal_date || null,
    add_ons: p.add_ons || null,
  }))

  const { data, error } = await supabase
    .from("company_plans")
    .upsert(rows)
    .select()

  if (error) {
    log("error", endpoint, "Error upserting plans:", error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ plans: data })
}

async function getPlans(req, res) {
  const endpoint = "GET /api/plans"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    log("log", endpoint, "No company linked to profile")
    return res.json({ plans: [] })
  }

  const { data, error } = await supabase
    .from("company_plans")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("tool_name", { ascending: true })

  if (error) {
    log("error", endpoint, "Error fetching plans:", error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ plans: data || [] })
}

async function upsertAlerts(req, res) {
  const endpoint = "POST /api/alerts"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { email_for_alerts, slack_channel, alert_types, frequency } = req.body || {}

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    log("warn", endpoint, "No company linked to profile")
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  const config = {
    email_for_alerts: email_for_alerts || null,
    slack_channel: slack_channel || null,
    alert_types: alert_types || null,
    frequency: frequency || null,
  }

  const alertTypeKeys = alert_types && typeof alert_types === 'object'
    ? Object.keys(alert_types).filter(key => alert_types[key] === true)
    : []

  if (alertTypeKeys.length === 0) {
    alertTypeKeys.push("general")
  }

  const results = []
  const errors = []

  for (const alertType of alertTypeKeys) {
    const { data: existing } = await supabase
      .from("company_alerts")
      .select("id")
      .eq("company_id", companyId)
      .eq("alert_type", alertType)
      .maybeSingle()

    let data, error
    if (existing) {
      const result = await supabase
        .from("company_alerts")
        .update({
          config: config,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .maybeSingle()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from("company_alerts")
        .insert({
          company_id: companyId,
          alert_type: alertType,
          config: config,
          active: true,
        })
        .select()
        .maybeSingle()
      data = result.data
      error = result.error
    }

    if (error) {
      log("error", endpoint, `Error upserting alert ${alertType}:`, error.message)
      errors.push({ alertType, error: error.message })
    } else if (data) {
      results.push(data)
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return res.status(500).json({ error: errors[0].error, errors })
  }

  return res.json({ alerts: results, errors: errors.length > 0 ? errors : undefined })
}

async function getAlerts(req, res) {
  const endpoint = "GET /api/alerts"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    log("log", endpoint, "No company linked to profile")
    return res.json({ alerts: null })
  }

  const { data, error } = await supabase
    .from("company_alerts")
    .select("*")
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (error) {
    log("error", endpoint, "Error fetching alerts:", error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ alerts: data || null })
}

module.exports = {
  getRoot,
  upsertCompany,
  getCompany,
  upsertPlans,
  getPlans,
  upsertAlerts,
  getAlerts,
}
