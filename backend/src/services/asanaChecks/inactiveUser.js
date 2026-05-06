/**
 * Check: inactive_user (Asana)
 *
 * Asana doesn't expose `last_active_at` on its public User / Workspace
 * Membership endpoints (only Audit Log API on Enterprise+ does, and that's
 * gated). We probe activity by looking at the user's most recently modified
 * task in the workspace via `/tasks?assignee={gid}&modified_since={cutoff}`.
 *
 * Returns a finding for each licensed (non-guest, active) member with no
 * recently-modified task in the inactivity window.
 *
 * To keep the analysis bounded, the check is capped at PROBE_CAP candidate
 * users — it picks the oldest workspace_membership.created_at first (most
 * likely to be stale). Free-plan workspaces are skipped (no recoverable
 * spend).
 */

const PROBE_CAP = 100

async function check({
  users,
  workspace,
  settings,
  inactivityDays,
  fetchUserLastActivity,
  integration,
  planTier,
}) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  if (!seatCost) return { findings: [] }
  if (!planTier || planTier === "free") return { findings: [] }
  if (!fetchUserLastActivity || !integration || !workspace?.gid) return { findings: [] }

  const cutoffMs = Date.now() - inactivityDays * 86400000
  const sinceIso = new Date(cutoffMs).toISOString()

  // Candidate set: licensed, active, non-guest members. Sort oldest first so
  // the likeliest inactive accounts get probed before we hit PROBE_CAP.
  const candidates = users
    .filter((u) => u.isActive && !u.isGuest && u.id)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    .slice(0, PROBE_CAP)

  const findings = []

  // Probe sequentially to avoid rate-limit bursts (Asana caps at 150 req/min
  // on free apps; OAuth apps are higher but still finite).
  for (const u of candidates) {
    let mostRecentIso = null
    try {
      mostRecentIso = await fetchUserLastActivity(integration, {
        workspaceGid: workspace.gid,
        userGid: u.id,
        sinceIso,
      })
    } catch (_) {
      continue // skip this user on error; aggregator captures partial failures via warnings
    }

    // mostRecentIso === null means no task modified in the window → inactive.
    if (mostRecentIso) continue

    // Days since membership created — used in the action text as a fallback signal.
    const days = u.createdAt
      ? Math.max(
          inactivityDays,
          Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 86400000),
        )
      : inactivityDays

    findings.push({
      check: "inactive_user",
      title: `Inactive Asana user: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `User ${u.email || u.id} has no tasks modified in the last ${inactivityDays} days (member for ~${days}d). Remove from the Asana workspace (Admin Console → Members → Deprovision) or convert to a free guest if they only need limited access.`,
    })
  }

  return { findings }
}

module.exports = { check, PROBE_CAP }
