/**
 * Stripe revenue-leak analysis aggregator.
 *
 * Fans out to the four V1 checks via Promise.allSettled, merges findings,
 * applies the standard severity ladder (≥$500 critical / ≥$100 high /
 * ≥$25 medium / >$0 low), and produces a summary suitable for cost_leak_analyses.
 */

const failedPaymentRecovery = require("./stripeChecks/failedPaymentRecovery")
const cardExpiryChurn = require("./stripeChecks/cardExpiryChurn")
const pastDueSubscriptions = require("./stripeChecks/pastDueSubscriptions")
const disputes = require("./stripeChecks/disputes")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25) return "medium"
  if (amount > 0) return "low"
  return null
}

async function analyzeStripeRevenueLeaks({ stripe, lookbackDays = 90 }) {
  const checks = [
    { name: "failed_payment_recovery", run: () => failedPaymentRecovery.check({ stripe, lookbackDays }) },
    { name: "card_expiry_churn",       run: () => cardExpiryChurn.check({ stripe }) },
    { name: "past_due_subscription",   run: () => pastDueSubscriptions.check({ stripe }) },
    { name: "disputes",                run: () => disputes.check({ stripe, lookbackDays }) },
  ]

  const settled = await Promise.allSettled(checks.map((c) => c.run()))

  const allFindings = []
  const warnings = []
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      for (const f of res.value.findings || []) {
        const sev = severityFor(f.potentialRecovery)
        if (!sev) continue
        allFindings.push({ ...f, severity: sev })
      }
    } else {
      warnings.push({ check: checks[i].name, error: res.reason?.message || String(res.reason) })
    }
  })

  // Sort by potentialRecovery desc
  allFindings.sort((a, b) => (b.potentialRecovery || 0) - (a.potentialRecovery || 0))

  // Severity counts
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let totalCurrentValue = 0
  let totalPotentialSavings = 0
  for (const f of allFindings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    totalCurrentValue += f.currentValue || 0
    totalPotentialSavings += f.potentialRecovery || 0
  }

  // Health score: 100 minus severity-weighted findings, floored at 0
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
    },
  }
}

module.exports = { analyzeStripeRevenueLeaks, severityFor }
