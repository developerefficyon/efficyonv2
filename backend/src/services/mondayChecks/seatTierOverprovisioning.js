/**
 * Check: seat_tier_overprovisioning
 *
 * monday.com bills seats in fixed tiers (3/5/10/15/20/25/30/40/50/100/200/500/
 * 1000). If active member count fits in a lower tier, the customer can drop
 * to that tier and recover the delta.
 *
 * Active count = enabled, non-pending, non-guest users.
 *
 * Returns at most one finding (account-level), severity decided by aggregator.
 */

const { nextLowerTier } = require("../mondayPricing")

async function check({ users, account, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const maxUsers = Number(account?.plan?.maxUsers) || 0

  if (!seatCost || !maxUsers) return { findings: [] }

  const activeCount = users.filter((u) => u.enabled && !u.isGuest && !u.isPending).length
  const lower = nextLowerTier(maxUsers, activeCount)
  if (!lower || lower >= maxUsers) return { findings: [] }

  const seatsFreed = maxUsers - lower
  const annualSavings = seatsFreed * seatCost * 12

  return {
    findings: [
      {
        check: "seat_tier_overprovisioning",
        title: `Seat tier overprovisioned: paying for ${maxUsers} seats, ${activeCount} active`,
        currency: "USD",
        currentValue: annualSavings,
        potentialSavings: annualSavings,
        evidence: [`tier:${maxUsers}`, `active:${activeCount}`, `recommended:${lower}`],
        action: `Plan billed at ${maxUsers} seats but only ${activeCount} active members. Drop to the ${lower}-seat tier (Admin → Billing) to save ${seatsFreed} seats × $${seatCost}/mo.`,
      },
    ],
  }
}

module.exports = { check }
