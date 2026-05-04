"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function NotionView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        Notion's public API doesn't expose per-user login activity. V1 findings cover bot detection
        and the seat-utilization gap. Inactive-user detection requires Audit Log API access (Enterprise
        plan only) and is on the V2 roadmap.
      </div>
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Notion Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Workspace</dt>
          <dd>{statusInfo?.workspaceName || settings.workspace_name || "—"}</dd>
          <dt className="text-muted-foreground">Workspace ID</dt>
          <dd className="font-mono">{statusInfo?.workspaceId || settings.workspace_id || "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{statusInfo?.planTier || settings.plan_tier || "—"}</dd>
          <dt className="text-muted-foreground">Total seats (entered)</dt>
          <dd>{statusInfo?.totalSeats ?? settings.total_seats ?? "—"}</dd>
          <dt className="text-muted-foreground">Notion AI</dt>
          <dd>{statusInfo?.hasAI ? `Yes — ${statusInfo?.aiSeats ?? settings.ai_seats ?? 0} seats` : "No"}</dd>
        </dl>
      </section>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
