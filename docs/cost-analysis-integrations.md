# Cost Analysis Integrations — Complete Guide

A reference catalog of every integration worth adding to Effycion's Tools tab for cost analysis, ranked by impact and documented with auth method, endpoints, data shape, and priority.

---

## Table of Contents

1. [How to Read This Document](#how-to-read-this-document)
2. [Prioritization Framework](#prioritization-framework)
3. [Current Integrations (Baseline)](#current-integrations-baseline)
4. [Tier 1 — Ship Next (Highest ROI)](#tier-1--ship-next-highest-roi)
5. [Tier 2 — Cloud Infrastructure](#tier-2--cloud-infrastructure)
6. [Tier 3 — AI / ML Providers](#tier-3--ai--ml-providers)
7. [Tier 4 — SaaS Licensing & Productivity](#tier-4--saas-licensing--productivity)
8. [Tier 5 — Sales / Marketing / Support](#tier-5--sales--marketing--support)
9. [Tier 6 — Finance & Spend Management](#tier-6--finance--spend-management)
10. [Common Integration Plumbing](#common-integration-plumbing)
11. [Normalized Cost Schema](#normalized-cost-schema)
12. [Auth Patterns Cheat Sheet](#auth-patterns-cheat-sheet)
13. [Build Order Recommendation](#build-order-recommendation)

---

## How to Read This Document

Every integration entry follows the same structure so you can scan fast:

- **Auth** — how the user connects (OAuth2, API key, service account, etc.)
- **Key endpoints** — the specific API paths that return cost/usage data
- **Cost signal** — what you extract and show to the user
- **Sync cadence** — how often to poll
- **Effort** — rough build time (S = <1 day, M = 1–3 days, L = 3+ days)
- **Why it matters** — business value for cost analysis

---

## Prioritization Framework

Not all integrations are equal. Rank candidates by:

1. **Spend size** — how big is this line item for a typical customer? (Cloud > SaaS seats > AI APIs for most)
2. **Discovery power** — does this integration reveal *other* spend? (Corp cards + bank feeds = 10× multiplier)
3. **Waste detectability** — does the API expose idle/unused resources? (Seat management APIs = easy wins)
4. **Build cost** — OAuth + paginated REST is cheap; OAuth + webhook + batch reconciliation is expensive
5. **Customer ask frequency** — what do prospects request on sales calls?

**Rule of thumb:** ship integrations where (spend × waste-detectability) / build-cost is highest.

---

## Current Integrations (Baseline)

| Tool | Category | What we pull |
|---|---|---|
| Fortnox | Finance | Invoices, suppliers, accounting |
| Microsoft 365 | Productivity | Users, licenses, usage reports |
| HubSpot | CRM | Contacts, deals, marketing |
| QuickBooks | Finance | Bills, expenses, reports |
| Shopify | E-commerce | Products, orders, customers |
| OpenAI | AI | API spend, token usage |
| Anthropic | AI | API spend, token usage |
| Gemini | AI | API spend, token usage |
| Google Workspace | Productivity | Users, licenses, directory |

**Gaps:** zero cloud infrastructure coverage, no spend-management (corp card) feeds, no developer platforms (GitHub, Slack).

---

## Tier 1 — Ship Next (Highest ROI)

These three unlock the most value per day of build time.

### 1. Ramp (or Brex)

- **Auth**: OAuth2 (Ramp uses client credentials grant with a Ramp-issued client_id/secret)
- **Key endpoints**:
  - `GET /developer/v1/transactions` — every corp card transaction
  - `GET /developer/v1/users` — cardholders
  - `GET /developer/v1/cards` — active cards
- **Cost signal**: merchant-categorized transactions → auto-classified SaaS subscriptions, recurring charges, anomalies
- **Sync cadence**: daily
- **Effort**: M
- **Why it matters**: One integration discovers *every other SaaS* the customer pays for. This is the force multiplier — a customer without GitHub/Slack/Notion integrations still shows those charges via Ramp. Enables "we found 47 subscriptions you're paying for" onboarding moment.

### 2. AWS (via Cost & Usage Report)

- **Auth**: IAM role with `sts:AssumeRole` from your AWS account (preferred over access keys — no rotation burden). Fallback: access keys with read-only policy on Cost Explorer.
- **Key endpoints**:
  - Cost Explorer: `GetCostAndUsage`, `GetReservationUtilization`, `GetSavingsPlansUtilization`
  - CUR (preferred for detail): S3 bucket with parquet files, query via Athena or download
- **Cost signal**: daily spend by service, account, tag, region; reserved instance utilization; Savings Plan coverage
- **Sync cadence**: every 12h (CUR updates 3×/day)
- **Effort**: L (CUR parsing is the long pole)
- **Why it matters**: Cloud is usually the largest single line item for tech companies. AWS alone often exceeds the entire SaaS stack combined.

### 3. GitHub

- **Auth**: GitHub App (preferred) installed on the org; fallback to PAT with `read:org`, `read:user`, `manage_billing:copilot`
- **Key endpoints**:
  - `GET /orgs/{org}/settings/billing/actions` — Actions minutes
  - `GET /orgs/{org}/settings/billing/packages` — packages/storage
  - `GET /orgs/{org}/copilot/billing` — Copilot seats
  - `GET /orgs/{org}/copilot/billing/seats` — per-user last activity
  - `GET /orgs/{org}/members` + activity — inactive members paying for seats
- **Cost signal**: inactive paid seats, unused Copilot licenses, Actions minute consumption by repo
- **Sync cadence**: daily
- **Effort**: S
- **Why it matters**: Fastest, cleanest "you're paying for 12 Copilot seats nobody uses" win. Great demo material.

---

## Tier 2 — Cloud Infrastructure

Usually the biggest spend category. Build these after Tier 1.

### Azure

- **Auth**: OAuth2 via Entra ID app registration (client credentials flow). Needs `Cost Management Reader` role on the subscription/management group.
- **Key endpoints**:
  - `POST /providers/Microsoft.CostManagement/query` (scope = subscription or MG)
  - `GET /providers/Microsoft.Consumption/usageDetails`
  - `GET /providers/Microsoft.Billing/billingAccounts`
- **Cost signal**: spend by subscription, resource group, resource type, tag
- **Sync cadence**: every 12h
- **Effort**: M

### Google Cloud Platform (GCP)

- **Auth**: Service account JSON key with `Billing Account Viewer` + BigQuery Data Viewer. Preferred: customer sets up billing export to BigQuery, you query it.
- **Key endpoints**:
  - BigQuery: `SELECT service, sku, project, cost, usage FROM {export_dataset}.gcp_billing_export_v1_*`
  - Cloud Billing API: `billingAccounts.projects.list`
- **Cost signal**: SKU-level cost, project-level totals, labels/tags
- **Sync cadence**: daily (export refreshes every few hours)
- **Effort**: M

### Cloudflare

- **Auth**: API token (scoped: `Billing:Read`, `Analytics:Read`)
- **Key endpoints**:
  - `GET /accounts/{id}/billing/profile`
  - GraphQL analytics API for bandwidth, R2, Workers invocations
- **Cost signal**: plan fees + metered overages (R2 storage, Workers requests, bandwidth)
- **Sync cadence**: daily
- **Effort**: S

### Vercel

- **Auth**: OAuth2 (Vercel integration) or team-scoped access token
- **Key endpoints**:
  - `GET /v1/teams/{id}/usage`
  - `GET /v1/invoices`
- **Cost signal**: bandwidth, build minutes, seat count, serverless executions
- **Sync cadence**: daily
- **Effort**: S

### Netlify / Render / Fly.io

- **Auth**: API token
- **Key endpoints**: each has `/billing` or `/usage` REST endpoints
- **Cost signal**: per-site bandwidth, build minutes, compute hours
- **Sync cadence**: daily
- **Effort**: S each

### Managed Databases (Supabase, PlanetScale, Neon, MongoDB Atlas)

- **Auth**: API key scoped to org/project
- **Key endpoints**: `/organizations/{id}/billing` or `/invoices`
- **Cost signal**: compute hours, storage, data transfer
- **Sync cadence**: daily
- **Effort**: S each

---

## Tier 3 — AI / ML Providers

You already have OpenAI, Anthropic, Gemini. Extend the pattern.

### Pattern for all AI vendors

1. User provides API key (store encrypted)
2. Call `/usage` or `/billing` endpoint daily
3. If vendor doesn't expose cost, compute: `tokens × model_rate` from a pricing table you maintain
4. Normalize into the shared cost schema (see below)

### Specific vendors

| Vendor | Auth | Usage endpoint | Notes |
|---|---|---|---|
| **OpenRouter** | API key | `/api/v1/generation/{id}`, `/api/v1/credits` | **Best unifier** — returns normalized cost per request across many models |
| **Mistral** | API key | `/v1/usage` (limited) | Compute from logs + pricing table |
| **Cohere** | API key | Dashboard only | Use request log + pricing table |
| **Groq** | API key | `/openai/v1/usage` | OpenAI-compatible |
| **Together AI** | API key | `/v1/usage` | Returns per-request cost |
| **Replicate** | API token | `/v1/account`, prediction logs | Compute seconds × hardware rate |
| **Perplexity** | API key | Dashboard, no API | Pricing table fallback |
| **Hugging Face** | User access token | `/api/billing`, endpoint logs | Inference endpoints = hourly |
| **Pinecone** | API key + org ID | `/organizations/{id}/usage` | Pod hours, vector count |
| **Weaviate Cloud** | API key | `/v1/usage` | Cluster hours |

**Pricing table tip:** keep a versioned `ai_pricing.json` in the repo with `{ provider, model, input_per_1k, output_per_1k, effective_from }`. Update monthly. Every AI integration falls back to this when vendor API is insufficient.

---

## Tier 4 — SaaS Licensing & Productivity

The "find unused seats" category. High-signal, easy to demo.

### Slack

- **Auth**: OAuth2 (Slack app). Required scopes: `admin.users:read`, `admin.usergroups:read`, `team:read`
- **Key endpoints**:
  - `admin.users.list` — all workspace members with roles
  - `team.billableInfo` — who counts as a billable seat (guests don't)
- **Cost signal**: billable seats × plan rate − active users in last 30 days = waste
- **Sync cadence**: weekly
- **Effort**: S

### Zoom

- **Auth**: Server-to-Server OAuth app (newer) — client_id + client_secret + account_id
- **Key endpoints**:
  - `GET /v2/users` with `status=active` — licensed users
  - `GET /v2/report/users` — last login per user
- **Cost signal**: Pro/Business licenses assigned to users inactive >30 days
- **Sync cadence**: weekly
- **Effort**: S

### Atlassian (Jira, Confluence)

- **Auth**: OAuth2 3LO for Cloud, or API token + email for basic auth
- **Key endpoints**:
  - `GET /rest/api/3/users/search` — users
  - `GET /admin/v1/orgs/{id}/users` — admin API for billing seats (Enterprise)
- **Cost signal**: licensed-but-inactive users; product access by user
- **Sync cadence**: weekly
- **Effort**: M (Atlassian's API surface is large)

### Notion

- **Auth**: OAuth2 (public integration, install to workspace)
- **Key endpoints**:
  - `GET /v1/users` — workspace members
  - Admin API for Enterprise plans
- **Cost signal**: member count × plan rate; inactive members
- **Sync cadence**: weekly
- **Effort**: S

### Linear / Asana / ClickUp / Monday

- **Auth**: OAuth2 or API key
- **Key endpoints**: `/workspaces/{id}/members` + last-activity fields
- **Cost signal**: paid seat count vs. active contributors
- **Sync cadence**: weekly
- **Effort**: S each

### Identity providers (Okta, 1Password, JumpCloud)

- **Auth**: API token with admin read scope
- **Key endpoints**:
  - Okta: `GET /api/v1/apps` → `GET /api/v1/apps/{id}/users` — who has access to what SaaS
  - 1Password: SCIM bridge or API for vault access
  - JumpCloud: `/api/systemusers`, `/api/applications`
- **Cost signal**: users assigned to a SaaS app who haven't logged in (shadow SaaS + orphaned licenses)
- **Sync cadence**: weekly
- **Effort**: M
- **Why it matters**: Okta tells you *which apps exist company-wide* even without individual integrations. Pair with Ramp for near-total SaaS coverage.

### GitLab

- **Auth**: OAuth2 or PAT
- **Key endpoints**:
  - `GET /groups/{id}/billable_members`
  - `GET /application/plan_limits`, usage endpoints
- **Cost signal**: seats + CI minutes
- **Sync cadence**: weekly
- **Effort**: S (clone of GitHub integration)

---

## Tier 5 — Sales / Marketing / Support

### Salesforce

- **Auth**: OAuth2 connected app (JWT bearer flow for server-to-server)
- **Key endpoints**:
  - `GET /services/data/v59.0/sobjects/User` — assigned licenses
  - `GET /services/data/v59.0/limits` — API call consumption
  - `GET /services/data/v59.0/sobjects/PermissionSetLicense`
- **Cost signal**: inactive paid users, PermissionSetLicense usage, API limit proximity
- **Sync cadence**: weekly
- **Effort**: M

### Intercom / Zendesk

- **Auth**: OAuth2
- **Key endpoints**: `/admins` or `/users/show_many` + role data
- **Cost signal**: agent seats vs. active agents
- **Sync cadence**: weekly
- **Effort**: S each

### Mailchimp / Klaviyo

- **Auth**: OAuth2 or API key
- **Key endpoints**:
  - `GET /3.0/account` (Mailchimp), `GET /api/accounts` (Klaviyo)
  - Contact counts vs. plan tier
- **Cost signal**: contact-tier overages, unused segments
- **Sync cadence**: daily
- **Effort**: S each

### Segment / Mixpanel / Amplitude

- **Auth**: API key + project/workspace secret (Segment: workspace-level token)
- **Key endpoints**: usage/MTU (monthly tracked users) endpoints
- **Cost signal**: event volume vs. plan tier, MTU overages
- **Sync cadence**: daily
- **Effort**: S each

---

## Tier 6 — Finance & Spend Management

### Stripe

- **Auth**: Restricted API key (read-only, user-generated)
- **Key endpoints**:
  - `GET /v1/invoices` — revenue in
  - `GET /v1/balance_transactions` — fees out
  - `GET /v1/subscriptions` — MRR
- **Cost signal**: Stripe fees as a % of GMV, failed-charge recovery opportunity
- **Sync cadence**: daily
- **Effort**: S

### Xero

- **Auth**: OAuth2 (tenant-scoped)
- **Key endpoints**:
  - `GET /api.xro/2.0/Invoices`
  - `GET /api.xro/2.0/BankTransactions`
- **Cost signal**: SaaS vendor spend by category (alternative for non-Fortnox markets)
- **Sync cadence**: daily
- **Effort**: M

### NetSuite

- **Auth**: OAuth2 with Token-Based Authentication (TBA)
- **Key endpoints**: SuiteQL queries on `Transaction`, `Vendor`, `Account`
- **Cost signal**: enterprise vendor spend
- **Sync cadence**: daily
- **Effort**: L (NetSuite is always complex)

### Brex

- **Auth**: OAuth2
- **Key endpoints**: `/v2/transactions`, `/v1/cards`, `/v1/users`
- **Cost signal**: same as Ramp — merchant-classified SaaS discovery
- **Sync cadence**: daily
- **Effort**: M

### Mercury

- **Auth**: API token
- **Key endpoints**: `/api/v1/accounts/{id}/transactions`
- **Cost signal**: bank-level SaaS + vendor discovery
- **Sync cadence**: daily
- **Effort**: S

### Plaid

- **Auth**: Link flow (client generates `link_token` → user authenticates → exchange `public_token` for `access_token`)
- **Key endpoints**:
  - `/link/token/create`
  - `/transactions/sync`
  - `/accounts/get`
- **Cost signal**: merchant-categorized transactions from any bank (fallback when customer uses no corp card vendor)
- **Sync cadence**: daily via `/transactions/sync` cursor
- **Effort**: M
- **Why it matters**: Plaid = universal bank coverage. One integration replaces the need for Brex + Ramp + Mercury if customer doesn't use any of those.

---

## Common Integration Plumbing

Every integration needs the same supporting machinery. Build this once, reuse everywhere.

### 1. Credential storage
- Encrypt refresh tokens and API keys at rest (AES-256 with a key from env/KMS)
- Never log raw credentials, even at debug level
- Rotate encryption key quarterly; support key versioning
- Your Fortnox integration already does this — reuse the pattern

### 2. OAuth flow handler
- Generic `/auth/{provider}/callback` route with state-parameter CSRF protection
- Per-provider config: `{ clientId, clientSecret, authUrl, tokenUrl, scopes, redirectUri }`
- Token refresh middleware: if access token expires in <5min, refresh before the API call

### 3. Scheduler
- Per-provider cron schedule (daily for most, every 12h for cloud billing)
- Concurrency guard so two workers don't sync the same tenant simultaneously
- Retry with exponential backoff on 5xx / 429
- Dead-letter queue for persistent failures → alert in UI
- Pattern already exists: `openaiSyncScheduler.js`, extend it

### 4. Rate limit handling
- Respect `Retry-After` header on 429
- Pre-emptive throttling for APIs with known tight limits (GitHub: 5000/hr; Salesforce: per-org daily limit)
- Track remaining quota per integration and surface in UI

### 5. Webhook support (where available)
- Stripe, GitHub, Slack, Intercom all push events via webhooks
- Webhook signature verification is non-negotiable (HMAC with shared secret)
- Use webhooks for near-real-time updates, fall back to polling for backfill

### 6. Status tracking
- Each integration has a status: `connected | syncing | error | disconnected | expired`
- Last sync timestamp + last error message stored and displayed
- "Reconnect" button when status = `expired` or `error`

### 7. Backfill on first connect
- First sync = full history (90 days typical)
- Subsequent syncs = incremental (cursor or `updated_since` filter)
- Show progress bar during backfill

---

## Normalized Cost Schema

Every integration maps its data into this shared schema so dashboards don't need per-tool logic.

```typescript
interface CostRecord {
  id: string;                    // uuid
  tenant_id: string;             // customer workspace
  provider: string;              // 'aws', 'openai', 'slack', etc.
  integration_id: string;        // fk to integrations table
  account_id: string;            // vendor-side account/org identifier
  period_start: Date;            // start of billing period
  period_end: Date;              // end of billing period
  granularity: 'day' | 'month' | 'invoice';
  service: string;               // 'ec2', 'gpt-4o', 'copilot_seats'
  sub_service?: string;          // 'compute', 'storage', 'data_transfer'
  quantity: number;              // units consumed
  unit: string;                  // 'hours', 'tokens', 'seats', 'gb'
  cost: number;                  // in minor units (cents)
  currency: string;              // ISO 4217
  tags: Record<string, string>;  // vendor-side tags/labels
  metadata: Record<string, any>; // provider-specific raw data
  ingested_at: Date;
}
```

**Why this shape:**
- `service + sub_service` enables drill-down without schema changes
- `tags` is a JSONB blob — cloud providers tag-heavy, SaaS tag-light, same schema works
- `quantity + unit` preserves the underlying unit for custom analyses
- `metadata` catches edge cases without schema migrations

### Seat/license schema (for SaaS)

```typescript
interface LicenseRecord {
  id: string;
  tenant_id: string;
  provider: string;
  integration_id: string;
  user_id: string;               // vendor-side user id
  email: string;
  seat_type: string;             // 'full', 'guest', 'viewer'
  assigned_at: Date;
  last_active_at: Date | null;
  monthly_cost: number;          // in minor units
  currency: string;
  status: 'active' | 'inactive_30d' | 'inactive_90d' | 'never_used';
}
```

Drive the "find unused seats" UI from this table across all SaaS providers.

---

## Auth Patterns Cheat Sheet

Most integrations fall into one of five auth patterns. Build a helper for each:

### 1. OAuth2 Authorization Code (most SaaS)
Flow: user clicks "Connect" → redirect to vendor → vendor redirects back with `code` → exchange for `access_token` + `refresh_token` → store both, refresh when expired.

Used by: HubSpot, Salesforce, Slack, Notion, Atlassian, GitHub, Intercom, Zoom, Xero, Vercel.

### 2. OAuth2 Client Credentials (server-to-server)
Flow: your server requests a token with `client_id` + `client_secret`. No user interaction. Short-lived tokens (often 1 hour).

Used by: Azure, Ramp, Zoom (S2S), Mailchimp (some flows).

### 3. API Key / Personal Access Token
Flow: user generates a token in the vendor dashboard, pastes into your UI, you store encrypted.

Used by: OpenAI, Anthropic, Gemini (API key), Cloudflare, GitHub (PAT fallback), Mercury, most AI vendors.

### 4. JWT Bearer Flow
Flow: you sign a JWT with a private key, exchange at vendor's token endpoint for an access token. No user interaction after initial setup.

Used by: Salesforce (server-to-server), Google Workspace (service account), Atlassian Connect.

### 5. IAM Role Assumption (AWS)
Flow: customer creates an IAM role in *their* AWS account that trusts *your* AWS account. You call `sts:AssumeRole` with an external ID to get temp credentials.

Used by: AWS. No other major vendor does this at scale — it's an AWS-specific pattern.

### 6. Service Account Key (GCP)
Flow: customer creates a service account in *their* GCP project, downloads JSON key, pastes into your UI. You use the key to call GCP APIs.

Used by: GCP, sometimes alternative auth for Google Workspace.

---

## Build Order Recommendation

If you build one integration per week, here's the sequence that maximizes cumulative value:

| Week | Integration | Unlocks |
|---|---|---|
| 1 | Ramp (or Brex) | Auto-discovery of every other SaaS → biggest "wow" demo |
| 2 | GitHub | Easiest seat-bloat win; clean API; great demo |
| 3 | AWS (Cost Explorer only; CUR later) | Largest spend category for tech customers |
| 4 | Slack | Second-easiest seat-bloat win |
| 5 | Azure | Completes major-cloud coverage |
| 6 | GCP | Completes major-cloud coverage |
| 7 | Stripe | Revenue side of the picture |
| 8 | OpenRouter | Unifies all remaining AI vendor coverage in one shot |
| 9 | Vercel + Cloudflare (parallel) | Fills the modern-stack gap |
| 10 | Okta | Unlocks shadow-SaaS detection at identity layer |
| 11 | Zoom + Notion + Linear (parallel) | Rounds out productivity tier |
| 12 | Plaid | Universal bank coverage for customers without Ramp/Brex |

After week 12 you have roughly 80% of typical tech-company spend under management with a manageable integration surface.

---

## Appendix — Questions to Ask Before Building Any Integration

1. Is the vendor's cost/usage API public or only dashboard?
2. If only dashboard: is a pricing table + log parsing feasible?
3. Is there a sandbox/test account to build against?
4. What's the rate limit, and does it scale with customer count?
5. Does the auth flow require admin privileges on the customer side? (Blocks self-serve.)
6. Does the vendor have webhooks? (Cheaper than polling at scale.)
7. Is there an existing official SDK in Node.js? (Saves days.)
8. What's the pagination pattern? (Cursor-based >> offset-based for reliability.)
9. How is historical data exposed? (Last 30d? 90d? 12mo? Unlimited?)
10. Is the data tenant-scoped cleanly, or do you need per-org calls?

Answer these before committing to a build. They predict 90% of the surprises.
