"use client"

import type { ToolViewProps } from "@/lib/tools/types"

interface SfUser {
  Id: string
  Username: string
  Name: string
  Email?: string
  IsActive: boolean
  LastLoginDate?: string | null
  Profile?: {
    Name?: string
    UserLicense?: { MasterLabel?: string; LicenseDefinitionKey?: string }
  }
}

interface SfLicense {
  Id: string
  MasterLabel: string
  LicenseDefinitionKey: string
  Status: string
  TotalLicenses: number
  UsedLicenses: number
}

interface SfPSL {
  Id: string
  MasterLabel: string
  DeveloperName: string
  Status: string
  TotalLicenses: number
  UsedLicenses: number
  ExpirationDate?: string | null
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString()
}

export function SalesforceView({ integration, info, isLoading }: ToolViewProps) {
  const settings: any = integration.settings || {}
  const statusInfo = info?.status as Record<string, any> | undefined
  const users: SfUser[] = (info?.users as SfUser[] | undefined) || []
  const licenses: SfLicense[] = (info?.licenses as SfLicense[] | undefined) || []
  const psls: SfPSL[] = (info?.psls as SfPSL[] | undefined) || []

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Salesforce Org</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Org ID</dt>
          <dd className="font-mono">{statusInfo?.orgId || settings.org_id || "—"}</dd>
          <dt className="text-muted-foreground">Instance URL</dt>
          <dd className="break-all">{statusInfo?.instanceUrl || settings.instance_url || "—"}</dd>
          <dt className="text-muted-foreground">Org Type</dt>
          <dd>{statusInfo?.orgType || settings.org_type || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Username</th>
                <th>Profile</th>
                <th>License</th>
                <th>Active</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.Id} className="border-t">
                  <td className="py-2">{u.Username}</td>
                  <td>{u.Profile?.Name || "—"}</td>
                  <td>{u.Profile?.UserLicense?.MasterLabel || "—"}</td>
                  <td>{u.IsActive ? "Yes" : "No"}</td>
                  <td>{formatDate(u.LastLoginDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">User License Allocations ({licenses.length})</h2>
        {licenses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No licenses returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">License</th>
                <th>Status</th>
                <th>Used</th>
                <th>Total</th>
                <th>Unused</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.Id} className="border-t">
                  <td className="py-2">{l.MasterLabel}</td>
                  <td>{l.Status}</td>
                  <td>{l.UsedLicenses}</td>
                  <td>{l.TotalLicenses}</td>
                  <td>{Math.max(0, l.TotalLicenses - l.UsedLicenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Permission Set Licenses ({psls.length})</h2>
        {psls.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No PSLs returned.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">PSL</th>
                <th>Status</th>
                <th>Used</th>
                <th>Total</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {psls.map((p) => (
                <tr key={p.Id} className="border-t">
                  <td className="py-2">{p.MasterLabel}</td>
                  <td>{p.Status}</td>
                  <td>{p.UsedLicenses}</td>
                  <td>{p.TotalLicenses}</td>
                  <td>{formatDate(p.ExpirationDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  )
}
