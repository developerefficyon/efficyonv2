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
} from "lucide-react"
import Link from "next/link"

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
        totalSpend: 0, // We don't track total spend yet, just savings
        wastedSpend: dashboardData!.summary!.totalPotentialSavings,
        potentialSavings: dashboardData!.summary!.totalPotentialSavings,
        efficiencyScore: dashboardData!.summary!.efficiencyScore ?? dashboardData!.summary!.avgHealthScore ?? null,
        toolsAnalyzed: dashboardData!.summary!.analyzedTools,
        connectedTools: dashboardData!.summary!.connectedTools,
        totalFindings: dashboardData!.summary!.totalFindings,
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

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            {hasRealData
              ? `Last analysis: ${lastAnalysisAt}`
              : "Here's your cost optimization overview"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="border-white/10 bg-black/50 text-white w-fit"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-cyan-400 animate-spin" />
              <p className="text-gray-400">Loading dashboard data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="bg-black/80 backdrop-blur-xl border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="ml-auto border-red-500/30 text-red-400"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State - Prompt to connect tools */}
      {!isLoading && !error && !hasRealData && dashboardData?.tools?.length === 0 && (
        <Card className="bg-black/80 backdrop-blur-xl border-cyan-500/30">
          <CardContent className="p-8">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-cyan-400 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">No tools connected yet</h3>
              <p className="text-gray-400 mb-6">
                {canWrite
                  ? "Connect your first integration to start analyzing costs and finding savings opportunities."
                  : "Ask your team owner to connect tools to start analyzing costs."}
              </p>
              {canWrite && (
                <Link href="/dashboard/tools">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Your First Tool
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Content */}
      {!isLoading && !error && (dashboardData?.tools?.length || 0) > 0 && (
        <>
          {/* Cost Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-black/80 backdrop-blur-xl border-white/10 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Connected Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {costSummary.connectedTools || tools.length}
                </div>
                <p className="text-sm text-gray-400">
                  {costSummary.toolsAnalyzed || 0} analyzed
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Potential Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400 mb-1">
                  ${costSummary.potentialSavings.toLocaleString()}/mo
                </div>
                <p className="text-xs text-gray-500">
                  From {costSummary.totalFindings || 0} finding{(costSummary.totalFindings || 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-400 mb-1">
                  {hasRealData && costSummary.efficiencyScore !== null ? `${costSummary.efficiencyScore}%` : "N/A"}
                </div>
                {hasRealData && costSummary.efficiencyScore !== null && (
                  <div className="w-full bg-white/5 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        costSummary.efficiencyScore >= 70
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : costSummary.efficiencyScore >= 40
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                          : "bg-gradient-to-r from-red-500 to-orange-500"
                      }`}
                      style={{ width: `${costSummary.efficiencyScore}%` }}
                    />
                  </div>
                )}
                {(!hasRealData || costSummary.efficiencyScore === null) && (
                  <p className="text-xs text-gray-500">Run analysis to see score</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Issues Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  {costSummary.totalFindings || 0}
                </div>
                <p className="text-xs text-gray-500">
                  {hasRealData ? "Across all integrations" : "Run analysis to find issues"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Prompt to run analysis if tools connected but no analysis */}
          {!hasRealData && dashboardData?.tools && dashboardData.tools.length > 0 && (
            <Card className="bg-black/80 backdrop-blur-xl border-yellow-500/30">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">Run your first analysis</h3>
                    <p className="text-sm text-gray-400">
                      You have {dashboardData.tools.length} tool{dashboardData.tools.length !== 1 ? 's' : ''} connected.
                      Run a cost analysis to discover savings opportunities.
                    </p>
                  </div>
                  <Link href="/dashboard/tools">
                    <Button className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white whitespace-nowrap">
                      Go to Tools
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  {hasRealData ? "Top Recommendations" : "Getting Started"}
                </h3>
                {hasRealData && (
                  <Link href="/dashboard/recommendations">
                    <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-white hover:bg-cyan-500/20 w-full sm:w-auto">
                      View All
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.slice(0, 4).map((rec) => (
                  <Card
                    key={rec.id}
                    className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-sm mb-1">{rec.title}</CardTitle>
                          <p className="text-xs text-gray-400">{rec.description}</p>
                        </div>
                        <Badge
                          className={
                            rec.impact === "high"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {rec.impact}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          {rec.savings > 0 ? (
                            <>
                              <p className="text-xl sm:text-2xl font-bold text-green-400">
                                ${rec.savings}/mo
                              </p>
                              <p className="text-xs text-gray-500">Potential savings</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400">{rec.provider || ""}</p>
                          )}
                        </div>
                        {hasRealData && rec.savings > 0 && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto"
                          >
                            View Details
                          </Button>
                        )}
                        {!hasRealData && (
                          <Link href="/dashboard/tools">
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto"
                            >
                              Get Started
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tools Overview */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Tools Overview</h3>
              <Link href="/dashboard/tools">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-white hover:bg-cyan-500/20 w-full sm:w-auto">
                  Manage Tools
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.slice(0, 6).map((tool, index) => (
                <Card
                  key={tool.id || index}
                  className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-base">{tool.name}</CardTitle>
                      {tool.status === "optimal" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : tool.status === "needs_attention" ? (
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      {tool.cost > 0 ? (
                        <p className="text-2xl font-bold text-green-400">${tool.cost}/mo savings</p>
                      ) : (
                        <p className="text-lg font-semibold text-gray-400">-</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{tool.usage}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {tool.wasteLevel !== "unknown" ? (
                        <Badge
                          className={
                            tool.wasteLevel === "high"
                              ? "bg-red-500/20 text-red-400 border-red-500/30 w-fit"
                              : tool.wasteLevel === "medium"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 w-fit"
                                : "bg-green-500/20 text-green-400 border-green-500/30 w-fit"
                          }
                        >
                          {tool.wasteLevel} waste
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 w-fit">
                          Not analyzed
                        </Badge>
                      )}
                      <Link href={`/dashboard/tools/${tool.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          View
                        </Button>
                      </Link>
                    </div>
                    {tool.lastAnalyzed && (
                      <p className="text-xs text-gray-500">
                        Analyzed: {new Date(tool.lastAnalyzed).toLocaleDateString()}
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
