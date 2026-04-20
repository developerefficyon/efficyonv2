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
    const isTerminate = rec.RightsizingType === "Terminate"
    const opt = rec.ModifyRecommendationDetail?.TargetInstances?.[0] || {}
    const savings = isTerminate
      ? Number(rec.TerminateRecommendationDetail?.EstimatedMonthlySavings || rec.TerminateRecommendationDetail?.EstimatedMonthlyOnDemandCost || 0)
      : Number(opt.EstimatedMonthlySavings || 0)
    const region = rec.CurrentInstance?.Region || null
    return {
      id: `ce-rightsize-${rec.AccountId || "unknown"}-${rec.CurrentInstance?.ResourceId || rec.CurrentInstance?.InstanceName || "?"}`,
      source: "cost_explorer",
      severity: null,
      category: "rightsizing",
      title: isTerminate ? "Idle EC2 instance — terminate candidate" : "EC2 right-sizing opportunity",
      region,
      resource: {
        type: "ec2-instance",
        id: rec.CurrentInstance?.ResourceId || null,
        accountId: rec.AccountId || null,
        region,
      },
      currentCost: Number(rec.CurrentInstance?.MonthlyCost || 0),
      projectedSavings: savings,
      currency: "USD",
      recommendation: isTerminate
        ? "Terminate — instance activity is too low to justify its cost"
        : opt.ResourceDetails?.EC2ResourceDetails
          ? `Switch to ${opt.ResourceDetails.EC2ResourceDetails.InstanceType} (same family, better fit)`
          : "See Cost Explorer for right-sizing detail",
      actionSteps: isTerminate
        ? [
            "Confirm the instance is genuinely unused",
            "Snapshot volumes if data retention is needed",
            "Terminate the instance",
          ]
        : [
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
      severity: null,
      category: "savings_plan_purchase",
      title: "Compute Savings Plan opportunity",
      region: null,
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
      severity: null,
      category: "reserved_instance_purchase",
      title: "EC2 Reserved Instance opportunity",
      region: null,
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
