/**
 * Check 3 — Unused PermissionSetLicenses.
 *
 * Paid feature licenses (CPQ, Sales Cloud Einstein, etc.) attached to users who
 * haven't logged in within the inactivity window. Two output shapes:
 *   - Known paid PSLs (in salesforcePricing.PSL_PRICES): per-assignment finding
 *     priced at list.
 *   - Unknown PSLs: aggregated into a single low-severity finding listing the
 *     count and PSL names — flagged for manual review.
 */

const { resolvePSLPrice } = require("../salesforcePricing")

async function check({ executeSOQL, integration, inactivityDays }) {
  const cutoffMs = Date.now() - inactivityDays * 86400 * 1000
  const cutoffIso = new Date(cutoffMs).toISOString()

  const soql =
    "SELECT Id, AssigneeId, PermissionSetLicenseId, " +
    "PermissionSetLicense.MasterLabel, PermissionSetLicense.DeveloperName, " +
    "Assignee.Username, Assignee.LastLoginDate, Assignee.IsActive " +
    "FROM PermissionSetLicenseAssign " +
    "WHERE Assignee.IsActive = true " +
    `AND (Assignee.LastLoginDate < ${cutoffIso} OR Assignee.LastLoginDate = null)`
  const result = await executeSOQL(integration, soql)
  const rows = result.records || []

  const findings = []
  const unknownPSLs = new Map() // developerName -> { count, label }

  for (const row of rows) {
    const developerName = row.PermissionSetLicense?.DeveloperName
    const label = row.PermissionSetLicense?.MasterLabel || developerName || "Unknown PSL"
    const username = row.Assignee?.Username || row.AssigneeId
    const monthly = resolvePSLPrice(developerName)

    if (monthly == null) {
      // Unknown PSL — aggregate
      if (!unknownPSLs.has(developerName)) {
        unknownPSLs.set(developerName, { count: 0, label, evidence: [] })
      }
      const u = unknownPSLs.get(developerName)
      u.count += 1
      if (u.evidence.length < 5) u.evidence.push(row.Id)
    } else if (monthly > 0) {
      findings.push({
        check: "unused_psl",
        title: `Unused PermissionSetLicense: ${label} → ${username}`,
        currency: "USD",
        currentValue: monthly,
        potentialSavings: monthly,
        evidence: [row.Id, row.AssigneeId],
        action: `Remove the PermissionSetLicenseAssign — assignee inactive for ≥${inactivityDays} days.`,
      })
    }
    // monthly === 0 → don't surface (free PSL, no waste)
  }

  // Aggregate unknown PSLs into a single review-level finding
  if (unknownPSLs.size > 0) {
    const totalCount = Array.from(unknownPSLs.values()).reduce((acc, u) => acc + u.count, 0)
    const labels = Array.from(unknownPSLs.values()).map((u) => `${u.label} (${u.count})`).join(", ")
    findings.push({
      check: "unused_psl_unknown",
      title: `${totalCount} unused Permission Set Licenses (pricing not in catalog)`,
      currency: "USD",
      currentValue: 0,
      potentialSavings: 0.01, // tiny non-zero so the aggregator keeps it as low-severity
      evidence: Array.from(unknownPSLs.values()).flatMap((u) => u.evidence),
      action: `Review these PSLs in your Salesforce contract: ${labels}. Remove unused assignments to free seats.`,
    })
  }

  return { findings }
}

module.exports = { check }
