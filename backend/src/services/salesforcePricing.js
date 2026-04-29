/**
 * Salesforce list-price map. All values are USD/user/mo unless noted as per-org.
 *
 * NOTE: customers typically negotiate 30–70% discounts. The cost-leak summary
 * includes a `pricingNote` instructing them to apply their actual discount.
 * Update this file annually as Salesforce revises list prices.
 */

// Keyed by Profile.UserLicense.LicenseDefinitionKey (the more granular ID
// returned by SOQL than the human-readable MasterLabel).
const USER_LICENSE_PRICES = {
  // Sales Cloud / Service Cloud editions
  "SFDC":                 165, // Sales Cloud Enterprise (most common standard license)
  "SalesforceUnlimited":  330, // Sales Cloud Unlimited
  "SalesforcePerformance": 450, // Performance Edition
  "SalesforceProfessional": 80, // Sales Cloud Pro
  "SalesforceEssentials":  25, // Salesforce Essentials
  // Platform & specialty licenses
  "SalesforcePlatform":    25,
  "ExternalAppsPlus":       5,
  "Customer Community":     0, // free tier — flagged but not billed
  "ChatterFree":            0,
  "ChatterExternal":        0,
}

// Keyed by PermissionSetLicense.DeveloperName.
const PSL_PRICES = {
  "SalesforceCPQ":          75,
  "SalesCloudEinstein":     50,
  "SalesforceInbox":        25,
  "HighVelocitySalesUser":  75,
  "SalesEngagementUser":    75, // newer rebrand of HVS
  "FieldServiceLightning":  50,
  "FieldServiceMobileApp":  50,
  // PardotPlus is per-org not per-user — flagged separately in checks
}

// Resolves a User Licence to a per-month USD price. Unknown keys return 0.
function resolveUserLicensePrice(licenseDefinitionKey) {
  if (!licenseDefinitionKey) return 0
  return USER_LICENSE_PRICES[licenseDefinitionKey] || 0
}

// Resolves a PermissionSetLicense DeveloperName to a per-month USD price.
// Unknown keys return null (signals "aggregate into the unknown-PSL finding").
function resolvePSLPrice(developerName) {
  if (!developerName) return null
  return PSL_PRICES[developerName] != null ? PSL_PRICES[developerName] : null
}

const PRICING_NOTE =
  "Savings shown at Salesforce list price. Multiply by (1 − your_negotiated_discount) " +
  "for actual recovery. Typical Salesforce contracts have 30–70% discounts off list."

module.exports = {
  USER_LICENSE_PRICES,
  PSL_PRICES,
  resolveUserLicensePrice,
  resolvePSLPrice,
  PRICING_NOTE,
}
