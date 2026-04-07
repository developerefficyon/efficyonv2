/**
 * Google Workspace Cost-Leak Analysis Service
 *
 * Independent of microsoft365CostLeakAnalysis.js — different SKU model,
 * different field names from the API, different security signals (e.g.
 * 2-Step Verification is a Google-specific concept).
 *
 * Inputs:
 *   - users           Directory API users.list payload entries
 *   - assignments     License Manager assignments [{ skuId, skuName, userId }]
 *   - lastLoginByUser Map<email, ISO timestamp> from Reports audit
 *
 * Output shape mirrors M365's so the existing recommendations/findings UI
 * can render Google findings the same way (severity, savings, group, etc.),
 * but every analyzer in this file works on Google data only.
 */

const crypto = require("crypto")

// ── Pricing (USD per user per month) ─────────────────────────────────────────
// Source: workspace.google.com/pricing (annual commitment, US). Update as
// Google adjusts list prices. These are reasonable defaults; advanced users
// can later supply their own per-customer rates.
const GOOGLE_WORKSPACE_PRICES = {
  "1010020027": 7.20,  // Business Starter
  "1010020028": 14.40, // Business Standard
  "1010020025": 21.60, // Business Plus
  "1010020026": 23.00, // Enterprise Standard
  "1010020020": 30.00, // Enterprise Plus
  "1010060003": 8.00,  // Frontline
  "Google-Apps-For-Business": 6.00,    // Legacy G Suite Basic
  "Google-Apps-Unlimited": 12.00,      // Legacy G Suite Business
}

const SKU_LABELS = {
  "1010020027": "Business Starter",
  "1010020028": "Business Standard",
  "1010020025": "Business Plus",
  "1010020026": "Enterprise Standard",
  "1010020020": "Enterprise Plus",
  "1010060003": "Frontline",
  "Google-Apps-For-Business": "G Suite Basic (legacy)",
  "Google-Apps-Unlimited": "G Suite Business (legacy)",
}

function priceForSku(skuId) {
  return GOOGLE_WORKSPACE_PRICES[skuId] || 0
}
function labelForSku(skuId, fallback) {
  return SKU_LABELS[skuId] || fallback || skuId
}

// Stable ID for findings — used by the recommendations UI for dismissal/persistence
function generateFindingHash(finding) {
  const key = `${finding.type}::${finding.userEmail || ""}::${finding.skuId || ""}`
  return crypto.createHash("sha1").update(key).digest("hex").slice(0, 16)
}

// ── Analyzer 1: Suspended users still holding licenses ───────────────────────
// Easiest savings — Google bills suspended users as long as a license is
// assigned. This is the #1 finding in most workspace audits.
function analyzeSuspendedWithLicense(users, assignments) {
  const findings = []
  const assignmentsByEmail = new Map()
  for (const a of assignments) {
    const list = assignmentsByEmail.get(a.userId) || []
    list.push(a)
    assignmentsByEmail.set(a.userId, list)
  }

  for (const u of users) {
    if (!u.suspended) continue
    const userAssignments = assignmentsByEmail.get(u.primaryEmail) || []
    if (userAssignments.length === 0) continue

    const monthlySavings = userAssignments.reduce((s, a) => s + priceForSku(a.skuId), 0)
    const annualSavings = monthlySavings * 12

    findings.push({
      id: generateFindingHash({ type: "suspended-licensed", userEmail: u.primaryEmail }),
      type: "suspended-licensed",
      group: "orphaned",
      severity: "high",
      title: `${u.primaryEmail} is suspended but still has ${userAssignments.length} license${userAssignments.length > 1 ? "s" : ""}`,
      description: `User account is suspended in Google Workspace but still consuming paid licenses. Remove the license assignment(s) to stop billing.`,
      userEmail: u.primaryEmail,
      userName: u.name?.fullName || u.primaryEmail,
      skus: userAssignments.map((a) => ({ skuId: a.skuId, name: labelForSku(a.skuId, a.skuName) })),
      potentialSavings: annualSavings,
      potentialMonthlySavings: monthlySavings,
      action: "Unassign license in Google Workspace Admin Console → Billing → Subscriptions",
    })
  }
  return findings
}

// ── Analyzer 2: Inactive users (no recent logins) ────────────────────────────
function analyzeInactiveLicensedUsers(users, assignments, lastLoginByUser, inactivityDays) {
  const findings = []
  const now = Date.now()
  const cutoff = now - inactivityDays * 24 * 60 * 60 * 1000

  const assignmentsByEmail = new Map()
  for (const a of assignments) {
    const list = assignmentsByEmail.get(a.userId) || []
    list.push(a)
    assignmentsByEmail.set(a.userId, list)
  }

  for (const u of users) {
    if (u.suspended) continue // covered by analyzer 1
    const userAssignments = assignmentsByEmail.get(u.primaryEmail) || []
    if (userAssignments.length === 0) continue

    // Prefer Reports audit data when available; fall back to Directory's
    // lastLoginTime which can be stale if the user only uses mobile sync.
    const reportsLast = lastLoginByUser?.[u.primaryEmail]
    const directoryLast = u.lastLoginTime
    const lastLogin = reportsLast || directoryLast
    if (!lastLogin) {
      // Never logged in
      const monthlySavings = userAssignments.reduce((s, a) => s + priceForSku(a.skuId), 0)
      findings.push({
        id: generateFindingHash({ type: "never-logged-in", userEmail: u.primaryEmail }),
        type: "never-logged-in",
        group: "inactive",
        severity: "high",
        title: `${u.primaryEmail} has never logged in`,
        description: `User has a license assigned but no login activity recorded. They may have been provisioned and forgotten.`,
        userEmail: u.primaryEmail,
        userName: u.name?.fullName || u.primaryEmail,
        skus: userAssignments.map((a) => ({ skuId: a.skuId, name: labelForSku(a.skuId, a.skuName) })),
        potentialSavings: monthlySavings * 12,
        potentialMonthlySavings: monthlySavings,
        lastLogin: null,
        action: "Verify with the user's manager — if not needed, suspend or delete the account",
      })
      continue
    }

    const lastLoginMs = new Date(lastLogin).getTime()
    if (lastLoginMs < cutoff) {
      const daysSince = Math.floor((now - lastLoginMs) / (24 * 60 * 60 * 1000))
      const monthlySavings = userAssignments.reduce((s, a) => s + priceForSku(a.skuId), 0)
      findings.push({
        id: generateFindingHash({ type: "inactive-user", userEmail: u.primaryEmail }),
        type: "inactive-user",
        group: "inactive",
        severity: daysSince > 90 ? "high" : "medium",
        title: `${u.primaryEmail} hasn't logged in for ${daysSince} days`,
        description: `User has a license assigned but hasn't logged in to Google Workspace in ${daysSince} days. Consider suspending the account.`,
        userEmail: u.primaryEmail,
        userName: u.name?.fullName || u.primaryEmail,
        skus: userAssignments.map((a) => ({ skuId: a.skuId, name: labelForSku(a.skuId, a.skuName) })),
        potentialSavings: monthlySavings * 12,
        potentialMonthlySavings: monthlySavings,
        lastLogin,
        daysSinceLogin: daysSince,
        action: `Suspend in Admin Console → Users → ${u.primaryEmail}`,
      })
    }
  }
  return findings
}

// ── Analyzer 3: Users without 2-Step Verification ────────────────────────────
// Security finding — no $ savings, but high-value to surface for compliance.
function analyzeMissingTwoStepVerification(users) {
  const findings = []
  for (const u of users) {
    if (u.suspended) continue
    if (u.isEnrolledIn2Sv) continue
    findings.push({
      id: generateFindingHash({ type: "no-2sv", userEmail: u.primaryEmail }),
      type: "no-2sv",
      group: "security",
      severity: u.isAdmin ? "high" : "low",
      title: `${u.primaryEmail} does not have 2-Step Verification enabled${u.isAdmin ? " (admin)" : ""}`,
      description: u.isAdmin
        ? `Admin account without 2SV is a critical security risk. Enforce 2SV in Admin Console → Security → 2-Step Verification.`
        : `User does not have 2-Step Verification enabled. Required by most compliance frameworks (SOC 2, ISO 27001).`,
      userEmail: u.primaryEmail,
      userName: u.name?.fullName || u.primaryEmail,
      potentialSavings: 0,
      isAdmin: !!u.isAdmin,
      action: "Enforce 2SV via Admin Console → Security → 2-Step Verification",
    })
  }
  return findings
}

// ── Analyzer 4: Users on premium SKUs who could downgrade ────────────────────
// If a user only logs in occasionally and doesn't use Drive/Meet heavily,
// downgrading from Business Plus → Standard saves $7.20/user/month.
// Phase 1 heuristic: anyone on Business Plus / Enterprise Plus who logs in
// fewer than 5 times in 30 days flagged as "review for downgrade" (low severity).
function analyzePotentialDowngrades(users, assignments, lastLoginByUser) {
  const findings = []
  const PREMIUM_SKUS = new Set(["1010020025", "1010020020"]) // Business Plus, Enterprise Plus
  const DOWNGRADE_TARGET = {
    "1010020025": { skuId: "1010020028", name: "Business Standard", savings: 7.20 },
    "1010020020": { skuId: "1010020026", name: "Enterprise Standard", savings: 7.00 },
  }

  const assignmentsByEmail = new Map()
  for (const a of assignments) {
    const list = assignmentsByEmail.get(a.userId) || []
    list.push(a)
    assignmentsByEmail.set(a.userId, list)
  }

  for (const u of users) {
    if (u.suspended) continue
    const userAssignments = assignmentsByEmail.get(u.primaryEmail) || []
    const premium = userAssignments.find((a) => PREMIUM_SKUS.has(a.skuId))
    if (!premium) continue

    // Without Drive/Meet activity counts (Phase 3), use last login as a weak signal
    const lastLogin = lastLoginByUser?.[u.primaryEmail] || u.lastLoginTime
    if (!lastLogin) continue
    const daysSince = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (24 * 60 * 60 * 1000))
    if (daysSince < 14) continue // active user — leave alone

    const target = DOWNGRADE_TARGET[premium.skuId]
    if (!target) continue
    findings.push({
      id: generateFindingHash({ type: "downgrade-candidate", userEmail: u.primaryEmail, skuId: premium.skuId }),
      type: "downgrade-candidate",
      group: "overprovisioned",
      severity: "low",
      title: `${u.primaryEmail} could downgrade to ${target.name}`,
      description: `User is on ${labelForSku(premium.skuId)} but only logged in ${daysSince > 30 ? "rarely" : "a few times"} recently. Switching to ${target.name} would save ~$${target.savings.toFixed(2)}/month per user.`,
      userEmail: u.primaryEmail,
      userName: u.name?.fullName || u.primaryEmail,
      skus: [{ skuId: premium.skuId, name: labelForSku(premium.skuId) }],
      currentSku: premium.skuId,
      targetSku: target.skuId,
      potentialSavings: target.savings * 12,
      potentialMonthlySavings: target.savings,
      action: `Reassign in Admin Console → Billing → ${labelForSku(premium.skuId)} → Move user`,
    })
  }
  return findings
}

// ── Main entry ───────────────────────────────────────────────────────────────
function analyzeGoogleWorkspaceCostLeaks(data, options = {}) {
  const { users = [], assignments = [], lastLoginByUser = {} } = data
  const { inactivityDays = 30 } = options

  const results = {
    timestamp: new Date().toISOString(),
    inactivityThreshold: inactivityDays,
    licenseAnalysis: {
      findings: [],
      summary: {
        totalUsers: users.length,
        totalLicenseAssignments: assignments.length,
        usersWithLicenses: 0,
        suspendedUsers: 0,
        inactiveUsers: 0,
        usersWithout2sv: 0,
        totalPotentialSavings: 0,
      },
    },
    overallSummary: {
      totalFindings: 0,
      totalPotentialSavings: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
    },
  }

  if (users.length === 0) return results

  // Compute summary stats
  const assignmentsByEmail = new Map()
  for (const a of assignments) {
    const list = assignmentsByEmail.get(a.userId) || []
    list.push(a)
    assignmentsByEmail.set(a.userId, list)
  }
  results.licenseAnalysis.summary.usersWithLicenses = users.filter((u) =>
    assignmentsByEmail.has(u.primaryEmail),
  ).length
  results.licenseAnalysis.summary.suspendedUsers = users.filter((u) => u.suspended).length
  results.licenseAnalysis.summary.usersWithout2sv = users.filter(
    (u) => !u.suspended && !u.isEnrolledIn2Sv,
  ).length

  const cutoff = Date.now() - inactivityDays * 24 * 60 * 60 * 1000
  results.licenseAnalysis.summary.inactiveUsers = users.filter((u) => {
    if (u.suspended) return false
    const last = lastLoginByUser[u.primaryEmail] || u.lastLoginTime
    if (!last) return true
    return new Date(last).getTime() < cutoff
  }).length

  // Run all analyzers
  const allFindings = [
    ...analyzeSuspendedWithLicense(users, assignments),
    ...analyzeInactiveLicensedUsers(users, assignments, lastLoginByUser, inactivityDays),
    ...analyzePotentialDowngrades(users, assignments, lastLoginByUser),
    ...analyzeMissingTwoStepVerification(users),
  ]

  results.licenseAnalysis.findings = allFindings

  // Tally totals
  let totalSavings = 0
  let high = 0
  let medium = 0
  let low = 0
  for (const f of allFindings) {
    totalSavings += f.potentialSavings || 0
    if (f.severity === "high") high++
    else if (f.severity === "medium") medium++
    else low++
  }

  results.licenseAnalysis.summary.totalPotentialSavings = totalSavings
  results.overallSummary.totalFindings = allFindings.length
  results.overallSummary.totalPotentialSavings = totalSavings
  results.overallSummary.highSeverity = high
  results.overallSummary.mediumSeverity = medium
  results.overallSummary.lowSeverity = low

  return results
}

module.exports = {
  analyzeGoogleWorkspaceCostLeaks,
  analyzeSuspendedWithLicense,
  analyzeInactiveLicensedUsers,
  analyzeMissingTwoStepVerification,
  analyzePotentialDowngrades,
  GOOGLE_WORKSPACE_PRICES,
  SKU_LABELS,
}
