/**
 * OpenAI Cost Analysis Service
 *
 * Pulls daily usage + cost data from OpenAI's Organization endpoints
 * (requires an Admin API key, sk-admin-...) and normalizes it into the
 * `openai_usage` table for the dashboard.
 *
 * Endpoints:
 *   GET https://api.openai.com/v1/organization/costs
 *   GET https://api.openai.com/v1/organization/usage/completions
 *
 * Both return time-bucketed results we upsert per (company_id, date, model, line_item).
 */

const { supabase } = require("../config/supabase")

const OPENAI_BASE = "https://api.openai.com/v1"

const log = (level, msg, data) => {
  const ts = new Date().toISOString()
  const line = `[${ts}] [openaiCostAnalysis] ${msg}`
  if (data !== undefined) console[level](line, data)
  else console[level](line)
}

/**
 * Validate an Admin API key by making a cheap call.
 * Returns { ok: true } or { ok: false, error }.
 */
async function validateAdminKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return { ok: false, error: "API key is required" }
  }
  if (!apiKey.startsWith("sk-admin-")) {
    return {
      ok: false,
      error:
        "This looks like a regular API key. OpenAI cost analysis requires an Admin API key (starts with 'sk-admin-'). Generate one in your OpenAI organization settings.",
    }
  }

  const startTime = Math.floor(Date.now() / 1000) - 24 * 60 * 60
  const url = `${OPENAI_BASE}/organization/costs?start_time=${startTime}&limit=1`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.status === 401) {
      return { ok: false, error: "Invalid API key" }
    }
    if (res.status === 403) {
      return {
        ok: false,
        error:
          "API key does not have permission to read organization costs. Make sure it is an Admin key with billing read access.",
      }
    }
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `OpenAI API error: ${res.status} ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Network error contacting OpenAI: ${err.message}` }
  }
}

/**
 * Fetch cost buckets from OpenAI between start and end (unix seconds).
 * Handles pagination via `next_page` cursor.
 */
async function fetchCostBuckets(apiKey, startTime, endTime) {
  const buckets = []
  let cursor = null

  do {
    const params = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      bucket_width: "1d",
      limit: "180",
      group_by: "line_item",
    })
    if (cursor) params.set("page", cursor)

    const res = await fetch(`${OPENAI_BASE}/organization/costs?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OpenAI costs fetch failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    if (Array.isArray(json.data)) buckets.push(...json.data)
    cursor = json.has_more ? json.next_page : null
  } while (cursor)

  return buckets
}

/**
 * Fetch usage (token counts) from the completions usage endpoint.
 * Grouped by model so we can break spend down by model in the UI.
 */
async function fetchUsageBuckets(apiKey, startTime, endTime) {
  const buckets = []
  let cursor = null

  do {
    const params = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      bucket_width: "1d",
      limit: "180",
      group_by: "model",
    })
    if (cursor) params.set("page", cursor)

    const res = await fetch(`${OPENAI_BASE}/organization/usage/completions?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OpenAI usage fetch failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    if (Array.isArray(json.data)) buckets.push(...json.data)
    cursor = json.has_more ? json.next_page : null
  } while (cursor)

  return buckets
}

/**
 * Normalize OpenAI bucket responses to rows ready for upsert.
 * Cost buckets are the source of truth for $; usage buckets contribute token counts.
 */
function normalize(costBuckets, usageBuckets) {
  // Map: `${date}::${model}` → row
  const rows = new Map()

  const dateOf = (b) => {
    const ts = b.start_time || b.end_time
    if (!ts) return null
    return new Date(ts * 1000).toISOString().slice(0, 10)
  }

  for (const bucket of costBuckets) {
    const date = dateOf(bucket)
    if (!date) continue
    const results = bucket.results || []
    for (const r of results) {
      const lineItem = r.line_item || "total"
      const model = r.line_item || "unknown"
      const key = `${date}::${model}::${lineItem}`
      const cost = Number(r.amount?.value || 0)
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
    const results = bucket.results || []
    for (const r of results) {
      const model = r.model || "unknown"
      const key = `${date}::${model}::${model}`
      const existing = rows.get(key) || {
        date,
        model,
        line_item: model,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        cost_usd: 0,
      }
      existing.input_tokens += Number(r.input_tokens || 0)
      existing.output_tokens += Number(r.output_tokens || 0)
      existing.cached_tokens += Number(r.input_cached_tokens || 0)
      rows.set(key, existing)
    }
  }

  return Array.from(rows.values())
}

/**
 * Sync usage for a single integration.
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.apiKey  decrypted Admin API key
 * @param {number} opts.lookbackDays  default 7
 */
async function syncCompanyUsage({ companyId, apiKey, lookbackDays = 7 }) {
  const endTime = Math.floor(Date.now() / 1000)
  const startTime = endTime - lookbackDays * 24 * 60 * 60

  log("log", `Syncing company ${companyId}, ${lookbackDays}d lookback`)

  const [costBuckets, usageBuckets] = await Promise.all([
    fetchCostBuckets(apiKey, startTime, endTime),
    fetchUsageBuckets(apiKey, startTime, endTime),
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
    .from("openai_usage")
    .upsert(rows, { onConflict: "company_id,date,model,line_item" })

  if (error) {
    throw new Error(`Failed to upsert openai_usage: ${error.message}`)
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
