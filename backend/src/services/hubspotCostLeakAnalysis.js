/**
 * HubSpot Cost Leak Analysis Service
 * Analyzes HubSpot seat usage, inactive users, and cost optimization opportunities
 */

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
    findings.push({
      type: "inactive_seats",
      severity: inactiveUsers.length > 5 ? "high" : inactiveUsers.length > 2 ? "medium" : "low",
      title: `${inactiveUsers.length} Inactive HubSpot User${inactiveUsers.length > 1 ? "s" : ""}`,
      description: `${inactiveUsers.length} user${inactiveUsers.length > 1 ? "s have" : " has"} not logged in for ${inactiveDays}+ days`,
      affectedUsers: inactiveUsers.map((u) => ({
        id: u.id,
        email: u.email,
        lastActivity: u.lastLoginAt || u.updatedAt || "Never",
      })),
      recommendation: "Review these accounts and consider removing seats for users who no longer need access",
    })
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
    findings.push({
      type: "unassigned_roles",
      severity: unassignedRoleUsers.length > 3 ? "medium" : "low",
      title: `${unassignedRoleUsers.length} User${unassignedRoleUsers.length > 1 ? "s" : ""} Without Roles`,
      description: `${unassignedRoleUsers.length} user${unassignedRoleUsers.length > 1 ? "s have" : " has"} no role assigned, which may indicate improper setup`,
      affectedUsers: unassignedRoleUsers.map((u) => ({
        id: u.id,
        email: u.email,
      })),
      recommendation: "Assign appropriate roles to these users or remove them if they don't need access",
    })
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
    findings.push({
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
      recommendation: "Consider downgrading your HubSpot plan or removing unused seats to reduce costs",
    })
  } else if (utilizationScore < 75) {
    findings.push({
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
      recommendation: "Review partially active and inactive users to optimize seat allocation",
    })
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
 * @param {Object} options - Analysis options
 * @returns {Object} Complete cost leak analysis
 */
function analyzeHubSpotCostLeaks(users, accountInfo = null, options = {}) {
  const { inactiveDays = 30 } = options

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

  // Calculate potential savings estimate
  // Assuming average HubSpot seat cost of ~$50/month
  const estimatedSeatCost = 50
  const potentialSavings = inactiveAnalysis.inactiveCount * estimatedSeatCost

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
  }

  return {
    summary,
    findings: allFindings,
    details: {
      inactiveSeats: inactiveAnalysis,
      unusedSeats: unusedAnalysis,
      utilization: utilizationAnalysis,
    },
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

  if (summary.inactiveUsers > 0) {
    recommendations.push({
      priority: 1,
      action: "Remove Inactive Seats",
      description: `Remove ${summary.inactiveUsers} inactive user${summary.inactiveUsers > 1 ? "s" : ""} to save approximately $${summary.potentialMonthlySavings}/month`,
      impact: "high",
      effort: "low",
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
}
