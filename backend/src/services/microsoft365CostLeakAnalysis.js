/**
 * Microsoft 365 Cost Leak Analysis Service
 * Analyzes Microsoft 365 license and usage data to identify cost optimization opportunities
 */

// Microsoft 365 License SKU IDs and their monthly costs (USD)
const M365_LICENSE_COSTS = {
  // Enterprise Plans
  'ENTERPRISEPACK': { name: 'Office 365 E3', cost: 23, tier: 'E3' },
  'ENTERPRISEPREMIUM': { name: 'Office 365 E5', cost: 38, tier: 'E5' },
  'ENTERPRISEPREMIUM_NOPSTNCONF': { name: 'Office 365 E5 (no PSTN)', cost: 35, tier: 'E5' },
  'STANDARDPACK': { name: 'Office 365 E1', cost: 10, tier: 'E1' },

  // Microsoft 365 Plans
  'SPE_E3': { name: 'Microsoft 365 E3', cost: 36, tier: 'E3' },
  'SPE_E5': { name: 'Microsoft 365 E5', cost: 57, tier: 'E5' },
  'SPE_F1': { name: 'Microsoft 365 F1', cost: 2.25, tier: 'F1' },
  'M365_F1': { name: 'Microsoft 365 F1', cost: 2.25, tier: 'F1' },

  // Business Plans
  'O365_BUSINESS_ESSENTIALS': { name: 'Microsoft 365 Business Basic', cost: 6, tier: 'Basic' },
  'O365_BUSINESS_PREMIUM': { name: 'Microsoft 365 Business Standard', cost: 12.50, tier: 'Standard' },
  'SMB_BUSINESS_PREMIUM': { name: 'Microsoft 365 Business Premium', cost: 22, tier: 'Premium' },
  'BUSINESS_BASIC': { name: 'Microsoft 365 Business Basic', cost: 6, tier: 'Basic' },
  'BUSINESS_STANDARD': { name: 'Microsoft 365 Business Standard', cost: 12.50, tier: 'Standard' },
  'BUSINESS_PREMIUM': { name: 'Microsoft 365 Business Premium', cost: 22, tier: 'Premium' },

  // Exchange Online
  'EXCHANGESTANDARD': { name: 'Exchange Online Plan 1', cost: 4, tier: 'Exchange' },
  'EXCHANGEENTERPRISE': { name: 'Exchange Online Plan 2', cost: 8, tier: 'Exchange' },
  'EXCHANGE_S_ESSENTIALS': { name: 'Exchange Online Essentials', cost: 2, tier: 'Exchange' },

  // Add-ons
  'PROJECTPROFESSIONAL': { name: 'Project Plan 3', cost: 30, tier: 'Addon' },
  'PROJECTPREMIUM': { name: 'Project Plan 5', cost: 55, tier: 'Addon' },
  'VISIOCLIENT': { name: 'Visio Plan 2', cost: 15, tier: 'Addon' },
  'VISIO_PLAN1_DEPT': { name: 'Visio Plan 1', cost: 5, tier: 'Addon' },
  'MCOEV': { name: 'Phone System', cost: 8, tier: 'Addon' },
  'MCOPSTN1': { name: 'Domestic Calling Plan', cost: 12, tier: 'Addon' },
  'MCOPSTN2': { name: 'International Calling Plan', cost: 24, tier: 'Addon' },
  'MCOMEETADV': { name: 'Audio Conferencing', cost: 4, tier: 'Addon' },
  'POWER_BI_PRO': { name: 'Power BI Pro', cost: 10, tier: 'Addon' },
  'POWER_BI_PREMIUM_P1': { name: 'Power BI Premium P1', cost: 20, tier: 'Addon' },

  // Teams
  'TEAMS_EXPLORATORY': { name: 'Microsoft Teams Exploratory', cost: 0, tier: 'Free' },
  'TEAMS_FREE': { name: 'Microsoft Teams Free', cost: 0, tier: 'Free' },
}

// Downgrade recommendations based on license tier
const DOWNGRADE_RECOMMENDATIONS = {
  'E5': { to: 'E3', savings: 19, reason: 'User only needs basic productivity features' },
  'E3': { to: 'E1', savings: 13, reason: 'User only needs email and basic Office Online' },
  'Premium': { to: 'Standard', savings: 9.50, reason: 'User does not need advanced security features' },
  'Standard': { to: 'Basic', savings: 6.50, reason: 'User only needs email and Teams' },
}

/**
 * Analyze inactive licenses
 * Users with licenses but no sign-in activity in specified days
 */
function analyzeInactiveLicenses(users, daysThreshold = 30) {
  const findings = []
  const now = new Date()

  users.forEach((user) => {
    // Skip users without licenses
    if (!user.assignedLicenses || user.assignedLicenses.length === 0) {
      return
    }

    // Skip disabled accounts (handled separately as orphaned)
    if (!user.accountEnabled) {
      return
    }

    const lastSignIn = user.signInActivity?.lastSignInDateTime

    if (!lastSignIn) {
      // Never signed in but has licenses
      const licenseCost = calculateUserLicenseCost(user.assignedLicenses)
      findings.push({
        type: "inactive_license",
        severity: "high",
        title: "User Never Signed In",
        description: `${user.displayName || user.userPrincipalName} has never signed in but has ${user.assignedLicenses.length} license(s) assigned.`,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.mail || user.userPrincipalName,
          accountEnabled: user.accountEnabled,
        },
        licenses: user.assignedLicenses,
        daysInactive: null,
        potentialSavings: licenseCost,
        recommendation: "Remove licenses or verify if user needs access",
      })
      return
    }

    const lastSignInDate = new Date(lastSignIn)
    const daysSinceSignIn = Math.floor((now - lastSignInDate) / (1000 * 60 * 60 * 24))

    if (daysSinceSignIn >= daysThreshold) {
      const licenseCost = calculateUserLicenseCost(user.assignedLicenses)
      let severity = "medium"
      if (daysSinceSignIn >= 90) severity = "high"
      else if (daysSinceSignIn >= 60) severity = "high"

      findings.push({
        type: "inactive_license",
        severity,
        title: `Inactive for ${daysSinceSignIn} Days`,
        description: `${user.displayName || user.userPrincipalName} has not signed in for ${daysSinceSignIn} days but has ${user.assignedLicenses.length} active license(s).`,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.mail || user.userPrincipalName,
          accountEnabled: user.accountEnabled,
          lastSignIn: lastSignIn,
        },
        licenses: user.assignedLicenses,
        daysInactive: daysSinceSignIn,
        potentialSavings: licenseCost,
        recommendation: daysSinceSignIn >= 90
          ? "Consider removing licenses - user may have left organization"
          : "Verify if user still needs access",
      })
    }
  })

  return findings
}

/**
 * Analyze orphaned licenses
 * Licenses assigned to disabled/deleted accounts
 */
function analyzeOrphanedLicenses(users) {
  const findings = []

  users.forEach((user) => {
    // Check for disabled accounts with licenses
    if (!user.accountEnabled && user.assignedLicenses && user.assignedLicenses.length > 0) {
      const licenseCost = calculateUserLicenseCost(user.assignedLicenses)

      findings.push({
        type: "orphaned_license",
        severity: "high",
        title: "License on Disabled Account",
        description: `${user.displayName || user.userPrincipalName} account is disabled but still has ${user.assignedLicenses.length} license(s) assigned.`,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.mail || user.userPrincipalName,
          accountEnabled: false,
        },
        licenses: user.assignedLicenses,
        potentialSavings: licenseCost,
        recommendation: "Remove licenses from disabled account immediately",
      })
    }
  })

  return findings
}

/**
 * Analyze over-provisioned licenses
 * Users with high-tier licenses who may only need basic features
 */
function analyzeOverProvisionedLicenses(users, licenses) {
  const findings = []

  // Build a map of SKU ID to license info
  const skuMap = {}
  licenses.forEach((sku) => {
    const skuPartNumber = sku.skuPartNumber
    if (M365_LICENSE_COSTS[skuPartNumber]) {
      skuMap[sku.skuId] = {
        ...M365_LICENSE_COSTS[skuPartNumber],
        skuId: sku.skuId,
        skuPartNumber,
      }
    }
  })

  users.forEach((user) => {
    if (!user.assignedLicenses || user.assignedLicenses.length === 0) {
      return
    }

    // Skip inactive users (already flagged)
    const lastSignIn = user.signInActivity?.lastSignInDateTime
    if (lastSignIn) {
      const daysSinceSignIn = Math.floor((new Date() - new Date(lastSignIn)) / (1000 * 60 * 60 * 24))
      if (daysSinceSignIn > 30) return
    }

    // Check if user has E5 or E3 license
    user.assignedLicenses.forEach((license) => {
      const skuInfo = skuMap[license.skuId]
      if (!skuInfo) return

      const tier = skuInfo.tier
      const downgradeRec = DOWNGRADE_RECOMMENDATIONS[tier]

      if (downgradeRec) {
        // For now, flag E5 users as potential over-provisioned
        // In a real scenario, we'd check actual feature usage via reports API
        if (tier === 'E5') {
          findings.push({
            type: "over_provisioned",
            severity: "medium",
            title: "Potential Over-Provisioning",
            description: `${user.displayName || user.userPrincipalName} has ${skuInfo.name} license. Verify if they use advanced E5 features.`,
            user: {
              id: user.id,
              displayName: user.displayName,
              email: user.mail || user.userPrincipalName,
            },
            currentLicense: skuInfo,
            recommendedTier: downgradeRec.to,
            potentialSavings: downgradeRec.savings,
            recommendation: `Review if user needs E5 features. Downgrade to ${downgradeRec.to} could save $${downgradeRec.savings}/month.`,
          })
        }
      }
    })
  })

  return findings
}

/**
 * Analyze unused add-ons
 * Add-on licenses that may not be actively used
 */
function analyzeUnusedAddons(users, licenses) {
  const findings = []
  const addonLicenses = ['PROJECTPROFESSIONAL', 'PROJECTPREMIUM', 'VISIOCLIENT', 'VISIO_PLAN1_DEPT',
                         'MCOEV', 'MCOPSTN1', 'MCOPSTN2', 'MCOMEETADV', 'POWER_BI_PRO']

  // Build a map of add-on SKU IDs
  const addonSkuIds = {}
  licenses.forEach((sku) => {
    if (addonLicenses.includes(sku.skuPartNumber)) {
      addonSkuIds[sku.skuId] = {
        ...M365_LICENSE_COSTS[sku.skuPartNumber],
        skuId: sku.skuId,
        skuPartNumber: sku.skuPartNumber,
        consumedUnits: sku.consumedUnits,
        prepaidUnits: sku.prepaidUnits?.enabled || 0,
      }
    }
  })

  // Check for add-ons assigned to inactive users
  users.forEach((user) => {
    if (!user.assignedLicenses || user.assignedLicenses.length === 0) return

    const lastSignIn = user.signInActivity?.lastSignInDateTime
    let isInactive = !lastSignIn
    if (lastSignIn) {
      const daysSinceSignIn = Math.floor((new Date() - new Date(lastSignIn)) / (1000 * 60 * 60 * 24))
      isInactive = daysSinceSignIn > 30
    }

    user.assignedLicenses.forEach((license) => {
      const addonInfo = addonSkuIds[license.skuId]
      if (!addonInfo) return

      if (isInactive) {
        findings.push({
          type: "unused_addon",
          severity: "low",
          title: `Unused ${addonInfo.name}`,
          description: `${user.displayName || user.userPrincipalName} has ${addonInfo.name} but hasn't signed in recently.`,
          user: {
            id: user.id,
            displayName: user.displayName,
            email: user.mail || user.userPrincipalName,
          },
          addon: addonInfo,
          potentialSavings: addonInfo.cost,
          recommendation: `Review if ${addonInfo.name} is needed. Could save $${addonInfo.cost}/month.`,
        })
      }
    })
  })

  // Check for significantly underutilized add-ons at the org level
  Object.values(addonSkuIds).forEach((addon) => {
    const utilization = addon.prepaidUnits > 0
      ? (addon.consumedUnits / addon.prepaidUnits) * 100
      : 0

    if (addon.prepaidUnits > 5 && utilization < 50) {
      const unusedCount = addon.prepaidUnits - addon.consumedUnits
      const monthlySavings = unusedCount * addon.cost

      findings.push({
        type: "unused_addon",
        severity: "medium",
        title: `Underutilized ${addon.name} Licenses`,
        description: `Only ${addon.consumedUnits} of ${addon.prepaidUnits} ${addon.name} licenses are assigned (${utilization.toFixed(0)}% utilization).`,
        addon: addon,
        consumed: addon.consumedUnits,
        available: addon.prepaidUnits,
        utilizationPercent: utilization.toFixed(0),
        potentialSavings: monthlySavings,
        recommendation: `Consider reducing ${addon.name} licenses. ${unusedCount} unused licenses cost $${monthlySavings}/month.`,
      })
    }
  })

  return findings
}

/**
 * Calculate monthly license cost for a user
 */
function calculateUserLicenseCost(assignedLicenses) {
  let totalCost = 0

  assignedLicenses.forEach((license) => {
    // We don't have the SKU part number here, just the ID
    // In a real scenario, we'd look this up from the subscribedSkus data
    // For now, estimate based on common license costs
    totalCost += 20 // Default estimate per license
  })

  return totalCost
}

/**
 * Main analysis function
 * @param {Object} data - License and user data
 * @param {Object} options - Analysis options
 * @param {number} options.inactivityDays - Days of inactivity to consider a user inactive (default: 30)
 */
function analyzeM365CostLeaks(data, options = {}) {
  const { licenses, users } = data
  const { inactivityDays = 30 } = options

  const results = {
    timestamp: new Date().toISOString(),
    inactivityThreshold: inactivityDays, // Include the threshold used in the response
    licenseAnalysis: {
      findings: [],
      summary: {
        totalLicenses: 0,
        totalUsers: users?.length || 0,
        usersWithLicenses: 0,
        inactiveUsers: 0,
        disabledUsers: 0,
        totalPotentialSavings: 0,
      },
    },
    overallSummary: {
      totalFindings: 0,
      totalPotentialSavings: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
    },
  }

  if (!users || users.length === 0) {
    return results
  }

  // Calculate summary stats
  const usersWithLicenses = users.filter(u => u.assignedLicenses && u.assignedLicenses.length > 0)
  const disabledUsers = users.filter(u => !u.accountEnabled)
  const now = new Date()
  const inactiveUsers = users.filter(u => {
    if (!u.signInActivity?.lastSignInDateTime) return true
    const daysSince = Math.floor((now - new Date(u.signInActivity.lastSignInDateTime)) / (1000 * 60 * 60 * 24))
    return daysSince > inactivityDays
  })

  results.licenseAnalysis.summary.usersWithLicenses = usersWithLicenses.length
  results.licenseAnalysis.summary.disabledUsers = disabledUsers.length
  results.licenseAnalysis.summary.inactiveUsers = inactiveUsers.length

  // Count total licenses
  if (licenses && licenses.length > 0) {
    results.licenseAnalysis.summary.totalLicenses = licenses.reduce((sum, sku) => {
      return sum + (sku.consumedUnits || 0)
    }, 0)
  }

  // Run all analysis functions
  const inactiveFindings = analyzeInactiveLicenses(users, inactivityDays)
  const orphanedFindings = analyzeOrphanedLicenses(users)
  const overProvisionedFindings = analyzeOverProvisionedLicenses(users, licenses || [])
  const unusedAddonFindings = analyzeUnusedAddons(users, licenses || [])

  // Combine all findings
  const allFindings = [
    ...orphanedFindings,      // High priority - immediate savings
    ...inactiveFindings,      // High priority - clear waste
    ...overProvisionedFindings,
    ...unusedAddonFindings,
  ]

  results.licenseAnalysis.findings = allFindings

  // Calculate totals
  let totalSavings = 0
  let highCount = 0
  let mediumCount = 0
  let lowCount = 0

  allFindings.forEach((finding) => {
    totalSavings += finding.potentialSavings || 0
    if (finding.severity === "high") highCount++
    else if (finding.severity === "medium") mediumCount++
    else lowCount++
  })

  results.licenseAnalysis.summary.totalPotentialSavings = totalSavings
  results.overallSummary.totalFindings = allFindings.length
  results.overallSummary.totalPotentialSavings = totalSavings
  results.overallSummary.highSeverity = highCount
  results.overallSummary.mediumSeverity = mediumCount
  results.overallSummary.lowSeverity = lowCount

  return results
}

module.exports = {
  analyzeM365CostLeaks,
  analyzeInactiveLicenses,
  analyzeOrphanedLicenses,
  analyzeOverProvisionedLicenses,
  analyzeUnusedAddons,
  M365_LICENSE_COSTS,
}
