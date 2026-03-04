/**
 * QuickBooks Cost Leak Analysis Service
 * Analyzes QuickBooks data to identify potential cost leaks and anomalies
 */

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
  // Group bills by VendorRef.value. Within each vendor, find bills with same TotalAmt within 30 days.
  Object.values(billsByVendor).forEach((vendor) => {
    if (vendor.vendorId === "unknown") return

    // Group this vendor's bills by rounded amount
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

      // Sort by date
      sameBills.sort((a, b) => {
        const dateA = new Date(a.TxnDate || "")
        const dateB = new Date(b.TxnDate || "")
        return dateA - dateB
      })

      for (let i = 0; i < sameBills.length - 1; i++) {
        const bill1 = sameBills[i]
        const bill2 = sameBills[i + 1]
        const date1 = new Date(bill1.TxnDate || "")
        const date2 = new Date(bill2.TxnDate || "")

        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) continue

        const daysDiff = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24))

        if (daysDiff <= 30) {
          const amount = bill1.calculatedTotal
          let severity = "low"
          if (amount > 1000) severity = "high"
          else if (amount > 100) severity = "medium"

          summary.duplicatePayments.push({
            type: "duplicate_payment",
            severity,
            title: "Potential Duplicate Vendor Payment",
            description: `Same vendor (${vendor.vendorName}), same amount (${formatAmount(amount)}), within ${Math.round(daysDiff)} days`,
            bills: [bill1, bill2],
            amount,
            potentialSavings: amount,
          })
        }
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
        summary.unusualAmounts.push({
          type: "unusual_amount",
          severity: "medium",
          title: "Unusually High Bill Amount",
          description: `Bill from ${vendorName} (${formatAmount(totalAmt)}) is significantly higher than average (${formatAmount(mean)})`,
          bill,
          amount: totalAmt,
          averageAmount: mean,
          deviation: ((((totalAmt - mean) / mean) * 100).toFixed(1)) + "%",
        })
      }
    })
  }

  // 3. Detect recurring subscriptions
  // Group by vendor, cluster by amount (10% tolerance), check for regular interval (+/-5 day tolerance)
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

    // Cluster by similar amounts (within 10% of each other)
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

    // Check each cluster for regular intervals
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

        // Minimum 7-day interval to avoid false positives from clustered transactions
        if (isRegular && avgInterval >= 7) {
          summary.recurringSubscriptions.push({
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
          })
        }
      }
    })
  })

  // 5. Detect vendor price increases
  // Compare first vs last bill per vendor, flag if >20% increase
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

      summary.priceIncreases.push({
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
      })
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
    summary.recurringSubscriptions.reduce((sum, f) => sum + (f.potentialSavings || 0), 0)

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

    // Check for overdue receivables: Balance > 0 and past DueDate
    if (balance > 0) {
      summary.totalOutstanding += balance

      const dueDate = invoice.DueDate
      if (dueDate) {
        const due = new Date(dueDate)
        if (!isNaN(due.getTime()) && due < today) {
          const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24))

          // Determine aging bucket and severity
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

          summary.overdueInvoices.push({
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
          })
        }
      }
    }
  })

  // Add overdue invoices to findings
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

  // Group expenses by AccountRef.name
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

    // Aggregate monthly spend
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

  // Calculate month-over-month changes and flag >25% increases
  Object.values(byCategory).forEach((category) => {
    summary.categoryBreakdown[category.name] = {
      totalAmount: category.totalAmount,
      count: category.count,
    }

    const months = Object.keys(category.monthlySpend).sort()
    if (months.length < 2) return

    // Compare consecutive months
    for (let i = 1; i < months.length; i++) {
      const prevMonth = months[i - 1]
      const currMonth = months[i]
      const prevAmount = category.monthlySpend[prevMonth]
      const currAmount = category.monthlySpend[currMonth]

      if (prevAmount <= 0) continue

      const changePercent = ((currAmount - prevAmount) / prevAmount) * 100

      if (changePercent > 25) {
        summary.spendingIncreases.push({
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
          amountIncrease: currAmount - prevAmount,
        })
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
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
    },
  }

  // Analyze bills (primary cost source: duplicates, outliers, subscriptions, price increases)
  if (data.bills && data.bills.length > 0) {
    results.billAnalysis = analyzeBills(data.bills)
    results.overallSummary.totalFindings += results.billAnalysis.findings.length
    results.overallSummary.totalPotentialSavings +=
      results.billAnalysis.summary.totalPotentialSavings || 0

    // Count by severity
    results.billAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++
    })
  }

  // Analyze customer invoices (overdue receivables aging)
  if (data.invoices && data.invoices.length > 0) {
    results.invoiceAnalysis = analyzeInvoices(data.invoices)
    results.overallSummary.totalFindings += results.invoiceAnalysis.findings.length

    // Overdue receivables are "revenue at risk", track separately
    results.overallSummary.totalRevenueAtRisk = results.invoiceAnalysis.findings.reduce(
      (sum, f) => sum + (f.revenueAtRisk || 0),
      0
    )

    // Count by severity
    results.invoiceAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++
    })
  }

  // Analyze category spending trends
  if (data.expenses && data.expenses.length > 0) {
    results.categoryAnalysis = analyzeCategories(data.expenses)
    results.overallSummary.totalFindings += results.categoryAnalysis.findings.length

    // Count by severity
    results.categoryAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++
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
