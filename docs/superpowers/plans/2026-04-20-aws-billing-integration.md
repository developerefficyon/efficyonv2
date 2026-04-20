# AWS Billing (Cost Explorer + Compute Optimizer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AWS as a cost-leak integration alongside GCP. Cross-account IAM role (STS AssumeRole + external ID) auth at AWS-Organization scope, findings pulled from **AWS Cost Explorer** (rightsizing + SP/RI purchase recs) and **AWS Compute Optimizer** (EC2 / EBS / Lambda / RDS / idle), normalized and persisted to the shared `cost_leak_analyses` table.

**Architecture:** No OAuth. A CloudFormation template creates an IAM role in the customer's management account that trusts Efficyon's own AWS account. Per-analysis `AssumeRole` gives fresh 1-hour credentials (cached in-process). Two source services fan out (CE = single us-east-1, CO = parallel across `settings.active_regions`); a thin aggregator normalizes, maps severity by USD savings, and rolls up.

**Tech Stack:** Backend — Express 5 CommonJS, AWS SDK v3 modular clients (new deps), Supabase. Frontend — Next.js 16, React 19, TypeScript, existing shadcn/ui primitives.

**Reference spec:** [`docs/superpowers/specs/2026-04-20-aws-billing-integration-design.md`](../specs/2026-04-20-aws-billing-integration-design.md)

**Testing note:** Per `CLAUDE.md` this repo has no test runner. Pure-JS modules verify via `node -e` REPL fixtures against mocked AWS SDK responses; integrated flows verify via dev-server + curl; final Phase 5 is end-to-end against a real AWS sandbox Organization (Task 18).

---

## Phase 0 — Dependencies

### Task 1: Install AWS SDK v3 modular clients

**Files:**
- Modify: `backend/package.json` (and `package-lock.json` / lockfile present)

- [ ] **Step 1: Install the six AWS SDK v3 clients used by this integration**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
npm install \
  @aws-sdk/client-sts@^3.658.0 \
  @aws-sdk/client-organizations@^3.658.0 \
  @aws-sdk/client-account@^3.658.0 \
  @aws-sdk/client-ec2@^3.658.0 \
  @aws-sdk/client-cost-explorer@^3.658.0 \
  @aws-sdk/client-compute-optimizer@^3.658.0
```

Why modular clients and not the umbrella `aws-sdk` v2 package: v3's tree-shakable per-service packages keep cold-start small (~5-8 MB installed vs v2's ~60 MB), and v2 enters maintenance mode in 2025. Pin to a known-good minor; exact patch floats via `^`.

- [ ] **Step 2: Verify all six packages load without error**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  require('@aws-sdk/client-sts');
  require('@aws-sdk/client-organizations');
  require('@aws-sdk/client-account');
  require('@aws-sdk/client-ec2');
  require('@aws-sdk/client-cost-explorer');
  require('@aws-sdk/client-compute-optimizer');
  console.log('all aws sdk packages ok');
"
```

Expected:
```
all aws sdk packages ok
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/package.json backend/package-lock.json
git commit -m "$(cat <<'EOF'
feat(aws): add AWS SDK v3 modular clients for cost-leak integration

STS + Organizations + Account + EC2 + Cost Explorer + Compute Optimizer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Pure Backend Modules

### Task 2: AWS auth utility (AssumeRole + credential cache)

**Files:**
- Create: `backend/src/utils/awsAuth.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/utils/awsAuth.js`

```js
/**
 * AWS Auth Utility
 *
 * Calls STS AssumeRole with ExternalId against the customer's management-account
 * role, caches the returned temporary credentials in-process (TTL 55min; AWS
 * returns 1h, we refresh early).
 *
 * The caller (Efficyon backend) must run with AWS_ACCESS_KEY_ID +
 * AWS_SECRET_ACCESS_KEY env vars set to an IAM user in the Efficyon ops AWS
 * account whose account ID matches AWS_EFFICYON_ACCOUNT_ID. That user needs
 * only one permission: sts:AssumeRole on Resource: "*".
 */

const { STSClient, AssumeRoleCommand } = require("@aws-sdk/client-sts")

const REGION = "us-east-1"

const stsClient = new STSClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// In-process cache: Map<integrationId, { credentials, expiresAt }>
const credentialCache = new Map()

const REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry

/**
 * Parse an AWS role ARN into { accountId, roleName }.
 * Throws a typed error if malformed.
 */
function parseRoleArn(roleArn) {
  if (typeof roleArn !== "string" || !roleArn) {
    const err = new Error("Role ARN is missing")
    err.code = "ROLE_ARN_MISSING"
    throw err
  }
  const match = /^arn:aws:iam::(\d{12}):role\/([\w+=,.@-]+)$/.exec(roleArn)
  if (!match) {
    const err = new Error(`Role ARN format invalid: ${roleArn}`)
    err.code = "ROLE_ARN_INVALID"
    throw err
  }
  return { accountId: match[1], roleName: match[2] }
}

/**
 * Assume the integration's role and return temporary credentials.
 * Uses cache when valid; otherwise issues a fresh AssumeRole call.
 *
 * Accepts an integration row (must have settings.role_arn, settings.external_id,
 * and an id). Keeps the function pure — the caller fetches the row.
 *
 * @returns {Promise<{ accessKeyId, secretAccessKey, sessionToken, expiration }>}
 */
async function getAwsCredentials(integration) {
  if (!integration?.id) {
    const err = new Error("integration.id is required")
    err.code = "INTEGRATION_MISSING"
    throw err
  }
  const settings = integration.settings || {}
  if (!settings.role_arn || !settings.external_id) {
    const err = new Error("integration.settings.role_arn and external_id required")
    err.code = "SETTINGS_MISSING"
    throw err
  }

  const cached = credentialCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return cached.credentials
  }

  let resp
  try {
    resp = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: settings.role_arn,
        ExternalId: settings.external_id,
        RoleSessionName: `efficyon-${integration.id}-${Date.now()}`.slice(0, 64),
        DurationSeconds: 3600,
      })
    )
  } catch (e) {
    const err = new Error(`AssumeRole failed: ${e.message}`)
    err.code = "ASSUME_ROLE_FAILED"
    err.awsCode = e.name || e.Code
    err.cause = e
    throw err
  }

  if (!resp.Credentials) {
    const err = new Error("AssumeRole returned no credentials")
    err.code = "ASSUME_ROLE_EMPTY"
    throw err
  }

  const credentials = {
    accessKeyId: resp.Credentials.AccessKeyId,
    secretAccessKey: resp.Credentials.SecretAccessKey,
    sessionToken: resp.Credentials.SessionToken,
    expiration: resp.Credentials.Expiration,
  }
  credentialCache.set(integration.id, {
    credentials,
    expiresAt: new Date(resp.Credentials.Expiration).getTime(),
  })
  return credentials
}

/** Manually evict an integration's cached credentials (e.g., on disconnect). */
function evictCredentials(integrationId) {
  credentialCache.delete(integrationId)
}

module.exports = {
  parseRoleArn,
  getAwsCredentials,
  evictCredentials,
}
```

- [ ] **Step 2: Verify `parseRoleArn` accepts valid ARNs and rejects malformed ones**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { parseRoleArn } = require('./src/utils/awsAuth');
  console.log('valid:', parseRoleArn('arn:aws:iam::123456789012:role/efficyon-cost-analyzer'));
  try { parseRoleArn('not-an-arn'); } catch (e) { console.log('rejected:', e.code); }
  try { parseRoleArn(''); } catch (e) { console.log('rejected empty:', e.code); }
  try { parseRoleArn('arn:aws:iam::12345:role/x'); } catch (e) { console.log('rejected bad account:', e.code); }
"
```

Expected output:
```
valid: { accountId: '123456789012', roleName: 'efficyon-cost-analyzer' }
rejected: ROLE_ARN_INVALID
rejected empty: ROLE_ARN_MISSING
rejected bad account: ROLE_ARN_INVALID
```

- [ ] **Step 3: Verify `getAwsCredentials` signature and input validation**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  (async () => {
    const { getAwsCredentials } = require('./src/utils/awsAuth');
    try { await getAwsCredentials(null); } catch (e) { console.log('null:', e.code); }
    try { await getAwsCredentials({ id: 'x', settings: {} }); } catch (e) { console.log('empty settings:', e.code); }
  })();
"
```

Expected:
```
null: INTEGRATION_MISSING
empty settings: SETTINGS_MISSING
```

(A real AssumeRole is not exercised here — that happens in Phase 5.)

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/utils/awsAuth.js
git commit -m "$(cat <<'EOF'
feat(aws): add STS AssumeRole utility with credential caching

In-process cache keyed by integration id, 55-minute effective TTL, typed
error codes for missing inputs and AssumeRole failures.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Cost Explorer analysis service

**Files:**
- Create: `backend/src/services/awsCostExplorerAnalysis.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/services/awsCostExplorerAnalysis.js`

```js
/**
 * AWS Cost Explorer analysis service.
 *
 * Pulls three recommendation feeds from the global Cost Explorer endpoint
 * (us-east-1 only; CE is effectively global):
 *   - GetRightsizingRecommendation (Service=AmazonEC2)
 *   - GetSavingsPlansPurchaseRecommendation (COMPUTE_SP, 1-year, no-upfront)
 *   - GetReservationPurchaseRecommendation (AmazonEC2, 1-year, no-upfront)
 *
 * Returns raw normalized findings (un-severitied) — the aggregator assigns
 * severity and rolls up.
 */

const {
  CostExplorerClient,
  GetRightsizingRecommendationCommand,
  GetSavingsPlansPurchaseRecommendationCommand,
  GetReservationPurchaseRecommendationCommand,
} = require("@aws-sdk/client-cost-explorer")

const CE_REGION = "us-east-1"
const PAGE_CAP = 200 // stop after 200 recs per feed to bound CE per-request cost

function buildClient(credentials) {
  return new CostExplorerClient({
    region: CE_REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

async function paginate(client, commandCtor, baseParams, extract) {
  const out = []
  let next = undefined
  for (let i = 0; i < 20; i++) {
    const params = next ? { ...baseParams, NextPageToken: next } : baseParams
    const resp = await client.send(new commandCtor(params))
    const items = extract(resp) || []
    out.push(...items)
    if (out.length >= PAGE_CAP) return out.slice(0, PAGE_CAP)
    next = resp.NextPageToken
    if (!next) break
  }
  return out
}

async function getRightsizingFindings(client) {
  const raw = await paginate(
    client,
    GetRightsizingRecommendationCommand,
    {
      Service: "AmazonEC2",
      Configuration: { RecommendationTarget: "SAME_INSTANCE_FAMILY" },
      PageSize: 100,
    },
    (r) => r.RightsizingRecommendations
  )
  return raw.map((rec) => {
    const opt = rec.ModifyRecommendationDetail?.TargetInstances?.[0] || {}
    const savings = Number(opt.EstimatedMonthlySavings || 0)
    return {
      id: `ce-rightsize-${rec.AccountId || "unknown"}-${rec.CurrentInstance?.ResourceId || rec.CurrentInstance?.InstanceName || "?"}`,
      source: "cost_explorer",
      category: "rightsizing",
      title: "EC2 right-sizing opportunity",
      resource: {
        type: "ec2-instance",
        id: rec.CurrentInstance?.ResourceId || null,
        accountId: rec.AccountId || null,
        region: rec.CurrentInstance?.Region || null,
      },
      currentCost: Number(rec.CurrentInstance?.MonthlyCost || 0),
      projectedSavings: savings,
      currency: "USD",
      recommendation:
        opt.ResourceDetails?.EC2ResourceDetails
          ? `Switch to ${opt.ResourceDetails.EC2ResourceDetails.InstanceType} (same family, better fit)`
          : "See Cost Explorer for right-sizing detail",
      actionSteps: [
        "Review the target instance in AWS Cost Explorer console",
        "Schedule a maintenance window",
        "Stop → modify instance type → start",
      ],
      raw: rec,
    }
  })
}

async function getSavingsPlansFindings(client) {
  const raw = await paginate(
    client,
    GetSavingsPlansPurchaseRecommendationCommand,
    {
      SavingsPlansType: "COMPUTE_SP",
      TermInYears: "ONE_YEAR",
      PaymentOption: "NO_UPFRONT",
      LookbackPeriodInDays: "SIXTY_DAYS",
      PageSize: 100,
    },
    (r) => r.SavingsPlansPurchaseRecommendation?.SavingsPlansPurchaseRecommendationDetails
  )
  return raw.map((rec, idx) => {
    const savings = Number(rec.EstimatedMonthlySavingsAmount || 0)
    return {
      id: `ce-sp-${rec.AccountId || "org"}-${idx}`,
      source: "cost_explorer",
      category: "savings_plan_purchase",
      title: "Compute Savings Plan opportunity",
      resource: {
        type: "savings-plan",
        id: null,
        accountId: rec.AccountId || null,
        region: null,
      },
      currentCost: Number(rec.CurrentAverageHourlyOnDemandSpend || 0) * 730,
      projectedSavings: savings,
      currency: "USD",
      recommendation: `Commit to $${Number(rec.HourlyCommitmentToPurchase || 0).toFixed(2)}/hr Compute Savings Plan (1-yr, no upfront)`,
      actionSteps: [
        "Open AWS Cost Management → Savings Plans → Purchase Savings Plans",
        "Select Compute SP, 1-year, No upfront",
        "Enter the recommended hourly commitment",
      ],
      raw: rec,
    }
  })
}

async function getReservationFindings(client) {
  const raw = await paginate(
    client,
    GetReservationPurchaseRecommendationCommand,
    {
      Service: "AmazonEC2",
      TermInYears: "ONE_YEAR",
      PaymentOption: "NO_UPFRONT",
      LookbackPeriodInDays: "SIXTY_DAYS",
      PageSize: 100,
    },
    (r) => r.Recommendations?.flatMap((rg) => rg.RecommendationDetails || [])
  )
  return raw.map((rec, idx) => {
    const savings = Number(rec.EstimatedMonthlySavingsAmount || 0)
    return {
      id: `ce-ri-${rec.AccountId || "org"}-${idx}`,
      source: "cost_explorer",
      category: "reserved_instance_purchase",
      title: "EC2 Reserved Instance opportunity",
      resource: {
        type: "reserved-instance",
        id: null,
        accountId: rec.AccountId || null,
        region: null,
      },
      currentCost: Number(rec.EstimatedMonthlyOnDemandCost || 0),
      projectedSavings: savings,
      currency: "USD",
      recommendation: `Purchase ${rec.RecommendedNumberOfInstancesToPurchase || "?"} reserved ${rec.InstanceDetails?.EC2InstanceDetails?.InstanceType || "EC2"} (1-yr, no upfront)`,
      actionSteps: [
        "Open EC2 console → Reserved Instances → Purchase",
        "Match the recommended instance type, term, and payment option",
      ],
      raw: rec,
    }
  })
}

/**
 * Run all three Cost Explorer recommendation feeds.
 * Sequential (shared CE rate bucket); each failure is caught and logged but
 * does not break the other two.
 */
async function runCostExplorerAnalysis(credentials) {
  const client = buildClient(credentials)
  const results = { findings: [], errors: [] }
  for (const [name, fn] of [
    ["rightsizing", getRightsizingFindings],
    ["savings_plans", getSavingsPlansFindings],
    ["reservations", getReservationFindings],
  ]) {
    try {
      const items = await fn(client)
      results.findings.push(...items)
    } catch (e) {
      results.errors.push({ feed: name, message: e.message, code: e.name || e.Code })
    }
  }
  return results
}

module.exports = {
  runCostExplorerAnalysis,
  // exported for fixture-testing
  getRightsizingFindings,
  getSavingsPlansFindings,
  getReservationFindings,
  buildClient,
}
```

- [ ] **Step 2: Fixture-verify the rightsizing normalizer against a stub CE response**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { getRightsizingFindings } = require('./src/services/awsCostExplorerAnalysis');
  const fakeClient = {
    send: async () => ({
      RightsizingRecommendations: [
        {
          AccountId: '111111111111',
          CurrentInstance: { ResourceId: 'i-abc', Region: 'us-east-1', MonthlyCost: '312.50' },
          ModifyRecommendationDetail: {
            TargetInstances: [{
              EstimatedMonthlySavings: '187.20',
              ResourceDetails: { EC2ResourceDetails: { InstanceType: 'm5.large' } },
            }],
          },
        },
      ],
      NextPageToken: undefined,
    }),
  };
  (async () => {
    const out = await getRightsizingFindings(fakeClient);
    console.log(JSON.stringify(out[0], null, 2));
  })();
"
```

Expected: one finding object with `source: 'cost_explorer'`, `category: 'rightsizing'`, `projectedSavings: 187.2`, `currency: 'USD'`, `resource.id: 'i-abc'`. No errors.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/awsCostExplorerAnalysis.js
git commit -m "$(cat <<'EOF'
feat(aws): add Cost Explorer analysis service

Normalizes rightsizing, SP purchase, and RI purchase recommendations into
the shared cost-leak finding shape. Caps at 200 findings per feed to bound
CE per-request cost.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Compute Optimizer analysis service

**Files:**
- Create: `backend/src/services/awsComputeOptimizerAnalysis.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/services/awsComputeOptimizerAnalysis.js`

```js
/**
 * AWS Compute Optimizer analysis service.
 *
 * Fans out across active regions. Within each region, six recommendation APIs
 * are called in parallel. Every call uses includeMemberAccounts: true so that
 * a management-account role returns org-wide recommendations.
 *
 * Per-region timeout: 30s. Partial failures (one region or API erroring) do
 * NOT fail the run — they're collected in `errors` and surfaced in the summary.
 */

const {
  ComputeOptimizerClient,
  GetEC2InstanceRecommendationsCommand,
  GetEBSVolumeRecommendationsCommand,
  GetLambdaFunctionRecommendationsCommand,
  GetAutoScalingGroupRecommendationsCommand,
  GetECSServiceRecommendationsCommand,
  GetRDSDBInstanceRecommendationsCommand,
  GetIdleRecommendationsCommand,
} = require("@aws-sdk/client-compute-optimizer")

const PER_CALL_CAP = 500
const PER_REGION_TIMEOUT_MS = 30_000

function buildClient(credentials, region) {
  return new ComputeOptimizerClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

async function paginate(client, commandCtor, baseParams, extract) {
  const out = []
  let next = undefined
  for (let i = 0; i < 10; i++) {
    const params = next ? { ...baseParams, nextToken: next } : baseParams
    const resp = await client.send(new commandCtor(params))
    const items = extract(resp) || []
    out.push(...items)
    if (out.length >= PER_CALL_CAP) return out.slice(0, PER_CALL_CAP)
    next = resp.nextToken
    if (!next) break
  }
  return out
}

// Estimated savings in CO responses sit on the "recommendation option" picked;
// we take the first/best option.
function estimatedSavings(rec) {
  const opt = rec?.recommendationOptions?.[0]
  if (!opt) return { savings: 0, currentCost: 0 }
  const sv = opt.estimatedMonthlySavings
  const savings = sv?.value ? Number(sv.value) : 0
  // currentCost isn't always in the response; fall back to 0.
  return { savings, currentCost: 0 }
}

function baseFinding(rec, kind, region) {
  const { savings, currentCost } = estimatedSavings(rec)
  return {
    source: "compute_optimizer",
    severity: null, // aggregator assigns
    category: kind,
    currency: "USD",
    currentCost,
    projectedSavings: savings,
    region,
    raw: rec,
  }
}

// ---- per-resource-type normalizers ------------------------------------------

function normalizeEC2(rec, region) {
  const opt = rec?.recommendationOptions?.[0]
  return {
    ...baseFinding(rec, "rightsizing", region),
    id: `co-ec2-${rec.accountId}-${rec.instanceArn}`,
    title: "Over/under-provisioned EC2 instance",
    resource: { type: "ec2-instance", id: rec.instanceArn, accountId: rec.accountId, region },
    recommendation: opt?.instanceType
      ? `Change to ${opt.instanceType} (finding: ${rec.finding || "optimizable"})`
      : "See Compute Optimizer console for detail",
    actionSteps: [
      "Verify in Compute Optimizer console",
      "Schedule maintenance window",
      "Stop → modify instance type → start",
    ],
  }
}

function normalizeEBS(rec, region) {
  const opt = rec?.volumeRecommendationOptions?.[0]
  return {
    ...baseFinding({ ...rec, recommendationOptions: rec.volumeRecommendationOptions }, "rightsizing", region),
    id: `co-ebs-${rec.accountId}-${rec.volumeArn}`,
    title: "Over-provisioned EBS volume",
    resource: { type: "ebs-volume", id: rec.volumeArn, accountId: rec.accountId, region },
    recommendation: opt?.configuration
      ? `Change to ${opt.configuration.volumeType} ${opt.configuration.volumeSize}GB (iops ${opt.configuration.volumeBaselineIOPS || "-"})`
      : "See Compute Optimizer console for detail",
    actionSteps: ["Open EC2 console → Volumes", "Apply the recommended type/size"],
  }
}

function normalizeLambda(rec, region) {
  const opt = rec?.memorySizeRecommendationOptions?.[0]
  return {
    ...baseFinding({ ...rec, recommendationOptions: rec.memorySizeRecommendationOptions }, "rightsizing", region),
    id: `co-lambda-${rec.accountId}-${rec.functionArn}`,
    title: "Under/over-provisioned Lambda function",
    resource: { type: "lambda-function", id: rec.functionArn, accountId: rec.accountId, region },
    recommendation: opt?.memorySize ? `Change memory to ${opt.memorySize} MB` : "See Compute Optimizer console for detail",
    actionSteps: ["Open Lambda console → function → Configuration → General", "Set recommended memory"],
  }
}

function normalizeASG(rec, region) {
  const opt = rec?.recommendationOptions?.[0]
  return {
    ...baseFinding(rec, "rightsizing", region),
    id: `co-asg-${rec.accountId}-${rec.autoScalingGroupArn}`,
    title: "Over/under-provisioned Auto Scaling Group",
    resource: { type: "auto-scaling-group", id: rec.autoScalingGroupArn, accountId: rec.accountId, region },
    recommendation: opt?.configuration?.instanceType
      ? `Change launch template instance type to ${opt.configuration.instanceType}`
      : "See Compute Optimizer console for detail",
    actionSteps: ["Update the Auto Scaling Group's launch template to the recommended instance type"],
  }
}

function normalizeECS(rec, region) {
  const opt = rec?.serviceRecommendationOptions?.[0]
  return {
    ...baseFinding({ ...rec, recommendationOptions: rec.serviceRecommendationOptions }, "rightsizing", region),
    id: `co-ecs-${rec.accountId}-${rec.serviceArn}`,
    title: "Over/under-provisioned ECS service",
    resource: { type: "ecs-service", id: rec.serviceArn, accountId: rec.accountId, region },
    recommendation: opt?.cpu && opt?.memory ? `Change task to ${opt.cpu} CPU / ${opt.memory} MB` : "See Compute Optimizer console for detail",
    actionSteps: ["Update the ECS task definition to the recommended CPU/memory"],
  }
}

function normalizeRDS(rec, region) {
  const opt = rec?.instanceRecommendationOptions?.[0]
  return {
    ...baseFinding({ ...rec, recommendationOptions: rec.instanceRecommendationOptions }, "rightsizing", region),
    id: `co-rds-${rec.accountId}-${rec.instanceArn}`,
    title: "Over/under-provisioned RDS instance",
    resource: { type: "rds-instance", id: rec.instanceArn, accountId: rec.accountId, region },
    recommendation: opt?.dbInstanceClass ? `Change instance class to ${opt.dbInstanceClass}` : "See Compute Optimizer console for detail",
    actionSteps: ["Open RDS console → modify instance → apply during maintenance window"],
  }
}

function normalizeIdle(rec, region) {
  const savings = Number(rec.savingsOpportunity?.estimatedMonthlySavings?.value || 0)
  return {
    source: "compute_optimizer",
    severity: null,
    category: "idle",
    currency: "USD",
    currentCost: 0,
    projectedSavings: savings,
    region,
    id: `co-idle-${rec.accountId}-${rec.resourceArn}`,
    title: `Idle ${rec.resourceType || "resource"}`,
    resource: { type: `idle-${(rec.resourceType || "resource").toLowerCase()}`, id: rec.resourceArn, accountId: rec.accountId, region },
    recommendation: rec.finding === "Idle" ? "Terminate or stop — no meaningful activity detected" : "See Compute Optimizer console for detail",
    actionSteps: ["Confirm the resource is truly idle", "Stop or terminate if safe"],
    raw: rec,
  }
}

// ---- per-region runner ------------------------------------------------------

async function runRegion(credentials, region) {
  const client = buildClient(credentials, region)
  const base = { includeMemberAccounts: true, maxResults: 100 }
  const tasks = [
    ["ec2",    GetEC2InstanceRecommendationsCommand,        base, (r) => r.instanceRecommendations,        normalizeEC2],
    ["ebs",    GetEBSVolumeRecommendationsCommand,          base, (r) => r.volumeRecommendations,           normalizeEBS],
    ["lambda", GetLambdaFunctionRecommendationsCommand,     base, (r) => r.lambdaFunctionRecommendations,   normalizeLambda],
    ["asg",    GetAutoScalingGroupRecommendationsCommand,   base, (r) => r.autoScalingGroupRecommendations, normalizeASG],
    ["ecs",    GetECSServiceRecommendationsCommand,         base, (r) => r.ecsServiceRecommendations,       normalizeECS],
    ["rds",    GetRDSDBInstanceRecommendationsCommand,      base, (r) => r.rdsDBInstanceRecommendations,    normalizeRDS],
    ["idle",   GetIdleRecommendationsCommand,               base, (r) => r.idleRecommendations,             normalizeIdle],
  ]
  const findings = []
  const errors = []
  await Promise.all(
    tasks.map(async ([name, ctor, params, extract, normalize]) => {
      try {
        const items = await paginate(client, ctor, params, extract)
        items.forEach((i) => findings.push(normalize(i, region)))
      } catch (e) {
        errors.push({ region, api: name, message: e.message, code: e.name || e.Code })
      }
    })
  )
  return { region, findings, errors }
}

function withTimeout(promise, ms, region) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Compute Optimizer region ${region} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

async function runComputeOptimizerAnalysis(credentials, settings) {
  const regions = Array.isArray(settings?.active_regions) && settings.active_regions.length > 0
    ? settings.active_regions
    : ["us-east-1"]
  const findings = []
  const errors = []
  const regionResults = await Promise.all(
    regions.map((region) =>
      withTimeout(runRegion(credentials, region), PER_REGION_TIMEOUT_MS, region).catch((e) => ({
        region,
        findings: [],
        errors: [{ region, api: "all", message: e.message, code: "REGION_TIMEOUT_OR_ERROR" }],
      }))
    )
  )
  for (const r of regionResults) {
    findings.push(...r.findings)
    errors.push(...r.errors)
  }
  return { findings, errors }
}

module.exports = {
  runComputeOptimizerAnalysis,
  // exported for fixture-testing
  runRegion,
  normalizeEC2,
  normalizeEBS,
  normalizeLambda,
  normalizeIdle,
  buildClient,
}
```

- [ ] **Step 2: Fixture-verify the EC2 normalizer**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { normalizeEC2 } = require('./src/services/awsComputeOptimizerAnalysis');
  const rec = {
    accountId: '222222222222',
    instanceArn: 'arn:aws:ec2:us-east-1:222222222222:instance/i-0abc',
    finding: 'Overprovisioned',
    recommendationOptions: [{
      instanceType: 'm5.large',
      estimatedMonthlySavings: { value: 187.20, currency: 'USD' },
    }],
  };
  console.log(JSON.stringify(normalizeEC2(rec, 'us-east-1'), null, 2));
"
```

Expected: output with `source: 'compute_optimizer'`, `category: 'rightsizing'`, `projectedSavings: 187.2`, `resource.id` equal to the instance ARN, `recommendation` containing 'm5.large'.

- [ ] **Step 3: Fixture-verify the idle normalizer**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { normalizeIdle } = require('./src/services/awsComputeOptimizerAnalysis');
  const rec = {
    accountId: '333333333333',
    resourceArn: 'arn:aws:ec2:us-west-2:333333333333:instance/i-idle',
    resourceType: 'EC2Instance',
    finding: 'Idle',
    savingsOpportunity: { estimatedMonthlySavings: { value: 42.00, currency: 'USD' } },
  };
  console.log(JSON.stringify(normalizeIdle(rec, 'us-west-2'), null, 2));
"
```

Expected: `category: 'idle'`, `projectedSavings: 42`, `resource.type: 'idle-ec2instance'`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/awsComputeOptimizerAnalysis.js
git commit -m "$(cat <<'EOF'
feat(aws): add Compute Optimizer analysis service

Fans out across active regions; calls seven CO APIs per region in
parallel (EC2, EBS, Lambda, ASG, ECS, RDS, idle). includeMemberAccounts
is set so management-account credentials cover the whole Organization.
Partial failures per region/API are collected, not thrown.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: AWS cost-leak aggregator

**Files:**
- Create: `backend/src/services/awsCostLeakAnalysis.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/services/awsCostLeakAnalysis.js`

```js
/**
 * AWS Cost-Leak Analysis aggregator.
 *
 * Calls Cost Explorer + Compute Optimizer in parallel, assigns severity by
 * projected USD savings, sorts, and rolls up a summary shaped for the shared
 * cost_leak_analyses table.
 */

const { runCostExplorerAnalysis } = require("./awsCostExplorerAnalysis")
const { runComputeOptimizerAnalysis } = require("./awsComputeOptimizerAnalysis")

function assignSeverity(savings) {
  if (savings >= 500) return "critical"
  if (savings >= 100) return "high"
  if (savings >= 25) return "medium"
  if (savings > 0) return "low"
  return null // dropped
}

function countBy(arr, key) {
  const out = {}
  for (const item of arr) {
    const k = item[key]
    if (!k) continue
    out[k] = (out[k] || 0) + 1
  }
  return out
}

function uniq(arr) {
  return Array.from(new Set(arr.filter((x) => x != null)))
}

/**
 * Run a full AWS cost-leak analysis.
 *
 * @param {{ accessKeyId, secretAccessKey, sessionToken }} credentials
 * @param {object} settings — integration.settings (must have active_regions)
 * @returns {Promise<{ summary, findings }>}
 */
async function analyzeAwsCostLeaks(credentials, settings) {
  const [ceResult, coResult] = await Promise.all([
    runCostExplorerAnalysis(credentials),
    runComputeOptimizerAnalysis(credentials, settings),
  ])

  const raw = [...ceResult.findings, ...coResult.findings]

  const findings = []
  for (const f of raw) {
    const severity = assignSeverity(Number(f.projectedSavings || 0))
    if (!severity) continue // drop zero-savings findings
    findings.push({ ...f, severity })
  }

  findings.sort((a, b) => Number(b.projectedSavings || 0) - Number(a.projectedSavings || 0))

  const totalPotentialSavings = findings.reduce((s, f) => s + Number(f.projectedSavings || 0), 0)

  const partialRegionFailures = (coResult.errors || [])
    .filter((e) => e.api === "all")
    .map((e) => e.region)

  const sourceErrors = [
    ...(ceResult.errors || []).map((e) => ({ source: "cost_explorer", ...e })),
    ...(coResult.errors || []).map((e) => ({ source: "compute_optimizer", ...e })),
  ]

  const summary = {
    totalPotentialSavings: Number(totalPotentialSavings.toFixed(2)),
    currency: "USD",
    totalFindings: findings.length,
    findingsBySeverity: countBy(findings, "severity"),
    findingsBySource: countBy(findings, "source"),
    analyzedAccounts: uniq(findings.map((f) => f.resource?.accountId)).length,
    analyzedRegions: (settings?.active_regions || []).length,
    partialRegionFailures: uniq(partialRegionFailures),
    sourceErrors,
  }

  return { summary, findings }
}

module.exports = {
  analyzeAwsCostLeaks,
  assignSeverity, // exported for fixture-testing
}
```

- [ ] **Step 2: Fixture-verify severity assignment**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { assignSeverity } = require('./src/services/awsCostLeakAnalysis');
  console.log('500 ->', assignSeverity(500));
  console.log('499 ->', assignSeverity(499));
  console.log('100 ->', assignSeverity(100));
  console.log('99 ->', assignSeverity(99));
  console.log('25 ->', assignSeverity(25));
  console.log('24 ->', assignSeverity(24));
  console.log('0.01 ->', assignSeverity(0.01));
  console.log('0 ->', assignSeverity(0));
  console.log('-1 ->', assignSeverity(-1));
"
```

Expected:
```
500 -> critical
499 -> high
100 -> high
99 -> medium
25 -> medium
24 -> low
0.01 -> low
0 -> null
-1 -> null
```

- [ ] **Step 3: Fixture-verify aggregate shape with stubbed source services**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  // Stub the source services by replacing them in the module cache
  const path = require('path');
  const cePath = path.resolve('./src/services/awsCostExplorerAnalysis.js');
  const coPath = path.resolve('./src/services/awsComputeOptimizerAnalysis.js');
  require.cache[cePath] = { exports: { runCostExplorerAnalysis: async () => ({
    findings: [{ id: 'ce-1', source: 'cost_explorer', category: 'rightsizing', projectedSavings: 600, currency: 'USD', resource: { accountId: 'A' } }],
    errors: [],
  })}};
  require.cache[coPath] = { exports: { runComputeOptimizerAnalysis: async () => ({
    findings: [
      { id: 'co-1', source: 'compute_optimizer', category: 'idle', projectedSavings: 50, currency: 'USD', resource: { accountId: 'A' } },
      { id: 'co-2', source: 'compute_optimizer', category: 'rightsizing', projectedSavings: 0, currency: 'USD', resource: { accountId: 'B' } },
    ],
    errors: [{ region: 'eu-west-1', api: 'all', message: 'timeout' }],
  })}};
  const { analyzeAwsCostLeaks } = require('./src/services/awsCostLeakAnalysis');
  (async () => {
    const out = await analyzeAwsCostLeaks({}, { active_regions: ['us-east-1', 'eu-west-1'] });
    console.log(JSON.stringify(out.summary, null, 2));
    console.log('first finding severity:', out.findings[0].severity);
    console.log('zero-savings dropped:', out.findings.find(f => f.id === 'co-2') === undefined);
  })();
"
```

Expected summary contains `totalPotentialSavings: 650`, `totalFindings: 2`, `findingsBySeverity: { critical: 1, medium: 1 }`, `findingsBySource: { cost_explorer: 1, compute_optimizer: 1 }`, `analyzedAccounts: 1`, `analyzedRegions: 2`, `partialRegionFailures: ['eu-west-1']`. `first finding severity: critical` and `zero-savings dropped: true`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/awsCostLeakAnalysis.js
git commit -m "$(cat <<'EOF'
feat(aws): add cost-leak aggregator

Calls Cost Explorer + Compute Optimizer in parallel, assigns severity by
USD savings (critical/high/medium/low at 500/100/25/0), drops zero-savings
findings, rolls up totals and counts, surfaces partial region failures.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: CloudFormation template

**Files:**
- Create: `backend/src/templates/aws-efficyon-role.yaml`

- [ ] **Step 1: Create the template**

Path: `backend/src/templates/aws-efficyon-role.yaml`

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: >
  Efficyon cross-account cost-analysis role. Grants read-only access to AWS
  Cost Explorer and Compute Optimizer recommendations, plus org metadata.
  Trusts the Efficyon backend AWS account; requires an external ID for
  confused-deputy protection.

Parameters:
  ExternalId:
    Type: String
    Description: Security token provided by Efficyon during connect. Do not edit.
    MinLength: 16
    MaxLength: 64
    AllowedPattern: "^[A-Za-z0-9_-]+$"

Resources:
  EfficyonCostAnalyzerRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: efficyon-cost-analyzer
      Description: "Read-only role used by Efficyon to pull cost-optimization recommendations"
      MaxSessionDuration: 3600
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              AWS: "arn:aws:iam::${EFFICYON_AWS_ACCOUNT_ID}:root"
            Action: "sts:AssumeRole"
            Condition:
              StringEquals:
                "sts:ExternalId": !Ref ExternalId
      Policies:
        - PolicyName: EfficyonCostReadOnly
          PolicyDocument:
            Version: "2012-10-17"
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

Outputs:
  RoleArn:
    Description: Paste this back into Efficyon to finish connecting.
    Value: !GetAtt EfficyonCostAnalyzerRole.Arn
```

Note: the literal string `${EFFICYON_AWS_ACCOUNT_ID}` in the Principal line is intentional — it's a placeholder that the backend interpolates at serve time (not a CloudFormation `!Sub`). When Task 12 adds `serveCloudFormationTemplate`, it replaces this token with the real account ID from `process.env.AWS_EFFICYON_ACCOUNT_ID`.

- [ ] **Step 2: Sanity-check YAML parses**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const fs = require('fs');
  const yaml = fs.readFileSync('src/templates/aws-efficyon-role.yaml', 'utf-8');
  // Crude check: contains the placeholder and key sections
  for (const needle of ['\${EFFICYON_AWS_ACCOUNT_ID}', 'EfficyonCostAnalyzerRole', 'sts:ExternalId', 'ce:GetRightsizingRecommendation', 'compute-optimizer:GetIdleRecommendations']) {
    if (!yaml.includes(needle)) { console.error('MISSING:', needle); process.exit(1); }
  }
  console.log('template ok (' + yaml.length + ' bytes)');
"
```

Expected:
```
template ok (<some byte count>)
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/templates/aws-efficyon-role.yaml
git commit -m "$(cat <<'EOF'
feat(aws): add CloudFormation role template

Read-only IAM role with trust policy requiring an external ID. The
\${EFFICYON_AWS_ACCOUNT_ID} token is interpolated by the backend at serve
time so the template file stays reviewable with no hard-coded account IDs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Database

### Task 7: Migration for `AWS` provider

**Files:**
- Create: `backend/sql/044_aws_provider.sql`

- [ ] **Step 1: Create migration**

Path: `backend/sql/044_aws_provider.sql`

```sql
-- Allow AWS as a provider for persisted cost-leak analyses.
-- Findings come from AWS Cost Explorer (rightsizing, SP/RI purchase recs)
-- and AWS Compute Optimizer (EC2 / EBS / Lambda / RDS / idle).

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

- [ ] **Step 2: DB apply deferred to user**

This file is committed; the user applies it to Supabase separately via the Supabase MCP (same handoff model as migration 043). Do NOT attempt to apply it from an implementation subagent.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/sql/044_aws_provider.sql
git commit -m "$(cat <<'EOF'
feat(aws): allow 'AWS' provider in cost_leak_analyses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Backend Controller + Routes

### Task 8: Controller scaffolding

**Files:**
- Create: `backend/src/controllers/awsController.js`

- [ ] **Step 1: Create file with scaffolding**

Path: `backend/src/controllers/awsController.js`

```js
/**
 * AWS Controller
 *
 * Handles validate / status / accounts / regions / analyze / disconnect
 * for the AWS cost-leak integration. Auth is cross-account IAM role
 * (AssumeRole + external ID) — no OAuth.
 */

const { supabase } = require("../config/supabase")
const { getAwsCredentials, evictCredentials, parseRoleArn } = require("../utils/awsAuth")
const { analyzeAwsCostLeaks } = require("../services/awsCostLeakAnalysis")
const { saveAnalysis } = require("./analysisHistoryController")

const {
  OrganizationsClient,
  DescribeOrganizationCommand,
  ListAccountsCommand,
} = require("@aws-sdk/client-organizations")
const { AccountClient, ListRegionsCommand } = require("@aws-sdk/client-account")

const AWS_PROVIDER = "AWS"

function log(level, endpoint, message, data = null) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }
  const { data: integration, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", AWS_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "AWS integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function buildAwsClient(ClientCtor, credentials, region = "us-east-1") {
  return new ClientCtor({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

// Map an AWS SDK error to an HTTP status + user-facing hint.
function mapAwsError(e) {
  const name = e?.awsCode || e?.name || e?.Code || ""
  if (name === "AccessDenied" || name === "AccessDeniedException") {
    return { status: 403, message: e.message, hint: "Re-launch the CloudFormation template — the role is missing permissions, or the external ID on the trust policy doesn't match." }
  }
  if (name === "OptInRequiredException") {
    return { status: 409, message: "AWS Compute Optimizer isn't opted in for this account.", hint: "Open the Compute Optimizer console in the management account and click Get started." }
  }
  if (name === "AWSOrganizationsNotInUseException") {
    return { status: 400, message: "This AWS account isn't part of an Organization.", hint: "Efficyon currently requires a management-account role in an AWS Organization." }
  }
  if (name === "ThrottlingException" || name === "Throttling") {
    return { status: 503, message: "AWS throttled the request.", hint: "Please retry in a minute." }
  }
  return { status: 500, message: e.message || "Unexpected AWS error", hint: null }
}

// Handler stubs — filled in by subsequent tasks.
async function validateAws(req, res)    { res.status(501).json({ error: "validateAws not implemented" }) }
async function getAwsStatus(req, res)   { res.status(501).json({ error: "getAwsStatus not implemented" }) }
async function getAwsAccounts(req, res) { res.status(501).json({ error: "getAwsAccounts not implemented" }) }
async function getAwsRegions(req, res)  { res.status(501).json({ error: "getAwsRegions not implemented" }) }
async function refreshAwsRegions(req, res) { res.status(501).json({ error: "refreshAwsRegions not implemented" }) }
async function analyzeAwsCostLeaksHandler(req, res) { res.status(501).json({ error: "analyze not implemented" }) }
async function disconnectAws(req, res)  { res.status(501).json({ error: "disconnectAws not implemented" }) }
async function serveCloudFormationTemplate(req, res) { res.status(501).json({ error: "serveCloudFormationTemplate not implemented" }) }

module.exports = {
  validateAws,
  getAwsStatus,
  getAwsAccounts,
  getAwsRegions,
  refreshAwsRegions,
  analyzeAwsCostLeaks: analyzeAwsCostLeaksHandler,
  disconnectAws,
  serveCloudFormationTemplate,
  // exported for Tasks 9-12 (they replace these with real implementations):
  getIntegrationForUser,
  buildAwsClient,
  mapAwsError,
  log,
}
```

- [ ] **Step 2: Verify file loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const c = require('./src/controllers/awsController');
  for (const name of ['validateAws','getAwsStatus','getAwsAccounts','getAwsRegions','refreshAwsRegions','analyzeAwsCostLeaks','disconnectAws','serveCloudFormationTemplate']) {
    if (typeof c[name] !== 'function') { console.error('missing', name); process.exit(1); }
  }
  console.log('awsController ok');
"
```

Expected: `awsController ok`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/awsController.js
git commit -m "$(cat <<'EOF'
feat(aws): add controller scaffolding

Shared helpers (integration lookup, AWS client factory, error mapping)
plus 501 stubs for all handlers. Subsequent tasks replace the stubs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `validateAws` + `getAwsStatus` handlers

**Files:**
- Modify: `backend/src/controllers/awsController.js`

- [ ] **Step 1: Replace the `validateAws` stub with the real implementation**

Find the existing stub line:

```js
async function validateAws(req, res)    { res.status(501).json({ error: "validateAws not implemented" }) }
```

Replace it with:

```js
async function validateAws(req, res) {
  const endpoint = "POST /api/integrations/aws/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  // 1) AssumeRole
  let credentials
  try {
    credentials = await getAwsCredentials(integration)
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "AssumeRole failed", { code: e.code, awsCode: e.awsCode, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // 2) DescribeOrganization — must succeed for management-account scope
  let org
  try {
    const orgClient = buildAwsClient(OrganizationsClient, credentials)
    const resp = await orgClient.send(new DescribeOrganizationCommand({}))
    org = resp.Organization
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "DescribeOrganization failed", { awsCode: e.name, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  const masterAccountId = org?.MasterAccountId
  const organizationId = org?.Id
  const { accountId } = parseRoleArn(integration.settings.role_arn)
  if (!masterAccountId || accountId !== masterAccountId) {
    return res.status(400).json({
      error: "The connected account isn't the Organization management account.",
      hint: `Connect the payer account (${masterAccountId || "unknown"}) instead.`,
    })
  }

  // 3) Fetch active regions
  let activeRegions = []
  try {
    const accountClient = buildAwsClient(AccountClient, credentials)
    let next = undefined
    for (let i = 0; i < 5; i++) {
      const resp = await accountClient.send(new ListRegionsCommand({
        MaxResults: 50,
        RegionOptStatusContains: ["ENABLED", "ENABLED_BY_DEFAULT"],
        NextToken: next,
      }))
      for (const r of resp.Regions || []) if (r.RegionName) activeRegions.push(r.RegionName)
      next = resp.NextToken
      if (!next) break
    }
  } catch (e) {
    // account:ListRegions occasionally errors in older orgs; fall back to a static list.
    log("warn", endpoint, "ListRegions failed, using fallback", { awsCode: e.name, message: e.message })
    activeRegions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1"]
  }

  const nowIso = new Date().toISOString()
  const newSettings = {
    ...integration.settings,
    aws_account_id: accountId,
    organization_id: organizationId,
    master_account_id: masterAccountId,
    active_regions: activeRegions,
    regions_refreshed_at: nowIso,
    last_validated_at: nowIso,
  }

  const { error: updateErr } = await supabase
    .from("company_integrations")
    .update({ settings: newSettings, status: "connected", updated_at: nowIso })
    .eq("id", integration.id)
  if (updateErr) {
    log("error", endpoint, "update integration failed", updateErr)
    return res.status(500).json({ error: "Failed to persist validated state" })
  }

  log("log", endpoint, `validated integration ${integration.id}`, {
    organizationId, accountCount: null, activeRegions: activeRegions.length,
  })
  return res.json({
    status: "connected",
    organizationId,
    masterAccountId,
    activeRegions,
    lastValidatedAt: nowIso,
  })
}
```

- [ ] **Step 2: Replace the `getAwsStatus` stub**

Find:

```js
async function getAwsStatus(req, res)   { res.status(501).json({ error: "getAwsStatus not implemented" }) }
```

Replace with:

```js
async function getAwsStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    awsAccountId: s.aws_account_id || null,
    organizationId: s.organization_id || null,
    masterAccountId: s.master_account_id || null,
    activeRegions: s.active_regions || [],
    regionsRefreshedAt: s.regions_refreshed_at || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}
```

- [ ] **Step 3: Verify controller still loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/awsController'); console.log('ok');"
```

Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/awsController.js
git commit -m "$(cat <<'EOF'
feat(aws): implement validateAws and getAwsStatus

validateAws performs AssumeRole → DescribeOrganization (must be
management account) → ListRegions (with fallback). Persists
aws_account_id, organization_id, master_account_id, active_regions,
regions_refreshed_at, and last_validated_at into settings, flips status
to 'connected'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `getAwsAccounts` + `getAwsRegions` + `refreshAwsRegions` handlers

**Files:**
- Modify: `backend/src/controllers/awsController.js`

- [ ] **Step 1: Replace the `getAwsAccounts` stub**

Find:

```js
async function getAwsAccounts(req, res) { res.status(501).json({ error: "getAwsAccounts not implemented" }) }
```

Replace with:

```js
async function getAwsAccounts(req, res) {
  const endpoint = "GET /api/integrations/aws/accounts"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  let credentials
  try {
    credentials = await getAwsCredentials(integration)
  } catch (e) {
    const mapped = mapAwsError(e)
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  const orgClient = buildAwsClient(OrganizationsClient, credentials)
  const accounts = []
  let next = undefined
  try {
    for (let i = 0; i < 10; i++) {
      const resp = await orgClient.send(new ListAccountsCommand({ MaxResults: 50, NextToken: next }))
      for (const a of resp.Accounts || []) {
        accounts.push({
          id: a.Id,
          name: a.Name,
          email: a.Email,
          status: a.Status,
          joinedMethod: a.JoinedMethod,
          joinedTimestamp: a.JoinedTimestamp ? a.JoinedTimestamp.toISOString() : null,
        })
      }
      if (accounts.length >= 500) break
      next = resp.NextToken
      if (!next) break
    }
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "ListAccounts failed", { awsCode: e.name, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }
  return res.json({ accounts })
}
```

- [ ] **Step 2: Replace the `getAwsRegions` stub**

Find:

```js
async function getAwsRegions(req, res)  { res.status(501).json({ error: "getAwsRegions not implemented" }) }
```

Replace with:

```js
async function getAwsRegions(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    activeRegions: s.active_regions || [],
    regionsRefreshedAt: s.regions_refreshed_at || null,
  })
}
```

- [ ] **Step 3: Replace the `refreshAwsRegions` stub**

Find:

```js
async function refreshAwsRegions(req, res) { res.status(501).json({ error: "refreshAwsRegions not implemented" }) }
```

Replace with:

```js
async function refreshAwsRegions(req, res) {
  const endpoint = "POST /api/integrations/aws/regions/refresh"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  let credentials
  try {
    credentials = await getAwsCredentials(integration)
  } catch (e) {
    const mapped = mapAwsError(e)
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  let activeRegions = []
  try {
    const accountClient = buildAwsClient(AccountClient, credentials)
    let next = undefined
    for (let i = 0; i < 5; i++) {
      const resp = await accountClient.send(new ListRegionsCommand({
        MaxResults: 50,
        RegionOptStatusContains: ["ENABLED", "ENABLED_BY_DEFAULT"],
        NextToken: next,
      }))
      for (const r of resp.Regions || []) if (r.RegionName) activeRegions.push(r.RegionName)
      next = resp.NextToken
      if (!next) break
    }
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "ListRegions failed", { awsCode: e.name, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  const nowIso = new Date().toISOString()
  const newSettings = { ...integration.settings, active_regions: activeRegions, regions_refreshed_at: nowIso }
  const { error: updateErr } = await supabase
    .from("company_integrations")
    .update({ settings: newSettings, updated_at: nowIso })
    .eq("id", integration.id)
  if (updateErr) return res.status(500).json({ error: "Failed to persist regions" })

  return res.json({ activeRegions, regionsRefreshedAt: nowIso })
}
```

- [ ] **Step 4: Verify the controller still loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/awsController'); console.log('ok');"
```

Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/awsController.js
git commit -m "$(cat <<'EOF'
feat(aws): implement getAwsAccounts, getAwsRegions, refreshAwsRegions

getAwsAccounts paginates organizations:ListAccounts (cap 500).
getAwsRegions returns cached settings.active_regions.
refreshAwsRegions re-calls account:ListRegions and persists the list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: `analyzeAwsCostLeaks` + `disconnectAws` handlers

**Files:**
- Modify: `backend/src/controllers/awsController.js`

- [ ] **Step 1: Replace the `analyzeAwsCostLeaksHandler` stub**

Find:

```js
async function analyzeAwsCostLeaksHandler(req, res) { res.status(501).json({ error: "analyze not implemented" }) }
```

Replace with:

```js
async function analyzeAwsCostLeaksHandler(req, res) {
  const endpoint = "POST /api/integrations/aws/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Integration is not connected. Re-run validate first." })
  }

  // Duplicate check: same integration run within last 5 minutes → 409
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent, error: recentErr } = await supabase
    .from("cost_leak_analyses")
    .select("id, created_at")
    .eq("company_id", companyId)
    .eq("provider", AWS_PROVIDER)
    .eq("integration_id", integration.id)
    .gte("created_at", fiveMinAgo)
    .limit(1)
    .maybeSingle()
  if (recentErr) log("warn", endpoint, "dup-check query failed", recentErr)
  if (recent) {
    return res.status(409).json({
      error: "An analysis was just run for this integration. Please wait a few minutes before re-running.",
      recentAnalysisId: recent.id,
    })
  }

  let credentials
  try {
    credentials = await getAwsCredentials(integration)
  } catch (e) {
    const mapped = mapAwsError(e)
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  let result
  try {
    result = await analyzeAwsCostLeaks(credentials, integration.settings)
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "analysis failed", { awsCode: e.name, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // Persist via shared history controller
  try {
    await saveAnalysis({
      companyId,
      provider: AWS_PROVIDER,
      integrationId: integration.id,
      analysisData: { summary: result.summary, findings: result.findings },
      parameters: { organizationId: integration.settings?.organization_id || "" },
    })
  } catch (e) {
    log("error", endpoint, "saveAnalysis failed", { message: e.message })
    // Return the analysis even if persistence fails; user sees the run, we log the issue.
  }

  return res.json(result)
}
```

- [ ] **Step 2: Replace the `disconnectAws` stub**

Find:

```js
async function disconnectAws(req, res)  { res.status(501).json({ error: "disconnectAws not implemented" }) }
```

Replace with:

```js
async function disconnectAws(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  // Strip sensitive/identifying fields; keep audit breadcrumb.
  const priorSettings = integration.settings || {}
  const nowIso = new Date().toISOString()
  const cleared = {
    disconnected_at: nowIso,
    prior_organization_id: priorSettings.organization_id || null,
  }

  const { error: updateErr } = await supabase
    .from("company_integrations")
    .update({ settings: cleared, status: "disconnected", updated_at: nowIso })
    .eq("id", integration.id)
  if (updateErr) return res.status(500).json({ error: "Failed to disconnect" })

  evictCredentials(integration.id)
  return res.json({ ok: true, disconnectedAt: nowIso })
}
```

- [ ] **Step 3: Verify the controller still loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/controllers/awsController'); console.log('ok');"
```

Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/awsController.js
git commit -m "$(cat <<'EOF'
feat(aws): implement cost-leak analyze and disconnect handlers

analyze runs the CE+CO aggregator, persists via shared history controller,
enforces a 5-minute duplicate-run window. disconnect clears role_arn +
external_id, evicts cached credentials, marks status disconnected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `serveCloudFormationTemplate` handler

**Files:**
- Modify: `backend/src/controllers/awsController.js`

- [ ] **Step 1: Replace the stub**

Find:

```js
async function serveCloudFormationTemplate(req, res) { res.status(501).json({ error: "serveCloudFormationTemplate not implemented" }) }
```

Replace with:

```js
const fs = require("fs")
const path = require("path")

const CF_TEMPLATE_PATH = path.join(__dirname, "..", "templates", "aws-efficyon-role.yaml")
let cachedTemplate = null

function loadTemplate() {
  if (cachedTemplate) return cachedTemplate
  const raw = fs.readFileSync(CF_TEMPLATE_PATH, "utf-8")
  cachedTemplate = raw
  return raw
}

async function serveCloudFormationTemplate(req, res) {
  try {
    const raw = loadTemplate()
    const accountId = process.env.AWS_EFFICYON_ACCOUNT_ID
    if (!accountId || !/^\d{12}$/.test(accountId)) {
      return res.status(500).type("text/plain").send("AWS_EFFICYON_ACCOUNT_ID env var is missing or invalid on the server.")
    }
    const rendered = raw.replace(/\$\{EFFICYON_AWS_ACCOUNT_ID\}/g, accountId)
    res.set("Content-Type", "application/yaml")
    res.set("Cache-Control", "public, max-age=300")
    return res.send(rendered)
  } catch (e) {
    return res.status(500).type("text/plain").send("Failed to render template: " + e.message)
  }
}
```

Note: the `require("fs")` and `require("path")` lines must be near the **top** of the file (alongside the other imports), not inline above this handler. Move them to the imports block at the top of `awsController.js`.

- [ ] **Step 2: Verify serving works offline (no env var set → 500 with clear message)**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  const { serveCloudFormationTemplate } = require('./src/controllers/awsController');
  const req = {};
  const res = {
    _status: 200, _body: null, _type: null, _headers: {},
    status(c) { this._status = c; return this; },
    type(t)   { this._type = t; return this; },
    set(k, v) { this._headers[k] = v; return this; },
    send(b)   { this._body = b; },
    json(b)   { this._body = b; },
  };
  delete process.env.AWS_EFFICYON_ACCOUNT_ID;
  serveCloudFormationTemplate(req, res).then(() => {
    console.log('status:', res._status);
    console.log('body startsWith env missing:', String(res._body).includes('AWS_EFFICYON_ACCOUNT_ID env var'));
  });
"
```

Expected:
```
status: 500
body startsWith env missing: true
```

- [ ] **Step 3: Verify rendering replaces the placeholder when the env var is set**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
  process.env.AWS_EFFICYON_ACCOUNT_ID = '111122223333';
  const { serveCloudFormationTemplate } = require('./src/controllers/awsController');
  const req = {};
  const res = {
    _status: 200, _body: null, _type: null, _headers: {},
    status(c) { this._status = c; return this; },
    type(t)   { this._type = t; return this; },
    set(k, v) { this._headers[k] = v; return this; },
    send(b)   { this._body = b; },
    json(b)   { this._body = b; },
  };
  serveCloudFormationTemplate(req, res).then(() => {
    console.log('status:', res._status);
    console.log('contains real account id:', String(res._body).includes('111122223333'));
    console.log('no placeholder left:', !String(res._body).includes('\${EFFICYON_AWS_ACCOUNT_ID}'));
    console.log('content-type:', res._headers['Content-Type']);
  });
"
```

Expected:
```
status: 200
contains real account id: true
no placeholder left: true
content-type: application/yaml
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/awsController.js
git commit -m "$(cat <<'EOF'
feat(aws): serve CloudFormation template with env interpolation

Reads backend/src/templates/aws-efficyon-role.yaml, replaces
\${EFFICYON_AWS_ACCOUNT_ID} with process.env.AWS_EFFICYON_ACCOUNT_ID,
returns application/yaml. Caches the file read; sets a 5-minute
Cache-Control.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Wire routes + add AWS branches to `analysisHistoryController`

**Files:**
- Modify: `backend/src/routes/index.js`
- Modify: `backend/src/controllers/analysisHistoryController.js`
- Modify: `backend/env.example.backend.txt`

- [ ] **Step 1: Import the AWS controller in `routes/index.js`**

Find the GCP controller import block (added by commit `cb9ec48`). Insert AFTER it:

```js
// AWS Controller - Cost Explorer + Compute Optimizer cost analysis
const {
  validateAws,
  getAwsStatus,
  getAwsAccounts,
  getAwsRegions,
  refreshAwsRegions,
  analyzeAwsCostLeaks,
  disconnectAws,
  serveCloudFormationTemplate,
} = require("../controllers/awsController")
```

- [ ] **Step 2: Register AWS routes**

Immediately after the GCP route block in `routes/index.js`, insert:

```js
// AWS routes
router.get(   "/api/aws/cloudformation-template",              serveCloudFormationTemplate) // NO AUTH - static YAML
router.post(  "/api/integrations/aws/validate",                requireAuth, requireRole("owner", "editor"),           validateAws)
router.get(   "/api/integrations/aws/status",                  requireAuth, requireRole("owner", "editor", "viewer"), getAwsStatus)
router.get(   "/api/integrations/aws/accounts",                requireAuth, requireRole("owner", "editor", "viewer"), getAwsAccounts)
router.get(   "/api/integrations/aws/regions",                 requireAuth, requireRole("owner", "editor", "viewer"), getAwsRegions)
router.post(  "/api/integrations/aws/regions/refresh",         requireAuth, requireRole("owner", "editor"),           refreshAwsRegions)
router.post(  "/api/integrations/aws/cost-leaks",              requireAuth, requireRole("owner", "editor"),           analyzeAwsCostLeaks)
router.delete("/api/integrations/aws",                         requireAuth, requireRole("owner", "editor"),           disconnectAws)
```

- [ ] **Step 3: Add `"AWS"` branch to `extractSummary` in `analysisHistoryController.js`**

Find the existing `} else if (provider === "GCP") {` block (added in commit `cb9ec48`). Insert this block immediately after the closing `}` of the GCP branch and before the outer chain closes:

```js
  } else if (provider === "AWS") {
    const s = analysisData.summary || {}
    summary.totalFindings = s.totalFindings || 0
    summary.totalPotentialSavings = s.totalPotentialSavings || 0
    const bySev = s.findingsBySeverity || {}
    summary.highSeverity = (bySev.critical || 0) + (bySev.high || 0)
    summary.mediumSeverity = bySev.medium || 0
    summary.lowSeverity = bySev.low || 0
    summary.healthScore = null
  }
```

- [ ] **Step 4: Add `"AWS"` branch to the duplicate-check in `analysisHistoryController.js`**

Find the existing duplicate-check block (matches the pattern from GCP commit `cb9ec48`). Add an `else if` AFTER the GCP branch:

```js
  } else if (provider === "AWS") {
    duplicateQuery = duplicateQuery
      .eq("parameters->>organizationId", params.organizationId || "")
  }
```

- [ ] **Step 5: Document the three new env vars in `env.example.backend.txt`**

Append to the end of `backend/env.example.backend.txt`:

```
# AWS Cost-Leak Integration (Cost Explorer + Compute Optimizer)
# Credentials for the Efficyon ops AWS account. The IAM user must have a
# single policy allowing sts:AssumeRole on Resource: "*".
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
# The 12-digit AWS account ID of the Efficyon ops account. Interpolated into
# the CloudFormation template served at GET /api/aws/cloudformation-template.
AWS_EFFICYON_ACCOUNT_ID=
```

- [ ] **Step 6: Verify both files load**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "require('./src/routes'); console.log('routes ok');"
node -e "const c = require('./src/controllers/analysisHistoryController'); console.log('analysisHistory ok:', typeof c.saveAnalysis);"
```

Expected:
```
routes ok
analysisHistory ok: function
```

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/routes/index.js backend/src/controllers/analysisHistoryController.js backend/env.example.backend.txt
git commit -m "$(cat <<'EOF'
feat(aws): register AWS routes + history controller branches + env docs

Adds 8 AWS routes (CloudFormation template + 7 integration endpoints),
plus 'AWS' branches to extractSummary and the duplicate-check. Documents
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_EFFICYON_ACCOUNT_ID env
vars required at runtime.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Frontend

### Task 14: Extend `UnifiedToolConfig` with `connectComponent` + create AWS config

**Files:**
- Modify: `frontend/lib/tools/types.ts`
- Create: `frontend/lib/tools/configs/aws.ts`

- [ ] **Step 1: Extend `UnifiedToolConfig` in `frontend/lib/tools/types.ts`**

Find this block (around line 53):

```ts
export interface ToolViewProps {
  integration: Integration
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
}
```

Add this block immediately BEFORE it:

```ts
/**
 * Props passed to a custom connect component. If a UnifiedToolConfig supplies
 * `connectComponent`, it replaces the auto-generated declarative form.
 */
export interface ConnectComponentProps {
  onSubmit: (values: Record<string, any>) => Promise<void>
  onCancel: () => void
}
```

Then find the `UnifiedToolConfig` block and within it, find the line:

```ts
  authFields: AuthField[]
```

Insert the new optional field immediately AFTER it:

```ts
  /**
   * If present, replaces the auto-generated declarative connect form.
   * Used when the tool needs a multi-step wizard (e.g., AWS).
   */
  connectComponent?: ComponentType<ConnectComponentProps>
```

- [ ] **Step 2: Create the AWS config**

Path: `frontend/lib/tools/configs/aws.ts`

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
    integrations: [
      {
        tool_name: "AWS",
        connection_type: "serviceAccount",
        status: "pending",
        settings: {
          external_id: values.externalId,
          role_arn: values.roleArn,
        },
      },
    ],
  }),
  endpoints: [
    { key: "accounts", path: "/api/integrations/aws/accounts", pick: ["accounts"], fallback: [] },
    { key: "status",   path: "/api/integrations/aws/status" },
    { key: "regions",  path: "/api/integrations/aws/regions", pick: ["activeRegions"], fallback: [] },
  ],
  defaultTab: "accounts",
  viewComponent: AwsView,
  connectingToast: "Assuming IAM role…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To fully revoke access, delete the IAM role 'efficyon-cost-analyzer' from your AWS management account (IAM → Roles), or delete the CloudFormation stack that created it.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/aws/cost-leaks",
  analysisSupportsInactivity: false,
}
```

- [ ] **Step 3: Verify the config compiles with `tsc`**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit lib/tools/configs/aws.ts 2>&1 | head -20
```

Expected: no errors (may report missing `AwsView` / `AwsConnectForm` imports — that's fine, they're created in Tasks 15 + 16, and the command is just a sanity-check for config syntax). If the errors are **only** "Cannot find module '@/components/tools/aws-view'" or "aws-connect-form", that's expected — skip to Step 4. Any other error must be fixed.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/types.ts frontend/lib/tools/configs/aws.ts
git commit -m "$(cat <<'EOF'
feat(aws): extend UnifiedToolConfig + add AWS config

Adds optional connectComponent<ConnectComponentProps> to
UnifiedToolConfig so tools with multi-step connect flows (AWS) can opt
out of the declarative AuthField form. All existing tools unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: `AwsConnectForm` — 3-step wizard

**Files:**
- Create: `frontend/components/tools/aws-connect-form.tsx`

- [ ] **Step 1: Create the component**

Path: `frontend/components/tools/aws-connect-form.tsx`

```tsx
"use client"

import { useMemo, useState } from "react"
import type { ConnectComponentProps } from "@/lib/tools/types"

const ROLE_ARN_RE = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/

function generateExternalId() {
  // 32 hex chars. `crypto` is available in browsers (web crypto).
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function AwsConnectForm({ onSubmit, onCancel }: ConnectComponentProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [externalId, setExternalId] = useState("")
  const [roleArn, setRoleArn] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const backendOrigin =
    (typeof window !== "undefined" && (process.env.NEXT_PUBLIC_API_URL || "")) || ""

  const cloudFormationUrl = useMemo(() => {
    if (!externalId) return ""
    const templateUrl = `${backendOrigin || ""}/api/aws/cloudformation-template`
    const params = new URLSearchParams({
      templateURL: templateUrl,
      stackName: "efficyon-role",
      param_ExternalId: externalId,
    })
    return `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?${params.toString()}`
  }, [backendOrigin, externalId])

  async function handleSubmit() {
    setError(null)
    if (!ROLE_ARN_RE.test(roleArn)) {
      setError("Role ARN must look like arn:aws:iam::123456789012:role/efficyon-cost-analyzer")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ externalId, roleArn })
    } catch (e: any) {
      setError(e?.message || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={`flex items-center gap-2 ${step === n ? "text-foreground font-medium" : ""}`}
          >
            <span className={`h-6 w-6 rounded-full border grid place-items-center ${step >= n ? "bg-primary text-primary-foreground border-primary" : ""}`}>
              {n}
            </span>
            {n === 1 ? "Generate token" : n === 2 ? "Create IAM role" : "Paste role ARN"}
            {n < 3 && <span className="mx-2 text-muted-foreground/50">→</span>}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/30">
            <p className="text-sm">
              We&apos;ll generate a one-time <strong>external ID</strong> — a security token that AWS checks
              every time Efficyon assumes your role. It prevents a confused-deputy attack.
            </p>
          </div>

          {!externalId ? (
            <button
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              onClick={() => setExternalId(generateExternalId())}
            >
              Generate external ID
            </button>
          ) : (
            <>
              <div className="rounded-md border p-3 flex items-center justify-between bg-background">
                <code className="text-sm font-mono">{externalId}</code>
                <button
                  className="text-xs underline"
                  onClick={() => navigator.clipboard.writeText(externalId)}
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-2">
                <button className="text-sm underline" onClick={onCancel}>Cancel</button>
                <button
                  className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
                  onClick={() => setStep(2)}
                >
                  Continue →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/30 text-sm">
            <p>
              Click the button below to open AWS CloudFormation pre-filled with our template. Sign
              in with your <strong>AWS Organization management account</strong>, review the IAM role,
              and click <em>Create stack</em>.
            </p>
            <p className="mt-2">After the stack status becomes <code>CREATE_COMPLETE</code>, copy the <strong>RoleArn</strong> from the <em>Outputs</em> tab and bring it back here.</p>
          </div>

          <a
            href={cloudFormationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Launch CloudFormation in AWS Console ↗
          </a>

          <details className="rounded-md border p-3 text-sm bg-background" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer font-medium">Advanced / manual setup</summary>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <p>
                If CloudFormation is restricted in your org, create an IAM role named
                <code className="mx-1">efficyon-cost-analyzer</code> with the trust and permissions
                policies shown in the docs. Use this external ID in the trust policy:
              </p>
              <code className="block p-2 bg-muted rounded text-xs">{externalId}</code>
              <p>
                Permissions needed are read-only: <code>ce:Get*RecommendationS</code>,
                <code>compute-optimizer:Get*</code>, <code>organizations:DescribeOrganization</code>,
                <code>organizations:ListAccounts</code>, <code>account:ListRegions</code>,
                <code>ec2:DescribeRegions</code>.
              </p>
            </div>
          </details>

          <div className="flex gap-2">
            <button className="text-sm underline" onClick={() => setStep(1)}>← Back</button>
            <button
              className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              onClick={() => setStep(3)}
            >
              I&apos;ve created the role →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Role ARN
            <input
              type="text"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="arn:aws:iam::123456789012:role/efficyon-cost-analyzer"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value.trim())}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Find it in the CloudFormation stack&apos;s <em>Outputs</em> tab.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button className="text-sm underline" onClick={() => setStep(2)} disabled={submitting}>← Back</button>
            <button
              className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
              onClick={handleSubmit}
              disabled={submitting || !ROLE_ARN_RE.test(roleArn)}
            >
              {submitting ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AwsConnectForm
```

- [ ] **Step 2: Sanity-check the component compiles with `tsc`**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "(aws-connect-form|error TS)" | head -20
```

Expected: no errors referencing `aws-connect-form.tsx`. Pre-existing unrelated `error TS` lines (the project has `typescript.ignoreBuildErrors: true` in `next.config.mjs` per CLAUDE.md) can be ignored — verify only that the new file introduces none.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/components/tools/aws-connect-form.tsx
git commit -m "$(cat <<'EOF'
feat(aws): add 3-step AWS connect wizard

Step 1 generates a 32-hex-char external ID client-side (web crypto).
Step 2 opens the CloudFormation console with the template URL, stack
name, and external-ID parameter pre-filled; includes an advanced
accordion with the policies documented for manual setup.
Step 3 validates the Role ARN format and submits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: `AwsView` — data tab component

**Files:**
- Create: `frontend/components/tools/aws-view.tsx`

- [ ] **Step 1: Create the component**

Path: `frontend/components/tools/aws-view.tsx`

```tsx
"use client"

import { useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"

type Account = {
  id: string
  name: string
  email: string
  status: string
  joinedMethod?: string
  joinedTimestamp?: string | null
}

export function AwsView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [refreshingRegions, setRefreshingRegions] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const settings: any = integration.settings || {}
  const accounts: Account[] = info?.accounts || []
  const activeRegions: string[] =
    (info?.regions as string[] | undefined) ||
    (info?.activeRegions as string[] | undefined) ||
    settings.active_regions ||
    []
  const regionsRefreshedAt = settings.regions_refreshed_at || null

  async function refreshRegions() {
    setRefreshingRegions(true)
    setRefreshError(null)
    try {
      const res = await fetch("/api/integrations/aws/regions/refresh", {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await reload()
    } catch (e: any) {
      setRefreshError(e?.message || "Failed to refresh regions")
    } finally {
      setRefreshingRegions(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization summary */}
      <section className="rounded-md border p-4 space-y-2 bg-background">
        <h3 className="font-semibold">Organization</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Organization ID</dt>
          <dd className="font-mono">{settings.organization_id || "—"}</dd>

          <dt className="text-muted-foreground">Management account</dt>
          <dd className="font-mono">{settings.master_account_id || "—"}</dd>

          <dt className="text-muted-foreground">Member accounts</dt>
          <dd>{accounts.length}</dd>

          <dt className="text-muted-foreground">Active regions</dt>
          <dd>{activeRegions.length}</dd>

          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{settings.last_validated_at ? new Date(settings.last_validated_at).toLocaleString() : "—"}</dd>
        </dl>
      </section>

      {/* Accounts table */}
      <section className="rounded-md border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">Accounts in this Organization</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Account ID</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-4 text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && accounts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-muted-foreground">No accounts returned.</td></tr>
              )}
              {accounts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{a.id}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.joinedTimestamp ? new Date(a.joinedTimestamp).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active regions */}
      <section className="rounded-md border p-4 bg-background space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Active regions</h3>
          <button
            onClick={refreshRegions}
            disabled={refreshingRegions}
            className="text-xs underline disabled:opacity-50"
          >
            {refreshingRegions ? "Refreshing…" : "Refresh regions"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeRegions.length === 0 ? (
            <span className="text-sm text-muted-foreground">No regions detected.</span>
          ) : (
            activeRegions.map((r) => (
              <span key={r} className="px-2 py-1 rounded border bg-muted/30 text-xs font-mono">{r}</span>
            ))
          )}
        </div>
        {regionsRefreshedAt && (
          <p className="text-xs text-muted-foreground">
            Last refreshed {new Date(regionsRefreshedAt).toLocaleString()}
          </p>
        )}
        {refreshError && <p className="text-xs text-destructive">{refreshError}</p>}
      </section>
    </div>
  )
}

export default AwsView
```

- [ ] **Step 2: Sanity-check the component compiles with `tsc`**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "aws-view" | head -10
```

Expected: no errors referencing `aws-view.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/components/tools/aws-view.tsx
git commit -m "$(cat <<'EOF'
feat(aws): add AwsView data-tab component

Renders organization summary, accounts table, and active-regions chip
list with a Refresh regions action that hits
POST /api/integrations/aws/regions/refresh.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Register AWS in `TOOL_REGISTRY` and add brand logo

**Files:**
- Modify: `frontend/lib/tools/registry.ts`
- Modify: wherever `TOOL_BRANDS` is defined (same file the GCP commit `ae54780` touched)

- [ ] **Step 1: Register `awsConfig` in `registry.ts`**

Find the existing import block and add:

```ts
import { awsConfig } from "./configs/aws"
```

Find the `TOOL_REGISTRY` object and add an entry:

```ts
export const TOOL_REGISTRY: Record<string, UnifiedToolConfig> = {
  Fortnox: fortnoxConfig,
  Microsoft365: microsoft365Config,
  HubSpot: hubspotConfig,
  QuickBooks: quickbooksConfig,
  Shopify: shopifyConfig,
  OpenAI: openaiConfig,
  Anthropic: anthropicConfig,
  Gemini: geminiConfig,
  GoogleWorkspace: googleWorkspaceConfig,
  Slack: slackConfig,
  GCP: gcpConfig,
  AWS: awsConfig,  // <-- NEW
}
```

- [ ] **Step 2: Locate the `TOOL_BRANDS` definition**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
grep -rn "TOOL_BRANDS" lib components | head -5
```

Inspect the results. The GCP brand entry was added in commit `ae54780 feat(gcp): register GCP in TOOL_REGISTRY and add brand logo`; use `git show ae54780 --stat` to find the exact file that commit modified for the brand logo, and open it.

- [ ] **Step 3: Add the AWS brand entry**

In the file identified in Step 2, alongside the existing GCP entry, add an AWS entry that follows the same shape. The AWS "smile" logo is easiest to self-host as a small inline SVG or to reference the official AWS simple icons set if already present in the repo.

Minimal inline-SVG pattern (if the existing brands use inline SVG components):

```tsx
AWS: {
  label: "Amazon Web Services",
  color: "#FF9900",
  // Use the existing brand-icon primitive that other entries use.
  // Follow the GCP pattern exactly — if GCP used an <img> pointing at
  // /public/brands/gcp.svg, create /public/brands/aws.svg with the
  // official AWS logo (downloaded from https://aws.amazon.com/architecture/icons/)
  // and reference it identically.
}
```

Match whichever shape the existing entries use — do not invent a new field layout.

- [ ] **Step 4: Add the AWS logo asset (if the pattern stores files in public/)**

If the other entries reference files under `frontend/public/brands/`, download the official AWS logo (the simplified "AWS" cloud + arrow / "smile" orange mark) as SVG and save it as `frontend/public/brands/aws.svg`. AWS publishes a brand-kit at https://aws.amazon.com/architecture/icons/ — use the logo marked as "official AWS logo".

- [ ] **Step 5: Verify the registry and brands load**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "(aws|AWS)" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/registry.ts \
        frontend/public/brands/aws.svg 2>/dev/null || true
# Also stage whichever brands file Step 2 identified:
git add -A frontend/lib frontend/components frontend/public
git commit -m "$(cat <<'EOF'
feat(aws): register AWS in TOOL_REGISTRY and add brand logo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — End-to-End Verification

### Task 18: Manual E2E against a real AWS sandbox Organization

This is the verification step; no test runner is available per CLAUDE.md.

- [ ] **Step 1: Apply migration 044 to Supabase**

Using the Supabase MCP (same handoff as migration 043):

```
mcp__supabase__apply_migration
  name: 044_aws_provider
  query: <contents of backend/sql/044_aws_provider.sql>
```

Verify by running in the Supabase SQL editor:

```sql
SELECT pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'cost_leak_analyses' AND c.conname = 'valid_provider';
```

Expected: output includes `'AWS'` in the IN list.

- [ ] **Step 2: Set up the Efficyon ops AWS account (one-time)**

1. Create an AWS account dedicated to Efficyon (separate from any corporate account if possible).
2. In that account: **IAM → Users → Add user** → `efficyon-backend` → attach an inline policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Effect": "Allow", "Action": "sts:AssumeRole", "Resource": "*" }
     ]
   }
   ```

3. Generate an access key for that user (Security credentials → Create access key → Application running outside AWS).
4. Record the 12-digit account ID from **IAM → Dashboard** as `AWS_EFFICYON_ACCOUNT_ID`.
5. Put the three values in `backend/.env`:

   ```
   AWS_ACCESS_KEY_ID=<access-key-id>
   AWS_SECRET_ACCESS_KEY=<secret-access-key>
   AWS_EFFICYON_ACCOUNT_ID=<12-digit-account-id>
   ```

- [ ] **Step 3: Prepare a sandbox customer AWS Organization**

1. In a **separate** AWS management account (the "customer"), open the AWS Console as the Organizations management account.
2. Open **AWS Compute Optimizer** → click **Get started** (if not already opted in). Wait a few minutes for the opt-in to propagate.
3. (Optional) If the sandbox has no real workload, spin up a deliberately over-provisioned `m5.xlarge` EC2 instance and leave it running for at least 14 days — that's how long CO needs before it produces rightsizing recommendations. Without real workload, expect few or no findings.

- [ ] **Step 4: Start dev servers**

```bash
# Terminal 1
cd "c:/Users/tayaw/Desktop/effycionv2/backend" && npm run dev
# Terminal 2
cd "c:/Users/tayaw/Desktop/effycionv2/frontend" && npm run dev
```

- [ ] **Step 5: Run the connect flow at http://localhost:3000/dashboard/tools**

- [ ] Click **Add integration** → select **Amazon Web Services**.
- [ ] Step 1 of wizard: click **Generate external ID**. Confirm a 32-char hex string appears. Click **Continue →**.
- [ ] Step 2 of wizard: click **Launch CloudFormation in AWS Console**. New tab opens AWS console.
- [ ] In the AWS console, confirm the template is shown and the `ExternalId` parameter is pre-filled with the generated ID. Check the "I acknowledge..." box. Click **Create stack**. Wait for `CREATE_COMPLETE` (~30s).
- [ ] Open the stack → **Outputs** tab → copy the `RoleArn` value.
- [ ] Back in Efficyon, click **I&apos;ve created the role →**. Step 3 appears.
- [ ] Paste the Role ARN. Click **Connect**.
- [ ] Integration row appears in the dashboard with status `pending`. Click it → detail page auto-fires `/validate`. Within 5s, status flips to `connected`.

- [ ] **Step 6: Verify Overview + Data tabs**

- [ ] Overview tab shows organization ID and member account count.
- [ ] Data tab shows the accounts table populated by `organizations:ListAccounts`.
- [ ] Data tab shows the active regions chip list with a recent `regions_refreshed_at` timestamp.

- [ ] **Step 7: Run an analysis**

- [ ] Analysis tab → **Run Analysis**.
- [ ] Within ~60s, findings appear. Verify:
  - [ ] Total savings is either zero (pristine sandbox) or a positive USD number.
  - [ ] If there are findings, they're grouped by severity (critical/high/medium/low).
  - [ ] Each finding shows account + resource + action steps.
- [ ] History tab → the run appears with matching finding count and savings.

- [ ] **Step 8: Verify persistence**

In the Supabase SQL editor:

```sql
SELECT
  provider,
  summary->>'totalPotentialSavings' AS savings,
  summary->>'totalFindings' AS findings,
  summary->>'analyzedAccounts' AS accounts,
  summary->>'analyzedRegions' AS regions
FROM cost_leak_analyses
WHERE provider = 'AWS'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: one row with matching values. If all values are zero/null, the `extractSummary` branch or the `AWS` provider string likely mismatches — compare against the GCP row shape with `WHERE provider = 'GCP'`.

- [ ] **Step 9: Negative path — duplicate run**

Click **Run Analysis** twice within 5 minutes. Expected: second call returns a 409 with the "An analysis was just run" message.

- [ ] **Step 10: Negative path — missing permissions**

Edit the CloudFormation stack → **Update** → provide same template → use console to remove the `ce:GetRightsizingRecommendation` action from the inline policy → update. Re-run Analysis. Expected: 403 with hint "Re-launch the CloudFormation template — the role is missing permissions". Restore the policy by re-updating the stack with the original template.

- [ ] **Step 11: Negative path — Compute Optimizer not opted in**

Open **AWS Compute Optimizer** → **Settings** → **Opt out** (or temporarily disable for testing). Re-run Analysis. Expected: 409 with hint "Open the Compute Optimizer console in the management account and click Get started". Re-opt-in afterwards.

- [ ] **Step 12: Refresh regions**

Click **Refresh regions** in the Data tab. Expected: `regions_refreshed_at` timestamp updates; the region chip list may change if regions were opted in/out.

- [ ] **Step 13: Disconnect**

Disconnect the integration. Expected: status flips to `disconnected`; `settings.role_arn` and `settings.external_id` are cleared (a `disconnected_at` timestamp remains). Re-run the connect wizard with the same CloudFormation stack (same Role ARN, fresh external ID) — it should work.

- [ ] **Step 14: Record verification notes (optional)**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
mkdir -p docs/superpowers/verification
# drop screenshots or notes here
git add docs/superpowers/verification/
git commit -m "chore(aws): E2E verification notes"
```

If no notes taken, skip.

---

## Final Checklist

- [ ] Task 1: AWS SDK v3 dependencies installed and load cleanly
- [ ] Task 2: `awsAuth.js` utility built + input-validation verified
- [ ] Task 3: `awsCostExplorerAnalysis.js` built + rightsizing normalizer fixture-verified
- [ ] Task 4: `awsComputeOptimizerAnalysis.js` built + EC2/idle normalizers fixture-verified
- [ ] Task 5: `awsCostLeakAnalysis.js` aggregator built + severity + aggregate-shape verified
- [ ] Task 6: CloudFormation template YAML created + parsed-content verified
- [ ] Task 7: Migration `044_aws_provider.sql` created (apply deferred to user)
- [ ] Task 8: Controller scaffolding loads
- [ ] Task 9: `validateAws` + `getAwsStatus` handlers implemented
- [ ] Task 10: `getAwsAccounts` + `getAwsRegions` + `refreshAwsRegions` handlers implemented
- [ ] Task 11: `analyzeAwsCostLeaks` + `disconnectAws` handlers implemented
- [ ] Task 12: `serveCloudFormationTemplate` handler implemented + env-var path verified
- [ ] Task 13: Routes wired + analysisHistoryController branches + env.example updated
- [ ] Task 14: `UnifiedToolConfig` extended with `connectComponent` + `aws.ts` config created
- [ ] Task 15: `AwsConnectForm` 3-step wizard built
- [ ] Task 16: `AwsView` data-tab component built
- [ ] Task 17: Registry entry + brand logo added
- [ ] Task 18: Full E2E verification against a real AWS sandbox Organization
