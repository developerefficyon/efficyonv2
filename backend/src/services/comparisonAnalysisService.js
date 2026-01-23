/**
 * Cross-Platform Comparison Analysis Service
 * Analyzes data from Fortnox (financial) and Microsoft 365 (usage) to provide unified insights
 */

const { M365_LICENSE_COSTS } = require('./microsoft365CostLeakAnalysis')

/**
 * Calculate cross-platform metrics combining Fortnox and M365 data
 * @param {Object} fortnoxData - Fortnox data including supplier invoices and cost leaks
 * @param {Object} m365Data - Microsoft 365 data including licenses, users, and cost leaks
 * @returns {Object} Cross-platform metrics and insights
 */
function calculateCrossplatformMetrics(fortnoxData, m365Data) {
  const metrics = {
    timestamp: new Date().toISOString(),
    costMetrics: {},
    activityMetrics: {},
    efficiencyMetrics: {},
    gapAnalysis: {},
    trends: [],
  }

  // Extract relevant data
  const supplierInvoices = fortnoxData?.supplierInvoices || []
  const fortnoxCostLeaks = fortnoxData?.costLeaks || {}
  const m365Licenses = m365Data?.licenses || []
  const m365Users = m365Data?.users || []
  const m365CostLeaks = m365Data?.costLeaks || {}

  // 1. Calculate Monthly SaaS Spend from Fortnox
  const saasSpend = calculateMonthlySaaSSpend(supplierInvoices, fortnoxCostLeaks)
  metrics.costMetrics.monthlySaaSSpend = saasSpend

  // 2. Calculate M365 License Costs
  const m365Costs = calculateM365LicenseCosts(m365Licenses)
  metrics.costMetrics.monthlyM365Cost = m365Costs.totalMonthlyCost
  metrics.costMetrics.licenseBreakdown = m365Costs.breakdown

  // 3. Calculate Total Software Spend
  metrics.costMetrics.totalMonthlySoftwareSpend = saasSpend.total + m365Costs.totalMonthlyCost

  // 4. Calculate Activity Metrics from M365
  const activityStats = calculateActivityMetrics(m365Users)
  metrics.activityMetrics = activityStats

  // 5. Calculate Efficiency Metrics
  metrics.efficiencyMetrics = calculateEfficiencyMetrics(
    metrics.costMetrics,
    metrics.activityMetrics
  )

  // 6. Gap Analysis - Cost vs Activity
  metrics.gapAnalysis = analyzeActivityGap(
    metrics.costMetrics,
    metrics.activityMetrics,
    fortnoxCostLeaks,
    m365CostLeaks
  )

  return metrics
}

/**
 * Calculate monthly SaaS spend from Fortnox supplier invoices
 */
function calculateMonthlySaaSSpend(supplierInvoices, costLeaks) {
  const result = {
    total: 0,
    recurring: 0,
    nonRecurring: 0,
    bySupplier: [],
    monthlyTrend: [],
  }

  if (!supplierInvoices || supplierInvoices.length === 0) {
    return result
  }

  // Group invoices by month
  const byMonth = {}
  const bySupplier = {}

  supplierInvoices.forEach((invoice) => {
    const date = new Date(invoice.InvoiceDate || invoice.invoiceDate)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const supplierName = invoice.SupplierName || invoice.supplierName || 'Unknown'

    // Calculate invoice total
    let total = parseFloat(invoice.Total) || 0
    if (total === 0 && invoice.SupplierInvoiceRows) {
      total = invoice.SupplierInvoiceRows.reduce((sum, row) => {
        if (row.Code === 'TOT' || row.Code === 'TOT ') return sum
        return sum + (parseFloat(row.Total) || parseFloat(row.Debit) || 0)
      }, 0)
    }

    // Track by month
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = 0
    }
    byMonth[monthKey] += total

    // Track by supplier
    if (!bySupplier[supplierName]) {
      bySupplier[supplierName] = { total: 0, count: 0 }
    }
    bySupplier[supplierName].total += total
    bySupplier[supplierName].count += 1
  })

  // Calculate total and average monthly spend
  const monthlyTotals = Object.values(byMonth)
  if (monthlyTotals.length > 0) {
    result.total = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length
  }

  // Identify recurring subscriptions from cost leaks
  const recurringSubscriptions = costLeaks?.supplierInvoiceAnalysis?.summary?.recurringSubscriptions || []
  result.recurring = recurringSubscriptions.reduce((sum, sub) => sum + (sub.averageAmount || 0), 0)
  result.nonRecurring = Math.max(0, result.total - result.recurring)

  // Top suppliers
  result.bySupplier = Object.entries(bySupplier)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Monthly trend (last 6 months)
  result.monthlyTrend = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }))

  return result
}

/**
 * Calculate Microsoft 365 license costs
 */
function calculateM365LicenseCosts(licenses) {
  const result = {
    totalMonthlyCost: 0,
    totalLicenses: 0,
    usedLicenses: 0,
    breakdown: [],
  }

  if (!licenses || licenses.length === 0) {
    return result
  }

  licenses.forEach((sku) => {
    const skuPartNumber = sku.skuPartNumber
    const costInfo = M365_LICENSE_COSTS[skuPartNumber]
    const consumed = sku.consumedUnits || 0
    const available = sku.prepaidUnits?.enabled || 0

    result.totalLicenses += available
    result.usedLicenses += consumed

    if (costInfo) {
      const monthlyCost = consumed * costInfo.cost
      result.totalMonthlyCost += monthlyCost

      result.breakdown.push({
        name: costInfo.name,
        skuPartNumber,
        tier: costInfo.tier,
        unitCost: costInfo.cost,
        consumed,
        available,
        monthlyCost,
        utilization: available > 0 ? ((consumed / available) * 100).toFixed(1) : 0,
      })
    }
  })

  // Sort by cost descending
  result.breakdown.sort((a, b) => b.monthlyCost - a.monthlyCost)

  return result
}

/**
 * Calculate activity metrics from M365 users
 */
function calculateActivityMetrics(users) {
  const result = {
    totalUsers: users?.length || 0,
    activeUsers: 0,
    inactiveUsers: 0,
    neverSignedIn: 0,
    disabledAccounts: 0,
    activityRate: 0,
    activeUsersByPeriod: {
      last7Days: 0,
      last30Days: 0,
      last90Days: 0,
    },
  }

  if (!users || users.length === 0) {
    return result
  }

  const now = new Date()

  users.forEach((user) => {
    if (!user.accountEnabled) {
      result.disabledAccounts++
      return
    }

    const lastSignIn = user.signInActivity?.lastSignInDateTime
    if (!lastSignIn) {
      result.neverSignedIn++
      result.inactiveUsers++
      return
    }

    const lastSignInDate = new Date(lastSignIn)
    const daysSinceSignIn = Math.floor((now - lastSignInDate) / (1000 * 60 * 60 * 24))

    if (daysSinceSignIn <= 7) {
      result.activeUsersByPeriod.last7Days++
      result.activeUsersByPeriod.last30Days++
      result.activeUsersByPeriod.last90Days++
      result.activeUsers++
    } else if (daysSinceSignIn <= 30) {
      result.activeUsersByPeriod.last30Days++
      result.activeUsersByPeriod.last90Days++
      result.activeUsers++
    } else if (daysSinceSignIn <= 90) {
      result.activeUsersByPeriod.last90Days++
      result.inactiveUsers++
    } else {
      result.inactiveUsers++
    }
  })

  // Calculate activity rate (excluding disabled accounts)
  const enabledUsers = result.totalUsers - result.disabledAccounts
  if (enabledUsers > 0) {
    result.activityRate = ((result.activeUsers / enabledUsers) * 100).toFixed(1)
  }

  return result
}

/**
 * Calculate efficiency metrics combining cost and activity data
 */
function calculateEfficiencyMetrics(costMetrics, activityMetrics) {
  const result = {
    costPerActiveUser: 0,
    costPerTotalUser: 0,
    licenseEfficiencyScore: 0,
    wastedSpendEstimate: 0,
    recommendations: [],
  }

  const totalSoftwareSpend = costMetrics.totalMonthlySoftwareSpend || 0
  const activeUsers = activityMetrics.activeUsers || 0
  const totalUsers = activityMetrics.totalUsers || 0
  const inactiveUsers = activityMetrics.inactiveUsers || 0

  // Cost per active user
  if (activeUsers > 0) {
    result.costPerActiveUser = (totalSoftwareSpend / activeUsers).toFixed(2)
  }

  // Cost per total user
  if (totalUsers > 0) {
    result.costPerTotalUser = (totalSoftwareSpend / totalUsers).toFixed(2)
  }

  // License efficiency score (0-100)
  // Based on activity rate and license utilization
  const activityRate = parseFloat(activityMetrics.activityRate) || 0
  const licenseUtil = costMetrics.licenseBreakdown?.reduce((sum, l) => sum + parseFloat(l.utilization || 0), 0) /
                      (costMetrics.licenseBreakdown?.length || 1) || 0
  result.licenseEfficiencyScore = Math.round((activityRate * 0.6) + (licenseUtil * 0.4))

  // Estimated wasted spend (inactive users * average cost per user)
  if (inactiveUsers > 0 && totalUsers > 0) {
    const avgCostPerUser = totalSoftwareSpend / totalUsers
    result.wastedSpendEstimate = (inactiveUsers * avgCostPerUser).toFixed(2)
  }

  // Generate recommendations based on metrics
  if (result.licenseEfficiencyScore < 50) {
    result.recommendations.push({
      priority: 'high',
      title: 'Low License Efficiency',
      description: `Your license efficiency score is ${result.licenseEfficiencyScore}%. Review inactive users and unused licenses.`,
      potentialSavings: result.wastedSpendEstimate,
    })
  }

  if (activityRate < 70) {
    result.recommendations.push({
      priority: 'medium',
      title: 'Low User Activity Rate',
      description: `Only ${activityRate}% of users are active. Consider license reallocation or user engagement initiatives.`,
    })
  }

  return result
}

/**
 * Analyze the gap between cost and activity
 */
function analyzeActivityGap(costMetrics, activityMetrics, fortnoxCostLeaks, m365CostLeaks) {
  const result = {
    gapScore: 0,
    gapDescription: '',
    costTrend: 'stable',
    activityTrend: 'stable',
    mismatchAreas: [],
    combinedSavings: {
      fortnox: 0,
      m365: 0,
      total: 0,
    },
    prioritizedActions: [],
  }

  // Calculate combined savings from both platforms
  const fortnoxSavings = fortnoxCostLeaks?.overallSummary?.totalPotentialSavings || 0
  const m365Savings = m365CostLeaks?.overallSummary?.totalPotentialSavings || 0

  result.combinedSavings = {
    fortnox: fortnoxSavings,
    m365: m365Savings,
    total: fortnoxSavings + m365Savings,
  }

  // Calculate gap score (0-100, higher = bigger gap)
  const activityRate = parseFloat(activityMetrics.activityRate) || 0
  const costEfficiency = 100 - (parseFloat(costMetrics.totalMonthlySoftwareSpend) > 0 ?
    (result.combinedSavings.total / costMetrics.totalMonthlySoftwareSpend) * 100 : 0)

  result.gapScore = Math.round(Math.max(0, 100 - activityRate - Math.min(costEfficiency, 30)))

  // Gap description
  if (result.gapScore > 70) {
    result.gapDescription = 'Critical: Significant cost-activity gap detected. Immediate action recommended.'
  } else if (result.gapScore > 40) {
    result.gapDescription = 'Moderate: There are optimization opportunities across both platforms.'
  } else {
    result.gapDescription = 'Good: Cost and activity are relatively well aligned.'
  }

  // Identify mismatch areas
  if (activityMetrics.inactiveUsers > activityMetrics.activeUsers * 0.3) {
    result.mismatchAreas.push({
      area: 'User Activity',
      issue: 'High number of inactive users with active licenses',
      platform: 'Microsoft 365',
      severity: 'high',
    })
  }

  const fortnoxDuplicates = fortnoxCostLeaks?.supplierInvoiceAnalysis?.summary?.duplicatePayments?.length || 0
  if (fortnoxDuplicates > 0) {
    result.mismatchAreas.push({
      area: 'Payment Efficiency',
      issue: `${fortnoxDuplicates} potential duplicate payment(s) detected`,
      platform: 'Fortnox',
      severity: 'high',
    })
  }

  const m365Orphaned = m365CostLeaks?.licenseAnalysis?.findings?.filter(f => f.type === 'orphaned_license')?.length || 0
  if (m365Orphaned > 0) {
    result.mismatchAreas.push({
      area: 'License Management',
      issue: `${m365Orphaned} orphaned license(s) on disabled accounts`,
      platform: 'Microsoft 365',
      severity: 'high',
    })
  }

  // Generate prioritized actions from both platforms
  const allActions = []

  // Fortnox actions
  const fortnoxFindings = fortnoxCostLeaks?.supplierInvoiceAnalysis?.findings || []
  fortnoxFindings.forEach((finding) => {
    allActions.push({
      action: finding.title,
      description: finding.description,
      platform: 'Fortnox',
      savings: finding.potentialSavings || finding.potentialCost || 0,
      severity: finding.severity,
      effort: finding.severity === 'high' ? 'Low' : 'Medium',
    })
  })

  // M365 actions
  const m365Findings = m365CostLeaks?.licenseAnalysis?.findings || []
  m365Findings.forEach((finding) => {
    allActions.push({
      action: finding.title,
      description: finding.description,
      platform: 'Microsoft 365',
      savings: finding.potentialSavings || 0,
      severity: finding.severity,
      effort: finding.type === 'orphaned_license' ? 'Low' : 'Medium',
    })
  })

  // Sort by savings (highest first) and take top 10
  result.prioritizedActions = allActions
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 10)
    .map((action, index) => ({
      priority: index + 1,
      ...action,
    }))

  return result
}

/**
 * Generate combined recommendations from both platforms
 */
function generateCombinedRecommendations(fortnoxCostLeaks, m365CostLeaks) {
  const recommendations = []

  // Fortnox recommendations
  const fortnoxFindings = fortnoxCostLeaks?.supplierInvoiceAnalysis?.findings || []
  fortnoxFindings.forEach((finding) => {
    recommendations.push({
      platform: 'Fortnox',
      type: finding.type,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      potentialSavings: finding.potentialSavings || finding.potentialCost || 0,
      recommendation: finding.recommendation || `Review and address: ${finding.title}`,
    })
  })

  // M365 recommendations
  const m365Findings = m365CostLeaks?.licenseAnalysis?.findings || []
  m365Findings.forEach((finding) => {
    recommendations.push({
      platform: 'Microsoft 365',
      type: finding.type,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      potentialSavings: finding.potentialSavings || 0,
      recommendation: finding.recommendation,
    })
  })

  // Sort by severity then savings
  const severityOrder = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return b.potentialSavings - a.potentialSavings
  })

  return recommendations
}

/**
 * Calculate cost per active user with historical trend
 */
function calculateCostPerActiveUser(supplierInvoices, m365Users, m365Licenses) {
  const result = {
    currentCostPerUser: 0,
    trend: [],
    benchmark: {
      industry: 150, // Industry average estimate
      comparison: 'average',
    },
  }

  // Calculate M365 cost
  let m365MonthlyCost = 0
  if (m365Licenses && m365Licenses.length > 0) {
    m365Licenses.forEach((sku) => {
      const costInfo = M365_LICENSE_COSTS[sku.skuPartNumber]
      if (costInfo) {
        m365MonthlyCost += (sku.consumedUnits || 0) * costInfo.cost
      }
    })
  }

  // Calculate active users
  const now = new Date()
  const activeUsers = (m365Users || []).filter((user) => {
    if (!user.accountEnabled) return false
    const lastSignIn = user.signInActivity?.lastSignInDateTime
    if (!lastSignIn) return false
    const daysSinceSignIn = Math.floor((now - new Date(lastSignIn)) / (1000 * 60 * 60 * 24))
    return daysSinceSignIn <= 30
  }).length

  // Calculate Fortnox monthly spend (average of last 3 months)
  let fortnoxMonthlySpend = 0
  if (supplierInvoices && supplierInvoices.length > 0) {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const recentInvoices = supplierInvoices.filter((inv) => {
      const date = new Date(inv.InvoiceDate || inv.invoiceDate)
      return date >= threeMonthsAgo
    })

    const totalSpend = recentInvoices.reduce((sum, inv) => {
      let total = parseFloat(inv.Total) || 0
      if (total === 0 && inv.SupplierInvoiceRows) {
        total = inv.SupplierInvoiceRows.reduce((s, row) => {
          if (row.Code === 'TOT') return s
          return s + (parseFloat(row.Total) || parseFloat(row.Debit) || 0)
        }, 0)
      }
      return sum + total
    }, 0)

    fortnoxMonthlySpend = totalSpend / 3
  }

  // Calculate cost per active user
  const totalMonthlyCost = m365MonthlyCost + fortnoxMonthlySpend
  if (activeUsers > 0) {
    result.currentCostPerUser = (totalMonthlyCost / activeUsers).toFixed(2)
  }

  // Benchmark comparison
  const costPerUser = parseFloat(result.currentCostPerUser)
  if (costPerUser < result.benchmark.industry * 0.8) {
    result.benchmark.comparison = 'below_average'
  } else if (costPerUser > result.benchmark.industry * 1.2) {
    result.benchmark.comparison = 'above_average'
  }

  return result
}

module.exports = {
  calculateCrossplatformMetrics,
  calculateMonthlySaaSSpend,
  calculateM365LicenseCosts,
  calculateActivityMetrics,
  calculateEfficiencyMetrics,
  analyzeActivityGap,
  generateCombinedRecommendations,
  calculateCostPerActiveUser,
}
