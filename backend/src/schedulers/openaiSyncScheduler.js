/**
 * AI provider usage sync scheduler.
 *
 * Runs daily at 03:00 server time. Iterates all active AI cost-analysis
 * integrations (OpenAI, Anthropic, …) and syncs the last 7 days of usage into
 * each provider's `*_usage` table.
 *
 * Adding a new AI provider:
 *   1. Add a service module exposing `syncCompanyUsage({ companyId, apiKey, lookbackDays })`.
 *   2. Add an entry to `AI_PROVIDERS` below — the registry pattern keeps this
 *      file from growing per-provider boilerplate.
 *
 * The file is still named `openaiSyncScheduler.js` so the existing
 * `server.js` import keeps working without churn; the public init function
 * still has the same name.
 */

const cron = require("node-cron")
const { supabase } = require("../config/supabase")
const { decrypt } = require("../utils/encryption")
const { syncCompanyUsage: syncOpenAIUsage } = require("../services/openaiCostAnalysis")
const { syncCompanyUsage: syncAnthropicUsage } = require("../services/anthropicCostAnalysis")
const { syncForScheduler: syncGeminiUsage } = require("../controllers/geminiUsageController")

const AI_PROVIDERS = [
  { provider: "OpenAI", sync: syncOpenAIUsage, label: "OpenAI" },
  { provider: "Anthropic", sync: syncAnthropicUsage, label: "Anthropic" },
  // Gemini's sync needs more than just (companyId, apiKey) — it needs a service
  // account JSON + optional BigQuery table — so we delegate via the controller's
  // adapter that loads its own creds from `company_integrations`.
  { provider: "Gemini", sync: syncGeminiUsage, label: "Gemini" },
]

let task = null

async function runSyncForProvider({ provider, sync, label }) {
  const { data: integrations, error } = await supabase
    .from("company_integrations")
    .select("company_id, settings, status")
    .eq("provider", provider)
    .eq("status", "active")

  if (error) {
    console.error(`[AICostSync:${label}] Failed to load integrations: ${error.message}`)
    return { ok: 0, failed: 0 }
  }

  let ok = 0
  let failed = 0
  for (const integ of integrations || []) {
    try {
      const apiKey = decrypt(integ.settings?.api_key)
      if (!apiKey) {
        console.warn(`[AICostSync:${label}] Skipping ${integ.company_id} — no decryptable key`)
        continue
      }
      await sync({ companyId: integ.company_id, apiKey, lookbackDays: 7 })
      ok++
    } catch (err) {
      failed++
      console.error(`[AICostSync:${label}] Sync failed for ${integ.company_id}: ${err.message}`)
    }
  }
  return { ok, failed }
}

async function runSyncForAll() {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [AICostSync] Starting daily sync`)

  for (const p of AI_PROVIDERS) {
    const { ok, failed } = await runSyncForProvider(p)
    console.log(`[${new Date().toISOString()}] [AICostSync:${p.label}] Done — ${ok} ok, ${failed} failed`)
  }
}

function initializeOpenAISyncScheduler() {
  if (task) return
  task = cron.schedule("0 3 * * *", () => {
    runSyncForAll().catch((e) => console.error(`[AICostSync] Unhandled: ${e.message}`))
  })
  console.log(`[${new Date().toISOString()}] [AICostSync] Scheduler initialized (0 3 * * *) — providers: ${AI_PROVIDERS.map(p => p.label).join(", ")}`)
}

function stopOpenAISyncScheduler() {
  if (task) {
    task.stop()
    task = null
  }
}

module.exports = {
  initializeOpenAISyncScheduler,
  stopOpenAISyncScheduler,
  runSyncForAll,
}
