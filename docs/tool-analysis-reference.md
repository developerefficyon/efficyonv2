# What Each Tool Analyzes

This document describes what the Efficyon platform checks for on each connected integration. Tools fall into two categories based on how their results are stored (see [CLAUDE.md](../CLAUDE.md) — "Two distinct analysis storage systems"):

- **Cost-leak tools** — rule-based anomaly detection. Findings are written to `cost_leak_analyses` and appear in the dashboard History tab.
- **Usage-summary tools** — daily cost/token pulls for AI-consumption APIs. Results are stored in per-provider `*_usage` tables and surfaced via `usage_summaries` narratives.

Analysis code lives in [backend/src/services/](../backend/src/services/). The frontend tool registry is [frontend/lib/tools/registry.ts](../frontend/lib/tools/registry.ts).

---

## Cost-Leak Tools

These integrations run deterministic rules against ingested data and return a list of findings, each with severity, estimated savings, and a recommendation.

### Fortnox — Swedish accounting

Analysis: [costLeakAnalysis.js](../backend/src/services/costLeakAnalysis.js)
Data source: Fortnox API — supplier invoices, customer invoices, invoice rows.

Checks:
- **Duplicate supplier payments** — same vendor, same amount, within 30 days.
- **Unusual invoice amounts** — outliers >2 standard deviations above the mean (or >1.5× average).
- **Recurring subscriptions** — three or more invoices at a regular cadence (≥7 day intervals, amount variance ≤10%). Flags for annual-plan discount opportunities.
- **Overdue supplier invoices** — unpaid past due date; severity escalates past 60 days.
- **Vendor price increases** — >20% year-over-year flagged; >50% marked high severity.
- **Overdue customer invoices (AR aging)** — bucketed 0–30 / 31–60 / 61–90 / 90+ days; revenue at risk reported.

### Microsoft 365 — Licenses & add-ons

Analysis: [microsoft365CostLeakAnalysis.js](../backend/src/services/microsoft365CostLeakAnalysis.js)
Data source: Microsoft Graph — `users`, `subscribedSkus`, `signInActivity`.

Checks:
- **Inactive licenses** — no sign-in ≥30 days (medium) / ≥60 days (high) / ≥90+ or never (critical).
- **Orphaned licenses** — disabled accounts that still hold active license assignments.
- **Over-provisioned tiers** — E5/E3 users with low activity; recommends downgrade to E1/Business Standard.
- **Unused add-ons** — Project, Visio, Phone System, etc. assigned to inactive users or <50% org-wide utilization.
- **SKU-aware pricing** — 25+ license tiers (E1/E3/E5, Business Basic/Standard/Premium, Frontline, add-ons) feeding savings estimates.

### HubSpot — Seat utilization

Analysis: [hubspotCostLeakAnalysis.js](../backend/src/services/hubspotCostLeakAnalysis.js)
Data source: HubSpot API — `users.list` with `lastLoginAt`, `roleIds`, `userProvisioningState`.

Checks:
- **Inactive seats** — no login ≥30 days. >5 inactive = high, >2 = medium.
- **Unassigned roles** — users without a role attached; >3 = medium.
- **Low seat utilization** — <50% active in last 7 days = high; 50–75% = medium.
- **Moderate utilization** — partial activity in the 7–30 day window flagged as downgrade candidates.

### QuickBooks — Vendor & receivables

Analysis: [quickbooksCostLeakAnalysis.js](../backend/src/services/quickbooksCostLeakAnalysis.js)
Data source: QuickBooks Online — Bills, Invoices, Purchases/Expenses with `VendorRef`, `AccountRef`, `TxnDate`.

Checks:
- **Duplicate vendor payments** — same vendor + amount within 30 days; >$1000 = high, >$100 = medium.
- **Unusual bill amounts** — >2σ or >1.5× average outliers.
- **Recurring subscriptions** — 3+ bills with similar amounts; flags ~15% annual-plan discount potential.
- **Vendor price increases** — >20% first-to-last bill increase; >50% = high.
- **Overdue receivables by aging** — 0–30 / 31–60 / 61–90 / 90+ buckets; 90+ = critical.
- **Category spending spikes** — month-over-month category change >25%.

### Shopify — Apps, inventory & margins

Analysis: [shopifyCostLeakAnalysis.js](../backend/src/services/shopifyCostLeakAnalysis.js)
Data source: Shopify Admin API — products, variants, orders, app charges, shipping lines.

Checks:
- **App subscription costs** — active charges; >$100/month = high, >$30 = medium.
- **Dead inventory** — in-stock products with zero sales in 90 days; >$500 tied up = high.
- **Low product margins** — <20% margin flagged; <10% = barely profitable.
- **High shipping costs** — >15% of average order value; recommend carrier negotiation.
- **Discount overuse** — discounts >15% of gross revenue (>25% = high).
- **Low-revenue products** — products contributing <1% of revenue; zero-revenue = prune candidates.

### Google Workspace — Licenses & security

Analysis: [googleWorkspaceCostLeakAnalysis.js](../backend/src/services/googleWorkspaceCostLeakAnalysis.js)
Data source: Google Admin SDK — `users.list`, License Manager, Reports audit (`lastLoginByUser`).

Checks:
- **Suspended users with licenses** — highest-priority finding; unassign for immediate savings.
- **Inactive licensed users** — never-logged-in or >90 days = high; 30–90 days = medium.
- **Missing 2-Step Verification** — admin accounts without 2SV = critical; standard users = low (compliance finding).
- **Downgrade candidates** — Business Plus / Enterprise Plus users with light recent usage (~$7/mo/user savings).

### Slack — Seat waste

Analysis: [slackCostLeakAnalysis.js](../backend/src/services/slackCostLeakAnalysis.js)
Data source: Slack API — `users.list`, `team.billableInfo`, `team.info`.

Checks:
- **Inactive billable seats** — no profile activity (`updated` field) ≥30 days.
- **Deactivated but still billable** — `user.deleted = true` but `team.billableInfo` still active (data-lag bug costing money).
- **Multi-channel guest overbilling** — guests incorrectly billed instead of treated as free single-channel.
- **Plan support gate** — Free and Enterprise Grid return early as unsupported (health score = 100).

### AWS — EC2, storage, Lambda, RDS, ECS

Analysis: [awsCostLeakAnalysis.js](../backend/src/services/awsCostLeakAnalysis.js), [awsCostExplorerAnalysis.js](../backend/src/services/awsCostExplorerAnalysis.js), [awsComputeOptimizerAnalysis.js](../backend/src/services/awsComputeOptimizerAnalysis.js)
Data source: AWS Cost Explorer + Compute Optimizer (org-wide via `includeMemberAccounts: true`).

Cost Explorer checks:
- **EC2 rightsizing** — idle instances (terminate) vs. over/under-provisioned (modify; same instance family).
- **Savings Plans** — COMPUTE_SP 1-year no-upfront recommendations.
- **Reserved Instances** — EC2 RI 1-year no-upfront recommendations.

Compute Optimizer checks (fan-out across regions, 30s per-region timeout):
- EC2 instances (over/under-provisioned)
- EBS volumes (type and size)
- Lambda functions (memory sizing)
- Auto Scaling Groups (launch template instance type)
- ECS services (CPU/memory)
- RDS instances (class downsizing)
- Idle resources via `GetIdleRecommendationsCommand`

Severity map: ≥$500/mo = critical, ≥$100 = high, ≥$25 = medium, >$0 = low.

### Azure — Advisor cost recommendations

Analysis: [azureCostLeakAnalysis.js](../backend/src/services/azureCostLeakAnalysis.js), [azureAdvisorAnalysis.js](../backend/src/services/azureAdvisorAnalysis.js)
Data source: Azure Advisor API, `Category eq 'Cost'`, per subscription (multi-sub via `active_subscriptions`).

Checks, normalized into three categories:
- **Reservation** — reserved-instance purchase recommendations.
- **Idle** — resources with zero/near-zero activity.
- **Rightsizing** — instance/resource optimization.

Savings pulled from `extendedProperties` (`annualSavingsAmount ÷ 12`, `savingsAmount`, `monthlySavings`). Same severity ladder as AWS.

### GCP — Recommender fan-out

Analysis: [gcpRecommenderAnalysis.js](../backend/src/services/gcpRecommenderAnalysis.js)
Data source: GCP Recommender API v1 across all ACTIVE projects × 7+ recommenders × locations.

Recommenders covered:
- `compute.instances.idleDeletion`
- `compute.instances.wrongMachineType`
- `compute.disks.downsize`
- `compute.addresses.delete`
- …and more

Cost is read straight from `primaryImpact.costProjection.cost` (Google's own nano-unit projection). Action steps pulled from `content.operationGroups[].operations[].description`. Severity derived from `recommendation.priority` and `recommender.severity`.

### Zoom — Licenses & add-ons

Analysis: [zoomCostLeakAnalysis.js](../backend/src/services/zoomCostLeakAnalysis.js), [zoomUsageAnalysis.js](../backend/src/services/zoomUsageAnalysis.js)
Data source: Zoom API — `users.list`, `accounts/me/plans/addons`.

Checks:
- **Inactive licensed users** — `type === 2` with `last_login_time` ≥30 days; savings = tier price.
- **Unused add-ons** — Webinar ($79), Events ($99), Phone ($15/mo): `hosts_used = 0` but `hosts > 0`.

### GitHub — Copilot & paid seats

Analysis: [githubCostLeakAnalysis.js](../backend/src/services/githubCostLeakAnalysis.js), [githubUsageAnalysis.js](../backend/src/services/githubUsageAnalysis.js)
Data source: GitHub REST API — `/orgs/{org}/members`, `/orgs/{org}/copilot/billing/seats`, `/orgs/{org}/copilot/billing`.

Checks:
- **Inactive Copilot seats** — `last_activity_at` ≥30 days. Business $19/seat, Enterprise $39/seat.
- **Inactive paid org members** — no public events in the threshold window. Team $4/seat, Enterprise $21/seat.
- **Copilot over-provisioning** — `total_seats > 1.25 × active_this_cycle`; excess seats reported as surplus.

### Stripe — Revenue recovery

Analysis: [stripeRevenueLeakAnalysis.js](../backend/src/services/stripeRevenueLeakAnalysis.js)
Data source: Stripe API — invoices, subscriptions, customers/payment methods, disputes.

Checks (V1, recovery-only):
- **Failed payment recovery** — open invoices with `attempt_count ≥ 1`; recoverable estimate = 65% of total at risk (B2B SaaS dunning benchmark). Severity by total $ per currency.
- **Card-expiry preventable churn** — active subscriptions whose default payment method is a card expiring in the next 60 days. Potential loss = monthly-normalized MRR per customer.
- **Past-due subscriptions** — `status = past_due` or `status = unpaid`. Severity by MRR.
- **Disputes / chargebacks** — `disputes.list` over the lookback window. Loss = dispute amount + approximate $15/dispute Stripe fee.

Severity ladder: ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — same as AWS/Azure/GCP.
Lookback: user-selectable 30 / 90 / 180 days, default 90.

---

## Usage-Summary Tools (AI-consumption)

These providers don't run rule-based findings — they pull daily cost and token usage and feed it into an LLM-generated narrative summary stored in `usage_summaries`. Raw daily rows land in per-provider tables.

### OpenAI

Analysis: [openaiCostAnalysis.js](../backend/src/services/openaiCostAnalysis.js)
Requires: Admin API key (`sk-admin-...`).

Pulls:
- `/organization/costs` — grouped by `line_item`, daily buckets, 180-day cap per page.
- `/organization/usage/completions` — grouped by `model`, daily buckets (input/output/cached tokens).

Stored in `openai_usage` keyed on (`company_id`, `date`, `model`, `line_item`).

### Anthropic

Analysis: [anthropicCostAnalysis.js](../backend/src/services/anthropicCostAnalysis.js)
Requires: Admin API key (`sk-ant-admin01-...`).

Pulls:
- `/organizations/cost_report` — grouped by `model`, daily buckets.
- `/organizations/usage_report/messages` — daily input/output/cache-read tokens by model.

Stored in `anthropic_usage` keyed on (`company_id`, `date`, `model`, `line_item`).

### Gemini (Google AI)

Analysis: [geminiCostAnalysis.js](../backend/src/services/geminiCostAnalysis.js)
Requires: Service account JSON (monitoring read; optionally BigQuery read).

Dual-path ingestion:
- **Primary — Cloud Monitoring:** metrics `generativelanguage.googleapis.com/quota/...` and `serviceruntime.googleapis.com/quota/used`, grouped by model, aggregated daily. Cost estimated from the hardcoded `GEMINI_PRICES` table (unknown models default to Pro pricing).
- **Optional — BigQuery billing export:** if the user supplies a dataset/table, actual billing rows for `service = "Generative Language%"` override Monitoring's estimate.

Stored in `gemini_usage` keyed on (`company_id`, `date`, `model`, `line_item`).

Caveats documented in the service:
- Pricing constants last verified 2026-04-14.
- Cache storage fee (~$4.50/M/hour) not modeled.
- Long-context Pro requests may be under-billed without the BigQuery export path.

---

## Quick Reference Table

| Tool | Category | Key Signals |
|---|---|---|
| Fortnox | Cost-leak | duplicate vendor payments, recurring subs, price hikes, AR/AP aging |
| Microsoft 365 | Cost-leak | inactive licenses, over-provisioned tiers, unused add-ons |
| HubSpot | Cost-leak | inactive seats, low utilization, unassigned roles |
| QuickBooks | Cost-leak | duplicate bills, price hikes, aging receivables |
| Shopify | Cost-leak | app costs, dead inventory, margins, shipping, discounts |
| Google Workspace | Cost-leak | suspended-with-license, inactivity, missing 2SV, downgrades |
| Slack | Cost-leak | inactive billable seats, deactivated-but-billed, guest overbilling |
| AWS | Cost-leak | EC2/EBS/Lambda/RDS/ECS rightsizing, Savings Plans, RIs, idle |
| Azure | Cost-leak | Advisor reservations, idle, rightsizing |
| GCP | Cost-leak | idle VMs, wrong machine types, disk downsizing, unused IPs |
| Zoom | Cost-leak | inactive licensed users, unused add-ons |
| GitHub | Cost-leak | inactive Copilot seats, inactive paid members, Copilot over-provisioning |
| Stripe | Cost-leak (recovery) | failed payment recovery, card-expiry churn, past-due subs, disputes |
| OpenAI | Usage summary | daily cost + token breakdown by model |
| Anthropic | Usage summary | daily cost + input/output/cache-read tokens by model |
| Gemini | Usage summary | Monitoring-derived usage with optional BigQuery actuals |
