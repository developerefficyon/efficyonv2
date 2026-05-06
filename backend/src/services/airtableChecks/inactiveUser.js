/**
 * Check: inactive_user (Airtable)
 *
 * Airtable's public API does not expose other workspace members without
 * Enterprise SCIM scopes (enterprise.scim.usersAndGroups:read). Without
 * enterprise visibility we only see the connecting user via /meta/whoami,
 * so per-user inactivity scanning is not possible.
 *
 * Behaviour:
 *   - Enterprise plan + multiple users visible → probe each user's last
 *     activity by sampling base modifications (future work).
 *   - Otherwise → no findings; aggregator records a visibility-gap warning.
 *
 * Free-plan workspaces are skipped (no recoverable spend).
 */

async function check({ users, settings, planTier, inactivityDays }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0
  if (!seatCost) return { findings: [] }
  const tier = (planTier || "").toLowerCase()
  if (!tier || tier === "free") return { findings: [] }

  // Without enterprise scope only the connecting user is visible. Skip the
  // check rather than emitting noise — the aggregator will note the gap.
  if (!Array.isArray(users) || users.length <= 1) return { findings: [] }

  const findings = []
  // Placeholder for enterprise expansion: would probe each user's last base
  // edit timestamp via the enterprise audit log API. Left as a no-op so the
  // aggregator's check-list stays consistent across plans.
  void inactivityDays
  return { findings }
}

module.exports = { check }
