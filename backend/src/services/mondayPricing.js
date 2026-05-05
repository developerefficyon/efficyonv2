/**
 * monday.com tier-guidance constants. USD/seat/mo (annual billing).
 *
 * The customer enters their actual per-seat cost in the connect form. These
 * constants power form hints, the dashboard pricing note, and the seat-tier
 * downgrade math. Update annually if monday changes pricing.
 *
 * monday.com bills seats in fixed tiers — not arbitrary counts. A customer on
 * a 10-seat plan pays for 10 seats even if only 7 are active. To recover
 * spend, drop to the next lower tier that still fits the active count.
 */

const TIER_GUIDANCE = {
  basic:      { usdPerSeatMonthly: 9 },
  standard:   { usdPerSeatMonthly: 12 },
  pro:        { usdPerSeatMonthly: 19 },
  enterprise: { usdPerSeatMonthly: null }, // custom
}

const SEAT_TIERS = [3, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 500, 1000]

/**
 * Given the current seat tier (max_users) and active member count, return the
 * next-lower tier that still fits the active count, or null if no downgrade
 * is possible (already at lowest tier, or active count exceeds all lower tiers).
 */
function nextLowerTier(currentTier, activeCount) {
  const idx = SEAT_TIERS.indexOf(Number(currentTier))
  if (idx <= 0) return null
  for (let i = idx - 1; i >= 0; i--) {
    if (SEAT_TIERS[i] >= activeCount) return SEAT_TIERS[i]
  }
  return null
}

const PRICING_NOTE =
  "Savings shown at the per-seat cost you entered. monday.com list prices: " +
  "Basic ~$9, Standard ~$12, Pro ~$19/seat/mo (annual). Seats bill in fixed " +
  "tiers (3/5/10/15/20/25/30/40/50/100/200/500/1000) — downgrading mid-tier " +
  "captures the next-step delta. Apply your negotiated discount for actual recovery."

module.exports = { TIER_GUIDANCE, SEAT_TIERS, nextLowerTier, PRICING_NOTE }
