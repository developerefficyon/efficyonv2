/**
 * GitHub Cost-Leak aggregator.
 *
 * Same severity thresholds (500/100/25/0 USD/month) and summary shape as
 * Zoom/AWS/Azure. Mirrors the pattern: run the usage service, filter zero-
 * savings, assign severity, sort desc, roll up a summary. Strips source
 * errors are returned for client visibility but caller is expected to strip
 * before persistence.
 */

const { runUsageAnalysis } = require("./githubUsageAnalysis")

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

async function analyzeGitHubCostLeaks(accessToken, settings) {
  const result = await runUsageAnalysis(accessToken, settings)

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
    analyzedOrg: result.org,
    memberCount: result.memberCount,
    copilotSeatCount: result.seatCount,
    planTier: settings?.plan_tier || "team",
    copilotTier: settings?.copilot_tier || "business",
    sourceErrors: (result.errors || []).map((e) => ({ source: "github_usage", ...e })),
  }
  return { summary, findings }
}

module.exports = { analyzeGitHubCostLeaks, assignSeverity }
