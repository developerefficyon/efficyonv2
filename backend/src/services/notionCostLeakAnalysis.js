/**
 * Notion cost-leak analysis aggregator.
 *
 * Pulls workspace users once, fans out to the three V1 checks via
 * Promise.allSettled (each check is pure — operates on the cached users array).
 * Applies the standard severity ladder and produces a summary suitable for
 * cost_leak_analyses storage.
 */

const botSeatsBilled = require("./notionChecks/botSeatsBilled")
const seatUtilizationGap = require("./notionChecks/seatUtilizationGap")
const notionAIOverprovisioning = require("./notionChecks/notionAIOverprovisioning")
const { PRICING_NOTE } = require("./notionPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeNotionCostLeaks({ listAllUsers, integration }) {
  const settings = integration.settings || {}
  const users = await listAllUsers(integration)

  const checks = [
    { name: "bot_seats_billed",          run: () => botSeatsBilled.check({ users, settings }) },
    { name: "seat_utilization_gap",      run: () => seatUtilizationGap.check({ users, settings }) },
    { name: "notion_ai_overprovisioning", run: () => notionAIOverprovisioning.check({ users, settings }) },
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

  allFindings.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0))

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
      memberCount: users.filter((u) => u.type === "person").length,
      botCount: users.filter((u) => u.type === "bot").length,
    },
  }
}

module.exports = { analyzeNotionCostLeaks, severityFor }
