/**
 * Check 3 — Notion AI add-on over-provisioning.
 *
 * Conditional: only fires if customer indicated has_ai === true at connect.
 * Compare ai_seats vs person count, same gap pattern as check 2 but at the
 * $10/seat/mo Notion AI rate.
 */

const { NOTION_AI_PRICE } = require("../notionPricing")

async function check({ users, settings }) {
  if (!settings?.has_ai) return { findings: [] }

  const aiSeats = parseInt(settings?.ai_seats, 10) || 0
  if (aiSeats === 0) return { findings: [] }

  const persons = (users || []).filter((u) => u.type === "person")
  const personCount = persons.length
  const aiGap = aiSeats - personCount

  if (aiGap <= 0) return { findings: [] }

  const monthlySavings = aiGap * NOTION_AI_PRICE
  return {
    findings: [
      {
        check: "notion_ai_overprovisioning",
        title: `${aiGap} unused Notion AI seat${aiGap === 1 ? "" : "s"}`,
        currency: "USD",
        currentValue: monthlySavings,
        potentialSavings: monthlySavings,
        evidence: [],
        action: `You bought ${aiSeats} Notion AI seats but only ${personCount} humans are in the workspace. Reduce AI seats to ${personCount} to save $${monthlySavings}/mo.`,
      },
    ],
  }
}

module.exports = { check }
