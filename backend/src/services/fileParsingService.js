/**
 * File Parsing Service
 * Parses uploaded Excel, CSV, PDF, and image files, detects data schema,
 * and maps data to analysis engine formats.
 */

const XLSX = require("xlsx")
const { PDFParse } = require("pdf-parse")
const axios = require("axios")

const MAX_ROWS_PER_SHEET = 10000

/* ------------------------------------------------------------------ */
/*  Main Entry                                                         */
/* ------------------------------------------------------------------ */

/**
 * Parse an uploaded file (Excel or PDF) from base64
 * @param {string} fileBase64 - Base64-encoded file content
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @returns {{ type: string, sheets?: Array, rawText?: string, pages?: number, error?: string }}
 */
function parseUploadedFile(fileBase64, fileName, mimeType) {
  const buffer = Buffer.from(fileBase64, "base64")
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase()

  if (ext === ".xlsx" || ext === ".xls" || mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) {
    return { type: "excel", ...parseExcelFile(buffer) }
  }

  if (ext === ".csv" || mimeType === "text/csv" || mimeType === "text/plain") {
    return { type: "csv", ...parseCsvFile(buffer) }
  }

  if (ext === ".pdf" || mimeType === "application/pdf") {
    // pdf-parse is async
    return parsePdfFile(buffer).then((result) => ({ type: "pdf", ...result }))
  }

  if ([".jpeg", ".jpg", ".png"].includes(ext) || mimeType?.startsWith("image/")) {
    // Vision API is async
    return parseImageFile(fileBase64, fileName, mimeType)
  }

  return { type: "unknown", error: `Unsupported file type: ${ext}` }
}

/* ------------------------------------------------------------------ */
/*  Excel Parsing                                                      */
/* ------------------------------------------------------------------ */

function parseExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const sheets = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

    // Enforce row limit
    const limitedRows = rows.slice(0, MAX_ROWS_PER_SHEET)
    const headers = limitedRows.length > 0 ? Object.keys(limitedRows[0]) : []

    sheets.push({
      name: sheetName,
      headers,
      rows: limitedRows,
      rowCount: rows.length,
      truncated: rows.length > MAX_ROWS_PER_SHEET,
    })
  }

  return { sheets }
}

/* ------------------------------------------------------------------ */
/*  PDF Parsing                                                        */
/* ------------------------------------------------------------------ */

async function parsePdfFile(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  await parser.load()
  const textResult = await parser.getText()
  const rawText = (textResult && textResult.text) || ""
  const pages = (textResult && textResult.total) || 0
  await parser.destroy()

  // Detect scanned PDFs (very little extractable text)
  if (rawText.trim().length < 50) {
    return {
      rawText,
      pages,
      isScannedPdf: true,
      error: "This PDF appears to be scanned/image-based. Please upload a text-based PDF or convert the data to Excel.",
    }
  }

  // Try Fortnox Resultatrapport (P&L) parsing first — it has a known structure
  const plResult = parseResultatrapport(rawText)
  if (plResult) {
    return { rawText, pages, extractedTables: [plResult], isResultatrapport: true }
  }

  // Try to extract tabular data from text
  const extractedTables = extractTablesFromText(rawText)

  return { rawText, pages, extractedTables }
}

/**
 * Attempt to extract tabular data from PDF text
 * Looks for lines with consistent delimiters (tabs, multiple spaces, pipes)
 */
function extractTablesFromText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Try tab-delimited
  const tabLines = lines.filter((l) => l.includes("\t"))
  if (tabLines.length > 1) {
    return parseDelimitedLines(tabLines, "\t")
  }

  // Try pipe-delimited
  const pipeLines = lines.filter((l) => l.includes("|"))
  if (pipeLines.length > 1) {
    return parseDelimitedLines(pipeLines, "|")
  }

  // Try multi-space delimited (common in PDF tables)
  const multiSpaceLines = lines.filter((l) => /\s{2,}/.test(l))
  if (multiSpaceLines.length > 2) {
    return parseDelimitedLines(multiSpaceLines, /\s{2,}/)
  }

  return []
}

function parseDelimitedLines(lines, delimiter) {
  const tables = []
  const headers = lines[0].split(delimiter).map((h) => h.trim()).filter(Boolean)
  const rows = []

  for (let i = 1; i < Math.min(lines.length, MAX_ROWS_PER_SHEET + 1); i++) {
    const cells = lines[i].split(delimiter).map((c) => c.trim()).filter(Boolean)
    if (cells.length >= headers.length * 0.5) {
      const row = {}
      headers.forEach((h, idx) => {
        const val = cells[idx] || null
        row[h] = isNumericString(val) ? parseFloat(val.replace(/[,\s]/g, "")) : val
      })
      rows.push(row)
    }
  }

  if (rows.length > 0) {
    tables.push({ headers, rows, rowCount: rows.length })
  }

  return tables
}

function isNumericString(val) {
  if (!val || typeof val !== "string") return false
  return /^-?[\d,\s]+\.?\d*$/.test(val.replace(/\s/g, ""))
}

/* ------------------------------------------------------------------ */
/*  CSV Parsing                                                        */
/* ------------------------------------------------------------------ */

function parseCsvFile(buffer) {
  // xlsx library can read CSV files natively
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
  const limitedRows = rows.slice(0, MAX_ROWS_PER_SHEET)
  const headers = limitedRows.length > 0 ? Object.keys(limitedRows[0]) : []

  return {
    sheets: [{
      name: "CSV",
      headers,
      rows: limitedRows,
      rowCount: rows.length,
      truncated: rows.length > MAX_ROWS_PER_SHEET,
    }],
  }
}

/* ------------------------------------------------------------------ */
/*  Image Parsing (via Vision API)                                     */
/* ------------------------------------------------------------------ */

async function parseImageFile(fileBase64, fileName, mimeType) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
  const VISION_MODEL = process.env.VISION_MODEL || "anthropic/claude-sonnet-4-5"

  if (!OPENROUTER_API_KEY) {
    return {
      type: "image",
      error: "Vision API not configured. Set OPENROUTER_API_KEY in your backend .env to enable image parsing.",
      extractedTables: [],
    }
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: VISION_MODEL,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || "image/jpeg"};base64,${fileBase64}`,
              },
            },
            {
              type: "text",
              text: `Extract all tabular data from this image. Return a JSON object with:
- "headers": array of column names
- "rows": array of objects with column names as keys
If there are multiple tables, return an array of such objects.
If no tabular data exists, return { "headers": [], "rows": [], "description": "brief description of the image content" }.
Return ONLY valid JSON, no markdown fences.`,
            },
          ],
        }],
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const content = response.data?.choices?.[0]?.message?.content || ""

    // Try to parse the JSON response
    const cleaned = content.replace(/```json\n?|```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned)
    const tables = Array.isArray(parsed) ? parsed : [parsed]

    return {
      type: "image",
      extractedTables: tables.filter((t) => t.headers?.length > 0).map((t) => ({
        headers: t.headers,
        rows: (t.rows || []).slice(0, MAX_ROWS_PER_SHEET),
        rowCount: (t.rows || []).length,
      })),
      rawText: content,
      pages: 1,
    }
  } catch (err) {
    console.error("[parseImageFile] Vision API error:", err.message)
    return {
      type: "image",
      extractedTables: [],
      error: `Failed to extract data from image: ${err.message}`,
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Schema Detection                                                   */
/* ------------------------------------------------------------------ */

const SCHEMA_KEYWORDS = {
  fortnox: {
    // Exclusive: if ANY of these match, it's almost certainly this schema
    exclusive: ["supplierinvoice", "supplierinvoices", "suppliernumber", "givenumber", "fakturanummer", "leverantörsnummer", "leverantörsnamn"],
    strong: ["supplierinvoice", "supplierinvoices", "suppliernumber", "suppliername", "invoicenumber", "givenumber", "dokumentnummer"],
    medium: ["supplier", "faktura", "leverant", "invoice", "duedate", "due date", "balance", "booked", "invoicedate", "förfallodatum", "fakturadatum"],
    weak: ["total", "amount", "date"],
  },
  m365: {
    exclusive: ["skupartnumber", "skuid", "consumedunits", "prepaidunits", "assignedlicenses", "signinactivity", "userprincipalname"],
    strong: ["skupartnumber", "skuid", "consumedunits", "prepaidunits", "assignedlicenses", "signinactivity"],
    medium: ["license", "licens", "sku", "signin", "sign in", "accountenabled", "userprincipalname"],
    weak: ["displayname"],
  },
  hubspot: {
    exclusive: ["userprovisioningstate", "superadmin", "roleids", "primaryteamid", "lastloginat"],
    strong: ["userprovisioningstate", "superadmin", "roleids", "primaryteamid", "lastloginat"],
    medium: ["hubspot", "provisioning", "roleid", "teamid", "lastlogin", "last login"],
    weak: ["role"],
  },
  profit_loss: {
    exclusive: ["accountcode", "accountname", "previousyear", "groupkey"],
    strong: ["accountcode", "accountname", "accumulated", "previousyear", "groupkey", "category"],
    medium: ["period", "accumulated"],
    weak: [],
  },
  generic: {
    exclusive: [],
    strong: [],
    medium: ["vendor", "cost", "expense", "payment", "category", "department"],
    weak: ["amount", "total", "date", "description", "price"],
  },
}

/**
 * Detect which analysis schema matches the data.
 *
 * Scoring: exclusive match → instant pick (confidence 0.95).
 * Otherwise weighted keyword scoring with margin check — the winner
 * must lead the runner-up by at least 30% of its own score to avoid
 * ambiguous picks.
 *
 * @param {{ sheets?: Array, extractedTables?: Array }} parsedData
 * @returns {{ detectedSchema: string, confidence: number, columnMapping: Object, allHeaders: string[] }}
 */
function detectDataSchema(parsedData) {
  // Fast path: if already identified as a Resultatrapport by the PDF parser
  if (parsedData.isResultatrapport) {
    const source = (parsedData.extractedTables || [])[0] || {}
    const allHeaders = source.headers || []
    const columnMapping = buildColumnMapping(allHeaders, "profit_loss")
    return { detectedSchema: "profit_loss", confidence: 0.95, columnMapping, allHeaders }
  }

  // Gather all headers from sheets or extracted tables
  let allHeaders = []
  const dataSource = parsedData.sheets || parsedData.extractedTables || []

  for (const source of dataSource) {
    if (source.headers) {
      allHeaders = allHeaders.concat(source.headers)
    }
  }

  if (allHeaders.length === 0) {
    return { detectedSchema: "unknown", confidence: 0, columnMapping: {}, allHeaders }
  }

  const headersLower = allHeaders.map((h) => String(h).toLowerCase().replace(/[_\-\s]+/g, ""))

  // 1. Check for exclusive keywords first — instant match
  for (const [schema, keywords] of Object.entries(SCHEMA_KEYWORDS)) {
    if (!keywords.exclusive || keywords.exclusive.length === 0) continue
    const exclusiveHits = headersLower.filter((h) =>
      keywords.exclusive.some((k) => h.includes(k))
    ).length
    if (exclusiveHits >= 1) {
      const columnMapping = buildColumnMapping(allHeaders, schema)
      return { detectedSchema: schema, confidence: 0.95, columnMapping, allHeaders }
    }
  }

  // 2. Weighted keyword scoring (skip weak keywords shared across schemas)
  const scores = {}
  const matchCounts = {}
  for (const [schema, keywords] of Object.entries(SCHEMA_KEYWORDS)) {
    let score = 0
    let matches = 0
    for (const h of headersLower) {
      if (keywords.strong.some((k) => h.includes(k))) { score += 3; matches++ }
      else if (keywords.medium.some((k) => h.includes(k))) { score += 2; matches++ }
      else if (keywords.weak.some((k) => h.includes(k))) { score += 1 }
    }
    scores[schema] = score
    matchCounts[schema] = matches
  }

  // 3. Sort and apply margin check
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [bestSchema, bestScore] = sorted[0]
  const runnerUpScore = sorted.length > 1 ? sorted[1][1] : 0

  // Confidence: ratio of strong+medium matches to total keyword pool for this schema
  const keywords = SCHEMA_KEYWORDS[bestSchema]
  const keywordPoolSize = keywords.strong.length + keywords.medium.length
  const matchRatio = keywordPoolSize > 0 ? matchCounts[bestSchema] / keywordPoolSize : 0
  const confidence = Math.min(matchRatio, 1)

  // Require: score >= 6 AND clear margin over runner-up (30% lead)
  const hasMargin = bestScore === 0 || (bestScore - runnerUpScore) >= bestScore * 0.3
  const detectedSchema = bestScore >= 6 && hasMargin ? bestSchema : "generic"
  const columnMapping = buildColumnMapping(allHeaders, detectedSchema)

  return { detectedSchema, confidence, columnMapping, allHeaders }
}

/* ------------------------------------------------------------------ */
/*  Column Mapping                                                     */
/* ------------------------------------------------------------------ */

const COLUMN_MAPS = {
  fortnox: {
    SupplierNumber: ["suppliernumber", "supplier number", "supplier no", "supplier_number", "leverantörsnummer", "levnr"],
    SupplierName: ["suppliername", "supplier name", "supplier_name", "leverantör", "leverantörsnamn", "vendor", "vendor name"],
    InvoiceDate: ["invoicedate", "invoice date", "invoice_date", "fakturadatum", "date", "datum"],
    DueDate: ["duedate", "due date", "due_date", "förfallodatum", "förfallodag", "payment date"],
    Total: ["total", "amount", "belopp", "summa", "invoice total", "invoicetotal", "totaltopay", "total to pay"],
    Balance: ["balance", "saldo", "outstanding", "remaining"],
    InvoiceNumber: ["invoicenumber", "invoice number", "invoice_number", "invoice no", "fakturanummer", "fakturanr"],
    DocumentNumber: ["documentnumber", "document number", "doc number", "docnr"],
    CustomerName: ["customername", "customer name", "customer_name", "kund", "kundnamn"],
  },
  m365: {
    skuPartNumber: ["skupartnumber", "sku part number", "sku_part_number", "sku", "license name", "license type", "plan"],
    consumedUnits: ["consumedunits", "consumed units", "consumed_units", "assigned", "used"],
    prepaidUnitsEnabled: ["prepaidunits", "prepaid units", "total licenses", "total_licenses", "purchased", "enabled"],
    displayName: ["displayname", "display name", "name", "user name", "username", "full name"],
    userPrincipalName: ["userprincipalname", "user principal name", "upn", "email", "mail"],
    accountEnabled: ["accountenabled", "account enabled", "enabled", "active", "status"],
    lastSignInDateTime: ["lastsignindatetime", "last sign in", "last signin", "last login", "lastlogin", "last activity"],
  },
  hubspot: {
    email: ["email", "e-mail", "mail", "user email", "useremail"],
    displayName: ["displayname", "display name", "name", "user name", "username"],
    lastLoginAt: ["lastloginat", "last login", "lastlogin", "last_login_at", "last activity"],
    roleIds: ["roleids", "role ids", "roles", "role"],
    userProvisioningState: ["userprovisioningstate", "provisioning state", "status", "state"],
    superAdmin: ["superadmin", "super admin", "admin", "is admin"],
  },
  profit_loss: {
    AccountCode: ["accountcode", "account code", "account_code", "konto", "kontonummer", "account number", "acct"],
    AccountName: ["accountname", "account name", "account_name", "kontonamn", "description", "beskrivning"],
    Period: ["period", "amount", "belopp", "current period", "current"],
    Accumulated: ["accumulated", "ackumulerat", "ytd", "year to date"],
    PreviousYear: ["previousyear", "previous year", "period fg år", "prior year", "föregående år", "fg år"],
    Category: ["category", "kategori", "type", "group"],
    GroupKey: ["groupkey", "group key", "group_key"],
  },
  generic: {
    vendor: ["vendor", "supplier", "company", "merchant", "payee", "leverantör"],
    amount: ["amount", "total", "cost", "price", "sum", "belopp", "summa", "value"],
    date: ["date", "datum", "invoice date", "payment date", "transaction date", "period"],
    description: ["description", "item", "product", "service", "category", "type", "beskrivning"],
    category: ["category", "department", "cost center", "account", "konto", "kategori"],
  },
}

function buildColumnMapping(headers, schema) {
  const map = COLUMN_MAPS[schema]
  if (!map) return {}

  const mapping = {}
  const headersLower = headers.map((h) => String(h).toLowerCase().trim())

  for (const [targetField, aliases] of Object.entries(map)) {
    for (const alias of aliases) {
      const idx = headersLower.findIndex((h) => h === alias || h.replace(/[_\-\s]+/g, "") === alias.replace(/[_\-\s]+/g, ""))
      if (idx !== -1) {
        mapping[targetField] = headers[idx] // Use original header name
        break
      }
    }
  }

  return mapping
}

/* ------------------------------------------------------------------ */
/*  Data Mapping                                                       */
/* ------------------------------------------------------------------ */

/**
 * Map parsed rows to analysis engine input format
 * @param {Array} rows - Parsed data rows
 * @param {string} schema - Detected schema
 * @param {Object} columnMapping - Column mapping
 * @returns {Object} Data shaped for the appropriate analysis engine
 */
function mapToAnalysisFormat(rows, schema, columnMapping) {
  if (!rows || rows.length === 0) return null

  switch (schema) {
    case "fortnox":
      return mapToFortnox(rows, columnMapping)
    case "m365":
      return mapToM365(rows, columnMapping)
    case "hubspot":
      return mapToHubSpot(rows, columnMapping)
    case "profit_loss":
      return mapToProfitLoss(rows, columnMapping)
    case "generic":
      return mapToGeneric(rows, columnMapping)
    default:
      return { rawRows: rows }
  }
}

function mapToFortnox(rows, mapping) {
  // Detect if rows are customer invoices or supplier invoices
  const hasSupplierFields = mapping.SupplierNumber || mapping.SupplierName
  const hasCustomerFields = mapping.CustomerName || mapping.DocumentNumber

  const supplierInvoices = hasSupplierFields
    ? rows.map((row) => {
        let supplierName = getField(row, mapping.SupplierName) || "Unknown"
        // Guard against dates/timestamps ending up as supplier names
        if (isLikelyDate(supplierName)) {
          supplierName = "Unknown"
        }
        return {
          SupplierNumber: getField(row, mapping.SupplierNumber) || "",
          SupplierName: supplierName,
          InvoiceDate: formatDate(getField(row, mapping.InvoiceDate)),
          DueDate: formatDate(getField(row, mapping.DueDate)),
          Total: parseNumber(getField(row, mapping.Total)),
          Balance: parseNumber(getField(row, mapping.Balance)),
          InvoiceNumber: String(getField(row, mapping.InvoiceNumber) || ""),
          GivenNumber: String(getField(row, mapping.InvoiceNumber) || ""),
          Booked: true,
        }
      })
    : []

  const invoices = hasCustomerFields
    ? rows.map((row) => ({
        DocumentNumber: String(getField(row, mapping.DocumentNumber) || getField(row, mapping.InvoiceNumber) || ""),
        CustomerName: getField(row, mapping.CustomerName) || "Unknown",
        Total: parseNumber(getField(row, mapping.Total)),
        Balance: parseNumber(getField(row, mapping.Balance)),
        DueDate: formatDate(getField(row, mapping.DueDate)),
      }))
    : []

  // If we can't tell, default to supplier invoices (more common for cost analysis)
  if (!hasSupplierFields && !hasCustomerFields) {
    // Smart column selection: find the best column for each field by inspecting values
    const nameCol = mapping.vendor || findTextColumn(rows[0])
    const dateCol = mapping.InvoiceDate || findDateColumn(rows[0])
    const amountCol = mapping.Total || findAmountColumn(rows[0])

    return {
      supplierInvoices: rows.map((row) => {
        let supplierName = getField(row, nameCol) || "Unknown"
        // Guard against dates/timestamps ending up as supplier names
        if (isLikelyDate(supplierName)) {
          supplierName = "Unknown"
        }
        return {
          SupplierNumber: "",
          SupplierName: supplierName,
          InvoiceDate: formatDate(getField(row, dateCol)),
          DueDate: formatDate(getField(row, mapping.DueDate)),
          Total: parseNumber(getField(row, amountCol)),
          Balance: 0,
          InvoiceNumber: "",
          GivenNumber: "",
          Booked: true,
        }
      }),
      invoices: [],
    }
  }

  return { supplierInvoices, invoices }
}

function mapToM365(rows, mapping) {
  // Detect if rows are licenses or users
  const hasSkuFields = mapping.skuPartNumber || mapping.consumedUnits
  const hasUserFields = mapping.displayName || mapping.userPrincipalName

  if (hasSkuFields && !hasUserFields) {
    // License-only data
    return {
      licenses: rows.map((row) => ({
        skuId: getField(row, mapping.skuPartNumber) || "",
        skuPartNumber: getField(row, mapping.skuPartNumber) || "",
        consumedUnits: parseNumber(getField(row, mapping.consumedUnits)),
        prepaidUnits: { enabled: parseNumber(getField(row, mapping.prepaidUnitsEnabled)) },
      })),
      users: [],
    }
  }

  if (hasUserFields) {
    // User data (may also contain license info per row)
    return {
      users: rows.map((row) => ({
        id: getField(row, mapping.userPrincipalName) || String(Math.random()),
        displayName: getField(row, mapping.displayName) || "",
        userPrincipalName: getField(row, mapping.userPrincipalName) || "",
        mail: getField(row, mapping.userPrincipalName) || "",
        accountEnabled: parseBool(getField(row, mapping.accountEnabled)),
        assignedLicenses: mapping.skuPartNumber
          ? [{ skuId: getField(row, mapping.skuPartNumber) || "" }]
          : [],
        signInActivity: {
          lastSignInDateTime: formatDate(getField(row, mapping.lastSignInDateTime)),
        },
        createdDateTime: new Date().toISOString(),
      })),
      licenses: [],
    }
  }

  return { users: [], licenses: [] }
}

function mapToHubSpot(rows, mapping) {
  return {
    users: rows.map((row) => ({
      id: getField(row, mapping.email) || String(Math.random()),
      email: getField(row, mapping.email) || "",
      displayName: getField(row, mapping.displayName) || getField(row, mapping.email) || "",
      superAdmin: parseBool(getField(row, mapping.superAdmin)),
      userProvisioningState: getField(row, mapping.userProvisioningState) || "ACTIVE",
      status: getField(row, mapping.userProvisioningState) || "ACTIVE",
      roleIds: parseArray(getField(row, mapping.roleIds)),
      primaryTeamId: null,
      lastLoginAt: formatDate(getField(row, mapping.lastLoginAt)),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })),
    accountInfo: null,
  }
}

function mapToProfitLoss(rows, mapping) {
  return rows.map((row) => ({
    AccountCode: getField(row, mapping.AccountCode) || row.AccountCode || "",
    AccountName: getField(row, mapping.AccountName) || row.AccountName || "",
    Period: parseNumber(getField(row, mapping.Period) || row.Period),
    Accumulated: parseNumber(getField(row, mapping.Accumulated) || row.Accumulated),
    PreviousYear: parseNumber(getField(row, mapping.PreviousYear) || row.PreviousYear),
    Category: getField(row, mapping.Category) || row.Category || "",
    GroupKey: getField(row, mapping.GroupKey) || row.GroupKey || "",
  }))
}

function mapToGeneric(rows, mapping) {
  return rows.map((row) => ({
    vendor: getField(row, mapping.vendor) || getFirstStringField(row),
    amount: parseNumber(getField(row, mapping.amount) || getFirstNumberField(row)),
    date: formatDate(getField(row, mapping.date)),
    description: getField(row, mapping.description) || "",
    category: getField(row, mapping.category) || "",
    _original: row,
  }))
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getField(row, columnName) {
  if (!columnName || !row) return null
  return row[columnName] ?? null
}

function parseNumber(val) {
  if (val == null) return 0
  if (typeof val === "number") return val
  const cleaned = String(val).replace(/[^-\d.,]/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseBool(val) {
  if (val == null) return true
  if (typeof val === "boolean") return val
  const s = String(val).toLowerCase()
  return s === "true" || s === "yes" || s === "1" || s === "active" || s === "enabled"
}

function parseArray(val) {
  if (Array.isArray(val)) return val
  if (!val) return []
  return String(val).split(",").map((s) => s.trim()).filter(Boolean)
}

function formatDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function findDateColumn(row) {
  for (const [key, val] of Object.entries(row)) {
    if (val instanceof Date) return key
    if (typeof val === "string" && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(val)) return key
  }
  return null
}

function findAmountColumn(row) {
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === "number" && val > 0) return key
  }
  return null
}

/**
 * Check if a value looks like a date/timestamp rather than a name
 */
function isLikelyDate(val) {
  if (val == null) return false
  if (val instanceof Date) return true
  const s = String(val)
  // ISO 8601 timestamps
  if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(s)) return true
  // Common date formats: YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY
  if (/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/.test(s)) return true
  // Excel serial date numbers (5-digit integers)
  if (/^\d{5}$/.test(s)) return true
  return false
}

/**
 * Find a column whose values look like text names (not dates, not numbers)
 */
function findTextColumn(row) {
  if (!row) return null
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === "string" && val.length > 1 && !isLikelyDate(val) && !/^-?\d+\.?\d*$/.test(val)) {
      return key
    }
  }
  return null
}

function getFirstStringField(row) {
  for (const val of Object.values(row)) {
    if (typeof val === "string" && val.length > 1 && !/^\d+$/.test(val)) return val
  }
  return ""
}

function getFirstNumberField(row) {
  for (const val of Object.values(row)) {
    if (typeof val === "number") return val
  }
  return 0
}

/* ------------------------------------------------------------------ */
/*  Fortnox Resultatrapport (P&L) Parser                              */
/* ------------------------------------------------------------------ */

/**
 * BAS account code ranges for Swedish chart of accounts
 */
const BAS_CATEGORIES = {
  "30": "Nettoomsättning",
  "31": "Nettoomsättning",
  "32": "Nettoomsättning",
  "33": "Nettoomsättning",
  "34": "Nettoomsättning",
  "35": "Nettoomsättning",
  "36": "Övriga rörelseintäkter",
  "37": "Övriga rörelseintäkter",
  "38": "Övriga rörelseintäkter",
  "39": "Övriga rörelseintäkter",
  "40": "Råvaror och förnödenheter",
  "41": "Råvaror och förnödenheter",
  "42": "Råvaror och förnödenheter",
  "43": "Råvaror och förnödenheter",
  "44": "Råvaror och förnödenheter",
  "45": "Övriga externa kostnader",
  "46": "Övriga externa kostnader",
  "47": "Övriga externa kostnader",
  "48": "Övriga varu- och materialkostnader",
  "49": "Övriga varu- och materialkostnader",
  "50": "Lokalkostnader",
  "51": "Fastighetskostnader",
  "52": "Hyra/leasing",
  "53": "Förbrukningsinventarier",
  "54": "Förbrukningsinventarier",
  "55": "Reparationer",
  "56": "Transportkostnader",
  "57": "Frakt och transport",
  "58": "Resekostnader",
  "59": "Reklam och PR",
  "60": "Övriga försäljningskostnader",
  "61": "Kontorsmaterial",
  "62": "Tele och post",
  "63": "Försäkringar",
  "64": "Förvaltningskostnader",
  "65": "Övriga externa tjänster",
  "66": "Övriga externa tjänster",
  "67": "Övriga externa tjänster",
  "68": "Inhyrd personal",
  "69": "Övriga externa kostnader",
  "70": "Personalkostnader",
  "71": "Löner",
  "72": "Löner",
  "73": "Kostnadsersättningar",
  "74": "Pensionskostnader",
  "75": "Arbetsgivaravgifter",
  "76": "Övriga personalkostnader",
  "77": "Nedskrivningar",
  "78": "Avskrivningar",
  "79": "Övriga rörelsekostnader",
  "80": "Finansiella intäkter",
  "81": "Finansiella intäkter",
  "82": "Finansiella intäkter",
  "83": "Finansiella kostnader",
  "84": "Finansiella kostnader",
  "85": "Finansiella kostnader",
  "86": "Finansiella kostnader",
  "87": "Extraordinära poster",
  "88": "Bokslutsdispositioner",
  "89": "Skatt",
}

const BAS_GROUPS = {
  revenue: ["30", "31", "32", "33", "34", "35"],
  otherRevenue: ["36", "37", "38", "39"],
  cogs: ["40", "41", "42", "43", "44"],
  materials: ["45", "46", "47", "48", "49"],
  premises: ["50", "51"],
  leasingEquipment: ["52", "53", "54", "55"],
  transport: ["56", "57"],
  travel: ["58"],
  marketing: ["59"],
  sellingExpenses: ["60"],
  officeSupplies: ["61"],
  telecom: ["62"],
  insurance: ["63"],
  administration: ["64", "65", "66", "67"],
  contractStaff: ["68"],
  otherExternal: ["69"],
  salaries: ["70", "71", "72"],
  benefits: ["73"],
  pensions: ["74"],
  socialFees: ["75"],
  otherPersonnel: ["76"],
  depreciation: ["77", "78"],
  otherOperating: ["79"],
  financialIncome: ["80", "81", "82"],
  financialExpenses: ["83", "84", "85", "86"],
  extraordinary: ["87"],
  appropriations: ["88"],
  tax: ["89"],
}

/**
 * Parse a Fortnox Resultatrapport PDF text into structured line items.
 * Returns null if the text doesn't look like a Resultatrapport.
 */
function parseResultatrapport(rawText) {
  // Quick detection: must contain "Resultatrapport" and Swedish accounting keywords
  const textLower = rawText.toLowerCase()
  if (!textLower.includes("resultatrapport") && !textLower.includes("resultaträkning")) {
    return null
  }

  // Must have BAS account codes (4-digit numbers at start of lines)
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean)
  const accountLinePattern = /^(\d{4})\s+(.+)/
  const accountLines = lines.filter((l) => accountLinePattern.test(l))
  if (accountLines.length < 5) return null // Not enough account lines

  // Detect period from header lines
  let period = null
  let companyName = null
  let orgNumber = null
  for (const line of lines.slice(0, 15)) {
    const periodMatch = line.match(/Period\s+(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/)
    if (periodMatch) {
      period = { from: periodMatch[1], to: periodMatch[2] }
    }
    const orgMatch = line.match(/^(\d{6}-\d{4})$/)
    if (orgMatch) orgNumber = orgMatch[1]
    // Company name is usually the first non-date, non-number line
    if (!companyName && line.length > 3 && !/^\d/.test(line) && !line.includes("Resultatrapport") && !line.includes("ÅRL") && !line.includes("Utskrivet")) {
      companyName = line
    }
  }

  // Parse account lines into structured rows
  const rows = []
  for (const line of accountLines) {
    const parsed = parseAccountLine(line)
    if (parsed) rows.push(parsed)
  }

  if (rows.length === 0) return null

  const headers = ["AccountCode", "AccountName", "Period", "Accumulated", "PreviousYear", "Category", "GroupKey"]

  return {
    headers,
    rows,
    rowCount: rows.length,
    metadata: {
      companyName,
      orgNumber,
      period,
      reportType: "resultatrapport",
    },
  }
}

/**
 * Parse a single account line from Resultatrapport text.
 * Format: "3041 Fsg tjänster 20 166 175,80 20 166 175,80 14 977 078,98"
 * Swedish numbers use space as thousands separator and comma as decimal.
 */
function parseAccountLine(line) {
  const match = line.match(/^(\d{4})\s+(.+)/)
  if (!match) return null

  const accountCode = match[1]
  const rest = match[2]

  // Swedish number pattern: optional minus, digits with space separators, optional comma+decimals
  const sweNumPattern = /-?[\d\s]+,\d{2}/g
  const numbers = []
  let numMatch
  while ((numMatch = sweNumPattern.exec(rest)) !== null) {
    numbers.push({
      raw: numMatch[0],
      value: parseSweNum(numMatch[0]),
      index: numMatch.index,
    })
  }

  // Account name is the text before the first number
  let accountName = rest
  if (numbers.length > 0) {
    accountName = rest.substring(0, numbers[0].index).trim()
  }

  // Map account code to category
  const prefix = accountCode.substring(0, 2)
  const category = BAS_CATEGORIES[prefix] || "Övrigt"
  const groupKey = findGroupKey(prefix)

  return {
    AccountCode: accountCode,
    AccountName: accountName,
    Period: numbers[0]?.value ?? 0,
    Accumulated: numbers[1]?.value ?? numbers[0]?.value ?? 0,
    PreviousYear: numbers[2]?.value ?? 0,
    Category: category,
    GroupKey: groupKey,
  }
}

/**
 * Parse Swedish-formatted number: "20 166 175,80" → 20166175.80
 */
function parseSweNum(str) {
  if (!str) return 0
  const cleaned = str.replace(/\s/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Find which expense group an account prefix belongs to
 */
function findGroupKey(prefix) {
  for (const [key, prefixes] of Object.entries(BAS_GROUPS)) {
    if (prefixes.includes(prefix)) return key
  }
  return "other"
}

module.exports = {
  parseUploadedFile,
  parseExcelFile,
  parseCsvFile,
  parsePdfFile,
  parseImageFile,
  detectDataSchema,
  mapToAnalysisFormat,
  parseResultatrapport,
}
