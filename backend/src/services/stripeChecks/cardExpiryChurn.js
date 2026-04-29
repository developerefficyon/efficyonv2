/**
 * Check 2 — Card-expiry preventable churn.
 *
 * For every customer with at least one ACTIVE subscription, fetch the default
 * payment method. Flag any with a card expiring in the next 60 days.
 * Potential loss = sum of monthly-normalized MRR across the customer's active subs.
 */

const { monthlyAmount } = require("./_helpers")

const EXPIRY_HORIZON_DAYS = 60

async function check({ stripe }) {
  const horizonMs = Date.now() + EXPIRY_HORIZON_DAYS * 86400 * 1000

  // Pull active subscriptions; that gives us the customers we care about and
  // their MRR in one pass without iterating every customer.
  const subList = stripe.subscriptions.list({
    status: "active",
    expand: ["data.customer", "data.default_payment_method"],
    limit: 100,
  })
  const subs = await subList.autoPagingToArray({ limit: 1000 })

  // Group by customer
  const customerSubs = new Map() // customerId -> { defaultPm, monthlyTotalCents, currency, customer }
  for (const sub of subs) {
    const cust = sub.customer
    if (!cust || typeof cust === "string") continue
    const cid = cust.id
    let pm = sub.default_payment_method
    // Fall back to customer's invoice_settings default if subscription has none
    if (!pm && cust.invoice_settings?.default_payment_method) {
      pm = cust.invoice_settings.default_payment_method
    }
    if (!customerSubs.has(cid)) {
      customerSubs.set(cid, { customer: cust, defaultPm: pm, monthlyTotalCents: 0, currency: null })
    }
    const entry = customerSubs.get(cid)
    if (!entry.defaultPm && pm) entry.defaultPm = pm
    for (const item of sub.items?.data || []) {
      entry.monthlyTotalCents += monthlyAmount(item.price)
      if (!entry.currency && item.price?.currency) entry.currency = item.price.currency
    }
  }

  // Resolve payment methods that came back as IDs (not expanded)
  const findings = []
  for (const [cid, entry] of customerSubs.entries()) {
    let pm = entry.defaultPm
    if (typeof pm === "string") {
      try {
        pm = await stripe.paymentMethods.retrieve(pm)
      } catch {
        continue
      }
    }
    const card = pm?.card
    if (!card?.exp_year || !card?.exp_month) continue
    const expiryDate = new Date(card.exp_year, card.exp_month, 0).getTime() // last day of exp_month
    if (expiryDate > horizonMs) continue

    const monthly = entry.monthlyTotalCents / 100
    findings.push({
      check: "card_expiry_churn",
      title: `Card expiring ${card.exp_month}/${card.exp_year} for ${entry.customer.email || cid}`,
      currency: entry.currency || "usd",
      currentValue: monthly,
      potentialRecovery: monthly, // full MRR at risk for at least one month
      evidence: [cid],
      action:
        "Email the customer to update their card before expiry. " +
        "Enable Stripe's automatic card-updater (free for most US issuers).",
    })
  }
  return { findings }
}

module.exports = { check, EXPIRY_HORIZON_DAYS }
