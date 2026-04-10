# Fortnox Integration — Data Security & Read-Only Policy

## What This Document Covers

This document explains exactly how Efficyon connects to your Fortnox account, what data we access, and — critically — what we **cannot** and **will never** do with your data.

---

## The Short Version

**Efficyon only reads data from Fortnox. We never create, modify, or delete anything in your account.**

Every single API call we make to Fortnox uses the `GET` method — the standard HTTP method for reading data. We have no code paths that use `POST`, `PUT`, `PATCH`, or `DELETE` against any Fortnox business endpoint. It is technically impossible for our integration to change your data.

---

## How the Connection Works

### Step 1 — You Authorise Access

When you connect Fortnox in Efficyon, you are redirected to Fortnox's own login page (OAuth 2.0). You log in with your Fortnox credentials — we never see your password. Fortnox then asks you to approve the specific permissions (scopes) Efficyon is requesting.

**You are always in control.** You can revoke Efficyon's access at any time from within Fortnox under *Settings > Integrations*.

### Step 2 — We Receive a Token

After you approve, Fortnox gives Efficyon a time-limited access token. This token:

- Expires automatically and is refreshed securely when needed
- Is encrypted at rest in our database using AES-256 encryption
- Can only access the scopes you approved — nothing more
- Is revoked immediately if you disconnect the integration

### Step 3 — We Read Your Data

Using that token, Efficyon reads data from the following Fortnox endpoints — all via `GET` requests:

| What We Read | Fortnox Endpoint | Fortnox Scope Required | Why We Need It |
|---|---|---|---|
| Company information | `/companyinformation` | `companyinformation` | Identify your company and currency |
| Customers | `/customers` | `customer` | Understand your customer base for analysis |
| Invoices | `/invoices` | `invoice` | Detect SaaS subscriptions and recurring costs |
| Supplier invoices | `/supplierinvoices` | `supplierinvoice` | Identify vendor spend, cost leaks, and anomalies |
| Accounts | `/accounts` | `bookkeeping` | Map costs to account categories |
| Vouchers | `/vouchers` | `bookkeeping` | Cross-reference transactions for accuracy |

### Step 4 — We Analyse, Not Modify

All analysis happens **outside of Fortnox**, inside Efficyon's own systems. We use AI to detect:

- Unused or underused SaaS licenses
- Billing anomalies and inconsistencies
- Cost optimisation opportunities
- Price drift over time

The results are presented to you as recommendations. **You decide what to act on.** We never make changes on your behalf.

---

## What We Do NOT Do

| Action | Does Efficyon Do This? |
|---|---|
| Read invoices and company data | Yes |
| Create, edit, or delete invoices | **No — never** |
| Create, edit, or delete customers | **No — never** |
| Create, edit, or delete supplier invoices | **No — never** |
| Post journal entries or vouchers | **No — never** |
| Modify your chart of accounts | **No — never** |
| Change any settings in Fortnox | **No — never** |
| Access your Fortnox password | **No — technically impossible** |

---

## Technical Guarantees

1. **Read-only API calls** — Every Fortnox API call uses `GET`. There are zero `POST`, `PUT`, `PATCH`, or `DELETE` calls to any Fortnox business data endpoint.

2. **Encrypted credentials** — Your OAuth tokens are encrypted with AES-256 before being stored. They are decrypted only at the moment of an API call.

3. **Rate-limited** — We respect Fortnox's API limits (25 requests per 5 seconds) and will never overload your account.

4. **Scoped access** — We only request the specific Fortnox scopes listed above. We cannot access data outside those scopes.

5. **Revocable at any time** — Disconnect the integration from Efficyon or revoke access directly in Fortnox. All stored tokens are deleted immediately.

---

## Optional: Fortnox-Enforced Read-Only Access

While Efficyon only makes read-only API calls by design, some customers want an additional guarantee enforced by Fortnox itself. This is possible using the **Fortnox Läs** (Fortnox Read) license.

### How It Works

When a Fortnox integration is activated by a user (rather than a service account), the integration inherits that user's license permissions. If the activating user only has the **Fortnox Läs** license, the integration is restricted to read-only access at the Fortnox API level — regardless of what scopes are granted. This means even if our code attempted a write operation (which it never does), Fortnox would block it.

### Setup Steps

1. **Create a dedicated user** in your Fortnox account (e.g. "Efficyon Integration").
2. **Assign the Fortnox Läs license** to that user — do not assign the full Fortnox license.
3. **Activate the Efficyon integration** using that user's account. When redirected to Fortnox during the OAuth flow, log in as this dedicated user.

The integration will now be technically restricted to read-only access by Fortnox itself.

### Important Notes

- The **Fortnox Läs** license is a separate license that may involve additional cost from Fortnox.
- This step is **entirely optional**. Efficyon already only uses read-only API calls regardless of permissions granted.
- This option exists for customers who require Fortnox-enforced guarantees for compliance or internal policy reasons.
- The dedicated user must have access to the company data you want Efficyon to analyse (invoices, suppliers, etc.).

---

## Data Flow Summary

```
Your Fortnox Account
        |
        | (1) You authorise via Fortnox login page
        v
   OAuth 2.0 Token (encrypted, time-limited)
        |
        | (2) Read-only GET requests
        v
   Efficyon reads: invoices, supplier invoices,
   customers, accounts, company info
        |
        | (3) Analysis happens in Efficyon — not in Fortnox
        v
   Cost optimisation recommendations
   presented to you in your dashboard
        |
        | (4) You decide what to act on
        v
   No changes are ever made to Fortnox by Efficyon
```

---

## Frequently Asked Questions

**Can Efficyon accidentally change my data?**
No. Our code has no ability to write to Fortnox. There is no code path — accidental or otherwise — that modifies your Fortnox data.

**What happens if I revoke access?**
Efficyon immediately loses the ability to read your Fortnox data. Your existing analysis reports remain in Efficyon, but no new data will be fetched.

**Is my data shared with third parties?**
No. Your Fortnox data is used solely for generating your analysis within Efficyon. It is not sold, shared, or exposed to other customers.

**Where is my data stored?**
Analysis results are stored in Efficyon's secure database. Raw Fortnox data is processed in memory and not permanently stored beyond what is needed for your reports.

**Who can see my data?**
Only users within your company who have access to your Efficyon workspace.

**Can I guarantee read-only access at the Fortnox level?**
Yes. If you activate the integration using a Fortnox user that has only the Fortnox Läs (Read) license, Fortnox itself will enforce read-only access at the API level. See the "Fortnox-Enforced Read-Only Access" section above for setup instructions.

---

*Questions? Contact us at info@efficyon.com*
