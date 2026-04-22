/**
 * GitHub usage analysis service.
 *
 * Three finding generators:
 *   1. Inactive Copilot seats (last_activity_at older than threshold)
 *   2. Inactive paid org members (no public events in the window)
 *   3. Copilot over-provisioning (total seats > 1.25 × active_this_cycle)
 */

const API = "https://api.github.com"

const PLAN_PRICING = { team: 4, enterprise: 21 }
const COPILOT_PRICING = { none: 0, business: 19, enterprise: 39 }

function typedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

async function githubRequest(token, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = typedError("GITHUB_REQUEST_FAILED", body.message || `HTTP ${res.status}`)
    err.httpStatus = res.status
    throw err
  }
  return { body, headers: res.headers }
}

/**
 * Paginate a standard list endpoint. Returns up to `cap` items.
 */
async function paginate(token, urlBase, cap = 500) {
  const out = []
  let url = urlBase + (urlBase.includes("?") ? "&" : "?") + "per_page=100"
  for (let i = 0; i < 30 && url; i++) {
    const { body, headers } = await githubRequest(token, url)
    const items = Array.isArray(body) ? body : (body.seats || body.items || [])
    out.push(...items)
    if (out.length >= cap) return out.slice(0, cap)
    const link = headers.get ? headers.get("link") : null
    const next = parseNextLink(link)
    url = next
  }
  return out
}

function parseNextLink(link) {
  if (!link) return null
  const m = link.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1] : null
}

async function getOrgFromInstallation(token, installationSettings) {
  if (installationSettings?.org_login) return installationSettings.org_login
  // Fallback: use /installation/repositories → first repo's owner login
  const { body } = await githubRequest(token, `${API}/installation/repositories?per_page=1`)
  const repo = (body.repositories || [])[0]
  return repo?.owner?.login || null
}

async function listMembers(token, org) {
  return paginate(token, `${API}/orgs/${org}/members?role=all`, 500)
}

async function listCopilotSeats(token, org) {
  // GET /orgs/{org}/copilot/billing/seats returns { total_seats, seats: [...] }
  const out = []
  let url = `${API}/orgs/${org}/copilot/billing/seats?per_page=50`
  for (let i = 0; i < 20 && url; i++) {
    const { body, headers } = await githubRequest(token, url)
    out.push(...(body.seats || []))
    if (out.length >= 1000) break
    const next = parseNextLink(headers.get ? headers.get("link") : null)
    url = next
  }
  return out
}

async function getCopilotBillingSummary(token, org) {
  try {
    const { body } = await githubRequest(token, `${API}/orgs/${org}/copilot/billing`)
    return body
  } catch (e) {
    return null
  }
}

async function getUserRecentEvent(token, username, sinceIso) {
  try {
    const { body } = await githubRequest(token, `${API}/users/${username}/events?per_page=10`)
    const events = Array.isArray(body) ? body : []
    const sinceMs = new Date(sinceIso).getTime()
    for (const ev of events) {
      if (ev.created_at && new Date(ev.created_at).getTime() >= sinceMs) return ev
    }
    return null
  } catch (e) {
    return null
  }
}

function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function findingInactiveCopilotSeat(seat, copilotTier, inactivityDays) {
  const price = COPILOT_PRICING[copilotTier] ?? COPILOT_PRICING.business
  const login = seat.assignee?.login || "unknown"
  return {
    id: `github-inactive-copilot-${login}`,
    source: "github_usage",
    severity: null,
    category: "inactive_copilot_seat",
    title: `Inactive Copilot seat: ${login}`,
    region: null,
    resource: {
      type: "github-copilot-seat",
      id: login,
      accountId: null, // set by caller with org
      region: null,
    },
    currentCost: price,
    projectedSavings: price,
    currency: "USD",
    recommendation: `Revoke Copilot access for ${login} — no activity in ${inactivityDays}+ days`,
    actionSteps: [
      "Open GitHub → Organization settings → Copilot → Access",
      `Find ${login} and click Remove`,
      "Confirm the change takes effect at the next billing cycle",
    ],
    raw: seat,
  }
}

function findingInactivePaidMember(member, planTier, inactivityDays) {
  const price = PLAN_PRICING[planTier] ?? PLAN_PRICING.team
  return {
    id: `github-inactive-member-${member.login}`,
    source: "github_usage",
    severity: null,
    category: "inactive_paid_member",
    title: `Inactive paid GitHub member: ${member.login}`,
    region: null,
    resource: {
      type: "github-user",
      id: member.login,
      accountId: null,
      region: null,
    },
    currentCost: price,
    projectedSavings: price,
    currency: "USD",
    recommendation: `Remove ${member.login} from the organization — no activity in ${inactivityDays}+ days`,
    actionSteps: [
      "Confirm the member is truly inactive (check with their manager)",
      "Open GitHub → Organization → People → find the member",
      "Remove from organization (reclaims the paid seat)",
    ],
    raw: member,
  }
}

function findingCopilotOverProvision(billing, copilotTier) {
  const total = Number(billing?.seat_breakdown?.total || 0)
  const active = Number(billing?.seat_breakdown?.active_this_cycle || 0)
  const surplus = Math.max(0, total - Math.ceil(active * 1.25))
  if (surplus === 0) return null
  const price = COPILOT_PRICING[copilotTier] ?? COPILOT_PRICING.business
  return {
    id: `github-copilot-over-provision-${total}`,
    source: "github_usage",
    severity: null,
    category: "copilot_over_provision",
    title: `Copilot over-provisioned: ${surplus} surplus seats`,
    region: null,
    resource: { type: "github-copilot-seat", id: "account", accountId: null, region: null },
    currentCost: surplus * price,
    projectedSavings: surplus * price,
    currency: "USD",
    recommendation: `Reduce Copilot seat count by ${surplus} at next renewal (${total} total, ${active} active this cycle)`,
    actionSteps: [
      "Review Copilot seat assignments",
      "Unassign the least-active users",
      "Adjust seat count in billing settings",
    ],
    raw: billing,
  }
}

async function runUsageAnalysis(token, settings) {
  const inactivityDays = settings?.inactivity_days || 30
  const planTier = settings?.plan_tier || "team"
  const copilotTier = settings?.copilot_tier || "business"

  const findings = []
  const errors = []

  const org = await getOrgFromInstallation(token, settings)
  if (!org) {
    errors.push({ stage: "resolveOrg", message: "Could not resolve org login from installation", code: "NO_ORG" })
    return { findings, errors, org: null, memberCount: 0, seatCount: 0 }
  }

  // 1. Inactive Copilot seats
  let seats = []
  if (copilotTier !== "none") {
    try {
      seats = await listCopilotSeats(token, org)
      const sinceIso = daysAgoIso(inactivityDays)
      const sinceMs = new Date(sinceIso).getTime()
      for (const seat of seats) {
        const last = seat.last_activity_at ? new Date(seat.last_activity_at).getTime() : 0
        if (last < sinceMs) {
          const f = findingInactiveCopilotSeat(seat, copilotTier, inactivityDays)
          f.resource.accountId = org
          findings.push(f)
        }
      }
    } catch (e) {
      errors.push({ stage: "copilotSeats", message: e.message, code: e.code || "COPILOT_LIST_FAILED", httpStatus: e.httpStatus })
    }
  }

  // 2. Inactive paid members
  let members = []
  try {
    members = await listMembers(token, org)
    const sinceIso = daysAgoIso(inactivityDays)
    // cap per-member event calls
    const CAP = 500
    const checked = members.slice(0, CAP)
    for (const m of checked) {
      const recent = await getUserRecentEvent(token, m.login, sinceIso)
      if (!recent) {
        const f = findingInactivePaidMember(m, planTier, inactivityDays)
        f.resource.accountId = org
        findings.push(f)
      }
    }
  } catch (e) {
    errors.push({ stage: "members", message: e.message, code: e.code || "MEMBERS_LIST_FAILED", httpStatus: e.httpStatus })
  }

  // 3. Copilot over-provisioning
  if (copilotTier !== "none") {
    const billing = await getCopilotBillingSummary(token, org)
    if (billing) {
      const f = findingCopilotOverProvision(billing, copilotTier)
      if (f) {
        f.resource.accountId = org
        findings.push(f)
      }
    }
  }

  return { findings, errors, org, memberCount: members.length, seatCount: seats.length }
}

module.exports = {
  runUsageAnalysis,
  listMembers,
  listCopilotSeats,
  getCopilotBillingSummary,
  getOrgFromInstallation,
  findingInactiveCopilotSeat,
  findingInactivePaidMember,
  findingCopilotOverProvision,
  PLAN_PRICING,
  COPILOT_PRICING,
}
