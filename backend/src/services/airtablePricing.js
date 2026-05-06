/**
 * Airtable tier-guidance constants. USD/seat/mo (annual billing).
 *
 * The customer enters their actual per-seat cost in the connect form. These
 * constants power form hints, the dashboard pricing note, and tier-downgrade
 * savings math. Update annually if Airtable changes pricing.
 *
 * Airtable bills per-seat with feature-tier gating (base limit, record limit,
 * sync frequency, app/extension count). Recovery comes from:
 *   - Removing seats the customer doesn't actually need (overprovisioning)
 *   - Downgrading to a lower tier when feature usage doesn't justify it
 *     (e.g., Business → Team if record/base counts are well within Team limits)
 *
 * Free read-only & comment-only collaborators are available on Team and above
 * (one of the few seat types Airtable doesn't bill for). Editor / Creator /
 * Owner roles are billable.
 */

const TIER_GUIDANCE = {
  free:        { usdPerSeatMonthly: 0,  baseLimit: 5,   recordLimit: 1000,    label: "Free" },
  team:        { usdPerSeatMonthly: 20, baseLimit: 50,  recordLimit: 50000,   label: "Team" },
  business:    { usdPerSeatMonthly: 45, baseLimit: 100, recordLimit: 125000,  label: "Business" },
  enterprise:  { usdPerSeatMonthly: null, baseLimit: null, recordLimit: null, label: "Enterprise Scale" }, // custom
}

// Airtable paid plans require a 1-seat minimum on Team; Business and Enterprise
// have no codified minimum but most contracts negotiate a floor.
const MIN_PAID_SEATS = 1

// Plans that include free read-only & comment-only collaborators. On these
// plans, surfacing misclassified editors (users marked as creator/editor who
// only need read access) is a recoverable leak.
const FREE_GUEST_PLANS = new Set(["team", "business", "enterprise"])

// Plans where a tier-downgrade can be evaluated (Business → Team) when feature
// usage fits the lower tier.
const DOWNGRADABLE_TIERS = new Set(["business"])

const PRICING_NOTE =
  "Savings shown at the per-seat cost you entered. Airtable list prices: " +
  "Team $20/seat/mo, Business $45/seat/mo (annual). Free read-only and " +
  "comment-only collaborators are included on Team and above — converting " +
  "misclassified editors to read-only roles recaptures the full per-seat " +
  "cost. Apply your negotiated discount for actual recovery."

module.exports = {
  TIER_GUIDANCE,
  MIN_PAID_SEATS,
  FREE_GUEST_PLANS,
  DOWNGRADABLE_TIERS,
  PRICING_NOTE,
}
