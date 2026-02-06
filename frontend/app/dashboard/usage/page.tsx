"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Coins,
  TrendingUp,
  Calendar,
  Activity,
  Loader2,
  AlertCircle,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  Target,
  Sparkles,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"

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

export default function UsagePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null)
  const [tokenHistory, setTokenHistory] = useState<TokenHistoryItem[]>([])
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [appliedCount, setAppliedCount] = useState(0)

  useEffect(() => {
    // Load applied recommendations count from localStorage
    const savedApplied = localStorage.getItem("appliedRecommendations")
    if (savedApplied) {
      try {
        const applied = JSON.parse(savedApplied)
        setAppliedCount(Array.isArray(applied) ? applied.length : 0)
      } catch (e) {
        console.error("Failed to parse applied recommendations")
      }
    }
  }, [])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        setLoading(false)
        return
      }

      // Fetch all data in parallel
      const [tokenBalanceRes, tokenHistoryRes, analysisHistoryRes, dashboardRes] = await Promise.all([
        fetch(`${apiBase}/api/stripe/token-balance`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/stripe/token-history?limit=10`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/analysis-history?limit=10`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/dashboard/summary`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      if (tokenBalanceRes.ok) {
        const data = await tokenBalanceRes.json()
        setTokenBalance(data.tokenBalance)
      }

      if (tokenHistoryRes.ok) {
        const data = await tokenHistoryRes.json()
        setTokenHistory(data.history || [])
      }

      if (analysisHistoryRes.ok) {
        const data = await analysisHistoryRes.json()
        setAnalysisHistory(data.analyses || [])
      }

      if (dashboardRes.ok) {
        const data = await dashboardRes.json()
        setDashboardSummary(data)
      }
    } catch (err) {
      console.error("Error fetching usage data:", err)
      setError("Failed to load usage data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsageData()
  }, [])

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

  const getPlanBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      professional: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    }
    return colors[tier?.toLowerCase()] || colors.free
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
    return formatDate(dateString)
  }

  // Calculate usage percentage
  const usagePercentage = tokenBalance
    ? Math.round((tokenBalance.used / tokenBalance.total) * 100) || 0
    : 0

  // Count analyses this month
  const thisMonthAnalyses = analysisHistory.filter((a) => {
    const analysisDate = new Date(a.created_at)
    const now = new Date()
    return (
      analysisDate.getMonth() === now.getMonth() &&
      analysisDate.getFullYear() === now.getFullYear()
    )
  }).length

  // Calculate total savings from applied recommendations
  const totalSavingsIdentified = dashboardSummary?.summary?.totalPotentialSavings || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading usage data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Usage Insights</h2>
          <p className="text-gray-400">Track your token usage and analysis activity</p>
        </div>
        <Card className="bg-black/80 backdrop-blur-xl border-red-500/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-2">{error}</p>
            <Button
              onClick={fetchUsageData}
              className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Usage Insights</h2>
          <p className="text-gray-400">Track your token usage and analysis activity</p>
        </div>
        <Badge className={getPlanBadgeColor(tokenBalance?.planTier || "free")}>
          <Sparkles className="w-3 h-3 mr-1" />
          {tokenBalance?.planTier || "Free"} Plan
        </Badge>
      </div>

      {/* Token Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Coins className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-xs text-gray-400">Available</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {tokenBalance?.available || 0}
            </p>
            <p className="text-sm text-gray-400">
              of {tokenBalance?.total || 0} tokens
            </p>
            <div className="mt-3 w-full bg-white/5 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usagePercentage >= 90
                    ? "bg-red-500"
                    : usagePercentage >= 70
                    ? "bg-yellow-500"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                }`}
                style={{ width: `${100 - usagePercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs text-gray-400">Used</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {tokenBalance?.used || 0}
            </p>
            <p className="text-sm text-gray-400">tokens consumed</p>
            <p className="mt-3 text-xs text-gray-500">
              {usagePercentage}% of allocation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-xs text-gray-400">This Month</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {thisMonthAnalyses}
            </p>
            <p className="text-sm text-gray-400">analyses run</p>
            <p className="mt-3 text-xs text-gray-500">
              {analysisHistory.length} total analyses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs text-gray-400">Savings</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              ${totalSavingsIdentified.toFixed(0)}
            </p>
            <p className="text-sm text-gray-400">potential identified</p>
            <p className="mt-3 text-xs text-green-400">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              {appliedCount} recommendations applied
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage History */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Token Usage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tokenHistory.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No token usage yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Run an analysis to start using tokens
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tokenHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          item.tokens_consumed > 0
                            ? "bg-purple-500/10"
                            : "bg-green-500/10"
                        }`}
                      >
                        {item.tokens_consumed > 0 ? (
                          <Zap className="w-4 h-4 text-purple-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {getActionTypeLabel(item.action_type)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.integration_sources?.join(", ") || item.description || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          item.tokens_consumed > 0 ? "text-purple-400" : "text-green-400"
                        }`}
                      >
                        {item.tokens_consumed > 0 ? "-" : "+"}
                        {Math.abs(item.tokens_consumed)}
                      </p>
                      <p className="text-xs text-gray-500">
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
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Recent Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisHistory.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No analyses yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Connect a tool and run your first analysis
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisHistory.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {analysis.provider}
                        </p>
                        <p className="text-xs text-gray-400">
                          {analysis.summary?.totalFindings || 0} findings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {analysis.summary?.totalPotentialSavings > 0 && (
                        <p className="text-sm font-bold text-green-400">
                          ${analysis.summary.totalPotentialSavings.toFixed(0)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
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

      {/* Tool Utilization */}
      {dashboardSummary?.tools && dashboardSummary.tools.length > 0 && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Connected Tools Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardSummary.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">{tool.name}</h4>
                    <Badge
                      className={
                        tool.hasAnalysis
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {tool.hasAnalysis ? "Analyzed" : "Pending"}
                    </Badge>
                  </div>
                  {tool.hasAnalysis ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Findings</span>
                        <span className="text-white">{tool.findings}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Potential Savings</span>
                        <span className="text-green-400">
                          ${tool.potentialSavings.toFixed(0)}
                        </span>
                      </div>
                      {tool.healthScore !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Health Score</span>
                          <span
                            className={
                              tool.healthScore >= 70
                                ? "text-green-400"
                                : tool.healthScore >= 40
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                          >
                            {tool.healthScore}%
                          </span>
                        </div>
                      )}
                      {tool.lastAnalyzed && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last analyzed: {formatRelativeTime(tool.lastAnalyzed)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Run an analysis to see insights
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
