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
