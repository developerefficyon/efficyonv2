/**
 * Seed the 4 analysis templates from Analysis_Template.md
 * Run with: node backend/scripts/seed-analysis-templates.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })
const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEMPLATES = [
  {
    slug: "cleanup_crew",
    name: "The Cleanup Crew",
    version: 1,
    is_active: true,
    objective: "Immediate cash flow maximization by eliminating undeniable waste.",
    targeting_scope: {
      targets: ["inactive_licenses", "orphaned_accounts", "redundant_subscriptions", "overlapping_tools"],
    },
    ai_prompt_logic:
      "Identify all user seats with zero login activity in the last {inactivity_days} days. Cross-reference usage_logs with invoices to calculate potential monthly savings. Flag applications with overlapping functionality (e.g., presence of both Zoom and Microsoft Teams) and recommend consolidation.",
    primary_kpi: "TMAS",
    kpi_description: "Total Monthly Avoidable Spend",
    applicable_integrations: ["Fortnox", "Microsoft365", "HubSpot"],
    parameters: { inactivity_days: 30, overlap_check: true },
  },
  {
    slug: "compliance_guard",
    name: "The Compliance Guard",
    version: 1,
    is_active: true,
    objective: "Protecting the organization from legal liabilities and security breaches.",
    targeting_scope: {
      targets: ["shadow_it", "gdpr_gaps", "license_overages", "unapproved_vendors"],
    },
    ai_prompt_logic:
      "Scan accounting data for vendors not present in the approved vendor list. Identify services processing PII that lack a recorded DPA. Alert if the total number of active users exceeds the maximum seat count defined in licenses.",
    primary_kpi: "Unmanaged Vendor Count",
    kpi_description: "Number of vendors not in approved list",
    applicable_integrations: ["Fortnox", "Microsoft365", "HubSpot"],
    parameters: { approved_vendors_check: true, dpa_required: true },
  },
  {
    slug: "growth_scaler",
    name: "The Growth Scaler",
    version: 1,
    is_active: true,
    objective: "Ensuring SaaS costs scale linearly or sub-linearly with headcount.",
    targeting_scope: {
      targets: ["cost_per_fte", "prorated_onboarding", "billing_cycles", "retention_based_discounts"],
    },
    ai_prompt_logic:
      "Calculate SaaS Spend per FTE (Full-Time Equivalent) and compare against the previous quarter. Analyze patterns in pro-rated fees during hiring surges. Recommend migration to annual billing for services with >90% user retention to capture discounts.",
    primary_kpi: "Spend per Seat",
    kpi_description: "SaaS spend divided by active FTE count",
    applicable_integrations: ["Fortnox", "Microsoft365", "HubSpot"],
    parameters: { fte_count_source: "m365_users", annual_billing_threshold: 90 },
  },
  {
    slug: "deep_dive_forensic",
    name: "The Deep-Dive Forensic",
    version: 1,
    is_active: true,
    objective: "Detecting hidden leaks that standard filters miss, like price drift and erroneous pro-rata calculations.",
    targeting_scope: {
      targets: ["price_drift", "hidden_fees", "erroneous_prorata", "line_item_comparison"],
    },
    ai_prompt_logic:
      "Execute a two-way analysis at the line-item level. Compare every billed SKU against historical unit prices. Flag any price increases >5% not explicitly defined in the contract. Verify that offboarding events in the HR system sync with invoice termination no later than the subsequent billing cycle.",
    primary_kpi: "Price Drift Error Rate",
    kpi_description: "Percentage of SKUs with unexplained price changes",
    applicable_integrations: ["Fortnox", "Microsoft365"],
    parameters: { price_drift_threshold: 5, offboarding_sync_days: 30 },
  },
]

async function seed() {
  console.log("Seeding analysis templates...")

  for (const template of TEMPLATES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("analysis_templates")
      .select("id")
      .eq("slug", template.slug)
      .eq("version", template.version)
      .maybeSingle()

    if (existing) {
      console.log(`  Skipping '${template.slug}' v${template.version} (already exists)`)
      continue
    }

    const { error } = await supabase.from("analysis_templates").insert(template)

    if (error) {
      console.error(`  Failed to seed '${template.slug}':`, error.message)
    } else {
      console.log(`  Seeded '${template.slug}' v${template.version}`)
    }
  }

  console.log("Done.")
}

seed().catch(console.error)
