/**
 * Check: guest_misclassified (Asana)
 *
 * On Asana paid plans (Starter, Advanced, Enterprise+), guests are free.
 * A workspace member whose email domain is outside the organization's primary
 * domain set is most likely a contractor/external collaborator who could be
 * downgraded to a free guest seat — but is currently being billed as a full
 * member (is_guest=false).
 *
 * Primary domain detection is best-effort:
 *   1. settings.primary_domains (CSV) overrides if present
 *   2. workspace.emailDomains (Asana exposes verified org domains for
 *      organization-mode workspaces)
 *   3. Fallback: majority email domain across active non-guest members
 *
 * Skip on Free plan (guests don't apply / no billing).
 */

const { FREE_GUEST_PLANS } = require("../asanaPricing")

function emailDomain(email) {
  if (!email || typeof email !== "string") return null
  const at = email.lastIndexOf("@")
  if (at < 0) return null
  return email.slice(at + 1).toLowerCase().trim() || null
}

function buildPrimaryDomains({ settings, workspace, users }) {
  const set = new Set()

  // 1. Customer override
  if (typeof settings?.primary_domains === "string" && settings.primary_domains.trim()) {
    settings.primary_domains
      .split(/[\s,]+/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
      .forEach((d) => set.add(d))
    if (set.size) return set
  }

  // 2. Workspace verified domains
  const verified = Array.isArray(workspace?.emailDomains) ? workspace.emailDomains : []
  for (const d of verified) {
    if (typeof d === "string" && d.trim()) set.add(d.toLowerCase().trim())
  }
  if (set.size) return set

  // 3. Majority domain across active non-guest members
  const counts = new Map()
  for (const u of users) {
    if (!u.isActive || u.isGuest) continue
    const dom = emailDomain(u.email)
    if (!dom) continue
    counts.set(dom, (counts.get(dom) || 0) + 1)
  }
  let topDomain = null
  let topCount = 0
  for (const [d, c] of counts) {
    if (c > topCount) {
      topDomain = d
      topCount = c
    }
  }
  // Require >=2 to call something a "majority" — prevents a 2-person workspace
  // from labelling one user as external when both are equally legitimate.
  if (topDomain && topCount >= 2) set.add(topDomain)
  return set
}

async function check({ users, workspace, settings, planTier }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  if (!seatCost) return { findings: [] }
  const tier = (planTier || "").toLowerCase()
  if (!FREE_GUEST_PLANS.has(tier)) return { findings: [] }

  const primary = buildPrimaryDomains({ settings, workspace, users })
  if (!primary.size) return { findings: [] }

  const findings = []
  for (const u of users) {
    if (!u.isActive) continue
    if (u.isGuest) continue
    const dom = emailDomain(u.email)
    if (!dom) continue
    if (primary.has(dom)) continue

    findings.push({
      check: "guest_misclassified",
      title: `External user on a paid seat: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id, `domain:${dom}`],
      action: `User ${u.email || u.id} is from an external domain (${dom}) but is billed as a full member on a ${tier} plan. Convert to a Guest (Admin Console → Members → Change to Guest) — guests are free on Asana ${tier}.`,
    })
  }

  return { findings }
}

module.exports = { check, emailDomain, buildPrimaryDomains }
