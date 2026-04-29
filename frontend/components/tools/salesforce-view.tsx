"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function SalesforceView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Salesforce Org</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Org ID</dt>
          <dd className="font-mono">{statusInfo?.orgId || settings.org_id || "—"}</dd>
          <dt className="text-muted-foreground">Instance URL</dt>
          <dd className="break-all">{statusInfo?.instanceUrl || settings.instance_url || "—"}</dd>
          <dt className="text-muted-foreground">Org Type</dt>
          <dd>{statusInfo?.orgType || settings.org_type || "—"}</dd>
          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{statusInfo?.lastValidatedAt || settings.last_validated_at || "—"}</dd>
        </dl>
      </section>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
