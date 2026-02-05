/**
 * Cost Leak Analysis Service
 * Analyzes Fortnox data to identify potential cost leaks and anomalies
 */
const { formatCurrencyForIntegration } = require("../utils/currency")

/**
 * Analyze supplier invoices for cost leaks
 * @param {Array} supplierInvoices - Array of supplier invoices
 * @returns {Object} Analysis results
 */
function analyzeSupplierInvoices(supplierInvoices) {
  const findings = []
  const summary = {
    totalInvoices: supplierInvoices.length,
    totalAmount: 0,
    duplicatePayments: [],
    unusualAmounts: [],
    recurringSubscriptions: [],
    overdueInvoices: [],
    priceIncreases: [],
  }

  if (!supplierInvoices || supplierInvoices.length === 0) {
    return { findings, summary }
  }

  // Group invoices by supplier
  const invoicesBySupplier = {}
  const invoicesByAmount = {}
  const invoicesByDate = {}

  supplierInvoices.forEach((invoice) => {
    const supplierNumber = invoice.SupplierNumber || invoice.supplierNumber
    const supplierName = invoice.SupplierName || invoice.supplierName || "Unknown"
    
    // Calculate total from rows if invoice Total is 0 or missing
    let invoiceTotal = parseFloat(invoice.Total) || 0
    if ((invoiceTotal === 0 || !invoice.Total || invoice.Total === "0") && invoice.SupplierInvoiceRows && Array.isArray(invoice.SupplierInvoiceRows)) {
      invoiceTotal = invoice.SupplierInvoiceRows.reduce((sum, row) => {
        // Skip the TOT row (total row) which has Code: "TOT"
        if (row.Code === "TOT" || row.Code === "TOT ") {
          return sum
        }
        // Try Total first, then Debit, then Credit (for expense accounts, Debit is the amount)
        const rowAmount = parseFloat(row.Total) || parseFloat(row.Debit) || parseFloat(row.Credit) || 0
        return sum + rowAmount
      }, 0)
    }

    summary.totalAmount += invoiceTotal

    // Group by supplier
    if (!invoicesBySupplier[supplierNumber]) {
      invoicesBySupplier[supplierNumber] = {
        supplierNumber,
        supplierName,
        invoices: [],
        totalAmount: 0,
        count: 0,
      }
    }
    invoicesBySupplier[supplierNumber].invoices.push({
      ...invoice,
      calculatedTotal: invoiceTotal,
      _originalTotal: invoice.Total, // Keep original for debugging
    })
    invoicesBySupplier[supplierNumber].totalAmount += invoiceTotal
    invoicesBySupplier[supplierNumber].count += 1

    // Group by amount (for duplicate detection) - only include invoices with actual amounts
    if (invoiceTotal > 0) {
      const amountKey = Math.round(invoiceTotal)
      if (!invoicesByAmount[amountKey]) {
        invoicesByAmount[amountKey] = []
      }
      invoicesByAmount[amountKey].push({
        ...invoice,
        calculatedTotal: invoiceTotal,
        supplierNumber,
        supplierName,
        _originalTotal: invoice.Total, // Keep original for debugging
      })
    }

    // Group by date
    const dateKey = invoice.InvoiceDate || invoice.invoiceDate
    if (dateKey) {
      if (!invoicesByDate[dateKey]) {
        invoicesByDate[dateKey] = []
      }
      invoicesByDate[dateKey].push({
        ...invoice,
        calculatedTotal: invoiceTotal,
        _originalTotal: invoice.Total, // Keep original for debugging
      })
    }
  })

  // 1. Detect duplicate payments
  Object.values(invoicesByAmount).forEach((invoices) => {
    if (invoices.length > 1) {
      // Check if same supplier, same amount, similar dates
      const groupedBySupplier = {}
      invoices.forEach((inv) => {
        const key = `${inv.supplierNumber || inv.SupplierNumber}`
        if (!groupedBySupplier[key]) {
          groupedBySupplier[key] = []
        }
        groupedBySupplier[key].push(inv)
      })

      Object.values(groupedBySupplier).forEach((supplierInvoices) => {
        if (supplierInvoices.length > 1) {
          // Check date proximity (within 30 days)
          supplierInvoices.sort((a, b) => {
            const dateA = new Date(a.InvoiceDate || a.invoiceDate)
            const dateB = new Date(b.InvoiceDate || b.invoiceDate)
            return dateA - dateB
          })

          for (let i = 0; i < supplierInvoices.length - 1; i++) {
            const inv1 = supplierInvoices[i]
            const inv2 = supplierInvoices[i + 1]
            const date1 = new Date(inv1.InvoiceDate || inv1.invoiceDate)
            const date2 = new Date(inv2.InvoiceDate || inv2.invoiceDate)
            const daysDiff = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24))

            if (daysDiff <= 30) {
              summary.duplicatePayments.push({
                type: "duplicate_payment",
                severity: "high",
                title: "Potential Duplicate Payment",
                description: `Same supplier (${inv1.supplierName || inv1.SupplierName}), same amount (${formatCurrencyForIntegration(inv1.calculatedTotal, 'fortnox')}), within ${Math.round(daysDiff)} days`,
                invoices: [inv1, inv2],
                amount: inv1.calculatedTotal,
                potentialSavings: inv1.calculatedTotal,
              })
            }
          }
        }
      })
    }
  })

  // 2. Detect unusual amounts (outliers)
  const amounts = supplierInvoices.map((inv) => {
    let total = parseFloat(inv.Total) || 0
    if (total === 0 && inv.SupplierInvoiceRows) {
      total = inv.SupplierInvoiceRows.reduce((sum, row) => {
        return sum + (parseFloat(row.Total) || parseFloat(row.Debit) || 0)
      }, 0)
    }
    return total
  }).filter(amt => amt > 0)

  if (amounts.length > 0) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    const threshold = mean + (2 * stdDev) // 2 standard deviations

    supplierInvoices.forEach((invoice) => {
      let invoiceTotal = parseFloat(invoice.Total) || 0
      if (invoiceTotal === 0 && invoice.SupplierInvoiceRows) {
        invoiceTotal = invoice.SupplierInvoiceRows.reduce((sum, row) => {
          return sum + (parseFloat(row.Total) || parseFloat(row.Debit) || 0)
        }, 0)
      }

      if (invoiceTotal > threshold && invoiceTotal > mean * 1.5) {
        summary.unusualAmounts.push({
          type: "unusual_amount",
          severity: "medium",
          title: "Unusually High Invoice Amount",
          description: `Invoice amount (${formatCurrencyForIntegration(invoiceTotal, 'fortnox')}) is significantly higher than average (${formatCurrencyForIntegration(mean, 'fortnox')})`,
          invoice,
          amount: invoiceTotal,
          averageAmount: mean,
          deviation: ((invoiceTotal - mean) / mean * 100).toFixed(1) + "%",
        })
      }
    })
  }

  // 3. Detect recurring subscriptions (same supplier, similar amount, regular intervals)
  Object.values(invoicesBySupplier).forEach((supplier) => {
    if (supplier.count >= 3) {
      const invoices = supplier.invoices.sort((a, b) => {
        const dateA = new Date(a.InvoiceDate || a.invoiceDate)
        const dateB = new Date(b.InvoiceDate || b.invoiceDate)
        return dateA - dateB
      })

      // Check if amounts are similar (within 10%)
      const amounts = invoices.map((inv) => inv.calculatedTotal)
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const allSimilar = amounts.every((amt) => Math.abs(amt - avgAmount) / avgAmount <= 0.1)

      if (allSimilar) {
        // Check date intervals
        const intervals = []
        for (let i = 0; i < invoices.length - 1; i++) {
          const date1 = new Date(invoices[i].InvoiceDate || invoices[i].invoiceDate)
          const date2 = new Date(invoices[i + 1].InvoiceDate || invoices[i + 1].invoiceDate)
          const days = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24))
          intervals.push(days)
        }

        // Check if intervals are regular (within 5 days of each other)
        if (intervals.length > 0) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
          const isRegular = intervals.every((interval) => Math.abs(interval - avgInterval) <= 5)

          if (isRegular) {
            summary.recurringSubscriptions.push({
              type: "recurring_subscription",
              severity: "low",
              title: "Recurring Subscription Detected",
              description: `Regular payments to ${supplier.supplierName} (~${formatCurrencyForIntegration(avgAmount, 'fortnox')} every ${Math.round(avgInterval)} days)`,
              supplier: {
                number: supplier.supplierNumber,
                name: supplier.supplierName,
              },
              invoices: invoices,
              averageAmount: avgAmount,
              frequency: Math.round(avgInterval) + " days",
              totalAmount: supplier.totalAmount,
              potentialSavings: avgAmount, // Could save by canceling
            })
          }
        }
      }
    }
  })

  // 4. Detect overdue invoices
  const today = new Date()
  supplierInvoices.forEach((invoice) => {
    const dueDate = invoice.DueDate || invoice.dueDate
    if (dueDate) {
      const due = new Date(dueDate)
      if (due < today && !invoice.FinalPayDate && !invoice.finalPayDate) {
        const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24))
        let invoiceTotal = parseFloat(invoice.Total) || 0
        if (invoiceTotal === 0 && invoice.SupplierInvoiceRows) {
          invoiceTotal = invoice.SupplierInvoiceRows.reduce((sum, row) => {
            return sum + (parseFloat(row.Total) || parseFloat(row.Debit) || 0)
          }, 0)
        }

        summary.overdueInvoices.push({
          type: "overdue_invoice",
          severity: "medium",
          title: "Overdue Invoice",
          description: `Invoice is ${daysOverdue} days overdue`,
          invoice,
          daysOverdue,
          amount: invoiceTotal,
          potentialCost: invoiceTotal * 0.02, // 2% late fee estimate
        })
      }
    }
  })

  // 5. Detect price increases
  Object.values(invoicesBySupplier).forEach((supplier) => {
    if (supplier.count >= 2) {
      const invoices = supplier.invoices.sort((a, b) => {
        const dateA = new Date(a.InvoiceDate || a.invoiceDate)
        const dateB = new Date(b.InvoiceDate || b.invoiceDate)
        return dateA - dateB
      })

      // Compare first and last invoice
      const firstAmount = invoices[0].calculatedTotal
      const lastAmount = invoices[invoices.length - 1].calculatedTotal
      const increase = ((lastAmount - firstAmount) / firstAmount) * 100

      if (increase > 20) {
        summary.priceIncreases.push({
          type: "price_increase",
          severity: "medium",
          title: "Significant Price Increase",
          description: `Price increased by ${increase.toFixed(1)}% for ${supplier.supplierName}`,
          supplier: {
            number: supplier.supplierNumber,
            name: supplier.supplierName,
          },
          firstInvoice: invoices[0],
          lastInvoice: invoices[invoices.length - 1],
          increasePercent: increase.toFixed(1),
          amountIncrease: lastAmount - firstAmount,
        })
      }
    }
  })

  // Combine all findings
  findings.push(...summary.duplicatePayments)
  findings.push(...summary.unusualAmounts)
  findings.push(...summary.recurringSubscriptions)
  findings.push(...summary.overdueInvoices)
  findings.push(...summary.priceIncreases)

  // Calculate total potential savings
  const totalPotentialSavings = 
    summary.duplicatePayments.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) +
    summary.recurringSubscriptions.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) +
    summary.overdueInvoices.reduce((sum, f) => sum + (f.potentialCost || 0), 0)

  summary.totalPotentialSavings = totalPotentialSavings
  summary.findingsCount = findings.length

  return { findings, summary }
}

/**
 * Analyze customer invoices for revenue comparison
 * @param {Array} invoices - Array of customer invoices
 * @returns {Object} Analysis results
 */
function analyzeCustomerInvoices(invoices) {
  const summary = {
    totalInvoices: invoices.length,
    totalRevenue: 0,
    unpaidInvoices: [],
  }

  if (!invoices || invoices.length === 0) {
    return { summary }
  }

  invoices.forEach((invoice) => {
    const total = parseFloat(invoice.Total) || 0
    const balance = parseFloat(invoice.Balance) || 0
    summary.totalRevenue += total

    if (balance > 0) {
      summary.unpaidInvoices.push({
        invoice,
        amount: balance,
        daysOverdue: invoice.DueDate ? Math.floor((new Date() - new Date(invoice.DueDate)) / (1000 * 60 * 60 * 24)) : 0,
      })
    }
  })

  return { summary }
}

/**
 * Main analysis function - analyzes only invoices (supplier and customer)
 * @param {Object} data - Fortnox data object
 * @returns {Object} Complete analysis results
 */
function analyzeCostLeaks(data) {
  const results = {
    timestamp: new Date().toISOString(),
    supplierInvoiceAnalysis: null,
    customerInvoiceAnalysis: null,
    overallSummary: {
      totalFindings: 0,
      totalPotentialSavings: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
    },
  }

  // Analyze supplier invoices (primary cost source)
  if (data.supplierInvoices && data.supplierInvoices.length > 0) {
    results.supplierInvoiceAnalysis = analyzeSupplierInvoices(data.supplierInvoices)
    results.overallSummary.totalFindings += results.supplierInvoiceAnalysis.findings.length
    results.overallSummary.totalPotentialSavings += results.supplierInvoiceAnalysis.summary.totalPotentialSavings || 0
    
    // Count by severity
    results.supplierInvoiceAnalysis.findings.forEach((finding) => {
      if (finding.severity === "high") results.overallSummary.highSeverity++
      else if (finding.severity === "medium") results.overallSummary.mediumSeverity++
      else if (finding.severity === "low") results.overallSummary.lowSeverity++
    })
  }

  // Analyze customer invoices (for comparison)
  if (data.invoices && data.invoices.length > 0) {
    results.customerInvoiceAnalysis = analyzeCustomerInvoices(data.invoices)
  }

  // Subscription analysis is now skipped - only analyzing invoices
  results.subscriptionAnalysis = {
    findings: [],
    insights: {},
    summary: {},
    potentialSavings: 0,
  }

  return results
}

// Analyze subscription usage and optimization opportunities
function analyzeSubscriptionUsage(data) {
  const { invoices, supplierInvoices, expenses, vouchers, accounts, articles } = data
  
  const findings = []
  let potentialSavings = 0
  const insights = {
    totalInvoices: invoices?.length || 0,
    totalSupplierInvoices: supplierInvoices?.length || 0,
    totalExpenses: expenses?.length || 0,
    totalVouchers: vouchers?.length || 0,
    totalAccounts: accounts?.length || 0,
    totalArticles: articles?.length || 0,
    activeFeatures: [],
    unusedFeatures: [],
  }

  // Feature usage analysis
  const hasInvoices = (invoices?.length || 0) > 0
  const hasSupplierInvoices = (supplierInvoices?.length || 0) > 0
  const hasExpenses = (expenses?.length || 0) > 0
  const hasVouchers = (vouchers?.length || 0) > 0
  const hasAccounts = (accounts?.length || 0) > 0
  const hasArticles = (articles?.length || 0) > 0

  // Determine active features - based on actual Fortnox API endpoints
  // These correspond to real Fortnox API: /invoices, /supplierinvoices, /vouchers, /accounts, /articles
  if (hasInvoices) insights.activeFeatures.push("Invoices (Customer)")
  if (hasSupplierInvoices) insights.activeFeatures.push("Supplier Invoices")
  if (hasVouchers) insights.activeFeatures.push("Vouchers (Bookkeeping)")
  if (hasAccounts) insights.activeFeatures.push("Accounts (Chart of Accounts)")
  if (hasArticles) insights.activeFeatures.push("Articles (Products/Inventory)")
  if (hasExpenses) insights.activeFeatures.push("Expenses")

  // Usage patterns analysis
  const invoiceVolume = invoices?.length || 0
  const supplierInvoiceVolume = supplierInvoices?.length || 0
  const totalTransactionVolume = invoiceVolume + supplierInvoiceVolume + (expenses?.length || 0)

  // Low usage detection
  if (totalTransactionVolume < 10 && (hasInvoices || hasSupplierInvoices)) {
    findings.push({
      type: "low_usage",
      severity: "medium",
      title: "Low Transaction Volume",
      description: `You have ${totalTransactionVolume} transactions. Consider if a lower-tier subscription would be sufficient for your current usage.`,
      currentUsage: totalTransactionVolume,
      recommendation: "Review your subscription tier - you may be paying for more capacity than needed",
      potentialSavings: 0, // Can't calculate without subscription pricing
    })
  }

  // High usage - might need upgrade
  if (totalTransactionVolume > 1000) {
    findings.push({
      type: "high_usage",
      severity: "low",
      title: "High Transaction Volume",
      description: `You have ${totalTransactionVolume} transactions. Ensure your subscription tier supports this volume to avoid overage fees.`,
      currentUsage: totalTransactionVolume,
      recommendation: "Consider upgrading to a higher tier if you're experiencing performance issues or overage charges",
      potentialSavings: 0,
    })
  }

  // Unused features detection - based on available Fortnox API endpoints
  // These are real Fortnox API endpoints: /invoices, /supplierinvoices, /vouchers, /accounts, /articles
  const allFeatures = [
    "Invoices (Customer)",
    "Supplier Invoices", 
    "Vouchers (Bookkeeping)",
    "Accounts (Chart of Accounts)",
    "Articles (Products/Inventory)"
  ]
  // Note: /expenses endpoint may not be available in all Fortnox versions
  const unusedFeatures = allFeatures.filter(f => !insights.activeFeatures.includes(f))
  
  if (unusedFeatures.length > 0) {
    insights.unusedFeatures = unusedFeatures
    findings.push({
      type: "unused_features",
      severity: "low",
      title: "Unused Features Detected",
      description: `You're not using ${unusedFeatures.length} feature${unusedFeatures.length > 1 ? 's' : ''}: ${unusedFeatures.join(', ')}. These may be included in your subscription.`,
      unusedFeatures: unusedFeatures,
      recommendation: "Explore these features to maximize your subscription value, or consider if a lower-tier plan without these features would be more cost-effective",
      potentialSavings: 0,
    })
  }

  // Feature utilization score
  const utilizationScore = (insights.activeFeatures.length / allFeatures.length) * 100
  if (utilizationScore < 50) {
    findings.push({
      type: "low_utilization",
      severity: "medium",
      title: "Low Feature Utilization",
      description: `You're only using ${insights.activeFeatures.length} of ${allFeatures.length} available features (${Math.round(utilizationScore)}% utilization).`,
      utilizationScore: Math.round(utilizationScore),
      activeFeatures: insights.activeFeatures,
      recommendation: "Consider exploring additional features to maximize your subscription value, or evaluate if a more basic plan would better fit your needs",
      potentialSavings: 0,
    })
  }

  // Revenue vs costs analysis
  if (hasInvoices && hasSupplierInvoices) {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.Total) || 0), 0)
    const totalCosts = supplierInvoices.reduce((sum, inv) => {
      let total = parseFloat(inv.Total) || 0
      if (total === 0 && inv.SupplierInvoiceRows) {
        total = inv.SupplierInvoiceRows.reduce((s, row) => {
          if (row.Code === "TOT" || row.Code === "TOT ") return s
          return s + (parseFloat(row.Total) || parseFloat(row.Debit) || parseFloat(row.Credit) || 0)
        }, 0)
      }
      return sum + total
    }, 0)
    
    if (totalRevenue > 0 && totalCosts > 0) {
      const profitMargin = ((totalRevenue - totalCosts) / totalRevenue) * 100
      
      if (profitMargin < 10) {
        findings.push({
          type: "low_margin",
          severity: "high",
          title: "Low Profit Margin Detected",
          description: `Your profit margin is ${profitMargin.toFixed(1)}%. This suggests high costs relative to revenue.`,
          profitMargin: profitMargin.toFixed(1),
          totalRevenue: totalRevenue,
          totalCosts: totalCosts,
          recommendation: "Review supplier costs and pricing strategy to improve profitability",
          potentialSavings: 0,
        })
      }
    }
  }

  // Subscription optimization summary
  const summary = {
    utilizationScore: Math.round(utilizationScore),
    activeFeaturesCount: insights.activeFeatures.length,
    totalFeaturesCount: allFeatures.length,
    transactionVolume: totalTransactionVolume,
    recommendations: findings.length,
  }

  return {
    findings,
    insights,
    summary,
    potentialSavings,
  }
}

module.exports = {
  analyzeCostLeaks,
  analyzeSupplierInvoices,
  analyzeCustomerInvoices,
}

