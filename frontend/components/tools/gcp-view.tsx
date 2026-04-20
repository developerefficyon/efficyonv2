"use client"

import { useMemo, useState } from "react"
import type { ToolViewProps } from "@/lib/tools/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type GcpProject = {
  projectId: string
  displayName?: string
  state?: string
  createTime?: string
}

type GcpStatus = {
  status?: string
  organizationId?: string | null
  updatedAt?: string
}

type InfoShape = {
  projects?: GcpProject[]
  status?: GcpStatus | null
}

type Filter = "all" | "active"

function formatDate(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

function statusBadge(state?: string) {
  if (!state) return <Badge variant="outline">Unknown</Badge>
  if (state === "ACTIVE") return <Badge>Active</Badge>
  if (state === "DELETE_REQUESTED" || state === "DELETE_IN_PROGRESS") return <Badge variant="destructive">Deleting</Badge>
  return <Badge variant="secondary">{state}</Badge>
}

export function GcpView({ info }: ToolViewProps) {
  const data = (info ?? {}) as InfoShape
  const projects = data.projects ?? []
  const status = data.status ?? null
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      if (filter === "active" && p.state !== "ACTIVE") return false
      if (!q) return true
      return (
        p.projectId?.toLowerCase().includes(q) ||
        p.displayName?.toLowerCase().includes(q)
      )
    })
  }, [projects, filter, query])

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">
          No GCP projects loaded. Ensure the service account has <code>roles/browser</code> at the organization level, then reload.
        </CardContent>
      </Card>
    )
  }

  const activeCount = projects.filter((p) => p.state === "ACTIVE").length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Organization ID</div>
            <div className="font-medium truncate">{status?.organizationId ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total projects</div>
            <div className="font-medium">{projects.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active projects</div>
            <div className="font-medium">{activeCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last synced</div>
            <div className="font-medium">{formatDate(status?.updatedAt)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "active"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-sm border ${filter === f ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {f}
          </button>
        ))}
        <Input
          placeholder="Search project id or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Project ID</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">State</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.projectId} className="border-b hover:bg-muted/40">
                  <td className="p-3 font-mono">{p.projectId}</td>
                  <td className="p-3 text-muted-foreground">{p.displayName ?? "—"}</td>
                  <td className="p-3">{statusBadge(p.state)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(p.createTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default GcpView
