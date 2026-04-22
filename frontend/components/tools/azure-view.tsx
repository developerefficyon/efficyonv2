"use client"

import { useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

type Subscription = { id: string; name: string; state: string }

export function AzureView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const settings: any = integration.settings || {}
  const subs: Subscription[] =
    (info?.subscriptions as Subscription[] | undefined) ||
    settings.active_subscriptions ||
    []
  const refreshedAt = settings.subscriptions_refreshed_at || null

  async function refresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      const res = await fetch(`${API_BASE}/api/integrations/azure/subscriptions/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await reload()
    } catch (e: any) {
      setRefreshError(e?.message || "Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border p-4 bg-background space-y-2">
        <h3 className="font-semibold">Tenant</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Tenant ID</dt>
          <dd className="font-mono truncate">{settings.tenant_id || "—"}</dd>
          <dt className="text-muted-foreground">Subscriptions</dt>
          <dd>{subs.length}</dd>
          <dt className="text-muted-foreground">Last validated</dt>
          <dd>{settings.last_validated_at ? new Date(settings.last_validated_at).toLocaleString() : "—"}</dd>
        </dl>
      </section>

      <section className="rounded-md border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Subscriptions</h3>
          <button onClick={refresh} disabled={refreshing} className="text-xs underline disabled:opacity-50">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Subscription ID</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={3} className="px-4 py-4 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && subs.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-muted-foreground">No subscriptions visible.</td></tr>
              )}
              {subs.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {refreshedAt && <p className="px-4 py-2 text-xs text-muted-foreground">Last refreshed {new Date(refreshedAt).toLocaleString()}</p>}
        {refreshError && <p className="px-4 py-2 text-xs text-destructive">{refreshError}</p>}
      </section>
    </div>
  )
}

export default AzureView
