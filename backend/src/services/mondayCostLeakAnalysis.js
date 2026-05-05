/**
 * monday.com cost-leak analysis aggregator.
 *
 * Pulls users + account/plan once, fans out to the 5 V1 checks via
 * Promise.allSettled, applies the standard severity ladder
 * (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and produces a
 * summary suitable for cost_leak_analyses storage.
 */

const inactiveUser = require("./mondayChecks/inactiveUser")
const seatTierOverprovisioning = require("./mondayChecks/seatTierOverprovisioning")
const disabledUser = require("./mondayChecks/disabledUser")
const pendingInvite = require("./mondayChecks/pendingInvite")
const viewOnlyMember = require("./mondayChecks/viewOnlyMember")
const { PRICING_NOTE, nextLowerTier } = require("./mondayPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}

async function analyzeMondayCostLeaks({ fetchUsersAndPlan, integration, inactivityDays = 60 }) {
  const settings = integration.settings || {}
  const { users, account } = await fetchUsersAndPlan(integration)

  const checks = [
    { name: "inactive_user",              run: () => inactiveUser.check({ users, settings, inactivityDays }) },
    { name: "seat_tier_overprovisioning", run: () => seatTierOverprovisioning.check({ users, account, settings }) },
    { name: "disabled_user",              run: () => disabledUser.check({ users, settings }) },
    { name: "pending_invite",             run: () => pendingInvite.check({ users, settings }) },
    { name: "view_only_member",           run: () => viewOnlyMember.check({ users, account, settings }) },
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

  const totalUsers = users.length
  const activeCount = users.filter((u) => u.enabled && !u.isGuest && !u.isPending).length
  const pendingCount = users.filter((u) => u.isPending).length
  const planTier = account?.plan?.tier || null
  const seatTier = account?.plan?.maxUsers || null
  const recommendedSeatTier = seatTier ? (nextLowerTier(seatTier, activeCount) ?? seatTier) : null

  return {
    findings: allFindings,
    warnings,
    summary: {
      totalFindings: allFindings.length,
      totalCurrentValue: round2(totalCurrentValue),
      totalPotentialSavings: round2(totalPotentialSavings),
      healthScore,
      criticalSeverity: counts.critical,
      highSeverity: counts.high,
      mediumSeverity: counts.medium,
      lowSeverity: counts.low,
      pricingNote: PRICING_NOTE,
      totalUserCount: totalUsers,
      activeUserCount: activeCount,
      pendingInviteCount: pendingCount,
      planTier,
      seatTier,
      recommendedSeatTier,
    },
  }
}

function round2(x) { return Math.round(x * 100) / 100 }

module.exports = { analyzeMondayCostLeaks, severityFor }
