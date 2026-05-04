/**
 * Check: inactive_confluence_user
 *
 * Surface users who have Confluence product access but haven't used it in
 * `inactivityDays` days. Mirror of inactive_jira_user, different product +
 * different seat cost.
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isInactive(productEntry, cutoff) {
  if (!productEntry) return false
  if (!productEntry.lastActive) return true
  const t = new Date(productEntry.lastActive).getTime()
  if (Number.isNaN(t)) return true
  return t < cutoff
}

async function check({ users, settings, inactivityDays }) {
  const seatCost = Number(settings?.confluence_seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (u.accountStatus !== "active") continue
    if (!u.products.confluence) continue
    if (!isInactive(u.products.confluence, cutoff)) continue

    const last = u.products.confluence.lastActive
    const days = last
      ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / 86400000))
      : null

    findings.push({
      check: "inactive_confluence_user",
      title: `Inactive Confluence user: ${u.email || u.name || u.accountId}`,
      currency: "USD",
      currentValue: seatCost,
      potentialSavings: seatCost,
      evidence: [u.accountId],
      action: last
        ? `User ${u.email || u.accountId} hasn't used Confluence in ${days} days. Remove from confluence-users group to free the seat.`
        : `User ${u.email || u.accountId} has never logged into Confluence. Remove from confluence-users group to free the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
