/**
 * Azure Advisor analysis service.
 *
 * Per subscription, fetches all Cost-category recommendations. Paginated
 * via `nextLink`. Each response normalized into the shared cost-leak
 * finding shape.
 */

const ARM = "https://management.azure.com"
const API_VERSION = "2023-01-01"
const PER_CALL_CAP = 500

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

async function advisorRequest(accessToken, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("ADVISOR_REQUEST_FAILED", body?.error?.message || `HTTP ${res.status}`)
    err.azureErrorCode = body?.error?.code
    err.httpStatus = res.status
    throw err
  }
  return body
}

async function paginate(accessToken, startUrl) {
  const out = []
  let url = startUrl
  for (let i = 0; i < 20 && url; i++) {
    const body = await advisorRequest(accessToken, url)
    const items = body.value || []
    out.push(...items)
    if (out.length >= PER_CALL_CAP) return out.slice(0, PER_CALL_CAP)
    url = body.nextLink
  }
  return out
}

async function listSubscriptions(accessToken) {
  const body = await advisorRequest(accessToken, `${ARM}/subscriptions?api-version=2022-12-01`)
  return (body.value || []).map((s) => ({
    id: s.subscriptionId,
    name: s.displayName,
    state: s.state,
  }))
}

/**
 * Normalize one Advisor Cost recommendation into a cost-leak finding.
 */
function normalizeAdvisor(rec, subscriptionId) {
  const props = rec.properties || {}
  const rm = props.resourceMetadata || {}
  const ep = props.extendedProperties || {}

  // Savings: Advisor puts amounts in multiple shapes across recommendation types.
  // annualSavingsAmount is the most common; divide by 12 for monthly.
  const monthlySavings =
    Number(ep.savingsAmount || 0) ||
    Number(ep.annualSavingsAmount || 0) / 12 ||
    Number(ep.monthlySavings || 0) ||
    0

  const category = ((ep.recommendationTypeId || "") + "").toLowerCase().includes("reserved")
    ? "reservation"
    : (props.shortDescription?.problem || "").toLowerCase().includes("idle")
      ? "idle"
      : "rightsizing"

  const resourceArm = rm.resourceId || rec.id || ""
  const region = rm.region || ep.region || null

  return {
    id: `azure-advisor-${rec.name || rec.id}`,
    source: "azure_advisor",
    severity: null,
    category,
    title: props.shortDescription?.problem || "Azure cost optimization opportunity",
    region,
    resource: {
      type: rm.source || "azure-resource",
      id: resourceArm,
      accountId: subscriptionId,
      region,
    },
    currentCost: 0, // Advisor doesn't consistently expose current cost
    projectedSavings: Number(monthlySavings.toFixed(2)),
    currency: ep.savingsCurrency || "USD",
    recommendation: props.shortDescription?.solution || "See Azure Advisor console for detail",
    actionSteps: [
      "Open Azure Portal → Advisor → Cost",
      "Review the recommendation's detail view",
      "Apply via the portal's one-click remediation when available",
    ],
    raw: rec,
  }
}

async function fetchRecommendationsForSubscription(accessToken, subscriptionId) {
  const url =
    `${ARM}/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations` +
    `?api-version=${API_VERSION}&$filter=${encodeURIComponent("Category eq 'Cost'")}`
  const raw = await paginate(accessToken, url)
  return raw.map((rec) => normalizeAdvisor(rec, subscriptionId))
}

async function runAdvisorAnalysis(accessToken, subscriptions) {
  const findings = []
  const errors = []
  for (const sub of subscriptions) {
    if (sub.state && sub.state !== "Enabled") continue
    try {
      const items = await fetchRecommendationsForSubscription(accessToken, sub.id)
      findings.push(...items)
    } catch (e) {
      errors.push({
        subscriptionId: sub.id,
        message: e.message,
        code: e.azureErrorCode || e.code,
        httpStatus: e.httpStatus,
      })
    }
  }
  return { findings, errors }
}

module.exports = {
  runAdvisorAnalysis,
  listSubscriptions,
  normalizeAdvisor,
  fetchRecommendationsForSubscription,
}
