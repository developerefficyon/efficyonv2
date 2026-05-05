/**
 * Check: pending_invite
 *
 * Surface users with is_pending=true whose invite is older than 14 days.
 * monday.com reserves the seat the moment the invite is sent; if the user
 * never accepts, the seat remains tied up.
 */

const PENDING_THRESHOLD_DAYS = 14

async function check({ users, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const cutoff = Date.now() - PENDING_THRESHOLD_DAYS * 86400000

  const findings = []
  for (const u of users) {
    if (!u.isPending) continue
    if (!u.joinDate) continue // no invite-age signal
    const t = new Date(u.joinDate).getTime()
    if (Number.isNaN(t) || t > cutoff) continue

    const days = Math.max(0, Math.floor((Date.now() - t) / 86400000))

    findings.push({
      check: "pending_invite",
      title: `Pending invite holding a seat: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `Invite to ${u.email || u.id} has been pending for ${days} days, never accepted. Cancel the invite (Admin → Users → Pending invites) to free the seat.`,
    })
  }

  return { findings }
}

module.exports = { check, PENDING_THRESHOLD_DAYS }
