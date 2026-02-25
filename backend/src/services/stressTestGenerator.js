/**
 * Stress Test Data Generator
 * Generates intentionally adversarial datasets to test analysis engine robustness.
 * Feeds into the existing upload → analyze → score pipeline.
 */

const { generateFortnoxData, generateM365Data, generateHubSpotData, SCENARIO_PROFILES } = require("./mockDataGenerator")

// ─── Stress Scenarios ───────────────────────────────────────────────

const STRESS_SCENARIOS = {
  extreme_values: {
    label: "Extreme Values",
    description: "Negative amounts, huge numbers (999999999), zero totals",
  },
  large_datasets: {
    label: "Large Datasets",
    description: "1000-5000 records to test performance and memory",
  },
  partial_data: {
    label: "Partial Data",
    description: "Missing required fields at configurable rates (20-80%)",
  },
  empty_arrays: {
    label: "Empty Arrays",
    description: "Valid structure but zero records in data arrays",
  },
  type_mismatches: {
    label: "Type Mismatches",
    description: "Numbers as strings, strings as numbers, objects as arrays",
  },
  duplicate_heavy: {
    label: "Duplicate Heavy",
    description: "50%+ exact duplicated records",
  },
  boundary_dates: {
    label: "Boundary Dates",
    description: "Far future, epoch 0, invalid date formats",
  },
}

// ─── Utility Functions ──────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(n, arr.length))
}

// ─── Corruption Helpers ─────────────────────────────────────────────

/**
 * Apply extreme values to numeric fields in a dataset
 */
function applyExtremeValues(records) {
  const extremes = [-999999, -1, 0, 0.001, 999999999, NaN, Infinity]
  const numericFields = ["Total", "TotalToPay", "Balance", "consumedUnits"]

  return records.map((record) => {
    const mutated = { ...record }
    for (const field of numericFields) {
      if (mutated[field] !== undefined && Math.random() < 0.3) {
        mutated[field] = pickRandom(extremes)
      }
    }
    return mutated
  })
}

/**
 * Remove required fields from random records
 */
function applyPartialData(records, requiredFields, removalRate = 0.4) {
  return records.map((record) => {
    if (Math.random() > removalRate) return record
    const mutated = { ...record }
    const fieldToRemove = pickRandom(requiredFields)
    delete mutated[fieldToRemove]
    return mutated
  })
}

/**
 * Replace field types with wrong types
 */
function applyTypeMismatches(records) {
  return records.map((record) => {
    if (Math.random() > 0.3) return record
    const mutated = { ...record }
    const keys = Object.keys(mutated)
    const key = pickRandom(keys)
    const val = mutated[key]
    if (typeof val === "number") {
      mutated[key] = String(val)
    } else if (typeof val === "string") {
      mutated[key] = { broken: val }
    } else if (typeof val === "boolean") {
      mutated[key] = "true"
    }
    return mutated
  })
}

/**
 * Duplicate 50%+ of records
 */
function applyDuplicates(records) {
  const dupCount = Math.floor(records.length * 0.6)
  const dups = pickN(records, dupCount).map((r) => ({ ...r }))
  return [...records, ...dups]
}

/**
 * Replace dates with boundary/invalid values
 */
function applyBoundaryDates(records, dateFields) {
  const badDates = ["1970-01-01", "2099-12-31", "0000-00-00", "not-a-date", "", null, "2025-13-45"]
  return records.map((record) => {
    if (Math.random() > 0.4) return record
    const mutated = { ...record }
    for (const field of dateFields) {
      if (mutated[field] !== undefined && Math.random() < 0.5) {
        mutated[field] = pickRandom(badDates)
      }
    }
    return mutated
  })
}

/**
 * Scale a dataset to a target size by duplicating and varying records
 */
function scaleDataset(records, targetSize) {
  if (records.length === 0) return []
  const result = []
  let docCounter = 90001
  while (result.length < targetSize) {
    const source = records[result.length % records.length]
    const copy = { ...source }
    // Vary identifiers to make them semi-unique
    if (copy.DocumentNumber) copy.DocumentNumber = String(docCounter++)
    if (copy.id) copy.id = `stress-${docCounter++}-${Math.random().toString(36).slice(2, 8)}`
    result.push(copy)
  }
  return result
}

// ─── Per-Integration Stress Generators ──────────────────────────────

function generateFortnoxStressData(scenarios, options = {}) {
  const config = SCENARIO_PROFILES.startup_60
  const result = {}

  if (scenarios.includes("empty_arrays")) {
    return {
      supplier_invoices: [],
      invoices: [],
    }
  }

  // Start with valid baseline data
  const baseData = generateFortnoxData(config, {
    duplicates: false,
    unusualAmounts: false,
    overdueInvoices: false,
    priceDrift: false,
  })

  let supplierInvoices = baseData.supplier_invoices
  let invoices = baseData.invoices

  if (scenarios.includes("large_datasets")) {
    const size = options.targetSize || 2000
    supplierInvoices = scaleDataset(supplierInvoices, size)
    invoices = scaleDataset(invoices, Math.floor(size * 0.5))
  }

  if (scenarios.includes("extreme_values")) {
    supplierInvoices = applyExtremeValues(supplierInvoices)
    invoices = applyExtremeValues(invoices)
  }

  if (scenarios.includes("partial_data")) {
    const rate = options.removalRate || 0.4
    supplierInvoices = applyPartialData(supplierInvoices, ["SupplierNumber", "InvoiceDate"], rate)
    invoices = applyPartialData(invoices, ["Total"], rate)
  }

  if (scenarios.includes("type_mismatches")) {
    supplierInvoices = applyTypeMismatches(supplierInvoices)
    invoices = applyTypeMismatches(invoices)
  }

  if (scenarios.includes("duplicate_heavy")) {
    supplierInvoices = applyDuplicates(supplierInvoices)
  }

  if (scenarios.includes("boundary_dates")) {
    supplierInvoices = applyBoundaryDates(supplierInvoices, ["InvoiceDate", "DueDate", "FinalPayDate"])
    invoices = applyBoundaryDates(invoices, ["InvoiceDate", "DueDate"])
  }

  result.supplier_invoices = supplierInvoices
  result.invoices = invoices
  return result
}

function generateM365StressData(scenarios, options = {}) {
  const config = SCENARIO_PROFILES.startup_60

  if (scenarios.includes("empty_arrays")) {
    return {
      licenses: [],
      users: [],
      usage_reports: [],
    }
  }

  const baseData = generateM365Data(config, {
    inactiveUsers: false,
    orphanedLicenses: false,
    overProvisioned: false,
  })

  let licenses = baseData.licenses
  let users = baseData.users
  let usageReports = baseData.usage_reports || []

  if (scenarios.includes("large_datasets")) {
    const size = options.targetSize || 2000
    users = scaleDataset(users, size)
  }

  if (scenarios.includes("extreme_values")) {
    licenses = licenses.map((l) => ({
      ...l,
      consumedUnits: pickRandom([-5, 0, 999999]),
      prepaidUnits: { enabled: pickRandom([-1, 0, 999999]) },
    }))
  }

  if (scenarios.includes("partial_data")) {
    const rate = options.removalRate || 0.4
    users = applyPartialData(users, ["id", "accountEnabled"], rate)
    licenses = applyPartialData(licenses, ["skuPartNumber", "consumedUnits"], rate)
  }

  if (scenarios.includes("type_mismatches")) {
    users = applyTypeMismatches(users)
  }

  if (scenarios.includes("duplicate_heavy")) {
    users = applyDuplicates(users)
  }

  if (scenarios.includes("boundary_dates")) {
    users = applyBoundaryDates(users, ["createdDateTime"])
    users = users.map((u) => {
      if (Math.random() < 0.3 && u.signInActivity) {
        return {
          ...u,
          signInActivity: { lastSignInDateTime: pickRandom(["not-a-date", null, "", "2099-12-31T00:00:00Z"]) },
        }
      }
      return u
    })
  }

  return { licenses, users, usage_reports: usageReports }
}

function generateHubSpotStressData(scenarios, options = {}) {
  const config = SCENARIO_PROFILES.startup_60

  if (scenarios.includes("empty_arrays")) {
    return {
      hubspot_users: [],
      hubspot_account: {},
    }
  }

  const baseData = generateHubSpotData(config, {
    inactiveUsers: false,
    unassignedRoles: false,
    pendingInvitations: false,
  })

  let users = baseData.hubspot_users
  let account = baseData.hubspot_account

  if (scenarios.includes("large_datasets")) {
    const size = options.targetSize || 1000
    users = scaleDataset(users, size)
  }

  if (scenarios.includes("partial_data")) {
    const rate = options.removalRate || 0.4
    users = applyPartialData(users, ["id"], rate)
  }

  if (scenarios.includes("type_mismatches")) {
    users = applyTypeMismatches(users)
  }

  if (scenarios.includes("duplicate_heavy")) {
    users = applyDuplicates(users)
  }

  if (scenarios.includes("boundary_dates")) {
    users = applyBoundaryDates(users, ["lastLoginAt", "createdAt", "updatedAt"])
  }

  if (scenarios.includes("extreme_values")) {
    account = { ...account, portalId: -1, companyName: null }
  }

  return { hubspot_users: users, hubspot_account: account }
}

// ─── Main Export ────────────────────────────────────────────────────

/**
 * Generate stress test data for a given integration
 * @param {string} integration - 'Fortnox', 'Microsoft365', 'HubSpot'
 * @param {string[]} scenarios - Which stress scenarios to apply
 * @param {Object} options - { targetSize, removalRate }
 * @returns {Object} { dataByType, stressProfile }
 */
function generateStressData(integration, scenarios, options = {}) {
  // Validate scenarios
  const validScenarios = Object.keys(STRESS_SCENARIOS)
  const invalid = scenarios.filter((s) => !validScenarios.includes(s))
  if (invalid.length > 0) {
    throw new Error(`Invalid stress scenarios: ${invalid.join(", ")}`)
  }

  let dataByType
  switch (integration) {
    case "Fortnox":
      dataByType = generateFortnoxStressData(scenarios, options)
      break
    case "Microsoft365":
      dataByType = generateM365StressData(scenarios, options)
      break
    case "HubSpot":
      dataByType = generateHubSpotStressData(scenarios, options)
      break
    default:
      throw new Error(`Unknown integration: ${integration}`)
  }

  return {
    dataByType,
    stressProfile: {
      integration,
      scenarios,
      options,
      generatedAt: new Date().toISOString(),
    },
  }
}

module.exports = {
  generateStressData,
  STRESS_SCENARIOS,
}
