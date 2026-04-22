"use client"

import { useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface GitHubMember {
  login: string
  id: number
  type: string
  site_admin: boolean
  role?: string
}

type FilterTab = "all" | "admins"

export function GitHubView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>("all")

  const settings: any = integration.settings || {}
  const allMembers: GitHubMember[] = (info?.members as GitHubMember[] | undefined) || []
  const orgInfo = info?.org as Record<string, any> | undefined
  const statusInfo = info?.status as Record<string, any> | undefined

  // Org summary data
  const orgLogin =
    orgInfo?.login ||
    statusInfo?.orgLogin ||
    settings.org_login ||
    "—"
  const planTier =
    statusInfo?.planTier ||
    settings.plan_tier ||
    "—"
  const copilotTier =
    statusInfo?.copilotTier ||
    settings.copilot_tier ||
    "—"
  const memberCount =
    statusInfo?.memberCount ??
    allMembers.length
  const copilotSeatCount =
    statusInfo?.copilotSeatCount ??
    null
  const lastValidated = settings.last_validated_at || statusInfo?.lastValidatedAt || null

  // Filtered members. Inactive detection happens server-side during analysis;
  // this tab is a roster view only.
  const adminMembers = allMembers.filter((m) => m.role === "admin" || m.site_admin)

  const filteredMembers = allMembers.filter((m) => {
    if (filter === "admins") return m.role === "admin" || m.site_admin
    return true
  })

  async function refresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      await reload()
    } catch (e: any) {
      setRefreshError(e?.message || "Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all",    label: `All (${allMembers.length})` },
    { key: "admins", label: `Admins (${adminMembers.length})` },
  ]

  return (
    <div className="space-y-6">
      {/* Org summary */}
      <section className="rounded-md border p-4 bg-background space-y-2">
        <h3 className="font-semibold">Organization</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {orgLogin !== "—" && (
            <>
              <dt className="text-muted-foreground">Org Login</dt>
              <dd className="truncate">
                <a
                  href={`https://github.com/${orgLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {orgLogin}
                </a>
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Plan Tier</dt>
          <dd className="capitalize">{planTier}</dd>
          <dt className="text-muted-foreground">Copilot Tier</dt>
          <dd className="capitalize">{copilotTier}</dd>
          <dt className="text-muted-foreground">Members</dt>
          <dd>{isLoading ? "…" : memberCount}</dd>
          {copilotSeatCount !== null && (
            <>
              <dt className="text-muted-foreground">Copilot Seats</dt>
              <dd>{isLoading ? "…" : copilotSeatCount}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Last Validated</dt>
          <dd>
            {lastValidated ? new Date(lastValidated).toLocaleString() : "—"}
          </dd>
        </dl>
      </section>

      {/* Members table */}
      <section className="rounded-md border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Members</h3>
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
                <th className="px-4 py-2 text-left font-medium">Login</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Profile</th>
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
              {!isLoading && filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                    No members match this filter.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredMembers.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{m.login}</td>
                    <td className="px-4 py-2">
                      {m.role === "admin" || m.site_admin ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                          admin
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          member
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={[
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          m.type === "Bot"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700",
                        ].join(" ")}
                      >
                        {m.type || "User"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={`https://github.com/${m.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on GitHub
                      </a>
                    </td>
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

export default GitHubView
