"use client"

import { useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

/** Zoom user type enum: 1 = Basic, 2 = Licensed, 3 = On-prem */
type ZoomUserType = 1 | 2 | 3

interface ZoomUser {
  id: string
  email: string
  type: ZoomUserType
  status: string
  last_login_time?: string
  first_name?: string
  last_name?: string
}

type FilterTab = "all" | "licensed" | "inactive"

const USER_TYPE_LABEL: Record<ZoomUserType, string> = {
  1: "Basic",
  2: "Licensed",
  3: "On-prem",
}

const INACTIVE_THRESHOLD_DAYS = 30

function isInactive(user: ZoomUser): boolean {
  if (!user.last_login_time) return true
  const lastLogin = new Date(user.last_login_time)
  const now = new Date()
  const diffMs = now.getTime() - lastLogin.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= INACTIVE_THRESHOLD_DAYS
}

export function ZoomView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>("all")

  const settings: any = integration.settings || {}
  const allUsers: ZoomUser[] = (info?.users as ZoomUser[] | undefined) || []
  const accountInfo = info?.account as Record<string, any> | undefined
  const statusInfo = info?.status as Record<string, any> | undefined

  // Aggregate stats
  const totalUsers = allUsers.length
  const licensedUsers = allUsers.filter((u) => u.type === 2).length
  const basicUsers = allUsers.filter((u) => u.type === 1).length
  const planTier =
    statusInfo?.planTier ||
    settings.plan_tier ||
    accountInfo?.plan_type ||
    "—"
  const lastValidated = settings.last_validated_at || statusInfo?.lastValidatedAt || null
  const accountName = settings.account_name || accountInfo?.account_name || null

  // Filtered user list
  const filteredUsers = allUsers.filter((u) => {
    if (filter === "licensed") return u.type === 2
    if (filter === "inactive") return isInactive(u)
    return true
  })

  async function refresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      // reload() re-runs all endpoint calls declared in the config
      await reload()
    } catch (e: any) {
      setRefreshError(e?.message || "Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${totalUsers})` },
    { key: "licensed", label: `Licensed (${licensedUsers})` },
    { key: "inactive", label: `Inactive (${allUsers.filter(isInactive).length})` },
  ]

  return (
    <div className="space-y-6">
      {/* Account summary */}
      <section className="rounded-md border p-4 bg-background space-y-2">
        <h3 className="font-semibold">Account</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {accountName && (
            <>
              <dt className="text-muted-foreground">Account Name</dt>
              <dd className="truncate">{accountName}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Plan Tier</dt>
          <dd className="capitalize">{planTier}</dd>
          <dt className="text-muted-foreground">Total Users</dt>
          <dd>{isLoading ? "…" : totalUsers}</dd>
          <dt className="text-muted-foreground">Licensed Users</dt>
          <dd>{isLoading ? "…" : licensedUsers}</dd>
          <dt className="text-muted-foreground">Basic Users</dt>
          <dd>{isLoading ? "…" : basicUsers}</dd>
          <dt className="text-muted-foreground">Last Validated</dt>
          <dd>
            {lastValidated ? new Date(lastValidated).toLocaleString() : "—"}
          </dd>
        </dl>
      </section>

      {/* Users table */}
      <section className="rounded-md border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Users</h3>
          <button
            onClick={refresh}
            disabled={refreshing || isLoading}
            className="text-xs underline disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={[
                "px-3 py-1 text-xs rounded-full border transition-colors",
                filter === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-muted hover:border-foreground",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Last Activity</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                    No users match this filter.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={[
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          u.type === 2
                            ? "bg-blue-100 text-blue-700"
                            : u.type === 3
                            ? "bg-purple-100 text-purple-700"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {USER_TYPE_LABEL[u.type] ?? `Type ${u.type}`}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {u.last_login_time
                        ? new Date(u.last_login_time).toLocaleDateString()
                        : <span className="text-destructive text-xs">Never</span>}
                    </td>
                    <td className="px-4 py-2 capitalize">{u.status || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {refreshError && (
          <p className="px-4 py-2 text-xs text-destructive">{refreshError}</p>
        )}
      </section>
    </div>
  )
}

export default ZoomView
