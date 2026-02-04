/**
 * HubSpot Pricing Utility
 * Based on official HubSpot 2026 pricing
 *
 * Sources:
 * - https://encharge.io/hubspot-pricing/
 * - https://cargas.com/software/hubspot/pricing/
 * - https://www.method.me/blog/how-much-does-hubspot-cost/
 */

/**
 * HubSpot pricing table (per seat/month in USD)
 * Updated: 2026
 */
const HUBSPOT_PRICING = {
  // Starter Customer Platform (All Hubs bundled)
  starter_platform: {
    starter: 15,
    professional: null, // Not available for starter platform
    enterprise: null,   // Not available for starter platform
  },
  // Marketing Hub
  marketing: {
    starter: 15,
    professional: 50,  // Base is $890/mo with 3 seats, additional seats $50
    enterprise: 75,    // Base is $3,600/mo with 5 seats, additional seats $75
  },
  // Sales Hub
  sales: {
    starter: 20,
    professional: 100, // $100/seat for sales seats, $50 for core seats
    enterprise: 150,   // $150/seat with annual commitment
  },
  // Service Hub
  service: {
    starter: 20,
    professional: 100, // Similar to Sales Hub
    enterprise: 150,
  },
  // Content Hub (formerly CMS Hub)
  content: {
    starter: 15,
    professional: 50,  // $500/mo with 3 seats, $50 additional
    enterprise: 75,    // $1,500/mo with 5 seats, $75 additional
  },
  // Operations Hub (now Data Hub)
  operations: {
    starter: 20,
    professional: 50,
    enterprise: 75,
  },
}

/**
 * Get the per-seat cost for a given HubSpot hub and tier
 * @param {string} hubType - The hub type (sales, marketing, service, content, operations, starter_platform)
 * @param {string} tier - The plan tier (starter, professional, enterprise)
 * @returns {number} Per-seat monthly cost in USD
 */
function getPerSeatCost(hubType, tier) {
  const hub = HUBSPOT_PRICING[hubType] || HUBSPOT_PRICING.sales
  const cost = hub[tier]

  // If the tier is not available for this hub, use a reasonable default
  if (cost === null || cost === undefined) {
    // Fallback to sales hub pricing if hub-specific pricing not available
    return HUBSPOT_PRICING.sales[tier] || 50
  }

  return cost
}

/**
 * Calculate total monthly cost based on pricing info
 * @param {Object} pricing - Pricing info object { hub_type, tier, paid_seats }
 * @returns {number} Total monthly cost in USD
 */
function calculateMonthlyCost(pricing) {
  if (!pricing || !pricing.paid_seats) {
    return 0
  }

  const perSeatCost = getPerSeatCost(pricing.hub_type || 'sales', pricing.tier || 'professional')
  return perSeatCost * pricing.paid_seats
}

/**
 * Calculate potential savings from unused/inactive seats
 * @param {Object} pricing - Pricing info object { hub_type, tier, paid_seats }
 * @param {number} inactiveSeats - Number of inactive seats
 * @returns {number} Potential monthly savings in USD
 */
function calculatePotentialSavings(pricing, inactiveSeats) {
  if (!pricing || inactiveSeats <= 0) {
    return 0
  }

  const perSeatCost = getPerSeatCost(pricing.hub_type || 'sales', pricing.tier || 'professional')
  return perSeatCost * inactiveSeats
}

/**
 * Get pricing display info for UI
 * @param {Object} pricing - Pricing info object
 * @returns {Object} Display info
 */
function getPricingDisplayInfo(pricing) {
  if (!pricing) {
    return {
      perSeatCost: 50, // Default fallback
      totalMonthlyCost: 0,
      hubDisplayName: 'Unknown',
      tierDisplayName: 'Unknown',
    }
  }

  const hubNames = {
    starter_platform: 'Starter Customer Platform',
    marketing: 'Marketing Hub',
    sales: 'Sales Hub',
    service: 'Service Hub',
    content: 'Content Hub',
    operations: 'Operations Hub',
  }

  const tierNames = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }

  const perSeatCost = getPerSeatCost(pricing.hub_type, pricing.tier)

  return {
    perSeatCost,
    totalMonthlyCost: calculateMonthlyCost(pricing),
    hubDisplayName: hubNames[pricing.hub_type] || pricing.hub_type,
    tierDisplayName: tierNames[pricing.tier] || pricing.tier,
    paidSeats: pricing.paid_seats || 0,
  }
}

module.exports = {
  HUBSPOT_PRICING,
  getPerSeatCost,
  calculateMonthlyCost,
  calculatePotentialSavings,
  getPricingDisplayInfo,
}
