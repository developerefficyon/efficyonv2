/**
 * Asana tier-guidance constants. USD/seat/mo (annual billing).
 *
 * The customer enters their actual per-seat cost in the connect form. These
 * constants power form hints, the dashboard pricing note, and the savings
 * estimate math. Update annually if Asana changes pricing.
 *
 * Asana bills per-seat (no fixed seat tiers like monday.com). Recovery comes
 * from removing inactive/deactivated users and converting misclassified full
 * members to guests (free on Advanced+ plans).
 */

const TIER_GUIDANCE = {
  free:       { usdPerSeatMonthly: 0 },
  starter:    { usdPerSeatMonthly: 10.99 },
  advanced:   { usdPerSeatMonthly: 24.99 },
  enterprise: { usdPerSeatMonthly: null }, // custom
  "enterprise+": { usdPerSeatMonthly: null }, // custom
}

// Asana paid plans require a 2-seat minimum on Starter/Advanced.
const MIN_PAID_SEATS = 2

// Plans where guests are free. On these plans, surfacing misclassified guests
// (users marked as full members but who really need only guest access) is a
// recoverable leak.
const FREE_GUEST_PLANS = new Set(["starter", "advanced", "enterprise", "enterprise+"])

const PRICING_NOTE =
  "Savings shown at the per-seat cost you entered. Asana list prices: " +
  "Starter ~$10.99, Advanced ~$24.99/seat/mo (annual). Asana bills per-seat " +
  "with a 2-seat minimum on paid plans. Guests are free on Starter and above " +
  "— converting misclassified full members to guests recaptures the full " +
  "per-seat cost. Apply your negotiated discount for actual recovery."

module.exports = { TIER_GUIDANCE, MIN_PAID_SEATS, FREE_GUEST_PLANS, PRICING_NOTE }
