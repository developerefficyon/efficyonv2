/**
 * Gemini Cost Analysis Controller
 *
 * Differs from openaiUsageController/anthropicUsageController in three ways:
 *   1. Auth payload is a service account JSON (not a single API key string).
 *   2. An optional BigQuery export table can be supplied for accurate cost.
 *   3. Stored settings include both the SA JSON and the BQ table.
 */

const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateServiceAccount,
  syncCompanyUsage,
} = require("../services/geminiCostAnalysis")

const PROVIDER = "Gemini"
const TABLE = "gemini_usage"

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
  const endpoint = "POST /api/integrations/gemini/connect"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const { service_account_json, bigquery_table } = req.body || {}
    if (!service_account_json) {
      return res.status(400).json({ error: "service_account_json is required" })
    }

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    log("log", endpoint, `Validating service account for company ${companyId}`)
    const validation = await validateServiceAccount(service_account_json)
    if (!validation.ok) return res.status(400).json({ error: validation.error })

    // Encrypt the SA JSON before storing — it contains a private key
    const encryptedSa = encrypt(
      typeof service_account_json === "string"
        ? service_account_json
        : JSON.stringify(service_account_json),
    )

    const settings = {
      service_account_json: encryptedSa,
      project_id: validation.projectId,
      bigquery_table: bigquery_table || null,
      cost_source: bigquery_table ? "bigquery" : "estimated",
      connection_type: "service_account",
    }

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

    const parsed =
      typeof service_account_json === "string"
        ? JSON.parse(service_account_json)
        : service_account_json
    syncCompanyUsage({
      companyId,
      serviceAccount: parsed,
      bigqueryTable: bigquery_table || null,
      lookbackDays: 90,
    })
      .then((r) => log("log", endpoint, `Initial backfill done: ${r.rowsUpserted} rows`))
      .catch((e) => log("error", endpoint, `Initial backfill failed: ${e.message}`))

    return res.json({ success: true, integration_id: integrationId, project_id: validation.projectId })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function disconnect(req, res) {
  const endpoint = "DELETE /api/integrations/gemini"
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

async function loadIntegrationCreds(companyId) {
  const { data, error } = await supabase
    .from("company_integrations")
    .select("settings")
    .eq("company_id", companyId)
    .eq("provider", PROVIDER)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const decryptedJson = decrypt(data.settings?.service_account_json)
  if (!decryptedJson) return null
  let serviceAccount
  try {
    serviceAccount = JSON.parse(decryptedJson)
  } catch {
    throw new Error("Stored service account JSON could not be parsed")
  }
  return {
    serviceAccount,
    bigqueryTable: data.settings?.bigquery_table || null,
  }
}

async function sync(req, res) {
  const endpoint = "POST /api/integrations/gemini/sync"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const creds = await loadIntegrationCreds(companyId)
    if (!creds) return res.status(404).json({ error: "Gemini integration not configured" })

    const lookback = Math.min(Number(req.body?.lookback_days) || 7, 90)
    const result = await syncCompanyUsage({
      companyId,
      serviceAccount: creds.serviceAccount,
      bigqueryTable: creds.bigqueryTable,
      lookbackDays: lookback,
    })
    return res.json({ success: true, ...result })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function getUsage(req, res) {
  const endpoint = "GET /api/integrations/gemini/usage"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from(TABLE)
      .select("date, model, input_tokens, output_tokens, cached_tokens, cost_usd, cost_source")
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
    let costSource = "estimated"

    for (const r of rows) {
      const cost = Number(r.cost_usd || 0)
      totalCost += cost
      totalInput += Number(r.input_tokens || 0)
      totalOutput += Number(r.output_tokens || 0)
      if (r.cost_source === "bigquery") costSource = "bigquery"

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
        cost_source: costSource, // 'estimated' or 'bigquery' — UI surfaces this
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
      .select("id, status, updated_at, created_at, settings")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    if (!data) return res.json({ connected: false })
    return res.json({
      connected: true,
      status: data.status,
      connected_at: data.created_at,
      last_updated: data.updated_at,
      cost_source: data.settings?.cost_source || "estimated",
      project_id: data.settings?.project_id || null,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

/**
 * Adapter so the AI sync scheduler (which expects `{companyId, apiKey, ...}`)
 * can drive Gemini sync without knowing about service accounts.
 */
async function syncForScheduler({ companyId, /* unused */ apiKey, lookbackDays }) {
  const creds = await loadIntegrationCreds(companyId)
  if (!creds) return { rowsUpserted: 0 }
  return syncCompanyUsage({
    companyId,
    serviceAccount: creds.serviceAccount,
    bigqueryTable: creds.bigqueryTable,
    lookbackDays,
  })
}

module.exports = { connect, disconnect, sync, getUsage, getStatus, syncForScheduler }
