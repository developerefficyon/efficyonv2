/**
 * Visma eAccounting cost-leak analysis service.
 *
 * Mirrors the Fortnox analyzer (services/fortnoxCostLeakAnalysis.js) — same
 * five supplier-invoice checks plus one customer-invoice check — but adapted
 * to eAccounting's v2 field names and currency model.
 *
 * Field-name mapping (Visma eAccounting v2 → analyzer):
 *   SupplierInvoice.Total / TotalAmount       → invoice total
 *   SupplierInvoice.RemainingAmount           → unpaid balance
 *   SupplierInvoice.IsBookkept                → finalized in books
 *   SupplierInvoice.SupplierId / SupplierName → supplier identity
 *   SupplierInvoice.InvoiceDate / DueDate     → dating
 *   CustomerInvoice.TotalAmount               → invoice total
 *   CustomerInvoice.RemainingAmount           → outstanding receivable
 *   CustomerInvoice.InvoiceCustomerName       → customer display name
 *
 * Currency: Visma's home currency varies by market (SEK, NOK, DKK, EUR).
 * Caller passes the company's home currency; we convert all monetary fields
 * to USD via Frankfurter (cached 24h, falls back to hardcoded rates if the
 * lookup fails).
 *
 * Findings:
 *   - duplicate_payment            (high)     same supplier, same amount, ≤30 days apart
 *   - unusual_amount               (medium)   > μ + 2σ AND > 1.5×μ
 *   - recurring_subscription       (low)      ≥3 invoices, ±10% amount, regular interval (≥7d)
 *   - overdue_invoice              (medium)   past DueDate AND RemainingAmount > 0 OR not bookkept
 *   - price_increase               (medium)   first vs latest invoice for a supplier > 20%
 *   - overdue_customer_invoice     (variable) past DueDate AND RemainingAmount > 0
 */

const crypto = require("crypto")
const { getRateToUsd, FALLBACK_RATES_TO_USD } = require("../utils/currency")

function generateFindingHash(finding) {
  const key = `${finding.type}:${finding.title}:${finding.description || ""}`
  return crypto.createHash("md5").update(key).digest("hex")
}

let RATE_TO_USD = 1.0
let HOME_CURRENCY = "USD"

function formatNativeAsUsd(amount) {
  const usd = Math.round((amount || 0) * RATE_TO_USD)
  return `$${usd.toLocaleString("en-US")}`
}

function formatRawAmount(amount) {
  return `$${Math.round(amount || 0).toLocaleString("en-US")}`
}

function isLikelyTimestamp(val) {
  if (!val || typeof val !== "string") return false
  return /^\d{4}-\d{2}-\d{2}(T|\s)/.test(val)
}

function rowsTotal(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0
  return rows.reduce((sum, row) => {
    const lineTotal =
      parseFloat(row.LineTotal) ||
      parseFloat(row.Amount) ||
      parseFloat(row.Total) ||
      ((parseFloat(row.UnitPrice) || 0) * (parseFloat(row.Quantity) || 0)) ||
      0
    return sum + Math.abs(lineTotal)
  }, 0)
}

function readSupplierInvoiceTotal(invoice) {
  const candidates = [
    invoice.Total,
    invoice.TotalAmount,
    invoice.TotalRoundedAmount,
    invoice.GrossAmount,
    invoice.RemainingAmount,
  ]
  for (const c of candidates) {
    const num = parseFloat(c)
    if (num && num > 0) return num
  }
  return rowsTotal(invoice.Rows)
}

function readCustomerInvoiceTotal(invoice) {
  const candidates = [
    invoice.TotalAmount,
    invoice.TotalRoundedAmount,
    invoice.Total,
    invoice.GrossAmount,
  ]
  for (const c of candidates) {
    const num = parseFloat(c)
    if (num && num > 0) return num
  }
  return rowsTotal(invoice.Rows)
}

function isSupplierInvoiceUnpaid(invoice) {
  const remaining = parseFloat(invoice.RemainingAmount)
  if (!Number.isNaN(remaining) && remaining > 0) return true
  // No RemainingAmount and not bookkept → still unpaid in Visma's model.
  if (invoice.IsBookkept === false || invoice.IsBookkept === "false") return true
  return false
}

function pickSupplierKey(invoice) {
  return (
    invoice.SupplierId ||
    invoice.SupplierNumber ||
    invoice.supplierId ||
    invoice.supplierNumber ||
    null
  )
}

function pickSupplierName(invoice) {
  let name =
    invoice.SupplierName ||
    invoice.supplierName ||
    invoice.SuppliersName ||
    "Unknown"
  if (isLikelyTimestamp(name)) name = "Unknown"
  return name
}

function pickInvoiceDate(invoice) {
  return invoice.InvoiceDate || invoice.invoiceDate || invoice.CreatedUtc || null
}

function pickDueDate(invoice) {
  return invoice.DueDate || invoice.dueDate || null
}

// --------------------------------------------------------------------------
// Supplier-invoice checks
// --------------------------------------------------------------------------
function analyzeSupplierInvoices(supplierInvoices, options = {}) {
  const fmt = options.fromFileUpload ? formatRawAmount : formatNativeAsUsd
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

  const invoicesBySupplier = {}
  const invoicesByAmount = {}

  supplierInvoices.forEach((invoice) => {
    const supplierKey = pickSupplierKey(invoice)
    const supplierName = pickSupplierName(invoice)
    const invoiceTotal = readSupplierInvoiceTotal(invoice)
    summary.totalAmount += invoiceTotal

    if (supplierKey != null) {
      if (!invoicesBySupplier[supplierKey]) {
        invoicesBySupplier[supplierKey] = {
          supplierKey,
          supplierName,
          invoices: [],
          totalAmount: 0,
          count: 0,
        }
      }
      invoicesBySupplier[supplierKey].invoices.push({ ...invoice, calculatedTotal: invoiceTotal })
      invoicesBySupplier[supplierKey].totalAmount += invoiceTotal
      invoicesBySupplier[supplierKey].count += 1
    }

    if (invoiceTotal > 0) {
      const amountKey = Math.round(invoiceTotal)
      if (!invoicesByAmount[amountKey]) invoicesByAmount[amountKey] = []
      invoicesByAmount[amountKey].push({
        ...invoice,
        calculatedTotal: invoiceTotal,
        supplierKey,
        supplierName,
      })
    }
  })

  // 1. Duplicate payments — same supplier, same rounded amount, ≤30 days apart
  Object.values(invoicesByAmount).forEach((bucket) => {
    if (bucket.length < 2) return
    const grouped = {}
    bucket.forEach((inv) => {
      const key = String(inv.supplierKey || "")
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(inv)
    })
    Object.entries(grouped).forEach(([key, group]) => {
      if (!key || group.length < 2) return
      group.sort((a, b) => new Date(pickInvoiceDate(a)) - new Date(pickInvoiceDate(b)))
      for (let i = 0; i < group.length - 1; i++) {
        const a = group[i]
        const b = group[i + 1]
        const da = new Date(pickInvoiceDate(a))
        const db = new Date(pickInvoiceDate(b))
        if (isNaN(da) || isNaN(db)) continue
        const days = Math.abs((db - da) / 86400000)
        if (days > 30) continue
        const finding = {
          type: "duplicate_payment",
          severity: "high",
          title: "Potential Duplicate Payment",
          description: `Same supplier (${a.supplierName}), same amount (${fmt(a.calculatedTotal)}), within ${Math.round(days)} days`,
          invoices: [a, b],
          amount: a.calculatedTotal,
          potentialSavings: a.calculatedTotal,
          effort: "medium",
          impact: "high",
          actionSteps: [
            "Compare the two invoices side-by-side (numbers, dates, line items)",
            "Check if both invoices have been paid or only one is bookkept",
            "Contact the supplier to confirm whether this is a genuine duplicate",
            "If confirmed duplicate, request a credit note or refund from the supplier",
            "Mark the duplicate invoice as cancelled in Visma to prevent future payment",
          ],
        }
        finding.findingHash = generateFindingHash(finding)
        summary.duplicatePayments.push(finding)
      }
    })
  })

  // 2. Unusual amounts — > μ + 2σ AND > 1.5×μ
  const positiveAmounts = supplierInvoices
    .map(readSupplierInvoiceTotal)
    .filter((n) => n > 0)
  if (positiveAmounts.length > 0) {
    const mean = positiveAmounts.reduce((a, b) => a + b, 0) / positiveAmounts.length
    const variance = positiveAmounts.reduce((s, n) => s + (n - mean) ** 2, 0) / positiveAmounts.length
    const stdDev = Math.sqrt(variance)
    const threshold = mean + 2 * stdDev
    supplierInvoices.forEach((invoice) => {
      const total = readSupplierInvoiceTotal(invoice)
      if (total > threshold && total > mean * 1.5) {
        const finding = {
          type: "unusual_amount",
          severity: "medium",
          title: "Unusually High Invoice Amount",
          description: `Invoice amount (${fmt(total)}) is significantly higher than average (${fmt(mean)})`,
          invoice,
          amount: total,
          averageAmount: mean,
          deviation: ((total - mean) / mean * 100).toFixed(1) + "%",
          effort: "low",
          impact: "medium",
          actionSteps: [
            "Review the invoice rows to verify all charges are correct",
            "Compare with previous invoices from the same supplier for price changes",
            "Check if this is a one-time expense or indicates a pricing trend",
            "Contact the supplier to clarify any unexpected charges",
            "Approve or dispute the invoice based on your review",
          ],
        }
        finding.findingHash = generateFindingHash(finding)
        summary.unusualAmounts.push(finding)
      }
    })
  }

  // 3. Recurring subscriptions — ≥3 invoices clustered within ±10% on regular intervals (≥7 days)
  Object.values(invoicesBySupplier).forEach((supplier) => {
    if (!supplier.supplierName || supplier.supplierName === "Unknown" || isLikelyTimestamp(supplier.supplierName)) return
    if (supplier.count < 3) return

    const dated = supplier.invoices
      .filter((inv) => {
        if (inv.calculatedTotal <= 0) return false
        const d = new Date(pickInvoiceDate(inv))
        return !isNaN(d.getTime())
      })
      .sort((a, b) => new Date(pickInvoiceDate(a)) - new Date(pickInvoiceDate(b)))

    const clusters = []
    const assigned = new Set()
    for (let i = 0; i < dated.length; i++) {
      if (assigned.has(i)) continue
      const cluster = [dated[i]]
      assigned.add(i)
      const ref = dated[i].calculatedTotal
      for (let j = i + 1; j < dated.length; j++) {
        if (assigned.has(j)) continue
        if (Math.abs(dated[j].calculatedTotal - ref) / ref <= 0.1) {
          cluster.push(dated[j])
          assigned.add(j)
        }
      }
      if (cluster.length >= 3) clusters.push(cluster)
    }

    clusters.forEach((cluster) => {
      const avgAmount = cluster.reduce((s, c) => s + c.calculatedTotal, 0) / cluster.length
      const intervals = []
      for (let i = 0; i < cluster.length - 1; i++) {
        const d1 = new Date(pickInvoiceDate(cluster[i]))
        const d2 = new Date(pickInvoiceDate(cluster[i + 1]))
        intervals.push(Math.abs((d2 - d1) / 86400000))
      }
      if (!intervals.length) return
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const isRegular = intervals.every((iv) => Math.abs(iv - avgInterval) <= 5)
      if (!isRegular || avgInterval < 7) return
      const finding = {
        type: "recurring_subscription",
        severity: "low",
        title: "Recurring Subscription Detected",
        description: `Regular payments to ${supplier.supplierName} (~${fmt(avgAmount)} every ${Math.round(avgInterval)} days)`,
        supplier: { number: supplier.supplierKey, name: supplier.supplierName },
        invoices: cluster,
        averageAmount: avgAmount,
        frequency: Math.round(avgInterval) + " days",
        totalAmount: cluster.reduce((s, c) => s + c.calculatedTotal, 0),
        potentialSavings: avgAmount,
        effort: "low",
        impact: "medium",
        actionSteps: [
          "Verify this subscription is still actively needed by the team",
          "Check if there are cheaper alternatives or if you can negotiate a better rate",
          "Review the contract terms for cancellation policy and renewal dates",
          "If no longer needed, cancel the subscription and update Visma accordingly",
        ],
      }
      finding.findingHash = generateFindingHash(finding)
      summary.recurringSubscriptions.push(finding)
    })
  })

  // 4. Overdue supplier invoices
  const today = new Date()
  supplierInvoices.forEach((invoice) => {
    const due = pickDueDate(invoice)
    if (!due) return
    if (!isSupplierInvoiceUnpaid(invoice)) return
    const dueDate = new Date(due)
    if (isNaN(dueDate.getTime())) return
    if (dueDate >= today) return
    const daysOverdue = Math.floor((today - dueDate) / 86400000)
    const total = readSupplierInvoiceTotal(invoice)
    const finding = {
      type: "overdue_invoice",
      severity: "medium",
      title: "Overdue Invoice",
      description: `Invoice is ${daysOverdue} days overdue`,
      invoice,
      daysOverdue,
      amount: total,
      potentialCost: total * 0.02,
      effort: "low",
      impact: daysOverdue > 60 ? "high" : "medium",
      actionSteps: [
        "Verify the invoice is legitimate and has not already been paid",
        "Check if the supplier has sent payment reminders or late fee notices",
        "Process the payment immediately to avoid additional late fees",
        "Set up a payment reminder or auto-pay for this supplier to prevent future overdue invoices",
        "Update the invoice status in Visma after payment is made",
      ],
    }
    finding.findingHash = generateFindingHash(finding)
    summary.overdueInvoices.push(finding)
  })

  // 5. Price increases
  Object.values(invoicesBySupplier).forEach((supplier) => {
    if (supplier.count < 2) return
    const sorted = supplier.invoices.sort(
      (a, b) => new Date(pickInvoiceDate(a)) - new Date(pickInvoiceDate(b)),
    )
    const first = sorted[0].calculatedTotal
    const last = sorted[sorted.length - 1].calculatedTotal
    if (first <= 0 || last <= 0) return
    const increase = ((last - first) / first) * 100
    if (increase <= 20) return
    const finding = {
      type: "price_increase",
      severity: "medium",
      title: "Significant Price Increase",
      description: `Price increased by ${increase.toFixed(1)}% for ${supplier.supplierName}`,
      supplier: { number: supplier.supplierKey, name: supplier.supplierName },
      firstInvoice: sorted[0],
      lastInvoice: sorted[sorted.length - 1],
      increasePercent: increase.toFixed(1),
      amountIncrease: last - first,
      effort: "medium",
      impact: "medium",
      actionSteps: [
        "Review the price history to understand the trend and timing of increases",
        "Contact the supplier to request justification for the price increase",
        "Research alternative suppliers or negotiate a volume discount",
        "If the increase is unjustified, request a price match or switch suppliers",
        "Update your budget forecasts to reflect the new pricing",
      ],
    }
    finding.findingHash = generateFindingHash(finding)
    summary.priceIncreases.push(finding)
  })

  findings.push(...summary.duplicatePayments)
  findings.push(...summary.unusualAmounts)
  findings.push(...summary.recurringSubscriptions)
  findings.push(...summary.overdueInvoices)
  findings.push(...summary.priceIncreases)

  summary.totalPotentialSavings =
    summary.duplicatePayments.reduce((s, f) => s + (f.potentialSavings || 0), 0) +
    summary.recurringSubscriptions.reduce((s, f) => s + (f.potentialSavings || 0), 0) +
    summary.overdueInvoices.reduce((s, f) => s + (f.potentialCost || 0), 0)
  summary.findingsCount = findings.length

  return { findings, summary }
}

// --------------------------------------------------------------------------
// Customer-invoice analyzer (overdue receivables)
// --------------------------------------------------------------------------
function analyzeCustomerInvoices(invoices, options = {}) {
  const fmt = options.fromFileUpload ? formatRawAmount : formatNativeAsUsd
  const findings = []
  const summary = {
    totalInvoices: invoices.length,
    totalRevenue: 0,
    unpaidInvoices: [],
    totalUnpaidAmount: 0,
  }

  if (!invoices || invoices.length === 0) return { findings, summary }
  const today = new Date()

  invoices.forEach((invoice) => {
    const total = readCustomerInvoiceTotal(invoice)
    summary.totalRevenue += total
    const remaining = parseFloat(invoice.RemainingAmount) || 0
    if (remaining <= 0) return
    const due = pickDueDate(invoice)
    const daysOverdue = due ? Math.floor((today - new Date(due)) / 86400000) : 0
    summary.unpaidInvoices.push({ invoice, amount: remaining, daysOverdue })
    summary.totalUnpaidAmount += remaining
    if (daysOverdue > 0) {
      const customerName = invoice.InvoiceCustomerName || invoice.CustomerName || "Unknown Customer"
      const docNumber = invoice.InvoiceNumber || invoice.DocumentNumber || invoice.Id || "N/A"
      const severity = daysOverdue > 60 ? "high" : daysOverdue > 30 ? "medium" : "low"
      const finding = {
        type: "overdue_customer_invoice",
        severity,
        title: "Overdue Customer Invoice",
        description: `Invoice #${docNumber} from ${customerName} is ${daysOverdue} days overdue with ${fmt(remaining)} outstanding`,
        invoice,
        amount: remaining,
        daysOverdue,
        customerName,
        revenueAtRisk: remaining,
        effort: "low",
        impact: daysOverdue > 60 ? "high" : "medium",
        actionSteps: [
          "Send a payment reminder to the customer with the outstanding invoice details",
          "Follow up with a phone call if the customer has not responded within 7 days",
          "Review the customer's payment history for patterns of late payment",
          "Consider offering a payment plan if the amount is significant",
          "Escalate to collections or adjust credit terms if payment remains outstanding",
        ],
      }
      finding.findingHash = generateFindingHash(finding)
      findings.push(finding)
    }
  })

  return { findings, summary }
}

// --------------------------------------------------------------------------
// Main entry — refreshes the home-currency rate, runs both analyzers, and
// converts amounts to USD on the way out (unless fromFileUpload skips it).
// --------------------------------------------------------------------------
async function analyzeVismaCostLeaks(data, options = {}) {
  const homeCurrency = (options.homeCurrency || data.homeCurrency || "SEK").toUpperCase()
  HOME_CURRENCY = homeCurrency
  RATE_TO_USD = options.fromFileUpload ? 1 : await getRateToUsd(homeCurrency)

  const results = {
    timestamp: new Date().toISOString(),
    supplierInvoiceAnalysis: null,
    customerInvoiceAnalysis: null,
    overallSummary: {
      totalFindings: 0,
      totalPotentialSavings: 0,
      totalRevenueAtRisk: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
    },
    homeCurrency,
    exchangeRate: RATE_TO_USD,
    convertedFrom: homeCurrency === "USD" || options.fromFileUpload ? null : homeCurrency,
    fallbackRateUsed: !FALLBACK_RATES_TO_USD[homeCurrency] && homeCurrency !== "USD",
  }

  if (Array.isArray(data.supplierInvoices) && data.supplierInvoices.length > 0) {
    results.supplierInvoiceAnalysis = analyzeSupplierInvoices(data.supplierInvoices, options)
    results.overallSummary.totalFindings += results.supplierInvoiceAnalysis.findings.length
    results.overallSummary.totalPotentialSavings += results.supplierInvoiceAnalysis.summary.totalPotentialSavings || 0
    results.supplierInvoiceAnalysis.findings.forEach((f) => {
      if (f.severity === "high") results.overallSummary.highSeverity++
      else if (f.severity === "medium") results.overallSummary.mediumSeverity++
      else if (f.severity === "low") results.overallSummary.lowSeverity++
    })
  }

  if (Array.isArray(data.invoices) && data.invoices.length > 0) {
    results.customerInvoiceAnalysis = analyzeCustomerInvoices(data.invoices, options)
    results.overallSummary.totalFindings += results.customerInvoiceAnalysis.findings.length
    results.overallSummary.totalRevenueAtRisk = results.customerInvoiceAnalysis.findings.reduce(
      (s, f) => s + (f.revenueAtRisk || 0),
      0,
    )
    results.customerInvoiceAnalysis.findings.forEach((f) => {
      if (f.severity === "high") results.overallSummary.highSeverity++
      else if (f.severity === "medium") results.overallSummary.mediumSeverity++
      else if (f.severity === "low") results.overallSummary.lowSeverity++
    })
  }

  return results
}

// Apply the home-currency → USD conversion to a finalized analysis result so
// the controller can ship USD-denominated numbers to the frontend.
function convertAnalysisToUsd(analysis) {
  if (!analysis || analysis.exchangeRate == null) return analysis
  const rate = analysis.exchangeRate
  const conv = (n) => Math.round((Number(n) || 0) * rate * 100) / 100

  if (analysis.overallSummary) {
    analysis.overallSummary.totalPotentialSavings = conv(analysis.overallSummary.totalPotentialSavings)
    analysis.overallSummary.totalRevenueAtRisk = conv(analysis.overallSummary.totalRevenueAtRisk)
  }
  if (analysis.supplierInvoiceAnalysis) {
    analysis.supplierInvoiceAnalysis.findings = (analysis.supplierInvoiceAnalysis.findings || []).map((f) => ({
      ...f,
      amount: conv(f.amount),
      potentialSavings: conv(f.potentialSavings),
      potentialCost: conv(f.potentialCost),
      averageAmount: conv(f.averageAmount),
      amountIncrease: conv(f.amountIncrease),
      totalAmount: conv(f.totalAmount),
    }))
    if (analysis.supplierInvoiceAnalysis.summary) {
      analysis.supplierInvoiceAnalysis.summary.totalAmount = conv(analysis.supplierInvoiceAnalysis.summary.totalAmount)
      analysis.supplierInvoiceAnalysis.summary.totalPotentialSavings = conv(analysis.supplierInvoiceAnalysis.summary.totalPotentialSavings)
    }
  }
  if (analysis.customerInvoiceAnalysis) {
    analysis.customerInvoiceAnalysis.findings = (analysis.customerInvoiceAnalysis.findings || []).map((f) => ({
      ...f,
      amount: conv(f.amount),
      revenueAtRisk: conv(f.revenueAtRisk),
    }))
    if (analysis.customerInvoiceAnalysis.summary) {
      analysis.customerInvoiceAnalysis.summary.totalRevenue = conv(analysis.customerInvoiceAnalysis.summary.totalRevenue)
      analysis.customerInvoiceAnalysis.summary.totalUnpaidAmount = conv(analysis.customerInvoiceAnalysis.summary.totalUnpaidAmount)
    }
  }
  analysis.currency = "USD"
  return analysis
}

module.exports = {
  analyzeVismaCostLeaks,
  analyzeSupplierInvoices,
  analyzeCustomerInvoices,
  convertAnalysisToUsd,
  generateFindingHash,
}
