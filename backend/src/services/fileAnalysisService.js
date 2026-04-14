/**
 * File Analysis Service
 * Orchestrates: parse file → detect schema → run analysis engine → format for AI
 */

const { detectDataSchema, mapToAnalysisFormat } = require("./fileParsingService")
const { analyzeCostLeaks } = require("./costLeakAnalysis")
const { analyzeM365CostLeaks } = require("./microsoft365CostLeakAnalysis")
const { analyzeHubSpotCostLeaks } = require("./hubspotCostLeakAnalysis")

/* ------------------------------------------------------------------ */
/*  Main Orchestrator                                                  */
/* ------------------------------------------------------------------ */

/**
 * Analyze an uploaded file using the best-matching analysis engine
 * @param {Object} parsedFile - Output from parseUploadedFile()
 * @param {string} fileName - Original filename
 * @param {string} [userHint] - Optional hint from user message (e.g. "fortnox invoices")
 * @returns {Object} { schema, analysis, rawDataSummary, fileName, rowCount }
 */
async function analyzeUploadedFile(parsedFile, fileName, userHint) {
  // Get all rows from first sheet (Excel) or extracted tables (PDF)
  const rows = getRows(parsedFile)
  const rowCount = rows.length

  // Detect schema
  let detection = detectDataSchema(parsedFile)

  // User hint can override schema if confidence is low
  if (userHint && detection.confidence < 0.5) {
    const hintSchema = detectSchemaFromHint(userHint)
    if (hintSchema) {
      detection = { ...detection, detectedSchema: hintSchema }
    }
  }

  const { detectedSchema, columnMapping } = detection

  // Run appropriate analysis
  let analysis = null
  let analysisError = null

  try {
    switch (detectedSchema) {
      case "fortnox": {
        const mapped = mapToAnalysisFormat(rows, "fortnox", columnMapping)
        if (mapped) {
          analysis = await analyzeCostLeaks(mapped, { fromFileUpload: true })
        }
        break
      }

      case "m365":
      case "m365_licenses":
      case "m365_users":
      case "m365_usage": {
        const mapped = mapToAnalysisFormat(rows, detectedSchema, columnMapping)
        if (mapped) {
          analysis = analyzeM365CostLeaks(mapped)
        }
        break
      }

      case "hubspot": {
        const mapped = mapToAnalysisFormat(rows, "hubspot", columnMapping)
        if (mapped) {
          analysis = analyzeHubSpotCostLeaks(mapped.users, mapped.accountInfo)
        }
        break
      }

      case "generic": {
        const mapped = mapToAnalysisFormat(rows, "generic", columnMapping)
        if (mapped) {
          analysis = analyzeGenericCosts(mapped)
        }
        break
      }

      default:
        // Unknown schema — will rely on AI for freeform analysis
        break
    }
  } catch (err) {
    console.error(`[FileAnalysis] Error running ${detectedSchema} analysis:`, err.message)
    analysisError = err.message
  }

  // Build raw data summary for AI context
  const rawDataSummary = buildRawDataSummary(parsedFile, rows, detection)

  return {
    schema: detectedSchema,
    confidence: detection.confidence,
    columnMapping,
    analysis,
    analysisError,
    rawDataSummary,
    fileName,
    rowCount,
    headers: detection.allHeaders,
  }
}

/* ------------------------------------------------------------------ */
/*  Generic Cost Analysis                                              */
/* ------------------------------------------------------------------ */

function analyzeGenericCosts(rows) {
  if (!rows || rows.length === 0) {
    return { findings: [], summary: { totalRows: 0 } }
  }

  const findings = []
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0)

  // Top vendors/suppliers by spend
  const vendorSpend = {}
  for (const row of rows) {
    const vendor = row.vendor || "Unknown"
    vendorSpend[vendor] = (vendorSpend[vendor] || 0) + (row.amount || 0)
  }
  const topVendors = Object.entries(vendorSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount, percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : 0 }))

  // Duplicate detection (same vendor + same amount + close dates)
  const duplicates = []
  const sorted = [...rows].sort((a, b) => (a.vendor || "").localeCompare(b.vendor || ""))
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 20, sorted.length); j++) {
      if (
        sorted[i].vendor === sorted[j].vendor &&
        sorted[i].vendor &&
        sorted[i].amount === sorted[j].amount &&
        sorted[i].amount > 0
      ) {
        // Check date proximity if dates exist
        if (sorted[i].date && sorted[j].date) {
          const daysDiff = Math.abs(new Date(sorted[i].date) - new Date(sorted[j].date)) / (1000 * 60 * 60 * 24)
          if (daysDiff <= 30) {
            duplicates.push({
              vendor: sorted[i].vendor,
              amount: sorted[i].amount,
              dates: [sorted[i].date, sorted[j].date],
              daysBetween: Math.round(daysDiff),
            })
          }
        } else {
          duplicates.push({
            vendor: sorted[i].vendor,
            amount: sorted[i].amount,
          })
        }
      }
    }
  }

  if (duplicates.length > 0) {
    const dupTotal = duplicates.reduce((sum, d) => sum + d.amount, 0)
    findings.push({
      type: "duplicate_payment",
      severity: duplicates.length > 3 ? "high" : "medium",
      title: `${duplicates.length} Potential Duplicate Payment${duplicates.length > 1 ? "s" : ""}`,
      description: `Found ${duplicates.length} possible duplicate entries totaling $${dupTotal.toLocaleString()}`,
      potentialSavings: dupTotal,
      details: duplicates.slice(0, 10),
    })
  }

  // Outlier detection (amounts > mean + 2 std dev)
  const amounts = rows.map((r) => r.amount).filter((a) => a > 0)
  if (amounts.length > 5) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length)
    const threshold = mean + 2 * stdDev

    const outliers = rows.filter((r) => r.amount > threshold)
    if (outliers.length > 0) {
      findings.push({
        type: "unusual_amount",
        severity: "medium",
        title: `${outliers.length} Unusually Large Transaction${outliers.length > 1 ? "s" : ""}`,
        description: `${outliers.length} transactions exceed $${Math.round(threshold).toLocaleString()} (mean + 2σ)`,
        details: outliers.slice(0, 10).map((r) => ({
          vendor: r.vendor,
          amount: r.amount,
          date: r.date,
          description: r.description,
        })),
      })
    }
  }

  // Spending by category (if categories exist)
  const categorySpend = {}
  for (const row of rows) {
    if (row.category) {
      categorySpend[row.category] = (categorySpend[row.category] || 0) + (row.amount || 0)
    }
  }
  const categoryBreakdown = Object.entries(categorySpend)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount, percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : 0 }))

  // Monthly spending trends (if dates exist)
  const monthlySpend = {}
  for (const row of rows) {
    if (row.date) {
      const d = new Date(row.date)
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthlySpend[key] = (monthlySpend[key] || 0) + (row.amount || 0)
      }
    }
  }
  const monthlyTrends = Object.entries(monthlySpend)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount }))

  return {
    findings,
    summary: {
      totalRows: rows.length,
      totalAmount,
      uniqueVendors: Object.keys(vendorSpend).length,
      averageAmount: amounts.length > 0 ? totalAmount / amounts.length : 0,
      duplicateCount: duplicates.length,
      potentialSavings: findings.reduce((sum, f) => sum + (f.potentialSavings || 0), 0),
    },
    topVendors,
    categoryBreakdown,
    monthlyTrends,
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRows(parsedFile) {
  // Excel: use first sheet's rows
  if (parsedFile.sheets && parsedFile.sheets.length > 0) {
    return parsedFile.sheets[0].rows || []
  }
  // PDF: use first extracted table's rows
  if (parsedFile.extractedTables && parsedFile.extractedTables.length > 0) {
    return parsedFile.extractedTables[0].rows || []
  }
  return []
}

function detectSchemaFromHint(hint) {
  const h = hint.toLowerCase()
  if (h.includes("fortnox") || h.includes("supplier invoice") || h.includes("leverantör")) return "fortnox"
  if (h.includes("microsoft") || h.includes("m365") || h.includes("office 365") || h.includes("license")) return "m365"
  if (h.includes("hubspot") || h.includes("hub spot") || h.includes("crm")) return "hubspot"
  return null
}

function buildRawDataSummary(parsedFile, rows, detection) {
  const lines = []

  if (parsedFile.type === "excel" && parsedFile.sheets) {
    lines.push(`Excel file with ${parsedFile.sheets.length} sheet(s)`)
    for (const sheet of parsedFile.sheets) {
      lines.push(`  Sheet "${sheet.name}": ${sheet.rowCount} rows, columns: ${sheet.headers.join(", ")}`)
      if (sheet.truncated) {
        lines.push(`  (truncated to ${rows.length} rows)`)
      }
    }
  } else if (parsedFile.type === "csv") {
    lines.push(`CSV file with ${parsedFile.sheets?.[0]?.rowCount || 0} rows`)
    if (parsedFile.sheets?.[0]?.headers) {
      lines.push(`  Columns: ${parsedFile.sheets[0].headers.join(", ")}`)
    }
  } else if (parsedFile.type === "pdf") {
    lines.push(`PDF file with ${parsedFile.pages || 0} pages`)
    if (parsedFile.extractedTables?.length > 0) {
      lines.push(`  Extracted ${parsedFile.extractedTables.length} table(s)`)
    }
    if (parsedFile.rawText) {
      lines.push(`  Text length: ${parsedFile.rawText.length} characters`)
    }
  } else if (parsedFile.type === "image") {
    lines.push(`Image file (OCR/vision extracted)`)
    if (parsedFile.extractedTables?.length > 0) {
      lines.push(`  Extracted ${parsedFile.extractedTables.length} table(s)`)
      for (const table of parsedFile.extractedTables) {
        lines.push(`  Table: ${table.rowCount} rows, columns: ${table.headers.join(", ")}`)
      }
    }
  }

  lines.push(`\nDetected schema: ${detection.detectedSchema} (confidence: ${(detection.confidence * 100).toFixed(0)}%)`)
  lines.push(`Column mapping: ${JSON.stringify(detection.columnMapping)}`)

  // Add sample data (first 5 rows)
  if (rows.length > 0) {
    lines.push(`\nSample data (first ${Math.min(5, rows.length)} of ${rows.length} rows):`)
    for (const row of rows.slice(0, 5)) {
      lines.push(`  ${JSON.stringify(row)}`)
    }
  }

  // For PDF, include raw text excerpt
  if (parsedFile.type === "pdf" && parsedFile.rawText) {
    const excerpt = parsedFile.rawText.substring(0, 2000)
    lines.push(`\nPDF text excerpt:\n${excerpt}`)
  }

  return lines.join("\n")
}

module.exports = { analyzeUploadedFile }
