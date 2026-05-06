"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface AsanaUser {
  membershipGid: string | null
  id: string | null
  name: string | null
  email: string | null
  isActive: boolean
  isAdmin: boolean
  isGuest: boolean
  createdAt: string | null
  vacationDates: { start_on?: string | null; end_on?: string | null } | null
}

function relative(iso: string | null): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "just now"
  const days = Math.floor(ms / 86400000)
  if (days < 1) return "today"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function seatLabel(u: AsanaUser): string {
  if (!u.isActive) return "deactivated"
  if (u.isGuest) return "guest"
  if (u.isAdmin) return "admin"
  return "member"
}

export function AsanaView({ integration, info, isLoading }: ToolViewProps) {
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: AsanaUser[] = (info?.users as AsanaUser[] | undefined) || []

  const workspaceName =
    statusInfo?.workspaceName || integration.settings?.workspace_name || null
  const isOrganization =
    !!(statusInfo?.isOrganization ?? integration.settings?.workspace_is_organization)
  const planTier = statusInfo?.planTier || integration.settings?.plan_tier || null
  const subscribedSeats =
    statusInfo?.subscribedSeats ?? integration.settings?.subscribed_seats ?? null

  const total = users.length
  const active = users.filter((u) => u.isActive && !u.isGuest).length
  const guests = users.filter((u) => u.isGuest).length
  const admins = users.filter((u) => u.isAdmin).length
  const deactivated = users.filter((u) => !u.isActive).length

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Workspace</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{workspaceName ?? "—"}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{isOrganization ? "Organization" : "Workspace"}</dd>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd className="capitalize">{planTier ?? "—"}</dd>
          <dt className="text-muted-foreground">Subscribed seats</dt>
          <dd>{subscribedSeats ?? "—"}</dd>
          <dt className="text-muted-foreground">Active members</dt>
          <dd>{active}</dd>
          <dt className="text-muted-foreground">Admins</dt>
          <dd>{admins}</dd>
          <dt className="text-muted-foreground">Guests</dt>
          <dd>{guests}</dd>
          <dt className="text-muted-foreground">Deactivated</dt>
          <dd>{deactivated}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Members ({total})</h2>
        {total === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No members returned."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Seat type</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.membershipGid || u.id || u.email || Math.random()} className="border-t">
                    <td className="py-2">{u.name ?? "—"}</td>
                    <td>{u.email ?? "—"}</td>
                    <td>
                      <span
                        className={
                          !u.isActive
                            ? "text-red-600"
                            : u.isGuest
                            ? "text-muted-foreground"
                            : u.isAdmin
                            ? "text-blue-600"
                            : "text-green-600"
                        }
                      >
                        {seatLabel(u)}
                      </span>
                    </td>
                    <td>{u.createdAt ? relative(u.createdAt) : "—"}</td>
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
