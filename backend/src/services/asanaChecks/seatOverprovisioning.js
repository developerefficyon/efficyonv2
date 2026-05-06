/**
 * Check: seat_overprovisioning (Asana)
 *
 * Asana bills per-seat (no fixed seat tiers). If the customer purchased N
 * seats but only M < N members are active+licensed, they can drop their
 * subscription to M seats and recover the delta on next renewal.
 *
 * The customer enters `subscribed_seats` on the connect form. Without it we
 * can't compute this leak (Asana's public API doesn't expose subscription
 * size).
 *
 * Returns at most one account-level finding.
 */

async function check({ users, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const subscribedSeats = Number(settings?.subscribed_seats) || 0

  if (!seatCost || !subscribedSeats) return { findings: [] }

  const activeCount = users.filter((u) => u.isActive && !u.isGuest).length
  const seatsFreed = subscribedSeats - activeCount
  if (seatsFreed <= 0) return { findings: [] }

  const annualSavings = seatsFreed * seatCost * 12

  return {
    findings: [
      {
        check: "seat_overprovisioning",
        title: `Asana seats overprovisioned: paying for ${subscribedSeats}, ${activeCount} active`,
        currency: "USD",
        currentValue: annualSavings,
        potentialSavings: annualSavings,
        evidence: [`subscribed:${subscribedSeats}`, `active:${activeCount}`],
        action: `Subscription billed at ${subscribedSeats} seats but only ${activeCount} active members. Reduce the seat count to ${activeCount} on next renewal (Admin Console → Billing) to save ${seatsFreed} seats × $${seatCost}/mo.`,
      },
    ],
  }
}

module.exports = { check }
