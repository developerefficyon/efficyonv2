/**
 * Check: editor_misclassified (Airtable)
 *
 * On Team and above, Airtable includes free read-only and comment-only
 * collaborators. A user who's marked as Creator or Editor but only consumes
 * the data (never authors records or schema) could be downgraded to a free
 * read/comment role and the seat recaptured.
 *
 * V1 visibility limitation: without Enterprise SCIM scopes Airtable's public
 * API does not enumerate workspace collaborators or per-user roles. This
 * check therefore skips on non-Enterprise plans and the aggregator records a
 * visibility-gap warning.
 *
 * Future work (Enterprise expansion): pull collaborators via the enterprise
 * admin API, classify by role, surface editors whose recent activity is
 * comment/view-only.
 */

const { FREE_GUEST_PLANS } = require("../airtablePricing")

async function check({ users, settings, planTier }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  if (!seatCost) return { findings: [] }
  const tier = (planTier || "").toLowerCase()
  if (!FREE_GUEST_PLANS.has(tier)) return { findings: [] }

  // Need >1 visible user to even attempt classification.
  if (!Array.isArray(users) || users.length <= 1) return { findings: [] }

  const findings = []
  // Placeholder: enterprise SCIM expansion would populate findings here.
  return { findings }
}

module.exports = { check }
