"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface AtlassianUser {
  accountId: string
  accountStatus: string
  accountType: string
  name: string | null
  email: string | null
  billable: boolean
  lastActive: string | null
  products: {
    jira: { lastActive: string | null; name: string } | null
    confluence: { lastActive: string | null; name: string } | null
    other: Array<{ id: string; name: string; lastActive: string | null }>
  }
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

export function AtlassianView({ integration, info, isLoading }: ToolViewProps) {
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: AtlassianUser[] = (info?.users as AtlassianUser[] | undefined) || []

  const activeUsers = users.filter((u) => u.accountStatus === "active")
  const jiraUsers = users.filter((u) => u.products.jira)
  const confluenceUsers = users.filter((u) => u.products.confluence)
  const bothUsers = users.filter((u) => u.products.jira && u.products.confluence)

  const orgName = statusInfo?.orgName || integration.settings?.org_name || null
  const cloudSites: Array<{ cloudId: string; name: string; url: string }> =
    statusInfo?.cloudSites || integration.settings?.cloud_sites || []

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Organization</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{orgName ?? "—"}</dd>
          <dt className="text-muted-foreground">Cloud sites</dt>
          <dd>{cloudSites.length}</dd>
          <dt className="text-muted-foreground">Users (total)</dt>
          <dd>{users.length}</dd>
          <dt className="text-muted-foreground">Active</dt>
          <dd>{activeUsers.length}</dd>
          <dt className="text-muted-foreground">Jira-licensed</dt>
          <dd>{jiraUsers.length}</dd>
          <dt className="text-muted-foreground">Confluence-licensed</dt>
          <dd>{confluenceUsers.length}</dd>
          <dt className="text-muted-foreground">Both</dt>
          <dd>{bothUsers.length}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Members ({users.length})</h2>
        {users.length === 0 ? (
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
                  <th>Status</th>
                  <th>Jira last-active</th>
                  <th>Confluence last-active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.accountId} className="border-t">
                    <td className="py-2">{u.name ?? "—"}</td>
                    <td>{u.email ?? "—"}</td>
                    <td>
                      <span
                        className={
                          u.accountStatus === "active"
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td>
                      {u.products.jira ? (
                        relative(u.products.jira.lastActive)
                      ) : (
                        <span className="text-muted-foreground">no license</span>
                      )}
                    </td>
                    <td>
                      {u.products.confluence ? (
                        relative(u.products.confluence.lastActive)
                      ) : (
                        <span className="text-muted-foreground">no license</span>
                      )}
                    </td>
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
