/**
 * Azure Cost-Leak Analysis aggregator.
 *
 * Takes Advisor findings, assigns severity by USD savings thresholds,
 * drops zero-savings findings, sorts by savings desc, rolls up summary.
 * Mirrors the AWS aggregator's shape so the frontend + history path treat
 * all providers uniformly.
 */

const { runAdvisorAnalysis } = require("./azureAdvisorAnalysis")

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

function uniq(arr) {
  return Array.from(new Set(arr.filter((x) => x != null)))
}

async function analyzeAzureCostLeaks(accessToken, settings) {
  const subscriptions = Array.isArray(settings?.active_subscriptions) ? settings.active_subscriptions : []
  const result = await runAdvisorAnalysis(accessToken, subscriptions)

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
    analyzedAccounts: Math.max(
      uniq(findings.map((f) => f.resource?.accountId)).length,
      findings.length > 0 ? 1 : 0,
    ),
    analyzedSubscriptions: subscriptions.length,
    sourceErrors: (result.errors || []).map((e) => ({ source: "azure_advisor", ...e })),
  }

  return { summary, findings }
}

module.exports = { analyzeAzureCostLeaks, assignSeverity }
