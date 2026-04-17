/**
 * Slack Pricing Utility
 * Based on official Slack pricing (annual-billing rates in USD/month).
 * Source: https://slack.com/pricing (as of 2026-04).
 * `team.info.plan` returns short codes: 'free', 'std' (Pro), 'plus' (Business+), 'compass' (Enterprise Grid).
 */

const SLACK_PLAN_RATES = {
  free:     { perSeat: 0,     label: "Free",                billable: false, supported: true  },
  standard: { perSeat: 8.75,  label: "Pro (annual)",        billable: true,  supported: true  }, // "std"
  plus:     { perSeat: 15.00, label: "Business+ (annual)",  billable: true,  supported: true  },
  compass:  { perSeat: null,  label: "Enterprise Grid",     billable: true,  supported: false }, // v1 unsupported
}

// Slack's team.info returns "std" not "standard"; map both.
const PLAN_ALIASES = {
  std: "standard",
  standard: "standard",
  plus: "plus",
  free: "free",
  compass: "compass",
}

function normalizePlanKey(rawPlan) {
  if (!rawPlan) return null
  const lower = String(rawPlan).toLowerCase()
  return PLAN_ALIASES[lower] || null
}

function getPerSeatCost(planKey) {
  const normalized = normalizePlanKey(planKey)
  if (!normalized) return 0
  const plan = SLACK_PLAN_RATES[normalized]
  return plan && typeof plan.perSeat === "number" ? plan.perSeat : 0
}

function calculatePotentialSavings(inactiveCount, planKey) {
  const normalized = normalizePlanKey(planKey)
  if (!normalized) return null
  const plan = SLACK_PLAN_RATES[normalized]
  if (!plan || !plan.supported || !plan.billable) return null
  if (!inactiveCount || inactiveCount <= 0) return 0
  return inactiveCount * plan.perSeat
}

function getPricingDisplayInfo(planKey, billableSeats = 0) {
  const normalized = normalizePlanKey(planKey) || "free"
  const plan = SLACK_PLAN_RATES[normalized] || SLACK_PLAN_RATES.free
  const perSeat = plan.perSeat || 0
  return {
    planKey: normalized,
    label: plan.label,
    perSeat,
    monthlyCost: perSeat * (billableSeats || 0),
    billable: plan.billable,
    supported: plan.supported,
  }
}

module.exports = {
  SLACK_PLAN_RATES,
  normalizePlanKey,
  getPerSeatCost,
  calculatePotentialSavings,
  getPricingDisplayInfo,
}
