"use client"

import { useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

type Account = {
  id: string
  name: string
  email: string
  status: string
  joinedMethod?: string
  joinedTimestamp?: string | null
}

export function AwsView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [refreshingRegions, setRefreshingRegions] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const settings: any = integration.settings || {}
  const accounts: Account[] = info?.accounts || []
  const activeRegions: string[] =
    (info?.regions as string[] | undefined) ||
    (info?.activeRegions as string[] | undefined) ||
    settings.active_regions ||
    []
  const regionsRefreshedAt = settings.regions_refreshed_at || null

  async function refreshRegions() {
    setRefreshingRegions(true)
    setRefreshError(null)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired — please log in again")
      const res = await fetch(`${API_BASE}/api/integrations/aws/regions/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await reload()
    } catch (e: any) {
      setRefreshError(e?.message || "Failed to refresh regions")
    } finally {
      setRefreshingRegions(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization summary */}
      <section className="rounded-md border p-4 space-y-2 bg-background">
        <h3 className="font-semibold">Organization</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Organization ID</dt>
          <dd className="font-mono">{settings.organization_id || "—"}</dd>

          <dt className="text-muted-foreground">Management account</dt>
          <dd className="font-mono">{settings.master_account_id || "—"}</dd>

          <dt className="text-muted-foreground">Member accounts</dt>
          <dd>{accounts.length}</dd>

          <dt className="text-muted-foreground">Active regions</dt>
          <dd>{activeRegions.length}</dd>

          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{settings.last_validated_at ? new Date(settings.last_validated_at).toLocaleString() : "—"}</dd>
        </dl>
      </section>

      {/* Accounts table */}
      <section className="rounded-md border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">Accounts in this Organization</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Account ID</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-4 text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && accounts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-muted-foreground">No accounts returned.</td></tr>
              )}
              {accounts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{a.id}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.joinedTimestamp ? new Date(a.joinedTimestamp).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active regions */}
      <section className="rounded-md border p-4 bg-background space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Active regions</h3>
          <button
            onClick={refreshRegions}
            disabled={refreshingRegions}
            className="text-xs underline disabled:opacity-50"
          >
            {refreshingRegions ? "Refreshing…" : "Refresh regions"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeRegions.length === 0 ? (
            <span className="text-sm text-muted-foreground">No regions detected.</span>
          ) : (
            activeRegions.map((r) => (
              <span key={r} className="px-2 py-1 rounded border bg-muted/30 text-xs font-mono">{r}</span>
            ))
          )}
        </div>
        {regionsRefreshedAt && (
          <p className="text-xs text-muted-foreground">
            Last refreshed {new Date(regionsRefreshedAt).toLocaleString()}
          </p>
        )}
        {refreshError && <p className="text-xs text-destructive">{refreshError}</p>}
      </section>
    </div>
  )
}

export default AwsView
