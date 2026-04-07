/**
 * Anthropic Cost Analysis Service
 *
 * Pulls daily usage + cost data from Anthropic's Organization endpoints
 * (requires an Admin API key, sk-ant-admin01-...) and normalizes it into the
 * `anthropic_usage` table for the dashboard.
 *
 * Endpoints:
 *   GET https://api.anthropic.com/v1/organizations/usage_report/messages
 *   GET https://api.anthropic.com/v1/organizations/cost_report
 *
 * Output rows match openai_usage exactly so the frontend renders both with
 * the same view component.
 */

const { supabase } = require("../config/supabase")

const ANTHROPIC_BASE = "https://api.anthropic.com/v1"
const ANTHROPIC_VERSION = "2023-06-01"

const log = (level, msg, data) => {
  const ts = new Date().toISOString()
  const line = `[${ts}] [anthropicCostAnalysis] ${msg}`
  if (data !== undefined) console[level](line, data)
  else console[level](line)
}

function authHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json",
  }
}

/**
 * Validate an Admin API key by making a cheap call.
 */
async function validateAdminKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return { ok: false, error: "API key is required" }
  }
  if (!apiKey.startsWith("sk-ant-admin")) {
    return {
      ok: false,
      error:
        "This looks like a regular API key. Anthropic cost analysis requires an Admin API key (starts with 'sk-ant-admin01-'). Generate one in your Anthropic Console under Organization → Admin keys.",
    }
  }

  // Single-day window — cheapest possible call
  const startingAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const url = `${ANTHROPIC_BASE}/organizations/cost_report?starting_at=${encodeURIComponent(startingAt)}&bucket_width=1d&limit=1`

  try {
    const res = await fetch(url, { headers: authHeaders(apiKey) })
    if (res.status === 401) return { ok: false, error: "Invalid API key" }
    if (res.status === 403) {
      return {
        ok: false,
        error:
          "API key does not have permission to read organization costs. Make sure it is an Admin key with billing read access.",
      }
    }
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Anthropic API error: ${res.status} ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Network error contacting Anthropic: ${err.message}` }
  }
}

async function fetchPaged(apiKey, path, params) {
  const buckets = []
  let cursor = null

  do {
    const qs = new URLSearchParams(params)
    if (cursor) qs.set("page", cursor)
    const res = await fetch(`${ANTHROPIC_BASE}${path}?${qs}`, { headers: authHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Anthropic ${path} fetch failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    if (Array.isArray(json.data)) buckets.push(...json.data)
    cursor = json.has_more ? json.next_page : null
  } while (cursor)

  return buckets
}

async function fetchCostBuckets(apiKey, startingAt, endingAt) {
  return fetchPaged(apiKey, "/organizations/cost_report", {
    starting_at: startingAt,
    ending_at: endingAt,
    bucket_width: "1d",
    limit: "180",
    group_by: "model",
  })
}

async function fetchUsageBuckets(apiKey, startingAt, endingAt) {
  return fetchPaged(apiKey, "/organizations/usage_report/messages", {
    starting_at: startingAt,
    ending_at: endingAt,
    bucket_width: "1d",
    limit: "180",
    group_by: "model",
  })
}

/**
 * Normalize Anthropic bucket responses to the same row shape openai_usage uses.
 */
function normalize(costBuckets, usageBuckets) {
  const rows = new Map()

  const dateOf = (b) => {
    const ts = b.starting_at || b.ending_at
    if (!ts) return null
    return new Date(ts).toISOString().slice(0, 10)
  }

  for (const bucket of costBuckets) {
    const date = dateOf(bucket)
    if (!date) continue
    for (const r of bucket.results || []) {
      const model = r.model || "unknown"
      const lineItem = r.context_window || r.line_item || model
      const key = `${date}::${model}::${lineItem}`
      const cost = Number(r.amount?.value ?? r.cost ?? 0)
      const existing = rows.get(key) || {
        date,
        model,
        line_item: lineItem,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        cost_usd: 0,
      }
      existing.cost_usd += cost
      rows.set(key, existing)
    }
  }

  for (const bucket of usageBuckets) {
    const date = dateOf(bucket)
    if (!date) continue
    for (const r of bucket.results || []) {
      const model = r.model || "unknown"
      const lineItem = r.context_window || model
      const key = `${date}::${model}::${lineItem}`
      const existing = rows.get(key) || {
        date,
        model,
        line_item: lineItem,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        cost_usd: 0,
      }
      existing.input_tokens += Number(r.uncached_input_tokens || r.input_tokens || 0)
      existing.output_tokens += Number(r.output_tokens || 0)
      existing.cached_tokens += Number(r.cache_read_input_tokens || r.cached_input_tokens || 0)
      rows.set(key, existing)
    }
  }

  return Array.from(rows.values())
}

async function syncCompanyUsage({ companyId, apiKey, lookbackDays = 7 }) {
  const endingAt = new Date().toISOString()
  const startingAt = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  log("log", `Syncing company ${companyId}, ${lookbackDays}d lookback`)

  const [costBuckets, usageBuckets] = await Promise.all([
    fetchCostBuckets(apiKey, startingAt, endingAt),
    fetchUsageBuckets(apiKey, startingAt, endingAt),
  ])

  const rows = normalize(costBuckets, usageBuckets).map((r) => ({
    company_id: companyId,
    ...r,
    synced_at: new Date().toISOString(),
  }))

  if (rows.length === 0) {
    log("log", "No rows to upsert")
    return { rowsUpserted: 0 }
  }

  const { error } = await supabase
    .from("anthropic_usage")
    .upsert(rows, { onConflict: "company_id,date,model,line_item" })

  if (error) {
    throw new Error(`Failed to upsert anthropic_usage: ${error.message}`)
  }

  log("log", `Upserted ${rows.length} rows for company ${companyId}`)
  return { rowsUpserted: rows.length }
}

module.exports = {
  validateAdminKey,
  fetchCostBuckets,
  fetchUsageBuckets,
  normalize,
  syncCompanyUsage,
}
