# Slack Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Slack as the 7th data-source cost-leak integration, detecting inactive billable seats with a configurable inactivity threshold.

**Architecture:** Clones the HubSpot / Google Workspace pattern. BYO Slack app OAuth, single-workspace, 3 user-token scopes, seats-based savings calc. No changes to dashboard page, tabs, or analysis history controllers — they are config-driven.

**Tech Stack:** Backend — Express 5, CommonJS, Supabase (Postgres). Frontend — Next.js 16, React 19, TypeScript, Tailwind v4. Auth — NextAuth on frontend, JWT middleware on backend.

**Reference spec:** [`docs/superpowers/specs/2026-04-17-slack-integration-design.md`](../specs/2026-04-17-slack-integration-design.md)

**Note on testing:** Per `CLAUDE.md`, this repo has no test runner. Verification is manual (node REPL for pure functions, dev server + curl / browser for integrated flows). Tasks below specify exact verification steps instead of pytest/jest.

**One minor spec correction:** the spec shows `POST /api/integrations/slack/cost-leaks`, but the existing cost-leak endpoints (HubSpot, Shopify, QuickBooks, Microsoft 365, Google Workspace) are all `GET`. This plan uses `GET` for consistency. Pure style; no functional difference.

---

## Phase 1 — Pure Backend Modules (No External Dependencies)

### Task 1: Slack pricing utility

**Files:**
- Create: `backend/src/utils/slackPricing.js`

- [ ] **Step 1: Create pricing util file**

Path: `backend/src/utils/slackPricing.js`

```js
/**
 * Slack Pricing Utility
 * Based on official Slack pricing (annual-billing rates in USD/month).
 * Source: https://slack.com/pricing (as of 2026-04).
 * `team.info.plan` returns short codes: 'free', 'std' (Pro), 'plus' (Business+), 'compass' (Enterprise Grid).
 */

const SLACK_PLAN_RATES = {
  free:     { perSeat: 0,     label: "Free",                billable: false, supported: true  },
  standard: { perSeat: 8.75,  label: "Pro (annual)",        billable: true,  supported: true  }, // "std"
  plus:     { perSeat: 15.00, label: "Business+ (annual)",  billable: true,  supported: true  },
  compass:  { perSeat: null,  label: "Enterprise Grid",     billable: true,  supported: false }, // v1 unsupported
}

// Slack's team.info returns "std" not "standard"; map both.
const PLAN_ALIASES = {
  std: "standard",
  standard: "standard",
  plus: "plus",
  free: "free",
  compass: "compass",
}

function normalizePlanKey(rawPlan) {
  if (!rawPlan) return null
  const lower = String(rawPlan).toLowerCase()
  return PLAN_ALIASES[lower] || null
}

function getPerSeatCost(planKey) {
  const normalized = normalizePlanKey(planKey)
  if (!normalized) return 0
  const plan = SLACK_PLAN_RATES[normalized]
  return plan && typeof plan.perSeat === "number" ? plan.perSeat : 0
}

function calculatePotentialSavings(inactiveCount, planKey) {
  const normalized = normalizePlanKey(planKey)
  if (!normalized) return null
  const plan = SLACK_PLAN_RATES[normalized]
  if (!plan || !plan.supported || !plan.billable) return null
  if (!inactiveCount || inactiveCount <= 0) return 0
  return inactiveCount * plan.perSeat
}

function getPricingDisplayInfo(planKey, billableSeats = 0) {
  const normalized = normalizePlanKey(planKey) || "free"
  const plan = SLACK_PLAN_RATES[normalized] || SLACK_PLAN_RATES.free
  const perSeat = plan.perSeat || 0
  return {
    planKey: normalized,
    label: plan.label,
    perSeat,
    monthlyCost: perSeat * (billableSeats || 0),
    billable: plan.billable,
    supported: plan.supported,
  }
}

module.exports = {
  SLACK_PLAN_RATES,
  normalizePlanKey,
  getPerSeatCost,
  calculatePotentialSavings,
  getPricingDisplayInfo,
}
```

- [ ] **Step 2: Verify with node REPL**

Run from repo root:

```bash
cd backend
node -e "const p = require('./src/utils/slackPricing'); \
  console.log('Pro per seat:', p.getPerSeatCost('std')); \
  console.log('Free savings (5 inactive):', p.calculatePotentialSavings(5, 'free')); \
  console.log('Plus savings (3 inactive):', p.calculatePotentialSavings(3, 'plus')); \
  console.log('Grid savings (3 inactive):', p.calculatePotentialSavings(3, 'compass')); \
  console.log('Display Pro:', p.getPricingDisplayInfo('std', 10));"
```

Expected output:
```
Pro per seat: 8.75
Free savings (5 inactive): null
Plus savings (3 inactive): 45
Grid savings (3 inactive): null
Display Pro: { planKey: 'standard', label: 'Pro (annual)', perSeat: 8.75, monthlyCost: 87.5, billable: true, supported: true }
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/utils/slackPricing.js
git commit -m "$(cat <<'EOF'
feat(slack): add pricing utility with plan code normalization

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Slack cost-leak analysis service

**Files:**
- Create: `backend/src/services/slackCostLeakAnalysis.js`

- [ ] **Step 1: Create the service file**

Path: `backend/src/services/slackCostLeakAnalysis.js`

```js
/**
 * Slack Cost Leak Analysis Service
 * Detects inactive billable seats, deactivated-but-billed users, and
 * multi-channel guest waste in a Slack workspace.
 *
 * "Last active" is approximated from `user.updated` — Slack does not expose
 * a first-class activity timestamp on non-Enterprise plans. Profile edits,
 * presence events, and channel joins bump this value, so for 30/60/90-day
 * windows it's a reasonable proxy. Documented limitation.
 */

const crypto = require("crypto")
const {
  getPerSeatCost,
  calculatePotentialSavings,
  getPricingDisplayInfo,
  normalizePlanKey,
} = require("../utils/slackPricing")

const SECONDS_PER_DAY = 86400

function generateFindingHash(finding) {
  const users = (finding.affectedUsers || []).map((u) => u.id).sort().join(",")
  const key = `${finding.type}:${users}`
  return crypto.createHash("md5").update(key).digest("hex")
}

function daysSinceUnix(unixSeconds) {
  if (!unixSeconds) return Infinity
  const now = Math.floor(Date.now() / 1000)
  return Math.floor((now - Number(unixSeconds)) / SECONDS_PER_DAY)
}

// Is this user someone we'd bill a paid seat for?
function isCountableMember(user) {
  if (!user) return false
  if (user.is_bot) return false
  if (user.id === "USLACKBOT") return false
  if (user.deleted) return false
  if (user.is_ultra_restricted) return false // single-channel guests usually free
  return true
}

// Cross-reference with billableInfo map { [userId]: { billing_active } }
function isBillable(userId, billableInfo) {
  if (!billableInfo) return null // unknown — caller should handle fallback
  const entry = billableInfo[userId]
  return entry ? entry.billing_active === true : false
}

/**
 * Main entry point.
 *
 * @param {Object} opts
 * @param {Array}  opts.users           - from users.list
 * @param {Object} opts.billableInfo    - from team.billableInfo (may be null)
 * @param {Object} opts.teamInfo        - from team.info { id, name, domain, plan }
 * @param {number} opts.inactivityDays  - default 30
 * @param {string} [opts.overridePlan]  - user-supplied override (e.g. "standard")
 * @param {number} [opts.overrideSeats] - user-supplied override paid seat count
 * @returns {Object} { findings, summary, users, pricing }
 */
function analyzeSlackCostLeaks(opts) {
  const {
    users = [],
    billableInfo = null,
    teamInfo = {},
    inactivityDays = 30,
    overridePlan = null,
    overrideSeats = null,
  } = opts

  const rawPlan = overridePlan || teamInfo.plan
  const planKey = normalizePlanKey(rawPlan) || "free"
  const findings = []

  // Short-circuit unsupported plans — return a single info finding, no savings.
  if (planKey === "free" || planKey === "compass") {
    const info = {
      type: "UNSUPPORTED_PLAN",
      severity: "info",
      title: planKey === "free"
        ? "You're on Slack Free — no paid seats to audit"
        : "Slack Enterprise Grid is not supported in v1",
      description: planKey === "free"
        ? "Slack Free plans do not charge per seat, so there are no recoverable savings."
        : "Enterprise Grid requires admin-level API scopes. Support is planned for a future release.",
      affectedUsers: [],
      recommendation: planKey === "free"
        ? "Upgrade and reconnect later if you want seat-waste monitoring."
        : "Contact support when Enterprise Grid support ships.",
      actionSteps: [],
      effort: "low",
      impact: "low",
    }
    info.findingHash = generateFindingHash(info)
    findings.push(info)

    return {
      findings,
      summary: {
        totalUsers: users.length,
        billableSeats: 0,
        inactiveCount: 0,
        issuesFound: 0,
        potentialMonthlySavings: null,
        potentialAnnualSavings: null,
        healthScore: 100,
        inactivityThreshold: inactivityDays,
        planKey,
        planLabel: getPricingDisplayInfo(planKey).label,
      },
      users: [],
      pricing: getPricingDisplayInfo(planKey, 0),
      billableSource: "unsupported",
    }
  }

  // Billable fallback: if team.billableInfo missing, approximate as
  // "every countable member is billable". Flag so the UI can warn.
  let billableSource = "team.billableInfo"
  if (!billableInfo) {
    billableSource = "fallback-countable-members"
  }

  const countableMembers = users.filter(isCountableMember)

  // Compute billable count
  let billableUserIds
  if (billableInfo) {
    billableUserIds = Object.entries(billableInfo)
      .filter(([, info]) => info && info.billing_active === true)
      .map(([id]) => id)
  } else {
    billableUserIds = countableMembers.map((u) => u.id)
  }
  const billableSeatCount = overrideSeats && overrideSeats > 0
    ? overrideSeats
    : billableUserIds.length

  // Build enriched user list for response
  const enrichedUsers = users.map((u) => {
    const billable = isBillable(u.id, billableInfo)
    const days = daysSinceUnix(u.updated)
    return {
      id: u.id,
      name: u.real_name || u.name,
      email: u.profile?.email || null,
      is_bot: !!u.is_bot,
      deleted: !!u.deleted,
      is_restricted: !!u.is_restricted,
      is_ultra_restricted: !!u.is_ultra_restricted,
      updated: u.updated || null,
      daysSinceUpdated: days === Infinity ? null : days,
      billable: billable === null
        ? (isCountableMember(u) ? "unknown" : false)
        : billable,
    }
  })

  // Finding 1 — INACTIVE_BILLABLE_SEAT
  const inactiveBillable = users.filter((u) => {
    if (!isCountableMember(u)) return false
    const billable = billableInfo ? isBillable(u.id, billableInfo) : true
    if (!billable) return false
    return daysSinceUnix(u.updated) > inactivityDays
  })

  if (inactiveBillable.length > 0) {
    const finding = {
      type: "INACTIVE_BILLABLE_SEAT",
      severity: inactiveBillable.length > 5 ? "high" : "medium",
      title: `${inactiveBillable.length} Inactive Billable Slack Seat${inactiveBillable.length > 1 ? "s" : ""}`,
      description: `${inactiveBillable.length} billable user${inactiveBillable.length > 1 ? "s have" : " has"} no profile activity for ${inactivityDays}+ days.`,
      affectedUsers: inactiveBillable.map((u) => ({
        id: u.id,
        email: u.profile?.email || null,
        name: u.real_name || u.name,
        daysSinceUpdated: daysSinceUnix(u.updated),
      })),
      recommendation: "Deactivate these users in Slack to stop paying for seats nobody uses.",
      actionSteps: [
        "Open Slack > Workspace Settings > Manage Members",
        "For each user below, confirm with their manager that they no longer need Slack access",
        "Click 'Deactivate account' for confirmed inactive users",
        "Your next invoice will reflect the lower seat count",
      ],
      effort: "low",
      impact: inactiveBillable.length > 5 ? "high" : "medium",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  }

  // Finding 2 — DEACTIVATED_BUT_BILLABLE (data-lag bug)
  const deactivatedButBilled = users.filter((u) => {
    if (!u.deleted) return false
    if (!billableInfo) return false
    return isBillable(u.id, billableInfo) === true
  })

  if (deactivatedButBilled.length > 0) {
    const finding = {
      type: "DEACTIVATED_BUT_BILLABLE",
      severity: "critical",
      title: `${deactivatedButBilled.length} Deactivated User${deactivatedButBilled.length > 1 ? "s" : ""} Still Marked Billable`,
      description: "These users are deactivated in Slack but team.billableInfo still lists them as billing-active. Contact Slack billing to reconcile.",
      affectedUsers: deactivatedButBilled.map((u) => ({
        id: u.id,
        email: u.profile?.email || null,
        name: u.real_name || u.name,
      })),
      recommendation: "Contact Slack support and reference `team.billableInfo` vs user.deleted discrepancy.",
      actionSteps: [
        "Copy the user IDs listed below",
        "Open a Slack support ticket referencing 'deactivated user still in team.billableInfo'",
        "Ask for the billable seat count to be reconciled and invoice adjusted if already charged",
      ],
      effort: "medium",
      impact: "high",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  }

  // Finding 3 — MULTI_CHANNEL_GUEST_BILLABLE
  const multiChannelGuestsBillable = users.filter((u) => {
    if (!u.is_restricted || u.is_ultra_restricted) return false
    if (u.deleted) return false
    return billableInfo ? isBillable(u.id, billableInfo) === true : true
  })

  if (multiChannelGuestsBillable.length > 0) {
    const finding = {
      type: "MULTI_CHANNEL_GUEST_BILLABLE",
      severity: "medium",
      title: `${multiChannelGuestsBillable.length} Multi-Channel Guest${multiChannelGuestsBillable.length > 1 ? "s" : ""} Billed as Full Seat${multiChannelGuestsBillable.length > 1 ? "s" : ""}`,
      description: "Multi-channel guests are billable on Business+. Review whether they need multi-channel access or can be converted to single-channel guests (usually free).",
      affectedUsers: multiChannelGuestsBillable.map((u) => ({
        id: u.id,
        email: u.profile?.email || null,
        name: u.real_name || u.name,
      })),
      recommendation: "Convert to single-channel guests where possible, or remove if no longer collaborating.",
      actionSteps: [
        "Open Slack > Workspace Settings > Manage Members",
        "Filter to 'Guests'",
        "For each multi-channel guest below, decide: convert to single-channel, or remove",
      ],
      effort: "low",
      impact: "medium",
    }
    finding.findingHash = generateFindingHash(finding)
    findings.push(finding)
  }

  // Savings calc
  const potentialMonthlySavings = calculatePotentialSavings(inactiveBillable.length, planKey) || 0
  const potentialAnnualSavings = potentialMonthlySavings * 12

  // Health score: 100 - (inactive/billable ratio × 100)
  const healthScore = billableSeatCount > 0
    ? Math.max(0, Math.round(100 - (inactiveBillable.length / billableSeatCount) * 100))
    : 100

  return {
    findings,
    summary: {
      totalUsers: users.length,
      billableSeats: billableSeatCount,
      inactiveCount: inactiveBillable.length,
      issuesFound: findings.length,
      potentialMonthlySavings,
      potentialAnnualSavings,
      healthScore,
      inactivityThreshold: inactivityDays,
      planKey,
      planLabel: getPricingDisplayInfo(planKey).label,
    },
    users: enrichedUsers,
    pricing: getPricingDisplayInfo(planKey, billableSeatCount),
    billableSource,
  }
}

module.exports = {
  analyzeSlackCostLeaks,
  generateFindingHash,
  isCountableMember,
  isBillable,
  daysSinceUnix,
}
```

- [ ] **Step 2: Verify with node REPL**

From repo root, run a fixture test:

```bash
cd backend
node -e "
const { analyzeSlackCostLeaks } = require('./src/services/slackCostLeakAnalysis');
const now = Math.floor(Date.now()/1000);
const days = (n) => now - n*86400;
const users = [
  { id: 'U1', name: 'active',   real_name: 'Active User',   updated: days(2),  profile: { email: 'a@x' } },
  { id: 'U2', name: 'stale',    real_name: 'Stale User',    updated: days(60), profile: { email: 'b@x' } },
  { id: 'U3', name: 'bot',      is_bot: true, updated: days(1) },
  { id: 'U4', name: 'deleted',  deleted: true, updated: days(400), profile: { email: 'd@x' } },
  { id: 'U5', name: 'guest',    is_restricted: true, updated: days(1), profile: { email: 'g@x' } },
  { id: 'U6', name: 'sc-guest', is_restricted: true, is_ultra_restricted: true, updated: days(1) },
];
const billable = {
  U1: { billing_active: true },
  U2: { billing_active: true },
  U4: { billing_active: true },
  U5: { billing_active: true },
};
const out = analyzeSlackCostLeaks({
  users,
  billableInfo: billable,
  teamInfo: { plan: 'std' },
  inactivityDays: 30,
});
console.log(JSON.stringify(out.findings.map(f => ({ type: f.type, n: f.affectedUsers.length })), null, 2));
console.log('summary:', out.summary);
"
```

Expected output (order may vary):
```
[
  { type: 'INACTIVE_BILLABLE_SEAT',        n: 1 },   // U2
  { type: 'DEACTIVATED_BUT_BILLABLE',      n: 1 },   // U4
  { type: 'MULTI_CHANNEL_GUEST_BILLABLE',  n: 1 }    // U5
]
summary: {
  totalUsers: 6,
  billableSeats: 4,
  inactiveCount: 1,
  issuesFound: 3,
  potentialMonthlySavings: 8.75,
  potentialAnnualSavings: 105,
  healthScore: 75,
  inactivityThreshold: 30,
  planKey: 'standard',
  planLabel: 'Pro (annual)'
}
```

Also verify Free-plan short-circuit:

```bash
node -e "
const { analyzeSlackCostLeaks } = require('./src/services/slackCostLeakAnalysis');
const out = analyzeSlackCostLeaks({ users: [], teamInfo: { plan: 'free' }, inactivityDays: 30 });
console.log(out.findings[0].type, out.summary.potentialMonthlySavings);
"
```

Expected: `UNSUPPORTED_PLAN null`

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/services/slackCostLeakAnalysis.js
git commit -m "$(cat <<'EOF'
feat(slack): add cost-leak analysis service

Detects INACTIVE_BILLABLE_SEAT, DEACTIVATED_BUT_BILLABLE, and
MULTI_CHANNEL_GUEST_BILLABLE findings. Uses user.updated as
last-activity proxy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Database

### Task 3: Migration to allow `Slack` as provider

**Files:**
- Create: `backend/sql/042_slack_provider.sql`

- [ ] **Step 1: Create migration file**

Path: `backend/sql/042_slack_provider.sql`

```sql
-- Allow Slack as a provider for persisted cost-leak analyses.
-- The analyzer in services/slackCostLeakAnalysis.js produces
-- findings in the same shape as HubSpot's, so the existing
-- cost_leak_analyses table is reused via the analysis_history flow.

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
    'Slack'
  ));
```

- [ ] **Step 2: Apply migration to Supabase**

Apply against the project's Supabase database. If using Supabase CLI:

```bash
cd backend
# Option A — Supabase CLI (if configured):
supabase db push

# Option B — psql directly using SUPABASE_DB_URL env var:
psql "$SUPABASE_DB_URL" -f sql/042_slack_provider.sql
```

Expected: `ALTER TABLE` twice, no errors.

- [ ] **Step 3: Verify constraint applied**

```bash
psql "$SUPABASE_DB_URL" -c "\
  SELECT pg_get_constraintdef(c.oid) \
  FROM pg_constraint c \
  JOIN pg_class t ON c.conrelid = t.oid \
  WHERE t.relname = 'cost_leak_analyses' AND c.conname = 'valid_provider';"
```

Expected: constraint body includes `'Slack'` in the `CHECK` IN list.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/sql/042_slack_provider.sql
git commit -m "$(cat <<'EOF'
feat(slack): allow 'Slack' provider in cost_leak_analyses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Backend Controller & Routes

The Slack controller is split into 4 tasks so each diff is reviewable. All 4 tasks target the same file (`backend/src/controllers/slackController.js`) — append as you go.

### Task 4: Controller scaffolding + helpers

**Files:**
- Create: `backend/src/controllers/slackController.js`

- [ ] **Step 1: Create file with imports, logger, rate limiter, helpers**

Path: `backend/src/controllers/slackController.js`

```js
/**
 * Slack Controller
 * Handles Slack integration operations: BYO-app OAuth, users, team info, cost-leak analysis.
 *
 * Slack user tokens do not expire by default — there is no refresh flow.
 * Revocation is via auth.revoke.
 */

const { supabase } = require("../config/supabase")
const { analyzeSlackCostLeaks } = require("../services/slackCostLeakAnalysis")
const { encryptOAuthData, decryptOAuthData, decryptIntegrationSettings } = require("../utils/encryption")

const SLACK_API = "https://slack.com/api"
const SLACK_PROVIDER = "Slack"

// Slack Tier 2 methods (users.list) ~20/min; Tier 1 (team.info) ~100/min.
// We apply a coarse per-token limiter of 15 requests / 60s to stay safely under Tier 2.
const slackRateLimit = new Map()

function log(level, endpoint, message, data = null) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = slackRateLimit.get(accessToken)
  if (!limit || now > limit.resetTime) {
    for (const [k, v] of slackRateLimit) {
      if (now > v.resetTime) slackRateLimit.delete(k)
    }
    slackRateLimit.set(accessToken, { count: 1, resetTime: now + 60000 })
    return { allowed: true }
  }
  if (limit.count >= 15) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return { allowed: false, message: `Slack rate limit exceeded. Please wait ${waitTime}s.` }
  }
  limit.count++
  return { allowed: true }
}

// Call a Slack Web API method. All Slack responses are JSON with { ok: boolean, error?: string }.
async function callSlack(method, accessToken, params = {}) {
  const limit = checkRateLimit(accessToken)
  if (!limit.allowed) throw new Error(limit.message)

  const url = new URL(`${SLACK_API}/${method}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })

  if (!res.ok) {
    throw new Error(`Slack HTTP ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  if (!json.ok) {
    const err = json.error || "unknown_error"
    if (err === "token_revoked" || err === "invalid_auth" || err === "account_inactive") {
      const e = new Error("Slack token invalid or revoked. Please reconnect.")
      e.code = "TOKEN_EXPIRED"
      e.requiresReconnect = true
      throw e
    }
    if (err === "rate_limited") {
      const retryAfter = parseInt(res.headers.get("retry-after") || "30", 10)
      const e = new Error(`Slack rate limited (retry in ${retryAfter}s).`)
      e.code = "RATE_LIMITED"
      throw e
    }
    throw new Error(`Slack API error on ${method}: ${err}`)
  }
  return json
}

// Paginated helper for users.list
async function listAllUsers(accessToken) {
  const users = []
  let cursor = undefined
  let iterations = 0
  do {
    const page = await callSlack("users.list", accessToken, {
      limit: 200,
      cursor,
    })
    users.push(...(page.members || []))
    cursor = page.response_metadata?.next_cursor || ""
    iterations++
    if (iterations > 500) break // hard stop at 100k users
  } while (cursor)
  return users
}

// Lookup the integration row for the current user's company
async function getIntegrationForUser(user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }

  // Exact match first
  let { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", SLACK_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Case-insensitive fallback (matches HubSpot pattern)
  if (!integration) {
    const { data: all } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
    if (all) {
      integration = all.find((i) => i.provider?.toLowerCase() === "slack")
    }
  }

  if (!integration) {
    return { error: "Slack integration not configured for this company", status: 400 }
  }
  return { integration, companyId: profile.company_id }
}

// --- handlers below, added in subsequent tasks ---

module.exports = {
  // OAuth
  startSlackOAuth:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  slackOAuthCallback:     async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Data
  getSlackUsers:          async (req, res) => res.status(501).json({ error: "not implemented" }),
  getSlackTeam:           async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Analysis
  analyzeSlackCostLeaks:  async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Disconnect
  disconnectSlack:        async (req, res) => res.status(501).json({ error: "not implemented" }),
}
```

- [ ] **Step 2: Verify file loads without syntax errors**

```bash
cd backend
node -e "const c = require('./src/controllers/slackController'); console.log(Object.keys(c).sort());"
```

Expected: `[ 'analyzeSlackCostLeaks', 'disconnectSlack', 'getSlackTeam', 'getSlackUsers', 'slackOAuthCallback', 'startSlackOAuth' ]`

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/slackController.js
git commit -m "$(cat <<'EOF'
feat(slack): add controller scaffolding with Slack API helper

Includes per-token rate limiter (15/min), paginated users.list,
and integration lookup helper matching the HubSpot pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: OAuth start + callback handlers

**Files:**
- Modify: `backend/src/controllers/slackController.js` (replace the `startSlackOAuth` and `slackOAuthCallback` placeholders)

- [ ] **Step 1: Replace OAuth placeholders with real handlers**

In `backend/src/controllers/slackController.js`, replace this block:

```js
  startSlackOAuth:        async (req, res) => res.status(501).json({ error: "not implemented" }),
  slackOAuthCallback:     async (req, res) => res.status(501).json({ error: "not implemented" }),
```

…with the full handlers inserted above the `module.exports` block:

```js
// OAuth Start — redirects the browser to Slack's authorize URL
async function startSlackOAuth(req, res) {
  const endpoint = "GET /api/integrations/slack/oauth/start"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })
  const { integration, companyId } = result

  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id || integration?.client_id
  if (!clientId) {
    return res.status(400).json({
      error: "Slack Client ID not configured",
      details: "Update the integration with your Slack app Client ID and Client Secret.",
    })
  }

  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/slack/callback"

  // User-token scopes only (no bot token needed for v1)
  const userScope = "users:read,users:read.email,team:read"

  const authUrl = new URL("https://slack.com/oauth/v2/authorize")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("user_scope", userScope)
  authUrl.searchParams.set("redirect_uri", redirectUri)

  const state = Buffer.from(JSON.stringify({ company_id: companyId })).toString("base64url")
  authUrl.searchParams.set("state", state)

  log("log", endpoint, `Starting Slack OAuth for company ${companyId}`)
  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// OAuth Callback — exchanges code for access_token and persists encrypted
async function slackOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/slack/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  try {
    const { code, state, error, error_description } = req.query
    if (error) {
      log("error", endpoint, `Slack error: ${error} ${error_description || ""}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error&error=${encodeURIComponent(String(error))}`)
    }
    if (!code || !state) {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_missing_code`)
    }

    let decoded
    try {
      decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"))
    } catch {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_invalid_state`)
    }
    const companyId = decoded.company_id

    // Look up the pending integration (case-insensitive)
    const { data: all } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
    const integration = all?.find((i) => i.provider?.toLowerCase() === "slack")
    if (!integration) {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_integration_not_found`)
    }

    const settings = decryptIntegrationSettings(integration.settings || {})
    const clientId = settings.client_id || integration.client_id
    const clientSecret = settings.client_secret || integration.client_secret
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_missing_credentials`)
    }

    const redirectUri =
      process.env.SLACK_REDIRECT_URI ||
      "http://localhost:4000/api/integrations/slack/callback"

    // Exchange code for tokens via oauth.v2.access
    const tokenRes = await fetch(`${SLACK_API}/oauth.v2.access`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: String(code),
      }).toString(),
    })

    const tokenJson = await tokenRes.json()
    if (!tokenJson.ok) {
      log("error", endpoint, `Token exchange failed: ${tokenJson.error}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_token&details=${encodeURIComponent(tokenJson.error || "unknown")}`)
    }

    // Slack v2 returns authed_user.access_token for user scopes
    const userToken = tokenJson.authed_user?.access_token
    if (!userToken) {
      log("error", endpoint, "No authed_user.access_token in response")
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_missing_user_token`)
    }

    const newOauthData = {
      tokens: {
        access_token: userToken,
        // Slack user tokens don't expire; no refresh token flow.
        expires_at: null,
        token_type: "user",
      },
      team: tokenJson.team || null,
      authed_user: { id: tokenJson.authed_user?.id || null },
      scope: tokenJson.authed_user?.scope || "",
    }
    const encryptedOauthData = encryptOAuthData(newOauthData)
    const updatedSettings = { ...(integration.settings || {}), oauth_data: encryptedOauthData }

    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings, status: "connected" })
      .eq("id", integration.id)

    if (updateError) {
      log("error", endpoint, `Failed to save tokens: ${updateError.message}`)
      return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_saving_tokens`)
    }

    log("log", endpoint, `Slack OAuth completed for integration ${integration.id}`)
    return res.redirect(`${frontendUrl}/dashboard/tools?slack=connected`)
  } catch (e) {
    log("error", endpoint, `Unexpected error: ${e.message}`, { stack: e.stack })
    return res.redirect(`${frontendUrl}/dashboard/tools?slack=error_unexpected`)
  }
}
```

And update the `module.exports` block at the bottom of the file:

```js
module.exports = {
  startSlackOAuth,
  slackOAuthCallback,
  // Data
  getSlackUsers:          async (req, res) => res.status(501).json({ error: "not implemented" }),
  getSlackTeam:           async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Analysis
  analyzeSlackCostLeaks:  async (req, res) => res.status(501).json({ error: "not implemented" }),
  // Disconnect
  disconnectSlack:        async (req, res) => res.status(501).json({ error: "not implemented" }),
}
```

- [ ] **Step 2: Verify file still loads**

```bash
cd backend
node -e "const c = require('./src/controllers/slackController'); console.log('OAuth handlers:', typeof c.startSlackOAuth, typeof c.slackOAuthCallback);"
```

Expected: `OAuth handlers: function function`

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/slackController.js
git commit -m "$(cat <<'EOF'
feat(slack): implement BYO-app OAuth start and callback

Uses oauth.v2.access with user_scope (no bot token). Tokens
stored encrypted in settings.oauth_data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: getSlackUsers + getSlackTeam handlers

**Files:**
- Modify: `backend/src/controllers/slackController.js`

- [ ] **Step 1: Add the two data handlers above `module.exports`**

Insert into `backend/src/controllers/slackController.js` above the existing `module.exports`:

```js
// Get enriched user list from the connected Slack workspace
async function getSlackUsers(req, res) {
  const endpoint = "GET /api/integrations/slack/users"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const accessToken = oauthData?.tokens?.access_token
  if (!accessToken) return res.status(400).json({ error: "No access token. Please reconnect Slack." })

  try {
    const members = await listAllUsers(accessToken)
    // Trim to the fields the frontend needs
    const users = members.map((u) => ({
      id: u.id,
      name: u.name,
      real_name: u.real_name,
      email: u.profile?.email || null,
      is_bot: !!u.is_bot,
      deleted: !!u.deleted,
      is_restricted: !!u.is_restricted,
      is_ultra_restricted: !!u.is_ultra_restricted,
      updated: u.updated || null,
    }))
    return res.json({ success: true, users, total: users.length })
  } catch (error) {
    log("error", endpoint, error.message)
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    if (error.code === "RATE_LIMITED") {
      return res.status(429).json({ error: error.message })
    }
    return res.status(500).json({ error: error.message })
  }
}

// Get team info + billable seat map
async function getSlackTeam(req, res) {
  const endpoint = "GET /api/integrations/slack/team"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data)
  const accessToken = oauthData?.tokens?.access_token
  if (!accessToken) return res.status(400).json({ error: "No access token. Please reconnect Slack." })

  try {
    const [teamJson, billableJson] = await Promise.all([
      callSlack("team.info", accessToken),
      // team.billableInfo may not be available on every plan — catch separately
      callSlack("team.billableInfo", accessToken).catch((e) => {
        log("warn", endpoint, `team.billableInfo unavailable: ${e.message}`)
        return null
      }),
    ])

    const teamInfo = teamJson.team
      ? {
          id: teamJson.team.id,
          name: teamJson.team.name,
          domain: teamJson.team.domain,
          plan: teamJson.team.plan || null,
        }
      : null

    return res.json({
      success: true,
      team: teamInfo,
      billableInfo: billableJson?.billable_info || null,
      billableSource: billableJson ? "team.billableInfo" : "unavailable",
    })
  } catch (error) {
    log("error", endpoint, error.message)
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    return res.status(500).json({ error: error.message })
  }
}
```

Update `module.exports` to wire them:

```js
module.exports = {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackUsers,
  getSlackTeam,
  analyzeSlackCostLeaks:  async (req, res) => res.status(501).json({ error: "not implemented" }),
  disconnectSlack:        async (req, res) => res.status(501).json({ error: "not implemented" }),
}
```

- [ ] **Step 2: Verify load**

```bash
cd backend
node -e "const c = require('./src/controllers/slackController'); console.log(typeof c.getSlackUsers, typeof c.getSlackTeam);"
```

Expected: `function function`

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/slackController.js
git commit -m "$(cat <<'EOF'
feat(slack): implement getSlackUsers and getSlackTeam

users.list is paginated via cursor. team.billableInfo is best-
effort — analysis falls back to countable-member heuristic if
it's unavailable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Cost-leak analysis endpoint + disconnect

**Files:**
- Modify: `backend/src/controllers/slackController.js`

- [ ] **Step 1: Add analysis and disconnect handlers**

Insert into `backend/src/controllers/slackController.js` above `module.exports`:

```js
const { saveAnalysis } = require("./analysisHistoryController")
const { analyzeSlackCostLeaks: runAnalysis } = require("../services/slackCostLeakAnalysis")

// Analyze Slack cost leaks — persists to cost_leak_analyses via saveAnalysis
async function analyzeSlackCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/slack/cost-leaks"
  const inactivityDays = parseInt(req.query.inactivityDays, 10) || 30

  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration, companyId } = result
  const settings = decryptIntegrationSettings(integration.settings || {})
  const oauthData = decryptOAuthData(settings.oauth_data || integration.oauth_data)
  const accessToken = oauthData?.tokens?.access_token
  if (!accessToken) return res.status(400).json({ error: "No access token. Please reconnect Slack." })

  const overridePlan = settings.pricing?.tier || null
  const overrideSeats = settings.pricing?.paid_seats || null

  try {
    const [members, teamJson, billableJson] = await Promise.all([
      listAllUsers(accessToken),
      callSlack("team.info", accessToken),
      callSlack("team.billableInfo", accessToken).catch((e) => {
        log("warn", endpoint, `team.billableInfo unavailable: ${e.message}`)
        return null
      }),
    ])

    const analysis = runAnalysis({
      users: members,
      billableInfo: billableJson?.billable_info || null,
      teamInfo: teamJson.team || {},
      inactivityDays,
      overridePlan,
      overrideSeats,
    })

    // Persist to cost_leak_analyses via the shared history controller
    try {
      const saved = await saveAnalysis({
        companyId,
        provider: SLACK_PROVIDER,
        integrationId: integration.id,
        analysis,
        triggeredBy: user.id,
      })
      if (saved?.id) analysis.analysisId = saved.id
    } catch (saveError) {
      log("error", endpoint, `Failed to persist analysis: ${saveError.message}`)
      // Non-fatal — return the analysis anyway so the user sees findings
      analysis.persistenceError = saveError.message
    }

    log("log", endpoint, `Analysis completed: ${analysis.summary.issuesFound} findings, $${analysis.summary.potentialMonthlySavings || 0}/mo savings`)
    return res.json(analysis)
  } catch (error) {
    log("error", endpoint, error.message)
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({ error: error.message, action: "reconnect" })
    }
    if (error.code === "RATE_LIMITED") {
      return res.status(429).json({ error: error.message })
    }
    return res.status(500).json({
      error: error.message || "Failed to analyze Slack cost leaks",
    })
  }
}

// Revoke Slack token (auth.revoke)
async function revokeSlackToken(accessToken) {
  if (!accessToken) return { success: false, error: "No access token" }
  try {
    const res = await fetch(`${SLACK_API}/auth.revoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    const json = await res.json()
    if (json.ok && json.revoked) return { success: true }
    return { success: false, error: json.error || "unknown" }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function disconnectSlack(req, res) {
  const endpoint = "DELETE /api/integrations/slack/disconnect"
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration } = result
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || {})
  const accessToken = oauthData?.tokens?.access_token
  if (accessToken) await revokeSlackToken(accessToken)

  const currentSettings = integration.settings || {}
  const updatedSettings = { ...currentSettings, oauth_data: null }

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

Update the module.exports:

```js
module.exports = {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackUsers,
  getSlackTeam,
  analyzeSlackCostLeaks: analyzeSlackCostLeaksEndpoint,
  disconnectSlack,
}
```

- [ ] **Step 2: Verify file loads and all handlers are functions**

```bash
cd backend
node -e "const c = require('./src/controllers/slackController'); \
  ['startSlackOAuth','slackOAuthCallback','getSlackUsers','getSlackTeam','analyzeSlackCostLeaks','disconnectSlack'] \
    .forEach(k => console.log(k, typeof c[k]));"
```

Expected: all six lines ending in `function`.

- [ ] **Step 3: Verify `saveAnalysis` exists in analysisHistoryController**

```bash
cd backend
node -e "const c = require('./src/controllers/analysisHistoryController'); console.log('saveAnalysis:', typeof c.saveAnalysis);"
```

Expected: `saveAnalysis: function`.

**If not a function**, open `backend/src/controllers/analysisHistoryController.js`, find the exported save method (may be `saveAnalysis`, `persistAnalysis`, or `saveCostLeakAnalysis`) and adjust the `require` line at the top of the analysis block accordingly. Do not invent a function name.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/controllers/slackController.js
git commit -m "$(cat <<'EOF'
feat(slack): implement cost-leak analysis endpoint + disconnect

Persists findings via analysisHistoryController.saveAnalysis.
Disconnect calls Slack auth.revoke and clears oauth_data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Wire routes in `routes/index.js`

**Files:**
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Add Slack controller import**

In `backend/src/routes/index.js`, find the HubSpot controller import block around line 127–135. Immediately after it (before the QuickBooks block), add:

```js
// Slack Controller - Slack OAuth and data operations
const {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackUsers,
  getSlackTeam,
  analyzeSlackCostLeaks,
  disconnectSlack,
} = require("../controllers/slackController")
```

- [ ] **Step 2: Register the seven Slack routes**

In the same file, find the "HubSpot routes" block (around line 362–372). Immediately after the last HubSpot route, add:

```js
// Slack routes
router.get("/api/integrations/slack/oauth/start", requireAuth, requireRole("owner", "editor"), startSlackOAuth)
router.get("/api/integrations/slack/callback", slackOAuthCallback)
router.get("/api/integrations/slack/users", requireAuth, requireRole("owner", "editor", "viewer"), getSlackUsers)
router.get("/api/integrations/slack/team", requireAuth, requireRole("owner", "editor", "viewer"), getSlackTeam)
router.get("/api/integrations/slack/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeSlackCostLeaks)
router.get("/api/integrations/slack/recommendations", requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post("/api/integrations/slack/recommendations/apply", requireAuth, requireRole("owner", "editor"), applyRecommendation)
router.patch("/api/integrations/slack/recommendations/steps", requireAuth, requireRole("owner", "editor"), updateRecommendationSteps)
router.delete("/api/integrations/slack/recommendations/:id", requireAuth, requireRole("owner"), deleteRecommendation)
router.delete("/api/integrations/slack/disconnect", requireAuth, requireRole("owner", "editor"), disconnectSlack)
```

- [ ] **Step 3: Start the backend dev server and verify routes load**

```bash
cd backend
npm run dev
```

Expected: server starts on port 4000 with no errors like "Cannot find module" or "is not a function".

In another terminal:

```bash
curl -sS http://localhost:4000/api/integrations/slack/users
```

Expected response body: `{"error":"Unauthorized"}` (401 without auth — proves the route is registered and middleware is active).

Stop the dev server (`Ctrl+C`) before moving on.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add backend/src/routes/index.js
git commit -m "$(cat <<'EOF'
feat(slack): register Slack routes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Frontend

### Task 9: Create Slack tool config

**Files:**
- Create: `frontend/lib/tools/configs/slack.ts`

- [ ] **Step 1: Create the config file**

Path: `frontend/lib/tools/configs/slack.ts`

```ts
import type { UnifiedToolConfig } from "../types"
import { SlackView } from "@/components/tools/slack-view"

export const slackConfig: UnifiedToolConfig = {
  provider: "Slack",
  id: "slack",
  label: "Slack",
  category: "Communication",
  description: "Users, channels & seat cost analysis",
  brandColor: "#4A154B",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your Slack App Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your Slack App Client Secret" },
    {
      name: "tier",
      label: "Plan Tier",
      type: "select",
      required: false,
      options: [
        { value: "free", label: "Free" },
        { value: "standard", label: "Pro (~$8.75/seat)" },
        { value: "plus", label: "Business+ (~$15/seat)" },
      ],
    },
    {
      name: "paidSeats",
      label: "Paid Seats",
      type: "text",
      required: false,
      placeholder: "Auto-detected after connection",
      validate: (v) => {
        if (!v) return null
        const n = parseInt(v, 10)
        if (isNaN(n) || n < 1) return "Must be a positive integer"
        return null
      },
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/slack/oauth/start",
  buildConnectRequest: (values) => {
    const paidSeats = values.paidSeats ? parseInt(values.paidSeats, 10) : null
    return {
      integrations: [
        {
          tool_name: "Slack",
          connection_type: "oauth",
          status: "pending",
          client_id: values.clientId,
          client_secret: values.clientSecret,
          pricing: {
            tier: values.tier || null,
            ...(paidSeats ? { paid_seats: paidSeats } : {}),
          },
        },
      ],
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to api.slack.com/apps → Create New App → From scratch",
      "Name it (e.g. 'Efficyon Cost Analyzer') and pick your workspace",
      "Under OAuth & Permissions add user-token scopes: users:read, users:read.email, team:read",
      "Add redirect URL: <your-backend>/api/integrations/slack/callback",
      "Copy the Client ID and Client Secret from Basic Information and paste here",
    ],
    note: "Requires a workspace admin. Slack user tokens do not expire — one-time setup.",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/slack/users", pick: ["users"], fallback: [] },
    { key: "team", path: "/api/integrations/slack/team", pick: ["team", "teamInfo"] },
  ],
  defaultTab: "users",
  viewComponent: SlackView,
  connectingToast: "Redirecting to Slack to authorize…",
  tokenRevocation: { automated: true },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/slack/cost-leaks",
  analysisSupportsInactivity: true,
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors relating to `slack.ts`. (Other pre-existing errors in the project are fine — this step only validates your new file.)

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/configs/slack.ts
git commit -m "$(cat <<'EOF'
feat(slack): add Slack UnifiedToolConfig

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Create Slack data-tab view component

**Files:**
- Create: `frontend/components/tools/slack-view.tsx`

- [ ] **Step 1: Create the view component**

Path: `frontend/components/tools/slack-view.tsx`

```tsx
"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SlackUser = {
  id: string
  name?: string
  real_name?: string
  email?: string | null
  is_bot?: boolean
  deleted?: boolean
  is_restricted?: boolean
  is_ultra_restricted?: boolean
  updated?: number | null
}

type SlackTeam = {
  id?: string
  name?: string
  domain?: string
  plan?: string | null
}

type Props = {
  data: {
    users?: SlackUser[]
    team?: SlackTeam | null
    teamInfo?: SlackTeam | null
  }
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  std: "Pro",
  standard: "Pro",
  plus: "Business+",
  compass: "Enterprise Grid",
}

type Filter = "all" | "billable" | "guests" | "bots" | "deleted"

function daysSince(unix?: number | null): number | null {
  if (!unix) return null
  const now = Math.floor(Date.now() / 1000)
  return Math.floor((now - unix) / 86400)
}

function statusBadge(u: SlackUser) {
  if (u.deleted) return <Badge variant="destructive">Deleted</Badge>
  if (u.is_bot) return <Badge variant="secondary">Bot</Badge>
  if (u.is_ultra_restricted) return <Badge variant="outline">Single-channel guest</Badge>
  if (u.is_restricted) return <Badge variant="outline">Multi-channel guest</Badge>
  const d = daysSince(u.updated)
  if (d !== null && d > 30) return <Badge variant="secondary">Inactive {d}d</Badge>
  return <Badge>Active</Badge>
}

function userIsBillableCandidate(u: SlackUser): boolean {
  if (u.is_bot) return false
  if (u.id === "USLACKBOT") return false
  if (u.deleted) return false
  if (u.is_ultra_restricted) return false
  return true
}

export function SlackView({ data }: Props) {
  const users = data.users ?? []
  const team = data.team ?? data.teamInfo ?? null
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (filter === "billable" && !userIsBillableCandidate(u)) return false
      if (filter === "guests" && !(u.is_restricted || u.is_ultra_restricted)) return false
      if (filter === "bots" && !u.is_bot) return false
      if (filter === "deleted" && !u.deleted) return false
      if (!q) return true
      return (
        u.name?.toLowerCase().includes(q) ||
        u.real_name?.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      )
    })
  }, [users, filter, query])

  const billableCount = users.filter(userIsBillableCandidate).length
  const planLabel = team?.plan ? (PLAN_LABEL[team.plan] ?? team.plan) : "Unknown"

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">
          No Slack users loaded. Connect your Slack workspace first.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Workspace</div>
            <div className="font-medium">{team?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Plan</div>
            <div className="font-medium">{planLabel}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total members</div>
            <div className="font-medium">{users.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Billable (est)</div>
            <div className="font-medium">{billableCount}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "billable", "guests", "bots", "deleted"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-sm border ${filter === f ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {f}
          </button>
        ))}
        <Input
          placeholder="Search name or email"
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
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const d = daysSince(u.updated)
                return (
                  <tr key={u.id} className="border-b hover:bg-muted/40">
                    <td className="p-3">{u.real_name || u.name || u.id}</td>
                    <td className="p-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="p-3">{statusBadge(u)}</td>
                    <td className="p-3 text-muted-foreground">
                      {d === null ? "—" : `${d}d ago`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default SlackView
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors in `slack-view.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/components/tools/slack-view.tsx
git commit -m "$(cat <<'EOF'
feat(slack): add SlackView data-tab component

Workspace summary card, status-badged member table, filter chips
(all/billable/guests/bots/deleted), search box.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Register Slack in the tool registry

**Files:**
- Modify: `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Add import and registry entry**

In `frontend/lib/tools/registry.ts`, add the import alongside the others:

```ts
import { slackConfig } from "./configs/slack"
```

Update the `TOOL_REGISTRY` to include `Slack`:

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
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/lib/tools/registry.ts
git commit -m "$(cat <<'EOF'
feat(slack): register Slack in TOOL_REGISTRY

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Add Slack tile to the Add-Integration grid

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx`

- [ ] **Step 1: Locate the tile grid**

In `frontend/app/dashboard/tools/page.tsx`, find the integration-tile list around line 2259 (the block that starts with `{ id: "fortnox", name: "Fortnox", ... }` and ends with `{ id: "googleworkspace", ... }`).

- [ ] **Step 2: Append the Slack tile**

Add this entry as the last element of that array:

```tsx
                  { id: "slack", name: "Slack", desc: "Users, channels & seat cost analysis", category: "Communication", color: "#4A154B" },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual smoke test in browser**

Start both dev servers:

```bash
# Terminal 1
cd backend && npm run dev
# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:3000/dashboard/tools. Click "Add integration". Verify:
- A **Slack** tile appears in the grid with purple brand color
- Category chip shows "Communication"
- Clicking it opens the connect modal with Client ID + Client Secret + Plan Tier + Paid Seats fields

Stop both servers (`Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
git add frontend/app/dashboard/tools/page.tsx
git commit -m "$(cat <<'EOF'
feat(slack): add Slack tile to Add-Integration grid

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — End-to-End Verification

### Task 13: Full manual E2E test against a real Slack workspace

This is the verification step in lieu of an integration test suite.

- [ ] **Step 1: Prepare a Slack test workspace**

1. Create a throwaway workspace at https://slack.com/create (Free tier is fine for the unsupported-plan path test; for the paid-seat path you'll need a Pro trial).
2. Invite 2–3 test users. Leave at least one user inactive (don't log them in).
3. Create a Slack app at https://api.slack.com/apps → **From scratch** → pick the workspace.
4. Under **OAuth & Permissions** add user-token scopes: `users:read`, `users:read.email`, `team:read`.
5. Add redirect URL: `http://localhost:4000/api/integrations/slack/callback`.
6. Copy **Client ID** and **Client Secret** from the app's **Basic Information** page.

- [ ] **Step 2: Set env vars**

Ensure `backend/.env` contains:

```
SLACK_REDIRECT_URI=http://localhost:4000/api/integrations/slack/callback
FRONTEND_APP_URL=http://localhost:3000
```

- [ ] **Step 3: Start dev servers and run the full flow**

```bash
# Terminal 1
cd backend && npm run dev
# Terminal 2
cd frontend && npm run dev
```

Browser checklist at http://localhost:3000/dashboard/tools:

- [ ] Click **Add integration** → select **Slack**
- [ ] Paste Client ID + Client Secret, leave tier/paidSeats blank, click Connect
- [ ] Browser redirects to Slack authorize page → click **Allow**
- [ ] Redirected back to dashboard with `?slack=connected` in the URL
- [ ] Slack appears in the tool list with status "Connected"
- [ ] Click the Slack tool → Data tab shows workspace summary + member table
- [ ] Plan is auto-detected (e.g. "Free" or "Pro")
- [ ] Overview tab shows integration metadata
- [ ] Switch to Analysis tab → click **Run Analysis** (slider at 30d)
- [ ] **On a Free workspace:** you see the `UNSUPPORTED_PLAN` info card with "no paid seats to audit" copy
- [ ] **On a Pro workspace with an inactive user:** you see an `INACTIVE_BILLABLE_SEAT` finding with the user listed and a non-zero `potentialMonthlySavings`
- [ ] Adjust the inactivity slider to 90d → re-run → fewer findings
- [ ] Switch to History tab → the run appears with timestamp + findings count
- [ ] In Supabase SQL editor, run:
  ```sql
  SELECT id, provider, created_at, jsonb_array_length(findings) AS finding_count
  FROM cost_leak_analyses ORDER BY created_at DESC LIMIT 5;
  ```
  and confirm the top row has `provider = 'Slack'`
- [ ] Go to Tools page → click **Disconnect** on Slack
- [ ] In Slack, go to **Apps Management** in your workspace → confirm the app is no longer listed as installed
- [ ] Reconnect from Efficyon → flow completes successfully with no stale data

- [ ] **Step 4: Record verification findings**

Note anything unexpected (e.g. if `team.billableInfo` returned "missing_scope" for a Free workspace, that's fine — the fallback path is exercised).

- [ ] **Step 5: Commit the verification log (optional)**

If you kept screenshots or notes, commit them under `docs/superpowers/verification/`:

```bash
cd "c:/Users/tayaw/Desktop/effycionv2"
mkdir -p docs/superpowers/verification
# drop any artifacts there
git add docs/superpowers/verification/
git commit -m "chore(slack): add E2E verification notes for Slack integration"
```

If no notes were taken, skip this step.

---

## Final Checklist

- [ ] Task 1: Pricing utility built and verified
- [ ] Task 2: Cost-leak analysis service built and fixture-tested
- [ ] Task 3: Migration `042_slack_provider.sql` applied to Supabase
- [ ] Task 4: Controller scaffolding in place
- [ ] Task 5: OAuth start + callback working (verified end-to-end in Task 13)
- [ ] Task 6: `getSlackUsers` + `getSlackTeam` returning live data
- [ ] Task 7: `analyzeSlackCostLeaks` endpoint persists to `cost_leak_analyses`
- [ ] Task 8: Routes registered and reachable via curl
- [ ] Task 9: Frontend config compiles
- [ ] Task 10: `SlackView` renders user table and summary
- [ ] Task 11: Slack present in `TOOL_REGISTRY`
- [ ] Task 12: Slack tile appears on Add-Integration grid
- [ ] Task 13: Full E2E flow succeeds with a real Slack workspace
