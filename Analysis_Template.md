# Analysis templates

## Why Efficyon Analysis Templates?

Connecting your data is the first step; knowing **where to save** is the second. Efficyon Templates act as "Smart Filters" that instantly turn thousands of data points into a clear action plan.

### 1. Goal-Oriented Savings

Don't waste time searching. Choose a goal—like **cutting costs** or **reducing risk**—and our AI agents do the hunting for you.

### 2. Tailored for Your Role

- **CFOs:** Use **Cleanup Crew** to stop immediate waste.
- **IT Managers:** Use **Compliance Guard** to find unauthorized software.
- **Procurement:** Use **Deep-Dive Forensic** to verify every cent against your contracts.

---

## How It Works

1. **Pick a Template:** Choose your focus (e.g., "Quick Wins").
2. **AI Scan:** Targeted agents (like the *Waste-Detector*) scan your invoices and logs.
3. **Get Results:** Receive a list of tasks, like: *"Cancel these 15 unused licenses to save $1,500/month."*

**The Result:** From raw data to a savings report in minutes—not weeks.

---

## 1. Template: "The Cleanup Crew" (Quick Wins)

**Objective:** Immediate cash flow maximization by eliminating undeniable waste.

- **Targeting:** Inactive licenses, orphaned accounts, and redundant subscriptions.
- **AI Prompt Logic:** > "Identify all user seats with zero login activity in the last 30 days. Cross-reference `usage_logs.db` with `invoices.json` to calculate potential monthly savings. Flag applications with overlapping functionality (e.g., presence of both Zoom and Microsoft Teams) and recommend consolidation."
- **Primary KPI:** **TMAS** (Total Monthly Avoidable Spend).

## 2. Template: "The Compliance Guard" (Risk & Shadow IT)

**Objective:** Protecting the organization from legal liabilities and security breaches.

- **Targeting:** Shadow IT, GDPR/DPA gaps, and license overages.
- **AI Prompt Logic:** > "Scan `accounting_data` for vendors not present in the `approved_vendors.csv` master list. Identify services processing PII (Personally Identifiable Information) that lack a recorded DPA. Alert if the total number of active users exceeds the maximum seat count defined in `licenses.csv`."
- **Primary KPI:** **Unmanaged Vendor Count**.

## 3. Template: "The Growth Scaler" (Efficiency & Unit Economics)

**Objective:** Ensuring SaaS costs scale linearly (or sub-linearly) with headcount.

- **Targeting:** Cost per employee, pro-rated onboarding costs, and billing cycles.
- **AI Prompt Logic:** > "Calculate 'SaaS Spend per FTE' (Full-Time Equivalent) and compare against the previous quarter. Analyze `Contract-Match-Agent` data to find patterns in pro-rated fees during hiring surges. Recommend migration to annual billing for services with >90% user retention to capture discounts."
- **Primary KPI:** **Spend per Seat** / **% Annual vs. Monthly Billing**.

## 4. Template: "The Deep-Dive Forensic" (Complex Anomalies)

**Objective:** Detecting the "hidden" leaks that standard filters miss, like our 'Mid-Month Pivot' scenario.

- **Targeting:** Price drift, hidden fees, and erroneous pro-rata calculations.
- **AI Prompt Logic:** > "Execute a 'Two-way analysis' at the line-item level. Compare every billed SKU against historical unit prices. Flag any price increases >5% not explicitly defined in the contract. Verify that offboarding events in the HR system sync with invoice termination no later than the subsequent billing cycle."
- **Primary KPI:** **Price Drift Error Rate (%)**.