# Recurring Value Engine — Development Plan

This plan implements the features described in [recurring-value-strategy.md](recurring-value-strategy.md), mapped against what already exists in the Efficyon codebase.

---

## What We Already Have

| Capability | Status | Where |
| --- | --- | --- |
| Cost leak analysis engine | Done | `backend/src/services/costLeakAnalysis.js` |
| AI-enhanced analysis summaries | Done | `backend/src/controllers/aiController.js` |
| Cron scheduler infrastructure | Done | `backend/src/schedulers/agentScheduler.js` + `node-cron` |
| Email service (Resend) | Done | `backend/src/services/emailService.js` + templates |
| Fortnox invoice data | Done | Full OAuth + supplier invoices, customers, accounts |
| Token billing system | Done | `backend/src/services/tokenService.js` + Stripe |
| Analysis history + export | Done | `cost_leak_analyses` table, PDF/CSV export |
| Dashboard with savings display | Partial | Dashboard page shows total savings from latest analysis |
| Savings tracking over time | Missing | No persistent cumulative savings record |
| Monthly report generation | Missing | No automated report or snapshot comparison |
| Renewal detection | Missing | No contract/renewal pattern analysis |

---

## Phase 1 — Automated Monthly Report

**Goal:** On the 1st of every month, every active customer receives an email report comparing this month's data to last month's snapshot. Zero token cost. No login required.

### 1.1 Monthly Snapshot Storage

**New table: `monthly_snapshots`**

```sql
create table monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  snapshot_month date not null,                    -- first day of month
  total_invoices int,
  total_amount numeric,
  supplier_count int,
  recurring_subscriptions jsonb,                   -- detected SaaS subscriptions
  findings_summary jsonb,                          -- { duplicates, anomalies, unused, etc. }
  cumulative_savings numeric default 0,            -- running total
  raw_data jsonb,                                  -- full snapshot for diff
  created_at timestamptz default now()
);

create unique index idx_snapshot_company_month on monthly_snapshots(company_id, snapshot_month);
```

**Files to create/modify:**
- `backend/src/migrations/create_monthly_snapshots_table.sql` — new migration
- `backend/src/services/snapshotService.js` — new service: `captureMonthlySnapshot(companyId)` and `diffSnapshots(current, previous)`

**Logic:**
- Pull current Fortnox supplier invoices via existing `fortnoxService`
- Run the existing cost leak detection algorithms (no AI, no tokens)
- Store the structured result as the month's snapshot
- Diff against previous month's snapshot to produce a change summary

---

### 1.2 Report Generation Service

**New service: `backend/src/services/monthlyReportService.js`**

Responsibilities:
- Take a snapshot diff and produce a structured report object
- Sections: what changed, flags needing attention, cumulative savings total, one top recommendation
- No AI call — use rule-based logic from existing detection algorithms to keep token cost at zero

**Report data structure:**
```js
{
  companyName: string,
  reportMonth: string,
  changes: {
    newSuppliers: [],
    droppedSuppliers: [],
    newSubscriptions: [],
    amountChanges: [],         // significant cost increases/decreases
    headcountChanges: null     // from Microsoft 365 if connected
  },
  flags: {
    unusedLicenses: [],
    anomalies: [],
    upcomingRenewals: []       // Phase 3
  },
  cumulativeSavings: number,
  topRecommendation: {
    title: string,
    estimatedSaving: number,
    description: string
  }
}
```

---

### 1.3 Email Template + Delivery

**New template: `backend/email-templates/monthly-report.html`**

- Clean, branded HTML email — readable in 2 minutes
- Sections matching the report structure above
- CTA button at the bottom linking to the Efficyon dashboard analysis page
- CTA text: *"Ready to go deeper? Run your monthly cross-platform analysis — takes less than 5 minutes."*

**Modify:** `backend/src/services/emailService.js`
- Add `sendMonthlyReport(email, reportData)` method using the new template

---

### 1.4 Scheduled Job

**Modify:** `backend/src/schedulers/agentScheduler.js` (or create a dedicated `monthlyReportScheduler.js`)

- New cron job: `0 8 1 * *` (1st of every month at 08:00 UTC)
- For each active company with a connected Fortnox integration:
  1. Capture snapshot → `snapshotService.captureMonthlySnapshot()`
  2. Diff against previous month → `snapshotService.diffSnapshots()`
  3. Generate report → `monthlyReportService.generateReport()`
  4. Send email → `emailService.sendMonthlyReport()`
- Log results, handle failures gracefully per-company (one failure doesn't block others)

**Modify:** `backend/src/server.js` — initialize the new scheduler on startup

---

### 1.5 Admin Visibility

**Modify:** Admin dashboard to show:
- List of monthly reports sent (date, company, delivery status)
- Ability to preview/resend a report
- `GET /api/admin/monthly-reports` — new endpoint

---

## Phase 2 — Cumulative Savings Counter

**Goal:** A persistent, always-visible savings total on the dashboard that grows every month.

### 2.1 Savings Tracking Table

**New table: `savings_ledger`**

```sql
create table savings_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  source text not null,                            -- 'analysis', 'monthly_report', 'recommendation_applied'
  source_id uuid,                                  -- reference to analysis or recommendation
  amount numeric not null,
  currency text default 'SEK',
  description text,
  identified_at timestamptz default now()
);

create index idx_savings_company on savings_ledger(company_id);
```

**New service: `backend/src/services/savingsService.js`**
- `recordSaving(companyId, source, amount, description)` — add entry
- `getCumulativeSavings(companyId)` — sum all entries
- `getSavingsTimeline(companyId)` — monthly breakdown for chart

**New endpoint:**
- `GET /api/savings/cumulative` — returns total + monthly breakdown

---

### 2.2 Hook Into Existing Flows

**Modify:** `backend/src/controllers/aiController.js`
- After a successful analysis, call `savingsService.recordSaving()` with identified waste amounts

**Modify:** `backend/src/services/monthlyReportService.js` (from Phase 1)
- After generating a report, record any newly identified savings

**Modify:** Recommendation apply flow
- When a recommendation is marked as applied, record the saving

---

### 2.3 Dashboard Widget

**Modify:** `app/dashboard/page.tsx`

- Add a prominent savings counter card at the top of the dashboard — large number, always visible
- Show cumulative total with a small upward trend indicator
- Secondary text: "Total savings identified since [join date]"
- Optional: sparkline chart showing monthly savings growth

**New component:** `app/components/cumulative-savings-card.tsx`
- Fetches from `GET /api/savings/cumulative`
- Animated number counter on load
- Color: green, prominent placement

---

## Phase 3 — Renewal Alert System

**Goal:** Detect SaaS contracts approaching renewal from Fortnox invoice patterns and alert customers 60–90 days before.

### 3.1 Renewal Detection Service

**New service: `backend/src/services/renewalDetectionService.js`**

**Logic:**
- Query Fortnox supplier invoices for the past 12–24 months
- Group by supplier + similar amounts
- Detect recurring patterns (monthly, quarterly, annual)
- For annual contracts: predict next renewal date based on pattern
- Flag any renewal within the next 60–90 days

**Detection algorithm:**
1. Reuse existing `detectRecurringSubscriptions()` from `costLeakAnalysis.js`
2. Extend it to project the next expected invoice date
3. Compare projected date against today + 60/90 day window
4. Classify confidence: high (3+ data points, regular interval), medium (2 data points), low (estimated)

**Output structure:**
```js
{
  supplier: string,
  estimatedAmount: number,
  renewalDate: date,
  confidence: 'high' | 'medium' | 'low',
  intervalMonths: number,
  historicalInvoices: [],
  recommendation: string        // e.g., "Review before auto-renewal"
}
```

---

### 3.2 Renewal Alerts Table

```sql
create table renewal_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  supplier_name text not null,
  estimated_amount numeric,
  estimated_renewal_date date,
  confidence text,
  status text default 'active',                    -- active, dismissed, actioned
  dismissed_at timestamptz,
  created_at timestamptz default now()
);
```

---

### 3.3 Integration Points

**Monthly report (Phase 1):**
- Include upcoming renewals in the `flags` section of the report email

**Dashboard:**
- New "Upcoming Renewals" card on dashboard showing next 3 renewals with dates and amounts
- Link to full renewals list

**New endpoints:**
- `GET /api/renewals` — list active renewal alerts for the company
- `PATCH /api/renewals/:id/dismiss` — dismiss an alert
- `PATCH /api/renewals/:id/action` — mark as actioned

**New page:** `app/dashboard/renewals/page.tsx`
- Full list of upcoming renewals with filtering and sorting
- Action buttons: dismiss, mark as reviewed, set reminder

---

### 3.4 Scheduled Refresh

- Run renewal detection weekly (e.g., `0 6 * * 1` — every Monday at 06:00 UTC)
- Update/create alerts in `renewal_alerts` table
- Send a standalone email alert if a new high-confidence renewal enters the 60-day window

**New template:** `backend/email-templates/renewal-alert.html`

---

## Phase 4 — Quarterly Deep-Dive Prompt

**Goal:** Every 3 months, prompt the customer to run a comprehensive cross-platform analysis.

### 4.1 Quarterly Notification

**New scheduled job:** `0 8 1 1,4,7,10 *` (1st of Jan, Apr, Jul, Oct at 08:00 UTC)

- Separate from the monthly report — this is a distinct email
- Highlights what a quarterly analysis covers that monthly doesn't:
  - Full stack reorganization opportunities
  - Cross-platform redundancy analysis (if multiple integrations connected)
  - Year-over-year comparison (after 12+ months of data)

**New template:** `backend/email-templates/quarterly-deepdive.html`

**Modify:** `backend/src/services/emailService.js`
- Add `sendQuarterlyPrompt(email, data)` method

---

### 4.2 In-App Notification

**Modify:** Dashboard to show a quarterly analysis prompt banner when it's due
- Only show if the customer hasn't run a multi-source analysis in the current quarter
- Dismissible, reappears next quarter

---

## Implementation Order & Estimates

| Phase | Feature | Dependencies | Complexity |
| --- | --- | --- | --- |
| **1.1** | Monthly snapshot table + service | None | Medium |
| **1.2** | Report generation service | 1.1 | Medium |
| **1.3** | Email template + delivery | 1.2 | Low |
| **1.4** | Scheduled job | 1.1 + 1.2 + 1.3 | Low |
| **1.5** | Admin visibility | 1.4 | Low |
| **2.1** | Savings ledger table + service | None | Low |
| **2.2** | Hook into existing analysis flows | 2.1 | Low |
| **2.3** | Dashboard savings widget | 2.1 | Medium |
| **3.1** | Renewal detection service | None | High |
| **3.2** | Renewal alerts table | 3.1 | Low |
| **3.3** | Dashboard + endpoints | 3.1 + 3.2 | Medium |
| **3.4** | Weekly refresh + alert emails | 3.1 + 3.2 | Low |
| **4.1** | Quarterly email + scheduler | 1.3 (template patterns) | Low |
| **4.2** | In-app quarterly banner | None | Low |

**Recommended build order:** 1.1 → 1.2 → 1.3 → 1.4 → 2.1 → 2.2 → 2.3 → 1.5 → 3.1 → 3.2 → 3.3 → 3.4 → 4.1 → 4.2

Phases 2.1–2.3 can be built in parallel with Phase 1 since they have no dependencies on each other.

---

## Database Migrations Summary

Three new tables required:

1. `monthly_snapshots` — stores monthly data snapshots per company
2. `savings_ledger` — append-only log of identified savings
3. `renewal_alerts` — tracked renewal predictions with status

All tables should have RLS policies matching existing patterns (company_id scoped access).

---

## New Files Summary

**Backend services:**
- `backend/src/services/snapshotService.js`
- `backend/src/services/monthlyReportService.js`
- `backend/src/services/savingsService.js`
- `backend/src/services/renewalDetectionService.js`

**Backend schedulers:**
- `backend/src/schedulers/monthlyReportScheduler.js`
- `backend/src/schedulers/renewalScheduler.js`

**Email templates:**
- `backend/email-templates/monthly-report.html`
- `backend/email-templates/renewal-alert.html`
- `backend/email-templates/quarterly-deepdive.html`

**Database migrations:**
- `backend/src/migrations/create_monthly_snapshots_table.sql`
- `backend/src/migrations/create_savings_ledger_table.sql`
- `backend/src/migrations/create_renewal_alerts_table.sql`

**Frontend components:**
- `app/components/cumulative-savings-card.tsx`
- `app/dashboard/renewals/page.tsx`

**Modified files:**
- `backend/src/server.js` — register new schedulers
- `backend/src/routes/index.js` — new endpoints
- `backend/src/services/emailService.js` — new send methods
- `backend/src/controllers/aiController.js` — hook savings recording
- `app/dashboard/page.tsx` — savings counter + renewal card + quarterly banner
