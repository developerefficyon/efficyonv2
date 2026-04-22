/**
 * Zoom Cost-Leak aggregator.
 *
 * Same severity thresholds and summary shape as AWS/Azure.
 */

const { runUsageAnalysis } = require("./zoomUsageAnalysis")

function assignSeverity(savings) {
  if (savings >= 500) return "critical"
  if (savings >= 100) return "high"
  if (savings >= 25) return "medium"
  if (savings > 0) return "low"
  return null
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

async function analyzeZoomCostLeaks(accessToken, settings) {
  const planTier = settings?.plan_tier || "pro"
  const inactivityDays = settings?.inactivity_days || 30
  const result = await runUsageAnalysis(accessToken, planTier, inactivityDays)

  const findings = []
  for (const f of result.findings) {
    const severity = assignSeverity(Number(f.projectedSavings || 0))
    if (!severity) continue
    findings.push({ ...f, severity })
  }

  findings.sort((a, b) => Number(b.projectedSavings || 0) - Number(a.projectedSavings || 0))
  const totalPotentialSavings = findings.reduce((s, f) => s + Number(f.projectedSavings || 0), 0)

  const summary = {
    totalPotentialSavings: Number(totalPotentialSavings.toFixed(2)),
    currency: "USD",
    totalFindings: findings.length,
    findingsBySeverity: countBy(findings, "severity"),
    findingsBySource: countBy(findings, "source"),
    analyzedUsers: result.userCount,
    planTier,
    inactivityDays,
    sourceErrors: (result.errors || []).map((e) => ({ source: "zoom_usage", ...e })),
  }
  return { summary, findings }
}

module.exports = { analyzeZoomCostLeaks, assignSeverity }
