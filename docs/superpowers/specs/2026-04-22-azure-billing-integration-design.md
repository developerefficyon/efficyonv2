# Azure Billing Integration — Design Spec

- **Date:** 2026-04-22
- **Topic:** Azure cost-leak integration (Azure Advisor Cost category, tenant-wide)
- **Status:** Design approved; ready for implementation plan

## Summary

Add Azure as the 13th cost-leak integration. Customer consents to a **fresh Azure-only multi-tenant app registration** (independent from the existing M365 app); Efficyon mints an app-only access token per customer tenant via OAuth 2.0 client-credentials flow, pulls **Azure Advisor** Cost-category recommendations across every reachable subscription, normalizes into the shared cost-leak finding shape, and persists to `cost_leak_analyses`.

This spec mirrors the AWS integration (spec `2026-04-20`) where the shapes are compatible; deviations are only where Azure's auth model and API surface demand it.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **Auth:** multi-tenant app-registration with admin consent; per-tenant app-only tokens via client-credentials grant |
| 2 | **Scope:** tenant-wide (all subscriptions the service principal can read); one integration per customer tenant |
| 3 | **Recommendation source:** Azure Advisor, `Category eq 'Cost'` filter |
| 4 | **Connect UX:** admin-consent URL primary; "Advanced / manual setup" fallback showing the `az ad app` CLI equivalent |
| 5 | **Subscriptions:** auto-detected on consent-callback via `GET /subscriptions`; cached in `settings.active_subscriptions`; refreshable from Data tab |
| 6 | **Analysis code layout:** `azureAuth.js` (token cache) + `azureAdvisorAnalysis.js` (Advisor fan-out) + thin `azureCostLeakAnalysis.js` aggregator |
| 7 | **App separation:** fresh Azure-only app registration, not the existing M365 app — security-audit isolation |

## Why this shape

- **Client-credentials over delegated OAuth.** Admin consent grants app-only permissions (`https://management.azure.com/.default`) so Efficyon doesn't need a user to be signed in to analyze. Matches the "background SaaS integration" model used by Datadog, Vanta, CloudHealth.
- **Tenant-wide scope.** Azure customers routinely have 5–50 subscriptions under one tenant; per-sub integration doesn't make sense. `Reader` role at tenant-root (granted during consent or subsequently by the customer) gives visibility to all subs.
- **Azure Advisor over raw Cost Management.** Advisor's Cost category is Microsoft's pre-computed recommendations (right-sizing, idle VMs, unattached disks, unused public IPs). Same shape as GCP Recommender / AWS Compute Optimizer. Cost Management APIs are far richer but require significant normalization work — deferred to v2.
- **Fresh app registration.** Security-sensitive Azure admins will balk at a "productivity-scoped" M365 app touching their subscriptions. Separate apps = separate audit logs, separate revocation paths, smaller blast radius per secret.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ azureAuth.js                       Client-credentials token exchange + per-tenant cache (55-min TTL)
├─ services/
│  ├─ azureAdvisorAnalysis.js            List subs → fetch Cost recommendations per sub → normalize
│  └─ azureCostLeakAnalysis.js           Aggregator: severity mapping + rollup
├─ controllers/
│  └─ azureController.js                 initiateConsent / consentCallback / validate / status /
│                                        subscriptions / refreshSubscriptions / analyze / disconnect
└─ sql/
   └─ 045_azure_provider.sql             Extends cost_leak_analyses.valid_provider CHECK to include 'Azure'
```

**Backend (modified)**

- `backend/src/routes/index.js` — register new Azure routes
- `backend/src/controllers/analysisHistoryController.js` — add `Azure` branch to `extractSummary()` + duplicate-check
- `backend/env.example.backend.txt` — document `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_CONSENT_REDIRECT_URL`

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/azure.ts            UnifiedToolConfig; authType "serviceAccount", custom connectComponent
├─ components/tools/azure-view.tsx       Data tab: tenant summary + subscriptions table + "Refresh" button
└─ components/tools/azure-connect-form.tsx   1-step wizard: "Grant consent in Azure AD" button → redirect flow
```

**Frontend (modified)**

- `frontend/lib/tools/registry.ts` — register `azureConfig`
- `frontend/components/tools/tool-logos.tsx` — add Azure brand entry
- `frontend/app/dashboard/tools/guide/page.tsx` — add Azure tab + guide section

No new frontend TypeScript types. `UnifiedToolConfig.connectComponent` (added in the AWS work) covers Azure's wizard needs.

## Auth flow

### Efficyon-side one-time setup

Before the first customer connects, the operator:
1. Creates a **multi-tenant app registration** in Efficyon's Entra ID tenant named `Efficyon Cost Analyzer (Azure)`.
2. Adds **API permissions → Azure Service Management → `user_impersonation`** — delegated, with "Application" permissions enabled so the admin-consent grant minting app-only tokens works.
3. Under **Certificates & secrets**, creates a client secret (24-month expiry). Puts it in backend `.env` as `AZURE_CLIENT_SECRET`. App ID goes in as `AZURE_CLIENT_ID`.
4. Under **Authentication → Platform configurations → Web**, adds the redirect URI `<BACKEND_URL>/api/integrations/azure/consent-callback`. Puts same URL in `.env` as `AZURE_CONSENT_REDIRECT_URL`.
5. The app is now ready to receive admin consent from customer tenants.

### Customer consent flow

1. Customer opens Efficyon wizard → clicks **Grant consent in Azure AD**.
2. Browser redirects to `https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id={AZURE_CLIENT_ID}&scope=https://management.azure.com/.default&redirect_uri={redirect}&state={integration_id}:{external_id}`.
3. Customer signs in as an Azure AD **Global Administrator** (or Privileged Role Administrator) and grants consent.
4. Microsoft redirects to `AZURE_CONSENT_REDIRECT_URL?admin_consent=True&tenant={tenant_id}&state={integration_id}:{external_id}`.
5. `consentCallback` handler:
   - Parses `tenant`, `admin_consent`, `state`.
   - Splits `state` into `integration_id` + `external_id`; looks up integration; asserts `settings.external_id` matches (CSRF check).
   - If `admin_consent=True`, stores `settings.tenant_id = tenant`, `settings.consent_granted_at = now()`. Kicks off `validateAzure` inline.
   - Redirects browser back to `<frontend>/dashboard/tools/{integration.id}?azure_consent=ok` (or `=error` with a message param).

### Per-analysis token flow

```js
// backend/src/utils/azureAuth.js
async function getAzureAccessToken(integration) {
  const tenantId = integration.settings.tenant_id
  const cached = tokenCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: "https://management.azure.com/.default",
      grant_type: "client_credentials",
    }),
  })
  const body = await res.json()
  if (!res.ok) throw typedError("TOKEN_FETCH_FAILED", body.error_description || body.error)

  const token = body.access_token
  const expiresAt = Date.now() + body.expires_in * 1000
  tokenCache.set(integration.id, { token, expiresAt })
  return token
}
```

In-process `Map` keyed by integration id; 55-minute effective TTL. Eviction on disconnect.

### Additional customer step (after consent)

Admin consent creates a Service Principal in the customer's tenant but doesn't assign any role. For Efficyon to read subscription data, the Service Principal needs at minimum the **Reader** role at subscription or tenant root scope.

We handle this in the wizard's post-consent step:
- After the callback succeeds, the frontend shows a message: "Consent granted. Now assign the **Reader** role to the 'Efficyon Cost Analyzer (Azure)' service principal at your tenant-root scope. [Show me how]."
- `[Show me how]` expands step-by-step screenshots/instructions: Azure Portal → Subscriptions → Access control (IAM) → Role assignments → Add → Reader → Select `Efficyon Cost Analyzer (Azure)`.
- **Alternative** (advanced): provide a copy-pasteable CLI command:
  ```bash
  az role assignment create \
    --assignee <OUR_APP_OBJECT_ID> \
    --role "Reader" \
    --scope "/providers/Microsoft.Management/managementGroups/<TENANT_ROOT_GROUP_ID>"
  ```

`validateAzure` retries up to 60 seconds post-consent, polling `GET /subscriptions`. When it returns non-empty, role assignment is complete and we flip status to `connected`.

## Data model

### `company_integrations.settings` shape

```json
{
  "external_id": "a1b2c3...",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "consent_granted_at": "2026-04-22T10:00:00Z",
  "active_subscriptions": [
    { "id": "22222222-2222-2222-2222-222222222222", "name": "Production", "state": "Enabled" },
    { "id": "33333333-3333-3333-3333-333333333333", "name": "Staging",    "state": "Enabled" }
  ],
  "subscriptions_refreshed_at": "2026-04-22T10:00:05Z",
  "last_validated_at": "2026-04-22T10:00:05Z"
}
```

No long-lived secrets. `external_id` is a CSRF guard on the consent redirect. `tenant_id` is public-ish (it identifies the customer's Entra tenant but can't be used without our app's secret).

### Migration 045

```sql
-- backend/sql/045_azure_provider.sql
ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox', 'Microsoft365', 'HubSpot', 'QuickBooks', 'Shopify',
    'OpenAI', 'Anthropic', 'Gemini', 'GoogleWorkspace', 'Slack',
    'GCP', 'AWS', 'Azure'
  ));
```

### Finding shape (same as AWS/GCP)

```json
{
  "id": "azure-advisor-<recommendationId>",
  "source": "azure_advisor",
  "severity": "high",
  "category": "rightsizing" | "idle" | "reservation" | "reservedinstance" | "other",
  "title": "…",
  "region": "eastus",
  "resource": { "type": "…", "id": "<resource ARM id>", "accountId": "<subscription id>", "region": "…" },
  "currentCost": 0,
  "projectedSavings": 187.5,
  "currency": "USD",
  "recommendation": "…",
  "actionSteps": [ "…" ],
  "raw": { ... }
}
```

`resource.accountId` holds the **subscription ID** (Azure's account analog). `region` is the Azure region string (e.g., `eastus`, `westeurope`).

### Severity mapping

Identical to AWS (critical ≥ $500 / high ≥ $100 / medium ≥ $25 / low > $0; zero-savings dropped).

### `analysisHistoryController` branches

```js
// extractSummary:
} else if (provider === "Azure") {
  const s = analysisData.summary || {}
  summary.totalFindings = s.totalFindings || 0
  summary.totalPotentialSavings = s.totalPotentialSavings || 0
  const bySev = s.findingsBySeverity || {}
  summary.highSeverity = (bySev.critical || 0) + (bySev.high || 0)
  summary.mediumSeverity = bySev.medium || 0
  summary.lowSeverity = bySev.low || 0
  summary.healthScore = null
}

// duplicate-check:
} else if (provider === "Azure") {
  duplicateQuery = duplicateQuery
    .eq("parameters->>tenantId", params.tenantId || "")
}
```

## Analysis pipeline

### Entry point

```
POST /api/integrations/azure/cost-leaks
  body: { integrationId }
  auth: requireAuth + requireRole("owner", "editor")
```

### Handler orchestration

```
1. Load integration, assert status=connected and provider=Azure
2. Duplicate-check (tenantId + last 5 minutes → 409)
3. Get access token via azureAuth.getAzureAccessToken
4. runAdvisorAnalysis(token, settings.active_subscriptions) → { findings, errors }
5. aggregate(result) → assign severity, drop zero-savings, sort desc, roll up summary
6. Strip sourceErrors from summary before saveAnalysis (same as AWS)
7. saveAnalysis + return { summary, findings }
```

### Azure Advisor API

For each subscription, call:
```
GET https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Advisor/recommendations
    ?api-version=2023-01-01
    &$filter=Category eq 'Cost'
```

Response is paginated via `nextLink`. Each recommendation includes:
- `id`, `name` (resource ARM id)
- `properties.category` (always `Cost` here)
- `properties.impact` (`High` / `Medium` / `Low`)
- `properties.shortDescription.problem` / `.solution`
- `properties.extendedProperties.annualSavingsAmount` or similar (structure varies by recommendation type)
- `properties.resourceMetadata.resourceId`, `.region`

Normalizer maps:
- `extendedProperties.annualSavingsAmount / 12` → `projectedSavings`
- If `annualSavingsAmount` missing → savings = 0 (will be dropped by aggregator)
- `impact` does NOT drive severity (our threshold-based system does)
- `resourceMetadata.resourceId` ARM id → `resource.id`
- Subscription id (from URL path) → `resource.accountId`

### Fan-out

Sequential-per-subscription (Azure Advisor rate limit: 1000 req/hr per subscription; sequential is safer + predictable). For typical orgs (5–20 subs, ~100 recs each) run time is 10–30s. No per-region fan-out needed — Advisor is region-agnostic from the Management API.

### Error taxonomy (`mapAzureError`)

| Condition | HTTP | Message |
|---|---|---|
| Token fetch 401 / invalid_client | 401 | "Efficyon's Azure app credentials are invalid — contact support" |
| `AuthorizationFailed` on subscription | 403 | "Grant the 'Efficyon Cost Analyzer (Azure)' service principal the Reader role at tenant-root scope, then retry" |
| `SubscriptionNotRegistered` for Advisor | 409 | "Register the Microsoft.Advisor resource provider on your subscription(s)" |
| Rate limit 429 | 503 | "Azure throttled the request; retry in a minute" |

## Routes

```
GET    /api/integrations/azure/consent           initiateAzureConsent   (returns the admin-consent URL)
GET    /api/integrations/azure/consent-callback  handleAzureConsentCallback (NO AUTH — Microsoft redirect target)
POST   /api/integrations/azure/validate          validateAzure
GET    /api/integrations/azure/status            getAzureStatus
GET    /api/integrations/azure/subscriptions     getAzureSubscriptions
POST   /api/integrations/azure/subscriptions/refresh  refreshAzureSubscriptions
POST   /api/integrations/azure/cost-leaks        analyzeAzureCostLeaks
DELETE /api/integrations/azure                   disconnectAzure
```

Note: `consent-callback` is unauthenticated (Microsoft redirects the browser, so no bearer token is available at that hop). CSRF protection comes from the `external_id` in the `state` parameter.

## Frontend

### `AzureConnectForm` — 1-step wizard

Much simpler than AWS because there's no Role ARN paste step.

- Shows an info card explaining admin consent (one sentence).
- "Generate external ID" + "Grant consent in Azure AD" buttons (one click each). Clicking Grant:
  1. Creates the integration row via `POST /api/integrations` (status=pending) and generates external_id.
  2. Calls `GET /api/integrations/azure/consent?integrationId=X` which returns `{ consentUrl }`.
  3. Sets `window.location.href = consentUrl` (full-page redirect, not new tab — Azure's consent flow has known issues with popups).
- On return (`?azure_consent=ok`), the detail page detects the query param and fires `validateAzure` (which retries for up to 60s while the customer assigns the Reader role).

### `AzureView` — Data tab

- **Tenant summary** — tenant ID (truncated), subscription count, last validated.
- **Subscriptions table** — columns: Sub ID, Name, State. Driven by `/api/integrations/azure/subscriptions`.
- **Refresh subscriptions** button — re-runs `GET /subscriptions` and persists.

### Registry, brand logo, guide

Standard additions: `azureConfig` in `registry.ts`, Azure Cloud logo in `TOOL_BRANDS`, and a guide section at `/dashboard/tools/guide#azure` with the full consent + Reader-role walkthrough.

## Environment variables

```
AZURE_CLIENT_ID=<app-registration-application-id>
AZURE_CLIENT_SECRET=<client-secret-value>
AZURE_CONSENT_REDIRECT_URL=<backend-url>/api/integrations/azure/consent-callback
```

All three set once during operator setup; never per-customer.

## Verification plan (manual E2E)

1. Apply migration 045 via Supabase MCP.
2. **Efficyon ops setup (one-time):** create the multi-tenant app registration in Efficyon's Entra ID tenant, add redirect URI, generate secret, populate three env vars.
3. **Sandbox customer setup:** have access to a customer tenant with Global Admin. Note the tenant ID.
4. Start dev servers.
5. Dashboard → Add Integration → Azure.
6. Click **Grant consent in Azure AD**. Confirm redirect to `login.microsoftonline.com`. Sign in as Global Admin. Confirm the consent screen shows only `Azure Service Management → user_impersonation` (no M365 scopes leaking).
7. After consent, browser returns to dashboard. Status shows "pending" with a "Validating Azure access…" spinner (the post-consent Reader-role poll).
8. In Azure Portal, assign the Reader role to the service principal at tenant-root management group. Within 60 seconds the spinner flips to `connected`.
9. Overview tab shows tenant ID + subscription count.
10. Data tab shows the subscriptions list.
11. Analysis tab → Run Analysis → findings appear within 30s.
12. Supabase check: `SELECT provider, summary->>'totalPotentialSavings', summary->>'totalFindings' FROM cost_leak_analyses WHERE provider = 'Azure' ORDER BY created_at DESC LIMIT 1;` returns non-zero values.
13. History tab matches.
14. Disconnect → `tenant_id` + `external_id` cleared, status `disconnected`. Reconnect works end-to-end.
15. **Negative: remove Reader role.** Re-run Analysis → expect 403 with the re-grant hint.

## Out of scope (v1)

- Azure Cost Management raw cost queries (Advisor's pre-computed recommendations are enough for v1)
- Azure Policy / Security Center recommendations (different category)
- Reserved Instance / Savings Plan utilization analysis
- Individual Cost Management export wiring (storage account + BigQuery-style export)
- Per-subscription / per-resource-group filter UI
- Multi-tenant customers (one Efficyon integration = one tenant for v1)

## References

- AWS integration spec (sibling, completed): [2026-04-20-aws-billing-integration-design.md](2026-04-20-aws-billing-integration-design.md)
- GCP integration spec: [2026-04-17-gcp-billing-integration-design.md](2026-04-17-gcp-billing-integration-design.md)
- Unified tool registry design: [2026-04-14-unified-tool-registry-design.md](2026-04-14-unified-tool-registry-design.md)
- Azure Advisor REST API: https://learn.microsoft.com/en-us/rest/api/advisor/recommendations/list
- Azure admin consent: https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
