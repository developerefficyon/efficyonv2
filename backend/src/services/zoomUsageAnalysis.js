/**
 * Zoom usage analysis service.
 *
 * Two finding generators implemented in v1:
 *   1. Inactive licensed users (last_login_time older than threshold)
 *   2. Unused add-ons (Webinar / Events / Phone licenses with no activity)
 *
 * Tier-mismatch (deferred): would flag accounts on Business Plus / Enterprise
 * whose users only touch Pro-tier features. Needs per-user feature-usage
 * reporting (report:read:user:admin scope + larger API surface) — deferred
 * from v1.
 */

const API = "https://api.zoom.us/v2"

// List prices as of 2026-04 (USD/user/month). Enterprise is contact-sales, fall back to Business Plus.
const TIER_PRICING = {
  pro: 14.99,
  business: 21.99,
  business_plus: 26.99,
  enterprise: 26.99,
}

const ADDON_PRICING = {
  webinar: 79,        // Zoom Webinars (500 attendees) list price per host/month
  events: 99,         // Zoom Events
  phone: 15,          // Zoom Phone basic per user/month
}

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

async function zoomRequest(accessToken, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("ZOOM_REQUEST_FAILED", body.message || body.reason || `HTTP ${res.status}`)
    err.zoomErrorCode = body.code
    err.httpStatus = res.status
    throw err
  }
  return body
}

async function paginate(accessToken, urlBase, extractKey) {
  const out = []
  let nextPageToken = ""
  for (let i = 0; i < 20; i++) {
    const url = `${urlBase}${urlBase.includes("?") ? "&" : "?"}page_size=300${nextPageToken ? `&next_page_token=${encodeURIComponent(nextPageToken)}` : ""}`
    const body = await zoomRequest(accessToken, url)
    const items = body[extractKey] || []
    out.push(...items)
    nextPageToken = body.next_page_token
    if (!nextPageToken) break
    if (out.length >= 2000) break // hard cap per run
  }
  return out
}

async function listUsers(accessToken) {
  return paginate(accessToken, `${API}/users?status=active`, "users")
}

async function getAccountInfo(accessToken) {
  return zoomRequest(accessToken, `${API}/accounts/me`)
}

async function listAddons(accessToken) {
  try {
    const body = await zoomRequest(accessToken, `${API}/accounts/me/plans/addons`)
    return body.plan_addons || body.addons || []
  } catch (e) {
    // Many accounts don't have the addon-billing scope; treat as empty, not fatal
    return []
  }
}

function daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function findingInactiveUser(user, planTier, inactivityDays = 30) {
  const price = TIER_PRICING[planTier] ?? TIER_PRICING.pro
  return {
    id: `zoom-inactive-${user.id}`,
    source: "zoom_usage",
    severity: null,
    category: "inactive_user",
    title: `Inactive licensed Zoom user`,
    region: null,
    resource: {
      type: "zoom-user",
      id: user.email || user.id,
      accountId: user.account_id || null,
      region: null,
    },
    currentCost: price,
    projectedSavings: price,
    currency: "USD",
    recommendation: `Downgrade ${user.email} to Basic (free) or revoke the license — no login activity in ${inactivityDays}+ days`,
    actionSteps: [
      "Confirm the user is truly inactive (check with their manager)",
      "Open Zoom admin → User Management → Users → find the user",
      "Change license to Basic or delete the user",
    ],
    raw: user,
  }
}

function findingUnusedAddon(addon) {
  const monthlyCost = Number(addon.price || 0) || ADDON_PRICING[addon.type] || 0
  const units = Number(addon.hosts || addon.quantity || 1)
  return {
    id: `zoom-unused-addon-${addon.type}`,
    source: "zoom_usage",
    severity: null,
    category: "unused_addon",
    title: `Unused ${addon.type} add-on`,
    region: null,
    resource: { type: "zoom-addon", id: addon.type, accountId: null, region: null },
    currentCost: monthlyCost * units,
    projectedSavings: monthlyCost * units,
    currency: "USD",
    recommendation: `Un-assign or cancel the ${addon.type} add-on — no usage detected in 30 days`,
    actionSteps: [
      `Open Zoom admin → Account Management → Billing → Add-ons`,
      `Review the ${addon.type} utilization report`,
      `Un-assign from unused users or cancel the add-on if the account-wide utilization is 0`,
    ],
    raw: addon,
  }
}

/**
 * Produce inactive-user findings. Licensed users (type === 2) with last_login_time
 * older than `inactivityDays` are flagged.
 */
async function inactiveUserFindings(accessToken, users, planTier, inactivityDays) {
  const now = new Date()
  const threshold = inactivityDays || 30
  const findings = []
  for (const u of users) {
    if (u.type !== 2) continue // not licensed
    const lastLogin = u.last_login_time ? new Date(u.last_login_time) : null
    const idleDays = lastLogin ? daysBetween(now, lastLogin) : 9999
    if (idleDays >= threshold) findings.push(findingInactiveUser(u, planTier, threshold))
  }
  return findings
}

async function unusedAddonFindings(accessToken) {
  const addons = await listAddons(accessToken)
  const findings = []
  for (const addon of addons) {
    const used = Number(addon.hosts_used || addon.usage || 0)
    if (used === 0 && Number(addon.hosts || addon.quantity || 0) > 0) {
      findings.push(findingUnusedAddon(addon))
    }
  }
  return findings
}

/**
 * Top-level orchestrator.
 */
async function runUsageAnalysis(accessToken, planTier, inactivityDays = 30) {
  const findings = []
  const errors = []

  let users = []
  try {
    users = await listUsers(accessToken)
  } catch (e) {
    errors.push({ stage: "listUsers", message: e.message, code: e.zoomErrorCode || e.code })
    return { findings, errors, userCount: 0 }
  }

  try {
    findings.push(...await inactiveUserFindings(accessToken, users, planTier, inactivityDays))
  } catch (e) {
    errors.push({ stage: "inactiveUsers", message: e.message, code: e.zoomErrorCode || e.code })
  }

  try {
    findings.push(...await unusedAddonFindings(accessToken))
  } catch (e) {
    errors.push({ stage: "unusedAddons", message: e.message, code: e.zoomErrorCode || e.code })
  }

  return { findings, errors, userCount: users.length }
}

module.exports = {
  runUsageAnalysis,
  listUsers,
  getAccountInfo,
  listAddons,
  findingInactiveUser,
  findingUnusedAddon,
  TIER_PRICING,
}
