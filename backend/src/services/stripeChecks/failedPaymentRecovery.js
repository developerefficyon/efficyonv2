/**
 * Check 1 — Failed payment recovery.
 *
 * Pulls open invoices that have already failed at least one collection attempt
 * inside the lookback window and quantifies dollars-on-the-floor that smart
 * dunning could still recover.
 *
 * Output: one finding per currency (most accounts use just one).
 */

const RECOVERY_RATE = 0.65 // B2B SaaS dunning recovery benchmark

async function check({ stripe, lookbackDays }) {
  const lookbackStart = Math.floor(Date.now() / 1000) - lookbackDays * 86400
  const list = stripe.invoices.list({
    status: "open",
    collection_method: "charge_automatically",
    created: { gte: lookbackStart },
    limit: 100,
  })
  const items = await list.autoPagingToArray({ limit: 1000 })

  const failed = items.filter((inv) => inv.attempt_count >= 1 && inv.status === "open")

  // Group by currency
  const byCurrency = new Map()
  for (const inv of failed) {
    const cur = inv.currency
    if (!byCurrency.has(cur)) byCurrency.set(cur, { count: 0, totalCents: 0, evidence: [] })
    const entry = byCurrency.get(cur)
    entry.count += 1
    entry.totalCents += inv.amount_remaining || 0
    if (entry.evidence.length < 10) entry.evidence.push(inv.id)
  }

  const findings = []
  for (const [currency, agg] of byCurrency.entries()) {
    const totalAmount = agg.totalCents / 100
    const recoverable = totalAmount * RECOVERY_RATE
    findings.push({
      check: "failed_payment_recovery",
      title: `${agg.count} failed payments awaiting recovery`,
      currency,
      currentValue: totalAmount,
      potentialRecovery: Math.round(recoverable * 100) / 100,
      evidence: agg.evidence,
      action:
        "Enable Stripe Smart Retries with at least 4 attempts over 14 days. " +
        "Verify Adaptive Acceptance is on. Customer outreach for the 35% Smart Retries cannot recover.",
    })
  }
  return { findings }
}

module.exports = { check, RECOVERY_RATE }
