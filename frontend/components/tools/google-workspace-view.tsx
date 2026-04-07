"use client"

/**
 * GoogleWorkspaceView
 *
 * Detail-page body for the Google Workspace tool integration. Reads users,
 * domain, groups, and licenses from the generic `useToolInfo` payload — see
 * `lib/tools/configs/googleworkspace.ts` for the endpoint declarations.
 *
 * The Findings tab calls `/api/integrations/googleworkspace/cost-leaks`
 * on demand (it's expensive — pulls users + licenses + login activity in
 * parallel) and renders the Google-specific analyzer output.
 *
 * Independent of any Microsoft 365 view component or analyzer.
 */

import { useMemo, useState, useCallback } from "react"
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
  Sparkles,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { ToolViewProps } from "./registry"

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

interface CostLeakFinding {
  id: string
  type: string
  group: string
  severity: "high" | "medium" | "low"
  title: string
  description: string
  userEmail?: string
  userName?: string
  skus?: { skuId: string; name: string }[]
  potentialSavings?: number
  potentialMonthlySavings?: number
  lastLogin?: string | null
  daysSinceLogin?: number
  isAdmin?: boolean
  action?: string
}

interface CostLeakResult {
  timestamp: string
  inactivityThreshold: number
  licenseAnalysis: {
    findings: CostLeakFinding[]
    summary: {
      totalUsers: number
      totalLicenseAssignments: number
      usersWithLicenses: number
      suspendedUsers: number
      inactiveUsers: number
      usersWithout2sv: number
      totalPotentialSavings: number
    }
  }
  overallSummary: {
    totalFindings: number
    totalPotentialSavings: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
  }
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0)

interface HistoryItem {
  id: string
  provider: string
  parameters: any
  summary: {
    totalFindings: number
    totalPotentialSavings: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
  }
  created_at: string
}

export function GoogleWorkspaceView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [activeTab, setActiveTab] = useState<"users" | "licenses" | "groups" | "findings" | "domain">("users")
  const [search, setSearch] = useState("")
  const [analysis, setAnalysis] = useState<CostLeakResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [inactivityDays, setInactivityDays] = useState(30)
  const [findingsFilter, setFindingsFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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

  const persistAnalysis = useCallback(
    async (data: CostLeakResult) => {
      try {
        const token = await getBackendToken()
        const res = await fetch(`${apiBase}/api/analysis-history`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            integrationId: integration.id,
            provider: "GoogleWorkspace",
            parameters: { inactivityDays },
            analysisData: data,
          }),
        })
        if (!res.ok && res.status !== 409) {
          // 409 = duplicate (same params already saved); silently ignored
          const errData = await res.json().catch(() => ({}))
          console.warn("[GoogleWorkspace] Failed to persist analysis:", errData.error)
        }
      } catch (err) {
        console.warn("[GoogleWorkspace] Failed to persist analysis:", err)
      }
    },
    [integration.id, inactivityDays],
  )

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const token = await getBackendToken()
      const res = await fetch(`${apiBase}/api/integrations/googleworkspace/cost-leaks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inactivityDays }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Analysis failed")
      setAnalysis(data)
      toast.success("Analysis complete", {
        description: `${data.overallSummary.totalFindings} findings · ${fmtUsd(data.overallSummary.totalPotentialSavings)}/year potential savings`,
      })
      // Auto-persist to history (silent — duplicates are ignored)
      void persistAnalysis(data)
    } catch (err: any) {
      toast.error("Cost-leak analysis failed", { description: err.message })
    } finally {
      setIsAnalyzing(false)
    }
  }, [inactivityDays, persistAnalysis])

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const token = await getBackendToken()
      const res = await fetch(
        `${apiBase}/api/analysis-history?integrationId=${integration.id}&provider=GoogleWorkspace&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load history")
      setHistory(data.analyses || data.items || [])
    } catch (err: any) {
      toast.error("Failed to load history", { description: err.message })
    } finally {
      setIsLoadingHistory(false)
    }
  }, [integration.id])

  const loadHistoricalAnalysis = useCallback(
    async (id: string) => {
      try {
        const token = await getBackendToken()
        const res = await fetch(`${apiBase}/api/analysis-history/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load analysis")
        const payload = data.analysis_data || data.analysisData || data
        setAnalysis(payload as CostLeakResult)
        if (payload?.inactivityThreshold) setInactivityDays(payload.inactivityThreshold)
        setShowHistory(false)
        toast.success("Loaded historical analysis", {
          description: new Date(data.created_at || Date.now()).toLocaleString(),
        })
      } catch (err: any) {
        toast.error("Failed to load analysis", { description: err.message })
      }
    },
    [],
  )

  const filteredFindings = useMemo(() => {
    if (!analysis) return []
    if (findingsFilter === "all") return analysis.licenseAnalysis.findings
    return analysis.licenseAnalysis.findings.filter((f) => f.severity === findingsFilter)
  }, [analysis, findingsFilter])

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
          <TabsTrigger value="findings" className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Findings
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

        {/* FINDINGS */}
        <TabsContent value="findings" className="mt-0 space-y-4">
          {!analysis ? (
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="py-12 text-center space-y-4">
                <Sparkles className="w-8 h-8 mx-auto text-emerald-400/40" />
                <div>
                  <p className="text-white/80 text-[14px] mb-1">Analyze cost leaks</p>
                  <p className="text-white/30 text-[12px]">
                    Pulls users + licenses + login activity and flags suspended-but-licensed users,
                    inactive users, downgrade candidates, and missing 2SV.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <select
                    value={inactivityDays}
                    onChange={(e) => setInactivityDays(Number(e.target.value))}
                    className="text-[12px] bg-white/[0.03] border border-white/[0.06] text-white/70 rounded-md px-2 py-1.5"
                  >
                    <option value={14}>Inactive 14+ days</option>
                    <option value={30}>Inactive 30+ days</option>
                    <option value={60}>Inactive 60+ days</option>
                    <option value={90}>Inactive 90+ days</option>
                  </select>
                  <Button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black h-8 text-[12px]"
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    Analyze
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  icon={<TrendingDown className="w-3.5 h-3.5 text-emerald-400/80" />}
                  label="Annual savings"
                  value={fmtUsd(analysis.overallSummary.totalPotentialSavings)}
                />
                <KpiCard
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-400/80" />}
                  label="High severity"
                  value={analysis.overallSummary.highSeverity}
                  tone="danger"
                />
                <KpiCard
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400/80" />}
                  label="Medium"
                  value={analysis.overallSummary.mediumSeverity}
                  tone="warning"
                />
                <KpiCard
                  icon={<ShieldCheck className="w-3.5 h-3.5 text-white/40" />}
                  label="Low"
                  value={analysis.overallSummary.lowSeverity}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px]">
                  {(["all", "high", "medium", "low"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFindingsFilter(f)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        findingsFilter === f
                          ? "bg-white/[0.08] text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      if (!showHistory) loadHistory()
                      setShowHistory((s) => !s)
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white h-8 text-[12px]"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    History
                  </Button>
                  <Button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    variant="outline"
                    size="sm"
                    className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white h-8 text-[12px]"
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                    Re-analyze
                  </Button>
                </div>
              </div>

              {showHistory && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-medium text-white/70">Saved analyses</p>
                      <button
                        onClick={() => setShowHistory(false)}
                        className="text-white/30 hover:text-white/60 text-[11px]"
                      >
                        Close
                      </button>
                    </div>
                    {isLoadingHistory ? (
                      <div className="py-6 text-center">
                        <Loader2 className="w-4 h-4 animate-spin text-white/30 mx-auto" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="py-6 text-center text-[11px] text-white/30">No saved analyses yet</p>
                    ) : (
                      <div className="space-y-1.5">
                        {history.map((h) => (
                          <button
                            key={h.id}
                            onClick={() => loadHistoricalAnalysis(h.id)}
                            className="w-full text-left flex items-center justify-between p-2.5 rounded-md bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
                          >
                            <div>
                              <div className="text-[11.5px] text-white/80">
                                {new Date(h.created_at).toLocaleString()}
                              </div>
                              <div className="text-[10.5px] text-white/30">
                                {h.summary?.totalFindings || 0} findings · inactivity{" "}
                                {h.parameters?.inactivityDays || 30}d
                              </div>
                            </div>
                            <div className="text-[12px] text-emerald-400/80 font-display">
                              {fmtUsd(h.summary?.totalPotentialSavings || 0)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {filteredFindings.map((f) => (
                  <Card key={f.id} className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityBadge severity={f.severity} />
                            <span className="text-[10px] uppercase tracking-wide text-white/30">{f.group}</span>
                          </div>
                          <p className="text-[13px] font-medium text-white/85 mb-1">{f.title}</p>
                          <p className="text-[11.5px] text-white/40 mb-2">{f.description}</p>
                          {f.action && (
                            <p className="text-[11px] text-emerald-400/60">→ {f.action}</p>
                          )}
                        </div>
                        {(f.potentialSavings || 0) > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-white/30">Save</div>
                            <div className="text-[15px] font-display text-emerald-400/90">
                              {fmtUsd(f.potentialSavings || 0)}
                            </div>
                            <div className="text-[10px] text-white/30">/year</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredFindings.length === 0 && (
                  <div className="py-10 text-center text-white/30 text-[12px]">
                    No findings at this severity level
                  </div>
                )}
              </div>
            </>
          )}
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

function SeverityBadge({ severity }: { severity: "high" | "medium" | "low" }) {
  const styles =
    severity === "high"
      ? "bg-rose-500/10 text-rose-400/90 border-rose-500/20"
      : severity === "medium"
      ? "bg-amber-500/10 text-amber-400/90 border-amber-500/20"
      : "bg-white/[0.04] text-white/50 border-white/[0.08]"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9.5px] uppercase tracking-wide font-medium border ${styles}`}>
      {severity}
    </span>
  )
}
