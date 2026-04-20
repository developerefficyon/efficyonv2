# GCP Billing (Recommender API) Integration — Design Spec

**Status:** Draft — ready for review
**Date:** 2026-04-17
**Owner:** tayawaaean@gmail.com

---

## 1. Purpose

Add Google Cloud Platform as a cost-leak integration in Efficyon. Detect wasted spend by pulling findings from Google's Recommender API across all active projects in a customer's organization. Surface recoverable savings in the existing Tools / Analysis / History UX.

## 2. Scope (v1)

**In scope:**
- Service-account JSON key authentication at organization scope
- Recommender API pulls for 11 cost-relevant recommender types (Compute, BigQuery, Cloud SQL, Cloud Storage, IAM)
- Org-wide fan-out: iterate all ACTIVE projects under the customer's org
- Aggregated findings with per-project, per-category, and per-severity rollups
- Savings computed directly from `primaryImpact.costProjection.cost` — no custom pricing table

**Out of scope (v1):**
- BigQuery billing-export analysis (spend trends, anomaly detection) — phase 2
- OAuth 2.0 3LO — service-account JSON is the industry standard for this class of tool
- Workload Identity Federation — overkill for v1
- Cross-cloud aggregation with AWS/Azure — separate initiative
- Applying recommendations back to GCP via `recommendations.markClaimed` / `markSucceeded` — phase 2 (recommendations are recorded as findings, actions documented in plain text)
- Firebase, Vertex AI, Google Ads, GA4 — each its own integration

## 3. Success Criteria

1. A customer pastes a service-account JSON key + their organization ID, and the integration validates credentials by hitting `projects.list` successfully.
2. Running "Analyze" produces a list of findings across all their active projects within 60 seconds for an org with ≤50 projects.
3. Each finding shows: project, resource, category, severity, projected monthly savings (in USD), and action steps.
4. Aggregated summary shows total savings, findings by severity, and top-5 biggest wins.
5. Results persist to `cost_leak_analyses` and appear on the History tab alongside other providers.
6. Re-running with the same parameters triggers the duplicate-check 409 response.

## 4. Architecture

No OAuth redirect. Paste-in JSON key is the credential.

```
Frontend (Next.js)                                 Backend (Express)                         Google Cloud
──────────────────                                 ─────────────────                         ─────────────
User opens Connect modal
  pastes JSON key + org ID     ──── POST ─────▶   /api/integrations (upsert pending)
                                                     │
                                                     └─ validate JSON shape, encrypt, persist
                                                     │
User clicks "Validate"        ──── POST ─────▶   /api/integrations/gcp/validate
                                                     │
                                                     ├─ exchangeServiceAccountKeyForToken ──── oauth2.googleapis.com/token
                                                     │                                           (JWT bearer grant)
                                                     ├─ cloudresourcemanager.projects.list ──▶
                                                     └─ mark status=connected, return { projectCount }

User clicks "Run Analysis"    ──── GET ──────▶   /api/integrations/gcp/cost-leaks
                                                     │
                                                     ├─ exchangeServiceAccountKeyForToken
                                                     ├─ listActiveProjects
                                                     ├─ listActiveRegionsOnce(sampleProject)
                                                     ├─ fan-out with concurrency=6:
                                                     │    project × recommender × location
                                                     │    → recommender.googleapis.com/v1/.../recommendations
                                                     ├─ aggregate, normalize into findings
                                                     └─ return analysis payload

Frontend posts analysis payload to /api/analysis-history for persistence (same pattern as Slack/HubSpot).
```

## 5. Files Touched

### New backend files

| Path | Purpose |
|---|---|
| `backend/src/utils/gcpAuth.js` | Parse SA JSON, sign JWT (RS256, built-in `crypto`), exchange for access token |
| `backend/src/utils/gcpRecommenderCatalog.js` | Table of 11 recommender type IDs + locationScope + finding-type + severity |
| `backend/src/services/gcpRecommenderAnalysis.js` | Fan-out orchestration, normalization, aggregation |
| `backend/src/controllers/gcpController.js` | `connect` / `validate` / `getStatus` / `getProjects` / `getCostLeaks` / `disconnect` |
| `backend/sql/043_gcp_provider.sql` | Extend `valid_provider` CHECK to include `'GCP'` |

### New frontend files

| Path | Purpose |
|---|---|
| `frontend/lib/tools/configs/gcp.ts` | `UnifiedToolConfig` with textarea auth field for JSON key |
| `frontend/components/tools/gcp-view.tsx` | Org summary card, by-category bar, top-5 savings, filterable findings table |

### Edited files

| Path | Change |
|---|---|
| `backend/src/routes/index.js` | Register `/api/integrations/gcp/*` routes |
| `backend/src/controllers/analysisHistoryController.js` | Add `"GCP"` branch to `extractSummary` + duplicate-check |
| `backend/src/middleware/requireRole.js` (review only) | Confirm existing role checks apply cleanly — no change expected |
| `frontend/lib/tools/registry.ts` | Add `GCP: gcpConfig` entry |
| `frontend/lib/tools/types.ts` | Add `"textarea"` to `authField.type` union, and `"apiKey"` to `authType` union (if not already present — to be confirmed in plan) |
| `frontend/components/tools/tool-logos.tsx` | Add GCP brand logo (4-color G) |

**Not touched** (config-driven): `tool-detail-tabs.tsx`, `overview-tab.tsx`, `analysis-tab.tsx`, `history-tab.tsx`, `data-tab.tsx`, `app/dashboard/tools/page.tsx` — Slack verified these are driven off `TOOL_REGISTRY`.

## 6. Authentication (Service Account JSON)

### Customer-side setup (quickSetup steps)

1. In Google Cloud Console → **IAM & Admin → Service Accounts → Create Service Account**
2. Name it "efficyon-cost-analyzer" (or anything), grant **no** project roles at this step
3. Open the service account → **Keys → Add Key → Create New Key → JSON** → download the `.json` file
4. In Cloud Console → **IAM & Admin → IAM** at the **organization** scope: grant this service account `Recommender Viewer` (`roles/recommender.viewer`), `Browser` (`roles/browser`), and `Cloud Resource Manager Viewer` at the org node
5. Paste the full contents of the `.json` file into Efficyon's Connect modal; paste the organization ID (`organizations/<numeric>`)
6. Click "Validate" — Efficyon pings `projects.list` to confirm the key works

### Server-side: `gcpAuth.js`

```js
async function exchangeServiceAccountKeyForToken(saJson) {
  // saJson: object with { client_email, private_key, token_uri }
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iss: saJson.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform.read-only",
    aud: saJson.token_uri,
    exp: now + 3600,
    iat: now,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(signingInput)
  const signature = signer.sign(saJson.private_key).toString("base64url")
  const jwt = `${signingInput}.${signature}`

  const res = await fetch(saJson.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return { accessToken: json.access_token, expiresAt: now + (json.expires_in || 3600) }
}
```

No external library — uses Node built-in `crypto`. Tokens held in the request scope only; never persisted.

## 7. Recommender Catalog

11 recommender types, covering ~95% of typical GCP waste:

| ID | Finding Type | Severity | Scope |
|---|---|---|---|
| `google.compute.instance.IdleResourceRecommender` | `IDLE_VM` | high | zonal |
| `google.compute.instance.MachineTypeRecommender` | `OVERSIZED_VM` | medium | zonal |
| `google.compute.disk.IdleResourceRecommender` | `UNATTACHED_DISK` | medium | zonal |
| `google.compute.address.IdleResourceRecommender` | `UNUSED_STATIC_IP` | low | regional |
| `google.compute.commitment.UsageCommitmentRecommender` | `MISSING_CUD` | high | regional |
| `google.bigquery.capacityCommitments.Recommender` | `BQ_CAPACITY` | high | global |
| `google.bigquery.table.PartitionClusterRecommender` | `BQ_PARTITION` | medium | global |
| `google.cloudsql.instance.IdleRecommender` | `IDLE_CLOUDSQL` | high | global |
| `google.cloudsql.instance.OverprovisionedRecommender` | `OVERSIZED_CLOUDSQL` | medium | global |
| `google.cloudstorage.bucket.SoftDeleteRecommender` | `BUCKET_SOFT_DELETE` | low | global |
| `google.iam.serviceAccount.ChangeRiskRecommender` | `UNUSED_SERVICE_ACCOUNT` | low | global |

Severity defaults can be overridden per-finding by `recommendation.priority` (Google sometimes flags something as `P1` that we'd normally rank medium). The mapping rule: `P1 → critical`, `P2 → high`, `P3 → medium`, `P4 → low`.

## 8. Fan-Out Orchestration

### Scope discovery (1–2 calls)

1. `cloudresourcemanager.googleapis.com/v3/projects?parent=<orgId>` → list of projects, filter to `state === "ACTIVE"`
2. `compute.googleapis.com/v1/projects/<sampleProject>/regions` → cached list of active regions for this run (avoid calling region-scoped recommenders in regions the customer doesn't use)

### Fan-out (N calls)

For each project × each recommender-type × each applicable-location:
```
recommender.googleapis.com/v1/projects/<proj>/locations/<loc>/recommenders/<typeId>/recommendations
```

Concurrency semaphore = 6. On 429 with `Retry-After`, back off and retry once. On persistent 429, reduce concurrency to 2 for the remainder of the run and mark `partial: true` in the response.

Projects where a specific recommender doesn't apply (e.g. no BigQuery) return an empty list — normal, not an error.

### Aggregation

```js
const analysis = {
  findings: [...],                                  // flattened, normalized
  summary: {
    orgId,
    projectCount,
    issuesFound,
    potentialMonthlySavings,                        // sum of |primaryImpact.costProjection.cost|
    potentialAnnualSavings,
    bySeverity: { critical, high, medium, low },
    byCategory: { IDLE_VM: {count, savings}, ... },
    byProject:  { "proj-a": {count, savings}, ... },
    topFindings: [...5 highest savings],
    healthScore,                                    // 100 − penalty(severity-weighted); same formula family as Slack
    inactivityThreshold: null,                      // not applicable
  },
  warnings: [],                                     // e.g. { project, error } entries for partial runs
  billableSource: "recommender.googleapis.com/v1",  // for parity with Slack's billableSource flag
}
```

### Finding shape

```js
{
  type: "IDLE_VM",
  severity: "high",
  title: `Idle Compute VM: ${resourceName}`,
  description: recommendation.description,
  affectedResources: [{ id, name, project, location }],
  projectedMonthlySavings: number,                // in USD, derived from Google's cost projection
  recommendation: recommendation.description,
  actionSteps: [...flat list of operation descriptions],
  effort: "low" | "medium" | "high",              // derived from operationGroups count
  impact: "low" | "medium" | "high",              // derived from $ savings bucket
  findingHash: md5(`${type}:${resourceId}`),      // stable across runs
  raw: { name, etag, stateInfo },                 // preserved for future apply flows
}
```

### Cost conversion

Google returns `{ currencyCode, units, nanos }` in nano-units. Convert:
```js
function costToUsd(cost) {
  if (!cost) return 0
  const units = Number(cost.units || 0)
  const nanos = Number(cost.nanos || 0)
  return Math.abs(units + nanos / 1e9)             // Recommender returns negative for savings; we surface positive
}
```

If `currencyCode !== "USD"`, we still render in the original currency and document the limitation.

## 9. Frontend Config (`gcp.ts`)

```ts
export const gcpConfig: UnifiedToolConfig = {
  provider: "GCP",
  id: "gcp",
  label: "Google Cloud",
  category: "Cloud Infrastructure",
  description: "Compute, BigQuery, SQL & storage cost analysis",
  brandColor: "#4285F4",
  authType: "apiKey",                          // existing union value (no OAuth)
  authFields: [
    {
      name: "serviceAccountKey",
      label: "Service Account JSON Key",
      type: "textarea",                        // requires adding "textarea" to the type union
      required: true,
      placeholder: '{"type":"service_account","project_id":"...",...}',
      validate: (v) => { /* JSON parse + required fields */ },
    },
    {
      name: "organizationId",
      label: "Organization ID",
      type: "text",
      required: true,
      placeholder: "organizations/123456789",
      validate: (v) => /^organizations\/\d+$/.test(v) ? null : "Format: organizations/<numeric-id>",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: null,                    // no OAuth; validation happens via a separate validate endpoint
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "GCP",
      connection_type: "apiKey",
      status: "pending",
      settings: {
        service_account_key: values.serviceAccountKey,   // encrypted server-side
        organization_id: values.organizationId,
      },
    }],
  }),
  quickSetup: { title: "Quick Setup", steps: [...Section 6 steps], note: "Requires org-level IAM admin." },
  endpoints: [
    { key: "projects", path: "/api/integrations/gcp/projects", pick: ["projects"], fallback: [] },
    { key: "status", path: "/api/integrations/gcp/status", pick: ["status"] },
  ],
  defaultTab: "projects",
  viewComponent: GcpView,
  connectingToast: "Validating service account key…",
  tokenRevocation: { automated: false },       // customer deletes the key in their GCP console
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/gcp/cost-leaks",
  analysisSupportsInactivity: false,           // GCP findings aren't inactivity-parameterized
}
```

**Registry note:** this is the first integration with `oauthStartEndpoint: null`. The connect-tool modal must treat that as "skip authorize-redirect, go straight to validate". Small logic branch in the existing connect flow — to be verified in the plan.

## 10. Frontend View (`gcp-view.tsx`)

Four sections:

1. **Org summary card** — organization ID, project count, active-regions count, last analyzed timestamp
2. **Savings by category** — horizontal bar chart: one row per finding type, bars sized by projected monthly savings, counts shown at right
3. **Top 5 savings** — cards ranked by `$` per finding, each with project, resource name, category, quick-action link to the GCP console
4. **All findings table** — sortable by project, category, severity, or savings; filterable via chips (All / High / Medium / Low / specific categories)

No new UI primitives required.

## 11. Database

### Migration: `backend/sql/043_gcp_provider.sql`

```sql
ALTER TABLE public.cost_leak_analyses
  DROP CONSTRAINT IF EXISTS valid_provider;

ALTER TABLE public.cost_leak_analyses
  ADD CONSTRAINT valid_provider
  CHECK (provider IN (
    'Fortnox',
    'Microsoft365',
    'HubSpot',
    'QuickBooks',
    'Shopify',
    'OpenAI',
    'Anthropic',
    'Gemini',
    'GoogleWorkspace',
    'Slack',
    'GCP'
  ));
```

### `analysisHistoryController.js` edits (repeat of Slack pattern)

Add a `"GCP"` branch to `extractSummary`:
```js
} else if (provider === "GCP") {
  const s = analysisData.summary || {}
  summary.totalFindings = s.issuesFound || 0
  summary.totalPotentialSavings = s.potentialMonthlySavings || 0
  summary.highSeverity = (s.bySeverity?.critical || 0) + (s.bySeverity?.high || 0)
  summary.mediumSeverity = s.bySeverity?.medium || 0
  summary.lowSeverity = s.bySeverity?.low || 0
  summary.healthScore = typeof s.healthScore === "number" ? s.healthScore : null
}
```

GCP is NOT added to the inactivity-based duplicate-check branch. Its own duplicate-check key is `organization_id` — add a new branch:
```js
} else if (provider === "GCP") {
  duplicateQuery = duplicateQuery
    .eq("parameters->>organizationId", params.organizationId || "")
}
```

## 12. Routes to Register

```js
router.post(  "/api/integrations/gcp/validate",              requireAuth, requireRole("owner", "editor"),           validateGcp)
router.get(   "/api/integrations/gcp/status",                requireAuth, requireRole("owner", "editor", "viewer"), getGcpStatus)
router.get(   "/api/integrations/gcp/projects",              requireAuth, requireRole("owner", "editor", "viewer"), getGcpProjects)
router.get(   "/api/integrations/gcp/cost-leaks",            requireAuth, requireRole("owner", "editor", "viewer"), analyzeGcpCostLeaks)
router.get(   "/api/integrations/gcp/recommendations",       requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post(  "/api/integrations/gcp/recommendations/apply", requireAuth, requireRole("owner", "editor"),           applyRecommendation)
router.patch( "/api/integrations/gcp/recommendations/steps", requireAuth, requireRole("owner", "editor"),           updateRecommendationSteps)
router.delete("/api/integrations/gcp/recommendations/:id",   requireAuth, requireRole("owner"),                     deleteRecommendation)
router.delete("/api/integrations/gcp/disconnect",            requireAuth, requireRole("owner", "editor"),           disconnectGcp)
```

Note: no OAuth callback. The integration is created by the standard POST `/api/integrations`, then validated by the GCP-specific `/validate` endpoint.

## 13. Error Handling

| Case | Behavior |
|---|---|
| Invalid JSON pasted | Frontend validate blocks submit; backend validates again before persisting |
| JSON is not `type: "service_account"` | Reject with "Must be a service account key" (prevents user-credential leak) |
| SA missing `recommender.viewer` at org | First validate call returns 403 → "Grant `roles/recommender.viewer` on the organization" |
| SA missing org-level `browser` or `cloudresourcemanager.projects.list` | Surface specific missing-role message |
| Org has no active projects | Finding `NO_ACTIVE_PROJECTS`, savings=null, friendly UI |
| Recommender unavailable for a project (404 / empty) | Silently skip |
| One project times out mid-fan-out | Partial results + `warnings: [{ project, error }]`; UI shows a banner |
| Private key malformed at sign time | Mark `status: "error"`, surface "Invalid service account key" |
| Token 401 (key revoked) | Mark `status: "expired"`, prompt reconnect |
| 429 rate limit | Retry once with `Retry-After`; if still failing, drop concurrency to 2 and flag partial |
| Non-USD `currencyCode` | Render in original currency, show once-per-run notice |

## 14. Security

- JSON key blob encrypted at rest using the existing `encryptOAuthData` path (opaque-string-safe).
- Access tokens minted fresh per analysis run, scoped to `cloud-platform.read-only`, held in memory only.
- `requireAuth + requireRole("owner", "editor"[, "viewer"])` on every route.
- Connect endpoint rejects non-service-account JSON shapes to prevent accidental user-credential submission.
- No row-level security (matches existing project convention); company-scoping enforced in middleware.

## 15. Testing Plan (manual, per CLAUDE.md)

1. Create a GCP sandbox org with 2–3 projects: one with an obviously idle VM, one with an oversized instance, one with an unattached disk.
2. Create a service account, grant `roles/recommender.viewer` + `roles/browser` + `roles/cloudresourcemanager.folderViewer` at the org node.
3. Download the JSON key.
4. Paste into Efficyon Connect modal + org ID → Validate → confirm success toast.
5. Data tab shows the 2–3 projects listed.
6. Run Analysis → verify findings populated within 60s.
7. Top Savings card highlights the idle VM correctly.
8. By-category breakdown matches expected types (IDLE_VM, OVERSIZED_VM, UNATTACHED_DISK).
9. Supabase SQL: `SELECT provider, summary->'totalPotentialSavings' FROM cost_leak_analyses ORDER BY created_at DESC LIMIT 5` → top row is `GCP` with non-zero savings.
10. Re-run immediately → 409 duplicate response.
11. Change concurrency env override or simulate 429 via quota exhaustion → `warnings` populated, `partial: true`.
12. Disconnect → verify `status: disconnected`, `oauth_data: null`, re-connect works.

## 16. Open Questions / Deferred

- **BigQuery billing export**: phase 2. Unlocks anomaly detection and project-level spend trends.
- **Applying recommendations**: currently findings are read-only. Phase 2 would wire `recommendations.markClaimed` on the "Mark as done" action.
- **Multi-currency**: v1 displays native currency per finding; phase 2 could normalize to the customer's reporting currency via an FX lookup.
- **Organization-less customers**: if the service account can only see a single project (no org node), treat it as a single-project integration. Detected at validate time; UI shows "Organization-less connection — project-only scope" badge.

## 17. Rollout Notes

- Migration `043_gcp_provider.sql` must be applied to Supabase before the first production deploy (same pattern as Slack's 042).
- No new env vars required. The SA key is per-customer and stored per-integration.
- No scheduler wiring in v1. Analysis is on-demand. Periodic auto-analysis deferred.
- Docs update: add a new "Connect Google Cloud" page under `/docs/integrations/` once product signs off on the quickSetup steps.
