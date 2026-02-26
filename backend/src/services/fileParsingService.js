/**
 * File Parsing Service
 * Parses uploaded Excel and PDF files, detects data schema,
 * and maps data to analysis engine formats.
 */

const XLSX = require("xlsx")
const pdfParse = require("pdf-parse")

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

  if (ext === ".pdf" || mimeType === "application/pdf") {
    // pdf-parse is async
    return parsePdfFile(buffer).then((result) => ({ type: "pdf", ...result }))
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
  const result = await pdfParse(buffer)
  const rawText = result.text || ""
  const pages = result.numpages || 0

  // Detect scanned PDFs (very little extractable text)
  if (rawText.trim().length < 50) {
    return {
      rawText,
      pages,
      isScannedPdf: true,
      error: "This PDF appears to be scanned/image-based. Please upload a text-based PDF or convert the data to Excel.",
    }
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
/*  Schema Detection                                                   */
/* ------------------------------------------------------------------ */

const SCHEMA_KEYWORDS = {
  fortnox: {
    strong: ["supplierinvoice", "supplierinvoices", "suppliernumber", "suppliername", "invoicenumber", "givenumber"],
    medium: ["supplier", "faktura", "leverant", "invoice", "duedate", "due date", "balance", "booked", "invoicedate"],
    weak: ["total", "amount", "date"],
  },
  m365: {
    strong: ["skupartnumber", "skuid", "consumedunits", "prepaidunits", "assignedlicenses", "signinactivity"],
    medium: ["license", "licens", "sku", "signin", "sign in", "accountenabled", "userprincipalname"],
    weak: ["user", "displayname", "email"],
  },
  hubspot: {
    strong: ["userprovisioningstate", "superadmin", "roleids", "primaryteamid", "lastloginat"],
    medium: ["hubspot", "provisioning", "roleid", "teamid", "lastlogin", "last login"],
    weak: ["email", "role", "status"],
  },
  generic: {
    strong: [],
    medium: ["vendor", "cost", "expense", "payment", "category", "department"],
    weak: ["amount", "total", "date", "description", "price"],
  },
}

/**
 * Detect which analysis schema matches the data
 * @param {{ sheets?: Array, extractedTables?: Array }} parsedData
 * @returns {{ detectedSchema: string, confidence: number, columnMapping: Object, allHeaders: string[] }}
 */
function detectDataSchema(parsedData) {
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

  const scores = {}
  for (const [schema, keywords] of Object.entries(SCHEMA_KEYWORDS)) {
    let score = 0
    for (const h of headersLower) {
      if (keywords.strong.some((k) => h.includes(k))) score += 3
      else if (keywords.medium.some((k) => h.includes(k))) score += 2
      else if (keywords.weak.some((k) => h.includes(k))) score += 1
    }
    scores[schema] = score
  }

  // Find the highest-scoring schema
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [bestSchema, bestScore] = sorted[0]
  const confidence = Math.min(bestScore / (allHeaders.length * 2), 1)

  // Only claim a specific schema if we have reasonable confidence
  const detectedSchema = bestScore >= 4 ? bestSchema : "generic"
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
    ? rows.map((row) => ({
        SupplierNumber: getField(row, mapping.SupplierNumber) || "",
        SupplierName: getField(row, mapping.SupplierName) || "Unknown",
        InvoiceDate: formatDate(getField(row, mapping.InvoiceDate)),
        DueDate: formatDate(getField(row, mapping.DueDate)),
        Total: parseNumber(getField(row, mapping.Total)),
        Balance: parseNumber(getField(row, mapping.Balance)),
        InvoiceNumber: String(getField(row, mapping.InvoiceNumber) || ""),
        GivenNumber: String(getField(row, mapping.InvoiceNumber) || ""),
        Booked: true,
      }))
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
    return {
      supplierInvoices: rows.map((row) => ({
        SupplierNumber: "",
        SupplierName: getField(row, mapping.vendor || Object.keys(row)[0]) || "Unknown",
        InvoiceDate: formatDate(getField(row, mapping.date || findDateColumn(row))),
        DueDate: formatDate(getField(row, mapping.DueDate)),
        Total: parseNumber(getField(row, mapping.Total || findAmountColumn(row))),
        Balance: 0,
        InvoiceNumber: "",
        GivenNumber: "",
        Booked: true,
      })),
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

module.exports = {
  parseUploadedFile,
  parseExcelFile,
  parsePdfFile,
  detectDataSchema,
  mapToAnalysisFormat,
}
