# Salesforce Integration — Design Spec

- **Date:** 2026-04-29
- **Topic:** Salesforce cost-leak integration (V1: inactive licensed users + frozen-but-billed users + unused PermissionSetLicenses)
- **Status:** Design ready; ready for implementation plan

## Summary

Add Salesforce as Efficyon's 17th integration. **The customer creates a Connected App in their own Salesforce org**, copies the Consumer Key + Consumer Secret, and pastes them into Efficyon. Efficyon does an OAuth 2.0 web-server flow for the initial token exchange, encrypts the resulting refresh token at rest, and runs three cost-leak checks against their org's User / UserLicense / PermissionSetLicenseAssign data.

**Zero operator setup.** No Efficyon-managed Connected App, no Salesforce Security Review gate, no operator env vars. Matches the QuickBooks / HubSpot / GitHub pattern.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **Auth:** customer-managed Connected App; OAuth 2.0 web-server flow with refresh tokens. Customer pastes Consumer Key + Consumer Secret + org type |
| 2 | **V1 scope:** 3 checks — inactive licensed users, frozen-but-billed users, unused PermissionSetLicenses |
| 3 | **Sandbox support:** Production / Developer (`login.salesforce.com`) and Sandbox (`test.salesforce.com`) via an `orgType` dropdown. Optional My Domain override field |
| 4 | **Inactivity window:** user-selectable 30 / 60 / 90 days, default 60 (Salesforce admin convention) |
| 5 | **Pricing:** hardcoded list-price map (`salesforcePricing.js`); customer applies own discount mentally; documented note in summary output |
| 6 | **Severity ladder:** ≥$500/mo critical, ≥$100 high, ≥$25 medium, >$0 low — consistent with AWS/Azure/GCP/Stripe |
| 7 | **API version:** pin to v60.0 |
| 8 | **Storage:** reuse `cost_leak_analyses`; migration `049_salesforce_provider.sql` extends the provider CHECK |
| 9 | **Trigger:** on-demand only (no scheduler) |
| 10 | **Code layout:** `salesforceAuth.js` (token mgmt) + `salesforcePricing.js` (constants) + `salesforceCostLeakAnalysis.js` (aggregator) + `salesforceController.js` (handlers) |

## Why this shape

- **Customer-managed Connected App over Efficyon-managed.** Efficyon-managed would mean submitting a single Connected App through Salesforce's Security Review (typically 6–12 weeks, includes a code audit). Customer-managed mirrors your QuickBooks pattern exactly — ~10 minutes of one-time customer setup but zero operator burden and no review gate. Each customer's auth is fully isolated.
- **OAuth web-server flow over JWT bearer.** JWT bearer requires the customer to upload a public certificate to their Connected App and pre-authorize specific profiles — significantly more setup work for marginal benefit on the API side. Web-server flow is the well-known Salesforce pattern, and refresh tokens last until revoked (long enough that re-auth is rare).
- **Recovery-only V1 over edition downgrade.** Edition downgrade ("this user could move from Unlimited to Enterprise") would require knowing the customer's actual negotiated price (list prices are typically 30–70% discounted). Three high-conviction checks ship faster and produce harder dollar findings: "this user hasn't logged in for 90 days" is uncontestable.
- **Reuse `cost_leak_analyses` over a new table.** Same logic as Stripe — the existing JSONB schema absorbs Salesforce findings cleanly. Provider CHECK extension is the only schema change.
- **Hardcoded list prices over customer-supplied per-license pricing.** Asking the customer to enter prices for every SKU at connect time is friction that most won't bother with. List prices give defensible numbers; the summary notes that customers should apply their discount. V2 can add optional override inputs once we know which SKUs customers care most about.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ salesforceAuth.js                       OAuth code exchange + token refresh + encrypt/decrypt + per-integration token cache
├─ services/
│  ├─ salesforcePricing.js                    SKU → $/mo list-price map (User Licenses + PSLs)
│  ├─ salesforceCostLeakAnalysis.js           Aggregator
│  └─ salesforceChecks/
│     ├─ inactiveUsers.js                     Check 1
│     ├─ frozenButBilled.js                   Check 2
│     └─ unusedPermissionSetLicenses.js       Check 3
├─ controllers/
│  └─ salesforceController.js                 oauth/start, oauth/callback, validate, status, users, licenses, psls, cost-leaks, disconnect
└─ sql/
   └─ 049_salesforce_provider.sql             Extends valid_provider CHECK to include 'Salesforce'
```

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/
│  └─ salesforce.ts                           UnifiedToolConfig — oauth + sandbox toggle + inactivity-aware
└─ components/tools/
   └─ salesforce-view.tsx                     Data tab: 3 panels (Users / License Allocations / Permission Set Licenses)
```

**Wiring**

- `frontend/lib/tools/registry.ts` — register `salesforceConfig`
- `backend/src/routes/index.js` — register 9 controller routes (all behind `requireAuth` + `requireRole`)
- `frontend/app/dashboard/tools/guide/page.tsx` — add Salesforce section to the setup-guide page (matching GitHub/Stripe)
- `frontend/components/tools/tool-logos.tsx` — add Salesforce brand mark

### Data flow

```
User clicks Connect Salesforce → fills 4 fields (key, secret, orgType, optional myDomain)
  → POST /api/integrations { _pending_salesforce_creds: {...}, org_type, my_domain }
  → frontend hits GET /api/integrations/salesforce/oauth/start
  → backend builds authorize URL with state token (HMAC-signed integrationId), redirects browser
  → user approves on Salesforce → Salesforce redirects to /api/integrations/salesforce/callback?code=...&state=...
  → backend verifies state, exchanges code for tokens via POST {host}/services/oauth2/token
  → encrypts access_token + refresh_token + instance_url at rest
  → pings GET /services/data/v60.0/sobjects/User to validate
  → flips status to "connected"; redirects to dashboard

Later: User clicks "Run Analysis" with chosen inactivity window
  → POST /api/integrations/salesforce/cost-leaks { inactivityDays }
  → controller: lookup, status check, 5-min duplicate-check
  → service: refresh access token if needed, fan out to 3 checks
  → aggregator: assigns severity, drops zero-value, sorts by potentialSavings desc
  → returns { findings, summary, warnings, parameters: { inactivityDays } }
  → frontend persists via /api/analysis-history (matches GitHub/Zoom pattern)
```

### The 3 V1 checks — detail

#### 1. Inactive licensed users

- **SOQL:** `SELECT Id, Username, Name, IsActive, LastLoginDate, ProfileId, Profile.UserLicense.MasterLabel, Profile.UserLicense.LicenseDefinitionKey FROM User WHERE IsActive = true AND UserType = 'Standard'`
- **Detection:** `LastLoginDate < (today - inactivityDays)` OR `LastLoginDate = null`
- **Pricing:** map `Profile.UserLicense.LicenseDefinitionKey` to `salesforcePricing.USER_LICENSE_PRICES`. Unknown keys → finding still emits, but with `currentValue: 0` and a note in `action`
- **Output:** one finding per user, severity by SKU price
- **Evidence:** Salesforce User Id (`005...`)

#### 2. Frozen-but-billed users

- **SOQL:** `SELECT UserId, IsFrozen FROM UserLogin WHERE IsFrozen = true`
- Then: `SELECT Id, Username, IsActive, Profile.UserLicense.LicenseDefinitionKey FROM User WHERE Id IN :frozenUserIds AND IsActive = true`
- **Detection:** users present in both result sets are frozen but still consume a license slot
- **Output:** finding per affected user, severity by license SKU price
- **Action text:** "User is frozen (Setup → Users → Login Information) but still active — deactivate to free the license slot."

#### 3. Unused PermissionSetLicenses

- **SOQL:** `SELECT AssigneeId, PermissionSetLicenseId, PermissionSetLicense.MasterLabel, PermissionSetLicense.DeveloperName, Assignee.LastLoginDate, Assignee.IsActive FROM PermissionSetLicenseAssign WHERE Assignee.IsActive = true`
- **Detection:** `Assignee.LastLoginDate < (today - inactivityDays)` OR `Assignee.LastLoginDate = null`
- **Pricing:** map `PermissionSetLicense.DeveloperName` to `salesforcePricing.PSL_PRICES`. Unknown PSLs → aggregate into a single low-severity "review N unused feature licenses" finding without $ estimate
- **Output:**
  - Per known paid PSL: one finding per stale assignment with the PSL's monthly list price
  - For unknown PSLs: one aggregated finding listing the count + names

### Severity assignment

```javascript
function severityFor(amount) {
  if (amount >= 500) return "critical"
  if (amount >= 100) return "high"
  if (amount >= 25)  return "medium"
  if (amount > 0)    return "low"
  return null  // drop the finding
}
```

Identical to Stripe/AWS/Azure/GCP aggregators.

### Auth model

**Connected App scopes** (customer configures when creating the App in Setup → App Manager → New Connected App → API (Enable OAuth Settings)):
- `api` (REST API access)
- `refresh_token, offline_access` (long-lived refresh)
- `id, profile, email` (identity check on validate)

**Storage in `company_integrations.settings`:**
- `client_id_encrypted` — encrypted Consumer Key
- `client_secret_encrypted` — encrypted Consumer Secret
- `access_token_encrypted` — short-lived; rotated on refresh
- `refresh_token_encrypted` — long-lived; persists across analyses
- `instance_url` — the customer's Salesforce instance host (e.g. `https://acme.my.salesforce.com`)
- `org_type` — `"production"` or `"sandbox"`
- `my_domain` — optional override; if present, used instead of generic `login.salesforce.com` / `test.salesforce.com`
- `org_id` — Salesforce 18-char Org Id (captured on validate)
- `org_edition` — e.g. `"Enterprise Edition"` (captured on validate)
- `last_validated_at` — ISO timestamp

**OAuth host resolution** (in `salesforceAuth.js`):
1. If `my_domain` set → use that
2. Else if `org_type === "sandbox"` → `https://test.salesforce.com`
3. Else → `https://login.salesforce.com`

**Token caching:** in-process `Map<integrationId, { access_token, expiresAt }>` cache. Refresh when within 5 min of expiry. Eviction on disconnect.

### Connect form (declarative)

```typescript
authType: "oauth"
authFields: [
  { name: "consumerKey",    label: "Consumer Key",    type: "text",     required: true, placeholder: "3MVG9..." },
  { name: "consumerSecret", label: "Consumer Secret", type: "password", required: true },
  { name: "orgType",        label: "Org Type",        type: "select",   required: true,
    options: [
      { value: "production", label: "Production / Developer Edition" },
      { value: "sandbox",    label: "Sandbox" },
    ],
  },
  { name: "myDomain",       label: "My Domain URL (optional)", type: "text", required: false,
    placeholder: "https://acme.my.salesforce.com",
    hint: "Use only if your org has My Domain enforced. Leave blank otherwise." },
]
oauthStartEndpoint: "/api/integrations/salesforce/oauth/start"
quickSetup: {
  title: "How to create a Salesforce Connected App",
  steps: [
    "In Salesforce: Setup → App Manager → New Connected App",
    "Name it 'Efficyon Cost Analyzer', enter any contact email",
    "Check 'Enable OAuth Settings'",
    "Callback URL: https://<your-efficyon-host>/api/integrations/salesforce/callback",
    "Selected OAuth Scopes: 'Manage user data via APIs (api)', 'Perform requests on your behalf at any time (refresh_token, offline_access)', 'Access the identity URL service (id, profile, email, address, phone)'",
    "Save. After ~10 minutes for the App to propagate, copy the Consumer Key and Consumer Secret",
    "Paste them above and click Connect",
  ],
}
```

### Token revocation

`tokenRevocation.automated: false` — Salesforce doesn't expose a public revoke-by-key endpoint we can hit reliably (the `/services/oauth2/revoke` endpoint requires the customer's session). Show manual-steps note in delete dialog: *"To revoke access, go to your Salesforce org → Setup → Connected Apps OAuth Usage → find 'Efficyon Cost Analyzer' → Revoke. Or delete the Connected App entirely from App Manager."*

### Routes

Middleware per route — matches the established OAuth-integration pattern in the codebase (see `quickbooks`, `hubspot`, `slack` routes):

```
GET    /api/integrations/salesforce/oauth/start    requireAuth + requireRole("owner","editor")           Build authorize URL with base64-encoded JSON state (matches QuickBooks/HubSpot pattern), return for redirect
GET    /api/integrations/salesforce/callback       (no auth — Salesforce's browser redirect)             Exchange code for tokens, persist, redirect to dashboard
POST   /api/integrations/salesforce/validate       requireAuth + requireRole("owner","editor")           Manual re-validate (for the "Refresh status" UI button)
GET    /api/integrations/salesforce/status         requireAuth + requireRole("owner","editor","viewer")  Connection metadata (no Salesforce call)
GET    /api/integrations/salesforce/users          requireAuth + requireRole("owner","editor","viewer")  Recent 50 users for Data tab
GET    /api/integrations/salesforce/licenses       requireAuth + requireRole("owner","editor","viewer")  UserLicense allocation table for Data tab
GET    /api/integrations/salesforce/psls           requireAuth + requireRole("owner","editor","viewer")  PermissionSetLicense allocation table for Data tab
POST   /api/integrations/salesforce/cost-leaks     requireAuth + requireRole("owner","editor")           Run analysis, return findings (frontend persists separately)
DELETE /api/integrations/salesforce                requireAuth + requireRole("owner","editor")           Disconnect — clear encrypted tokens, evict cache, flip status
```

The callback route is the only one without `requireAuth` — Salesforce's browser redirect can't carry our session bearer token, so the `state` parameter (a base64-encoded JSON payload of `{ company_id, integration_id }`) is verified against the company on the callback. Pattern matches `googleWorkspaceOAuthCallback`, `fortnoxOAuthCallback`, `quickbooksOAuthCallback`, etc. — none of which sign the state in the current codebase. Adding HMAC signing across all OAuth integrations is a future security hardening item, not Salesforce-specific.

### Error handling

| Failure | Response |
|---|---|
| Bad client_id/client_secret on OAuth start (Salesforce returns invalid_client) | 400 with hint about re-checking the Connected App credentials |
| Customer denies consent | redirect to `/dashboard/tools?salesforce_consent=denied` |
| Refresh token revoked (Salesforce returns 400 `invalid_grant`) | 401 with `code: "salesforce_credentials_revoked"`, message "Salesforce credentials revoked — please reconnect" |
| Insufficient OAuth scope (403) | 403 with hint about which scope is missing (often `api`) |
| API limit exhausted (`REQUEST_LIMIT_EXCEEDED`) | 503 with retry-after suggestion (typically resets at midnight org-local) |
| SOQL error or unexpected response shape | 500 with internal log; analysis run aborts |
| Single check fails | partial findings + `warnings: [{ check, error }]`; analysis still saved |
| Network timeout (30s per Salesforce request) | check fails, others continue via `Promise.allSettled` |

### Frontend behavior

- **Data tab (`salesforce-view.tsx`):** three collapsible panels —
  - **Users:** 50 most recent users with username, profile name, last login date, IsActive flag. Sortable by LastLoginDate descending.
  - **License Allocations:** UserLicense table — for each license SKU, shows TotalLicenses, UsedLicenses, and computed UnusedLicenses.
  - **Permission Set Licenses:** PSL table — for each, shows MasterLabel, TotalLicenses, UsedLicenses, ExpirationDate.
  - "View in Salesforce" deep-link per user/license row (uses `instance_url` + standard Setup paths).
- **Analysis tab:** uses shared `analysis-tab.tsx` because `analysisType: "costLeaks"`. Inactivity dropdown appears because `analysisSupportsInactivity: true`.
- **History tab:** shared `history-tab.tsx` — Salesforce runs appear alongside other cost-leak runs.
- **Brand color:** `#00A1E0` (Salesforce blue cloud).

### Storage shape

Reuses existing `cost_leak_analyses` row format. Migration `049_salesforce_provider.sql` only extends the provider CHECK to include `'Salesforce'`. No new columns.

```jsonb
summary: {
  totalFindings: 12,
  totalCurrentValue: 4350,
  totalPotentialSavings: 4350,
  healthScore: 64,
  criticalSeverity: 1,
  highSeverity: 4,
  mediumSeverity: 5,
  lowSeverity: 2,
  pricingNote: "Savings shown at Salesforce list price. Multiply by (1 − your_negotiated_discount) for actual recovery."
}
analysis_data: {
  findings: [
    {
      check: "inactive_user",
      title: "Inactive user: jdoe@acme.com (Sales Cloud Enterprise)",
      severity: "high",
      currency: "USD",
      currentValue: 165,
      potentialSavings: 165,
      evidence: ["005XXXXXXXXXXXXXXX"],
      action: "Deactivate the user (Setup → Users) or downgrade their license — last login was 87 days ago.",
    },
    {
      check: "frozen_but_billed",
      title: "Frozen user still billed: contractor@acme.com (Sales Cloud Pro)",
      severity: "medium",
      currency: "USD",
      currentValue: 80,
      potentialSavings: 80,
      evidence: ["005XXXXXXXXXXXXXXX"],
      action: "User is frozen (Setup → Users → Login Information) but still active — deactivate to free the license slot.",
    },
    {
      check: "unused_psl",
      title: "Unused PermissionSetLicense: Sales Cloud Einstein → bob@acme.com",
      severity: "medium",
      currency: "USD",
      currentValue: 50,
      potentialSavings: 50,
      evidence: ["0PL...", "005..."],
      action: "Remove the PermissionSetLicenseAssign — assignee hasn't logged in for 73 days.",
    },
  ],
  warnings: [],
  parameters: { inactivityDays: 60 },
  org: { id: "00DXX...", instanceUrl: "https://acme.my.salesforce.com", edition: "Enterprise Edition", totalLicenses: 250 }
}
```

### Pricing constants (`salesforcePricing.js`)

```javascript
// All prices are Salesforce's published list prices in USD/user/mo (or USD/org/mo for org-level PSLs).
// Customers typically negotiate 30–70% discounts; the analysis output includes a note instructing
// users to apply their actual discount. Update this file annually.

const USER_LICENSE_PRICES = {
  "Salesforce":          165,  // Sales Cloud Enterprise — most common
  "Salesforce Platform":  25,
  "Customer Portal Manager Standard": 0,  // free for limited use cases
  "External Apps":         5,
  // Note: tiers like "Sales Cloud Unlimited" ($330) and "Performance Edition" ($450) are
  // captured by the LicenseDefinitionKey, not the MasterLabel — see resolveLicensePrice()
}

const PSL_PRICES = {
  "SalesforceCPQ":             75,   // Salesforce CPQ
  "SalesCloudEinstein":        50,
  "SalesforceInbox":           25,
  "HighVelocitySalesUser":     75,
  "SalesEngagementUser":       75,   // newer name for HVS
  "PardotPlusUser":           1250,  // Marketing Cloud Account Engagement Plus (per-org)
  // Unknown DeveloperName → falls through to "review unused feature licenses" aggregate
}

function resolveUserLicensePrice(licenseDefinitionKey) {
  // ... maps the more granular LicenseDefinitionKey to a price
  // Unknown → returns 0
}

module.exports = { USER_LICENSE_PRICES, PSL_PRICES, resolveUserLicensePrice, resolvePSLPrice }
```

### API rate limits

Salesforce enforces a per-org daily limit (default 15K requests for Enterprise, 100K for Unlimited). Our 3 checks combined are 4–8 SOQL calls per analysis. Well within limits, but the duplicate-check guard (5-min minimum between runs from the same integration) is reused from the Stripe pattern as belt-and-suspenders.

### Out of scope for V1 (deferred to V2/V3)

- Edition downgrade candidates (requires per-customer negotiated pricing input)
- Communities / Experience Cloud over-licensing audit
- External users on full licenses audit
- Custom price overrides per SKU (UI input)
- Permission Sets without Licenses (free, not actually a cost leak)
- Stale Connected Apps audit (the customer's own apps, not Efficyon's)
- JWT bearer flow auth alternative
- Background scheduled syncs

## Testing

Per CLAUDE.md no test runner. Verification is manual against a Salesforce **Developer Edition** org (free signup at developer.salesforce.com).

Plan:

1. Sign up for a free Developer Edition org
2. Setup → App Manager → New Connected App with the 3 OAuth scopes per the connect-form quickSetup
3. Wait ~10 minutes for the App to propagate (this is a Salesforce thing — first OAuth attempts before propagation fail with confusing errors)
4. Seed test data:
   - Create 5 dummy users (Setup → Users → New User), assign Sales Cloud licenses
   - Set 2 of them to never have logged in
   - Freeze 1 of them via Setup → Users → Login Information
   - Assign 2 users a PermissionSetLicense (e.g. CPQ if available in your edition; otherwise pick any available paid PSL)
5. Connect the org via Efficyon, run analysis, verify each check fires with expected counts and amounts
6. Verify error paths:
   - Bad consumer key → 400 from validate
   - Denied consent → user lands on dashboard with `?salesforce_consent=denied`
   - Manually revoke the integration in Salesforce → next analysis returns 401 "credentials revoked"

## Open questions before implementation

None — all decisions resolved during brainstorming.

## Implementation order (rough)

1. SQL migration `049_salesforce_provider.sql` (apply via Supabase MCP)
2. `salesforcePricing.js` constants
3. `salesforceAuth.js` — OAuth code exchange, refresh, encryption, token cache
4. `salesforceController.js` skeleton — oauth/start, oauth/callback, validate, status, disconnect
5. Wire connect/oauth/status/disconnect routes; manual end-to-end OAuth dance verification
6. Frontend `salesforce.ts` config + placeholder view + registry entry
7. Manual verification of full connect flow with a Developer Edition org
8. Data tab routes (`/users`, `/licenses`, `/psls`) + filled-in `salesforce-view.tsx`
9. The 3 check modules in isolation against a seeded Dev org
10. Aggregator + `/cost-leaks` endpoint + History tab integration
11. Setup-guide page section + brand logo
12. End-to-end manual verification with seeded data
