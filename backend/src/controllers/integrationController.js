/**
 * Integration Controller
 * Handles generic integration CRUD operations
 */

const { supabase } = require("../config/supabase")
const { encryptIntegrationSettings, decryptIntegrationSettings } = require("../utils/encryption")

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
 * Get user's integration limits based on their subscription plan
 * Returns: { maxIntegrations, currentIntegrations, canAddMore, planTier }
 */
async function getIntegrationLimits(userId) {
  // Get user's profile to find company_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.company_id) {
    return {
      maxIntegrations: 0,
      currentIntegrations: 0,
      canAddMore: false,
      planTier: null,
      error: "No company associated with user"
    }
  }

  // Get user's subscription with plan details
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(`
      plan_tier,
      plan_catalog (
        tier,
        name,
        max_integrations
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  // Default to free tier limits if no subscription
  const maxIntegrations = subscription?.plan_catalog?.max_integrations || 2
  const planTier = subscription?.plan_tier || "free"
  const planName = subscription?.plan_catalog?.name || "Free"

  // Count current active integrations for the company
  // Include both "connected" and "warning" statuses as they represent active integrations
  const { data: integrations, error: countError } = await supabase
    .from("company_integrations")
    .select("id, status")
    .eq("company_id", profile.company_id)
    .in("status", ["connected", "warning", "pending"])

  if (countError) {
    return {
      maxIntegrations,
      currentIntegrations: 0,
      canAddMore: true,
      planTier,
      planName,
      error: countError.message
    }
  }

  const currentIntegrations = integrations?.length || 0
  const canAddMore = currentIntegrations < maxIntegrations

  return {
    maxIntegrations,
    currentIntegrations,
    canAddMore,
    planTier,
    planName,
    companyId: profile.company_id
  }
}

async function upsertIntegrations(req, res) {
  const endpoint = "POST /api/integrations"
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

  const { integrations } = req.body || {}

  if (!Array.isArray(integrations) || integrations.length === 0) {
    log("warn", endpoint, "Bad request: integrations array is required")
    return res.status(400).json({ error: "integrations array is required" })
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

  // Check integration limits before creating new integrations
  // First, determine how many NEW integrations will be created
  const newProviders = []
  for (const i of integrations) {
    const provider = i.tool_name || i.provider
    if (!provider) continue

    // Check if this provider already exists for the company
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", provider)
      .maybeSingle()

    if (!existing) {
      newProviders.push(provider)
    }
  }

  // If there are new integrations to be created, check limits
  if (newProviders.length > 0) {
    const limits = await getIntegrationLimits(user.id)

    // Check if adding new integrations would exceed the limit
    const projectedCount = limits.currentIntegrations + newProviders.length
    if (projectedCount > limits.maxIntegrations) {
      log("warn", endpoint, `Integration limit exceeded: ${limits.currentIntegrations}/${limits.maxIntegrations}, trying to add ${newProviders.length}`)
      return res.status(403).json({
        error: "Integration limit reached",
        message: `Your ${limits.planName} plan allows up to ${limits.maxIntegrations} integrations. You currently have ${limits.currentIntegrations} connected.`,
        currentIntegrations: limits.currentIntegrations,
        maxIntegrations: limits.maxIntegrations,
        planTier: limits.planTier,
        planName: limits.planName,
      })
    }
  }

  const rows = integrations.map((i) => {
    const provider = i.tool_name || i.provider

    if (!provider) {
      throw new Error("Integration must have either 'tool_name' or 'provider' field")
    }

    // Validate Fortnox Client ID if it's a Fortnox integration
    if (provider === "Fortnox" && i.client_id) {
      if (i.client_id.includes("@") || (i.client_id.includes(".") && i.client_id.length < 20)) {
        log("error", endpoint, `INVALID CLIENT ID: "${i.client_id}" looks like an email address`)
      } else {
        log("log", endpoint, `Valid Fortnox Client ID format: ${i.client_id.substring(0, 8)}...`)
      }
    }

    const settings = {
      connection_type: i.connection_type || "api_key",
      environment: i.environment || "production",
      oauth_data: i.oauth_data || null,
      api_key: i.api_key || null,
      client_id: i.client_id || null,
      client_secret: i.client_secret || null,
      tenant_id: i.tenant_id || null,
      webhook_url: i.webhook_url || null,
      ...(i.settings || {}),
    }

    // Encrypt sensitive fields before saving
    const encryptedSettings = encryptIntegrationSettings(settings)

    return {
      company_id: companyId,
      provider: provider,
      settings: encryptedSettings,
      status: i.status || "connected",
    }
  })

  const results = []
  for (const row of rows) {
    const { data: existing, error: checkError } = await supabase
      .from("company_integrations")
      .select("id, settings")
      .eq("company_id", row.company_id)
      .eq("provider", row.provider)
      .maybeSingle()

    if (checkError) {
      log("error", endpoint, "Error checking existing integration:", checkError.message)
      return res.status(500).json({ error: checkError.message })
    }

    let result
    if (existing) {
      // Decrypt existing settings before merging, then re-encrypt
      const currentSettings = decryptIntegrationSettings(existing.settings || {})
      const newSettings = decryptIntegrationSettings(row.settings || {})
      const mergedSettings = encryptIntegrationSettings({ ...currentSettings, ...newSettings })

      const { data: updated, error: updateError } = await supabase
        .from("company_integrations")
        .update({
          settings: mergedSettings,
          status: row.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, company_id, provider, settings, status, created_at, updated_at")
        .single()

      if (updateError) {
        log("error", endpoint, "Error updating integration:", updateError.message)
        return res.status(500).json({ error: updateError.message })
      }
      result = updated
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("company_integrations")
        .insert({
          company_id: row.company_id,
          provider: row.provider,
          settings: row.settings,
          status: row.status,
        })
        .select("id, company_id, provider, settings, status, created_at, updated_at")
        .single()

      if (insertError) {
        log("error", endpoint, "Error inserting integration:", insertError.message)
        return res.status(500).json({ error: insertError.message })
      }
      result = inserted
    }
    results.push(result)
  }

  log("log", endpoint, `Successfully saved ${results.length} integration(s)`)
  return res.json({ integrations: results })
}

async function getIntegrations(req, res) {
  const endpoint = "GET /api/integrations"
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
    // Return limits info even when no company
    const limits = await getIntegrationLimits(user.id)
    return res.json({
      integrations: [],
      limits: {
        current: 0,
        max: limits.maxIntegrations,
        canAddMore: limits.canAddMore,
        planTier: limits.planTier,
        planName: limits.planName,
      }
    })
  }

  const { data, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  if (error) {
    log("error", endpoint, "Error fetching integrations:", error.message)
    return res.status(500).json({ error: error.message })
  }

  // Map provider to tool_name for backward compatibility
  const mappedIntegrations = (data || []).map((integration) => {
    // Decrypt sensitive fields before returning to frontend
    const settings = decryptIntegrationSettings(integration.settings || {})
    return {
      ...integration,
      tool_name: integration.provider,
      connection_type: settings.connection_type || "api_key",
      environment: settings.environment || "production",
      oauth_data: settings.oauth_data || null,
      api_key: settings.api_key || null,
      client_id: settings.client_id || null,
      client_secret: settings.client_secret || null,
      webhook_url: settings.webhook_url || null,
    }
  })

  // Get integration limits for the response
  const limits = await getIntegrationLimits(user.id)

  return res.json({
    integrations: mappedIntegrations,
    limits: {
      current: limits.currentIntegrations,
      max: limits.maxIntegrations,
      canAddMore: limits.canAddMore,
      planTier: limits.planTier,
      planName: limits.planName,
    }
  })
}

async function deleteIntegration(req, res) {
  const endpoint = "DELETE /api/integrations/:id"
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

  const integrationId = req.params.id
  if (!integrationId) {
    log("warn", endpoint, "Bad request: integration ID is required")
    return res.status(400).json({ error: "Integration ID is required" })
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

  const { data: integration, error: fetchError } = await supabase
    .from("company_integrations")
    .select("id, provider, company_id")
    .eq("id", integrationId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (fetchError) {
    log("error", endpoint, "Error fetching integration:", fetchError.message)
    return res.status(500).json({ error: fetchError.message })
  }

  if (!integration) {
    log("warn", endpoint, "Integration not found or access denied")
    return res.status(404).json({ error: "Integration not found or you don't have permission to delete it" })
  }

  const { error: deleteError } = await supabase
    .from("company_integrations")
    .delete()
    .eq("id", integrationId)
    .eq("company_id", companyId)

  if (deleteError) {
    log("error", endpoint, "Error deleting integration:", deleteError.message)
    return res.status(500).json({ error: deleteError.message })
  }

  log("log", endpoint, `Successfully deleted integration: ${integration.provider}`)
  return res.json({ message: "Integration deleted successfully", id: integrationId })
}

async function getTools(req, res) {
  const endpoint = "GET /api/tools"
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

  // Get user's company_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  // Get distinct provider names from company_integrations
  // First get tools from user's company, then get common tools from all companies
  let query = supabase
    .from("company_integrations")
    .select("provider")
    .order("provider", { ascending: true })

  // If user has a company, prioritize their company's tools
  if (profile?.company_id) {
    const { data: companyTools, error: companyError } = await supabase
      .from("company_integrations")
      .select("provider")
      .eq("company_id", profile.company_id)
      .order("provider", { ascending: true })

    if (!companyError && companyTools && companyTools.length > 0) {
      // Get unique provider names from user's company
      const uniqueTools = Array.from(
        new Set(companyTools.map((t) => t.provider))
      ).map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name: name,
        category: null,
        created_at: new Date().toISOString(),
      }))

      log("log", endpoint, `Successfully fetched ${uniqueTools.length} tool(s) from company integrations`)
      return res.json({ tools: uniqueTools })
    }
  }

  // Fallback: Get distinct provider names from all company_integrations
  const { data, error } = await query

  if (error) {
    log("error", endpoint, "Error fetching tools:", error.message)
    return res.status(500).json({ error: error.message })
  }

  // Get unique provider names
  const uniqueTools = Array.from(
    new Set((data || []).map((t) => t.provider))
  ).map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name: name,
    category: null,
    created_at: new Date().toISOString(),
  }))

  log("log", endpoint, `Successfully fetched ${uniqueTools.length} tool(s) from company integrations`)
  return res.json({ tools: uniqueTools })
}

module.exports = {
  upsertIntegrations,
  getIntegrations,
  deleteIntegration,
  getTools,
  getIntegrationLimits,
}
