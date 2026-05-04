"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface LinearUser {
  id: string
  name?: string | null
  displayName?: string | null
  email?: string | null
  active: boolean
  admin: boolean
  lastSeenAt?: string | null
  createdAt?: string | null
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString()
}

export function LinearView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: LinearUser[] = (info?.users as LinearUser[] | undefined) || []
  const activeUsers = users.filter((u) => u.active)
  const admins = users.filter((u) => u.admin)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Linear Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Workspace</dt>
          <dd>{statusInfo?.workspaceName || settings.workspace_name || "—"}</dd>
          <dt className="text-muted-foreground">URL key</dt>
          <dd className="font-mono">{statusInfo?.workspaceUrlKey || settings.workspace_url_key || "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{statusInfo?.planTier || settings.plan_tier || "—"}</dd>
          <dt className="text-muted-foreground">Total members</dt>
          <dd>{users.length}</dd>
          <dt className="text-muted-foreground">Active members (billable)</dt>
          <dd>{activeUsers.length}</dd>
          <dt className="text-muted-foreground">Admins</dt>
          <dd>{admins.length}</dd>
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
                <th>Active</th>
                <th>Admin</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.displayName || u.name || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.active ? "Yes" : "No"}</td>
                  <td>{u.admin ? "Yes" : "No"}</td>
                  <td>{formatDate(u.lastSeenAt)}</td>
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
