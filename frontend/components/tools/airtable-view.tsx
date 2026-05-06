"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface AirtableUser {
  id: string | null
  email: string | null
  name: string | null
  isActive: boolean
  isAdmin: boolean
  isGuest: boolean
  createdAt: string | null
  domain: string | null
}

interface AirtableBase {
  id: string | null
  name: string | null
  permissionLevel: string | null
}

function permissionLabel(level: string | null): string {
  if (!level) return "—"
  return level.charAt(0).toUpperCase() + level.slice(1)
}

export function AirtableView({ integration, info, isLoading }: ToolViewProps) {
  const statusInfo = info?.status as Record<string, any> | undefined
  const usersResp = info?.users as
    | { users?: AirtableUser[]; workspace?: any; counts?: any; visibilityNote?: string }
    | undefined

  const users: AirtableUser[] = Array.isArray((usersResp as any)?.users)
    ? (usersResp as any).users
    : Array.isArray(usersResp as any)
    ? (usersResp as any)
    : []
  const workspace = (usersResp as any)?.workspace || {}
  const visibilityNote: string | null = (usersResp as any)?.visibilityNote || null

  const planTier = statusInfo?.planTier || integration.settings?.plan_tier || null
  const subscribedSeats =
    statusInfo?.subscribedSeats ?? integration.settings?.subscribed_seats ?? null
  const activeSeats = statusInfo?.activeSeats ?? integration.settings?.active_seats ?? null
  const seatCostUsd = statusInfo?.seatCostUsd ?? integration.settings?.seat_cost_usd ?? null
  const baseCount =
    workspace.baseCount ?? statusInfo?.baseCount ?? integration.settings?.base_count ?? null
  const grantedScopes: string[] | null = Array.isArray(workspace.grantedScopes)
    ? workspace.grantedScopes
    : Array.isArray(statusInfo?.grantedScopes)
    ? statusInfo!.grantedScopes
    : null
  const bases: AirtableBase[] = Array.isArray(workspace.bases) ? workspace.bases : []
  const connectedEmail =
    statusInfo?.connectedUserEmail ||
    integration.settings?.connected_user_email ||
    workspace.primaryDomain ||
    null

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Connected user</dt>
          <dd>{connectedEmail ?? "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd className="capitalize">{planTier ?? "—"}</dd>
          <dt className="text-muted-foreground">Per-seat cost</dt>
          <dd>{seatCostUsd != null ? `$${seatCostUsd}/mo` : "—"}</dd>
          <dt className="text-muted-foreground">Subscribed seats</dt>
          <dd>{subscribedSeats ?? "—"}</dd>
          <dt className="text-muted-foreground">Active seats</dt>
          <dd>{activeSeats ?? "—"}</dd>
          <dt className="text-muted-foreground">Bases</dt>
          <dd>{baseCount ?? "—"}</dd>
          <dt className="text-muted-foreground">Granted scopes</dt>
          <dd className="font-mono text-xs">
            {grantedScopes && grantedScopes.length ? grantedScopes.join(" ") : "—"}
          </dd>
        </dl>
      </section>

      {visibilityNote ? (
        <section className="rounded-lg border border-amber-300/40 bg-amber-50/60 p-4 text-sm dark:bg-amber-950/20">
          <p className="font-medium">Limited member visibility</p>
          <p className="mt-1 text-muted-foreground">{visibilityNote}</p>
        </section>
      ) : null}

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Visible users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No users returned."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Email</th>
                  <th>Domain</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id || u.email || Math.random()} className="border-t">
                    <td className="py-2">{u.email ?? "—"}</td>
                    <td>{u.domain ?? "—"}</td>
                    <td>
                      <span className={u.isAdmin ? "text-blue-600" : "text-green-600"}>
                        {u.isAdmin ? "owner (connected)" : "member"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Bases ({bases.length})</h2>
        {bases.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No bases visible to this connection."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Permission</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {bases.map((b) => (
                  <tr key={b.id || Math.random()} className="border-t">
                    <td className="py-2">{b.name ?? "—"}</td>
                    <td className="capitalize">{permissionLabel(b.permissionLevel)}</td>
                    <td className="font-mono text-xs text-muted-foreground">{b.id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
