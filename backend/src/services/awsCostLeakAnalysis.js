/**
 * AWS Cost-Leak Analysis aggregator.
 *
 * Calls Cost Explorer + Compute Optimizer in parallel, assigns severity by
 * projected USD savings, sorts, and rolls up a summary shaped for the shared
 * cost_leak_analyses table.
 */

const { runCostExplorerAnalysis } = require("./awsCostExplorerAnalysis")
const { runComputeOptimizerAnalysis } = require("./awsComputeOptimizerAnalysis")

function assignSeverity(savings) {
  if (savings >= 500) return "critical"
  if (savings >= 100) return "high"
  if (savings >= 25) return "medium"
  if (savings > 0) return "low"
  return null // dropped
}

function countBy(arr, key) {
  const out = {}
  for (const item of arr) {
    const k = item[key]
    if (!k) continue
    out[k] = (out[k] || 0) + 1
  }
  return out
}

function uniq(arr) {
  return Array.from(new Set(arr.filter((x) => x != null)))
}

/**
 * Run a full AWS cost-leak analysis.
 *
 * @param {{ accessKeyId, secretAccessKey, sessionToken }} credentials
 * @param {object} settings — integration.settings (must have active_regions)
 * @returns {Promise<{ summary, findings }>}
 */
async function analyzeAwsCostLeaks(credentials, settings) {
  const [ceResult, coResult] = await Promise.all([
    runCostExplorerAnalysis(credentials),
    runComputeOptimizerAnalysis(credentials, settings),
  ])

  const raw = [...ceResult.findings, ...coResult.findings]

  const findings = []
  for (const f of raw) {
    const severity = assignSeverity(Number(f.projectedSavings || 0))
    if (!severity) continue // drop zero-savings findings
    findings.push({ ...f, severity })
  }

  findings.sort((a, b) => Number(b.projectedSavings || 0) - Number(a.projectedSavings || 0))

  const totalPotentialSavings = findings.reduce((s, f) => s + Number(f.projectedSavings || 0), 0)

  const partialRegionFailures = (coResult.errors || [])
    .filter((e) => e.api === "all")
    .map((e) => e.region)

  const sourceErrors = [
    ...(ceResult.errors || []).map((e) => ({ source: "cost_explorer", ...e })),
    ...(coResult.errors || []).map((e) => ({ source: "compute_optimizer", ...e })),
  ]

  const summary = {
    totalPotentialSavings: Number(totalPotentialSavings.toFixed(2)),
    currency: "USD",
    totalFindings: findings.length,
    findingsBySeverity: countBy(findings, "severity"),
    findingsBySource: countBy(findings, "source"),
    analyzedAccounts: uniq(findings.map((f) => f.resource?.accountId)).length,
    analyzedRegions: (settings?.active_regions || []).length,
    partialRegionFailures: uniq(partialRegionFailures),
    sourceErrors,
  }

  return { summary, findings }
}

module.exports = {
  analyzeAwsCostLeaks,
  assignSeverity, // exported for fixture-testing
}
