"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface NotionUser {
  id: string
  type: "person" | "bot"
  name?: string | null
  avatar_url?: string | null
  person?: { email?: string | null }
  bot?: any
}

export function NotionView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: NotionUser[] = (info?.users as NotionUser[] | undefined) || []
  const persons = users.filter((u) => u.type === "person")
  const bots = users.filter((u) => u.type === "bot")

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
          <dt className="text-muted-foreground">Members (humans)</dt>
          <dd>{persons.length}</dd>
          <dt className="text-muted-foreground">Bots</dt>
          <dd>{bots.length}</dd>
          <dt className="text-muted-foreground">Notion AI</dt>
          <dd>{statusInfo?.hasAI ? `Yes — ${statusInfo?.aiSeats ?? settings.ai_seats ?? 0} seats` : "No"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Members ({users.length})</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.name || "—"}</td>
                  <td>{u.person?.email || "—"}</td>
                  <td>{u.type}</td>
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
