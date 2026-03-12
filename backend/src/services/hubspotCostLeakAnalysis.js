/**
 * HubSpot Cost Leak Analysis Service
 * Analyzes HubSpot seat usage, inactive users, and cost optimization opportunities
 */

const crypto = require("crypto")
const { getPerSeatCost, calculatePotentialSavings, getPricingDisplayInfo } = require("../utils/hubspotPricing")

/**
 * Generate a stable hash for a finding so we can track it across analyses
 * @param {Object} finding - The finding object
 * @returns {string} MD5 hash string
 */
function generateFindingHash(finding) {
  const key = `${finding.type}:${finding.title}:${finding.affectedUsers?.length || 0}`
  return crypto.createHash("md5").update(key).digest("hex")
}

/**
 * Check if a user has accepted their invitation (is an active user, not pending)
 * @param {Object} user - HubSpot user object
 * @returns {boolean} True if user has accepted invitation
 */
function isActiveUser(user) {
  // Users with pending invites typically have no lastLoginAt and may have specific status fields
  // HubSpot API may include: userProvisioningState, status, or similar fields

  // Check for explicit pending/inactive status fields
  if (user.userProvisioningState === "PENDING" || user.status === "PENDING") {
    return false
  }

  // If user has logged in at least once, they've accepted
  if (user.lastLoginAt) {
    return true
  }

  // If user has updatedAt different from createdAt, they may have accepted
  if (user.updatedAt && user.createdAt && user.updatedAt !== user.createdAt) {
    return true
  }

  // Check if user has any activity indicators
  // Super admins who created the account are always active
  if (user.superAdmin === true) {
    return true
  }

  // Default: assume user has accepted if they exist in the system
  // HubSpot typically only returns users who have some form of access
  return true
}

/**
 * Check if a user has a valid role assigned
 * @param {Object} user - HubSpot user object
 * @returns {boolean} True if user has a role
 */
function hasValidRole(user) {
  // Super Admin is a valid role
  if (user.superAdmin === true) {
    return true
  }

  // Check roleIds array
  if (user.roleIds && user.roleIds.length > 0) {
    return true
  }

  // Check alternative permission fields that HubSpot might use
  if (user.roleId) {
    return true
  }

  // Check for permissions array (some HubSpot versions use this)
  if (user.permissions && user.permissions.length > 0) {
    return true
  }

  // Check for primaryTeamId (users assigned to teams typically have roles)
  if (user.primaryTeamId) {
    return true
  }

  return false
}

/**
 * Analyze inactive seats - users with seats but no recent activity
 * @param {Array} users - HubSpot users array
 * @param {number} inactiveDays - Days without activity to consider inactive (default: 30)
 * @returns {Object} Analysis of inactive seats
 */
function analyzeInactiveSeats(users, inactiveDays = 30) {
  if (!users || users.length === 0) {
    return {
      inactiveUsers: [],
      inactiveCount: 0,
      totalUsers: 0,
      inactivePercentage: 0,
      findings: [],
    }
  }

  const now = new Date()
  const inactiveThreshold = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000)

  const inactiveUsers = users.filter((user) => {
    // Check last login or last modified date
    const lastActivity = user.lastLoginAt || user.updatedAt || user.createdAt
    if (!lastActivity) return true // No activity data means potentially inactive

    const activityDate = new Date(lastActivity)
    return activityDate < inactiveThreshold
  })

  const inactivePercentage =
    users.length > 0 ? Math.round((inactiveUsers.length / users.length) * 100) : 0

  const findings = []

  if (inactiveUsers.length > 0) {
    const finding = {
      type: "inactive_seats",
      severity: inactiveUsers.length > 5 ? "high" : inactiveUsers.length > 2 ? "medium" : "low",
      title: `${inactiveUsers.length} Inactive HubSpot User${inactiveUsers.length > 1 ? "s" : ""}`,
      description: `${inactiveUsers.length} user${inactiveUsers.length > 1 ? "s have" : " has"} not logged in for ${inactiveDays}+ days`,
      affectedUsers: inactiveUsers.map((u) => ({
        id: u.id,
        email: u.email,
        lastActivity: u.lastLoginAt || u.updatedAt || "Never",
      })),
      recommendation: "Remove or downgrade these inactive seats to stop paying for users who aren't using HubSpot",
      actionSteps: [
        "Review the list of inactive users below",
        "Contact each user to confirm they no longer need HubSpot access",
        "Deactivate or remove confirmed inactive users from HubSpot Settings > Users & Teams",
        "Document which seats were freed for audit trail",
        "Verify the seat count reduction on your next HubSpot invoice",
      ],
      effort: "low",
      impact: inactiveUsers.length > 5 ? "high" : inactiveUsers.length > 2 ? "medium" : "low",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  }

  return {
    inactiveUsers: inactiveUsers.map((u) => ({
      id: u.id,
      email: u.email,
      lastLoginAt: u.lastLoginAt,
      roleId: u.roleId,
    })),
    inactiveCount: inactiveUsers.length,
    totalUsers: users.length,
    inactivePercentage,
    findings,
  }
}

/**
 * Analyze unused seats - paid seats not assigned to users
 * @param {Object} accountInfo - HubSpot account info with seat limits
 * @param {Array} users - HubSpot users array
 * @returns {Object} Analysis of unused seats
 */
function analyzeUnusedSeats(accountInfo, users) {
  const findings = []

  // HubSpot doesn't always expose seat limits directly via API
  // We analyze based on user roles and types
  const totalUsers = users?.length || 0

  // Categorize users by their roles/types
  const usersByRole = {}
  users?.forEach((user) => {
    const role = user.roleId || "unknown"
    if (!usersByRole[role]) {
      usersByRole[role] = []
    }
    usersByRole[role].push(user)
  })

  // Check for users without proper roles assigned (excluding super admins and users with permissions)
  const unassignedRoleUsers = users?.filter((u) => !hasValidRole(u)) || []

  if (unassignedRoleUsers.length > 0) {
    const finding = {
      type: "unassigned_roles",
      severity: unassignedRoleUsers.length > 3 ? "medium" : "low",
      title: `${unassignedRoleUsers.length} User${unassignedRoleUsers.length > 1 ? "s" : ""} Without Roles`,
      description: `${unassignedRoleUsers.length} user${unassignedRoleUsers.length > 1 ? "s have" : " has"} no role assigned, which may indicate improper setup`,
      affectedUsers: unassignedRoleUsers.map((u) => ({
        id: u.id,
        email: u.email,
      })),
      recommendation: "Assign proper roles or remove these users — unassigned seats still count toward your paid seat limit",
      actionSteps: [
        "Go to HubSpot Settings > Users & Teams",
        "Review each user without a role assignment",
        "Assign the appropriate role (Sales, Marketing, Service, etc.) based on their job function",
        "Remove users who no longer need access to free up seats",
        "Set up an onboarding checklist to ensure new users get roles assigned immediately",
      ],
      effort: "low",
      impact: unassignedRoleUsers.length > 3 ? "medium" : "low",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  }

  return {
    totalUsers,
    usersByRole,
    unassignedRoleUsers: unassignedRoleUsers.length,
    findings,
  }
}

/**
 * Analyze seat utilization patterns
 * @param {Array} users - HubSpot users array
 * @returns {Object} Utilization analysis
 */
function analyzeSeatUtilization(users) {
  if (!users || users.length === 0) {
    return {
      utilizationScore: 0,
      activeUsers: 0,
      partiallyActiveUsers: 0,
      inactiveUsers: 0,
      findings: [],
    }
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let activeUsers = 0
  let partiallyActiveUsers = 0
  let inactiveUsers = 0

  users.forEach((user) => {
    const lastActivity = user.lastLoginAt || user.updatedAt
    if (!lastActivity) {
      inactiveUsers++
      return
    }

    const activityDate = new Date(lastActivity)
    if (activityDate >= sevenDaysAgo) {
      activeUsers++
    } else if (activityDate >= thirtyDaysAgo) {
      partiallyActiveUsers++
    } else {
      inactiveUsers++
    }
  })

  // Calculate utilization score (0-100)
  const utilizationScore = Math.round(
    ((activeUsers * 1.0 + partiallyActiveUsers * 0.5) / users.length) * 100
  )

  const findings = []

  if (utilizationScore < 50) {
    const finding = {
      type: "low_utilization",
      severity: "high",
      title: "Low HubSpot Seat Utilization",
      description: `Only ${utilizationScore}% of HubSpot seats are being actively used`,
      metrics: {
        activeUsers,
        partiallyActiveUsers,
        inactiveUsers,
        totalUsers: users.length,
      },
      recommendation: "Your utilization is critically low — evaluate whether your current plan tier and seat count match actual usage",
      actionSteps: [
        "Export a list of all HubSpot users and their last login dates",
        "Identify users who haven't logged in within 30 days",
        "Schedule meetings with team leads to confirm which seats are still needed",
        "Remove or deactivate unnecessary user accounts",
        "Contact HubSpot to discuss downgrading to a plan with fewer seats",
        "Set up quarterly seat utilization reviews to prevent future waste",
      ],
      effort: "medium",
      impact: "high",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  } else if (utilizationScore < 75) {
    const finding = {
      type: "moderate_utilization",
      severity: "medium",
      title: "Moderate HubSpot Seat Utilization",
      description: `${utilizationScore}% of HubSpot seats are being actively used`,
      metrics: {
        activeUsers,
        partiallyActiveUsers,
        inactiveUsers,
        totalUsers: users.length,
      },
      recommendation: "Review partially active users to determine if they still need full seat access or can be switched to view-only",
      actionSteps: [
        "Review the list of partially active users (logged in within 30 days but not last 7 days)",
        "Determine if these users need full seat access or can use free/view-only access",
        "Reach out to partially active users to understand their usage patterns",
        "Reassign or remove seats that are underutilized",
      ],
      effort: "low",
      impact: "medium",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  }

  return {
    utilizationScore,
    activeUsers,
    partiallyActiveUsers,
    inactiveUsers,
    totalUsers: users.length,
    findings,
  }
}

/**
 * Main analysis function - combines all HubSpot cost leak checks
 * @param {Array} users - HubSpot users array
 * @param {Object} accountInfo - HubSpot account info (optional)
 * @param {Object} options - Analysis options including pricing info
 * @returns {Object} Complete cost leak analysis
 */
function analyzeHubSpotCostLeaks(users, accountInfo = null, options = {}) {
  const { inactiveDays = 30, pricing = null } = options

  // Filter out pending users (those who haven't accepted their invitation)
  const activeUsers = users?.filter((user) => isActiveUser(user)) || []
  const pendingUsers = users?.filter((user) => !isActiveUser(user)) || []

  // Log for debugging
  if (pendingUsers.length > 0) {
    console.log(`[HubSpot Analysis] Filtered out ${pendingUsers.length} pending user(s):`,
      pendingUsers.map(u => u.email))
  }

  // Run all analyses on active users only
  const inactiveAnalysis = analyzeInactiveSeats(activeUsers, inactiveDays)
  const unusedAnalysis = analyzeUnusedSeats(accountInfo, activeUsers)
  const utilizationAnalysis = analyzeSeatUtilization(activeUsers)

  // Combine all findings
  const allFindings = [
    ...inactiveAnalysis.findings,
    ...unusedAnalysis.findings,
    ...utilizationAnalysis.findings,
  ]

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Calculate overall health score (0-100, higher is better)
  let healthScore = 100
  allFindings.forEach((finding) => {
    if (finding.severity === "high") healthScore -= 25
    else if (finding.severity === "medium") healthScore -= 15
    else if (finding.severity === "low") healthScore -= 5
  })
  healthScore = Math.max(0, healthScore)

  // Calculate potential savings using actual pricing if available
  let estimatedSeatCost = 50 // Default fallback
  let pricingSource = "estimated"

  if (pricing && pricing.hub_type && pricing.tier) {
    estimatedSeatCost = getPerSeatCost(pricing.hub_type, pricing.tier)
    pricingSource = "user_provided"
    console.log(`[HubSpot Analysis] Using user-provided pricing: $${estimatedSeatCost}/seat (${pricing.hub_type} ${pricing.tier})`)
  } else {
    console.log(`[HubSpot Analysis] No pricing info provided, using default estimate: $${estimatedSeatCost}/seat`)
  }

  const potentialSavings = inactiveAnalysis.inactiveCount * estimatedSeatCost

  // Enrich findings with potentialSavings based on pricing
  allFindings.forEach((finding) => {
    if (finding.type === "inactive_seats") {
      finding.potentialSavings = potentialSavings
    } else if (finding.type === "unassigned_roles") {
      // Unassigned role users might be removable — estimate at half the inactive savings
      const unassignedCount = finding.affectedUsers?.length || 0
      finding.potentialSavings = Math.round(unassignedCount * estimatedSeatCost * 0.5)
    } else if (finding.type === "low_utilization") {
      // Low utilization — estimate savings from removing all inactive + half of partially active
      const metrics = finding.metrics || {}
      const removable = (metrics.inactiveUsers || 0) + Math.floor((metrics.partiallyActiveUsers || 0) * 0.5)
      finding.potentialSavings = removable * estimatedSeatCost
    } else if (finding.type === "moderate_utilization") {
      // Moderate utilization — estimate from partially active users
      const metrics = finding.metrics || {}
      const removable = Math.floor((metrics.partiallyActiveUsers || 0) * 0.3)
      finding.potentialSavings = removable * estimatedSeatCost
    }
  })

  // Get pricing display info
  const pricingInfo = pricing ? getPricingDisplayInfo(pricing) : null

  // Generate summary
  const summary = {
    totalUsers: activeUsers?.length || 0,
    pendingUsers: pendingUsers?.length || 0,
    activeUsers: utilizationAnalysis.activeUsers,
    inactiveUsers: inactiveAnalysis.inactiveCount,
    utilizationScore: utilizationAnalysis.utilizationScore,
    healthScore,
    issuesFound: allFindings.length,
    highSeverityIssues: allFindings.filter((f) => f.severity === "high").length,
    mediumSeverityIssues: allFindings.filter((f) => f.severity === "medium").length,
    lowSeverityIssues: allFindings.filter((f) => f.severity === "low").length,
    potentialMonthlySavings: potentialSavings,
    perSeatCost: estimatedSeatCost,
    pricingSource,
    paidSeats: pricing?.paid_seats || null,
  }

  return {
    summary,
    findings: allFindings,
    details: {
      inactiveSeats: inactiveAnalysis,
      unusedSeats: unusedAnalysis,
      utilization: utilizationAnalysis,
    },
    pricing: pricingInfo,
    recommendations: generateRecommendations(summary, allFindings),
  }
}

/**
 * Generate prioritized recommendations based on analysis
 * @param {Object} summary - Analysis summary
 * @param {Array} findings - All findings
 * @returns {Array} Prioritized recommendations
 */
function generateRecommendations(summary, findings) {
  const recommendations = []
  const perSeatCost = summary.perSeatCost || 50
  const pricingNote = summary.pricingSource === "user_provided"
    ? ""
    : " (based on estimated pricing)"

  if (summary.inactiveUsers > 0) {
    recommendations.push({
      priority: 1,
      action: "Remove Inactive Seats",
      description: `Remove ${summary.inactiveUsers} inactive user${summary.inactiveUsers > 1 ? "s" : ""} to save $${summary.potentialMonthlySavings}/month at $${perSeatCost}/seat${pricingNote}`,
      impact: "high",
      effort: "low",
      savings: summary.potentialMonthlySavings,
    })
  }

  if (summary.utilizationScore < 50) {
    recommendations.push({
      priority: 2,
      action: "Audit HubSpot Plan",
      description: "Your seat utilization is below 50%. Consider downgrading to a smaller plan or consolidating users",
      impact: "high",
      effort: "medium",
    })
  }

  if (summary.utilizationScore >= 50 && summary.utilizationScore < 75) {
    recommendations.push({
      priority: 3,
      action: "Review User Access",
      description: "Review partially active users and determine if they still need HubSpot access",
      impact: "medium",
      effort: "low",
    })
  }

  // Add general recommendation if health is good
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 1,
      action: "Maintain Current Setup",
      description: "Your HubSpot seat utilization looks healthy. Continue monitoring usage patterns",
      impact: "low",
      effort: "low",
    })
  }

  return recommendations
}

module.exports = {
  analyzeInactiveSeats,
  analyzeUnusedSeats,
  analyzeSeatUtilization,
  analyzeHubSpotCostLeaks,
  generateRecommendations,
  generateFindingHash,
}
