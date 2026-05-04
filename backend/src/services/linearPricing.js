/**
 * Linear list-price map. Values are USD/user/mo (annual billing).
 *
 * Customers typically negotiate 10–20% on Plus and 30%+ on Enterprise.
 * The cost-leak summary's `pricingNote` instructs them to apply their
 * actual discount. Update annually.
 */

const PLAN_PRICES = {
  standard:   8,   // $8/user/mo (annual; $10 monthly)
  plus:      14,   // $14/user/mo (annual; $19 monthly)
  enterprise: 25,  // $25/user/mo default — highly negotiated
}

function resolvePlanPrice(planTier) {
  if (!planTier) return 0
  return PLAN_PRICES[planTier.toLowerCase()] || 0
}

const PRICING_NOTE =
  "Savings shown at Linear list price. Standard $8, Plus $14, Enterprise $25 (default — varies). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { PLAN_PRICES, resolvePlanPrice, PRICING_NOTE }
