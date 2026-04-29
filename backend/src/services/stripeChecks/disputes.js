/**
 * Check 4 — Disputes / chargebacks.
 *
 * Aggregates all disputes opened inside the lookback window. Stripe charges a
 * fixed dispute fee per chargeback (modal value $15 for US cards) which we
 * approximate since the fee isn't returned in the dispute object.
 */

const DISPUTE_FEE_USD = 15

async function check({ stripe, lookbackDays }) {
  const lookbackStart = Math.floor(Date.now() / 1000) - lookbackDays * 86400
  const list = stripe.disputes.list({
    created: { gte: lookbackStart },
    limit: 100,
  })
  const items = await list.autoPagingToArray({ limit: 1000 })

  // Group by currency
  const byCurrency = new Map()
  for (const d of items) {
    const cur = d.currency
    if (!byCurrency.has(cur)) byCurrency.set(cur, { count: 0, totalCents: 0, evidence: [] })
    const entry = byCurrency.get(cur)
    entry.count += 1
    entry.totalCents += d.amount || 0
    if (entry.evidence.length < 10) entry.evidence.push(d.id)
  }

  const findings = []
  for (const [currency, agg] of byCurrency.entries()) {
    const totalLost = agg.totalCents / 100
    const feesPaid = agg.count * DISPUTE_FEE_USD // approx; fees vary by region/brand
    findings.push({
      check: "disputes",
      title: `${agg.count} disputes in the last window`,
      currency,
      currentValue: totalLost,
      potentialRecovery: totalLost + feesPaid,
      evidence: agg.evidence,
      action:
        "Review each dispute and submit evidence within Stripe's deadline. " +
        "If chargeback rate is rising, audit for friendly fraud and weak 3DS coverage.",
    })
  }
  return { findings }
}

module.exports = { check, DISPUTE_FEE_USD }
