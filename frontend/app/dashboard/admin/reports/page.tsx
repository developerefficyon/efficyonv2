"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Search,
  BarChart3,
  TrendingUp,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"

interface AnalysisEntry {
  id: string
  provider: string
  company_name: string
  totalFindings: number
  totalPotentialSavings: number
  highSeverity: number
  mediumSeverity: number
  lowSeverity: number
  created_at: string
}

interface ReportsData {
  stats: {
    totalAnalyses: number
    analysesThisMonth: number
    totalSavingsIdentified: number
    byProvider: Record<string, number>
  }
  recentAnalyses: AnalysisEntry[]
}

const providerConfig: Record<string, { label: string; color: string; bg: string }> = {
  Fortnox: { label: "Fortnox", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  Microsoft365: { label: "Microsoft 365", color: "text-blue-400", bg: "bg-blue-500/20" },
  HubSpot: { label: "HubSpot", color: "text-orange-400", bg: "bg-orange-500/20" },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function AdminReportsPage() {
  const cachedData = getCache<ReportsData>("admin-reports")
  const [data, setData] = useState<ReportsData | null>(cachedData || null)
  const [isLoading, setIsLoading] = useState(!cachedData)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchReports = async () => {
      try {
        if (!getCache("admin-reports")) {
          setIsLoading(true)
        }
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const accessToken = await getBackendToken()

        if (!accessToken) {
          toast.error("Session expired", { description: "Please log in again" })
          return
        }

        const res = await fetch(`${apiBase}/api/admin/reports`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
          let errorMessage = `Failed to fetch reports: ${res.status}`
          try {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = `Failed to fetch reports: ${res.status} ${res.statusText}`
          }
          throw new Error(errorMessage)
        }

        const result: ReportsData = await res.json()
        setData(result)
        setCache("admin-reports", result)
      } catch (error) {
        console.error("Error fetching reports:", error)
        toast.error("Failed to load reports", {
          description: error instanceof Error ? error.message : "An error occurred",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchReports()
  }, [])

  const stats = data?.stats
  const recentAnalyses = data?.recentAnalyses || []
  const byProvider = stats?.byProvider || {}

  // Filter analyses by search query
  const filteredAnalyses = searchQuery
    ? recentAnalyses.filter(
        (a) =>
          a.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.provider.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentAnalyses

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="animate-slide-up delay-0">
        <p className="text-[13px] text-white/30 font-medium mb-1">Analysis Overview</p>
        <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
          Customer <span className="italic text-emerald-400/90">Reports</span>
        </h2>
        <p className="text-[14px] text-white/35 mt-1">Analysis activity across all customers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={`bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-${i + 1}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-white/[0.05] animate-pulse" />
                  <div className="h-3 w-24 bg-white/[0.05] rounded animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-white/[0.05] rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-1">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-400/70" />
                  </div>
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Total Analyses</span>
                </div>
                <p className="text-3xl font-semibold text-white tracking-tight">{stats?.totalAnalyses ?? 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-2">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-blue-400/70" />
                  </div>
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">This Month</span>
                </div>
                <p className="text-3xl font-semibold text-white tracking-tight">{stats?.analysesThisMonth ?? 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-3">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400/70" />
                  </div>
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Savings Identified</span>
                </div>
                <p className="text-3xl font-semibold text-white tracking-tight">
                  {formatCurrency(stats?.totalSavingsIdentified ?? 0)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Provider Breakdown */}
      {isLoading ? (
        <div>
          <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider mb-3">By Provider</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-4">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-md bg-white/[0.05] animate-pulse" />
                    <div className="h-3 w-20 bg-white/[0.05] rounded animate-pulse" />
                  </div>
                  <div className="h-7 w-28 bg-white/[0.05] rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : Object.keys(byProvider).length > 0 ? (
        <div>
          <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider mb-3">By Provider</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(byProvider).map(([provider, count]) => {
              const config = providerConfig[provider] || {
                label: provider,
                color: "text-gray-400",
                bg: "bg-gray-500/20",
              }
              return (
                <Card key={provider} className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-4">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md ${config.bg} flex items-center justify-center`}>
                        <BarChart3 className={`w-3.5 h-3.5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{config.label}</p>
                        <p className="text-xl font-semibold text-white tracking-tight">{count} {count === 1 ? "analysis" : "analyses"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Recent Analyses */}
      <div>
        <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider mb-3">Recent Analyses</p>

        {/* Search */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl mb-4">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/25" />
              <Input
                placeholder="Search by company or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
          <CardHeader>
            <CardTitle className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Analysis History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="w-7 h-7 rounded-md bg-white/[0.05] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-48 bg-white/[0.05] rounded animate-pulse" />
                      <div className="h-3 w-32 bg-white/[0.05] rounded animate-pulse" />
                    </div>
                    <div className="h-3.5 w-20 bg-white/[0.05] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredAnalyses.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/25">
                  {searchQuery ? "No analyses match your search" : "No analyses recorded yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAnalyses.map((analysis) => {
                  const config = providerConfig[analysis.provider] || {
                    label: analysis.provider,
                    color: "text-gray-400",
                    bg: "bg-gray-500/20",
                  }
                  return (
                    <div
                      key={analysis.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
                    >
                      {/* Provider badge */}
                      <div className={`w-7 h-7 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <BarChart3 className={`w-3.5 h-3.5 ${config.color}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/80 truncate">{analysis.company_name}</p>
                        <div className="flex items-center gap-2 sm:gap-3 text-[12px] text-white/40 mt-1 flex-wrap">
                          <span className={config.color}>{config.label}</span>
                          <span className="hidden sm:inline text-white/20">·</span>
                          <span>{analysis.totalFindings} findings</span>
                        </div>
                      </div>

                      {/* Severity badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {analysis.highSeverity > 0 && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400/80">
                            <AlertTriangle className="w-3 h-3" />
                            {analysis.highSeverity}
                          </span>
                        )}
                        {analysis.mediumSeverity > 0 && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400/80">
                            <AlertCircle className="w-3 h-3" />
                            {analysis.mediumSeverity}
                          </span>
                        )}
                        {analysis.lowSeverity > 0 && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/80">
                            <Info className="w-3 h-3" />
                            {analysis.lowSeverity}
                          </span>
                        )}
                      </div>

                      {/* Savings + date */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                        <span className="text-[13px] font-medium text-emerald-400/80">
                          {formatCurrency(analysis.totalPotentialSavings)}
                        </span>
                        <span className="text-[11px] text-white/20">{formatDate(analysis.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
