"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface MondayUser {
  id: string
  name: string | null
  email: string | null
  enabled: boolean
  isPending: boolean
  isViewOnly: boolean
  isGuest: boolean
  isAdmin: boolean
  lastActivity: string | null
  joinDate: string | null
}

function relative(iso: string | null): string {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "just now"
  const days = Math.floor(ms / 86400000)
  if (days < 1) return "today"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function seatLabel(u: MondayUser): string {
  if (!u.enabled) return "disabled"
  if (u.isPending) return "pending"
  if (u.isGuest) return "guest"
  if (u.isViewOnly) return "view-only"
  if (u.isAdmin) return "admin"
  return "member"
}

export function MondayView({ integration, info, isLoading }: ToolViewProps) {
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: MondayUser[] = (info?.users as MondayUser[] | undefined) || []

  const accountName = statusInfo?.accountName || integration.settings?.account_name || null
  const planTier = statusInfo?.planTier || integration.settings?.plan_tier || null
  const planMaxUsers = statusInfo?.planMaxUsers || integration.settings?.plan_max_users || null

  const total = users.length
  const active = users.filter((u) => u.enabled && !u.isPending).length
  const pending = users.filter((u) => u.isPending).length
  const viewOnly = users.filter((u) => u.isViewOnly && !u.isGuest).length
  const guests = users.filter((u) => u.isGuest).length
  const disabled = users.filter((u) => !u.enabled).length

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{accountName ?? "—"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd className="capitalize">{planTier ?? "—"}</dd>
          <dt className="text-muted-foreground">Seat tier (billed)</dt>
          <dd>{planMaxUsers ?? "—"}</dd>
          <dt className="text-muted-foreground">Active members</dt>
          <dd>{active}</dd>
          <dt className="text-muted-foreground">Pending invites</dt>
          <dd>{pending}</dd>
          <dt className="text-muted-foreground">View-only</dt>
          <dd>{viewOnly}</dd>
          <dt className="text-muted-foreground">Guests</dt>
          <dd>{guests}</dd>
          <dt className="text-muted-foreground">Disabled (still in dir)</dt>
          <dd>{disabled}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Members ({total})</h2>
        {total === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No users returned."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Seat type</th>
                  <th>Last activity</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2">{u.name ?? "—"}</td>
                    <td>{u.email ?? "—"}</td>
                    <td>
                      <span
                        className={
                          !u.enabled
                            ? "text-red-600"
                            : u.isPending
                            ? "text-amber-600"
                            : u.isGuest
                            ? "text-muted-foreground"
                            : "text-green-600"
                        }
                      >
                        {seatLabel(u)}
                      </span>
                    </td>
                    <td>{relative(u.lastActivity)}</td>
                    <td>{u.joinDate ? relative(u.joinDate) : "—"}</td>
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
