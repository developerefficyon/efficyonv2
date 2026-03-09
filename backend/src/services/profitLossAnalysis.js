/**
 * Profit & Loss (Resultatrapport) Analysis Service
 * Analyzes Fortnox P&L reports to identify cost optimization opportunities,
 * unusual expense patterns, and year-over-year changes.
 */

/**
 * BAS account group definitions for cost analysis
 */
const COST_GROUPS = {
  revenue: { prefixes: ["30", "31", "32", "33", "34", "35"], label: "Net Revenue", type: "revenue" },
  otherRevenue: { prefixes: ["36", "37", "38", "39"], label: "Other Operating Revenue", type: "revenue" },
  cogs: { prefixes: ["40", "41", "42", "43", "44"], label: "Cost of Goods Sold", type: "cost" },
  materials: { prefixes: ["45", "46", "47", "48", "49"], label: "Materials & Subcontractors", type: "cost" },
  premises: { prefixes: ["50", "51"], label: "Premises & Facilities", type: "cost" },
  equipment: { prefixes: ["52", "53", "54", "55"], label: "Equipment & Leasing", type: "cost" },
  transport: { prefixes: ["56", "57"], label: "Transport & Freight", type: "cost" },
  travel: { prefixes: ["58"], label: "Travel Expenses", type: "cost" },
  marketing: { prefixes: ["59"], label: "Marketing & Advertising", type: "cost" },
  selling: { prefixes: ["60"], label: "Selling Expenses", type: "cost" },
  office: { prefixes: ["61"], label: "Office Supplies", type: "cost" },
  telecom: { prefixes: ["62"], label: "Telecom & Internet", type: "cost" },
  insurance: { prefixes: ["63"], label: "Insurance", type: "cost" },
  admin: { prefixes: ["64", "65", "66", "67"], label: "Administration & Professional Fees", type: "cost" },
  contractStaff: { prefixes: ["68"], label: "Contract Staff", type: "cost" },
  otherExternal: { prefixes: ["69"], label: "Other External Costs", type: "cost" },
  salaries: { prefixes: ["70", "71", "72"], label: "Salaries & Wages", type: "cost" },
  benefits: { prefixes: ["73"], label: "Employee Benefits", type: "cost" },
  pensions: { prefixes: ["74"], label: "Pension Costs", type: "cost" },
  socialFees: { prefixes: ["75"], label: "Social Security Fees", type: "cost" },
  otherPersonnel: { prefixes: ["76"], label: "Other Personnel Costs", type: "cost" },
  depreciation: { prefixes: ["77", "78"], label: "Depreciation & Amortization", type: "cost" },
  otherOperating: { prefixes: ["79"], label: "Other Operating Costs", type: "cost" },
  financialIncome: { prefixes: ["80", "81", "82"], label: "Financial Income", type: "financial" },
  financialExpenses: { prefixes: ["83", "84", "85", "86"], label: "Financial Expenses", type: "financial" },
  appropriations: { prefixes: ["88"], label: "Appropriations", type: "appropriation" },
  tax: { prefixes: ["89"], label: "Tax", type: "tax" },
}

/**
 * Analyze a P&L report for cost optimization opportunities
 * @param {Object} plData - { lineItems: Array, metadata?: Object }
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results with findings and summary
 */
function analyzeProfitLoss(plData, options = {}) {
  const lineItems = Array.isArray(plData) ? plData : (plData.lineItems || [])
  const metadata = plData.metadata || {}
  const findings = []

  if (!lineItems || lineItems.length === 0) {
    return {
      findings: [],
      summary: { totalFindings: 0, totalPotentialSavings: 0 },
      overallSummary: { totalFindings: 0, totalPotentialSavings: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 },
    }
  }

  // 1. Group line items by cost group
  const grouped = groupLineItems(lineItems)

  // 2. Calculate totals
  const totals = calculateTotals(grouped)

  // 3. Run analysis checks
  findings.push(...analyzeYoYChanges(grouped, totals))
  findings.push(...analyzeExpenseRatios(grouped, totals))
  findings.push(...analyzeSaaSAndIT(lineItems, totals))
  findings.push(...analyzePersonnelCosts(grouped, totals))
  findings.push(...analyzeTopExpenses(lineItems, totals))
  findings.push(...analyzeExternalServices(lineItems, totals))

  // 4. Build summary
  const totalPotentialSavings = findings.reduce((sum, f) => sum + (f.potentialSavings || 0), 0)
  const highSeverity = findings.filter((f) => f.severity === "high").length
  const mediumSeverity = findings.filter((f) => f.severity === "medium").length
  const lowSeverity = findings.filter((f) => f.severity === "low").length

  return {
    findings,
    totals,
    grouped: Object.fromEntries(
      Object.entries(grouped).map(([key, items]) => [
        key,
        {
          label: COST_GROUPS[key]?.label || key,
          period: items.reduce((s, i) => s + i.Period, 0),
          previousYear: items.reduce((s, i) => s + i.PreviousYear, 0),
          items: items.length,
        },
      ])
    ),
    metadata,
    overallSummary: {
      totalFindings: findings.length,
      totalPotentialSavings: Math.round(totalPotentialSavings),
      highSeverity,
      mediumSeverity,
      lowSeverity,
      revenue: totals.totalRevenue,
      totalCosts: totals.totalCosts,
      operatingResult: totals.operatingResult,
      netResult: totals.netResult,
    },
    summary: {
      totalFindings: findings.length,
      totalPotentialSavings: Math.round(totalPotentialSavings),
    },
  }
}

/**
 * Group line items into cost groups by account code prefix
 */
function groupLineItems(lineItems) {
  const grouped = {}

  for (const item of lineItems) {
    const code = String(item.AccountCode || "")
    const prefix = code.substring(0, 2)

    let groupKey = "other"
    for (const [key, group] of Object.entries(COST_GROUPS)) {
      if (group.prefixes.includes(prefix)) {
        groupKey = key
        break
      }
    }

    if (!grouped[groupKey]) grouped[groupKey] = []
    grouped[groupKey].push(item)
  }

  return grouped
}

/**
 * Calculate revenue, cost, and result totals
 */
function calculateTotals(grouped) {
  let totalRevenue = 0
  let totalCosts = 0
  let externalCosts = 0
  let personnelCosts = 0
  let financialNet = 0

  for (const [key, items] of Object.entries(grouped)) {
    const groupDef = COST_GROUPS[key]
    const sum = items.reduce((s, i) => s + (i.Period || 0), 0)

    if (groupDef?.type === "revenue") {
      totalRevenue += sum
    } else if (groupDef?.type === "cost") {
      totalCosts += Math.abs(sum)
      // Personnel vs external split
      if (["salaries", "benefits", "pensions", "socialFees", "otherPersonnel", "contractStaff"].includes(key)) {
        personnelCosts += Math.abs(sum)
      } else {
        externalCosts += Math.abs(sum)
      }
    } else if (groupDef?.type === "financial") {
      financialNet += sum
    }
  }

  const operatingResult = totalRevenue - totalCosts
  const netResult = operatingResult + financialNet

  return {
    totalRevenue: Math.round(totalRevenue),
    totalCosts: Math.round(totalCosts),
    externalCosts: Math.round(externalCosts),
    personnelCosts: Math.round(personnelCosts),
    operatingResult: Math.round(operatingResult),
    financialNet: Math.round(financialNet),
    netResult: Math.round(netResult),
    operatingMargin: totalRevenue !== 0 ? Math.round((operatingResult / totalRevenue) * 10000) / 100 : 0,
    personnelRatio: totalRevenue !== 0 ? Math.round((personnelCosts / totalRevenue) * 10000) / 100 : 0,
    externalCostRatio: totalRevenue !== 0 ? Math.round((externalCosts / totalRevenue) * 10000) / 100 : 0,
  }
}

/**
 * Analyze year-over-year changes per cost group
 */
function analyzeYoYChanges(grouped, totals) {
  const findings = []

  for (const [key, items] of Object.entries(grouped)) {
    const groupDef = COST_GROUPS[key]
    if (!groupDef || groupDef.type === "revenue") continue

    const periodSum = Math.abs(items.reduce((s, i) => s + (i.Period || 0), 0))
    const prevYearSum = Math.abs(items.reduce((s, i) => s + (i.PreviousYear || 0), 0))

    if (prevYearSum === 0 || periodSum === 0) continue

    const changePercent = ((periodSum - prevYearSum) / prevYearSum) * 100
    const changeAmount = periodSum - prevYearSum

    // Flag significant increases (>25% and material amount)
    if (changePercent > 25 && changeAmount > 10000) {
      const severity = changePercent > 50 ? "high" : "medium"
      findings.push({
        type: "yoy_increase",
        title: `${groupDef.label}: ${Math.round(changePercent)}% YoY increase`,
        description: `${groupDef.label} increased from ${formatSEK(prevYearSum)} to ${formatSEK(periodSum)} (${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}%). Review whether this growth is justified.`,
        severity,
        category: groupDef.label,
        groupKey: key,
        potentialSavings: Math.round(changeAmount * 0.3), // Assume 30% of the increase could be optimized
        data: { periodSum, prevYearSum, changePercent: Math.round(changePercent * 10) / 10 },
      })
    }

    // Flag significant decreases in costs (potential positive finding)
    if (changePercent < -30 && Math.abs(changeAmount) > 50000) {
      findings.push({
        type: "yoy_decrease",
        title: `${groupDef.label}: ${Math.round(Math.abs(changePercent))}% YoY decrease`,
        description: `${groupDef.label} decreased from ${formatSEK(prevYearSum)} to ${formatSEK(periodSum)}. Verify this isn't due to deferred costs or missed payments.`,
        severity: "low",
        category: groupDef.label,
        groupKey: key,
        potentialSavings: 0,
        data: { periodSum, prevYearSum, changePercent: Math.round(changePercent * 10) / 10 },
      })
    }
  }

  return findings
}

/**
 * Analyze expense ratios against typical benchmarks
 */
function analyzeExpenseRatios(grouped, totals) {
  const findings = []
  if (totals.totalRevenue <= 0) return findings

  // Personnel cost ratio check (typical: 30-60% for service companies)
  if (totals.personnelRatio > 65) {
    findings.push({
      type: "high_ratio",
      title: `Personnel costs at ${totals.personnelRatio}% of revenue`,
      description: `Personnel costs (${formatSEK(totals.personnelCosts)}) represent ${totals.personnelRatio}% of revenue. For most service companies, 30-60% is typical. Consider contractor vs. FTE optimization.`,
      severity: totals.personnelRatio > 75 ? "high" : "medium",
      category: "Personnel",
      potentialSavings: Math.round(totals.personnelCosts * ((totals.personnelRatio - 55) / 100)),
      data: { ratio: totals.personnelRatio, amount: totals.personnelCosts },
    })
  }

  // Premises cost ratio (typical: 3-8%)
  const premisesCost = Math.abs((grouped.premises || []).reduce((s, i) => s + (i.Period || 0), 0))
  const premisesRatio = (premisesCost / totals.totalRevenue) * 100
  if (premisesRatio > 10) {
    findings.push({
      type: "high_ratio",
      title: `Premises costs at ${Math.round(premisesRatio)}% of revenue`,
      description: `Premises costs (${formatSEK(premisesCost)}) represent ${Math.round(premisesRatio)}% of revenue. Typical range is 3-8%. Consider renegotiating lease or hybrid office model.`,
      severity: "medium",
      category: "Premises",
      potentialSavings: Math.round(premisesCost * 0.2),
      data: { ratio: Math.round(premisesRatio * 10) / 10, amount: premisesCost },
    })
  }

  // Marketing ratio check (flag if very high or very low)
  const marketingCost = Math.abs((grouped.marketing || []).reduce((s, i) => s + (i.Period || 0), 0))
  const marketingRatio = (marketingCost / totals.totalRevenue) * 100
  if (marketingRatio > 15) {
    findings.push({
      type: "high_ratio",
      title: `Marketing spend at ${Math.round(marketingRatio)}% of revenue`,
      description: `Marketing costs (${formatSEK(marketingCost)}) represent ${Math.round(marketingRatio)}% of revenue. Audit ROI per channel to ensure efficiency.`,
      severity: "medium",
      category: "Marketing",
      potentialSavings: Math.round(marketingCost * 0.15),
      data: { ratio: Math.round(marketingRatio * 10) / 10, amount: marketingCost },
    })
  }

  // Operating margin check
  if (totals.operatingMargin < 5 && totals.totalRevenue > 0) {
    findings.push({
      type: "low_margin",
      title: `Low operating margin: ${totals.operatingMargin}%`,
      description: `Operating result is ${formatSEK(totals.operatingResult)} on revenue of ${formatSEK(totals.totalRevenue)} (${totals.operatingMargin}% margin). Most healthy businesses target 10-20%.`,
      severity: totals.operatingMargin < 0 ? "high" : "medium",
      category: "Profitability",
      potentialSavings: 0,
      data: { margin: totals.operatingMargin, operatingResult: totals.operatingResult },
    })
  }

  return findings
}

/**
 * Analyze SaaS, IT, and software costs
 */
function analyzeSaaSAndIT(lineItems, totals) {
  const findings = []

  // Look for software/SaaS related accounts (54xx dataprogram, 52xx leasing, 62xx telecom)
  const saasKeywords = ["dataprogram", "programvara", "licens", "molnserv", "azure", "saas", "software", "cloud", "app"]
  const saasItems = lineItems.filter((item) => {
    const name = (item.AccountName || "").toLowerCase()
    return saasKeywords.some((kw) => name.includes(kw))
  })

  if (saasItems.length > 0) {
    const totalSaaS = Math.abs(saasItems.reduce((s, i) => s + (i.Period || 0), 0))
    const prevSaaS = Math.abs(saasItems.reduce((s, i) => s + (i.PreviousYear || 0), 0))

    if (totalSaaS > 0) {
      const perEmployee = totals.totalRevenue > 0 ? Math.round(totalSaaS / (totals.personnelCosts / 600000 || 1)) : 0 // Rough employee estimate
      const saasRatio = totals.totalRevenue > 0 ? (totalSaaS / totals.totalRevenue) * 100 : 0

      findings.push({
        type: "saas_costs",
        title: `Software/SaaS costs: ${formatSEK(totalSaaS)}`,
        description: `Identified ${saasItems.length} software/SaaS line items totaling ${formatSEK(totalSaaS)} (${Math.round(saasRatio * 10) / 10}% of revenue).${prevSaaS > 0 ? ` Previous year: ${formatSEK(prevSaaS)} (${Math.round(((totalSaaS - prevSaaS) / prevSaaS) * 100)}% change).` : ""} Audit for unused licenses and overlapping tools.`,
        severity: saasRatio > 5 ? "medium" : "low",
        category: "Software & SaaS",
        potentialSavings: Math.round(totalSaaS * 0.15), // Typical 15% savings from license optimization
        data: {
          items: saasItems.map((i) => ({ code: i.AccountCode, name: i.AccountName, amount: i.Period })),
          total: totalSaaS,
          previousYear: prevSaaS,
          ratio: Math.round(saasRatio * 10) / 10,
        },
      })
    }
  }

  // Telecom costs
  const telecomItems = lineItems.filter((item) => {
    const code = String(item.AccountCode || "")
    return code.startsWith("62")
  })
  if (telecomItems.length > 0) {
    const totalTelecom = Math.abs(telecomItems.reduce((s, i) => s + (i.Period || 0), 0))
    const prevTelecom = Math.abs(telecomItems.reduce((s, i) => s + (i.PreviousYear || 0), 0))

    if (totalTelecom > 50000 && prevTelecom > 0) {
      const change = ((totalTelecom - prevTelecom) / prevTelecom) * 100
      if (Math.abs(change) > 20) {
        findings.push({
          type: "telecom_change",
          title: `Telecom costs ${change > 0 ? "increased" : "decreased"} ${Math.round(Math.abs(change))}%`,
          description: `Telecom costs went from ${formatSEK(prevTelecom)} to ${formatSEK(totalTelecom)}. Review phone plans, internet contracts, and mobile subscriptions.`,
          severity: change > 30 ? "medium" : "low",
          category: "Telecom",
          potentialSavings: change > 0 ? Math.round((totalTelecom - prevTelecom) * 0.5) : 0,
          data: { total: totalTelecom, previousYear: prevTelecom, change: Math.round(change) },
        })
      }
    }
  }

  return findings
}

/**
 * Analyze personnel cost structure
 */
function analyzePersonnelCosts(grouped, totals) {
  const findings = []

  const salaryItems = grouped.salaries || []
  const socialItems = grouped.socialFees || []
  const pensionItems = grouped.pensions || []
  const contractItems = grouped.contractStaff || []

  const totalSalaries = Math.abs(salaryItems.reduce((s, i) => s + (i.Period || 0), 0))
  const prevSalaries = Math.abs(salaryItems.reduce((s, i) => s + (i.PreviousYear || 0), 0))
  const totalContract = Math.abs(contractItems.reduce((s, i) => s + (i.Period || 0), 0))
  const prevContract = Math.abs(contractItems.reduce((s, i) => s + (i.PreviousYear || 0), 0))

  // Check contractor vs FTE balance
  if (totalContract > 0 && totalSalaries > 0) {
    const contractRatio = (totalContract / (totalSalaries + totalContract)) * 100
    if (contractRatio > 30) {
      findings.push({
        type: "contractor_ratio",
        title: `Contractor costs at ${Math.round(contractRatio)}% of total labor`,
        description: `Contract staff costs (${formatSEK(totalContract)}) are ${Math.round(contractRatio)}% of total labor costs. If these are long-term roles, converting to FTE could save 20-40% per role.`,
        severity: contractRatio > 50 ? "high" : "medium",
        category: "Personnel",
        potentialSavings: Math.round(totalContract * 0.2),
        data: { contractCost: totalContract, salaries: totalSalaries, ratio: Math.round(contractRatio) },
      })
    }
  }

  // Salary growth check
  if (prevSalaries > 0 && totalSalaries > 0) {
    const salaryGrowth = ((totalSalaries - prevSalaries) / prevSalaries) * 100
    if (salaryGrowth > 15) {
      findings.push({
        type: "salary_growth",
        title: `Salary costs grew ${Math.round(salaryGrowth)}% YoY`,
        description: `Salaries increased from ${formatSEK(prevSalaries)} to ${formatSEK(totalSalaries)}. If headcount didn't grow proportionally, review compensation structure.`,
        severity: salaryGrowth > 30 ? "high" : "medium",
        category: "Personnel",
        potentialSavings: 0,
        data: { current: totalSalaries, previous: prevSalaries, growth: Math.round(salaryGrowth) },
      })
    }
  }

  return findings
}

/**
 * Identify the largest individual expense line items
 */
function analyzeTopExpenses(lineItems, totals) {
  const findings = []
  if (totals.totalRevenue <= 0) return findings

  // Get cost items only (negative amounts = costs)
  const costItems = lineItems
    .filter((item) => {
      const code = String(item.AccountCode || "")
      return code.startsWith("4") || code.startsWith("5") || code.startsWith("6") || code.startsWith("7")
    })
    .map((item) => ({ ...item, absAmount: Math.abs(item.Period || 0) }))
    .sort((a, b) => b.absAmount - a.absAmount)

  // Top 5 individual accounts by amount
  const top5 = costItems.slice(0, 5)
  if (top5.length > 0) {
    findings.push({
      type: "top_expenses",
      title: "Top 5 expense accounts",
      description: top5.map((item, i) =>
        `${i + 1}. ${item.AccountCode} ${item.AccountName}: ${formatSEK(item.absAmount)} (${Math.round((item.absAmount / totals.totalRevenue) * 100)}% of revenue)`
      ).join("\n"),
      severity: "low",
      category: "Overview",
      potentialSavings: 0,
      data: {
        items: top5.map((i) => ({
          code: i.AccountCode,
          name: i.AccountName,
          amount: i.absAmount,
          revenuePercent: Math.round((i.absAmount / totals.totalRevenue) * 1000) / 10,
        })),
      },
    })
  }

  return findings
}

/**
 * Analyze external consulting and professional services
 */
function analyzeExternalServices(lineItems, totals) {
  const findings = []

  const serviceKeywords = ["konsult", "arvode", "redov", "revision", "advokat", "tjänst", "rådgivning"]
  const serviceItems = lineItems.filter((item) => {
    const name = (item.AccountName || "").toLowerCase()
    const code = String(item.AccountCode || "")
    return serviceKeywords.some((kw) => name.includes(kw)) || code.startsWith("64") || code.startsWith("65")
  })

  if (serviceItems.length > 0) {
    const totalServices = Math.abs(serviceItems.reduce((s, i) => s + (i.Period || 0), 0))
    const prevServices = Math.abs(serviceItems.reduce((s, i) => s + (i.PreviousYear || 0), 0))

    if (totalServices > 100000) {
      const change = prevServices > 0 ? ((totalServices - prevServices) / prevServices) * 100 : 0

      findings.push({
        type: "external_services",
        title: `External services & consulting: ${formatSEK(totalServices)}`,
        description: `Found ${serviceItems.length} consulting/service accounts totaling ${formatSEK(totalServices)}.${prevServices > 0 ? ` YoY change: ${change > 0 ? "+" : ""}${Math.round(change)}%.` : ""} Review whether any can be brought in-house or renegotiated.`,
        severity: totalServices > 500000 ? "medium" : "low",
        category: "Professional Services",
        potentialSavings: Math.round(totalServices * 0.1),
        data: {
          items: serviceItems.map((i) => ({ code: i.AccountCode, name: i.AccountName, amount: Math.abs(i.Period || 0) })),
          total: totalServices,
          previousYear: prevServices,
        },
      })
    }
  }

  return findings
}

/**
 * Format SEK amount for display
 */
function formatSEK(amount) {
  const rounded = Math.round(Math.abs(amount))
  return `${amount < 0 ? "-" : ""}${rounded.toLocaleString("sv-SE")} SEK`
}

module.exports = { analyzeProfitLoss, groupLineItems, calculateTotals, COST_GROUPS }
