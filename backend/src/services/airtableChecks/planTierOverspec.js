/**
 * Check: plan_tier_overspec (Airtable)
 *
 * Airtable's Business plan ($45/seat/mo) unlocks higher base/record limits and
 * advanced features (verified data, admin panel, custom branded forms). If the
 * customer's actual usage fits inside the Team tier ($20/seat/mo, 50 bases /
 * 50k records per base), they can downgrade and save the per-seat delta on
 * every billed seat.
 *
 * V1 heuristic: surface a downgrade opportunity when:
 *   - Current plan tier is Business (downgrade target = Team)
 *   - Detected base count is comfortably under the Team limit (≤30, leaving
 *     headroom for growth)
 *
 * The customer's per-seat cost is the canonical input — if they're paying
 * less than $45 due to a negotiated rate, the savings calculation uses
 * (current_seat_cost - team_list_price).
 */

const { TIER_GUIDANCE, DOWNGRADABLE_TIERS } = require("../airtablePricing")

const TEAM_HEADROOM_BASES = 30 // ≤ this leaves comfortable room before Team's 50-base ceiling

async function check({ workspace, settings, planTier }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  if (!seatCost) return { findings: [] }
  const tier = (planTier || "").toLowerCase()
  if (!DOWNGRADABLE_TIERS.has(tier)) return { findings: [] }

  const baseCount = Number(workspace?.baseCount) || 0
  if (baseCount === 0) return { findings: [] }
  if (baseCount > TEAM_HEADROOM_BASES) return { findings: [] }

  const subscribedSeats = Number(settings?.subscribed_seats) || 0
  if (!subscribedSeats) return { findings: [] }

  const teamPrice = Number(TIER_GUIDANCE.team?.usdPerSeatMonthly) || 0
  if (!teamPrice) return { findings: [] }
  const perSeatDelta = seatCost - teamPrice
  if (perSeatDelta <= 0) return { findings: [] }

  const annualSavings = perSeatDelta * subscribedSeats * 12

  return {
    findings: [
      {
        check: "plan_tier_overspec",
        title: `Airtable Business tier likely over-spec: ${baseCount} bases fits Team`,
        currency: "USD",
        currentValue: annualSavings,
        potentialSavings: annualSavings,
        evidence: [`tier:${tier}`, `bases:${baseCount}`, `subscribed:${subscribedSeats}`],
        action: `Workspace shows ${baseCount} bases — well within Team tier's 50-base limit. Downgrading from Business ($${seatCost}/seat) to Team ($${teamPrice}/seat) saves $${perSeatDelta}/seat/mo across ${subscribedSeats} seats. Verify Business-only features (verified data, admin panel, custom branded forms) aren't in active use, then downgrade in Workspace settings → Plan & billing.`,
      },
    ],
  }
}

module.exports = { check, TEAM_HEADROOM_BASES }
