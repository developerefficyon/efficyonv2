# AWS Billing Integration — Design Spec

- **Date:** 2026-04-20
- **Topic:** AWS cost-leak integration (EC2/RDS/Lambda/EBS rightsizing + Savings Plan / RI opportunities)
- **Status:** Design approved; ready for implementation plan

## Summary

Add an AWS provider to Efficyon alongside the existing GCP integration. The integration connects to a customer's AWS Organization via a cross-account IAM role (STS `AssumeRole` + external ID), pulls cost-optimization recommendations from **AWS Cost Explorer** and **AWS Compute Optimizer**, normalizes them into our shared cost-leak schema, and persists each run to `cost_leak_analyses` exactly as GCP does.

This spec intentionally mirrors the GCP integration's architecture where the shapes are compatible, and deviates only where AWS's auth model and API surface demand it.

## Decisions recap

| # | Decision |
|---|---|
| 1 | **Auth:** cross-account IAM role + external ID; fresh short-lived credentials via STS `AssumeRole` per analysis |
| 2 | **Scope:** AWS Organization-only; role lives in the management/payer account; one integration row covers the whole footprint |
| 3 | **Recommendation sources:** Cost Explorer (rightsizing + Savings Plan / RI purchase recs) + Compute Optimizer (EC2 / EBS / Lambda / RDS / idle). Trusted Advisor deferred v1 |
| 4 | **Connect UX:** CloudFormation "1-click launch" URL primary, manual trust/permissions JSON as fallback |
| 5 | **Regions:** auto-detected on connect via `account:ListRegions`, cached in `settings.active_regions`, refreshable from Data tab |
| 6 | **Analysis code layout:** split by source — `awsCostExplorerAnalysis.js` + `awsComputeOptimizerAnalysis.js` + thin `awsCostLeakAnalysis.js` aggregator |

## Why this shape

- **Cross-account role over long-lived access keys.** Long-lived access keys stored in our DB create an unacceptable blast radius on compromise; they also violate AWS's own published guidance for third-party SaaS integrations. The role model gives customers instant revocation (delete the role) and leaves no standing secret material in our database. Parallels the "encrypt service_account_key at rest" fix already applied to GCP (commit `3bbf449`) — AWS avoids that class of problem entirely by not persisting a secret.
- **Organization-scoped.** Mid-size+ AWS customers have many accounts; a single-account integration shows a partial picture and creates onboarding friction ("which account do I connect first?"). Management-account scope matches the finance-buyer persona and maps 1:1 to GCP's org-level scope.
- **Cost Explorer + Compute Optimizer only.** Trusted Advisor's Cost Optimization category is richer but is paywalled behind Business/Enterprise Support (~$100+/mo minimum). Most cost-conscious customers don't have those plans. The two free/cheap APIs together cover roughly 80% of real cost leaks (rightsizing, idle resources, purchase commitments).
- **CloudFormation launch URL.** The two-minute clickthrough is the dominant pattern for SaaS-to-AWS onboarding (Datadog, Vanta, Wiz, Spot, CloudHealth). Manual trust-policy JSON stays available for airgapped/restricted orgs.
- **Source-split analysis code.** Cost Explorer and Compute Optimizer have very different response shapes and error modes; splitting them keeps each file small enough to hold in context and localizes normalization in the aggregator. A single-file version would grow past 500 lines.

## Architecture

### File layout

**Backend (new)**

```
backend/src/
├─ utils/
│  └─ awsAuth.js                         STS AssumeRole wrapper + in-process credential cache (≤55min TTL)
├─ services/
│  ├─ awsCostExplorerAnalysis.js         Rightsizing + SP/RI purchase recs. us-east-1 only.
│  ├─ awsComputeOptimizerAnalysis.js     EC2 / EBS / Lambda / RDS / idle recs, fanned out over active_regions.
│  └─ awsCostLeakAnalysis.js             Aggregator: calls both services, normalizes, assigns severity, rolls up totals.
├─ controllers/
│  └─ awsController.js                   connect / validate / getStatus / getAwsAccounts / getAwsRegions / refreshAwsRegions / analyze / disconnect
├─ templates/
│  └─ aws-efficyon-role.yaml             Served at GET /api/aws/cloudformation-template with ${EFFICYON_AWS_ACCOUNT_ID} interpolated
└─ sql/
   └─ 044_aws_provider.sql               Extends cost_leak_analyses.valid_provider CHECK to include 'AWS'
```

**Backend (modified)**

- `backend/src/routes/index.js` — register new AWS routes
- `backend/src/controllers/analysisHistoryController.js` — add `AWS` branch to `extractSummary()`
- `backend/env.example.backend.txt` — document `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_EFFICYON_ACCOUNT_ID`

**Frontend (new)**

```
frontend/
├─ lib/tools/configs/aws.ts              UnifiedToolConfig with connectComponent override
├─ components/tools/aws-view.tsx         Data-tab: org summary, accounts table, active regions with refresh
└─ components/tools/aws-connect-form.tsx 3-step wizard: generate external ID → launch CloudFormation → paste Role ARN
```

**Frontend (modified)**

- `frontend/lib/tools/types.ts` — add optional `connectComponent?: ComponentType<ConnectComponentProps>` to `UnifiedToolConfig` (backward compatible; all other configs ignore it)
- `frontend/lib/tools/registry.ts` — register `awsConfig`
- Wherever `TOOL_BRANDS` lives — add AWS brand logo (same pattern as GCP commit `ae54780`)

### Module boundaries

- `awsAuth.js` is the **only** module that touches STS. Every other service calls `getAwsCredentials(integrationId)` and receives fresh temporary credentials. Keeps secret-handling centralized and audit-friendly (every analysis run produces one `AssumeRole` event in the customer's CloudTrail).
- `awsCostLeakAnalysis.js` is the **only** module that knows our normalized finding shape and severity thresholds. The two source services return raw per-source findings; the aggregator translates.
- `aws-connect-form.tsx` is separated from the shared declarative connect form because its multi-step wizard doesn't fit the `AuthField[]` model. A minimal additive extension — optional `connectComponent` on `UnifiedToolConfig` — lets one tool opt into a custom form while every other tool keeps the existing declarative path.

## Auth flow

### External ID lifecycle

- Client-side generation (`crypto.randomUUID().replace(/-/g, '')` in the connect wizard) yields a 32-char hex string.
- Stored only after the user clicks Connect; lives in `settings.external_id`; never rotated.
- If a customer corrupts their trust policy, re-launching the CloudFormation stack with the same external ID fixes it without a reconnect.

### CloudFormation template

Stored at `backend/src/templates/aws-efficyon-role.yaml`, served at `GET /api/aws/cloudformation-template` as `application/yaml`. On serve, `${EFFICYON_AWS_ACCOUNT_ID}` is replaced with `process.env.AWS_EFFICYON_ACCOUNT_ID`. Template contents are non-secret (just the trust/permissions policies); no auth required on the endpoint.

**Trust policy:**

```yaml
AssumeRolePolicyDocument:
  Statement:
    - Effect: Allow
      Principal:
        AWS: arn:aws:iam::${EFFICYON_AWS_ACCOUNT_ID}:root
      Action: sts:AssumeRole
      Condition:
        StringEquals:
          sts:ExternalId: !Ref ExternalId
```

**Permissions policy (least-privilege, read-only):**

```yaml
Statement:
  - Effect: Allow
    Action:
      - ce:GetRightsizingRecommendation
      - ce:GetSavingsPlansPurchaseRecommendation
      - ce:GetReservationPurchaseRecommendation
      - ce:GetCostAndUsage
      - compute-optimizer:GetEC2InstanceRecommendations
      - compute-optimizer:GetEBSVolumeRecommendations
      - compute-optimizer:GetLambdaFunctionRecommendations
      - compute-optimizer:GetAutoScalingGroupRecommendations
      - compute-optimizer:GetECSServiceRecommendations
      - compute-optimizer:GetRDSDBInstanceRecommendations
      - compute-optimizer:GetIdleRecommendations
      - compute-optimizer:GetRecommendationSummaries
      - organizations:DescribeOrganization
      - organizations:ListAccounts
      - account:ListRegions
      - ec2:DescribeRegions
      - iam:GetAccountSummary
    Resource: "*"
```

### Wizard sequence

1. **Step 1 — Generate security token.** Client generates `externalId`, shows it with a copy control. No network call.
2. **Step 2 — Launch CloudFormation.** Button opens `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=<BACKEND_URL>/api/aws/cloudformation-template&stackName=efficyon-role&param_ExternalId=<externalId>` in a new tab. Below, a disclosed "Advanced / manual setup" accordion shows raw trust + permissions JSON for customers who can't use CloudFormation.
3. **Step 3 — Paste Role ARN.** Text input validated against `^arn:aws:iam::\d{12}:role/[\w+=,.@-]+$`. On submit, the standard `POST /api/integrations` flow creates the integration row with `status: "pending"`; the detail page then auto-fires `POST /api/integrations/aws/validate`.

### Credential caching

```js
// backend/src/utils/awsAuth.js
async function getAwsCredentials(integrationId) {
  const cached = credentialCache.get(integrationId)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.credentials

  const integration = await fetchIntegration(integrationId)
  const { Credentials } = await stsClient.send(new AssumeRoleCommand({
    RoleArn: integration.settings.role_arn,
    ExternalId: integration.settings.external_id,
    RoleSessionName: `efficyon-${integrationId}-${Date.now()}`,
    DurationSeconds: 3600,
  }))
  const credentials = {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken,
  }
  credentialCache.set(integrationId, { credentials, expiresAt: Credentials.Expiration.getTime() })
  return credentials
}
```

In-process `Map` with 55-minute effective TTL (refresh 5 min before the 60-min AWS expiry). No DB persistence — on restart, the next call re-assumes, which is the desired CloudTrail behavior.

### Operational prerequisite

Efficyon needs a dedicated AWS account (the "Efficyon ops" account — can be separate from any corporate infra account) with one IAM user whose only permission is `sts:AssumeRole` on `*`. Its account ID is the `${EFFICYON_AWS_ACCOUNT_ID}` baked into every customer's trust policy. One-time setup.

### Security posture

- No long-lived credentials in our DB. `settings.external_id` and `settings.role_arn` are worthless to an attacker without our AWS account's IAM identity.
- No migration-level encryption needed (unlike GCP's `service_account_key`).
- Customer-side revocation is instant (delete the role or the CloudFormation stack).

## Data model

### `company_integrations` row (no schema change)

`company_integrations` already has `provider text`, `settings jsonb`, `status text`, and `UNIQUE(company_id, provider)` from [backend/sql/000_init_clean_schema.sql:118-127](../../../backend/sql/000_init_clean_schema.sql). AWS rows fit that existing shape.

**`settings` shape for AWS:**

```json
{
  "external_id": "d_H3sF7xPqKc2Zv8NmR4wBt1Ea5Y-Kx_L",
  "role_arn": "arn:aws:iam::123456789012:role/efficyon-cost-analyzer",
  "aws_account_id": "123456789012",
  "organization_id": "o-abc1234567",
  "master_account_id": "123456789012",
  "active_regions": ["us-east-1", "us-west-2", "eu-west-1"],
  "regions_refreshed_at": "2026-04-20T10:30:00Z",
  "last_validated_at": "2026-04-20T10:30:00Z"
}
```

- `external_id` — never rotated; lets customers re-launch CloudFormation with the same parameter.
- `role_arn` — the only identifier we use to `AssumeRole`.
- `aws_account_id` — parsed from `role_arn` for display.
- `organization_id` / `master_account_id` — hydrated by `organizations:DescribeOrganization` on validate; if connected account ≠ management account, validate fails with an explicit error.
- `active_regions` — hydrated by `account:ListRegions` on validate; refreshable from Data tab.

### Migration 044

```sql
-- backend/sql/044_aws_provider.sql
-- Allow AWS as a provider for persisted cost-leak analyses.
-- Findings come from AWS Cost Explorer (rightsizing, SP/RI purchase recs) and
-- AWS Compute Optimizer (EC2/EBS/Lambda/RDS/idle).

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
    'GCP',
    'AWS'
  ));
```

Applied via Supabase MCP (same pattern as migration 043).

### `cost_leak_analyses` row shape for AWS

Uses the existing shared table — no changes to its schema.

```json
{
  "provider": "AWS",
  "integration_id": "<uuid>",
  "summary": {
    "totalPotentialSavings": 14732.40,
    "currency": "USD",
    "totalFindings": 47,
    "findingsBySeverity": { "critical": 3, "high": 12, "medium": 24, "low": 8 },
    "findingsBySource": { "cost_explorer": 6, "compute_optimizer": 41 },
    "analyzedAccounts": 12,
    "analyzedRegions": 3,
    "partialRegionFailures": []
  },
  "findings": [
    {
      "id": "co-ec2-rightsize-i-0abc123def",
      "source": "compute_optimizer",
      "severity": "high",
      "category": "rightsizing",
      "title": "Over-provisioned EC2 instance",
      "resource": { "type": "ec2-instance", "id": "i-0abc123def", "accountId": "123456789012", "region": "us-east-1" },
      "currentCost": 312.50,
      "projectedSavings": 187.20,
      "currency": "USD",
      "recommendation": "Downsize from m5.xlarge to m5.large — observed CPU p99 = 14%, memory p99 = 22%",
      "actionSteps": [
        "Verify the recommendation in Compute Optimizer console",
        "Schedule a maintenance window",
        "Stop → modify instance type → start"
      ],
      "raw": { }
    }
  ]
}
```

### Severity mapping (in aggregator)

Applied per-finding, thresholds in USD projected monthly savings:

- `critical`: savings ≥ $500
- `high`: savings ≥ $100
- `medium`: savings ≥ $25
- `low`: savings > $0
- Findings with savings == 0 are dropped (not a "cost leak")

### `analysisHistoryController` branch

```js
if (provider === 'AWS') {
  return {
    totalPotentialSavings: summary.totalPotentialSavings ?? 0,
    currency: summary.currency ?? 'USD',
    totalFindings: summary.totalFindings ?? 0,
    findingsBySeverity: summary.findingsBySeverity ?? {},
  }
}
```

Mirrors the GCP/Slack branches added in commits `cb9ec48` and `2c62f1b`.

## Analysis pipeline

### Entry point

```
POST /api/integrations/aws/cost-leaks
  body: { integrationId }
  auth: requireAuth + requireRole("owner", "editor")
```

### Handler orchestration

```
1. Load integration; assert provider='AWS' and status='connected'.
2. Check for existing in-flight analysis (same integrationId, created within last 5min) → 409 if found.
3. awsAuth.getAwsCredentials(integrationId) → fresh temporary credentials.
4. Fan out CE + CO in parallel:
     const [ceFindings, coFindings] = await Promise.all([
       runCostExplorerAnalysis(credentials, settings),
       runComputeOptimizerAnalysis(credentials, settings)
     ]);
5. aggregate(ceFindings, coFindings, integration) → normalized findings + summary.
6. analysisHistoryController.saveAnalysis(...) → persists to cost_leak_analyses.
7. Return { summary, findings } to the client.
```

### Cost Explorer service

Single us-east-1 client. Three sequential APIs (shared CE rate bucket):

- `ce:GetRightsizingRecommendation` (`Service=AmazonEC2`, `RecommendationTarget=SAME_INSTANCE_FAMILY`)
- `ce:GetSavingsPlansPurchaseRecommendation` (`SavingsPlansType=COMPUTE_SP`, `TermInYears=ONE_YEAR`, `PaymentOption=NO_UPFRONT`, `LookbackPeriodInDays=SIXTY_DAYS`)
- `ce:GetReservationPurchaseRecommendation` (`Service=AmazonEC2`, `TermInYears=ONE_YEAR`, `PaymentOption=NO_UPFRONT`, `LookbackPeriodInDays=SIXTY_DAYS`)

Paginated via `NextPageToken`. Capped at 200 findings per API to bound CE's per-request cost (~$0.01 per paginated call; worst-case run ~$0.06).

### Compute Optimizer service

Fans out across `settings.active_regions`. Within each region, six APIs run **in parallel**:

- `GetEC2InstanceRecommendations`
- `GetEBSVolumeRecommendations`
- `GetLambdaFunctionRecommendations`
- `GetAutoScalingGroupRecommendations`
- `GetRDSDBInstanceRecommendations`
- `GetIdleRecommendations`

Every call uses `includeMemberAccounts: true` — critical; without it, a management-account role returns only its own account's data instead of the whole org. Paginated with `nextToken`; capped at 500 recs per `(region × API)`. Timeout per region: 30s. Partial failures (one region erroring) don't fail the whole run — region marked in `summary.partialRegionFailures`, user sees a warning badge on the Analysis tab.

### Aggregator

```js
function aggregate(ceFindings, coFindings, integration) {
  const normalized = [...ceFindings, ...coFindings].map(normalizeFinding);
  normalized.forEach(f => { f.severity = assignSeverity(f); });
  normalized.sort((a, b) => b.projectedSavings - a.projectedSavings);

  const summary = {
    totalPotentialSavings: sum(normalized, 'projectedSavings'),
    currency: 'USD',
    totalFindings: normalized.length,
    findingsBySeverity: countBy(normalized, 'severity'),
    findingsBySource: countBy(normalized, 'source'),
    analyzedAccounts: uniq(normalized.map(f => f.resource.accountId)).length,
    analyzedRegions: integration.settings.active_regions.length,
    partialRegionFailures: [],
  };
  return { summary, findings: normalized };
}
```

Currency is always USD (AWS bills in USD regardless of customer locale). Frontend handles display conversion.

### Rate-limiting posture

- Cost Explorer: 40 req/sec per account — three sequential calls stay well under.
- Compute Optimizer: 20 req/sec per account per region — six parallel calls per region are safe.
- STS `AssumeRole`: 1,800 TPS per account — untouched by the cache.

AWS SDK v3's default retry (3 retries, adaptive mode) handles transient 429s. No explicit backoff library needed for v1.

### Error taxonomy

| AWS error | HTTP | User-facing message |
|---|---|---|
| `AccessDeniedException` on `AssumeRole` | 403 | "AWS rejected the assume-role call — re-check the external ID on your CloudFormation stack" |
| `AccessDeniedException` on `ce:*` | 403 | "The IAM role is missing Cost Explorer permissions — re-launch the CloudFormation template" |
| Compute Optimizer `OptInRequiredException` | 409 | "Enable AWS Compute Optimizer in the AWS console, then retry" |
| `AWSOrganizationsNotInUseException` | 400 | "This AWS account isn't part of an Organization — Efficyon currently requires a management-account role" |
| Management-account mismatch | 400 | "The connected account isn't the Organization management account — connect the payer account instead" |
| `ThrottlingException` | 503 | "AWS throttled the analysis — please retry in a minute" |

### Expected run time

- Small org (1 region, <10 accounts, <50 findings): 3–8s
- Typical org (3–5 regions, 20 accounts, ~200 findings): 15–30s
- Large org (8 regions, 50 accounts, 500+ findings, heavy pagination): 45–90s

All inside a synchronous HTTP request. No queuing infra for v1; matches GCP's synchronous `analyzeGcpCostLeaks`.

## Routes

All gated by `requireAuth` + `requireRole("owner", "editor")` unless noted.

```
GET    /api/aws/cloudformation-template        serveCloudFormationTemplate     (NO AUTH — static YAML)
POST   /api/integrations/aws/validate          validateAws
GET    /api/integrations/aws/status            getAwsStatus
GET    /api/integrations/aws/accounts          getAwsAccounts
GET    /api/integrations/aws/regions           getAwsRegions
POST   /api/integrations/aws/regions/refresh   refreshAwsRegions
POST   /api/integrations/aws/cost-leaks        analyzeAwsCostLeaks
DELETE /api/integrations/aws                   disconnectAws
```

Integration row creation reuses the generic `POST /api/integrations` endpoint already wired for every other provider.

### Handler summaries

```
serveCloudFormationTemplate:
  Reads backend/src/templates/aws-efficyon-role.yaml, interpolates ${EFFICYON_AWS_ACCOUNT_ID},
  returns 'Content-Type: application/yaml'. No auth.

validateAws:
  1. Resolve integration by (company_id, tool_name='AWS').
  2. awsAuth.getAwsCredentials → must succeed.
  3. organizations:DescribeOrganization → extract organization_id + master_account_id.
  4. If aws_account_id !== master_account_id → 400 "connect the management account".
  5. account:ListRegions → settings.active_regions + regions_refreshed_at = now().
  6. Persist settings (including last_validated_at = now()) + status='connected'.
     Return { status, organizationId, accountCount, activeRegions }.

getAwsStatus:   status + last_validated_at + org/account metadata from settings.

getAwsAccounts: AssumeRole → organizations:ListAccounts (paginated, cap 500).

getAwsRegions:  returns settings.active_regions + regions_refreshed_at.

refreshAwsRegions: AssumeRole → account:ListRegions → update settings → return fresh list.

analyzeAwsCostLeaks: the pipeline above. Persists via analysisHistoryController.saveAnalysis.

disconnectAws: clears settings.role_arn + settings.external_id; sets status='disconnected'.
               Does NOT contact AWS (customer revokes on their side by deleting the role).
```

## Frontend

### `UnifiedToolConfig` extension

Additive field on `UnifiedToolConfig` in [frontend/lib/tools/types.ts](../../../frontend/lib/tools/types.ts):

```ts
export interface ConnectComponentProps {
  onSubmit: (values: Record<string, any>) => Promise<void>
  onCancel: () => void
}

export interface UnifiedToolConfig {
  // ... existing fields ...
  authFields: AuthField[]
  connectComponent?: ComponentType<ConnectComponentProps>  // NEW
  // ... existing fields ...
}
```

Semantics: if `connectComponent` is present, it replaces the default auto-generated form. `authFields` stays required (can be `[]`) for backward compatibility with every existing config.

### `awsConfig`

```ts
import type { UnifiedToolConfig } from "../types"
import { AwsView } from "@/components/tools/aws-view"
import { AwsConnectForm } from "@/components/tools/aws-connect-form"

export const awsConfig: UnifiedToolConfig = {
  provider: "AWS",
  id: "aws",
  label: "Amazon Web Services",
  category: "Cloud Infrastructure",
  description: "EC2, RDS, Lambda, EBS rightsizing and Savings Plan / RI opportunities",
  brandColor: "#FF9900",
  authType: "serviceAccount",
  authFields: [],
  connectComponent: AwsConnectForm,
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "AWS",
      connection_type: "serviceAccount",
      status: "pending",
      settings: {
        external_id: values.externalId,
        role_arn: values.roleArn,
      },
    }],
  }),
  endpoints: [
    { key: "accounts", path: "/api/integrations/aws/accounts", pick: ["accounts"], fallback: [] },
    { key: "status",   path: "/api/integrations/aws/status",   pick: ["status"] },
    { key: "regions",  path: "/api/integrations/aws/regions",  pick: ["activeRegions"], fallback: [] },
  ],
  defaultTab: "accounts",
  viewComponent: AwsView,
  connectingToast: "Assuming IAM role…",
  tokenRevocation: {
    automated: false,
    manualStepsNote: "To fully revoke access, delete the IAM role 'efficyon-cost-analyzer' from your AWS management account (IAM → Roles), or delete the CloudFormation stack that created it.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/aws/cost-leaks",
  analysisSupportsInactivity: false,
}
```

### `AwsConnectForm` — 3-step wizard

- **Step 1 — Generate security token.** Info card + "Generate" button. On click, `crypto.randomUUID().replace(/-/g, '')` stored in component state as `externalId`. Shows value + copy control. "Continue →" advances.
- **Step 2 — Launch CloudFormation.** Primary button opens AWS console in a new tab with the templateURL + stackName + param_ExternalId query params pre-filled. Below, an "Advanced / manual setup" accordion reveals raw trust-policy JSON + permissions-policy JSON + step-by-step IAM console instructions. "I've created the role →" advances.
- **Step 3 — Paste Role ARN.** Text input validated against `^arn:aws:iam::\d{12}:role/[\w+=,.@-]+$`. "Connect" calls `onSubmit({ externalId, roleArn })`. Post-success, the standard detail page auto-fires `/validate`.

### `AwsView` — Data tab

Three panels:

1. **Organization summary** — `organization_id`, `master_account_id`, member-account count, active-region count, last-validated timestamp.
2. **Accounts table** — columns: Account ID, Name, Status, Email, Joined Method, Joined Date. Driven by `/api/integrations/aws/accounts`.
3. **Active regions** — chip list from `/api/integrations/aws/regions` + "Refresh regions" button that calls `POST /api/integrations/aws/regions/refresh`.

Analysis and History tabs need no per-tool rendering — the shared components already handle `analysisType: "costLeaks"`.

### Registry & brand logo

- One line in [frontend/lib/tools/registry.ts](../../../frontend/lib/tools/registry.ts) to register `awsConfig`.
- One entry in `TOOL_BRANDS` for the AWS logo (pattern from commit `ae54780`).

## Environment variables

New required env vars in [backend/env.example.backend.txt](../../../backend/env.example.backend.txt):

```
AWS_ACCESS_KEY_ID=<efficyon-service-user-access-key>
AWS_SECRET_ACCESS_KEY=<efficyon-service-user-secret>
AWS_EFFICYON_ACCOUNT_ID=<12-digit-account-id>
```

The first two are credentials for the dedicated "Efficyon ops" IAM user whose only permission is `sts:AssumeRole` on `*`. The third is the account ID referenced in every customer's trust policy (and interpolated into the CloudFormation template when served).

## Verification plan (manual E2E)

No test runner exists per CLAUDE.md — manual E2E is the verification model, same as GCP's Task 13.

1. Apply migration 044 via Supabase MCP.
2. **Efficyon ops account setup (one-time).** Create an AWS account dedicated to Efficyon. Create an IAM user `efficyon-backend` with a policy allowing only `sts:AssumeRole` on `Resource: "*"`. Generate access keys; put them in the backend `.env` as `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`. Record the account ID as `AWS_EFFICYON_ACCOUNT_ID`.
3. **Sandbox customer setup.** Use or create a sandbox AWS Organization. In the management account, enable AWS Compute Optimizer (Compute Optimizer console → Get started).
4. Start backend + frontend dev servers.
5. Dashboard: Add Integration → Amazon Web Services → step through the wizard. Generate external ID → launch CloudFormation → create stack → copy Role ARN from stack Outputs → paste → Connect.
6. Verify:
   - Integration transitions `pending` → `connected` within ~5s.
   - Overview tab shows organization ID + member account count.
   - Data tab shows accounts list + active regions with recent `regions_refreshed_at`.
7. Analysis tab → Run Analysis → findings appear within ~60s (longer for large orgs).
8. Supabase SQL: `SELECT provider, summary->>'totalPotentialSavings', summary->>'totalFindings' FROM cost_leak_analyses WHERE provider = 'AWS' ORDER BY created_at DESC LIMIT 1;` — expect one non-zero row.
9. History tab shows the run with matching numbers.
10. **Negative path: permissions.** Edit the CloudFormation stack, remove `ce:GetRightsizingRecommendation` from the policy, update → re-run Analysis → expect 403 with the "re-launch the CloudFormation template" hint.
11. **Negative path: opt-in.** Disable Compute Optimizer in the management account → re-run Analysis → expect 409 with opt-in link.
12. **Refresh regions.** Click "Refresh regions" in Data tab → `regions_refreshed_at` updates.
13. **Duplicate run.** Run Analysis twice within 5 minutes → expect 409 on the second call (matches GCP duplicate behavior).
14. **Disconnect.** Disconnect integration → `status` = `disconnected`, `settings.role_arn` + `settings.external_id` cleared. Reconnect with the same CloudFormation stack → works cleanly.

Optional: drop screenshots/notes in `docs/superpowers/verification/`.

## Out of scope (v1)

- **Trusted Advisor Cost Optimization** — requires Business/Enterprise Support plan (~$100+/mo). Revisit when a customer asks.
- **Cost Anomaly Detection** (`ce:GetAnomalies`) — distinct feature; separate spec.
- **Scheduled/automated analyses** — no job-queue infrastructure today; on-demand only.
- **Savings Plans / RI *utilization*** — different from the *purchase recommendations* included here.
- **Cross-region parallel fan-out optimization** — current design already parallelizes within a region; add cross-region parallelism only if run times become a real problem.
- **Member / delegated-admin account connection** — v1 is management-account only.

## References

- GCP integration spec (sibling, completed): [docs/superpowers/specs/2026-04-17-gcp-billing-integration-design.md](2026-04-17-gcp-billing-integration-design.md)
- GCP implementation plan: [docs/superpowers/plans/2026-04-17-gcp-billing-integration.md](../plans/2026-04-17-gcp-billing-integration.md)
- Unified tool registry design: [docs/superpowers/specs/2026-04-14-unified-tool-registry-design.md](2026-04-14-unified-tool-registry-design.md)
- Slack integration spec (for connect-UI escape-hatch precedent): [docs/superpowers/specs/2026-04-17-slack-integration-design.md](2026-04-17-slack-integration-design.md)
