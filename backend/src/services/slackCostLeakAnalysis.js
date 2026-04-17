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
