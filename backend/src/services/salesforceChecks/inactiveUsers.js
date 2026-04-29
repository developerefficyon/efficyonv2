/**
 * Check 1 — Inactive licensed users.
 *
 * Pulls active Standard users whose LastLoginDate is older than the threshold
 * (or null = never logged in). Each becomes a finding priced from the user's
 * UserLicense via salesforcePricing.
 */

const { resolveUserLicensePrice } = require("../salesforcePricing")

async function check({ executeSOQL, integration, inactivityDays }) {
  const cutoffMs = Date.now() - inactivityDays * 86400 * 1000
  const cutoffIso = new Date(cutoffMs).toISOString()

  const soql =
    "SELECT Id, Username, Name, LastLoginDate, " +
    "Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey " +
    "FROM User " +
    "WHERE IsActive = true AND UserType = 'Standard' " +
    `AND (LastLoginDate < ${cutoffIso} OR LastLoginDate = null)`
  const result = await executeSOQL(integration, soql)
  const users = result.records || []

  const findings = []
  for (const u of users) {
    const sku = u.Profile?.UserLicense?.LicenseDefinitionKey
    const skuLabel = u.Profile?.UserLicense?.MasterLabel || "Unknown license"
    const monthly = resolveUserLicensePrice(sku)
    const daysSince = u.LastLoginDate
      ? Math.floor((Date.now() - new Date(u.LastLoginDate).getTime()) / 86400000)
      : null
    const sinceLabel = daysSince === null ? "never logged in" : `last login ${daysSince} days ago`

    findings.push({
      check: "inactive_user",
      title: `Inactive user: ${u.Username} (${skuLabel})`,
      currency: "USD",
      currentValue: monthly,
      potentialSavings: monthly,
      evidence: [u.Id],
      action:
        monthly > 0
          ? `Deactivate the user (Setup → Users) or downgrade their license — ${sinceLabel}.`
          : `Deactivate the user (Setup → Users) — ${sinceLabel}. License pricing not in catalog; verify in your Salesforce contract.`,
    })
  }
  return { findings }
}

module.exports = { check }
