/**
 * Check 2 — Seat-utilization gap.
 *
 * Customer enters their total paid seats at connect time. We compare against
 * the actual person count from /v1/users. Any positive gap = unused capacity.
 */

const { resolvePlanPrice } = require("../notionPricing")

async function check({ users, settings }) {
  const planTier = settings?.plan_tier
  const planPrice = resolvePlanPrice(planTier)
  const totalSeats = parseInt(settings?.total_seats, 10) || 0

  if (planPrice === 0 || totalSeats === 0) return { findings: [] }

  const persons = (users || []).filter((u) => u.type === "person")
  const personCount = persons.length
  const gap = totalSeats - personCount

  if (gap <= 0) return { findings: [] }

  const monthlySavings = gap * planPrice
  return {
    findings: [
      {
        check: "seat_utilization_gap",
        title: `${gap} unused seat${gap === 1 ? "" : "s"} on the ${planTier} plan`,
        currency: "USD",
        currentValue: monthlySavings,
        potentialSavings: monthlySavings,
        evidence: [],
        action: `You purchased ${totalSeats} seats but only ${personCount} humans are in the workspace. Reduce seat count to ${personCount} to save $${monthlySavings}/mo.`,
      },
    ],
  }
}

module.exports = { check }
