/**
 * Check: single_product_dual_seat
 *
 * Surface users who hold BOTH Jira AND Confluence licenses but only used ONE
 * of the two products within the inactivity window. The unused product's seat
 * is the savings.
 *
 * Edge case: if BOTH products are unused, that user is already surfaced by
 * inactive_jira_user AND inactive_confluence_user — gate this check on
 * "exactly one of the two is active in window" so we don't double-count.
 */

function cutoffMs(inactivityDays) {
  return Date.now() - inactivityDays * 86400000
}

function isActiveWithinWindow(productEntry, cutoff) {
  if (!productEntry || !productEntry.lastActive) return false
  const t = new Date(productEntry.lastActive).getTime()
  if (Number.isNaN(t)) return false
  return t >= cutoff
}

async function check({ users, settings, inactivityDays }) {
  const jiraCost = Number(settings?.jira_seat_cost_usd) || 0
  const conflCost = Number(settings?.confluence_seat_cost_usd) || 0
  const cutoff = cutoffMs(inactivityDays)

  const findings = []
  for (const u of users) {
    if (u.accountStatus !== "active") continue
    if (!u.products.jira || !u.products.confluence) continue

    const jiraActive = isActiveWithinWindow(u.products.jira, cutoff)
    const conflActive = isActiveWithinWindow(u.products.confluence, cutoff)

    // Need exactly one active; XOR
    if (jiraActive === conflActive) continue

    const unusedProduct = jiraActive ? "Confluence" : "Jira"
    const usedProduct = jiraActive ? "Jira" : "Confluence"
    const unusedSeatCost = jiraActive ? conflCost : jiraCost
    const unusedGroup = jiraActive ? "confluence-users" : "jira-software-users"
    const unusedLast = jiraActive ? u.products.confluence.lastActive : u.products.jira.lastActive
    const days = unusedLast
      ? Math.max(0, Math.floor((Date.now() - new Date(unusedLast).getTime()) / 86400000))
      : null

    findings.push({
      check: "single_product_dual_seat",
      title: `Dual-seat overlap: ${u.email || u.name || u.accountId}`,
      currency: "USD",
      currentValue: unusedSeatCost,
      potentialSavings: unusedSeatCost,
      evidence: [u.accountId],
      action: days != null
        ? `User ${u.email || u.accountId} uses ${usedProduct} but hasn't touched ${unusedProduct} in ${days} days. Remove them from ${unusedGroup} — keep the ${usedProduct} license.`
        : `User ${u.email || u.accountId} uses ${usedProduct} but has never used ${unusedProduct}. Remove them from ${unusedGroup} — keep the ${usedProduct} license.`,
    })
  }

  return { findings }
}

module.exports = { check }
