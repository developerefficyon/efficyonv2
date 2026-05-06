/**
 * Asana cost-leak analysis aggregator.
 *
 * Pulls workspace + members once, then fans out to the 4 V1 checks via
 * Promise.allSettled. Applies the standard severity ladder
 * (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low) and produces a
 * summary suitable for cost_leak_analyses storage.
 *
 * Note: inactiveUser uses per-user task lookups, so it's the slow check.
 * Other checks are O(N) over the already-fetched member list.
 */

const inactiveUser = require("./asanaChecks/inactiveUser")
const seatOverprovisioning = require("./asanaChecks/seatOverprovisioning")
const deactivatedMember = require("./asanaChecks/deactivatedMember")
const guestMisclassified = require("./asanaChecks/guestMisclassified")
const { PRICING_NOTE } = require("./asanaPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}

async function analyzeAsanaCostLeaks({
  fetchUsersAndWorkspace,
  fetchUserLastActivity,
  integration,
  inactivityDays = 60,
}) {
  const settings = integration.settings || {}
  const planTier = (settings.plan_tier || "").toLowerCase() || null

  const { users, workspace } = await fetchUsersAndWorkspace(integration)

  const checks = [
    {
      name: "inactive_user",
      run: () =>
        inactiveUser.check({
          users,
          workspace,
          settings,
          inactivityDays,
          fetchUserLastActivity,
          integration,
          planTier,
        }),
    },
    {
      name: "seat_overprovisioning",
      run: () => seatOverprovisioning.check({ users, settings }),
    },
    {
      name: "deactivated_member",
      run: () => deactivatedMember.check({ users, settings }),
    },
    {
      name: "guest_misclassified",
      run: () => guestMisclassified.check({ users, workspace, settings, planTier }),
    },
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
  const activeCount = users.filter((u) => u.isActive && !u.isGuest).length
  const guestCount = users.filter((u) => u.isGuest).length
  const deactivatedCount = users.filter((u) => !u.isActive).length
  const subscribedSeats = Number(settings.subscribed_seats) || null

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
      guestCount,
      deactivatedCount,
      planTier,
      subscribedSeats,
      workspaceGid: workspace?.gid || null,
      workspaceName: workspace?.name || null,
    },
  }
}

function round2(x) { return Math.round(x * 100) / 100 }

module.exports = { analyzeAsanaCostLeaks, severityFor }
