/**
 * Check: seat_overprovisioning (Airtable)
 *
 * Airtable bills per-seat. If the customer purchased N seats but only M < N
 * are actually being used, they can drop their seat count to M on next renewal
 * and recover the delta.
 *
 * Inputs:
 *   - settings.subscribed_seats — total seats on the customer's subscription
 *   - settings.active_seats     — customer-reported active seats (optional)
 *
 * Without Enterprise SCIM visibility we cannot verify active seats from the
 * API; we trust the customer's number when provided. If `active_seats` is
 * absent we conservatively skip (avoids false positives based on the
 * 1-user "/meta/whoami" view alone).
 */

async function check({ settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const subscribedSeats = Number(settings?.subscribed_seats) || 0
  const activeSeatsRaw = settings?.active_seats
  const activeSeats = activeSeatsRaw == null || activeSeatsRaw === "" ? null : Number(activeSeatsRaw)

  if (!seatCost || !subscribedSeats) return { findings: [] }
  if (activeSeats == null || Number.isNaN(activeSeats)) return { findings: [] }

  const seatsFreed = subscribedSeats - activeSeats
  if (seatsFreed <= 0) return { findings: [] }

  const annualSavings = seatsFreed * seatCost * 12

  return {
    findings: [
      {
        check: "seat_overprovisioning",
        title: `Airtable seats overprovisioned: paying for ${subscribedSeats}, ${activeSeats} active`,
        currency: "USD",
        currentValue: annualSavings,
        potentialSavings: annualSavings,
        evidence: [`subscribed:${subscribedSeats}`, `active:${activeSeats}`],
        action: `Subscription billed at ${subscribedSeats} seats but only ${activeSeats} active users. Reduce the seat count to ${activeSeats} on next renewal (Airtable → Workspace settings → Plan & billing) to save ${seatsFreed} seats × $${seatCost}/mo.`,
      },
    ],
  }
}

module.exports = { check }
