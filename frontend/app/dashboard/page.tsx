"use client"

import { useCallback } from "react"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useTeamRole } from "@/lib/team-role-context"
import { useApiCache } from "@/lib/use-api-cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowRight,
  Activity,
  ShieldCheck,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { SavingsCounter } from "@/components/savings-counter"
import { RenewalAlertsWidget } from "@/components/renewal-alerts-widget"

interface DashboardSummary {
  totalPotentialSavings: number
  totalFindings: number
  highSeverity: number
  mediumSeverity: number
  lowSeverity: number
  efficiencyScore: number | null
  avgHealthScore: number | null
  connectedTools: number
  analyzedTools: number
}

interface ToolData {
  id: string
  name: string
  status: string
  hasAnalysis: boolean
  potentialSavings: number
  findings: number
  healthScore: number | null
  lastAnalyzed: string | null
  wasteLevel: string
}

interface Recommendation {
  priority?: number
  action: string
  description: string
  impact?: string
  savings?: number
  provider: string
}

interface DashboardData {
  success: boolean
  hasData: boolean
  summary: DashboardSummary | null
  tools: ToolData[]
  recommendations: Recommendation[]
  lastAnalysisAt: string | null
}

// Default mock data shown when no real data exists
const defaultCostSummary = {
  totalSpend: 0,
  wastedSpend: 0,
  potentialSavings: 0,
  efficiencyScore: 0,
  toolsAnalyzed: 0,
  highSeverity: 0,
  mediumSeverity: 0,
  lowSeverity: 0,
}

const defaultTools = [
  {
    name: "No tools connected",
    cost: 0,
    usage: "Connect your first tool to get started",
    wasteLevel: "low",
    status: "disconnected",
  },
]

const defaultRecommendations = [
  {
    id: 1,
    type: "connect",
    title: "Connect your first integration",
    savings: 0,
    impact: "high",
    description: "Connect HubSpot, Fortnox, or Microsoft 365 to start analyzing costs",
  },
]

// Radial progress ring component
function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171"

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="progress-ring-track"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="progress-ring-fill"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-white">{score}%</span>
      </div>
    </div>
  )
}

export default function UserDashboard() {
  const { user } = useAuth()
  const { canWrite } = useTeamRole()

  const fetchDashboardData = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()

    if (!accessToken) {
      return null
    }

    const res = await fetch(`${apiBase}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      throw new Error("Failed to fetch dashboard data")
    }

    return res.json()
  }, [])

  const { data: dashboardData, isLoading, error, refresh } = useApiCache<DashboardData>(
    "dashboard-summary",
    fetchDashboardData
  )

  // Determine what to display
  const hasRealData = dashboardData?.hasData === true && dashboardData?.summary !== null

  const costSummary = hasRealData
    ? {
        totalSpend: 0,
        wastedSpend: dashboardData!.summary!.totalPotentialSavings,
        potentialSavings: dashboardData!.summary!.totalPotentialSavings,
        efficiencyScore: dashboardData!.summary!.efficiencyScore ?? dashboardData!.summary!.avgHealthScore ?? null,
        toolsAnalyzed: dashboardData!.summary!.analyzedTools,
        connectedTools: dashboardData!.summary!.connectedTools,
        totalFindings: dashboardData!.summary!.totalFindings,
        highSeverity: dashboardData!.summary!.highSeverity,
        mediumSeverity: dashboardData!.summary!.mediumSeverity,
        lowSeverity: dashboardData!.summary!.lowSeverity,
      }
    : defaultCostSummary

  const tools = hasRealData && dashboardData!.tools.length > 0
    ? dashboardData!.tools.map(tool => ({
        name: tool.name,
        cost: tool.potentialSavings,
        usage: tool.hasAnalysis
          ? `${tool.findings} finding${tool.findings !== 1 ? 's' : ''}`
          : "Not analyzed yet",
        wasteLevel: tool.wasteLevel || "low",
        status: tool.hasAnalysis ? (tool.findings > 0 ? "needs_attention" : "optimal") : "pending",
        id: tool.id,
        lastAnalyzed: tool.lastAnalyzed,
      }))
    : dashboardData?.tools && dashboardData.tools.length > 0
      ? dashboardData.tools.map(tool => ({
          name: tool.name,
          cost: 0,
          usage: "Run analysis to see findings",
          wasteLevel: "unknown",
          status: "pending",
          id: tool.id,
          lastAnalyzed: null,
        }))
      : defaultTools

  const recommendations = hasRealData && dashboardData!.recommendations.length > 0
    ? dashboardData!.recommendations.map((rec, idx) => ({
        id: idx + 1,
        type: rec.action?.toLowerCase().includes("remove") ? "remove"
            : rec.action?.toLowerCase().includes("downgrade") ? "downgrade"
            : rec.action?.toLowerCase().includes("audit") ? "optimize"
            : "optimize",
        title: rec.action,
        savings: rec.savings || 0,
        impact: rec.impact || "medium",
        description: rec.description,
        provider: rec.provider,
      }))
    : defaultRecommendations

  const lastAnalysisAt = dashboardData?.lastAnalysisAt
    ? new Date(dashboardData.lastAnalysisAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  // Get current date display
  const now = new Date()
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Hero Section ── */}
      <div className="animate-slide-up delay-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[13px] text-white/30 font-medium mb-1">{dateDisplay}</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white mb-1 tracking-tight">
              {user?.name ? (
                <>Welcome back, <span className="italic text-emerald-400/90">{user.name.split(' ')[0]}</span></>
              ) : (
                "Welcome back"
              )}
            </h2>
            <p className="text-[14px] text-white/40">
              {hasRealData
                ? `Last analysis ${lastAnalysisAt}`
                : "Your cost optimization overview"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/[0.05] w-fit h-8 px-3 text-[12px] rounded-lg transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="animate-scale-in">
          <Card className="bg-white/[0.02] backdrop-blur border-white/[0.06] rounded-xl">
            <CardContent className="p-16">
              <div className="text-center">
                <div className="relative mx-auto w-12 h-12 mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                </div>
                <p className="text-[13px] text-white/30">Loading your data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !isLoading && (
        <div className="animate-scale-in">
          <Card className="bg-red-500/[0.03] border-red-500/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400/80" />
                </div>
                <p className="text-[13px] text-red-400/80 flex-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refresh}
                  className="border border-red-500/10 text-red-400/60 hover:text-red-400 h-7 text-[11px]"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Empty State — Connect Tools ── */}
      {!isLoading && !error && !hasRealData && dashboardData?.tools?.length === 0 && (
        <div className="animate-slide-up delay-1">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl overflow-hidden relative">
            {/* Subtle ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl" />
            <CardContent className="p-10 relative z-10">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <Layers className="w-7 h-7 text-white/20" />
                </div>
                <h3 className="text-xl font-display text-white mb-2">No tools connected yet</h3>
                <p className="text-[13px] text-white/35 leading-relaxed mb-6">
                  {canWrite
                    ? "Connect your first integration to start analyzing costs and uncovering savings."
                    : "Ask your team owner to connect tools to start analyzing costs."}
                </p>
                {canWrite && (
                  <Link href="/dashboard/tools">
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg transition-all">
                      Connect Your First Tool
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main Dashboard Content ── */}
      {!isLoading && !error && (dashboardData?.tools?.length || 0) > 0 && (
        <>
          {/* ── Cumulative Savings Counter ── */}
          {hasRealData && (
            <div className="animate-slide-up delay-1">
              <SavingsCounter />
            </div>
          )}

          {/* ── Renewal Alerts ── */}
          {hasRealData && (
            <div className="animate-slide-up delay-2">
              <RenewalAlertsWidget />
            </div>
          )}

          {/* ── KPI Metric Cards — Bento Grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Potential Savings — Hero metric */}
            <Card className="col-span-2 bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-1 relative overflow-hidden group">
              {/* Ambient glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/[0.06] rounded-full blur-3xl group-hover:bg-emerald-500/[0.1] transition-all duration-700" />
              <CardContent className="p-5 sm:p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Potential Savings</span>
                  </div>
                  {hasRealData && (
                    <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[10px] h-5 px-2 rounded-full font-medium">
                      Monthly
                    </Badge>
                  )}
                </div>
                <div className="animate-count-up delay-3">
                  <p className="text-4xl sm:text-5xl font-semibold text-white tracking-tight mb-1">
                    ${costSummary.potentialSavings.toLocaleString()}
                  </p>
                  <p className="text-[12px] text-white/30">
                    From {costSummary.totalFindings || 0} finding{(costSummary.totalFindings || 0) !== 1 ? 's' : ''} across {costSummary.connectedTools || tools.length} tool{(costSummary.connectedTools || tools.length) !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Health Score — Radial */}
            <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-2">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider mb-3">Health Score</span>
                {hasRealData && costSummary.efficiencyScore !== null ? (
                  <HealthRing score={costSummary.efficiencyScore} size={88} />
                ) : (
                  <div className="w-[88px] h-[88px] rounded-full border-2 border-dashed border-white/[0.08] flex items-center justify-center">
                    <span className="text-[12px] text-white/20">N/A</span>
                  </div>
                )}
                {(!hasRealData || costSummary.efficiencyScore === null) && (
                  <p className="text-[11px] text-white/20 mt-2">Run analysis</p>
                )}
              </CardContent>
            </Card>

            {/* Connected Tools */}
            <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-3">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white/40" />
                  </div>
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Tools</span>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-white tracking-tight">
                    {costSummary.connectedTools || tools.length}
                  </p>
                  <p className="text-[12px] text-white/25 mt-0.5">
                    {costSummary.toolsAnalyzed || 0} analyzed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Findings Breakdown — Compact bar ── */}
          {hasRealData && (costSummary.highSeverity > 0 || costSummary.mediumSeverity > 0 || costSummary.lowSeverity > 0) && (
            <div className="animate-slide-up delay-4">
              <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-white/30" />
                      <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Findings</span>
                    </div>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[12px] text-white/50">High</span>
                        <span className="text-[13px] font-semibold text-white/80">{costSummary.highSeverity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-[12px] text-white/50">Medium</span>
                        <span className="text-[13px] font-semibold text-white/80">{costSummary.mediumSeverity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-[12px] text-white/50">Low</span>
                        <span className="text-[13px] font-semibold text-white/80">{costSummary.lowSeverity}</span>
                      </div>
                    </div>
                    {/* Mini stacked bar */}
                    <div className="flex gap-0.5 w-full sm:w-48 h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
                      {costSummary.highSeverity > 0 && (
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ flex: costSummary.highSeverity }}
                        />
                      )}
                      {costSummary.mediumSeverity > 0 && (
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ flex: costSummary.mediumSeverity }}
                        />
                      )}
                      {costSummary.lowSeverity > 0 && (
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{ flex: costSummary.lowSeverity }}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Prompt to run analysis ── */}
          {!hasRealData && dashboardData?.tools && dashboardData.tools.length > 0 && (
            <div className="animate-slide-up delay-3">
              <Card className="bg-amber-500/[0.03] border-amber-500/10 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-400/80" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[14px] font-medium text-white mb-0.5">Run your first analysis</h3>
                      <p className="text-[12px] text-white/35">
                        You have {dashboardData.tools.length} tool{dashboardData.tools.length !== 1 ? 's' : ''} connected.
                        Run a cost analysis to discover savings opportunities.
                      </p>
                    </div>
                    <Link href="/dashboard/tools">
                      <Button className="bg-amber-500/90 hover:bg-amber-400 text-black font-medium h-8 px-4 text-[12px] rounded-lg whitespace-nowrap">
                        Go to Tools
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Recommendations ── */}
          {recommendations.length > 0 && (
            <div className="animate-slide-up delay-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] text-white/60 font-medium">
                  {hasRealData ? "Top Recommendations" : "Getting Started"}
                </h3>
                {hasRealData && (
                  <Link href="/dashboard/recommendations">
                    <Button variant="ghost" size="sm" className="text-white/30 hover:text-white/70 h-7 text-[12px] gap-1">
                      View All
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.slice(0, 4).map((rec, index) => (
                  <Card
                    key={rec.id}
                    className={`bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-${6 + index} relative overflow-hidden group`}
                  >
                    {/* Left accent */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                      rec.impact === "high" ? "bg-emerald-400/50" : "bg-amber-400/40"
                    }`} />
                    <CardContent className="p-4 pl-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-white/80 mb-1 line-clamp-1">{rec.title}</p>
                          <p className="text-[11px] text-white/30 line-clamp-2">{rec.description}</p>
                        </div>
                        <Badge
                          className={`shrink-0 text-[9px] h-[18px] px-1.5 rounded-full font-medium ${
                            rec.impact === "high"
                              ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                              : "bg-amber-500/10 text-amber-400/80 border-amber-500/15"
                          }`}
                        >
                          {rec.impact}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        {rec.savings > 0 ? (
                          <div>
                            <span className="text-lg font-semibold text-emerald-400">${rec.savings.toFixed(2)}</span>
                            <span className="text-[11px] text-white/25 ml-1">/mo</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-white/25">{rec.provider || ""}</span>
                        )}
                        {hasRealData && rec.savings > 0 ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-3 text-[11px] text-white/40 hover:text-white border border-white/[0.06] hover:bg-white/[0.04] rounded-md"
                          >
                            Details
                          </Button>
                        ) : !hasRealData ? (
                          <Link href="/dashboard/tools">
                            <Button
                              size="sm"
                              className="h-7 px-3 text-[11px] bg-emerald-500/90 hover:bg-emerald-400 text-black font-medium rounded-md"
                            >
                              Get Started
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Tools Overview ── */}
          <div className="animate-slide-up delay-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] text-white/60 font-medium">Tools Overview</h3>
              <Link href="/dashboard/tools">
                <Button variant="ghost" size="sm" className="text-white/30 hover:text-white/70 h-7 text-[12px] gap-1">
                  Manage Tools
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tools.slice(0, 6).map((tool, index) => (
                <Card
                  key={tool.id || index}
                  className={`bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-${8 + index} group`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${
                          tool.status === "optimal"
                            ? "bg-emerald-400"
                            : tool.status === "needs_attention"
                            ? "bg-amber-400"
                            : "bg-white/15"
                        }`} />
                        <span className="text-[13px] font-medium text-white/80">{tool.name}</span>
                      </div>
                      {tool.status === "optimal" ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/50" />
                      ) : tool.status === "needs_attention" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/50" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-white/15" />
                      )}
                    </div>
                    <div className="mb-3">
                      {tool.cost > 0 ? (
                        <p className="text-xl font-semibold text-emerald-400 tracking-tight">
                          ${tool.cost}<span className="text-[11px] text-white/25 font-normal ml-0.5">/mo</span>
                        </p>
                      ) : (
                        <p className="text-lg text-white/15 font-medium">—</p>
                      )}
                      <p className="text-[11px] text-white/25 mt-0.5">{tool.usage}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      {tool.wasteLevel !== "unknown" ? (
                        <Badge
                          className={`text-[9px] h-[18px] px-1.5 rounded-full font-medium ${
                            tool.wasteLevel === "high"
                              ? "bg-red-500/10 text-red-400/70 border-red-500/15"
                              : tool.wasteLevel === "medium"
                                ? "bg-amber-500/10 text-amber-400/70 border-amber-500/15"
                                : "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/15"
                          }`}
                        >
                          {tool.wasteLevel} waste
                        </Badge>
                      ) : (
                        <Badge className="bg-white/[0.04] text-white/25 border-white/[0.06] text-[9px] h-[18px] px-1.5 rounded-full">
                          Pending
                        </Badge>
                      )}
                      <Link href={`/dashboard/tools/${tool.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-white/25 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          View <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                        </Button>
                      </Link>
                    </div>
                    {tool.lastAnalyzed && (
                      <p className="text-[10px] text-white/15 mt-2">
                        Analyzed {new Date(tool.lastAnalyzed).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
