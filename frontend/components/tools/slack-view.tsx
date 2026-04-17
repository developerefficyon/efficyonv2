"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SlackUser = {
  id: string
  name?: string
  real_name?: string
  email?: string | null
  is_bot?: boolean
  deleted?: boolean
  is_restricted?: boolean
  is_ultra_restricted?: boolean
  updated?: number | null
}

type SlackTeam = {
  id?: string
  name?: string
  domain?: string
  plan?: string | null
}

type Props = {
  data: {
    users?: SlackUser[]
    team?: SlackTeam | null
    teamInfo?: SlackTeam | null
  }
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  std: "Pro",
  standard: "Pro",
  plus: "Business+",
  compass: "Enterprise Grid",
}

type Filter = "all" | "billable" | "guests" | "bots" | "deleted"

function daysSince(unix?: number | null): number | null {
  if (!unix) return null
  const now = Math.floor(Date.now() / 1000)
  return Math.floor((now - unix) / 86400)
}

function statusBadge(u: SlackUser) {
  if (u.deleted) return <Badge variant="destructive">Deleted</Badge>
  if (u.is_bot) return <Badge variant="secondary">Bot</Badge>
  if (u.is_ultra_restricted) return <Badge variant="outline">Single-channel guest</Badge>
  if (u.is_restricted) return <Badge variant="outline">Multi-channel guest</Badge>
  const d = daysSince(u.updated)
  if (d !== null && d > 30) return <Badge variant="secondary">Inactive {d}d</Badge>
  return <Badge>Active</Badge>
}

function userIsBillableCandidate(u: SlackUser): boolean {
  if (u.is_bot) return false
  if (u.id === "USLACKBOT") return false
  if (u.deleted) return false
  if (u.is_ultra_restricted) return false
  return true
}

export function SlackView({ data }: Props) {
  const users = data.users ?? []
  const team = data.team ?? data.teamInfo ?? null
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (filter === "billable" && !userIsBillableCandidate(u)) return false
      if (filter === "guests" && !(u.is_restricted || u.is_ultra_restricted)) return false
      if (filter === "bots" && !u.is_bot) return false
      if (filter === "deleted" && !u.deleted) return false
      if (!q) return true
      return (
        u.name?.toLowerCase().includes(q) ||
        u.real_name?.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      )
    })
  }, [users, filter, query])

  const billableCount = users.filter(userIsBillableCandidate).length
  const planLabel = team?.plan ? (PLAN_LABEL[team.plan] ?? team.plan) : "Unknown"

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">
          No Slack users loaded. Connect your Slack workspace first.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Workspace</div>
            <div className="font-medium">{team?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Plan</div>
            <div className="font-medium">{planLabel}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total members</div>
            <div className="font-medium">{users.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Billable (est)</div>
            <div className="font-medium">{billableCount}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "billable", "guests", "bots", "deleted"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-sm border ${filter === f ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {f}
          </button>
        ))}
        <Input
          placeholder="Search name or email"
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
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const d = daysSince(u.updated)
                return (
                  <tr key={u.id} className="border-b hover:bg-muted/40">
                    <td className="p-3">{u.real_name || u.name || u.id}</td>
                    <td className="p-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="p-3">{statusBadge(u)}</td>
                    <td className="p-3 text-muted-foreground">
                      {d === null ? "—" : `${d}d ago`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default SlackView
