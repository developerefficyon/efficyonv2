/**
 * Shared helpers for the four Stripe check modules.
 */

/**
 * Normalize a Stripe Price to a per-month integer-cents amount.
 * Returns 0 if the price isn't recurring or required fields are missing.
 */
function monthlyAmount(price) {
  if (!price?.unit_amount || !price?.recurring?.interval) return 0
  const interval = price.recurring.interval
  const count = price.recurring.interval_count || 1
  const cents = price.unit_amount
  if (interval === "month") return cents / count
  if (interval === "year") return cents / (12 * count)
  if (interval === "week") return (cents * 4.33) / count
  if (interval === "day") return (cents * 30) / count
  return 0
}

module.exports = { monthlyAmount }
