# GCP Billing (Recommender API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GCP as the 8th data-source cost-leak integration. Service-account JSON auth at org scope, Recommender API findings across 11 cost-relevant recommender types, savings computed from Google's own cost projections.

**Architecture:** No OAuth — service-account JSON key IS the credential. Per-run JWT signing (Node `crypto`) exchanges for a short-lived access token; fan-out (concurrency=6) over projects × recommender types × locations; findings normalized into the same cost-leak shape as Slack/HubSpot; frontend owns persistence via `/api/analysis-history`.

**Tech Stack:** Backend — Express 5 CommonJS, Node built-in `crypto` (no new deps), Supabase. Frontend — Next.js 16, React 19, TypeScript, existing shadcn/ui primitives.

**Reference spec:** [`docs/superpowers/specs/2026-04-17-gcp-billing-integration-design.md`](../specs/2026-04-17-gcp-billing-integration-design.md)

**Testing note:** Per `CLAUDE.md` this repo has no test runner. Pure-JS modules verify via `node -e` REPL fixtures; integrated flows verify via dev-server + curl and a final end-to-end pass against a real GCP sandbox (Task 14).

---

## Phase 1 — Pure Backend Modules

### Task 1: GCP auth utility (JWT signing + token exchange)

**Files:**
- Create: `backend/src/utils/gcpAuth.js`

- [ ] **Step 1: Create the file**

Path: `backend/src/utils/gcpAuth.js`

```js
/**
 * GCP Auth Utility
 *
 * Exchanges a service-account JSON key for a short-lived (1-hour) OAuth 2.0
 * access token via the JWT-bearer grant. Uses Node's built-in `crypto` module;
 * no external dependency.
 *
 * Scope is fixed to cloud-platform.read-only — Recommender + Cloud Resource
 * Manager + Compute regions are all read-only operations.
 */

const crypto = require("crypto")

const SCOPE = "https://www.googleapis.com/auth/cloud-platform.read-only"
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"

function b64url(input) {
  return Buffer.from(input).toString("base64url")
}

/**
 * Parse and validate a service-account JSON key.
 * Throws on missing fields or wrong key type.
 */
function parseServiceAccountKey(raw) {
  let parsed
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      const err = new Error("Service account key is not valid JSON")
      err.code = "SA_INVALID_JSON"
      throw err
    }
  } else if (typeof raw === "object" && raw !== null) {
    parsed = raw
  } else {
    const err = new Error("Service account key must be a JSON string or object")
    err.code = "SA_INVALID_TYPE"
    throw err
  }

  if (parsed.type !== "service_account") {
    const err = new Error("Key is not a service-account key (type must be 'service_account')")
    err.code = "SA_WRONG_TYPE"
    throw err
  }
  if (!parsed.client_email || !parsed.private_key) {
    const err = new Error("Service account key missing client_email or private_key")
    err.code = "SA_MISSING_FIELDS"
    throw err
  }
  return parsed
}

/**
 * Sign a JWT (RS256) with the service account's private key and exchange it
 * for an access token.
 *
 * @param {object|string} serviceAccountKey - parsed or raw JSON
 * @returns {Promise<{ accessToken: string, expiresAt: number }>}
 */
async function exchangeServiceAccountKeyForToken(serviceAccountKey) {
  const sa = parseServiceAccountKey(serviceAccountKey)
  const tokenUri = sa.token_uri || DEFAULT_TOKEN_URI
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  }

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(signingInput)
  const signature = signer.sign(sa.private_key).toString("base64url")
  const jwt = `${signingInput}.${signature}`

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`GCP token exchange failed: ${res.status} ${body}`)
    err.code = res.status === 401 ? "SA_UNAUTHORIZED" : "SA_TOKEN_EXCHANGE_FAILED"
    err.status = res.status
    throw err
  }

  const json = await res.json()
  return {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in || 3600),
  }
}

module.exports = {
  SCOPE,
  parseServiceAccountKey,
  exchangeServiceAccountKeyForToken,
}
```

- [ ] **Step 2: Verify parse function with a synthetic fixture**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
const { parseServiceAccountKey } = require('./src/utils/gcpAuth');
// Valid
const ok = parseServiceAccountKey(JSON.stringify({ type: 'service_account', client_email: 'x@y.iam', private_key: '-----BEGIN...' }));
console.log('valid:', ok.client_email);
// Invalid JSON
try { parseServiceAccountKey('{not json'); } catch (e) { console.log('invalid json code:', e.code); }
// Wrong type
try { parseServiceAccountKey(JSON.stringify({ type: 'authorized_user' })); } catch (e) { console.log('wrong type code:', e.code); }
// Missing fields
try { parseServiceAccountKey(JSON.stringify({ type: 'service_account' })); } catch (e) { console.log('missing fields code:', e.code); }
"
```

Expected output:
```
valid: x@y.iam
invalid json code: SA_INVALID_JSON
wrong type code: SA_WRONG_TYPE
missing fields code: SA_MISSING_FIELDS
```

- [ ] **Step 3: Verify JWT signing produces a well-formed token (no actual exchange)**

Generate a throwaway RSA key and sign a JWT locally to confirm `crypto.createSign` is wired right:

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
const crypto = require('crypto');
const { generateKeyPairSync } = crypto;
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs1', format: 'pem' });
const sa = { type: 'service_account', client_email: 'x@y.iam', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' };
// We can't call exchangeServiceAccountKeyForToken (it would hit Google), but we can verify the local signing produces three dot-separated base64url segments.
const signingInput = Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url') + '.' + Buffer.from(JSON.stringify({iss:'test'})).toString('base64url');
const signer = crypto.createSign('RSA-SHA256');
signer.update(signingInput);
const sig = signer.sign(pem).toString('base64url');
const jwt = signingInput + '.' + sig;
console.log('jwt segments:', jwt.split('.').length);
console.log('jwt head starts:', jwt.slice(0, 20));
// Verify with public key
const verifier = crypto.createVerify('RSA-SHA256');
verifier.update(signingInput);
console.log('sig verifies:', verifier.verify(publicKey, Buffer.from(sig, 'base64url')));
"
```

Expected:
```
jwt segments: 3
jwt head starts: eyJhbGciOiJSUzI1NiIs
sig verifies: true
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/utils/gcpAuth.js
git commit -m "feat(gcp): add service-account JWT auth utility

Parses service-account JSON keys, signs a JWT (RS256) with
Node's built-in crypto module, and exchanges it for a 1-hour
OAuth access token scoped to cloud-platform.read-only. No new
npm dependency.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Recommender catalog

**Files:**
- Create: `backend/src/utils/gcpRecommenderCatalog.js`

- [ ] **Step 1: Create the catalog file**

Path: `backend/src/utils/gcpRecommenderCatalog.js`

```js
/**
 * GCP Recommender Catalog
 *
 * Maps each Google Recommender type to our internal finding type, default
 * severity, UI label, and location scope. Location scope determines whether
 * we call the recommender once per region, once per zone, or once globally
 * per project.
 */

const GCP_RECOMMENDER_CATALOG = [
  // Compute
  { id: "google.compute.instance.IdleResourceRecommender",     type: "IDLE_VM",                severity: "high",   label: "Idle Compute VM",                 locationScope: "zone"    },
  { id: "google.compute.instance.MachineTypeRecommender",      type: "OVERSIZED_VM",           severity: "medium", label: "Oversized VM",                    locationScope: "zone"    },
  { id: "google.compute.disk.IdleResourceRecommender",         type: "UNATTACHED_DISK",        severity: "medium", label: "Unattached Persistent Disk",      locationScope: "zone"    },
  { id: "google.compute.address.IdleResourceRecommender",      type: "UNUSED_STATIC_IP",       severity: "low",    label: "Unused Static IP",                locationScope: "region"  },
  { id: "google.compute.commitment.UsageCommitmentRecommender",type: "MISSING_CUD",            severity: "high",   label: "Missing Committed Use Discount",  locationScope: "region"  },
  // BigQuery
  { id: "google.bigquery.capacityCommitments.Recommender",     type: "BQ_CAPACITY",            severity: "high",   label: "BigQuery Capacity Commitment",    locationScope: "global"  },
  { id: "google.bigquery.table.PartitionClusterRecommender",   type: "BQ_PARTITION",           severity: "medium", label: "BigQuery Partition/Cluster",      locationScope: "global"  },
  // Cloud SQL
  { id: "google.cloudsql.instance.IdleRecommender",            type: "IDLE_CLOUDSQL",          severity: "high",   label: "Idle Cloud SQL Instance",         locationScope: "global"  },
  { id: "google.cloudsql.instance.OverprovisionedRecommender", type: "OVERSIZED_CLOUDSQL",     severity: "medium", label: "Overprovisioned Cloud SQL",       locationScope: "global"  },
  // Cloud Storage
  { id: "google.cloudstorage.bucket.SoftDeleteRecommender",    type: "BUCKET_SOFT_DELETE",     severity: "low",    label: "Cloud Storage Soft Delete",       locationScope: "global"  },
  // IAM
  { id: "google.iam.serviceAccount.ChangeRiskRecommender",     type: "UNUSED_SERVICE_ACCOUNT", severity: "low",    label: "Unused Service Account",          locationScope: "global"  },
]

// Google recommendation.priority → our severity
const PRIORITY_TO_SEVERITY = {
  P1: "critical",
  P2: "high",
  P3: "medium",
  P4: "low",
}

function severityForRecommendation(defaultSeverity, priority) {
  if (priority && PRIORITY_TO_SEVERITY[priority]) return PRIORITY_TO_SEVERITY[priority]
  return defaultSeverity
}

module.exports = {
  GCP_RECOMMENDER_CATALOG,
  PRIORITY_TO_SEVERITY,
  severityForRecommendation,
}
```

- [ ] **Step 2: Verify with node REPL**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
const c = require('./src/utils/gcpRecommenderCatalog');
console.log('catalog size:', c.GCP_RECOMMENDER_CATALOG.length);
console.log('global-scoped:', c.GCP_RECOMMENDER_CATALOG.filter(r => r.locationScope === 'global').length);
console.log('zone-scoped:', c.GCP_RECOMMENDER_CATALOG.filter(r => r.locationScope === 'zone').length);
console.log('region-scoped:', c.GCP_RECOMMENDER_CATALOG.filter(r => r.locationScope === 'region').length);
console.log('P1 severity:', c.severityForRecommendation('medium', 'P1'));
console.log('P4 severity:', c.severityForRecommendation('high', 'P4'));
console.log('no priority:', c.severityForRecommendation('low', null));
"
```

Expected:
```
catalog size: 11
global-scoped: 6
zone-scoped: 3
region-scoped: 2
P1 severity: critical
P4 severity: low
no priority: low
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/utils/gcpRecommenderCatalog.js
git commit -m "feat(gcp): add recommender catalog

11 cost-relevant recommender types across Compute, BigQuery,
Cloud SQL, Cloud Storage, and IAM. Priority-to-severity map
honors Google's P1-P4 priority ordering.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: GCP Recommender analysis service

**Files:**
- Create: `backend/src/services/gcpRecommenderAnalysis.js`

- [ ] **Step 1: Create the service file**

Path: `backend/src/services/gcpRecommenderAnalysis.js`

```js
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
```

- [ ] **Step 2: Verify pure helpers with a fixture**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "
const { costToUsd, savingsBucketToImpact, generateFindingHash, runPool, extractResourcesFromRecommendation } = require('./src/services/gcpRecommenderAnalysis');
console.log('cost 0:', costToUsd({ units: '0', nanos: 0 }));
console.log('cost 240.50:', costToUsd({ units: '-240', nanos: -500000000 }));
console.log('bucket 5:', savingsBucketToImpact(5));
console.log('bucket 100:', savingsBucketToImpact(100));
console.log('bucket 1000:', savingsBucketToImpact(1000));
const hash1 = generateFindingHash({ type: 'IDLE_VM', affectedResources: [{ id: 'r1' }, { id: 'r2' }] });
const hash2 = generateFindingHash({ type: 'IDLE_VM', affectedResources: [{ id: 'r2' }, { id: 'r1' }] });
console.log('hash order-stable:', hash1 === hash2);
// runPool
(async () => {
  const out = await runPool([() => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3)], 2);
  console.log('runPool result:', JSON.stringify(out));
})();
// resource extraction
const extracted = extractResourcesFromRecommendation({
  name: 'projects/my-proj/locations/us-central1-a/recommenders/xyz/recommendations/123',
  content: { operationGroups: [{ operations: [{ resource: '//compute.googleapis.com/projects/my-proj/zones/us-central1-a/instances/idle-vm', action: 'replace' }] }] },
});
console.log('extracted:', JSON.stringify(extracted));
"
```

Expected output (last lines may interleave due to async):
```
cost 0: 0
cost 240.50: 240.5
bucket 5: low
bucket 100: medium
bucket 1000: high
hash order-stable: true
extracted: [{"id":"//compute.googleapis.com/projects/my-proj/zones/us-central1-a/instances/idle-vm","name":"idle-vm","project":"my-proj","location":"us-central1-a"}]
runPool result: [1,2,3]
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/gcpRecommenderAnalysis.js
git commit -m "feat(gcp): add Recommender analysis service

Fan-out over projects × recommenders × locations with
concurrency=6. Extracts findings from Recommender API response
shape, computes per-project / per-category / per-severity
aggregations, and surfaces top 5 savings. Savings in USD
derived from Google's own cost projection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Database

### Task 4: Migration for `GCP` provider

**Files:**
- Create: `backend/sql/043_gcp_provider.sql`

- [ ] **Step 1: Create migration**

Path: `backend/sql/043_gcp_provider.sql`

```sql
-- Allow GCP as a provider for persisted cost-leak analyses.
-- Findings come from Google's Recommender API; analysis summary is
-- compatible with the shared cost_leak_analyses shape.

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

- [ ] **Step 2: DB apply deferred to user**

This file is committed; the user will apply it to Supabase separately (same handoff model as Slack's migration 042). Do NOT attempt to apply it from the subagent.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/sql/043_gcp_provider.sql
git commit -m "feat(gcp): allow 'GCP' provider in cost_leak_analyses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Backend Controller + Routes

### Task 5: Controller scaffolding

**Files:**
- Create: `backend/src/controllers/gcpController.js`

- [ ] **Step 1: Create file**

Path: `backend/src/controllers/gcpController.js`

```js
/**
 * GCP Controller
 *
 * Service-account-JSON based auth. No OAuth. Tokens are minted per-run from
 * the stored (encrypted) service account key.
 */

const { supabase } = require("../config/supabase")
const {
  encryptOAuthData,
  decryptOAuthData,
  decryptIntegrationSettings,
} = require("../utils/encryption")
const { parseServiceAccountKey, exchangeServiceAccountKeyForToken } = require("../utils/gcpAuth")
const { analyzeGcpCostLeaks, listActiveProjects } = require("../services/gcpRecommenderAnalysis")

const GCP_PROVIDER = "GCP"

function log(level, endpoint, message, data = null) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

// Integration lookup (same pattern as Slack, case-insensitive fallback)
async function getIntegrationForUser(user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }

  let { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", GCP_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) {
    const { data: all } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
    if (all) {
      integration = all.find((i) => i.provider?.toLowerCase() === "gcp")
    }
  }

  if (!integration) {
    return { error: "GCP integration not configured for this company", status: 400 }
  }
  return { integration, companyId: profile.company_id }
}

// Decrypt and return { serviceAccountKey: object, organizationId: string }
// Throws on decryption / parse failure.
function getCredentialsFromIntegration(integration) {
  const settings = decryptIntegrationSettings(integration.settings || {})
  const rawKey = settings.service_account_key
  const organizationId = settings.organization_id
  if (!rawKey || !organizationId) {
    const err = new Error("GCP integration is missing service_account_key or organization_id")
    err.code = "SA_NOT_CONFIGURED"
    throw err
  }
  // rawKey may have been stored as a JSON string originally — parseServiceAccountKey handles both
  const serviceAccountKey = parseServiceAccountKey(rawKey)
  return { serviceAccountKey, organizationId }
}

// --- handlers below, added in subsequent tasks ---

module.exports = {
  validateGcp:           async (req, res) => res.status(501).json({ error: "not implemented" }),
  getGcpStatus:          async (req, res) => res.status(501).json({ error: "not implemented" }),
  getGcpProjects:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  analyzeGcpCostLeaks:   async (req, res) => res.status(501).json({ error: "not implemented" }),
  disconnectGcp:         async (req, res) => res.status(501).json({ error: "not implemented" }),
}
```

- [ ] **Step 2: Verify file loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "const c = require('./src/controllers/gcpController'); console.log(Object.keys(c).sort());"
```

Expected: `[ 'analyzeGcpCostLeaks', 'disconnectGcp', 'getGcpProjects', 'getGcpStatus', 'validateGcp' ]`

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/gcpController.js
git commit -m "feat(gcp): add controller scaffolding and helpers

Integration lookup (case-insensitive), credential decryption,
and 501 placeholders for handlers added in subsequent tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Validate + getStatus handlers

**Files:**
- Modify: `backend/src/controllers/gcpController.js`

The validate endpoint hits token exchange + `projects.list` and marks the integration `connected`. Status endpoint wraps validate with an additional "return the connection state without mutating" branch.

- [ ] **Step 1: Insert handlers above `module.exports`**

```js
// Validate — performs token exchange + projects.list, marks connected on success
async function validateGcp(req, res) {
  const endpoint = "POST /api/integrations/gcp/validate"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })
  const { integration } = result

  let credentials
  try {
    credentials = getCredentialsFromIntegration(integration)
  } catch (e) {
    log("error", endpoint, `Credentials error: ${e.message}`)
    return res.status(400).json({ error: e.message, code: e.code })
  }

  try {
    const { accessToken } = await exchangeServiceAccountKeyForToken(credentials.serviceAccountKey)
    const projects = await listActiveProjects(accessToken, credentials.organizationId)

    await supabase
      .from("company_integrations")
      .update({ status: "connected" })
      .eq("id", integration.id)

    return res.json({
      success: true,
      organizationId: credentials.organizationId,
      projectCount: projects.length,
    })
  } catch (e) {
    log("error", endpoint, e.message)
    if (e.code === "SA_UNAUTHORIZED" || e.code === "SA_TOKEN_EXCHANGE_FAILED") {
      await supabase
        .from("company_integrations")
        .update({ status: "expired" })
        .eq("id", integration.id)
      return res.status(401).json({
        error: "Service account key is invalid or revoked. Please paste a fresh key.",
        code: e.code,
      })
    }
    if (e.code === "MISSING_ORG_ROLE" || e.status === 403) {
      await supabase
        .from("company_integrations")
        .update({ status: "error" })
        .eq("id", integration.id)
      return res.status(403).json({
        error: e.message,
        code: "MISSING_ORG_ROLE",
      })
    }
    return res.status(500).json({ error: e.message || "Validation failed" })
  }
}

// Status — returns connection state without token exchange
async function getGcpStatus(req, res) {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })
  const { integration } = result

  const settings = decryptIntegrationSettings(integration.settings || {})
  return res.json({
    success: true,
    status: {
      status: integration.status,
      organizationId: settings.organization_id || null,
      updatedAt: integration.updated_at,
      createdAt: integration.created_at,
    },
  })
}
```

- [ ] **Step 2: Update `module.exports` to wire the two handlers**

```js
module.exports = {
  validateGcp,
  getGcpStatus,
  getGcpProjects:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  analyzeGcpCostLeaks:   async (req, res) => res.status(501).json({ error: "not implemented" }),
  disconnectGcp:         async (req, res) => res.status(501).json({ error: "not implemented" }),
}
```

- [ ] **Step 3: Verify file loads**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "const c = require('./src/controllers/gcpController'); console.log('real:', typeof c.validateGcp, typeof c.getGcpStatus); console.log('placeholder:', typeof c.getGcpProjects, typeof c.analyzeGcpCostLeaks, typeof c.disconnectGcp);"
```

Expected: `real: function function` and `placeholder: function function function`

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/gcpController.js
git commit -m "feat(gcp): implement validate and status handlers

validate: exchanges JWT for token, lists projects, updates
integration status. Maps 401 -> expired, 403 -> error, with
specific reconnect messaging. status: read-only state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: getGcpProjects handler

**Files:**
- Modify: `backend/src/controllers/gcpController.js`

- [ ] **Step 1: Insert handler above `module.exports`**

```js
// Projects list — minimum fields for the Data tab
async function getGcpProjects(req, res) {
  const endpoint = "GET /api/integrations/gcp/projects"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  let credentials
  try {
    credentials = getCredentialsFromIntegration(result.integration)
  } catch (e) {
    return res.status(400).json({ error: e.message, code: e.code })
  }

  try {
    const { accessToken } = await exchangeServiceAccountKeyForToken(credentials.serviceAccountKey)
    const projects = await listActiveProjects(accessToken, credentials.organizationId)
    const trimmed = projects.map((p) => ({
      projectId: p.projectId || p.name?.split("/").pop(),
      displayName: p.displayName || p.projectId,
      state: p.state,
      createTime: p.createTime,
    }))
    return res.json({ success: true, projects: trimmed, total: trimmed.length })
  } catch (e) {
    log("error", endpoint, e.message)
    if (e.code === "SA_UNAUTHORIZED") {
      return res.status(401).json({ error: "Token expired — please re-validate", action: "reconnect" })
    }
    if (e.status === 403 || e.code === "FORBIDDEN") {
      return res.status(403).json({
        error: "Service account missing permissions at org level (roles/browser + roles/recommender.viewer required).",
      })
    }
    return res.status(500).json({ error: e.message })
  }
}
```

- [ ] **Step 2: Update `module.exports` to wire getGcpProjects**

```js
module.exports = {
  validateGcp,
  getGcpStatus,
  getGcpProjects,
  analyzeGcpCostLeaks:   async (req, res) => res.status(501).json({ error: "not implemented" }),
  disconnectGcp:         async (req, res) => res.status(501).json({ error: "not implemented" }),
}
```

- [ ] **Step 3: Verify**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "const c = require('./src/controllers/gcpController'); console.log(typeof c.getGcpProjects);"
```

Expected: `function`

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/gcpController.js
git commit -m "feat(gcp): implement getGcpProjects

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Cost-leak analysis endpoint + disconnect

**Files:**
- Modify: `backend/src/controllers/gcpController.js`

- [ ] **Step 1: Insert analysis endpoint + disconnect**

Insert above `module.exports`:

```js
// Analyze GCP cost leaks — frontend persists the returned payload to
// /api/analysis-history, matching the Slack/HubSpot pattern.
async function analyzeGcpCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/gcp/cost-leaks"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  let credentials
  try {
    credentials = getCredentialsFromIntegration(result.integration)
  } catch (e) {
    return res.status(400).json({ error: e.message, code: e.code })
  }

  try {
    const { accessToken } = await exchangeServiceAccountKeyForToken(credentials.serviceAccountKey)
    const analysis = await analyzeGcpCostLeaks({
      accessToken,
      organizationId: credentials.organizationId,
    })

    log("log", endpoint,
      `Analysis completed: ${analysis.summary.issuesFound} findings, $${analysis.summary.potentialMonthlySavings || 0}/mo savings`)
    return res.json(analysis)
  } catch (e) {
    log("error", endpoint, e.message)
    if (e.code === "SA_UNAUTHORIZED") {
      return res.status(401).json({ error: "Token expired — please re-validate", action: "reconnect" })
    }
    if (e.code === "MISSING_ORG_ROLE" || e.status === 403) {
      return res.status(403).json({
        error: e.message,
        code: "MISSING_ORG_ROLE",
      })
    }
    if (e.code === "RATE_LIMITED") {
      return res.status(429).json({ error: `GCP rate limited. Retry in ${e.retryAfter || 30}s.` })
    }
    return res.status(500).json({ error: e.message || "Failed to analyze GCP cost leaks" })
  }
}

// Disconnect — there is no revocation endpoint for a service-account key;
// the customer deletes the key in their GCP console. We clear the stored
// credentials and mark disconnected.
async function disconnectGcp(req, res) {
  const endpoint = "DELETE /api/integrations/gcp/disconnect"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings }
  delete updatedSettings.service_account_key
  delete updatedSettings.organization_id

  const { error: updateError } = await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings, status: "disconnected" })
    .eq("id", integration.id)

  if (updateError) {
    return res.status(500).json({ error: `Failed to disconnect: ${updateError.message}` })
  }
  return res.json({ success: true })
}
```

- [ ] **Step 2: Final `module.exports`**

```js
module.exports = {
  validateGcp,
  getGcpStatus,
  getGcpProjects,
  analyzeGcpCostLeaks: analyzeGcpCostLeaksEndpoint,
  disconnectGcp,
}
```

- [ ] **Step 3: Verify all handlers wired**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "const c = require('./src/controllers/gcpController'); ['validateGcp','getGcpStatus','getGcpProjects','analyzeGcpCostLeaks','disconnectGcp'].forEach(k => console.log(k, typeof c[k]));"
```

Expected: all five end in `function`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/gcpController.js
git commit -m "feat(gcp): implement cost-leak analysis endpoint + disconnect

analyzeGcpCostLeaks returns the shared cost-leak payload; the
frontend handles persistence via /api/analysis-history (matches
Slack pattern). Disconnect clears stored credentials.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Wire routes + add GCP branches to analysisHistoryController

**Files:**
- Modify: `backend/src/routes/index.js`
- Modify: `backend/src/controllers/analysisHistoryController.js`

- [ ] **Step 1: Add GCP controller import to `routes/index.js`**

Find the Slack import block (added in the Slack integration work) and insert AFTER it:

```js
// GCP Controller - Google Cloud Recommender-based cost analysis
const {
  validateGcp,
  getGcpStatus,
  getGcpProjects,
  analyzeGcpCostLeaks,
  disconnectGcp,
} = require("../controllers/gcpController")
```

- [ ] **Step 2: Register GCP routes**

Immediately after the Slack route block in `routes/index.js`, insert:

```js
// GCP routes
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

- [ ] **Step 3: Add `"GCP"` branch to `extractSummary` in `analysisHistoryController.js`**

Find the existing `} else if (provider === "Slack") {` block near line ~410. Insert this block immediately before the closing `}` of the outer `if/else if` chain:

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

- [ ] **Step 4: Add `"GCP"` branch to the duplicate-check in `analysisHistoryController.js`**

Find the existing duplicate-check block (around line ~84, starts with `if (provider === "Fortnox") {`). Its structure is:

```js
if (provider === "Fortnox") {
  duplicateQuery = duplicateQuery
    .eq("parameters->>startDate", params.startDate || null)
    .eq("parameters->>endDate", params.endDate || null)
} else if (provider === "Microsoft365" || provider === "HubSpot" || provider === "GoogleWorkspace" || provider === "Slack") {
  duplicateQuery = duplicateQuery
    .eq("parameters->>inactivityDays", String(params.inactivityDays || 30))
}
```

Add a new `else if` AFTER the existing branches:

```js
  } else if (provider === "GCP") {
    duplicateQuery = duplicateQuery
      .eq("parameters->>organizationId", params.organizationId || "")
  }
```

- [ ] **Step 5: Verify both files load**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/backend"
node -e "const r = require('./src/routes'); console.log('routes ok');"
node -e "const c = require('./src/controllers/analysisHistoryController'); console.log('analysisHistory ok:', typeof c.saveAnalysis);"
```

Expected:
```
routes ok
analysisHistory ok: function
```

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/routes/index.js backend/src/controllers/analysisHistoryController.js
git commit -m "feat(gcp): register GCP routes + history controller branches

Adds 9 /api/integrations/gcp/* routes, plus 'GCP' branches to
extractSummary (for History tab correctness) and to the
duplicate-check (keyed on organizationId).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Frontend

### Task 10: Extend ToolCategory union + create GCP config

**Files:**
- Modify: `frontend/lib/tools/types.ts`
- Create: `frontend/lib/tools/configs/gcp.ts`

- [ ] **Step 1: Add `"Cloud Infrastructure"` to `ToolCategory`**

In `frontend/lib/tools/types.ts`, find the block:

```ts
export type ToolCategory =
  | "Finance"
  | "Productivity"
  | "CRM/Marketing"
  | "E-Commerce"
  | "AI"
  | "Communication"
  | "Other"
```

Replace with:

```ts
export type ToolCategory =
  | "Finance"
  | "Productivity"
  | "CRM/Marketing"
  | "E-Commerce"
  | "AI"
  | "Communication"
  | "Cloud Infrastructure"
  | "Other"
```

- [ ] **Step 2: Create `frontend/lib/tools/configs/gcp.ts`**

```ts
import type { UnifiedToolConfig } from "../types"
import { GcpView } from "@/components/tools/gcp-view"

export const gcpConfig: UnifiedToolConfig = {
  provider: "GCP",
  id: "gcp",
  label: "Google Cloud",
  category: "Cloud Infrastructure",
  description: "Compute, BigQuery, SQL & storage cost analysis",
  brandColor: "#4285F4",
  authType: "serviceAccount",
  authFields: [
    {
      name: "serviceAccountKey",
      label: "Service Account JSON Key",
      type: "textarea",
      required: true,
      placeholder: '{"type":"service_account","project_id":"...","private_key":"..."}',
      hint: "Paste the full contents of the JSON key file downloaded from Google Cloud Console.",
      validate: (v) => {
        if (!v) return "Required"
        try {
          const parsed = JSON.parse(v)
          if (parsed.type !== "service_account") return "Must be a service account key (type: 'service_account')"
          if (!parsed.client_email || !parsed.private_key) return "Missing client_email or private_key"
          return null
        } catch {
          return "Not valid JSON"
        }
      },
    },
    {
      name: "organizationId",
      label: "Organization ID",
      type: "text",
      required: true,
      placeholder: "organizations/123456789",
      hint: "Find in Google Cloud Console → IAM & Admin → Settings. Format: organizations/<numeric-id>.",
      validate: (v) => {
        if (!v) return "Required"
        return /^organizations\/\d+$/.test(v) ? null : "Format must be: organizations/<numeric-id>"
      },
    },
  ],
  connectEndpoint: "/api/integrations",
  // no oauthStartEndpoint — service-account auth is not OAuth
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "GCP",
        connection_type: "serviceAccount",
        status: "pending",
        settings: {
          service_account_key: values.serviceAccountKey,
          organization_id: values.organizationId,
        },
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "In Google Cloud Console → IAM & Admin → Service Accounts → Create Service Account (name: efficyon-cost-analyzer). Grant no project roles at this step.",
      "Open the service account → Keys → Add Key → Create New Key → JSON. Download the .json file.",
      "In IAM & Admin → IAM at the organization scope, grant this service account the roles: Recommender Viewer (roles/recommender.viewer) AND Browser (roles/browser).",
      "Paste the full contents of the JSON file into the Service Account JSON Key field.",
      "Find your Organization ID in IAM & Admin → Settings → Organization ID, and enter it (format: organizations/<numeric>).",
      "After connecting, click the Google Cloud tool in the dashboard to trigger validation.",
    ],
    note: "Requires org-level IAM admin to grant the two roles.",
  },
  endpoints: [
    { key: "projects", path: "/api/integrations/gcp/projects", pick: ["projects"], fallback: [] },
    { key: "status", path: "/api/integrations/gcp/status", pick: ["status"] },
  ],
  defaultTab: "projects",
  viewComponent: GcpView,
  connectingToast: "Saving service account key…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To fully revoke access, delete the service account key in Google Cloud Console → IAM & Admin → Service Accounts → (your service account) → Keys.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/gcp/cost-leaks",
  analysisSupportsInactivity: false,
}
```

- [ ] **Step 3: Verify compiles**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -E "gcp|Cloud Infrastructure" | head -20
```

Expected: no output (meaning no GCP-related type errors). Pre-existing errors in unrelated files are acceptable per CLAUDE.md.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/types.ts frontend/lib/tools/configs/gcp.ts
git commit -m "feat(gcp): add Cloud Infrastructure category + GCP UnifiedToolConfig

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Create GCP data-tab view component

**Files:**
- Create: `frontend/components/tools/gcp-view.tsx`

- [ ] **Step 1: Create view file**

Path: `frontend/components/tools/gcp-view.tsx`

```tsx
"use client"

import { useMemo, useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type GcpProject = {
  projectId: string
  displayName?: string
  state?: string
  createTime?: string
}

type GcpStatus = {
  status?: string
  organizationId?: string | null
  updatedAt?: string
}

type InfoShape = {
  projects?: GcpProject[]
  status?: GcpStatus | null
}

type Filter = "all" | "active"

function formatDate(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

function statusBadge(state?: string) {
  if (!state) return <Badge variant="outline">Unknown</Badge>
  if (state === "ACTIVE") return <Badge>Active</Badge>
  if (state === "DELETE_REQUESTED" || state === "DELETE_IN_PROGRESS") return <Badge variant="destructive">Deleting</Badge>
  return <Badge variant="secondary">{state}</Badge>
}

export function GcpView({ info }: ToolViewProps) {
  const data = (info ?? {}) as InfoShape
  const projects = data.projects ?? []
  const status = data.status ?? null
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      if (filter === "active" && p.state !== "ACTIVE") return false
      if (!q) return true
      return (
        p.projectId?.toLowerCase().includes(q) ||
        p.displayName?.toLowerCase().includes(q)
      )
    })
  }, [projects, filter, query])

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">
          No GCP projects loaded. Ensure the service account has <code>roles/browser</code> at the organization level, then reload.
        </CardContent>
      </Card>
    )
  }

  const activeCount = projects.filter((p) => p.state === "ACTIVE").length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Organization ID</div>
            <div className="font-medium truncate">{status?.organizationId ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total projects</div>
            <div className="font-medium">{projects.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active projects</div>
            <div className="font-medium">{activeCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last synced</div>
            <div className="font-medium">{formatDate(status?.updatedAt)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "active"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-sm border ${filter === f ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {f}
          </button>
        ))}
        <Input
          placeholder="Search project id or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Project ID</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">State</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.projectId} className="border-b hover:bg-muted/40">
                  <td className="p-3 font-mono">{p.projectId}</td>
                  <td className="p-3 text-muted-foreground">{p.displayName ?? "—"}</td>
                  <td className="p-3">{statusBadge(p.state)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(p.createTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default GcpView
```

- [ ] **Step 2: Verify compiles**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -i "gcp-view" | head -20
```

Expected: no output relating to `gcp-view.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/components/tools/gcp-view.tsx
git commit -m "feat(gcp): add GcpView data-tab component

Organization summary card (org id, project counts, last sync),
filter chips (all / active), search, and a project table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Register GCP in TOOL_REGISTRY and add brand logo

**Files:**
- Modify: `frontend/lib/tools/registry.ts`
- Modify: `frontend/components/tools/tool-logos.tsx`

- [ ] **Step 1: Add GCP to registry**

In `frontend/lib/tools/registry.ts`, add this import alongside the others (after the `slackConfig` import added previously):

```ts
import { gcpConfig } from "./configs/gcp"
```

Update `TOOL_REGISTRY` to include GCP:

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
}
```

- [ ] **Step 2: Add GCP brand logo**

In `frontend/components/tools/tool-logos.tsx`, find the existing `slack` entry in `TOOL_BRANDS`. After it (before the closing `}` of the `TOOL_BRANDS` object), add:

```ts
  gcp: {
    color: "#4285F4",
    // Simplified "GCP" hex-cloud mark using the Google 4-color palette.
    path: (
      <>
        <path
          fill="#4285F4"
          d="M12 2L2 7.5v9L12 22l10-5.5v-9L12 2zm0 2.3l7.7 4.3-7.7 4.2-7.7-4.2L12 4.3z"
        />
        <path
          fill="#EA4335"
          d="M12 4.3L4.3 8.6l1.9 1L12 6.5z"
        />
        <path
          fill="#FBBC05"
          d="M12 6.5v4.3l-5.8-3.2z"
        />
        <path
          fill="#34A853"
          d="M19.7 8.6L12 4.3v2.2l5.8 3.1z"
        />
      </>
    ),
  },
}
```

Note: the closing `}` shown at the end of the snippet above replaces the existing final `}` of the `TOOL_BRANDS` object. If your editor detects two closing braces, delete the old one.

- [ ] **Step 3: Verify compiles**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2/frontend"
npx tsc --noEmit 2>&1 | grep -iE "registry|tool-logos" | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/registry.ts frontend/components/tools/tool-logos.tsx
git commit -m "feat(gcp): register GCP in TOOL_REGISTRY and add brand logo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — End-to-End Verification

### Task 13: Manual E2E against a real GCP sandbox organization

This is the verification step; no test runner is available per CLAUDE.md.

- [ ] **Step 1: Apply the migration to Supabase**

```bash
# via Supabase CLI or psql:
psql "$SUPABASE_DB_URL" -f backend/sql/043_gcp_provider.sql
```

Verify:
```bash
psql "$SUPABASE_DB_URL" -c "\
  SELECT pg_get_constraintdef(c.oid) \
  FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid \
  WHERE t.relname = 'cost_leak_analyses' AND c.conname = 'valid_provider';"
```

Expected: output includes `'GCP'` in the IN list.

- [ ] **Step 2: Create a sandbox GCP org + service account**

1. Pick any sandbox org (or create a new Google Cloud project nested under your existing org).
2. IAM & Admin → Service Accounts → Create Service Account: `efficyon-cost-analyzer`.
3. Keys → Add Key → Create New Key → JSON → download file.
4. IAM & Admin → IAM at the organization scope → grant `efficyon-cost-analyzer@...iam.gserviceaccount.com` these roles: `Recommender Viewer` and `Browser`.
5. Note the Organization ID from IAM & Admin → Settings.

- [ ] **Step 3: Start dev servers and run the flow**

```bash
# Terminal 1
cd backend && npm run dev
# Terminal 2
cd frontend && npm run dev
```

At http://localhost:3000/dashboard/tools:

- [ ] Click **Add integration** → select **Google Cloud**.
- [ ] Paste the full JSON key contents into the Service Account JSON Key field.
- [ ] Paste the org ID in format `organizations/<numeric>` into the Organization ID field.
- [ ] Click **Connect** → integration row created with status `pending`.
- [ ] Click the GCP tool in the dashboard → auto-loads projects → integration transitions to `connected`.
- [ ] Overview tab shows org ID + project count.
- [ ] Data tab shows the project list with states and created-at.
- [ ] Switch to Analysis tab → click **Run Analysis**.
- [ ] Within 60s, findings appear. At minimum, verify:
  - [ ] Total savings is a positive number (or zero if the org is pristine)
  - [ ] Findings are grouped by severity
  - [ ] Each finding shows project + resource name + action steps
- [ ] Switch to History tab → the run appears with correct finding count and savings (not zeros — that would indicate the `extractSummary` branch is wrong).
- [ ] Re-run Analysis → observe a 409 duplicate response (same orgId param).
- [ ] In Supabase SQL editor:
  ```sql
  SELECT provider, summary->>'totalPotentialSavings' AS savings, summary->>'totalFindings' AS findings
  FROM cost_leak_analyses WHERE provider = 'GCP'
  ORDER BY created_at DESC LIMIT 1;
  ```
  Expected: one row with matching values.
- [ ] Delete one of the IAM roles on the service account → run analysis → observe 403 with the "grant roles/browser / roles/recommender.viewer" error.
- [ ] Restore the roles.
- [ ] Disconnect → status transitions to `disconnected`, `service_account_key` cleared in settings.
- [ ] Reconnect → clean state.

- [ ] **Step 4: Record verification notes (optional)**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
mkdir -p docs/superpowers/verification
# drop screenshots / notes here
git add docs/superpowers/verification/
git commit -m "chore(gcp): E2E verification notes"
```

If no notes taken, skip.

---

## Final Checklist

- [ ] Task 1: `gcpAuth.js` utility built and verified
- [ ] Task 2: `gcpRecommenderCatalog.js` catalog built
- [ ] Task 3: `gcpRecommenderAnalysis.js` service built and fixture-verified
- [ ] Task 4: Migration `043_gcp_provider.sql` created (apply deferred to user)
- [ ] Task 5: Controller scaffolding
- [ ] Task 6: `validateGcp` + `getGcpStatus`
- [ ] Task 7: `getGcpProjects`
- [ ] Task 8: `analyzeGcpCostLeaks` + `disconnectGcp`
- [ ] Task 9: Routes wired + analysisHistoryController branches
- [ ] Task 10: `ToolCategory` extended + frontend config
- [ ] Task 11: `GcpView` component
- [ ] Task 12: Registry entry + brand logo
- [ ] Task 13: Full E2E verification against a real GCP sandbox
