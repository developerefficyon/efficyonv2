// Currency utility for formatting amounts based on integration type

// Map integration types to their default currencies
export const INTEGRATION_CURRENCIES: Record<string, string> = {
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
const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string; position: "before" | "after" }> = {
  USD: { symbol: "$", locale: "en-US", position: "before" },
  SEK: { symbol: "kr", locale: "sv-SE", position: "after" },
  EUR: { symbol: "\u20AC", locale: "de-DE", position: "before" },
  GBP: { symbol: "\u00A3", locale: "en-GB", position: "before" },
  NOK: { symbol: "kr", locale: "nb-NO", position: "after" },
  DKK: { symbol: "kr", locale: "da-DK", position: "after" },
}

/**
 * Get currency code for an integration type
 */
export function getCurrencyForIntegration(integrationType: string): string {
  const normalizedType = integrationType?.toLowerCase().replace(/[-_\s]/g, "") || "default"
  return INTEGRATION_CURRENCIES[normalizedType] || INTEGRATION_CURRENCIES.default
}

/**
 * Format a currency amount based on currency code
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = "USD"): string {
  if (amount === null || amount === undefined || amount === "") {
    return "-"
  }

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return "-"
  }

  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  const formattedNumber = numAmount.toLocaleString(config.locale, {
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
export function formatCurrencyForIntegration(
  amount: number | string | null | undefined,
  integrationType: string
): string {
  const currency = getCurrencyForIntegration(integrationType)
  return formatCurrency(amount, currency)
}
