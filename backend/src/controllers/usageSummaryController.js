/**
 * Usage Summary Controller
 * Stores and lists AI-generated usage summaries for OpenAI/Anthropic/Gemini tools.
 */

const { supabase } = require("../config/supabase")
const openaiService = require("../services/openaiService")

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

/**
 * Fetches the latest usage payload for an integration by aggregating the last
 * 30 days from the provider-specific usage table.
 */
async function fetchUsageForIntegration(integration) {
  const provider = integration.provider
  const table =
    provider === "OpenAI" ? "openai_usage" :
    provider === "Anthropic" ? "anthropic_usage" :
    provider === "Gemini" ? "gemini_usage" : null

  if (!table) {
    throw new Error(`Usage summary not supported for provider: ${provider}`)
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: rows, error } = await supabase
    .from(table)
    .select("date, cost_usd, input_tokens, output_tokens, model")
    .eq("company_id", integration.company_id)
    .gte("date", thirtyDaysAgo)

  if (error) throw new Error(error.message)

  const totalCost = (rows || []).reduce((s, r) => s + (r.cost_usd || 0), 0)
  const totalInput = (rows || []).reduce((s, r) => s + (r.input_tokens || 0), 0)
  const totalOutput = (rows || []).reduce((s, r) => s + (r.output_tokens || 0), 0)

  const byDate = {}
  const byModel = {}
  for (const r of rows || []) {
    if (!byDate[r.date]) byDate[r.date] = { date: r.date, cost_usd: 0, input_tokens: 0, output_tokens: 0 }
    byDate[r.date].cost_usd += r.cost_usd || 0
    byDate[r.date].input_tokens += r.input_tokens || 0
    byDate[r.date].output_tokens += r.output_tokens || 0

    const mk = r.model || "unknown"
    if (!byModel[mk]) byModel[mk] = { model: mk, cost_usd: 0, input_tokens: 0, output_tokens: 0 }
    byModel[mk].cost_usd += r.cost_usd || 0
    byModel[mk].input_tokens += r.input_tokens || 0
    byModel[mk].output_tokens += r.output_tokens || 0
  }

  const daily = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  const by_model = Object.values(byModel).sort((a, b) => b.cost_usd - a.cost_usd)

  return {
    summary: {
      days: 30,
      total_cost_usd: totalCost,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      mtd_cost_usd: 0,
      last_month_cost_usd: 0,
      projected_month_end_usd: 0,
      mom_delta_pct: null,
    },
    daily,
    by_model,
  }
}

/**
 * POST /api/integrations/:id/usage-summary
 * Generates a new AI summary for this integration's usage data and stores it.
 */
async function generateAndSaveUsageSummary(req, res) {
  const endpoint = "POST /api/integrations/:id/usage-summary"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const integrationId = req.params.id
    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const { data: integration, error } = await supabase
      .from("company_integrations")
      .select("id, company_id, provider, settings")
      .eq("id", integrationId)
      .eq("company_id", companyId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!integration) return res.status(404).json({ error: "Integration not found" })

    if (!["OpenAI", "Anthropic", "Gemini"].includes(integration.provider)) {
      return res.status(400).json({ error: "Usage summary only supported for OpenAI, Anthropic, and Gemini" })
    }

    log("log", endpoint, `Generating usage summary for ${integration.provider}`)
    const usageData = await fetchUsageForIntegration(integration)
    const summaryText = await openaiService.generateUsageSummary(usageData, integration.provider)

    if (!summaryText) {
      return res.status(500).json({ error: "AI summary generation failed - OpenRouter unavailable or returned empty" })
    }

    const { data: row, error: insertError } = await supabase
      .from("usage_summaries")
      .insert({
        company_id: companyId,
        integration_id: integrationId,
        provider: integration.provider,
        summary_text: summaryText,
        usage_snapshot: usageData,
      })
      .select("id, created_at")
      .single()

    if (insertError) {
      log("warn", endpoint, `Failed to persist summary: ${insertError.message}`)
      return res.json({
        id: null,
        provider: integration.provider,
        summary_text: summaryText,
        usage_snapshot: usageData,
        created_at: new Date().toISOString(),
        persisted: false,
      })
    }

    return res.json({
      id: row.id,
      provider: integration.provider,
      summary_text: summaryText,
      usage_snapshot: usageData,
      created_at: row.created_at,
      persisted: true,
    })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

/**
 * GET /api/integrations/:id/usage-summaries
 * Lists past summaries for an integration.
 */
async function listUsageSummaries(req, res) {
  const endpoint = "GET /api/integrations/:id/usage-summaries"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const integrationId = req.params.id
    const companyId = await getCompanyId(user.id)
    if (!companyId) return res.status(400).json({ error: "No company associated with this user" })

    const { data: integration, error: intError } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("id", integrationId)
      .eq("company_id", companyId)
      .maybeSingle()
    if (intError) throw new Error(intError.message)
    if (!integration) return res.status(404).json({ error: "Integration not found" })

    const { data: rows, error } = await supabase
      .from("usage_summaries")
      .select("id, provider, summary_text, created_at")
      .eq("integration_id", integrationId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    return res.json({ summaries: rows || [] })
  } catch (err) {
    log("error", endpoint, err.message)
    return res.status(500).json({ error: err.message })
  }
}

module.exports = {
  generateAndSaveUsageSummary,
  listUsageSummaries,
}
