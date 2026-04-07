/**
 * Gemini Cost Analysis Service
 *
 * Hybrid implementation:
 *   1. Token usage is pulled from Cloud Monitoring (works for everyone with
 *      a service account that has `monitoring.viewer`).
 *   2. If the user supplied a BigQuery dataset name (i.e. they enabled
 *      billing export), we additionally query that dataset and PREFER its
 *      USD numbers over the price-table estimate.
 *
 * Auth: signs a JWT with the service account's private key and exchanges it
 * for an OAuth2 access token via the JWT-bearer flow. No google-auth-library
 * dependency — we use `jose` (already in deps) for the signing.
 *
 * Output rows match openai_usage / anthropic_usage so the frontend renders
 * Gemini with the same view component as the other AI tools.
 */

const { supabase } = require("../config/supabase")
const { SignJWT, importPKCS8 } = require("jose")

const log = (level, msg, data) => {
  const ts = new Date().toISOString()
  const line = `[${ts}] [geminiCostAnalysis] ${msg}`
  if (data !== undefined) console[level](line, data)
  else console[level](line)
}

// ── Pricing (USD per 1M tokens) ──────────────────────────────────────────────
// Source: ai.google.dev/pricing as of 2025-Q1. Update as Google adjusts prices.
// Used only when BigQuery export isn't connected; otherwise actual cost wins.
const GEMINI_PRICES = {
  "gemini-2.5-pro": { input: 1.25, output: 10.00, cached: 0.31 },
  "gemini-2.5-flash": { input: 0.30, output: 2.50, cached: 0.075 },
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40, cached: 0.025 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40, cached: 0.025 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30, cached: 0.01875 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00, cached: 0.3125 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30, cached: 0.01875 },
  "gemini-1.5-flash-8b": { input: 0.0375, output: 0.15, cached: 0.01 },
  "text-embedding-004": { input: 0.025, output: 0, cached: 0 },
  "text-embedding-005": { input: 0.025, output: 0, cached: 0 },
  default: { input: 0.30, output: 2.50, cached: 0.075 }, // fall back to flash pricing
}

function priceFor(model) {
  if (!model) return GEMINI_PRICES.default
  // Match longest prefix so "gemini-2.5-pro-002" → "gemini-2.5-pro"
  const keys = Object.keys(GEMINI_PRICES).filter((k) => k !== "default")
  const match = keys
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return GEMINI_PRICES[match] || GEMINI_PRICES.default
}

function estimateCost(model, inputTokens, outputTokens, cachedTokens) {
  const p = priceFor(model)
  const inMillion = 1_000_000
  return (
    (Number(inputTokens || 0) * p.input) / inMillion +
    (Number(outputTokens || 0) * p.output) / inMillion +
    (Number(cachedTokens || 0) * p.cached) / inMillion
  )
}

// ── Service account auth ─────────────────────────────────────────────────────

/**
 * Mint a Google OAuth2 access token from a service-account JSON using the
 * JWT-bearer flow. Returns { token, expiresAt }.
 */
async function mintAccessToken(serviceAccount, scopes) {
  if (!serviceAccount?.private_key || !serviceAccount?.client_email) {
    throw new Error("Invalid service account JSON: missing private_key or client_email")
  }

  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: serviceAccount.client_email,
    scope: Array.isArray(scopes) ? scopes.join(" ") : scopes,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const privateKey = await importPKCS8(serviceAccount.private_key, "RS256")
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey)

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  return { token: data.access_token, expiresAt: now + (data.expires_in || 3600) }
}

/**
 * Validate a service account JSON by exchanging it for a token. Returns
 * `{ ok, error, projectId }`.
 */
async function validateServiceAccount(saJsonText) {
  let parsed
  try {
    parsed = typeof saJsonText === "string" ? JSON.parse(saJsonText) : saJsonText
  } catch {
    return { ok: false, error: "Could not parse service account JSON" }
  }

  if (parsed.type !== "service_account") {
    return { ok: false, error: 'JSON does not look like a service account key (type !== "service_account")' }
  }
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    return { ok: false, error: "Service account JSON missing required fields (client_email, private_key, project_id)" }
  }

  try {
    await mintAccessToken(parsed, [
      "https://www.googleapis.com/auth/monitoring.read",
    ])
    return { ok: true, projectId: parsed.project_id }
  } catch (err) {
    return { ok: false, error: `Service account auth failed: ${err.message}` }
  }
}

// ── Cloud Monitoring path (always-available) ─────────────────────────────────

/**
 * Pulls per-day token counts for the Generative Language API from Cloud
 * Monitoring. Returns rows shaped like the upsert target.
 *
 * Metric used: `serviceruntime.googleapis.com/api/request_count` for request
 * volume + `consumer/quota_used` token metrics for the
 * `generativelanguage.googleapis.com` service. Token-level metrics expose
 * `model_id` as a label so we can group by model.
 */
async function fetchMonitoringUsage(serviceAccount, projectId, days) {
  const { token } = await mintAccessToken(serviceAccount, [
    "https://www.googleapis.com/auth/monitoring.read",
  ])

  const endTime = new Date().toISOString()
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Token consumption metric. Google publishes input + output token counts as
  // separate metric types under `aiplatform.googleapis.com/publisher/online_serving/...`
  // for Vertex, and `generativelanguage.googleapis.com/...` for the public API.
  // The labels include `model` and `request_type` (input/output).
  const metricFilter = `metric.type="generativelanguage.googleapis.com/quota/generate_content_free_tier_requests" OR metric.type="serviceruntime.googleapis.com/quota/used"`

  const url =
    `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries` +
    `?filter=${encodeURIComponent(metricFilter)}` +
    `&interval.endTime=${encodeURIComponent(endTime)}` +
    `&interval.startTime=${encodeURIComponent(startTime)}` +
    `&aggregation.alignmentPeriod=86400s` +
    `&aggregation.perSeriesAligner=ALIGN_SUM` +
    `&aggregation.crossSeriesReducer=REDUCE_SUM` +
    `&aggregation.groupByFields=metric.label.model` +
    `&aggregation.groupByFields=resource.label.service`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloud Monitoring fetch failed: ${res.status} ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  return parseMonitoringResponse(data)
}

function parseMonitoringResponse(data) {
  // Map: `${date}::${model}` → row
  const rows = new Map()
  const series = data.timeSeries || []

  for (const ts of series) {
    const model = ts.metric?.labels?.model || ts.resource?.labels?.service || "unknown"
    const isOutput = (ts.metric?.labels?.request_type || "").toLowerCase().includes("output")
    for (const point of ts.points || []) {
      const t = point.interval?.endTime || point.interval?.startTime
      if (!t) continue
      const date = new Date(t).toISOString().slice(0, 10)
      const value = Number(point.value?.int64Value || point.value?.doubleValue || 0)
      const key = `${date}::${model}::${model}`
      const row = rows.get(key) || {
        date,
        model,
        line_item: model,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        cost_usd: 0,
        cost_source: "estimated",
      }
      if (isOutput) row.output_tokens += value
      else row.input_tokens += value
      rows.set(key, row)
    }
  }

  // Compute estimated cost from price table
  for (const row of rows.values()) {
    row.cost_usd = estimateCost(row.model, row.input_tokens, row.output_tokens, row.cached_tokens)
  }

  return Array.from(rows.values())
}

// ── BigQuery billing export path (optional, accurate) ────────────────────────

/**
 * Queries the user's BigQuery billing export for Generative Language API
 * costs. The export schema is documented at:
 *   https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
 *
 * The user supplies a fully-qualified table name like
 *   `myproject.billing_export.gcp_billing_export_v1_<account_id>`
 */
async function fetchBigQueryCosts(serviceAccount, projectId, datasetTable, days) {
  const { token } = await mintAccessToken(serviceAccount, [
    "https://www.googleapis.com/auth/bigquery.readonly",
  ])

  const sql = `
    SELECT
      DATE(usage_start_time) AS date,
      sku.description AS line_item,
      service.description AS model,
      SUM(cost) AS cost_usd
    FROM \`${datasetTable}\`
    WHERE service.description LIKE '%Generative Language%'
      AND DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    GROUP BY date, line_item, model
    ORDER BY date ASC
  `

  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        queryParameters: [
          { name: "days", parameterType: { type: "INT64" }, parameterValue: { value: String(days) } },
        ],
      }),
    },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`BigQuery query failed: ${res.status} ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  return parseBigQueryRows(data)
}

function parseBigQueryRows(data) {
  const fields = (data.schema?.fields || []).map((f) => f.name)
  const rows = data.rows || []
  return rows.map((r) => {
    const obj = {}
    r.f.forEach((cell, i) => {
      obj[fields[i]] = cell.v
    })
    return {
      date: obj.date,
      model: obj.model || "unknown",
      line_item: obj.line_item || obj.model || "unknown",
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      cost_usd: Number(obj.cost_usd || 0),
      cost_source: "bigquery",
    }
  })
}

// ── Public sync entry point ──────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {object} opts.serviceAccount     parsed service-account JSON
 * @param {string|null} opts.bigqueryTable optional fully-qualified BQ table
 * @param {number} opts.lookbackDays       default 7
 */
async function syncCompanyUsage({ companyId, serviceAccount, bigqueryTable, lookbackDays = 7 }) {
  if (!serviceAccount?.project_id) {
    throw new Error("Service account is missing project_id")
  }
  log("log", `Syncing company ${companyId}, ${lookbackDays}d lookback (BQ=${!!bigqueryTable})`)

  // Always pull token counts from Monitoring — that's our only source of token volume
  let rows = []
  try {
    rows = await fetchMonitoringUsage(serviceAccount, serviceAccount.project_id, lookbackDays)
  } catch (err) {
    log("warn", `Monitoring fetch failed: ${err.message}`)
  }

  // If BigQuery is configured, prefer its accurate cost over the estimate
  if (bigqueryTable) {
    try {
      const bqRows = await fetchBigQueryCosts(
        serviceAccount,
        serviceAccount.project_id,
        bigqueryTable,
        lookbackDays,
      )
      // Merge: BQ provides authoritative cost, Monitoring provides token counts.
      // Key on date+model and let BQ overwrite cost while keeping token counts.
      const merged = new Map()
      for (const r of rows) merged.set(`${r.date}::${r.model}`, r)
      for (const bq of bqRows) {
        const key = `${bq.date}::${bq.model}`
        const existing = merged.get(key) || {
          date: bq.date,
          model: bq.model,
          line_item: bq.line_item,
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
        }
        existing.cost_usd = bq.cost_usd
        existing.cost_source = "bigquery"
        existing.line_item = bq.line_item
        merged.set(key, existing)
      }
      rows = Array.from(merged.values())
    } catch (err) {
      log("warn", `BigQuery fetch failed, keeping estimated costs: ${err.message}`)
    }
  }

  const upsertRows = rows.map((r) => ({
    company_id: companyId,
    ...r,
    synced_at: new Date().toISOString(),
  }))

  if (upsertRows.length === 0) {
    log("log", "No rows to upsert")
    return { rowsUpserted: 0 }
  }

  const { error } = await supabase
    .from("gemini_usage")
    .upsert(upsertRows, { onConflict: "company_id,date,model,line_item" })

  if (error) throw new Error(`Failed to upsert gemini_usage: ${error.message}`)

  log("log", `Upserted ${upsertRows.length} rows for company ${companyId}`)
  return { rowsUpserted: upsertRows.length }
}

module.exports = {
  validateServiceAccount,
  mintAccessToken,
  syncCompanyUsage,
  estimateCost,
  GEMINI_PRICES,
}
