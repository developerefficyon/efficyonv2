/**
 * GCP Recommender Analysis Service
 *
 * Fans out Recommender API calls across projects × recommender types ×
 * locations. Aggregates results into the shared cost-leak finding shape.
 *
 * Savings are pulled directly from `primaryImpact.costProjection.cost` —
 * Google's own projection in nano-units of the billing currency. No custom
 * pricing table required.
 */

const crypto = require("crypto")
const { GCP_RECOMMENDER_CATALOG, severityForRecommendation } = require("../utils/gcpRecommenderCatalog")

const CLOUD_RESOURCE_MANAGER = "https://cloudresourcemanager.googleapis.com/v3"
const RECOMMENDER = "https://recommender.googleapis.com/v1"
const COMPUTE = "https://compute.googleapis.com/v1"

// --- Small helpers ---

function generateFindingHash(finding) {
  const resourceIds = (finding.affectedResources || []).map((r) => r.id).sort().join(",")
  const key = `${finding.type}:${resourceIds}`
  return crypto.createHash("md5").update(key).digest("hex")
}

function costToUsd(cost) {
  if (!cost) return 0
  const units = Number(cost.units || 0)
  const nanos = Number(cost.nanos || 0)
  return Math.abs(units + nanos / 1e9)
}

function savingsBucketToImpact(monthlyUsd) {
  if (monthlyUsd >= 500) return "high"
  if (monthlyUsd >= 50) return "medium"
  return "low"
}

// Extract project id from a recommendation.name of shape
// "projects/<proj>/locations/<loc>/recommenders/<rid>/recommendations/<id>"
function extractProjectFromName(name) {
  const m = /^projects\/([^/]+)\//.exec(name || "")
  return m ? m[1] : null
}

// Extract the first resource from operationGroups (best-effort).
function extractResourcesFromRecommendation(rec) {
  const resources = []
  const opGroups = rec.content?.operationGroups || []
  for (const group of opGroups) {
    for (const op of group.operations || []) {
      if (op.resource) {
        resources.push({
          id: op.resource,
          name: op.resource.split("/").pop(),
          project: extractProjectFromName(rec.name) || extractProjectFromResource(op.resource),
          location: extractLocationFromResource(op.resource),
        })
      }
    }
  }
  if (resources.length === 0) {
    // Fallback — at least record the project
    resources.push({
      id: rec.name,
      name: rec.name.split("/").pop(),
      project: extractProjectFromName(rec.name),
      location: null,
    })
  }
  return resources
}

function extractProjectFromResource(resource) {
  const m = /\/projects\/([^/]+)\//.exec(resource || "")
  return m ? m[1] : null
}

function extractLocationFromResource(resource) {
  const z = /\/zones\/([^/]+)\//.exec(resource || "")
  if (z) return z[1]
  const r = /\/regions\/([^/]+)\//.exec(resource || "")
  if (r) return r[1]
  return null
}

// --- Concurrency-limited executor (no new dep) ---

async function runPool(tasks, limit) {
  const results = new Array(tasks.length)
  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++
      try {
        results[i] = await tasks[i]()
      } catch (e) {
        results[i] = { error: e }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

// --- Google API helpers ---

async function googleGet(url, accessToken) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`GET ${url} → ${res.status} ${body}`)
    err.status = res.status
    err.code = res.status === 403 ? "FORBIDDEN" : (res.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR")
    if (res.status === 429) err.retryAfter = parseInt(res.headers.get("retry-after") || "30", 10)
    throw err
  }
  return res.json()
}

async function listActiveProjects(accessToken, organizationId) {
  // organizationId format: "organizations/123"
  const projects = []
  let pageToken = ""
  let safety = 0
  do {
    const url = `${CLOUD_RESOURCE_MANAGER}/projects?parent=${encodeURIComponent(organizationId)}${pageToken ? `&pageToken=${pageToken}` : ""}`
    const page = await googleGet(url, accessToken)
    for (const p of page.projects || []) {
      if (p.state === "ACTIVE") projects.push(p)
    }
    pageToken = page.nextPageToken || ""
    safety++
    if (safety > 50) break
  } while (pageToken)
  return projects
}

async function listActiveRegions(accessToken, sampleProjectId) {
  const url = `${COMPUTE}/projects/${encodeURIComponent(sampleProjectId)}/regions`
  const json = await googleGet(url, accessToken)
  return (json.items || []).filter((r) => r.status === "UP").map((r) => r.name)
}

async function listActiveZones(accessToken, sampleProjectId) {
  const url = `${COMPUTE}/projects/${encodeURIComponent(sampleProjectId)}/zones`
  const json = await googleGet(url, accessToken)
  return (json.items || []).filter((z) => z.status === "UP").map((z) => z.name)
}

async function listRecommendations(accessToken, project, location, recommenderId) {
  // Global recommenders use location="global".
  const url = `${RECOMMENDER}/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/recommenders/${encodeURIComponent(recommenderId)}/recommendations`
  const json = await googleGet(url, accessToken)
  return json.recommendations || []
}

// --- Main entry point ---

async function analyzeGcpCostLeaks({ accessToken, organizationId }) {
  const findings = []
  const warnings = []

  // 1. Projects
  let projects
  try {
    projects = await listActiveProjects(accessToken, organizationId)
  } catch (e) {
    if (e.code === "FORBIDDEN") {
      const err = new Error("Service account missing 'cloudresourcemanager.projects.list' at org scope. Grant 'roles/browser' at the organization.")
      err.code = "MISSING_ORG_ROLE"
      throw err
    }
    throw e
  }

  if (projects.length === 0) {
    const info = {
      type: "NO_ACTIVE_PROJECTS",
      severity: "info",
      title: "No active projects found in this organization",
      description: "Either the organization has no ACTIVE projects or the service account lacks visibility.",
      affectedResources: [],
      projectedMonthlySavings: 0,
      recommendation: "Verify the service account has 'roles/browser' at the organization.",
      actionSteps: [],
      effort: "low",
      impact: "low",
    }
    info.findingHash = generateFindingHash(info)
    return {
      findings: [info],
      summary: {
        orgId: organizationId,
        projectCount: 0,
        issuesFound: 0,
        potentialMonthlySavings: null,
        potentialAnnualSavings: null,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byCategory: {},
        byProject: {},
        topFindings: [],
        healthScore: 100,
        inactivityThreshold: null,
        planLabel: "GCP Organization",
      },
      warnings,
      billableSource: "recommender.googleapis.com/v1",
    }
  }

  // 2. Regions + zones (once, via the first project)
  let regions = []
  let zones = []
  try {
    const sample = projects[0].projectId || projects[0].name.split("/").pop()
    ;[regions, zones] = await Promise.all([
      listActiveRegions(accessToken, sample),
      listActiveZones(accessToken, sample),
    ])
  } catch (e) {
    warnings.push({ stage: "region-discovery", error: e.message })
    // Continue — global-scoped recommenders still work
  }

  // 3. Build the fan-out task list
  const tasks = []
  for (const project of projects) {
    const projectId = project.projectId || project.name.split("/").pop()
    for (const rec of GCP_RECOMMENDER_CATALOG) {
      let locations
      if (rec.locationScope === "global") locations = ["global"]
      else if (rec.locationScope === "region") locations = regions.length ? regions : []
      else /* zone */                       locations = zones.length ? zones : []
      for (const loc of locations) {
        tasks.push(async () => {
          const recs = await listRecommendations(accessToken, projectId, loc, rec.id)
          return { recommendations: recs, catalog: rec, project: projectId, location: loc }
        })
      }
    }
  }

  // 4. Execute with concurrency = 6
  const results = await runPool(tasks, 6)

  // 5. Flatten + normalize
  for (const result of results) {
    if (!result) continue
    if (result.error) {
      if (result.error.code === "FORBIDDEN") {
        warnings.push({ stage: "recommender-list", error: result.error.message })
      } else if (result.error.code === "RATE_LIMITED") {
        warnings.push({ stage: "recommender-list", error: `Rate limited: ${result.error.message}` })
      }
      // 404 and other errors silently skipped — project may not have that service
      continue
    }
    const { recommendations, catalog, project, location } = result
    for (const rec of recommendations) {
      const resources = extractResourcesFromRecommendation(rec)
      const savings = costToUsd(rec.primaryImpact?.costProjection?.cost)
      const severity = severityForRecommendation(catalog.severity, rec.priority)
      const actionSteps = []
      for (const group of rec.content?.operationGroups || []) {
        for (const op of group.operations || []) {
          if (op.description) actionSteps.push(op.description)
          else if (op.action) actionSteps.push(`${op.action} ${op.resource || ""}`)
        }
      }
      const effort = actionSteps.length > 3 ? "high" : (actionSteps.length > 1 ? "medium" : "low")
      const finding = {
        type: catalog.type,
        severity,
        title: `${catalog.label}: ${resources[0]?.name || "unknown"}`,
        description: rec.description || catalog.label,
        affectedResources: resources.map((r) => ({ ...r, project: r.project || project, location: r.location || location })),
        projectedMonthlySavings: savings,
        recommendation: rec.description || catalog.label,
        actionSteps,
        effort,
        impact: savingsBucketToImpact(savings),
        raw: { name: rec.name, etag: rec.etag, stateInfo: rec.stateInfo, priority: rec.priority },
      }
      finding.findingHash = generateFindingHash(finding)
      findings.push(finding)
    }
  }

  // 6. Aggregations
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  const byCategory = {}
  const byProject = {}
  let totalSavings = 0
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
    if (!byCategory[f.type]) byCategory[f.type] = { count: 0, savings: 0 }
    byCategory[f.type].count++
    byCategory[f.type].savings += f.projectedMonthlySavings
    const proj = f.affectedResources[0]?.project || "(unknown)"
    if (!byProject[proj]) byProject[proj] = { count: 0, savings: 0 }
    byProject[proj].count++
    byProject[proj].savings += f.projectedMonthlySavings
    totalSavings += f.projectedMonthlySavings
  }

  const topFindings = [...findings]
    .sort((a, b) => b.projectedMonthlySavings - a.projectedMonthlySavings)
    .slice(0, 5)
    .map((f) => ({ type: f.type, title: f.title, savings: f.projectedMonthlySavings, severity: f.severity }))

  // Health score — penalty-based, same family as Slack/HubSpot
  let healthScore = 100
  const penalty = bySeverity.critical * 12 + bySeverity.high * 8 + bySeverity.medium * 4 + bySeverity.low * 2
  healthScore = Math.max(0, 100 - penalty)

  return {
    findings,
    summary: {
      orgId: organizationId,
      projectCount: projects.length,
      issuesFound: findings.length,
      potentialMonthlySavings: totalSavings,
      potentialAnnualSavings: totalSavings * 12,
      bySeverity,
      byCategory,
      byProject,
      topFindings,
      healthScore,
      inactivityThreshold: null,
      planLabel: "GCP Organization",
    },
    warnings,
    billableSource: "recommender.googleapis.com/v1",
  }
}

module.exports = {
  analyzeGcpCostLeaks,
  generateFindingHash,
  costToUsd,
  savingsBucketToImpact,
  extractResourcesFromRecommendation,
  runPool,
  // exposed for testing / future reuse
  listActiveProjects,
  listActiveRegions,
  listActiveZones,
  listRecommendations,
}
