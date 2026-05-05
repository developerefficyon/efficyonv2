/**
 * Check: inactive_jira_user
 *
 * Surface users who have Jira Software product access but haven't used it in
 * `inactivityDays` days. The aggregate $-total drives the headline; per-user
 * findings are typically `low` severity (single seat ~$7.75–$15.25).
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
  const seatCost = Number(settings?.jira_seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (u.accountStatus !== "active") continue
    if (!u.products.jira) continue
    if (!isInactive(u.products.jira, cutoff)) continue

    const last = u.products.jira.lastActive
    const days = last
      ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / 86400000))
      : null

    findings.push({
      check: "inactive_jira_user",
      title: `Inactive Jira user: ${u.email || u.name || u.accountId}`,
      currency: "USD",
      currentValue: seatCost,
      potentialSavings: seatCost,
      evidence: [u.accountId],
      action: last
        ? `User ${u.email || u.accountId} hasn't used Jira in ${days} days. Remove from jira-software-users group (admin.atlassian.com → Groups) to free the seat.`
        : `User ${u.email || u.accountId} has never logged into Jira. Remove from jira-software-users group to free the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
