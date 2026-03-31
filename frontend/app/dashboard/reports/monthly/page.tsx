"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useApiCache } from "@/lib/use-api-cache"
import Link from "next/link"

interface ProviderDiff {
  provider: string
  current: {
    totalPotentialSavings: number
    totalFindings: number
    healthScore: number | null
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
  }
  deltas: {
    savings: number
    findings: number
    healthScore: number
  }
  newFindingsCount: number
  resolvedFindingsCount: number
  hasPrevious: boolean
}

interface RenewalAlert {
  supplier_name: string
  average_amount: number
  cadence: string
  projected_renewal_date: string
}

interface MonthlyReport {
  id: string
  report_month: string
  ai_summary: string | null
  recommended_action: string | null
  is_quarterly: boolean
  sent_at: string | null
  created_at: string
  report_data: {
    providerDiffs: ProviderDiff[]
    totalWasteIdentified: number
    savingsRealized: number
    renewalAlerts: RenewalAlert[]
  }
  renewal_alerts: RenewalAlert[]
}

interface ReportsResponse {
  success: boolean
  reports: MonthlyReport[]
  total: number
}

export default function MonthlyReportsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const fetchReports = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()
    if (!accessToken) return null

    const res = await fetch(`${apiBase}/api/dashboard/monthly-reports?limit=24`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json()
  }, [])

  const { data, isLoading, refresh } = useApiCache<ReportsResponse>("monthly-reports", fetchReports)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (accessToken) {
        await fetch(`${apiBase}/api/dashboard/monthly-reports/generate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        refresh()
      }
    } finally {
      setGenerating(false)
    }
  }

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const reports = data?.reports || []

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports">
            <Button variant="ghost" size="sm" className="text-white/30 hover:text-white h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-display text-white tracking-tight">Monthly Reports</h2>
            <p className="text-[13px] text-white/35">Automated cost optimization reports delivered every month</p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-4 text-[13px] rounded-lg"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Generate Now
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-white/20 animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-white/30">Loading reports...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && reports.length === 0 && (
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-white/20" />
              </div>
              <h3 className="text-lg font-display text-white mb-2">No reports yet</h3>
              <p className="text-[13px] text-white/35 max-w-sm mx-auto mb-5">
                Monthly reports are generated automatically on the 1st of every month. You can also generate one now.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Generate First Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!isLoading && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id
            const rd = report.report_data
            const totalSavings = rd?.providerDiffs?.reduce((s: number, d: ProviderDiff) => s + d.current.totalPotentialSavings, 0) || 0
            const totalFindings = rd?.providerDiffs?.reduce((s: number, d: ProviderDiff) => s + d.current.totalFindings, 0) || 0

            return (
              <Card key={report.id} className="bg-white/[0.02] border-white/[0.06] rounded-xl overflow-hidden">
                {/* Report Header Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4.5 h-4.5 text-white/30" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-medium text-white">{formatMonth(report.report_month)}</h3>
                        {report.is_quarterly && (
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/15 text-[9px] h-[18px] px-1.5 rounded-full">
                            Quarterly
                          </Badge>
                        )}
                        {report.sent_at && (
                          <Badge className="bg-emerald-500/10 text-emerald-400/70 border-emerald-500/15 text-[9px] h-[18px] px-1.5 rounded-full">
                            Sent
                          </Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-white/25 mt-0.5 truncate">
                        {totalFindings} finding{totalFindings !== 1 ? "s" : ""} &middot; ${Math.round(totalSavings).toLocaleString()} potential savings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[13px] font-semibold text-emerald-400">${Math.round(totalSavings).toLocaleString()}</p>
                      <p className="text-[11px] text-white/20">/mo potential</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/20" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/20" />
                    )}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-white/[0.04] p-5 space-y-5">
                    {/* AI Summary */}
                    {report.ai_summary && (
                      <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400/60" />
                          <span className="text-[11px] text-emerald-400/60 font-medium uppercase tracking-wider">AI Summary</span>
                        </div>
                        <p className="text-[13px] text-white/60 leading-relaxed">{report.ai_summary}</p>
                      </div>
                    )}

                    {/* Savings Counters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
                        <p className="text-xl font-semibold text-amber-400">${Math.round(rd?.totalWasteIdentified || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-white/25 uppercase tracking-wider mt-1">Waste Identified</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
                        <p className="text-xl font-semibold text-emerald-400">${Math.round(rd?.savingsRealized || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-white/25 uppercase tracking-wider mt-1">Savings Realized</p>
                      </div>
                    </div>

                    {/* Provider Diffs */}
                    {rd?.providerDiffs && rd.providerDiffs.length > 0 && (
                      <div>
                        <h4 className="text-[11px] text-white/30 font-medium uppercase tracking-wider mb-3">Per-Tool Breakdown</h4>
                        <div className="space-y-2">
                          {rd.providerDiffs.map((diff: ProviderDiff, i: number) => (
                            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[13px] font-medium text-white/70">{diff.provider}</span>
                                <span className="text-[13px] font-semibold text-emerald-400">
                                  ${Math.round(diff.current.totalPotentialSavings).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-[11px] text-white/25">
                                <span>{diff.current.totalFindings} findings</span>
                                {diff.hasPrevious && (
                                  <>
                                    <span className="text-emerald-400/60">+{diff.newFindingsCount} new</span>
                                    <span className="text-white/20">{diff.resolvedFindingsCount} resolved</span>
                                    {diff.deltas.savings !== 0 && (
                                      <span className={diff.deltas.savings > 0 ? "text-red-400/60" : "text-emerald-400/60"}>
                                        {diff.deltas.savings > 0 ? "+" : ""}${Math.round(diff.deltas.savings).toLocaleString()} savings
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Action */}
                    {report.recommended_action && (
                      <div className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-400/60" />
                          <span className="text-[11px] text-indigo-400/60 font-medium uppercase tracking-wider">Recommended Action</span>
                        </div>
                        <p className="text-[13px] text-white/60 leading-relaxed">{report.recommended_action}</p>
                      </div>
                    )}

                    {/* Renewal Alerts */}
                    {rd?.renewalAlerts && rd.renewalAlerts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400/60" />
                          <span className="text-[11px] text-amber-400/60 font-medium uppercase tracking-wider">Renewal Alerts</span>
                        </div>
                        <div className="space-y-1">
                          {rd.renewalAlerts.map((r: RenewalAlert, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                              <span className="text-[12px] text-white/50">{r.supplier_name}</span>
                              <span className="text-[11px] text-amber-400/60">
                                ~{r.average_amount.toLocaleString()} SEK &middot; {new Date(r.projected_renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
