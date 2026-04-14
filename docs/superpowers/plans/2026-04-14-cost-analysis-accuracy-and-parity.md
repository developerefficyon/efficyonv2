# Cost Analysis Accuracy & 4-Tab Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 critical math bugs in cost analyzers, restore the `Overview | Analysis | History | Data` 4-tab detail page structure dropped during the HIGH-11 refactor, and bring AI summary generation to parity across all 9 tools including OpenAI/Anthropic/Gemini.

**Architecture:** Backend: 5 discrete analyzer fixes + new `generateUsageSummary` function + `usage_summaries` table. Frontend: 5 new shared tab components (`ToolDetailTabs`, `OverviewTab`, `AnalysisTab`, `HistoryTab`, `DataTab`) wired into the existing `[id]/page.tsx` shell. AI summary UX matches the pre-refactor violet Sparkles pattern, preserved by pulling JSX from commit `3165ecb^` via git.

**Tech Stack:** Node.js (Express), Supabase/PostgreSQL, Next.js 14, React 18, TypeScript, OpenRouter (Claude Sonnet 4.5)

---

## Testing Strategy

No automated test framework for these services. Each task verifies:
1. `tsc --noEmit` for frontend / `node -e "require(...)"` for backend controllers — catches syntax
2. Visual or log verification for behavior
3. Commit after each task so any task can be reverted independently

---

## File Map

### Backend — new

| File | Task |
|---|---|
| `backend/src/utils/currency.js` | 1 |
| `backend/src/controllers/usageSummaryController.js` | 8 |
| `backend/sql/041_usage_summaries.sql` | 8 |

### Backend — modified

| File | Task |
|---|---|
| `backend/src/services/microsoft365CostLeakAnalysis.js` | 2 |
| `backend/src/services/costLeakAnalysis.js` | 3 |
| `backend/src/services/geminiCostAnalysis.js` | 4 |
| `backend/src/services/quickbooksCostLeakAnalysis.js` | 5 |
| `backend/src/controllers/shopifyController.js` | 6 |
| `backend/src/controllers/googleWorkspaceController.js` | 6 |
| `backend/src/services/openaiService.js` | 7 |
| `backend/src/controllers/openaiUsageController.js` | 8 |
| `backend/src/controllers/anthropicUsageController.js` | 8 |
| `backend/src/controllers/geminiUsageController.js` | 8 |
| `backend/src/routes/index.js` | 8 |

### Frontend — new

| File | Task |
|---|---|
| `frontend/components/tools/overview-tab.tsx` | 9 |
| `frontend/components/tools/analysis-tab.tsx` | 10 |
| `frontend/components/tools/history-tab.tsx` | 11 |
| `frontend/components/tools/data-tab.tsx` | 12 |
| `frontend/components/tools/tool-detail-tabs.tsx` | 12 |

### Frontend — modified

| File | Task |
|---|---|
| `frontend/lib/tools/types.ts` | 9 |
| `frontend/lib/tools/configs/*.ts` (all 9) | 9 |
| `frontend/app/dashboard/tools/[id]/page.tsx` | 13 |
| `frontend/components/tools/google-workspace-view.tsx` | 13 |

---

## Phase 1 — Backend math fixes (Tasks 1-5)

### Task 1: Currency utility for live SEK→USD rate

**Files:**
- Create: `backend/src/utils/currency.js`

- [ ] **Step 1: Create the utility module**

Write `backend/src/utils/currency.js`:

```javascript
/**
 * Currency rate fetcher with 24h in-memory cache and safe fallback.
 * Uses Frankfurter (ECB data, free, no auth).
 *
 * Replaces the hardcoded SEK_TO_USD = 0.095 in costLeakAnalysis.js.
 */

let sekToUsdCache = null
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const SEK_TO_USD_FALLBACK = 0.095 // Historical average — used only if fetch fails

const log = (level, msg) => {
  const ts = new Date().toISOString()
  console[level](`[${ts}] [currency] ${msg}`)
}

/**
 * Returns the current SEK→USD rate.
 * Caches in-memory for 24h; falls back to hardcoded value on fetch failure.
 */
async function getSekToUsdRate() {
  const now = Date.now()
  if (sekToUsdCache && (now - sekToUsdCache.fetchedAt) < CACHE_TTL_MS) {
    return sekToUsdCache.rate
  }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=SEK&to=USD")
    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`)
    const data = await res.json()
    const rate = data?.rates?.USD
    if (typeof rate !== "number") throw new Error("Missing USD rate in response")
    sekToUsdCache = { rate, fetchedAt: now }
    log("log", `Live rate fetched: 1 SEK = ${rate} USD`)
    return rate
  } catch (err) {
    log("warn", `Live rate fetch failed (${err.message}) — using fallback ${SEK_TO_USD_FALLBACK}`)
    return SEK_TO_USD_FALLBACK
  }
}

module.exports = { getSekToUsdRate, SEK_TO_USD_FALLBACK }
```

- [ ] **Step 2: Smoke-test the module**

Run: `cd backend && node -e "require('./src/utils/currency').getSekToUsdRate().then(r => console.log('Rate:', r))"`
Expected: prints a rate value around `0.09-0.11`. If the network is restricted, it prints the fallback `0.095` — that's still success.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/currency.js
git commit -m "feat(backend): add live SEK-to-USD rate utility with 24h cache and fallback"
```

---

### Task 2: CRIT-1 — M365 SKU-aware price lookup

**Files:**
- Modify: `backend/src/services/microsoft365CostLeakAnalysis.js`

The placeholder at lines 406-419 returns `$20` per license regardless of SKU. Fix: pass the `skuMap` already built by the caller and look up real prices.

- [ ] **Step 1: Replace `calculateUserLicenseCost`**

Find the function:
```javascript
function calculateUserLicenseCost(assignedLicenses) {
  let totalCost = 0
  assignedLicenses.forEach((license) => {
    // We don't have the SKU part number here, just the ID
    // In a real scenario, we'd look this up from the subscribedSkus data
    // For now, estimate based on common license costs
    totalCost += 20 // Default estimate per license
  })
  return totalCost
}
```

Replace with:
```javascript
/**
 * Tracks SKU IDs seen during a run that weren't in M365_LICENSE_COSTS.
 * Flushed by `logUnknownSkus()` at end of run.
 */
let _unknownSkusThisRun = new Set()

function calculateUserLicenseCost(assignedLicenses, skuMap) {
  let totalCost = 0
  for (const license of assignedLicenses || []) {
    const skuId = license.skuId
    const sku = skuMap?.[skuId]
    if (!sku) {
      _unknownSkusThisRun.add(skuId || "(no-id)")
      continue
    }
    const info = M365_LICENSE_COSTS[sku.skuPartNumber]
    if (!info) {
      _unknownSkusThisRun.add(sku.skuPartNumber || skuId)
      continue
    }
    totalCost += info.cost
  }
  return totalCost
}

function logUnknownSkus() {
  if (_unknownSkusThisRun.size > 0) {
    console.warn(
      `[${new Date().toISOString()}] [M365CostLeakAnalysis] Unknown SKUs skipped from pricing: ${Array.from(_unknownSkusThisRun).join(", ")}`,
    )
    _unknownSkusThisRun = new Set()
  }
}
```

- [ ] **Step 2: Update the 3 call sites**

Search the file for `calculateUserLicenseCost(` (there should be 3 call sites, approximately lines 94, 129, and 187 per the audit). Each site currently passes just `user.assignedLicenses`. Change each to pass `skuMap` as the second argument.

Example of the change at each call site:

Before:
```javascript
const userCost = calculateUserLicenseCost(user.assignedLicenses)
```

After:
```javascript
const userCost = calculateUserLicenseCost(user.assignedLicenses, skuMap)
```

Note: `skuMap` is built at lines ~229-239 (inside `analyzeOverProvisionedLicenses`). Confirm the callers of the 3 analyzer sub-functions (`analyzeInactiveLicenses`, `analyzeOrphanedLicenses`, `analyzeOverProvisionedLicenses`) all have `skuMap` in scope or receive it as a parameter. If a sub-analyzer doesn't get `skuMap`, thread it through by adding it to the function's parameters — search for the function signature and extend.

- [ ] **Step 3: Call `logUnknownSkus()` at the end of the main analyzer entry**

Find the main exported function (usually `analyzeM365CostLeaks` or `analyzeMicrosoft365CostLeaks`). At the end, just before the `return results` line, add:

```javascript
  logUnknownSkus()
  return results
```

- [ ] **Step 4: Verify the module loads**

Run: `cd backend && node -e "require('./src/services/microsoft365CostLeakAnalysis')"`
Expected: no output (success).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/microsoft365CostLeakAnalysis.js
git commit -m "fix(tools): replace M365 \$20-per-license placeholder with SKU-aware price lookup (CRIT-1)"
```

---

### Task 3: CRIT-2 — Fortnox live exchange rate

**Files:**
- Modify: `backend/src/services/costLeakAnalysis.js`

- [ ] **Step 1: Replace the hardcoded rate with module-scoped variable**

Find the top of the file (around lines 15-22). It has:
```javascript
const SEK_TO_USD = 0.095 // ~1 USD = 10.5 SEK
function formatSekAsUsd(amount) {
  const usdAmount = Math.round((amount || 0) * SEK_TO_USD)
  ...
```

Replace with:
```javascript
const { getSekToUsdRate, SEK_TO_USD_FALLBACK } = require("../utils/currency")

// Module-scoped current rate, set by `analyzeCostLeaks` at entry.
// Defaults to the fallback so helpers never see `undefined`.
let SEK_TO_USD = SEK_TO_USD_FALLBACK

function formatSekAsUsd(amount) {
  const usdAmount = Math.round((amount || 0) * SEK_TO_USD)
```

(The helper function body stays the same — only the top-of-file `const` becomes `let` and gets a `require`.)

- [ ] **Step 2: Set the rate at analyzer entry**

Find the main exported function `analyzeCostLeaks` (around line 250+). Near the very top of the function, before any data processing, add:

```javascript
async function analyzeCostLeaks(supplierInvoices, customerInvoices = [], options = {}) {
  SEK_TO_USD = await getSekToUsdRate()
  // ... existing body continues ...
```

If `analyzeCostLeaks` is not already `async`, make it `async`. Its callers (in `fortnoxController.js`) likely already `await` it.

- [ ] **Step 3: Verify the module loads**

Run: `cd backend && node -e "require('./src/services/costLeakAnalysis')"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/costLeakAnalysis.js
git commit -m "fix(tools): use live SEK-to-USD rate in Fortnox analyzer instead of hardcoded 0.095 (CRIT-2)"
```

---

### Task 4: CRIT-3 — Gemini pricing cleanup

**Files:**
- Modify: `backend/src/services/geminiCostAnalysis.js`

- [ ] **Step 1: Replace the pricing table**

Find the `GEMINI_PRICES` constant (around lines 32-44). Replace the entire constant and the comment above it with:

```javascript
/**
 * Gemini per-1M-token pricing.
 * Last verified: 2026-04-14 from ai.google.dev/pricing
 *
 * Known limitations:
 * - `gemini-2.5-pro` >200k-token requests should use $2.50/M input + $15/M output.
 *   The Cloud Monitoring API doesn't expose per-call context length, so we use
 *   the ≤200k rate which systematically under-bills long-context Pro calls.
 * - `cached` rate is the per-1M read fee only. Google also charges a separate
 *   storage fee (~$4.50/M per hour of cache lifetime) that we don't model.
 * - Unknown models fall back to Pro pricing (safer over-estimate than Flash).
 */
const PRICING_LAST_VERIFIED = "2026-04-14"
const GEMINI_PRICES = {
  "gemini-2.5-pro": { input: 1.25, output: 10.00, cached: 0.125 },
  "gemini-2.5-flash": { input: 0.30, output: 2.50, cached: 0.075 },
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40, cached: 0.025 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40, cached: 0.025 },
  // Fallback for unknown models — use Pro pricing (over-estimate is safer than under-estimate)
  default: { input: 1.25, output: 10.00, cached: 0.125 },
}
```

This removes `text-embedding-004`, `gemini-1.5-pro`, `gemini-1.5-flash` (all deprecated per audit) and changes the `default` fallback from Flash to Pro.

- [ ] **Step 2: Add unknown-model warning log**

Find where `GEMINI_PRICES[model] || GEMINI_PRICES.default` is used (likely in a helper like `calcCostForRow`). Wrap the lookup with a warning when falling back:

```javascript
function getPricingForModel(model) {
  const pricing = GEMINI_PRICES[model]
  if (!pricing) {
    console.warn(`[geminiCostAnalysis] Unknown model "${model}" — using default pricing (pricing table last verified ${PRICING_LAST_VERIFIED})`)
    return GEMINI_PRICES.default
  }
  return pricing
}
```

Then replace `GEMINI_PRICES[model] || GEMINI_PRICES.default` with `getPricingForModel(model)` at all usage sites. Search the file for `GEMINI_PRICES[` to find them.

- [ ] **Step 3: Verify the module loads**

Run: `cd backend && node -e "require('./src/services/geminiCostAnalysis')"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/geminiCostAnalysis.js
git commit -m "fix(tools): remove deprecated Gemini models, fix fallback + cached rate (CRIT-3)"
```

---

### Task 5: CRIT-4 — QuickBooks duplicate-group fix

**Files:**
- Modify: `backend/src/services/quickbooksCostLeakAnalysis.js`

The current loop at lines 79-141 iterates through consecutive pairs, emitting N-1 findings per group of N duplicates. Fix: cluster by date proximity and emit one finding per group.

- [ ] **Step 1: Replace the duplicate-detection block**

Find the function that contains the loop starting with `Object.values(byAmount).forEach((sameBills) => {` (around line 79). The existing implementation sorts bills by date and iterates consecutive pairs.

Replace the inner `.forEach((sameBills) => { ... })` body with:

```javascript
Object.values(byAmount).forEach((sameBills) => {
  if (sameBills.length < 2) return

  sameBills.sort((a, b) => {
    const dateA = new Date(a.TxnDate || "")
    const dateB = new Date(b.TxnDate || "")
    return dateA - dateB
  })

  // Cluster bills into groups where each consecutive pair is within 30 days.
  const groups = []
  let currentGroup = [sameBills[0]]
  for (let i = 1; i < sameBills.length; i++) {
    const prevDate = new Date(sameBills[i - 1].TxnDate || "")
    const thisDate = new Date(sameBills[i].TxnDate || "")
    const daysDiff = Math.abs((thisDate - prevDate) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 30) {
      currentGroup.push(sameBills[i])
    } else {
      if (currentGroup.length > 1) groups.push(currentGroup)
      currentGroup = [sameBills[i]]
    }
  }
  if (currentGroup.length > 1) groups.push(currentGroup)

  // Emit one finding per group of 2+ duplicates.
  for (const group of groups) {
    const amount = safeParseFloat(group[0].TotalAmt)
    const vendor = group[0].VendorRef?.name || "Unknown vendor"
    const bills = group.map(b => ({
      id: b.Id,
      txnDate: b.TxnDate,
      docNumber: b.DocNumber,
    }))

    // Detect likely-recurring: all inter-bill intervals close to 30 days (monthly)
    const intervals = []
    for (let i = 1; i < group.length; i++) {
      const d = (new Date(group[i].TxnDate) - new Date(group[i - 1].TxnDate)) / (1000 * 60 * 60 * 24)
      intervals.push(d)
    }
    const likelyRecurring =
      intervals.length > 0 && intervals.every(d => d >= 25 && d <= 35)

    let severity = "low"
    if (amount > 1000) severity = "high"
    else if (amount > 100) severity = "medium"

    const findingHash = generateFindingHash({
      type: "duplicate_payment",
      amount,
      vendor,
      billIds: bills.map(b => b.id).sort().join("|"),
    })

    summary.duplicatePayments.push({
      findingHash,
      type: "duplicate_payment",
      severity,
      title: `Duplicate payment to ${vendor}`,
      description: `${group.length} bills of $${amount.toLocaleString()} to ${vendor} within 30-day windows${likelyRecurring ? ". Interval pattern suggests this may be a legitimate subscription — verify before taking action." : "."}`,
      potentialSavings: amount * (group.length - 1),
      affectedBills: bills,
      likelyRecurring,
      recommendation: likelyRecurring
        ? "Confirm whether this is an intentional recurring subscription. If so, consolidate under a single annual contract."
        : `Review these ${group.length} bills and refund any accidental duplicates.`,
    })
  }
})
```

Depending on the exact variable names and helper functions in the existing file (`generateFindingHash`, `safeParseFloat`, `summary.duplicatePayments`), adjust this block to match. The structure is:
1. Early return if `sameBills.length < 2`
2. Sort by date
3. Cluster into proximity groups
4. Emit one finding per group with `potentialSavings = amount × (group.length - 1)`
5. Flag `likelyRecurring` when intervals are regular

- [ ] **Step 2: Verify the module loads**

Run: `cd backend && node -e "require('./src/services/quickbooksCostLeakAnalysis')"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/quickbooksCostLeakAnalysis.js
git commit -m "fix(tools): cluster QuickBooks duplicates into groups and emit one finding per group (CRIT-4)"
```

---

## Phase 2 — AI summary parity (Tasks 6-8)

### Task 6: Wire `generateAnalysisSummary` into Shopify + GoogleWorkspace

**Files:**
- Modify: `backend/src/controllers/shopifyController.js`
- Modify: `backend/src/controllers/googleWorkspaceController.js`

Pattern to match: [fortnoxController.js:1137-1155](backend/src/controllers/fortnoxController.js#L1137). The existing pattern is:
```javascript
try {
  const aiSummary = await openaiService.generateAnalysisSummary({
    provider: "Fortnox",
    analysis,
    integration,
  })
  if (aiSummary) {
    analysis.aiSummary = aiSummary
  }
} catch (e) {
  log("warn", endpoint, `AI summary generation failed: ${e.message}`)
}
```

- [ ] **Step 1: Add `openaiService` require in shopifyController.js if missing**

Check `backend/src/controllers/shopifyController.js` imports at the top. If `openaiService` is not required, add:
```javascript
const openaiService = require("../services/openaiService")
```

- [ ] **Step 2: Wire AI summary into Shopify's `analyzeShopifyCostLeaksEndpoint`**

Find `analyzeShopifyCostLeaksEndpoint` in `backend/src/controllers/shopifyController.js`. After the analysis is computed and BEFORE the `return res.json(analysis)` line, add:

```javascript
    try {
      const aiSummary = await openaiService.generateAnalysisSummary({
        provider: "Shopify",
        analysis,
        integration,
      })
      if (aiSummary) {
        analysis.aiSummary = aiSummary
      }
    } catch (e) {
      log("warn", endpoint, `AI summary generation failed: ${e.message}`)
    }
```

- [ ] **Step 3: Same for Google Workspace**

In `backend/src/controllers/googleWorkspaceController.js`, check if `openaiService` is already imported. If not, add the require. Find `analyzeGoogleWorkspaceCostLeaksEndpoint`. Before `return res.json(analysis)`, add the same 10-line block, substituting `provider: "GoogleWorkspace"`.

- [ ] **Step 4: Verify both controllers load**

```bash
cd backend && node -e "require('dotenv').config(); require('./src/controllers/shopifyController')"
cd backend && node -e "require('dotenv').config(); require('./src/controllers/googleWorkspaceController')"
```

Expected: no output for both.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/shopifyController.js backend/src/controllers/googleWorkspaceController.js
git commit -m "feat(tools): wire AI summary generation into Shopify and Google Workspace cost-leak endpoints"
```

---

### Task 7: Add `generateUsageSummary` for AI tools

**Files:**
- Modify: `backend/src/services/openaiService.js`

- [ ] **Step 1: Add the new function**

In `backend/src/services/openaiService.js`, find the existing `generateAnalysisSummary` function (around line 165). Immediately after it, add `generateUsageSummary`:

```javascript
/**
 * Generate an AI-powered usage summary for API-consumption tools (OpenAI, Anthropic, Gemini).
 * Different prompt from generateAnalysisSummary — focuses on usage trends rather than cost-leak findings.
 *
 * @param {Object} usageData - Usage payload: { summary, daily, by_model }
 * @param {string} providerLabel - "OpenAI" | "Anthropic" | "Gemini"
 * @returns {Promise<string|null>} AI-generated markdown summary, or null on failure
 */
async function generateUsageSummary(usageData, providerLabel, options = {}) {
  if (!OPENROUTER_API_KEY) {
    console.warn("[OpenAI] API key not configured, skipping usage summary generation")
    return null
  }

  try {
    console.log(`[${new Date().toISOString()}] Generating ${providerLabel} usage summary`)

    const prompt = buildUsagePrompt(usageData, providerLabel)

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: options.modelId || OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a senior FinOps analyst specializing in AI API usage.
Write a concise, actionable markdown report based on the usage data provided.

Your report MUST include:
1. **Spend Snapshot** — total cost, MTD vs. last month, trend direction
2. **Model Mix** — which models drive most spend, with percentages
3. **Trend Analysis** — notable spikes, growth patterns, or anomalies
4. **Optimization Opportunities** — specific, actionable recommendations (e.g., model downgrade, caching, batching)
5. **Budget Outlook** — projected month-end cost and whether trajectory is sustainable

Formatting rules:
- Use markdown headers (##, ###), bold, bullet points, and tables where useful
- Use tables for model-mix breakdowns
- Include specific dollar amounts and percentages
- Be concrete — no filler text
- Be concise — aim for 300-500 words total`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://efficyon.com",
        },
      },
    )

    const summary = response.data.choices[0].message.content
    console.log(`[${new Date().toISOString()}] ${providerLabel} usage summary generated (${summary.length} chars)`)
    return summary
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating usage summary: ${error.message}`)
    return null
  }
}

/**
 * Build the user-facing prompt describing the usage data.
 */
function buildUsagePrompt(usageData, providerLabel) {
  const { summary = {}, daily = [], by_model = [] } = usageData || {}

  const lines = [`Analyze this ${providerLabel} API usage report and produce the requested summary.`]
  lines.push("")
  lines.push("## Summary metrics")
  lines.push(`- Period: last ${summary.days || 30} days`)
  lines.push(`- Total cost: $${(summary.total_cost_usd || 0).toFixed(2)}`)
  lines.push(`- Month-to-date: $${(summary.mtd_cost_usd || 0).toFixed(2)}`)
  lines.push(`- Last month: $${(summary.last_month_cost_usd || 0).toFixed(2)}`)
  lines.push(`- Projected month-end: $${(summary.projected_month_end_usd || 0).toFixed(2)}`)
  lines.push(`- Month-over-month delta: ${summary.mom_delta_pct != null ? summary.mom_delta_pct.toFixed(1) + "%" : "n/a"}`)
  lines.push(`- Total input tokens: ${(summary.total_input_tokens || 0).toLocaleString()}`)
  lines.push(`- Total output tokens: ${(summary.total_output_tokens || 0).toLocaleString()}`)
  lines.push("")
  lines.push("## Model breakdown")
  if (by_model.length === 0) {
    lines.push("(no per-model data)")
  } else {
    by_model.slice(0, 15).forEach(m => {
      lines.push(`- ${m.model}: $${(m.cost_usd || 0).toFixed(2)} (${(m.input_tokens || 0).toLocaleString()} in / ${(m.output_tokens || 0).toLocaleString()} out)`)
    })
  }
  lines.push("")
  lines.push("## Recent daily costs (last 14 days)")
  const recent = daily.slice(-14)
  recent.forEach(d => {
    lines.push(`- ${d.date}: $${(d.cost_usd || 0).toFixed(2)}`)
  })
  return lines.join("\n")
}
```

- [ ] **Step 2: Export the new function**

Find the `module.exports = { ... }` block at the bottom of `openaiService.js`. Add `generateUsageSummary` to the exports:

```javascript
module.exports = {
  // ... existing exports like generateAnalysisSummary, generateRecommendations, etc. ...
  generateUsageSummary,
}
```

- [ ] **Step 3: Verify the module loads**

```bash
cd backend && node -e "require('dotenv').config(); const s = require('./src/services/openaiService'); console.log(typeof s.generateUsageSummary)"
```

Expected: `function`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/openaiService.js
git commit -m "feat(tools): add generateUsageSummary for OpenAI/Anthropic/Gemini usage tools"
```

---

### Task 8: `usage_summaries` table + controller + routes

**Files:**
- Create: `backend/sql/041_usage_summaries.sql`
- Create: `backend/src/controllers/usageSummaryController.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Create the migration**

Write `backend/sql/041_usage_summaries.sql`:

```sql
-- Stores AI-generated usage summaries for API-consumption tools (OpenAI, Anthropic, Gemini).
-- Separate from cost_leak_analyses (which stores cost-leak runs for tools like Fortnox, M365, etc.).

create table if not exists public.usage_summaries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.company_integrations(id) on delete set null,
  provider text not null,
  summary_text text not null,
  usage_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_summaries_integration on public.usage_summaries(integration_id);
create index if not exists idx_usage_summaries_company on public.usage_summaries(company_id);
create index if not exists idx_usage_summaries_created on public.usage_summaries(created_at desc);
```

- [ ] **Step 2: Apply the migration**

Run the SQL file against the Supabase instance. Exact mechanism depends on the project's migration workflow — check other recently-added sql files (e.g., `040_googleworkspace_provider.sql`) for context. Typically via the Supabase dashboard SQL editor or a `supabase db push` command.

For this plan, assume the team runs `npm run migrate` or pastes the SQL into the dashboard. If there's no automated runner, document that the SQL file was added and the DBA will apply it.

- [ ] **Step 3: Create the controller**

Write `backend/src/controllers/usageSummaryController.js`:

```javascript
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
 * Fetches the latest usage payload for an integration by delegating to the
 * provider's usage controller. Returns the raw `{ summary, daily, by_model }` shape.
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

  // Aggregate last 30 days from the usage table
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
      mtd_cost_usd: 0, // Simplified; real MTD calc lives in per-tool controllers
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
      return res.status(500).json({ error: "AI summary generation failed — OpenRouter unavailable or returned empty" })
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
      // Still return the summary to the client so they see the result
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

    // Verify ownership
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
```

- [ ] **Step 4: Register the routes**

In `backend/src/routes/index.js`, find a reasonable place to add new integration-scoped routes (near the other integration routes like `DELETE /api/integrations/:id`). Add:

```javascript
const {
  generateAndSaveUsageSummary,
  listUsageSummaries,
} = require("../controllers/usageSummaryController")

router.post("/api/integrations/:id/usage-summary", requireAuth, requireRole("owner", "editor"), generateAndSaveUsageSummary)
router.get("/api/integrations/:id/usage-summaries", requireAuth, listUsageSummaries)
```

Match the existing style for middleware (`requireAuth`, `requireRole`) — check how `DELETE /api/integrations/:id` wires these and mirror that.

- [ ] **Step 5: Verify the controller loads**

```bash
cd backend && node -e "require('dotenv').config(); require('./src/controllers/usageSummaryController')"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add backend/sql/041_usage_summaries.sql backend/src/controllers/usageSummaryController.js backend/src/routes/index.js
git commit -m "feat(tools): add usage_summaries table + controller + routes for AI tool summary history"
```

---

## Phase 3 — Frontend tab components (Tasks 9-12)

### Task 9: Extend UnifiedToolConfig + populate analysisType in 9 configs

**Files:**
- Modify: `frontend/lib/tools/types.ts`
- Modify: all 9 files in `frontend/lib/tools/configs/`

- [ ] **Step 1: Extend the type**

In `frontend/lib/tools/types.ts`, find the `UnifiedToolConfig` interface. Add these fields to the interface (before the closing brace):

```typescript
  // ANALYSIS (cost-leak or usage-summary)
  analysisType?: "costLeaks" | "usage" | "none"
  analysisEndpoint?: string
  analysisSupportsInactivity?: boolean
  analysisSupportsDateRange?: boolean
```

- [ ] **Step 2: Populate in each config**

For each config file, add the relevant fields. Add ONE line or block at the end of the config object, before the closing `}`:

**File `frontend/lib/tools/configs/fortnox.ts`** — add:
```typescript
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/fortnox/cost-leaks",
  analysisSupportsDateRange: true,
```

**File `frontend/lib/tools/configs/microsoft365.ts`** — add:
```typescript
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/microsoft365/cost-leaks",
  analysisSupportsInactivity: true,
```

**File `frontend/lib/tools/configs/hubspot.ts`** — add:
```typescript
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/hubspot/cost-leaks",
  analysisSupportsInactivity: true,
```

**File `frontend/lib/tools/configs/quickbooks.ts`** — add:
```typescript
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/quickbooks/cost-leaks",
```

**File `frontend/lib/tools/configs/shopify.ts`** — add:
```typescript
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/shopify/cost-leaks",
```

**File `frontend/lib/tools/configs/googleworkspace.ts`** — add:
```typescript
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/googleworkspace/cost-leaks",
  analysisSupportsInactivity: true,
```

**File `frontend/lib/tools/configs/openai.ts`** — add:
```typescript
  analysisType: "usage",
```

**File `frontend/lib/tools/configs/anthropic.ts`** — add:
```typescript
  analysisType: "usage",
```

**File `frontend/lib/tools/configs/gemini.ts`** — add:
```typescript
  analysisType: "usage",
```

(AI tools don't need `analysisEndpoint` because the usage-summary endpoint is always `POST /api/integrations/:id/usage-summary` — the component constructs this itself from the integration ID.)

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "(lib/tools/types|lib/tools/configs)" | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/tools/types.ts frontend/lib/tools/configs/
git commit -m "feat(tools): add analysisType config field and populate across all 9 tool configs"
```

---

### Task 10: Create `<OverviewTab>` component

**Files:**
- Create: `frontend/components/tools/overview-tab.tsx`

This tab shows integration metadata and connection details. Content is lifted from the pre-refactor file (commit `3165ecb^`) lines 2543-2702.

- [ ] **Step 1: Extract pre-refactor source for reference**

```bash
cd c:/Users/tayaw/Desktop/effycionv2 && git show 3165ecb^:frontend/app/dashboard/tools/\[id\]/page.tsx | sed -n '2543,2702p' > /tmp/overview-tab-source.txt
```

Open `/tmp/overview-tab-source.txt` and read the JSX. Key references to notice:
- `integration.connection_type`, `integration.created_at`, `integration.updated_at`, `integration.settings?.oauth_data?.tokens`
- `formatDate(...)` helper — defined elsewhere in the pre-refactor file
- Icons: `Settings`, `Key`, `Clock`, `Timer`, `Shield`, `RefreshCw`, `CheckCircle`, `Copy`
- Imports from `@/components/ui/*`, `@/lib/auth-hooks`, `sonner`

- [ ] **Step 2: Create the component**

Write `frontend/components/tools/overview-tab.tsx`:

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Key, Clock, Timer, Shield, RefreshCw, CheckCircle, Copy } from "lucide-react"
import { toast } from "sonner"
import type { Integration } from "@/lib/tools/types"

interface OverviewTabProps {
  integration: Integration
}

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export function OverviewTab({ integration }: OverviewTabProps) {
  const tokens = integration.settings?.oauth_data?.tokens

  return (
    <div className="space-y-6">
      {/* Connection Details Card */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Connection Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Connection Type</p>
              <p className="text-white font-medium capitalize">{integration.connection_type || "N/A"}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
              <p className="text-white font-medium">{formatDate(integration.created_at)}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-white font-medium">{formatDate(integration.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Information Card */}
      {tokens && (
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Token Expires</p>
                </div>
                <p className="text-white font-medium">
                  {tokens.expires_at
                    ? new Date(tokens.expires_at * 1000).toLocaleString()
                    : "N/A"}
                </p>
                {tokens.expires_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(tokens.expires_at * 1000) > new Date()
                      ? <span className="text-emerald-400">Active</span>
                      : <span className="text-red-400">Expired</span>}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Token Duration</p>
                </div>
                <p className="text-white font-medium">
                  {tokens.expires_in
                    ? `${Math.floor(tokens.expires_in / 60)} minutes`
                    : "N/A"}
                </p>
                {tokens.expires_in && (
                  <p className="text-xs text-gray-500 mt-1">{tokens.expires_in} seconds</p>
                )}
              </div>
            </div>

            {tokens.access_token && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Access Token</p>
                  </div>
                  <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30">
                    {tokens.token_type || "bearer"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                    {String(tokens.access_token).substring(0, 50)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(tokens.access_token)
                      toast.success("Access token copied to clipboard")
                    }}
                    className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {tokens.refresh_token && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Refresh Token</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15">
                    Available
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                    {String(tokens.refresh_token).substring(0, 50)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(tokens.refresh_token)
                      toast.success("Refresh token copied to clipboard")
                    }}
                    className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {tokens.scope && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Scopes</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {String(tokens.scope).split(" ").filter(Boolean).map((scope: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs text-gray-300 border-white/20 bg-white/5">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "overview-tab" | head -10
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/tools/overview-tab.tsx
git commit -m "feat(tools): add OverviewTab component with integration metadata and token status"
```

---

### Task 11: Create `<AnalysisTab>` component — dual-mode

**Files:**
- Create: `frontend/components/tools/analysis-tab.tsx`

This is the largest component. It handles two modes:
- `costLeaks` — runs a cost-leak analysis, displays findings + AI summary
- `usage` — triggers usage-summary generation for AI tools

The component keeps the pre-refactor visual style (violet Sparkles for AI summary, severity-colored cards for findings).

- [ ] **Step 1: Extract pre-refactor Analysis-tab JSX for reference**

```bash
cd c:/Users/tayaw/Desktop/effycionv2 && git show 3165ecb^:frontend/app/dashboard/tools/\[id\]/page.tsx | sed -n '1604,2279p' > /tmp/analysis-tab-source.txt
```

Read through `/tmp/analysis-tab-source.txt`. Key elements:
- Header card with Sparkles icon + "Cost Leak Analysis" title
- Parameters row: date range (Fortnox), inactivity dropdown (MS365/HubSpot/GWorkspace), "Analyze" button
- AI Summary card (violet) rendering `costLeakAnalysis.aiSummary` via `ReactMarkdown`
- 4 summary metric cards (Total Issues, Potential Savings, High Priority, Medium Priority)
- Findings list with severity badges, filter, dismiss/resolve actions
- Empty state ("Ready to Analyze") and loading state

- [ ] **Step 2: Install `react-markdown` and `remark-gfm` if not present**

```bash
cd frontend && npm list react-markdown remark-gfm 2>&1 | head -10
```

If either is missing:
```bash
cd frontend && npm install react-markdown remark-gfm
```

(These were used in the pre-refactor file; check if they're still in `package.json`. If they were removed during the HIGH-11 refactor, reinstall.)

- [ ] **Step 3: Create the component**

Write `frontend/components/tools/analysis-tab.tsx`. Given its size (~500 lines), write in this structure:

```typescript
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles, Zap, Search, Loader2, BarChart3, Target, DollarSign,
  ShieldAlert, ShieldCheck, AlertTriangle, X, Eye, EyeOff, RefreshCw,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface AnalysisTabProps {
  integration: Integration
  config: UnifiedToolConfig
}

export function AnalysisTab({ integration, config }: AnalysisTabProps) {
  if (config.analysisType === "costLeaks") {
    return <CostLeaksAnalysis integration={integration} config={config} />
  }
  if (config.analysisType === "usage") {
    return <UsageAnalysis integration={integration} config={config} />
  }
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="py-12 text-center">
        <p className="text-white/40 text-sm">Analysis not available for this tool.</p>
      </CardContent>
    </Card>
  )
}

// --- Cost Leaks Mode ---

function CostLeaksAnalysis({ integration, config }: AnalysisTabProps) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [inactivityDays, setInactivityDays] = useState(30)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const handleAnalyze = useCallback(async () => {
    if (!config.analysisEndpoint) return
    setIsLoading(true)
    try {
      const token = await getBackendToken()
      if (!token) {
        router.push("/login")
        return
      }

      // Build URL with optional query params
      const url = new URL(`${API_BASE}${config.analysisEndpoint}`)
      if (config.analysisSupportsInactivity) {
        url.searchParams.set("inactivityDays", String(inactivityDays))
      }
      if (config.analysisSupportsDateRange) {
        if (startDate) url.searchParams.set("startDate", startDate)
        if (endDate) url.searchParams.set("endDate", endDate)
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setAnalysis(data)
      toast.success("Analysis complete")
    } catch (err: any) {
      toast.error("Analysis failed", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [config, inactivityDays, startDate, endDate, router])

  // Aggregate findings across all sub-analyses
  const allFindings = [
    ...(analysis?.supplierInvoiceAnalysis?.findings || []),
    ...(analysis?.customerInvoiceAnalysis?.findings || []),
    ...(analysis?.licenseAnalysis?.findings || []),
    ...(analysis?.findings || []),
  ]

  const filteredFindings = severityFilter === "all"
    ? allFindings
    : allFindings.filter(f => f.severity === severityFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white text-xl font-bold">Cost Leak Analysis</CardTitle>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500/60" />
                  AI-powered analysis to identify savings opportunities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analysis && (
                <Button
                  onClick={() => setIsVisible(!isVisible)}
                  variant="outline"
                  size="sm"
                  className="border-white/[0.06] bg-white/[0.03] text-white/70 hover:bg-white/10 h-9 w-9 p-0"
                >
                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-400 text-white h-9 px-4 text-sm font-medium"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" />{analysis ? "Re-analyze" : "Analyze Cost Leaks"}</>
                )}
              </Button>
            </div>
          </div>

          {/* Parameters */}
          {(config.analysisSupportsDateRange || config.analysisSupportsInactivity) && (
            <div className="pt-4 mt-4 border-t border-white/[0.04] flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {config.analysisSupportsDateRange && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 w-40 bg-white/[0.03] border-white/[0.06] text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 w-40 bg-white/[0.03] border-white/[0.06] text-white text-sm"
                    />
                  </div>
                </>
              )}
              {config.analysisSupportsInactivity && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Inactivity Threshold</label>
                  <select
                    value={inactivityDays}
                    onChange={(e) => setInactivityDays(parseInt(e.target.value))}
                    className="h-9 px-3 rounded-md bg-black/30 border border-white/[0.06] text-white text-sm"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Results */}
      {analysis && isVisible && (
        <>
          {analysis.aiSummary && <AiSummaryCard summary={analysis.aiSummary} />}

          {analysis.overallSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Issues"
                value={analysis.overallSummary.totalFindings || 0}
                icon={<Target className="w-5 h-5 text-gray-400" />}
              />
              <MetricCard
                label="Potential Savings"
                value={`$${(analysis.overallSummary.totalPotentialSavings || 0).toLocaleString()}`}
                valueClass="text-emerald-400"
                icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                gradient="from-emerald-950 to-slate-900 border-emerald-800/30"
                sublabel="USD annually"
              />
              <MetricCard
                label="High Priority"
                value={analysis.overallSummary.highSeverity || 0}
                valueClass="text-red-400"
                icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
                gradient="from-red-950 to-slate-900 border-red-800/30"
                sublabel="Needs attention"
              />
              <MetricCard
                label="Medium Priority"
                value={analysis.overallSummary.mediumSeverity || 0}
                valueClass="text-amber-400"
                icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                gradient="from-amber-950 to-slate-900 border-amber-800/30"
                sublabel="Review recommended"
              />
            </div>
          )}

          {allFindings.length > 0 && (
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Findings ({filteredFindings.length})</CardTitle>
                  <div className="flex gap-1">
                    {(["all", "high", "medium", "low"] as const).map(s => (
                      <Button
                        key={s}
                        variant={severityFilter === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSeverityFilter(s)}
                        className="h-7 text-xs capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredFindings.map((f, idx) => (
                    <FindingCard key={f.findingHash || idx} finding={f} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {allFindings.length === 0 && (
            <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-800/30">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">No Cost Leaks Detected</h3>
                <p className="text-gray-400 max-w-md mx-auto">Everything looks well-optimized.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {!analysis && !isLoading && (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="text-xl text-white mb-2">Ready to Analyze</h3>
            <p className="text-[13px] text-white/30 max-w-md mx-auto mb-6">
              Run analysis to identify cost optimization opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Usage Mode (OpenAI/Anthropic/Gemini) ---

function UsageAnalysis({ integration, config }: AnalysisTabProps) {
  const router = useRouter()
  const [result, setResult] = useState<{ summary_text: string; created_at: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const token = await getBackendToken()
      if (!token) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}/api/integrations/${integration.id}/usage-summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResult({ summary_text: data.summary_text, created_at: data.created_at })
      toast.success("Usage summary generated")
    } catch (err: any) {
      toast.error("Summary generation failed", { description: err.message })
    } finally {
      setIsGenerating(false)
    }
  }, [integration.id, router])

  return (
    <div className="space-y-6">
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white">{config.label} Usage Insights</CardTitle>
                <p className="text-gray-400 text-sm">AI-generated analysis of your {config.label} API usage</p>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-emerald-500 hover:bg-emerald-400 text-white h-9 px-4 text-sm"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{result ? "Regenerate" : "Generate Summary"}</>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {result && <AiSummaryCard summary={result.summary_text} />}

      {!result && !isGenerating && (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">Click "Generate Summary" to get AI insights on your usage.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Shared sub-components ---

function AiSummaryCard({ summary }: { summary: string }) {
  return (
    <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-violet-500/10 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-white font-semibold">AI Summary</h3>
              <Badge variant="outline" className="text-[9px] h-[16px] border-violet-500/15 text-violet-400/70 bg-violet-500/[0.06] rounded-full px-1.5">AI</Badge>
            </div>
            <div className="prose prose-invert prose-sm max-w-none
              [&_p]:text-gray-300 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2
              [&_strong]:text-white [&_strong]:font-semibold
              [&_ul]:text-gray-300 [&_ul]:text-sm [&_ul]:space-y-1 [&_ul]:mb-3
              [&_ol]:text-gray-300 [&_ol]:text-sm [&_ol]:space-y-1 [&_ol]:mb-3
              [&_li]:text-gray-300
              [&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4
              [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
              [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1.5 [&_h3]:mt-2
              [&_hr]:border-white/10 [&_hr]:my-3
              [&_code]:text-emerald-400 [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                  th: ({ children }) => <th className="text-left text-gray-400 font-medium px-3 py-2 border-b border-white/10 whitespace-nowrap">{children}</th>,
                  td: ({ children }) => <td className="text-gray-300 px-3 py-1.5 border-b border-white/[0.04]">{children}</td>,
                  tr: ({ children }) => <tr className="border-b border-white/[0.04]">{children}</tr>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  label, value, icon, valueClass = "text-white", gradient = "bg-white/[0.02] border-white/[0.06]", sublabel,
}: {
  label: string; value: number | string; icon: React.ReactNode; valueClass?: string; gradient?: string; sublabel?: string
}) {
  const isGradient = gradient.includes("from-")
  return (
    <Card className={isGradient ? `bg-gradient-to-br ${gradient} rounded-xl` : `${gradient} rounded-xl`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${valueClass}`}>{value}</p>
            {sublabel && <p className="text-xs text-white/30 mt-1">{sublabel}</p>}
          </div>
          <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function FindingCard({ finding }: { finding: any }) {
  const severityColor =
    finding.severity === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" :
    finding.severity === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
    "bg-white/5 text-white/50 border-white/10"

  return (
    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-[10px] uppercase ${severityColor}`}>{finding.severity}</Badge>
            <span className="text-[10px] uppercase tracking-wide text-white/30">{finding.type}</span>
          </div>
          <p className="text-[13px] font-medium text-white/85 mb-1">{finding.title}</p>
          <p className="text-[11.5px] text-white/40 mb-2">{finding.description}</p>
          {finding.recommendation && (
            <p className="text-[11px] text-emerald-400/60">→ {finding.recommendation}</p>
          )}
        </div>
        {(finding.potentialSavings || 0) > 0 && (
          <div className="text-right shrink-0">
            <div className="text-[11px] text-white/30">Save</div>
            <div className="text-[15px] font-medium text-emerald-400/90">
              ${finding.potentialSavings.toLocaleString()}
            </div>
            <div className="text-[10px] text-white/30">/year</div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "analysis-tab" | head -20
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/tools/analysis-tab.tsx
git commit -m "feat(tools): add AnalysisTab component with dual-mode cost-leak and usage rendering"
```

---

### Task 12: Create `<HistoryTab>`, `<DataTab>`, and `<ToolDetailTabs>`

**Files:**
- Create: `frontend/components/tools/history-tab.tsx`
- Create: `frontend/components/tools/data-tab.tsx`
- Create: `frontend/components/tools/tool-detail-tabs.tsx`

- [ ] **Step 1: Create `<HistoryTab>`**

Write `frontend/components/tools/history-tab.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Loader2, RefreshCw, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface HistoryTabProps {
  integration: Integration
  config: UnifiedToolConfig
}

interface HistoryItem {
  id: string
  created_at: string
  summary_text?: string
  summary?: any // for cost-leak runs
  ai_summary?: string
  provider?: string
}

export function HistoryTab({ integration, config }: HistoryTabProps) {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<HistoryItem | null>(null)

  const endpoint =
    config.analysisType === "usage"
      ? `/api/integrations/${integration.id}/usage-summaries`
      : `/api/analysis-history?integrationId=${integration.id}&provider=${integration.provider || integration.tool_name}`

  const load = async () => {
    setIsLoading(true)
    try {
      const token = await getBackendToken()
      if (!token) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = config.analysisType === "usage"
        ? (data.summaries || [])
        : (data.analyses || [])
      setItems(list)
    } catch (err: any) {
      toast.error("Failed to load history", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [integration.id, config.analysisType])

  return (
    <div className="space-y-6">
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/10 rounded-xl">
                <Clock className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-white">Analysis History</CardTitle>
                <p className="text-gray-400 text-sm">Past {config.analysisType === "usage" ? "usage summaries" : "cost-leak analyses"}</p>
              </div>
            </div>
            <Button
              onClick={load}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No history yet. Run an analysis to start building your history.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selected?.id === item.id
                      ? "bg-white/10 border-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.summary && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          {item.summary.totalFindings || 0} findings · ${(item.summary.totalPotentialSavings || 0).toLocaleString()} potential savings
                        </p>
                      )}
                    </div>
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (selected.summary_text || selected.ai_summary) && (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              Summary from {new Date(selected.created_at).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none
              [&_p]:text-gray-300 [&_p]:text-sm
              [&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold
              [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold
              [&_strong]:text-white
              [&_ul]:text-gray-300 [&_ol]:text-gray-300
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selected.summary_text || selected.ai_summary || ""}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `<DataTab>`**

Write `frontend/components/tools/data-tab.tsx`:

```typescript
"use client"

import type { Integration, UnifiedToolConfig, ToolInfo } from "@/lib/tools/types"

interface DataTabProps {
  integration: Integration
  config: UnifiedToolConfig
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
}

export function DataTab({ integration, config, info, isLoading, reload }: DataTabProps) {
  const ViewComponent = config.viewComponent
  return (
    <ViewComponent
      integration={integration}
      info={info}
      isLoading={isLoading}
      reload={reload}
    />
  )
}
```

- [ ] **Step 3: Create `<ToolDetailTabs>`**

Write `frontend/components/tools/tool-detail-tabs.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, Clock, Info, Database } from "lucide-react"
import { OverviewTab } from "./overview-tab"
import { AnalysisTab } from "./analysis-tab"
import { HistoryTab } from "./history-tab"
import { DataTab } from "./data-tab"
import { useToolInfo } from "@/lib/tools/use-tool-info"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

interface ToolDetailTabsProps {
  integration: Integration
  config: UnifiedToolConfig
}

export function ToolDetailTabs({ integration, config }: ToolDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("analysis")
  const { info, isLoading, reload } = useToolInfo(integration)
  const hasAnalysis = config.analysisType && config.analysisType !== "none"

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] mb-6 w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap rounded-lg p-1">
        {hasAnalysis && (
          <TabsTrigger
            value="analysis"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Analysis
          </TabsTrigger>
        )}
        {hasAnalysis && (
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            History
          </TabsTrigger>
        )}
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
        >
          <Info className="w-3.5 h-3.5 mr-1.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="data"
          className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
        >
          <Database className="w-3.5 h-3.5 mr-1.5" />
          Data
        </TabsTrigger>
      </TabsList>

      {hasAnalysis && (
        <TabsContent value="analysis" className="mt-0">
          <AnalysisTab integration={integration} config={config} />
        </TabsContent>
      )}
      {hasAnalysis && (
        <TabsContent value="history" className="mt-0">
          <HistoryTab integration={integration} config={config} />
        </TabsContent>
      )}
      <TabsContent value="overview" className="mt-0">
        <OverviewTab integration={integration} />
      </TabsContent>
      <TabsContent value="data" className="mt-0">
        <DataTab
          integration={integration}
          config={config}
          info={info}
          isLoading={isLoading}
          reload={reload}
        />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "(history-tab|data-tab|tool-detail-tabs)" | head -20
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/tools/history-tab.tsx frontend/components/tools/data-tab.tsx frontend/components/tools/tool-detail-tabs.tsx
git commit -m "feat(tools): add HistoryTab, DataTab, and ToolDetailTabs wrapper components"
```

---

## Phase 4 — Wire-up (Task 13)

### Task 13: Wire ToolDetailTabs into [id]/page.tsx + remove GWorkspace internal Findings tab

**Files:**
- Modify: `frontend/app/dashboard/tools/[id]/page.tsx`
- Modify: `frontend/components/tools/google-workspace-view.tsx`

- [ ] **Step 1: Replace ViewComponent with ToolDetailTabs in [id]/page.tsx**

In `frontend/app/dashboard/tools/[id]/page.tsx`, find the `ConnectedToolDetail` function body. It currently renders:

```typescript
      {integration.status === "connected" ? (
        <ViewComponent
          integration={integration}
          info={info}
          isLoading={isLoadingInfo}
          reload={reload}
        />
      ) : (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-8 text-center">
            <p className="text-white/40 text-sm">
              This integration is currently {integration.status}.
              {canReconnect && " Click Reconnect above to restore access."}
            </p>
          </CardContent>
        </Card>
      )}
```

Replace with:

```typescript
      {integration.status === "connected" ? (
        <ToolDetailTabs integration={integration} config={config} />
      ) : (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-8 text-center">
            <p className="text-white/40 text-sm">
              This integration is currently {integration.status}.
              {canReconnect && " Click Reconnect above to restore access."}
            </p>
          </CardContent>
        </Card>
      )}
```

Also remove (or comment out) these no-longer-needed bits inside `ConnectedToolDetail`:
- `const { info, isLoading: isLoadingInfo, reload } = useToolInfo(integration)` — `useToolInfo` now lives inside `ToolDetailTabs`
- The `ViewComponent` local variable — replaced by the tabs

Add the import at the top:
```typescript
import { ToolDetailTabs } from "@/components/tools/tool-detail-tabs"
```

Remove:
```typescript
import { useToolInfo } from "@/lib/tools/use-tool-info"
```

(Only if not used elsewhere in the file. The file uses `useToolConnect` but that's separate.)

- [ ] **Step 2: Remove GWorkspace's internal Findings tab**

In `frontend/components/tools/google-workspace-view.tsx`:
- Find the `TabsTrigger value="findings"` block and delete it (around lines 332-335)
- Find the corresponding `TabsContent value="findings"` block and delete its contents (the findings rendering inside the view component — search for the findings JSX and remove it)
- The `<useState>` for `activeTab` needs to remove `"findings"` from its union type
- Any imports, state, and handlers exclusively used for the findings tab can be deleted

**Important:** The GWorkspace view's "Data" content (Users/Licenses/Groups/Domain tabs) stays intact — only the internal Findings tab is removed. Cost-leak analysis for GWorkspace is now handled by the shared `<AnalysisTab>` which calls the same `/api/integrations/googleworkspace/cost-leaks` endpoint.

Search for these markers to guide cleanup:
```bash
cd frontend && grep -n "findings\|Findings" components/tools/google-workspace-view.tsx | head -20
```

Remove lines related to:
- `activeTab === "findings"` rendering blocks
- `inactivityDays` state and dropdown (moves to `AnalysisTab`)
- The `analyze` function / callback
- Cost-leak fetching logic

Keep:
- Users, Licenses, Groups, Domain tab rendering
- `useToolInfo` hook usage for data fetching
- Anything NOT related to cost-leak findings

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "(app/dashboard/tools|components/tools)" | head -30
```

Expected: zero errors. Any errors indicate missing imports or the GWorkspace cleanup was incomplete.

- [ ] **Step 4: Manual smoke-test**

```bash
cd frontend && npm run dev
```

Open any tool detail page. Verify:
1. The page renders 4 tabs: `Analysis | History | Overview | Data` (for tools with `analysisType`)
2. Or 2 tabs: `Overview | Data` (for tools with `analysisType: "none"` or undefined — none today, but future)
3. Clicking each tab renders without console errors
4. The "Data" tab shows the same inner tabs as the view component had before (Company/Customers/etc.)
5. Google Workspace specifically no longer has an internal "Findings" tab — it only has Users/Licenses/Groups/Domain, and cost-leak analysis is on the outer Analysis tab

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/tools/\[id\]/page.tsx frontend/components/tools/google-workspace-view.tsx
git commit -m "feat(tools): restore Overview/Analysis/History/Data tabs in detail page + remove GWorkspace internal Findings tab"
```

---

## Post-implementation verification

After all 13 tasks land:

1. **TypeScript sweep:**
   ```bash
   cd frontend && npx tsc --noEmit 2>&1 | grep -E "(app/dashboard/tools|components/tools|lib/tools)" | head -30
   ```
   Expected: zero new errors.

2. **Backend loads:**
   ```bash
   cd backend
   for f in integrationController usageSummaryController fortnoxController microsoft365Controller hubspotController quickbooksController shopifyController googleWorkspaceController openaiUsageController anthropicUsageController geminiUsageController; do
     node -e "require('dotenv').config(); require('./src/controllers/$f')" && echo "OK: $f"
   done
   ```
   Expected: all print "OK: <name>".

3. **Manual per-tool verification** (dev server + connected test accounts):
   - Connect each tool in dev
   - Navigate to `/dashboard/tools/<id>` — confirm 4 tabs render
   - Click "Analyze" on a cost-leak tool (Fortnox/M365/HubSpot/QuickBooks/Shopify/GWorkspace) — confirm findings appear + AI summary renders
   - Click "Generate Summary" on an AI tool (OpenAI/Anthropic/Gemini) — confirm summary appears
   - Check the History tab — confirm the run appears
   - For Fortnox specifically: check backend logs for "Live rate fetched" on first run
   - For M365 specifically: confirm a finding's `potentialSavings` matches the sum of that user's actual license costs (not $20 × count)

4. **Commit count check:**
   ```bash
   cd c:/Users/tayaw/Desktop/effycionv2 && git log --oneline -15
   ```
   Expected: 13 feature commits + 2 docs commits (spec + plan) visible.

## Rollout

Single merge to `main`. No feature flag.

Rollback: `git revert` the merge commit. The `usage_summaries` table can be dropped manually if needed — no other tables or rows are modified.

## Issues NOT addressed in this plan

| Issue | Reason |
|---|---|
| ~40 HIGH/MEDIUM accuracy findings from the audit | Out of scope — this plan is Tier-1 only |
| Shopify 20% margin threshold, HubSpot pricing refresh, etc. | Future follow-up |
| Multi-currency in Fortnox (EUR/NOK/DKK) | Future work |
| Historical exchange-rate application (use invoice date's rate) | Future work |
| Automated test framework | Separate project |
