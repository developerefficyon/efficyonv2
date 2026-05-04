/**
 * Check 1 (V1's only check) — Inactive billable Linear users.
 *
 * Filters workspace users to those marked active (= billable in Linear's
 * pricing model) but with no recent activity. One finding per user, priced
 * at the customer's plan tier.
 */

const { resolvePlanPrice } = require("../linearPricing")

async function check({ users, settings, inactivityDays }) {
  const planTier = settings?.plan_tier
  const planPrice = resolvePlanPrice(planTier)
  if (planPrice === 0) return { findings: [] }

  const cutoffMs = Date.now() - inactivityDays * 86400 * 1000

  const findings = []
  for (const u of users || []) {
    if (!u.active) continue
    const lastSeenMs = u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : null
    const isInactive = lastSeenMs === null || lastSeenMs < cutoffMs
    if (!isInactive) continue

    const daysSince = lastSeenMs === null
      ? null
      : Math.floor((Date.now() - lastSeenMs) / 86400000)
    const sinceLabel = daysSince === null ? "never logged in" : `last seen ${daysSince} days ago`

    findings.push({
      check: "inactive_user",
      title: `Inactive Linear user: ${u.email || u.displayName || u.name || u.id}`,
      currency: "USD",
      currentValue: planPrice,
      potentialSavings: planPrice,
      evidence: [u.id],
      action: `User ${u.email || u.displayName || u.name || u.id} hasn't logged into Linear (${sinceLabel}). Set them to inactive in Settings → Members to free the seat at $${planPrice}/mo.`,
    })
  }
  return { findings }
}

module.exports = { check }
