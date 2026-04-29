/**
 * Check 2 — Frozen-but-billed users.
 *
 * Salesforce admins can "freeze" a user (Setup → Users → Login Information)
 * which prevents login but does NOT release the license slot. Admins frequently
 * forget to follow up with full deactivation. This is the equivalent of Slack's
 * "deactivated but still billable" data-lag bug.
 *
 * Two-step query: get all frozen UserLogin rows, then look up which of those
 * users still have IsActive = true (i.e., still consume a license slot).
 */

const { resolveUserLicensePrice } = require("../salesforcePricing")

async function check({ executeSOQL, integration }) {
  // Step 1: get all frozen UserLogin rows
  const frozenSoql = "SELECT UserId FROM UserLogin WHERE IsFrozen = true"
  const frozen = await executeSOQL(integration, frozenSoql)
  const frozenIds = (frozen.records || []).map((r) => r.UserId).filter(Boolean)
  if (frozenIds.length === 0) return { findings: [] }

  // Step 2: look up which of those are still IsActive (consuming licenses)
  const idList = frozenIds.map((id) => `'${id}'`).join(",")
  const userSoql =
    "SELECT Id, Username, Name, " +
    "Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey " +
    `FROM User WHERE IsActive = true AND Id IN (${idList})`
  const users = await executeSOQL(integration, userSoql)

  const findings = []
  for (const u of users.records || []) {
    const sku = u.Profile?.UserLicense?.LicenseDefinitionKey
    const skuLabel = u.Profile?.UserLicense?.MasterLabel || "Unknown license"
    const monthly = resolveUserLicensePrice(sku)
    findings.push({
      check: "frozen_but_billed",
      title: `Frozen user still billed: ${u.Username} (${skuLabel})`,
      currency: "USD",
      currentValue: monthly,
      potentialSavings: monthly,
      evidence: [u.Id],
      action:
        "User is frozen (Setup → Users → Login Information) but still IsActive — deactivate to free the license slot.",
    })
  }
  return { findings }
}

module.exports = { check }
