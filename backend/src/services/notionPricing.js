/**
 * Notion list-price map. All values are USD/user/mo.
 *
 * Customers typically negotiate 10–30% discounts on Business and 30–50% on
 * Enterprise. The cost-leak summary includes a `pricingNote` instructing them
 * to apply their actual discount. Update annually.
 */

const PLAN_PRICES = {
  free: 0,
  plus: 10,        // $10/seat/mo (annual; $12 monthly)
  business: 18,    // $18/seat/mo (annual; $24 monthly)
  enterprise: 25,  // $25/seat/mo default — highly negotiated, range $20–30+
}

const NOTION_AI_PRICE = 10 // $10/seat/mo add-on, applies to any plan

function resolvePlanPrice(planTier) {
  if (!planTier) return 0
  return PLAN_PRICES[planTier.toLowerCase()] || 0
}

const PRICING_NOTE =
  "Savings shown at Notion list price. Plus $10, Business $18, Enterprise $25 (default — varies). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { PLAN_PRICES, NOTION_AI_PRICE, resolvePlanPrice, PRICING_NOTE }
