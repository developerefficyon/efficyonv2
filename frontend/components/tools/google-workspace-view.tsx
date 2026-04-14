"use client"

/**
 * GoogleWorkspaceView
 *
 * Detail-page body for the Google Workspace tool integration. Reads users,
 * domain, groups, and licenses from the generic `useToolInfo` payload — see
 * `lib/tools/configs/googleworkspace.ts` for the endpoint declarations.
 *
 * Cost-leak analysis is handled by the shared <AnalysisTab> in the
 * ToolDetailTabs wrapper — this view only renders the raw data tabs.
 *
 * Independent of any Microsoft 365 view component or analyzer.
 */

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  RefreshCw,
  Loader2,
  Users,
  Globe,
  Search,
  ShieldAlert,
  CheckCircle,
  CreditCard,
  UsersRound,
} from "lucide-react"
import type { ToolViewProps } from "@/lib/tools/types"

interface DirectoryUser {
  id?: string
  primaryEmail?: string
  name?: { fullName?: string }
  isAdmin?: boolean
  suspended?: boolean
  isEnrolledIn2Sv?: boolean
  lastLoginTime?: string
  creationTime?: string
  orgUnitPath?: string
}

interface DomainInfo {
  customerDomain?: string
  postalAddress?: { organizationName?: string; countryCode?: string }
  alternateEmail?: string
  language?: string
  customerCreationTime?: string
}

interface DirectoryGroup {
  id?: string
  email?: string
  name?: string
  description?: string
  directMembersCount?: string | number
}

interface LicenseAssignment {
  productId?: string
  skuId?: string
  skuName?: string
  userId?: string
}

interface SkuSummaryRow {
  skuId: string
  skuName: string
  productId: string
  assigned: number
}

export function GoogleWorkspaceView({ info, isLoading, reload }: ToolViewProps) {
  const [activeTab, setActiveTab] = useState<"users" | "licenses" | "groups" | "domain">("users")
  const [search, setSearch] = useState("")

  const users = (info?.users as DirectoryUser[]) || []
  const domain = info?.domain as DomainInfo | undefined
  const groups = (info?.groups as DirectoryGroup[]) || []
  const licenses = info?.licenses as { assignments: LicenseAssignment[]; skuSummary: SkuSummaryRow[] } | undefined

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.primaryEmail?.toLowerCase().includes(q) ||
        u.name?.fullName?.toLowerCase().includes(q) ||
        u.orgUnitPath?.toLowerCase().includes(q),
    )
  }, [users, search])

  const stats = useMemo(() => {
    const total = users.length
    const suspended = users.filter((u) => u.suspended).length
    const admins = users.filter((u) => u.isAdmin).length
    const without2sv = users.filter((u) => !u.isEnrolledIn2Sv && !u.suspended).length
    return { total, suspended, admins, without2sv }
  }, [users])

  const totalLicenses = useMemo(
    () => licenses?.skuSummary?.reduce((s, sku) => s + sku.assigned, 0) || 0,
    [licenses],
  )

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400/60" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-white/30">
          <Globe className="w-3.5 h-3.5 text-emerald-400/60" />
          {domain?.customerDomain || "Google Workspace"}
        </div>
        <Button
          onClick={() => reload()}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white h-8 text-[12px]"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Users className="w-3.5 h-3.5" />} label="Users" value={stats.total} />
        <KpiCard icon={<CreditCard className="w-3.5 h-3.5" />} label="Licenses assigned" value={totalLicenses} />
        <KpiCard icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Admins" value={stats.admins} />
        <KpiCard icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400/70" />} label="Without 2SV" value={stats.without2sv} tone="warning" />
        <KpiCard icon={<Users className="w-3.5 h-3.5 text-rose-400/70" />} label="Suspended" value={stats.suspended} tone="danger" />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-white/[0.02] border border-white/[0.06] mb-4 rounded-lg p-1 flex-wrap h-auto">
          <TabsTrigger value="users" className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="licenses" className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Licenses
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md">
            <UsersRound className="w-3.5 h-3.5 mr-1.5" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="domain" className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md">
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Domain
          </TabsTrigger>
        </TabsList>

        {/* USERS */}
        <TabsContent value="users" className="mt-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <Input
              type="search"
              name="gw-user-search"
              autoComplete="off"
              placeholder="Search by email, name, or org unit"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20 text-[12px] rounded-lg"
            />
          </div>

          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[#0a0a0a]">
                    <tr className="text-left text-white/40 border-b border-white/[0.06]">
                      <th className="font-medium py-2.5 px-3">Email</th>
                      <th className="font-medium py-2.5 px-3">Name</th>
                      <th className="font-medium py-2.5 px-3">Org unit</th>
                      <th className="font-medium py-2.5 px-3">2SV</th>
                      <th className="font-medium py-2.5 px-3">Status</th>
                      <th className="font-medium py-2.5 px-3">Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id || u.primaryEmail} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-white/80 font-mono text-[11.5px]">
                          {u.primaryEmail}
                          {u.isAdmin && <span className="ml-2 text-[9.5px] uppercase tracking-wide text-emerald-400/70">admin</span>}
                        </td>
                        <td className="py-2.5 px-3 text-white/60">{u.name?.fullName || "—"}</td>
                        <td className="py-2.5 px-3 text-white/40 font-mono text-[11px]">{u.orgUnitPath || "/"}</td>
                        <td className="py-2.5 px-3">
                          {u.isEnrolledIn2Sv ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70" /> : <span className="text-amber-400/70 text-[11px]">off</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {u.suspended ? <span className="text-rose-400/80 text-[11px]">suspended</span> : <span className="text-emerald-400/80 text-[11px]">active</span>}
                        </td>
                        <td className="py-2.5 px-3 text-white/40 text-[11px]">
                          {u.lastLoginTime ? new Date(u.lastLoginTime).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-white/30 text-[12px]">No users match your search</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LICENSES */}
        <TabsContent value="licenses" className="mt-0 space-y-3">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-5">
              <div className="text-[13px] font-medium text-white/70 mb-4">License assignments by SKU</div>
              {licenses?.skuSummary && licenses.skuSummary.length > 0 ? (
                <div className="space-y-2">
                  {licenses.skuSummary.map((sku) => (
                    <div key={sku.skuId} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div>
                        <div className="text-[13px] text-white/80 font-medium">{sku.skuName}</div>
                        <div className="text-[11px] text-white/30 font-mono">{sku.skuId}</div>
                      </div>
                      <div className="text-[18px] font-display text-white">{sku.assigned}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[12px] text-white/30">
                  No license data. Reconnect to grant the License Manager scope if needed.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GROUPS */}
        <TabsContent value="groups" className="mt-0">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[#0a0a0a]">
                    <tr className="text-left text-white/40 border-b border-white/[0.06]">
                      <th className="font-medium py-2.5 px-3">Email</th>
                      <th className="font-medium py-2.5 px-3">Name</th>
                      <th className="font-medium py-2.5 px-3">Description</th>
                      <th className="font-medium py-2.5 px-3 text-right">Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.id || g.email} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-white/80 font-mono text-[11.5px]">{g.email}</td>
                        <td className="py-2.5 px-3 text-white/60">{g.name}</td>
                        <td className="py-2.5 px-3 text-white/40 text-[11px] max-w-md truncate">{g.description || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-white/60">{g.directMembersCount || 0}</td>
                      </tr>
                    ))}
                    {groups.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-white/30 text-[12px]">No groups found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOMAIN */}
        <TabsContent value="domain" className="mt-0">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-5 space-y-3">
              <DomainRow label="Primary domain" value={domain?.customerDomain} mono />
              <DomainRow label="Organization" value={domain?.postalAddress?.organizationName} />
              <DomainRow label="Country" value={domain?.postalAddress?.countryCode} />
              <DomainRow label="Alternate email" value={domain?.alternateEmail} mono />
              <DomainRow label="Language" value={domain?.language} />
              <DomainRow
                label="Customer since"
                value={domain?.customerCreationTime ? new Date(domain.customerCreationTime).toLocaleDateString() : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  tone?: "neutral" | "warning" | "danger"
}) {
  const toneColor = tone === "danger" ? "text-rose-400/90" : tone === "warning" ? "text-amber-400/90" : "text-white"
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          {icon}
          {label}
        </div>
        <div className={`text-2xl font-display tracking-tight ${toneColor}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function DomainRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[12px] py-1.5 border-b border-white/[0.03] last:border-b-0">
      <span className="text-white/40">{label}</span>
      <span className={`text-white/80 text-right ${mono ? "font-mono text-[11.5px]" : ""}`}>{value || "—"}</span>
    </div>
  )
}

