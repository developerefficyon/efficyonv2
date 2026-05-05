/**
 * Atlassian cost-leak analysis aggregator.
 *
 * Pulls org-directory users once, fans out to the three V1 checks via
 * Promise.allSettled, applies the standard severity ladder
 * (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low), and produces a
 * summary suitable for cost_leak_analyses storage.
 */

const inactiveJiraUser = require("./atlassianChecks/inactiveJiraUser")
const inactiveConfluenceUser = require("./atlassianChecks/inactiveConfluenceUser")
const singleProductDualSeat = require("./atlassianChecks/singleProductDualSeat")
const { PRICING_NOTE } = require("./atlassianPricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}

async function analyzeAtlassianCostLeaks({ listOrgDirectoryUsers, integration, inactivityDays = 60 }) {
  const settings = integration.settings || {}
  const orgId = settings.org_id
  if (!orgId) {
    return {
      findings: [],
      warnings: [{ check: "init", error: "org_id missing — re-validate the integration" }],
      summary: emptySummary(0, 0, 0),
    }
  }

  const users = await listOrgDirectoryUsers(integration, orgId)

  const checks = [
    { name: "inactive_jira_user",       run: () => inactiveJiraUser.check({ users, settings, inactivityDays }) },
    { name: "inactive_confluence_user", run: () => inactiveConfluenceUser.check({ users, settings, inactivityDays }) },
    { name: "single_product_dual_seat", run: () => singleProductDualSeat.check({ users, settings, inactivityDays }) },
  ]

  const settled = await Promise.allSettled(checks.map((c) => c.run()))

  const allFindings = []
  const warnings = []
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      for (const f of res.value.findings || []) {
        const sev = severityFor(f.potentialSavings)
        if (!sev) continue
        allFindings.push({ ...f, severity: sev })
      }
    } else {
      warnings.push({ check: checks[i].name, error: res.reason?.message || String(res.reason) })
    }
  })

  allFindings.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0))

  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let totalCurrentValue = 0
  let totalPotentialSavings = 0
  for (const f of allFindings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    totalCurrentValue += f.currentValue || 0
    totalPotentialSavings += f.potentialSavings || 0
  }

  const healthScore = Math.max(
    0,
    100 - (counts.critical * 15 + counts.high * 8 + counts.medium * 4 + counts.low * 1),
  )

  const jiraActive = users.filter((u) => u.accountStatus === "active" && u.products.jira).length
  const conflActive = users.filter((u) => u.accountStatus === "active" && u.products.confluence).length

  return {
    findings: allFindings,
    warnings,
    summary: {
      totalFindings: allFindings.length,
      totalCurrentValue: round2(totalCurrentValue),
      totalPotentialSavings: round2(totalPotentialSavings),
      healthScore,
      criticalSeverity: counts.critical,
      highSeverity: counts.high,
      mediumSeverity: counts.medium,
      lowSeverity: counts.low,
      pricingNote: PRICING_NOTE,
      jiraActiveUserCount: jiraActive,
      confluenceActiveUserCount: conflActive,
      totalUserCount: users.length,
      cloudSiteCount: (settings.cloud_sites || []).length,
    },
  }
}

function round2(x) { return Math.round(x * 100) / 100 }

function emptySummary(jiraActive, conflActive, totalUsers) {
  return {
    totalFindings: 0,
    totalCurrentValue: 0,
    totalPotentialSavings: 0,
    healthScore: 100,
    criticalSeverity: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    pricingNote: PRICING_NOTE,
    jiraActiveUserCount: jiraActive,
    confluenceActiveUserCount: conflActive,
    totalUserCount: totalUsers,
    cloudSiteCount: 0,
  }
}

module.exports = { analyzeAtlassianCostLeaks, severityFor }
