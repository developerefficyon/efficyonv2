"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface StripeSubscription {
  id: string
  status: string
  current_period_end: number
  customer?: { id: string; email?: string | null; name?: string | null } | string
  items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string; recurring?: { interval?: string } } }> }
}

interface StripeInvoice {
  id: string
  status: string
  number?: string | null
  amount_due: number
  amount_remaining: number
  currency: string
  due_date?: number | null
  created: number
  customer?: { id: string; email?: string | null; name?: string | null } | string
}

interface StripeDispute {
  id: string
  status: string
  reason: string
  amount: number
  currency: string
  created: number
  evidence_details?: { due_by?: number | null }
}

function formatMoney(amountCents: number, currency = "usd") {
  const dollars = amountCents / 100
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(dollars)
}

function formatDate(unixSec?: number | null) {
  if (!unixSec) return "—"
  return new Date(unixSec * 1000).toLocaleDateString()
}

function customerLabel(c: any) {
  if (!c) return "—"
  if (typeof c === "string") return c
  return c.email || c.name || c.id || "—"
}

export function StripeView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const subs: StripeSubscription[] = (info?.subscriptions as StripeSubscription[] | undefined) || []
  const invoices: StripeInvoice[] = (info?.invoices as StripeInvoice[] | undefined) || []
  const disputes: StripeDispute[] = (info?.disputes as StripeDispute[] | undefined) || []

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Stripe Account</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Account ID</dt>
          <dd className="font-mono">{statusInfo?.accountId || settings.stripe_account_id || "—"}</dd>
          <dt className="text-muted-foreground">Currency</dt>
          <dd className="uppercase">{statusInfo?.defaultCurrency || settings.default_currency || "—"}</dd>
          <dt className="text-muted-foreground">Business name</dt>
          <dd>{statusInfo?.businessName || settings.business_name || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Subscriptions ({subs.length})</h2>
        {subs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No subscriptions returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Customer</th>
                <th>Status</th>
                <th>MRR</th>
                <th>Period end</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const item = s.items?.data?.[0]?.price
                const interval = item?.recurring?.interval || "month"
                const monthly = item?.unit_amount ? (interval === "year" ? item.unit_amount / 12 : item.unit_amount) : 0
                return (
                  <tr key={s.id} className="border-t">
                    <td className="py-2">{customerLabel(s.customer)}</td>
                    <td>{s.status}</td>
                    <td>{formatMoney(monthly, item?.currency || "usd")}</td>
                    <td>{formatDate(s.current_period_end)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No invoices returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Number</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="py-2 font-mono">{i.number || i.id.slice(0, 12)}</td>
                  <td>{customerLabel(i.customer)}</td>
                  <td>{i.status}</td>
                  <td>{formatMoney(i.amount_due, i.currency)}</td>
                  <td>{formatDate(i.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Disputes ({disputes.length})</h2>
        {disputes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No disputes returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Reason</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Evidence due</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-2">{d.reason}</td>
                  <td>{d.status}</td>
                  <td>{formatMoney(d.amount, d.currency)}</td>
                  <td>{formatDate(d.created)}</td>
                  <td>{formatDate(d.evidence_details?.due_by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
