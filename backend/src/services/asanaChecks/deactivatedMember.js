/**
 * Check: deactivated_member (Asana)
 *
 * Surface workspace memberships with is_active=false that still appear in the
 * directory. Asana usually fully removes deactivated users, so a stale
 * is_active=false record indicates either:
 *   - A guest who was removed from the org but kept on the workspace, or
 *   - A member that the admin deactivated but didn't fully deprovision.
 *
 * Whether they still count toward the subscribed seat count depends on
 * billing state — surface as medium-confidence and ask the admin to verify.
 */

async function check({ users, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  if (!seatCost) return { findings: [] }

  const findings = []
  for (const u of users) {
    if (u.isActive) continue
    if (u.isGuest) continue

    findings.push({
      check: "deactivated_member",
      title: `Deactivated member still in workspace: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `User ${u.email || u.id} is deactivated but still listed in the workspace. Verify in Admin Console → Billing whether they're counted toward your subscribed seats; if yes, fully deprovision (Admin → Members → Remove) to recover the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
