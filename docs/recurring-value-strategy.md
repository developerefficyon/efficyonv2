# The Core Problem We're Solving

A monthly subscription dies when the customer feels the value was one-time. Our job is to make sure Efficyon delivers something new and visible every single month — automatically — whether the customer logs in or not.

---

## The Two-Layer Model

Efficyon's recurring value runs on two layers that work together:

**Layer 1 — Automatic** (happens without the customer doing anything)
**Layer 2 — Manual** (prompted by Layer 1)

Layer 1 creates the habit. Layer 2 creates the depth. Together they justify the subscription every month.

---

## Layer 1 — The Automatic Monthly Report

**What it is**
A lightweight email report delivered to the customer's inbox on the 1st of every month. No login required. No action needed from the customer.

**What it contains**

- What changed in their stack since last month — new licenses, dropped usage, new SaaS invoices, headcount changes
- Flags that need attention — unused licenses, anomalies, upcoming renewals
- Their cumulative savings total since joining Efficyon
- One recommended action with an estimated saving attached

**What it is not**
Not a deep analysis. Not comprehensive. A lightweight pulse check — readable in 2 minutes.

**Token cost**
Zero. Always free. No friction, no decision to make.

**The CTA at the bottom of every report**
> *"Ready to go deeper? Run your monthly cross-platform analysis in Efficyon — takes less than 5 minutes and typically surfaces savings this report doesn't catch."*

**The difference in one sentence**
The automated report tells them what changed. The manual analysis tells them what it means.

---

## Layer 2 — The Monthly Manual Analysis

**What it is**
A prompted cross-platform analysis the customer runs themselves once a month inside Efficyon — triggered by the monthly report.

**Why they do it**
The automated report surfaces changes and flags. The manual analysis goes deeper on those flags — it finds the structural savings, the anomalies, the cross-platform insights that only appear when you look at SaaS usage against accounting data together.

**How it differs from the automated report**

|  | Automated Report | Manual Analysis |
| --- | --- | --- |
| Triggered by | Efficyon automatically | The customer |
| Depth | Lightweight, change-focused | Deep, comprehensive |
| Delivered | Email inbox | Inside the platform |
| Time to consume | 2 minutes | 20–30 minutes |
| Token cost | Zero | Yes, deducts tokens |
| Frequency | Every month, same date | Once a month, when ready |
| Purpose | What changed | What it means and what to do |

---

## The Cumulative Savings Counter

Visible on the dashboard every time the customer logs in. Shows total savings identified since joining Efficyon — not projected, not estimated, actual waste found.

This number grows every month. Nobody cancels something that shows them a growing number in their favor.

This is the single most important retention visual in the entire product.

---

## The Renewal Alert System

Efficyon automatically flags any SaaS contract coming up for renewal in the next 60–90 days — pulled from Fortnox invoice patterns.

Delivered as a flag in the monthly report and as a separate alert inside the platform.

A CFO who gets warned about an auto-renewal they would have missed will never cancel Efficyon. This feature alone justifies the subscription.

---

## The Monthly Rhythm

This is what a customer's experience looks like every month:

**Day 1** — Automatic report arrives in inbox. 2 minutes to read. Flags anything that changed.

**Day 1–7** — Customer logs into Efficyon, prompted by the report. Runs a manual cross-platform analysis on the flagged items. Finds the deeper savings.

**Ongoing** — Renewal alerts surface as needed. Savings counter grows. Stack stays optimized.

**Every quarter** — A deeper structural analysis — not just what changed but how the entire stack could be reorganized. Gives the subscription a bigger moment four times a year.

---

## Why Customers Stay

They stay because Efficyon shows up every month without being asked. The report arrives. The savings counter grows. The renewal alert catches something they would have missed. The manual analysis finds something new.

The customer who cancels is the one who had to go looking for value and didn't find it. We make sure value finds them first.

---

## What Needs to Be Built

In priority order:

1. **Automated monthly report** — scheduled job, runs on the 1st, compares current data against last month's snapshot, generates and emails a clean report. Reuses existing analysis engine.

2. **Cumulative savings counter on dashboard** — already partially exists, needs to be prominent and always visible on login.

3. **Renewal alert system** — pulls invoice patterns from Fortnox, flags contracts renewing within 60–90 days, surfaces in report and dashboard.

4. **Quarterly deep-dive prompt** — a triggered notification every 3 months prompting a more comprehensive analysis.
