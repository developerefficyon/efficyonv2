/**
 * Check 1 — Bot users billed as paid seats.
 *
 * Notion bots are free, but customers occasionally tell finance that their
 * paid-seat count includes everything in /v1/users. We flag each bot so the
 * customer can verify their seat count excludes them.
 */

const { resolvePlanPrice } = require("../notionPricing")

async function check({ users, settings }) {
  const planTier = settings?.plan_tier
  const planPrice = resolvePlanPrice(planTier)

  const bots = (users || []).filter((u) => u.type === "bot")
  const findings = []
  for (const bot of bots) {
    findings.push({
      check: "bot_seats_billed",
      title: `Bot '${bot.name || bot.id}' may be miscounted as a paid seat`,
      currency: "USD",
      currentValue: planPrice,
      potentialSavings: planPrice,
      evidence: [bot.id],
      action:
        planPrice > 0
          ? `Bot '${bot.name || bot.id}' is in the workspace member list — make sure your ${planTier} seat count doesn't include it. Bots are free in Notion's billing.`
          : `Bot '${bot.name || bot.id}' is in the workspace member list. Bots are free in Notion's billing.`,
    })
  }
  return { findings }
}

module.exports = { check }
