/**
 * Check 3 — Past-due subscriptions.
 *
 * Lists subscriptions in `past_due` and `unpaid` states. Each becomes a finding
 * with that subscription's monthly-normalized MRR as the at-risk amount.
 */

const { monthlyAmount } = require("./_helpers")

async function listByStatus(stripe, status) {
  const list = stripe.subscriptions.list({
    status,
    expand: ["data.customer"],
    limit: 100,
  })
  return list.autoPagingToArray({ limit: 1000 })
}

async function check({ stripe }) {
  const [pastDue, unpaid] = await Promise.all([
    listByStatus(stripe, "past_due"),
    listByStatus(stripe, "unpaid"),
  ])
  const subs = [...pastDue, ...unpaid]

  const findings = []
  for (const sub of subs) {
    let monthlyCents = 0
    let currency = "usd"
    for (const item of sub.items?.data || []) {
      monthlyCents += monthlyAmount(item.price)
      if (item.price?.currency) currency = item.price.currency
    }
    const monthly = monthlyCents / 100
    if (monthly <= 0) continue

    const cust = sub.customer
    const label =
      typeof cust === "string"
        ? cust
        : cust?.email || cust?.name || cust?.id || sub.id
    findings.push({
      check: "past_due_subscription",
      title: `Past-due subscription for ${label}`,
      currency,
      currentValue: monthly,
      potentialRecovery: monthly,
      evidence: [sub.id],
      action:
        sub.status === "unpaid"
          ? "Subscription is unpaid — immediate manual outreach required to prevent cancellation."
          : "Subscription is past_due — verify dunning schedule and consider personal outreach.",
    })
  }
  return { findings }
}

module.exports = { check }
