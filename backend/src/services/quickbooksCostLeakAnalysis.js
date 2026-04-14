/**
 * QuickBooks Cost Leak Analysis Service
 * Analyzes QuickBooks data to identify potential cost leaks and anomalies
 * with actionable recommendations for each finding
 */

const crypto = require("crypto")

/**
 * Format amount as USD for display
 */
function formatAmount(amount) {
  return `$${Math.round(amount || 0).toLocaleString("en-US")}`
}

/**
 * Parse a numeric amount from a value, returning 0 if invalid
 */
function safeParseFloat(val) {
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

/**
 * Generate a stable hash for a finding to track it across analyses
 */
function generateFindingHash(finding) {
  const key = `${finding.type}:${finding.title}:${Math.round(finding.amount || finding.potentialSavings || finding.revenueAtRisk || 0)}`
  return crypto.createHash("md5").update(key).digest("hex").slice(0, 16)
}

/**
 * Analyze bills for duplicate vendor payments, unusual amounts, recurring subscriptions, and price increases
 * @param {Array} bills - Array of QuickBooks Bill objects
 * @returns {Object} Analysis results with findings and summary
 */
function analyzeBills(bills) {
  const findings = []
  const summary = {
    totalBills: bills.length,
    totalAmount: 0,
    duplicatePayments: [],
    unusualAmounts: [],
    recurringSubscriptions: [],
    priceIncreases: [],
  }

  if (!bills || bills.length === 0) {
    return { findings, summary }
  }

  // Group bills by vendor
  const billsByVendor = {}

  bills.forEach((bill) => {
    const vendorId = bill.VendorRef && bill.VendorRef.value ? bill.VendorRef.value : "unknown"
    const vendorName = bill.VendorRef && bill.VendorRef.name ? bill.VendorRef.name : "Unknown Vendor"
    const totalAmt = safeParseFloat(bill.TotalAmt)

    summary.totalAmount += totalAmt

    if (!billsByVendor[vendorId]) {
      billsByVendor[vendorId] = {
        vendorId,
        vendorName,
        bills: [],
        totalAmount: 0,
        count: 0,
      }
    }
    billsByVendor[vendorId].bills.push({
      ...bill,
      calculatedTotal: totalAmt,
    })
    billsByVendor[vendorId].totalAmount += totalAmt
    billsByVendor[vendorId].count += 1
  })

  // 1. Detect duplicate vendor payments
  Object.values(billsByVendor).forEach((vendor) => {
    if (vendor.vendorId === "unknown") return

    const byAmount = {}
    vendor.bills.forEach((bill) => {
      if (bill.calculatedTotal <= 0) return
      const amountKey = Math.round(bill.calculatedTotal)
      if (!byAmount[amountKey]) {
        byAmount[amountKey] = []
      }
      byAmount[amountKey].push(bill)
    })

    Object.values(byAmount).forEach((sameBills) => {
      if (sameBills.length < 2) return

      sameBills.sort((a, b) => {
        const dateA = new Date(a.TxnDate || "")
        const dateB = new Date(b.TxnDate || "")
        return dateA - dateB
      })

      // Cluster bills into groups where each consecutive pair is within 30 days.
      const groups = []
      let currentGroup = [sameBills[0]]
      for (let i = 1; i < sameBills.length; i++) {
        const prevDate = new Date(sameBills[i - 1].TxnDate || "")
        const thisDate = new Date(sameBills[i].TxnDate || "")
        const daysDiff = Math.abs((thisDate - prevDate) / (1000 * 60 * 60 * 24))
        if (daysDiff <= 30) {
          currentGroup.push(sameBills[i])
        } else {
          if (currentGroup.length > 1) groups.push(currentGroup)
          currentGroup = [sameBills[i]]
        }
      }
      if (currentGroup.length > 1) groups.push(currentGroup)

      // Emit one finding per group of 2+ duplicates.
      for (const group of groups) {
        const amount = safeParseFloat(group[0].TotalAmt)
        const vendorName = group[0].VendorRef?.name || "Unknown vendor"
        const bills = group.map((b) => ({
          id: b.Id,
          txnDate: b.TxnDate,
          docNumber: b.DocNumber,
        }))

        // Detect likely-recurring: all inter-bill intervals close to 30 days (monthly)
        const intervals = []
        for (let i = 1; i < group.length; i++) {
          const d = (new Date(group[i].TxnDate) - new Date(group[i - 1].TxnDate)) / (1000 * 60 * 60 * 24)
          intervals.push(d)
        }
        const likelyRecurring =
          intervals.length > 0 && intervals.every((d) => d >= 25 && d <= 35)

        let severity = "low"
        if (amount > 1000) severity = "high"
        else if (amount > 100) severity = "medium"

        const finding = {
          type: "duplicate_payment",
          severity,
          title: `Duplicate payment to ${vendorName}`,
          description: `${group.length} bills of $${amount.toLocaleString()} to ${vendorName} within 30-day windows${likelyRecurring ? ". Interval pattern suggests this may be a legitimate subscription — verify before taking action." : "."}`,
          bills,
          amount,
          potentialSavings: amount * (group.length - 1),
          affectedBills: bills,
          likelyRecurring,
          recommendation: likelyRecurring
            ? "Confirm whether this is an intentional recurring subscription. If so, consolidate under a single annual contract."
            : `Review these ${group.length} bills and refund any accidental duplicates.`,
          impact: severity,
          effort: "low",
        }
        finding.findingHash = generateFindingHash(finding)
        summary.duplicatePayments.push(finding)
      }
    })
  })

  // 2. Detect unusual expense amounts (outliers)
  const amounts = bills
    .map((bill) => safeParseFloat(bill.TotalAmt))
    .filter((amt) => amt > 0)

  if (amounts.length > 0) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance =
      amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    const threshold = mean + 2 * stdDev

    bills.forEach((bill) => {
      const totalAmt = safeParseFloat(bill.TotalAmt)
      if (totalAmt > threshold && totalAmt > mean * 1.5) {
        const vendorName =
          bill.VendorRef && bill.VendorRef.name ? bill.VendorRef.name : "Unknown Vendor"
        const deviationPct = (((totalAmt - mean) / mean) * 100).toFixed(1)

        const finding = {
          type: "unusual_amount",
          severity: "medium",
          title: "Unusually High Bill Amount",
          description: `Bill from ${vendorName} (${formatAmount(totalAmt)}) is significantly higher than average (${formatAmount(mean)})`,
          bill,
          amount: totalAmt,
          averageAmount: mean,
          deviation: deviationPct + "%",
          recommendation: `Review this bill from ${vendorName} — it's ${deviationPct}% above your average. Verify the charges are correct and dispute any discrepancies.`,
          impact: "medium",
          effort: "medium",
          actionSteps: [
            `Review the bill line items from ${vendorName} for accuracy`,
            "Compare against the original purchase order or contract terms",
            "Check if this was a one-time expense or a pricing change",
            "If incorrect, contact the vendor to dispute or request an adjusted invoice",
            "If valid, approve and note the reason for the spike to avoid future false flags",
          ],
        }
        finding.findingHash = generateFindingHash(finding)
        summary.unusualAmounts.push(finding)
      }
    })
  }

  // 3. Detect recurring subscriptions
  Object.values(billsByVendor).forEach((vendor) => {
    if (vendor.count < 3) return
    if (vendor.vendorId === "unknown") return

    const sortedBills = vendor.bills
      .filter((b) => {
        if (b.calculatedTotal <= 0) return false
        const d = new Date(b.TxnDate || "")
        return !isNaN(d.getTime())
      })
      .sort((a, b) => {
        return new Date(a.TxnDate || "") - new Date(b.TxnDate || "")
      })

    const clusters = []
    const assigned = new Set()

    for (let i = 0; i < sortedBills.length; i++) {
      if (assigned.has(i)) continue
      const cluster = [sortedBills[i]]
      assigned.add(i)

      for (let j = i + 1; j < sortedBills.length; j++) {
        if (assigned.has(j)) continue
        const refAmount = cluster[0].calculatedTotal
        if (refAmount > 0 && Math.abs(sortedBills[j].calculatedTotal - refAmount) / refAmount <= 0.1) {
          cluster.push(sortedBills[j])
          assigned.add(j)
        }
      }

      if (cluster.length >= 3) {
        clusters.push(cluster)
      }
    }

    clusters.forEach((cluster) => {
      const clusterAmounts = cluster.map((b) => b.calculatedTotal)
      const avgAmount = clusterAmounts.reduce((a, b) => a + b, 0) / clusterAmounts.length

      const intervals = []
      for (let i = 0; i < cluster.length - 1; i++) {
        const date1 = new Date(cluster[i].TxnDate || "")
        const date2 = new Date(cluster[i + 1].TxnDate || "")
        const days = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24))
        intervals.push(days)
      }

      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const isRegular = intervals.every((interval) => Math.abs(interval - avgInterval) <= 5)

        if (isRegular && avgInterval >= 7) {
          const isMonthly = avgInterval >= 25 && avgInterval <= 35
          const annualCost = isMonthly ? avgAmount * 12 : avgAmount * (365 / avgInterval)
          const annualDiscount = Math.round(annualCost * 0.15)

          const finding = {
            type: "recurring_subscription",
            severity: "low",
            title: "Recurring Subscription Detected",
            description: `Regular payments to ${vendor.vendorName} (~${formatAmount(avgAmount)} every ${Math.round(avgInterval)} days)`,
            vendor: {
              id: vendor.vendorId,
              name: vendor.vendorName,
            },
            bills: cluster,
            averageAmount: avgAmount,
            frequency: Math.round(avgInterval) + " days",
            totalAmount: cluster.reduce((sum, b) => sum + b.calculatedTotal, 0),
            potentialSavings: avgAmount,
            recommendation: `This subscription to ${vendor.vendorName} costs ~${formatAmount(annualCost)}/year. ${isMonthly ? `Switching to annual billing could save ~${formatAmount(annualDiscount)}/year (typical 15% discount).` : "Evaluate if this service is still needed and being fully utilized."}`,
            impact: isMonthly ? "medium" : "low",
            effort: "medium",
            actionSteps: [
              `Confirm this subscription to ${vendor.vendorName} is still actively used by your team`,
              "Check if there are overlapping tools providing the same functionality",
              isMonthly
                ? `Contact ${vendor.vendorName} about annual billing — typically saves 10-20% (~${formatAmount(annualDiscount)}/year)`
                : `Review the billing frequency and negotiate better terms with ${vendor.vendorName}`,
              "If underutilized, consider downgrading to a lower tier or canceling",
              "Add a calendar reminder to review this subscription before the next renewal",
            ],
          }
          finding.findingHash = generateFindingHash(finding)
          summary.recurringSubscriptions.push(finding)
        }
      }
    })
  })

  // 4. Detect vendor price increases
  Object.values(billsByVendor).forEach((vendor) => {
    if (vendor.count < 2) return
    if (vendor.vendorId === "unknown") return

    const sortedBills = vendor.bills
      .filter((b) => b.calculatedTotal > 0)
      .sort((a, b) => {
        return new Date(a.TxnDate || "") - new Date(b.TxnDate || "")
      })

    if (sortedBills.length < 2) return

    const firstAmount = sortedBills[0].calculatedTotal
    const lastAmount = sortedBills[sortedBills.length - 1].calculatedTotal

    if (firstAmount <= 0) return

    const increase = ((lastAmount - firstAmount) / firstAmount) * 100

    if (increase > 20) {
      let severity = "medium"
      if (increase > 50) severity = "high"

      const finding = {
        type: "price_increase",
        severity,
        title: "Significant Vendor Price Increase",
        description: `Price increased by ${increase.toFixed(1)}% for ${vendor.vendorName} (${formatAmount(firstAmount)} -> ${formatAmount(lastAmount)})`,
        vendor: {
          id: vendor.vendorId,
          name: vendor.vendorName,
        },
        firstBill: sortedBills[0],
        lastBill: sortedBills[sortedBills.length - 1],
        increasePercent: increase.toFixed(1),
        amountIncrease: lastAmount - firstAmount,
        potentialSavings: Math.round((lastAmount - firstAmount) * 0.5),
        recommendation: `${vendor.vendorName} has increased prices by ${increase.toFixed(1)}%. Negotiate to bring costs closer to the original rate, or evaluate competing vendors.`,
        impact: severity,
        effort: "high",
        actionSteps: [
          `Review your contract or agreement with ${vendor.vendorName} for any rate lock or escalation clauses`,
          `Research 2-3 competing vendors offering similar services for price comparison`,
          `Contact ${vendor.vendorName} with competitor quotes to negotiate a better rate`,
          "If the vendor won't negotiate, evaluate switching costs vs. the ongoing price increase",
          "If staying, lock in a multi-year rate to prevent future increases",
        ],
      }
      finding.findingHash = generateFindingHash(finding)
      summary.priceIncreases.push(finding)
    }
  })

  // Combine all findings
  findings.push(...summary.duplicatePayments)
  findings.push(...summary.unusualAmounts)
  findings.push(...summary.recurringSubscriptions)
  findings.push(...summary.priceIncreases)

  // Calculate total potential savings
  const totalPotentialSavings =
    summary.duplicatePayments.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) +
    summary.recurringSubscriptions.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) +
    summary.priceIncreases.reduce((sum, f) => sum + (f.potentialSavings || 0), 0)

  summary.totalPotentialSavings = totalPotentialSavings
  summary.findingsCount = findings.length

  return { findings, summary }
}

/**
 * Analyze customer invoices for overdue receivables aging
 * @param {Array} invoices - Array of QuickBooks Invoice objects
 * @returns {Object} Analysis results with findings and summary
 */
function analyzeInvoices(invoices) {
  const findings = []
  const summary = {
    totalInvoices: invoices.length,
    totalRevenue: 0,
    totalOutstanding: 0,
    overdueInvoices: [],
    agingBuckets: {
      "0-30": { count: 0, amount: 0 },
      "31-60": { count: 0, amount: 0 },
      "61-90": { count: 0, amount: 0 },
      "90+": { count: 0, amount: 0 },
    },
  }

  if (!invoices || invoices.length === 0) {
    return { findings, summary }
  }

  const today = new Date()

  invoices.forEach((invoice) => {
    const totalAmt = safeParseFloat(invoice.TotalAmt)
    const balance = safeParseFloat(invoice.Balance)
    summary.totalRevenue += totalAmt

    if (balance > 0) {
      summary.totalOutstanding += balance

      const dueDate = invoice.DueDate
      if (dueDate) {
        const due = new Date(dueDate)
        if (!isNaN(due.getTime()) && due < today) {
          const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24))

          let bucket = "0-30"
          let severity = "low"
          if (daysOverdue > 90) {
            bucket = "90+"
            severity = "high"
          } else if (daysOverdue > 60) {
            bucket = "61-90"
            severity = "medium"
          } else if (daysOverdue > 30) {
            bucket = "31-60"
            severity = "low"
          } else {
            bucket = "0-30"
            severity = "low"
          }

          summary.agingBuckets[bucket].count += 1
          summary.agingBuckets[bucket].amount += balance

          const customerName =
            invoice.CustomerRef && invoice.CustomerRef.name
              ? invoice.CustomerRef.name
              : "Unknown Customer"

          // Build recommendation based on aging bucket
          let recommendation, effort, actionSteps
          if (daysOverdue > 90) {
            recommendation = `This invoice for ${customerName} is critically overdue (${daysOverdue} days). Escalate to collections or consider writing off as bad debt.`
            effort = "high"
            actionSteps = [
              `Send a final demand letter to ${customerName} with a payment deadline`,
              "Review the customer's payment history for any patterns of late payment",
              "Consider offering a settlement discount (e.g., 10-20% off) for immediate payment",
              "If no response, escalate to a collections agency or initiate legal proceedings",
              `If uncollectible, write off ${formatAmount(balance)} as bad debt for tax purposes`,
            ]
          } else if (daysOverdue > 60) {
            recommendation = `Invoice for ${customerName} is ${daysOverdue} days overdue. Send a formal collection notice and consider pausing future services.`
            effort = "medium"
            actionSteps = [
              `Send a formal overdue notice to ${customerName} via email and registered mail`,
              "Call the customer's accounts payable department directly",
              "Review if there are any disputes or issues preventing payment",
              "Consider pausing future orders or services until payment is received",
              "Set up a payment plan if the customer is experiencing cash flow issues",
            ]
          } else if (daysOverdue > 30) {
            recommendation = `Follow up with ${customerName} on this overdue invoice. A friendly reminder call often resolves 30-60 day overdue invoices.`
            effort = "low"
            actionSteps = [
              `Send a friendly payment reminder email to ${customerName}`,
              "Follow up with a phone call to the accounts payable contact",
              "Confirm the invoice was received and there are no disputes",
              "Offer convenient payment methods (online payment, ACH, etc.)",
            ]
          } else {
            recommendation = `Send a polite payment reminder to ${customerName}. This invoice is recently overdue and a quick nudge usually resolves it.`
            effort = "low"
            actionSteps = [
              `Send an automated payment reminder to ${customerName}`,
              "Verify the invoice details and delivery confirmation",
              "Check if the customer has any outstanding questions about the invoice",
            ]
          }

          const finding = {
            type: "overdue_receivable",
            severity,
            title: "Overdue Customer Invoice",
            description: `Invoice for ${customerName} is ${daysOverdue} days overdue with ${formatAmount(balance)} outstanding (${bucket} day bucket)`,
            invoice,
            amount: balance,
            daysOverdue,
            agingBucket: bucket,
            customerName,
            revenueAtRisk: balance,
            recommendation,
            impact: severity,
            effort,
            actionSteps,
          }
          finding.findingHash = generateFindingHash(finding)
          summary.overdueInvoices.push(finding)
        }
      }
    }
  })

  findings.push(...summary.overdueInvoices)
  summary.findingsCount = findings.length

  return { findings, summary }
}

/**
 * Analyze expenses by category (AccountRef) for spending trends
 * @param {Array} expenses - Array of QuickBooks Purchase objects
 * @returns {Object} Analysis results with findings and summary
 */
function analyzeCategories(expenses) {
  const findings = []
  const summary = {
    totalExpenses: expenses.length,
    totalAmount: 0,
    categoryCount: 0,
    categoryBreakdown: {},
    spendingIncreases: [],
  }

  if (!expenses || expenses.length === 0) {
    return { findings, summary }
  }

  const byCategory = {}

  expenses.forEach((expense) => {
    const categoryName =
      expense.AccountRef && expense.AccountRef.name
        ? expense.AccountRef.name
        : "Uncategorized"
    const totalAmt = safeParseFloat(expense.TotalAmt)
    const txnDate = expense.TxnDate || ""

    summary.totalAmount += totalAmt

    if (!byCategory[categoryName]) {
      byCategory[categoryName] = {
        name: categoryName,
        expenses: [],
        totalAmount: 0,
        count: 0,
        monthlySpend: {},
      }
    }
    byCategory[categoryName].expenses.push({
      ...expense,
      calculatedTotal: totalAmt,
    })
    byCategory[categoryName].totalAmount += totalAmt
    byCategory[categoryName].count += 1

    if (txnDate) {
      const date = new Date(txnDate)
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        if (!byCategory[categoryName].monthlySpend[monthKey]) {
          byCategory[categoryName].monthlySpend[monthKey] = 0
        }
        byCategory[categoryName].monthlySpend[monthKey] += totalAmt
      }
    }
  })

  summary.categoryCount = Object.keys(byCategory).length
  summary.categoryBreakdown = {}

  Object.values(byCategory).forEach((category) => {
    summary.categoryBreakdown[category.name] = {
      totalAmount: category.totalAmount,
      count: category.count,
    }

    const months = Object.keys(category.monthlySpend).sort()
    if (months.length < 2) return

    for (let i = 1; i < months.length; i++) {
      const prevMonth = months[i - 1]
      const currMonth = months[i]
      const prevAmount = category.monthlySpend[prevMonth]
      const currAmount = category.monthlySpend[currMonth]

      if (prevAmount <= 0) continue

      const changePercent = ((currAmount - prevAmount) / prevAmount) * 100

      if (changePercent > 25) {
        const amountIncrease = currAmount - prevAmount

        const finding = {
          type: "category_spending_increase",
          severity: "medium",
          title: "Category Spending Increase",
          description: `"${category.name}" spending increased by ${changePercent.toFixed(1)}% from ${prevMonth} (${formatAmount(prevAmount)}) to ${currMonth} (${formatAmount(currAmount)})`,
          category: category.name,
          previousMonth: prevMonth,
          currentMonth: currMonth,
          previousAmount: prevAmount,
          currentAmount: currAmount,
          changePercent: changePercent.toFixed(1),
          amountIncrease,
          potentialSavings: Math.round(amountIncrease * 0.3),
          recommendation: `"${category.name}" spending jumped ${changePercent.toFixed(1)}% (${formatAmount(amountIncrease)} increase). Review the new expenses in this category and set a monthly budget cap to prevent uncontrolled growth.`,
          impact: changePercent > 50 ? "high" : "medium",
          effort: "medium",
          actionSteps: [
            `Review all individual transactions in "${category.name}" for ${currMonth}`,
            "Identify which specific expenses drove the increase",
            "Determine if the increase is a one-time event or a new trend",
            `Set a monthly budget alert at ${formatAmount(Math.round(prevAmount * 1.1))} for this category`,
            "If the increase is unnecessary, implement approval workflows for expenses above a threshold",
          ],
        }
        finding.findingHash = generateFindingHash(finding)
        summary.spendingIncreases.push(finding)
      }
    }
  })

  findings.push(...summary.spendingIncreases)
  summary.findingsCount = findings.length

  return { findings, summary }
}

/**
 * Main analysis function - analyzes QuickBooks financial data for cost leaks
 * @param {Object} data - QuickBooks data object
 * @param {Array} data.invoices - Customer invoices
 * @param {Array} data.bills - Vendor bills
 * @param {Array} data.expenses - Purchase/expense objects
 * @param {Array} data.vendors - Vendor objects
 * @returns {Object} Complete analysis results
 */
function analyzeQuickBooksCostLeaks(data) {
  const results = {
    timestamp: new Date().toISOString(),
    billAnalysis: null,
    invoiceAnalysis: null,
    categoryAnalysis: null,
    overallSummary: {
      totalFindings: 0,
      totalPotentialSavings: 0,
      totalRevenueAtRisk: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
      recommendationsSummary: {
        totalRecommendations: 0,
        lowEffort: 0,
        mediumEffort: 0,
        highEffort: 0,
      },
    },
  }

  // Analyze bills
  if (data.bills && data.bills.length > 0) {
    results.billAnalysis = analyzeBills(data.bills)
    results.overallSummary.totalFindings += results.billAnalysis.findings.length
    results.overallSummary.totalPotentialSavings +=
      results.billAnalysis.summary.totalPotentialSavings || 0

    results.billAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++

      // Count recommendations by effort
      results.overallSummary.recommendationsSummary.totalRecommendations++
      if (finding.effort === "low") results.overallSummary.recommendationsSummary.lowEffort++
      else if (finding.effort === "medium") results.overallSummary.recommendationsSummary.mediumEffort++
      else if (finding.effort === "high") results.overallSummary.recommendationsSummary.highEffort++
    })
  }

  // Analyze customer invoices
  if (data.invoices && data.invoices.length > 0) {
    results.invoiceAnalysis = analyzeInvoices(data.invoices)
    results.overallSummary.totalFindings += results.invoiceAnalysis.findings.length

    results.overallSummary.totalRevenueAtRisk = results.invoiceAnalysis.findings.reduce(
      (sum, f) => sum + (f.revenueAtRisk || 0),
      0
    )

    results.invoiceAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++

      results.overallSummary.recommendationsSummary.totalRecommendations++
      if (finding.effort === "low") results.overallSummary.recommendationsSummary.lowEffort++
      else if (finding.effort === "medium") results.overallSummary.recommendationsSummary.mediumEffort++
      else if (finding.effort === "high") results.overallSummary.recommendationsSummary.highEffort++
    })
  }

  // Analyze category spending trends
  if (data.expenses && data.expenses.length > 0) {
    results.categoryAnalysis = analyzeCategories(data.expenses)
    results.overallSummary.totalFindings += results.categoryAnalysis.findings.length

    results.categoryAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++

      results.overallSummary.recommendationsSummary.totalRecommendations++
      if (finding.effort === "low") results.overallSummary.recommendationsSummary.lowEffort++
      else if (finding.effort === "medium") results.overallSummary.recommendationsSummary.mediumEffort++
      else if (finding.effort === "high") results.overallSummary.recommendationsSummary.highEffort++
    })
  }

  return results
}

module.exports = {
  analyzeQuickBooksCostLeaks,
  analyzeBills,
  analyzeInvoices,
  analyzeCategories,
}
