/**
 * Anthropic Cost Analysis Controller
 * Mirrors openaiUsageController. Uses the anthropic_usage table.
 */

const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateAdminKey,
  syncCompanyUsage,
} = require("../services/anthropicCostAnalysis")
const { getIntegrationLimits } = require("./integrationController")

const PROVIDER = "Anthropic"
const TABLE = "anthropic_usage"

const log = (level, endpoint, msg, data) => {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${endpoint} - ${msg}`
  if (data !== undefined) console[level](line, data)
  else console[level](line)
}

async function getCompanyId(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return profile?.company_id || null
}

async function connect(req, res) {
  const endpoint = "POST /api/integrations/anthropic/connect"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const { api_key } = req.body || {}
    if (!api_key) return res.status(400).json({ error: "api_key is required" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    log("log", endpoint, `Validating Admin key for company ${companyId}`)
    const validation = await validateAdminKey(api_key)
    if (!validation.ok) return res.status(400).json({ error: validation.error })

    const encryptedKey = encrypt(api_key)
    const settings = { api_key: encryptedKey, connection_type: "api_key" }

    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      // Enforce subscription integration limit on new connections (reconnects/key-rotations skip this)
      const limits = await getIntegrationLimits(user.id)
      if (!limits.canAddMore) {
        log("warn", endpoint, `Integration limit reached: ${limits.currentIntegrations}/${limits.maxIntegrations}`)
        return res.status(403).json({
          error: "Integration limit reached",
          message: `Your ${limits.planName} plan allows up to ${limits.maxIntegrations} integrations. You currently have ${limits.currentIntegrations} connected.`,
          currentIntegrations: limits.currentIntegrations,
          maxIntegrations: limits.maxIntegrations,
          planTier: limits.planTier,
          planName: limits.planName,
        })
      }

      const { data, error } = await supabase
        .from("company_integrations")
        .insert({
          company_id: companyId,
          provider: PROVIDER,
          status: "active",
          settings,
        })
        .select("id")
        .single()
      if (error) throw new Error(error.message)
      integrationId = data.id
    }

    syncCompanyUsage({ companyId, apiKey: api_key, lookbackDays: 90 })
      .then((r) => log("log", endpoint, `Initial backfill done: ${r.rowsUpserted} rows`))
      .catch((e) => log("error", endpoint, `Initial backfill failed: ${e.message}`))

    return res.json({ success: true, integration_id: integrationId })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function disconnect(req, res) {
  const endpoint = "DELETE /api/integrations/anthropic"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const { error } = await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
    if (error) throw new Error(error.message)

    return res.json({ success: true })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function sync(req, res) {
  const endpoint = "POST /api/integrations/anthropic/sync"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const { data: integration, error } = await supabase
      .from("company_integrations")
      .select("settings")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!integration) return res.status(404).json({ error: "Anthropic integration not configured" })

    const apiKey = decrypt(integration.settings?.api_key)
    if (!apiKey) return res.status(400).json({ error: "Stored API key could not be decrypted" })

    const lookback = Math.min(Number(req.body?.lookback_days) || 7, 90)
    const result = await syncCompanyUsage({ companyId, apiKey, lookbackDays: lookback })
    return res.json({ success: true, ...result })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function getUsage(req, res) {
  const endpoint = "GET /api/integrations/anthropic/usage"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from(TABLE)
      .select("date, model, input_tokens, output_tokens, cached_tokens, cost_usd")
      .eq("company_id", companyId)
      .gte("date", since)
      .order("date", { ascending: true })

    if (error) throw new Error(error.message)

    const rows = data || []
    const byDate = new Map()
    const byModel = new Map()
    let totalCost = 0
    let totalInput = 0
    let totalOutput = 0

    for (const r of rows) {
      const cost = Number(r.cost_usd || 0)
      totalCost += cost
      totalInput += Number(r.input_tokens || 0)
      totalOutput += Number(r.output_tokens || 0)

      const day = byDate.get(r.date) || { date: r.date, cost_usd: 0, input_tokens: 0, output_tokens: 0 }
      day.cost_usd += cost
      day.input_tokens += Number(r.input_tokens || 0)
      day.output_tokens += Number(r.output_tokens || 0)
      byDate.set(r.date, day)

      const m = byModel.get(r.model) || { model: r.model, cost_usd: 0, input_tokens: 0, output_tokens: 0 }
      m.cost_usd += cost
      m.input_tokens += Number(r.input_tokens || 0)
      m.output_tokens += Number(r.output_tokens || 0)
      byModel.set(r.model, m)
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

    let mtdCost = 0
    let lastMonthCost = 0
    for (const r of rows) {
      const cost = Number(r.cost_usd || 0)
      if (r.date >= monthStart) mtdCost += cost
      else if (r.date >= lastMonthStart && r.date <= lastMonthEnd) lastMonthCost += cost
    }

    const daysElapsed = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projectedMonth = daysElapsed > 0 ? (mtdCost / daysElapsed) * daysInMonth : 0
    const momDelta = lastMonthCost > 0 ? ((mtdCost - lastMonthCost) / lastMonthCost) * 100 : null

    return res.json({
      summary: {
        total_cost_usd: totalCost,
        total_input_tokens: totalInput,
        total_output_tokens: totalOutput,
        mtd_cost_usd: mtdCost,
        last_month_cost_usd: lastMonthCost,
        projected_month_end_usd: projectedMonth,
        mom_delta_pct: momDelta,
        days,
      },
      daily: Array.from(byDate.values()),
      by_model: Array.from(byModel.values()).sort((a, b) => b.cost_usd - a.cost_usd),
    })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function getStatus(req, res) {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.json({ connected: false })

    const { data } = await supabase
      .from("company_integrations")
      .select("id, status, updated_at, created_at")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    if (!data) return res.json({ connected: false })
    return res.json({
      connected: true,
      status: data.status,
      connected_at: data.created_at,
      last_updated: data.updated_at,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

module.exports = { connect, disconnect, sync, getUsage, getStatus }
