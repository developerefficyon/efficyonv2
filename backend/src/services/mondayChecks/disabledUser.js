/**
 * Check: disabled_user
 *
 * Surface users with enabled=false who still appear in the directory.
 * monday.com sometimes keeps disabled users in the directory; whether they
 * still count toward the seat tier depends on plan/version. We surface as a
 * medium-confidence finding and ask the admin to verify in billing.
 */

async function check({ users, settings }) {
  const seatCost = Number(settings?.seat_cost_usd) || 0

  const findings = []
  for (const u of users) {
    if (u.enabled) continue
    if (u.isGuest) continue

    findings.push({
      check: "disabled_user",
      title: `Disabled user still in directory: ${u.email || u.name || u.id}`,
      currency: "USD",
      currentValue: seatCost * 12,
      potentialSavings: seatCost * 12,
      evidence: [u.id],
      action: `User ${u.email || u.id} is disabled but still appears in the directory. Verify in Admin → Billing whether they're still counted toward your seat tier; if yes, fully delete the user (Admin → Users) to recover the seat.`,
    })
  }

  return { findings }
}

module.exports = { check }
