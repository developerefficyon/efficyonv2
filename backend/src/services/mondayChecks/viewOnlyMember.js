/**
 * Check: view_only_member
 *
 * On Pro/Enterprise plans, view-only access can be granted to unlimited free
 * guests. Users marked is_view_only=true on a paid plan are paying member
 * rates but only need view access — convert to Guest to recover the seat.
 *
 * Skip on Basic/Standard (no free guest tier on those plans).
 */

const ELIGIBLE_PLANS = new Set(["pro", "enterprise"])

async function check({ users, account, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const planTier = (account?.plan?.tier || "").toLowerCase()
  if (!ELIGIBLE_PLANS.has(planTier)) return { findings: [] }

  const findings = []
  for (const u of users) {
    if (!u.isViewOnly) continue
    if (u.isGuest) continue
    if (!u.enabled) continue

    findings.push({
      check: "view_only_member",
      title: `View-only on paid plan: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id, `plan:${planTier}`],
      action: `User ${u.email || u.id} is view-only on a ${planTier} plan. Convert to Guest (Admin → Users → Change to Guest) — ${planTier} allows unlimited free guests with view-only access.`,
    })
  }

  return { findings }
}

module.exports = { check, ELIGIBLE_PLANS }
