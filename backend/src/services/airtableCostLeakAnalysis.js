/**
 * Airtable cost-leak analysis aggregator.
 *
 * Pulls workspace + connecting user via /meta/whoami and /meta/bases, then
 * fans out to the 4 V1 checks via Promise.allSettled. Applies the standard
 * severity ladder (≥$500 critical / ≥$100 high / ≥$25 medium / >$0 low) and
 * produces a summary suitable for cost_leak_analyses storage.
 *
 * Visibility caveat: Airtable's public OAuth API does not enumerate workspace
 * members without Enterprise SCIM scopes. The inactive-user and editor-
 * misclassified checks therefore skip on non-enterprise plans, and the
 * aggregator records a visibility-gap warning so downstream UI can explain
 * why those checks are quiet. The seat-overprovisioning and plan-tier-overspec
 * checks rely on customer-supplied seat data and produce findings without
 * member visibility.
 */

const inactiveUser = require("./airtableChecks/inactiveUser")
const seatOverprovisioning = require("./airtableChecks/seatOverprovisioning")
const planTierOverspec = require("./airtableChecks/planTierOverspec")
const editorMisclassified = require("./airtableChecks/editorMisclassified")
const { PRICING_NOTE } = require("./airtablePricing")

function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null
}

async function analyzeAirtableCostLeaks({
  fetchUsersAndWorkspace,
  integration,
  inactivityDays = 60,
}) {
  const settings = integration.settings || {}
  const planTier = (settings.plan_tier || "").toLowerCase() || null

  const { users, workspace } = await fetchUsersAndWorkspace(integration)

  const checks = [
    {
      name: "inactive_user",
      run: () => inactiveUser.check({ users, settings, planTier, inactivityDays }),
    },
    {
      name: "seat_overprovisioning",
      run: () => seatOverprovisioning.check({ users, settings }),
    },
    {
      name: "plan_tier_overspec",
      run: () => planTierOverspec.check({ workspace, settings, planTier }),
    },
    {
      name: "editor_misclassified",
      run: () => editorMisclassified.check({ users, settings, planTier }),
    },
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

  // Visibility-gap warning: without enterprise scopes the per-user checks
  // can't run. Surface this once at the top so the dashboard can explain.
  const onlyConnectingUserVisible = Array.isArray(users) && users.length <= 1
  if (planTier && planTier !== "free" && onlyConnectingUserVisible) {
    warnings.push({
      check: "_visibility",
      error:
        "Airtable's public API only exposes the connecting user without Enterprise SCIM scopes — inactive-user and editor-misclassified checks were skipped. Provide subscribed/active seat counts on the connect form to enable seat-based checks.",
    })
  }

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

  const totalUsers = users.length
  const subscribedSeats = Number(settings.subscribed_seats) || null
  const activeSeats = settings.active_seats == null || settings.active_seats === ""
    ? null
    : Number(settings.active_seats)

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
      totalUserCount: totalUsers,
      visibleUserCount: totalUsers,
      planTier,
      subscribedSeats,
      activeSeats,
      baseCount: workspace?.baseCount ?? null,
      workspaceName: workspace?.name || null,
      grantedScopes: Array.isArray(workspace?.grantedScopes) ? workspace.grantedScopes : null,
    },
  }
}

function round2(x) { return Math.round(x * 100) / 100 }

module.exports = { analyzeAirtableCostLeaks, severityFor }
