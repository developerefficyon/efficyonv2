/**
 * Check: inactive_user
 *
 * Surface paid members who haven't logged in for `inactivityDays` days.
 * Excludes guests (free), pending invites (handled by pending_invite check),
 * and disabled users (handled by disabled_user check).
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isInactive(lastActivityIso, cutoff) {
  if (!lastActivityIso) return false // never-logged-in handled by pending_invite
  const t = new Date(lastActivityIso).getTime()
  if (Number.isNaN(t)) return false
  return t < cutoff
}

async function check({ users, settings, inactivityDays }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (!u.enabled) continue
    if (u.isPending) continue
    if (u.isGuest) continue
    if (!isInactive(u.lastActivity, cutoff)) continue

    const days = Math.max(0, Math.floor((Date.now() - new Date(u.lastActivity).getTime()) / 86400000))

    findings.push({
      check: "inactive_user",
      title: `Inactive monday.com user: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `User ${u.email || u.id} hasn't logged into monday.com in ${days} days. Deactivate via Admin → Users to free the seat (and re-evaluate seat tier — see seat_tier_overprovisioning).`,
    })
  }

  return { findings }
}

module.exports = { check }
