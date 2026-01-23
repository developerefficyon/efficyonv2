// Currency utility for formatting amounts based on integration type

// Map integration types to their default currencies
const INTEGRATION_CURRENCIES = {
  fortnox: "SEK",
  quickbooks: "USD",
  xero: "USD",
  stripe: "USD",
  hubspot: "USD",
  salesforce: "USD",
  slack: "USD",
  microsoft365: "USD",
  google_workspace: "USD",
  default: "USD",
}

// Currency display configurations
const CURRENCY_CONFIG = {
  USD: { symbol: "$", position: "before" },
  SEK: { symbol: "kr", position: "after" },
  EUR: { symbol: "\u20AC", position: "before" },
  GBP: { symbol: "\u00A3", position: "before" },
  NOK: { symbol: "kr", position: "after" },
  DKK: { symbol: "kr", position: "after" },
}

/**
 * Get currency code for an integration type
 */
function getCurrencyForIntegration(integrationType) {
  const normalizedType = (integrationType || "default").toLowerCase().replace(/[-_\s]/g, "")
  return INTEGRATION_CURRENCIES[normalizedType] || INTEGRATION_CURRENCIES.default
}

/**
 * Format a currency amount based on currency code
 */
function formatCurrency(amount, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") {
    return "-"
  }

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return "-"
  }

  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  const formattedNumber = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  if (config.position === "before") {
    return `${config.symbol}${formattedNumber}`
  } else {
    return `${formattedNumber} ${config.symbol}`
  }
}

/**
 * Format currency for an integration type (convenience function)
 */
function formatCurrencyForIntegration(amount, integrationType) {
  const currency = getCurrencyForIntegration(integrationType)
  return formatCurrency(amount, currency)
}

/**
 * Get currency symbol for display
 */
function getCurrencySymbol(currency = "USD") {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  return config.symbol
}

module.exports = {
  INTEGRATION_CURRENCIES,
  getCurrencyForIntegration,
  formatCurrency,
  formatCurrencyForIntegration,
  getCurrencySymbol,
}
