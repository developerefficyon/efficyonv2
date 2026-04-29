/**
 * Salesforce cost-leak analysis aggregator.
 *
 * Fans out to the three V1 checks via Promise.allSettled, applies the standard
 * severity ladder (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and
 * produces a summary suitable for cost_leak_analyses storage.
 */

const inactiveUsers = require("./salesforceChecks/inactiveUsers")
const frozenButBilled = require("./salesforceChecks/frozenButBilled")
const unusedPSLs = require("./salesforceChecks/unusedPermissionSetLicenses")
const { PRICING_NOTE } = require("./salesforcePricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeSalesforceCostLeaks({ executeSOQL, integration, inactivityDays = 60 }) {
  const checks = [
    { name: "inactive_user",     run: () => inactiveUsers.check({ executeSOQL, integration, inactivityDays }) },
    { name: "frozen_but_billed", run: () => frozenButBilled.check({ executeSOQL, integration }) },
    { name: "unused_psl",        run: () => unusedPSLs.check({ executeSOQL, integration, inactivityDays }) },
  ]

  const settled = await Promise.allSettled(checks.map((c) => c.run()))

  const allFindings = []
  const warnings = []
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      for (const f of res.value.findings || []) {
        const sev = severityFor(f.potentialSavings)
        if (!sev) continue
        allFindings.push({ ...f, severity: sev })
      }
    } else {
      warnings.push({ check: checks[i].name, error: res.reason?.message || String(res.reason) })
    }
  })

  // Sort by potentialSavings desc
  allFindings.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0))

  // Severity counts
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let totalCurrentValue = 0
  let totalPotentialSavings = 0
  for (const f of allFindings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    totalCurrentValue += f.currentValue || 0
    totalPotentialSavings += f.potentialSavings || 0
  }

  const healthScore = Math.max(
    0,
    100 - (counts.critical * 15 + counts.high * 8 + counts.medium * 4 + counts.low * 1),
  )

  return {
    findings: allFindings,
    warnings,
    summary: {
      totalFindings: allFindings.length,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
      healthScore,
      criticalSeverity: counts.critical,
      highSeverity: counts.high,
      mediumSeverity: counts.medium,
      lowSeverity: counts.low,
      pricingNote: PRICING_NOTE,
    },
  }
}

module.exports = { analyzeSalesforceCostLeaks, severityFor }
