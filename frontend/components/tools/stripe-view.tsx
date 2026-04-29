"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function StripeView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
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
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
