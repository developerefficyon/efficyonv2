/**
 * Atlassian Cloud tier-guidance constants. USD/user/mo (annual billing).
 *
 * Atlassian's pricing is sliding-scale by user count and varies between
 * Standard / Premium tiers. We do NOT use these for the analysis math —
 * the customer enters per-product cost in the connect form. These constants
 * power form hints + the dashboard pricing note only. Update annually.
 */

const TIER_GUIDANCE = {
  jira: {
    standard: 7.75,
    premium:  15.25,
  },
  confluence: {
    standard: 6.05,
    premium:  11.55,
  },
}

const PRICING_NOTE =
  "Savings shown at the per-seat costs you entered. Atlassian's published " +
  "list-price guidance: Jira Software Standard ~$7.75 / Premium ~$15.25, " +
  "Confluence Standard ~$6.05 / Premium ~$11.55 per user/mo (annual). " +
  "Apply your negotiated discount for actual recovery."

module.exports = { TIER_GUIDANCE, PRICING_NOTE }
