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

/**
 * Currency rate fetcher with 24h in-memory cache and safe fallback.
 * Uses Frankfurter (ECB data, free, no auth).
 *
 * Replaces the hardcoded SEK_TO_USD = 0.095 in costLeakAnalysis.js.
 */

let sekToUsdCache = null
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const SEK_TO_USD_FALLBACK = 0.095 // Historical average — used only if fetch fails

const log = (level, msg) => {
  const ts = new Date().toISOString()
  console[level](`[${ts}] [currency] ${msg}`)
}

/**
 * Returns the current SEK→USD rate.
 * Caches in-memory for 24h; falls back to hardcoded value on fetch failure.
 */
async function getSekToUsdRate() {
  const now = Date.now()
  if (sekToUsdCache && (now - sekToUsdCache.fetchedAt) < CACHE_TTL_MS) {
    return sekToUsdCache.rate
  }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=SEK&to=USD")
    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`)
    const data = await res.json()
    const rate = data?.rates?.USD
    if (typeof rate !== "number") throw new Error("Missing USD rate in response")
    sekToUsdCache = { rate, fetchedAt: now }
    log("log", `Live rate fetched: 1 SEK = ${rate} USD`)
    return rate
  } catch (err) {
    log("warn", `Live rate fetch failed (${err.message}) — using fallback ${SEK_TO_USD_FALLBACK}`)
    return SEK_TO_USD_FALLBACK
  }
}

module.exports = {
  INTEGRATION_CURRENCIES,
  getCurrencyForIntegration,
  formatCurrency,
  formatCurrencyForIntegration,
  getCurrencySymbol,
  getSekToUsdRate,
  SEK_TO_USD_FALLBACK,
}
