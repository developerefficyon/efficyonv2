/**
 * Schema Validator Service
 * Validates uploaded JSON data against expected schemas for each integration type.
 * Schemas derived from what existing analysis services expect.
 */

const SCHEMAS = {
  Fortnox: {
    supplier_invoices: {
      required: ["SupplierNumber", "InvoiceDate"],
      recommended: ["SupplierName", "Total", "DueDate", "Balance", "DocumentNumber"],
      optional: ["TotalToPay", "GrossValue", "InvoiceTotal", "Booked", "FinalPayDate", "SupplierInvoiceRows"],
    },
    invoices: {
      required: ["Total"],
      recommended: ["CustomerName", "DueDate", "Balance", "DocumentNumber"],
      optional: ["InvoiceDate", "Booked"],
    },
    customers: {
      required: ["CustomerNumber"],
      recommended: ["Name", "Email"],
      optional: ["Phone", "Address1", "City", "ZipCode"],
    },
    expenses: {
      required: ["Total"],
      recommended: ["Date", "Description"],
      optional: ["Account", "Category"],
    },
    vouchers: {
      required: ["VoucherNumber"],
      recommended: ["TransactionDate", "Description"],
      optional: ["VoucherRows"],
    },
    accounts: {
      required: ["Number"],
      recommended: ["Description"],
      optional: ["Active", "BalanceBroughtForward"],
    },
    articles: {
      required: ["ArticleNumber"],
      recommended: ["Description", "SalesPrice"],
      optional: ["PurchasePrice", "Active", "StockGoods"],
    },
    profit_loss: {
      required: ["AccountCode", "AccountName"],
      recommended: ["Period", "Category"],
      optional: ["Accumulated", "PreviousYear", "GroupKey"],
    },
  },
  Microsoft365: {
    licenses: {
      required: ["skuPartNumber", "consumedUnits"],
      recommended: ["prepaidUnits", "skuId"],
      optional: ["appliesTo", "capabilityStatus"],
    },
    users: {
      required: ["id", "accountEnabled"],
      recommended: ["displayName", "mail", "userPrincipalName", "assignedLicenses", "signInActivity"],
      optional: ["createdDateTime", "department", "jobTitle"],
    },
    usage_reports: {
      required: ["userPrincipalName"],
      recommended: ["lastActivityDate", "reportRefreshDate"],
      optional: ["exchangeLastActivityDate", "teamsLastActivityDate"],
    },
  },
  HubSpot: {
    hubspot_users: {
      required: ["id"],
      recommended: ["email", "lastLoginAt", "roleId"],
      optional: ["superAdmin", "updatedAt", "createdAt", "userProvisioningState", "firstName", "lastName"],
    },
    hubspot_account: {
      required: [],
      recommended: ["portalId", "companyName"],
      optional: ["timeZone", "currency"],
    },
  },
}

/**
 * Validate a data array against the expected schema
 * @param {string} integrationLabel - 'Fortnox', 'Microsoft365', 'HubSpot'
 * @param {string} dataType - e.g. 'supplier_invoices', 'licenses', 'users'
 * @param {Array|Object} data - The data to validate (array of records or single object)
 * @returns {Object} Validation report
 */
function validateData(integrationLabel, dataType, data) {
  const report = {
    status: "pending",
    errors: [],
    warnings: [],
    stats: { totalRows: 0, validRows: 0, invalidRows: 0 },
  }

  const schema = SCHEMAS[integrationLabel]?.[dataType]
  if (!schema) {
    report.status = "invalid"
    report.errors.push({
      row: null,
      field: null,
      issue: `Unknown schema for ${integrationLabel}/${dataType}`,
    })
    return report
  }

  // Handle profit_loss wrapped format { lineItems, metadata }
  let actualData = data
  if (dataType === "profit_loss" && data && !Array.isArray(data) && Array.isArray(data.lineItems)) {
    actualData = data.lineItems
  }

  // Handle single objects (like hubspot_account)
  const records = Array.isArray(actualData) ? actualData : [actualData]
  report.stats.totalRows = records.length

  if (records.length === 0) {
    report.status = "invalid"
    report.errors.push({ row: null, field: null, issue: "Empty dataset" })
    return report
  }

  records.forEach((record, index) => {
    let rowValid = true

    // Check required fields
    for (const field of schema.required) {
      if (record[field] === undefined || record[field] === null) {
        report.errors.push({
          row: index,
          field,
          issue: `Missing required field: ${field}`,
        })
        rowValid = false
      }
    }

    // Check recommended fields (warnings only)
    for (const field of schema.recommended) {
      if (record[field] === undefined || record[field] === null) {
        report.warnings.push({
          row: index,
          field,
          issue: `Missing recommended field: ${field}`,
        })
      }
    }

    if (rowValid) {
      report.stats.validRows++
    } else {
      report.stats.invalidRows++
    }
  })

  // Determine overall status
  if (report.stats.invalidRows === 0) {
    report.status = "valid"
  } else if (report.stats.validRows > 0) {
    report.status = "partial"
  } else {
    report.status = "invalid"
  }

  // Deduplicate warnings (only show first 5 per field)
  const warningCounts = {}
  report.warnings = report.warnings.filter((w) => {
    const key = w.field
    warningCounts[key] = (warningCounts[key] || 0) + 1
    return warningCounts[key] <= 5
  })

  return report
}

/**
 * Get the expected schema for an integration/data type
 */
function getSchema(integrationLabel, dataType) {
  return SCHEMAS[integrationLabel]?.[dataType] || null
}

/**
 * List all supported integration/data type combinations
 */
function listSchemas() {
  const result = {}
  for (const [integration, types] of Object.entries(SCHEMAS)) {
    result[integration] = Object.keys(types)
  }
  return result
}

module.exports = { validateData, getSchema, listSchemas, SCHEMAS }
