"use client"

import { useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Coins,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  Target,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useApiCache } from "@/lib/use-api-cache"
import Link from "next/link"

interface TokenBalance {
  total: number
  used: number
  available: number
  planTier: string
}

interface TokenHistoryItem {
  id: string
  tokens_consumed: number
  action_type: string
  integration_sources: string[] | null
  description: string | null
  balance_before: number
  balance_after: number
  created_at: string
}

interface AnalysisHistoryItem {
  id: string
  provider: string
  summary: {
    totalFindings: number
    totalPotentialSavings: number
    healthScore: number | null
  }
  created_at: string
}

interface DashboardTool {
  id: string
  name: string
  hasAnalysis: boolean
  potentialSavings: number
  findings: number
  healthScore: number | null
  lastAnalyzed: string | null
}

interface DashboardSummary {
  hasData: boolean
  summary: {
    totalPotentialSavings: number
    totalFindings: number
  } | null
  tools: DashboardTool[]
  recommendations: any[]
}

// ── Token usage gauge (semicircle) ──
function UsageGauge({ percent, available, total }: { percent: number; available: number; total: number }) {
  const size = 160
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const semiCircumference = Math.PI * radius
  const offset = semiCircumference - ((100 - percent) / 100) * semiCircumference
  const color =
    percent >= 90 ? "#f87171" : percent >= 70 ? "#fbbf24" : "#34d399"

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 24 }}>
      <svg width={size} height={size / 2 + 12} className="overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${semiCircumference} ${semiCircumference}`}
          strokeDashoffset={0}
          transform={`rotate(180, ${size / 2}, ${size / 2})`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${semiCircumference} ${semiCircumference}`}
          strokeDashoffset={offset}
          transform={`rotate(180, ${size / 2}, ${size / 2})`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-3xl font-semibold text-white">{available}</span>
        <span className="text-[10px] text-white/25 uppercase tracking-wider">of {total} available</span>
      </div>
    </div>
  )
}

export default function UsagePage() {

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  const fetchTokenBalance = useCallback(async () => {
    const accessToken = await getBackendToken()
    if (!accessToken) return null
    const res = await fetch(`${apiBase}/api/stripe/token-balance`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch token balance")
    const data = await res.json()
    return data.tokenBalance as TokenBalance
  }, [apiBase])

  const fetchTokenHistory = useCallback(async () => {
    const accessToken = await getBackendToken()
    if (!accessToken) return []
    const res = await fetch(`${apiBase}/api/stripe/token-history?limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch token history")
    const data = await res.json()
    return (data.history || []) as TokenHistoryItem[]
  }, [apiBase])

  const fetchAnalysisHistory = useCallback(async () => {
    const accessToken = await getBackendToken()
    if (!accessToken) return []
    const res = await fetch(`${apiBase}/api/analysis-history?limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch analysis history")
    const data = await res.json()
    return (data.analyses || []) as AnalysisHistoryItem[]
  }, [apiBase])

  const fetchDashboardSummary = useCallback(async () => {
    const accessToken = await getBackendToken()
    if (!accessToken) return null
    const res = await fetch(`${apiBase}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch dashboard summary")
    return res.json() as Promise<DashboardSummary>
  }, [apiBase])

  const { data: tokenBalance, isLoading: loadingBalance, error: errorBalance } = useApiCache<TokenBalance | null>("token-balance", fetchTokenBalance)
  const { data: tokenHistoryData, isLoading: loadingHistory } = useApiCache<TokenHistoryItem[]>("token-history", fetchTokenHistory)
  const { data: analysisHistoryData, isLoading: loadingAnalysis } = useApiCache<AnalysisHistoryItem[]>("analysis-history:10", fetchAnalysisHistory)
  const { data: dashboardSummary, isLoading: loadingSummary } = useApiCache<DashboardSummary | null>("dashboard-summary", fetchDashboardSummary)

  const tokenHistory = tokenHistoryData || []
  const analysisHistory = analysisHistoryData || []
  const loading = loadingBalance || loadingHistory || loadingAnalysis || loadingSummary
  const error = errorBalance

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      single_source_analysis: "Single Tool Analysis",
      dual_source_analysis: "Dual Tool Analysis",
      triple_source_analysis: "Multi-Tool Analysis",
      advanced_ai_deep_dive: "AI Deep Dive",
      monthly_reset: "Monthly Reset",
      admin_adjustment: "Admin Adjustment",
      token_refund: "Token Refund",
    }
    return labels[actionType] || actionType
  }

  const getPlanStyle = (tier: string) => {
    const t = tier?.toLowerCase() || ""
    if (t === "enterprise") return "bg-amber-500/10 text-amber-400/80 border-amber-500/15"
    if (t === "professional") return "bg-violet-500/10 text-violet-400/80 border-violet-500/15"
    if (t === "starter") return "bg-blue-500/10 text-blue-400/80 border-blue-500/15"
    return "bg-white/[0.04] text-white/35 border-white/[0.06]"
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const usagePercentage = tokenBalance
    ? Math.round((tokenBalance.used / tokenBalance.total) * 100) || 0
    : 0

  const thisMonthAnalyses = analysisHistory.filter((a) => {
    const d = new Date(a.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const totalSavingsIdentified = dashboardSummary?.summary?.totalPotentialSavings || 0

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative mx-auto w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
          </div>
          <p className="text-[13px] text-white/30">Loading usage data...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
        <div className="animate-slide-up delay-0">
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
            Usage <span className="italic text-emerald-400/90">Insights</span>
          </h2>
          <p className="text-[14px] text-white/35">Track your token usage and analysis activity</p>
        </div>
        <Card className="bg-red-500/[0.03] border-red-500/10 rounded-xl animate-slide-up delay-1">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-5 h-5 text-red-400/70" />
            </div>
            <p className="text-[13px] text-red-400/70 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up delay-0">
        <div>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
            Usage <span className="italic text-emerald-400/90">Insights</span>
          </h2>
          <p className="text-[14px] text-white/35">Track your token usage and analysis activity</p>
        </div>
        <Badge className={`${getPlanStyle(tokenBalance?.planTier || "free")} text-[10px] h-6 px-2.5 rounded-full font-medium`}>
          <Sparkles className="w-3 h-3 mr-1" />
          {tokenBalance?.planTier || "Free"} Plan
        </Badge>
      </div>

      {/* ── Token Gauge + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-slide-up delay-1">
        {/* Gauge — spans 2 cols */}
        <Card className="lg:col-span-2 bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/[0.05] rounded-full blur-3xl group-hover:bg-emerald-500/[0.08] transition-all duration-700" />
          <CardContent className="p-6 relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 self-start">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Coins className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Token Balance</span>
            </div>
            <UsageGauge
              percent={usagePercentage}
              available={tokenBalance?.available || 0}
              total={tokenBalance?.total || 0}
            />
          </CardContent>
        </Card>

        {/* Used */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-violet-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Used</span>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white tracking-tight">{tokenBalance?.used || 0}</p>
              <p className="text-[12px] text-white/25 mt-0.5">{usagePercentage}% of allocation</p>
            </div>
          </CardContent>
        </Card>

        {/* Analyses This Month */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">This Month</span>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white tracking-tight">{thisMonthAnalyses}</p>
              <p className="text-[12px] text-white/25 mt-0.5">analyses run</p>
            </div>
          </CardContent>
        </Card>

        {/* Savings Identified */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Savings</span>
            </div>
            <div>
              <p className="text-3xl font-semibold text-emerald-400 tracking-tight">${totalSavingsIdentified.toFixed(0)}</p>
              <p className="text-[12px] text-white/25 mt-0.5">potential identified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Token History + Recent Analyses ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Token Usage History */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-2">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white/30" />
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Token History</span>
              </div>
            </div>

            {tokenHistory.length === 0 ? (
              <div className="text-center py-10">
                <Coins className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-[12px] text-white/25">No token usage yet</p>
                <p className="text-[11px] text-white/15 mt-1">Run an analysis to start</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tokenHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.tokens_consumed > 0 ? "bg-violet-500/10" : "bg-emerald-500/10"
                    }`}>
                      {item.tokens_consumed > 0 ? (
                        <Zap className="w-3.5 h-3.5 text-violet-400/70" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400/70" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/80 truncate">
                        {getActionTypeLabel(item.action_type)}
                      </p>
                      <p className="text-[11px] text-white/25 truncate">
                        {item.integration_sources?.join(", ") || item.description || "—"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[13px] font-semibold ${
                        item.tokens_consumed > 0 ? "text-violet-400/80" : "text-emerald-400"
                      }`}>
                        {item.tokens_consumed > 0 ? "-" : "+"}{Math.abs(item.tokens_consumed)}
                      </p>
                      <p className="text-[10px] text-white/20">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-3">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/30" />
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Recent Analyses</span>
              </div>
            </div>

            {analysisHistory.length === 0 ? (
              <div className="text-center py-10">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-[12px] text-white/25">No analyses yet</p>
                <p className="text-[11px] text-white/15 mt-1">Connect a tool and run your first analysis</p>
              </div>
            ) : (
              <div className="space-y-1">
                {analysisHistory.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-3.5 h-3.5 text-blue-400/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/80 truncate">
                        {analysis.provider}
                      </p>
                      <p className="text-[11px] text-white/25">
                        {analysis.summary?.totalFindings || 0} findings
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {analysis.summary?.totalPotentialSavings > 0 && (
                        <p className="text-[13px] font-semibold text-emerald-400">
                          ${analysis.summary.totalPotentialSavings.toFixed(0)}
                        </p>
                      )}
                      <p className="text-[10px] text-white/20">
                        {formatRelativeTime(analysis.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Connected Tools Overview ── */}
      {dashboardSummary?.tools && dashboardSummary.tools.length > 0 && (
        <div className="animate-slide-up delay-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <span className="text-[14px] text-white/60 font-medium">Connected Tools</span>
            </div>
            <Link href="/dashboard/tools">
              <Button variant="ghost" size="sm" className="text-white/25 hover:text-white/60 h-6 text-[11px] gap-1 px-2">
                View all <ArrowUpRight className="w-2.5 h-2.5" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboardSummary.tools.map((tool) => (
              <Card
                key={tool.id}
                className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${tool.hasAnalysis ? "bg-emerald-400" : "bg-white/15"}`} />
                      <span className="text-[13px] font-medium text-white/80">{tool.name}</span>
                    </div>
                    <Badge className={`text-[9px] h-[18px] px-1.5 rounded-full font-medium ${
                      tool.hasAnalysis
                        ? "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/15"
                        : "bg-white/[0.04] text-white/25 border-white/[0.06]"
                    }`}>
                      {tool.hasAnalysis ? "Analyzed" : "Pending"}
                    </Badge>
                  </div>
                  {tool.hasAnalysis ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/30">Findings</span>
                        <span className="text-white/70 font-medium">{tool.findings}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/30">Savings</span>
                        <span className="text-emerald-400 font-medium">${tool.potentialSavings.toFixed(0)}</span>
                      </div>
                      {tool.healthScore !== null && (
                        <div className="flex justify-between text-[12px]">
                          <span className="text-white/30">Health</span>
                          <span className={`font-medium ${
                            tool.healthScore >= 70 ? "text-emerald-400" :
                            tool.healthScore >= 40 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {tool.healthScore}%
                          </span>
                        </div>
                      )}
                      {tool.lastAnalyzed && (
                        <p className="text-[10px] text-white/15 pt-1">
                          {formatRelativeTime(tool.lastAnalyzed)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[12px] text-white/20">Run analysis to see insights</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
