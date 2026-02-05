"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingDown,
  X,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Zap,
  Loader2,
  Lightbulb,
  AlertCircle,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"

interface Recommendation {
  id: string
  type: string
  category: string
  title: string
  description: string
  savings: number
  impact: string
  effort: string
  tool: string
  priority?: number
}

interface DashboardData {
  hasData: boolean
  summary: {
    totalPotentialSavings: number
    totalIssues: number
    highSeverityIssues: number
    averageHealthScore: number
  } | null
  tools: Array<{
    integration_type: string
    summary: any
    findings: any[]
    recommendations: any[]
  }>
  recommendations: Recommendation[]
  lastAnalysisAt: string | null
}

export default function RecommendationsPage() {
  const [applied, setApplied] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        setDashboardData(null)
        setLoading(false)
        return
      }

      const response = await fetch(`${apiBase}/api/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations")
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error("Error fetching recommendations:", err)
      setError("Failed to load recommendations")
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const handleApply = (id: string) => {
    setApplied([...applied, id])
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "downgrade":
        return <TrendingDown className="w-5 h-5 text-blue-400" />
      case "remove":
      case "Remove Inactive Seats":
        return <X className="w-5 h-5 text-red-400" />
      case "switch":
        return <ArrowRight className="w-5 h-5 text-purple-400" />
      case "Audit HubSpot Plan":
      case "Review User Access":
        return <Lightbulb className="w-5 h-5 text-yellow-400" />
      default:
        return <Zap className="w-5 h-5 text-cyan-400" />
    }
  }

  const getImpactBadge = (impact: string) => {
    const normalizedImpact = impact?.toLowerCase() || "medium"
    const styles = {
      high: "bg-green-500/20 text-green-400 border-green-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
    return styles[normalizedImpact as keyof typeof styles] || styles.medium
  }

  // Get recommendations from dashboard data
  const recommendations: Recommendation[] = dashboardData?.recommendations || []
  const hasRealData = dashboardData?.hasData === true && recommendations.length > 0

  const totalSavings = recommendations
    .filter((r) => !applied.includes(r.id))
    .reduce((sum, r) => sum + (r.savings || 0), 0)

  const appliedCount = applied.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading recommendations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Recommendations</h2>
          <p className="text-gray-400">
            AI-powered suggestions to optimize your SaaS spending
          </p>
        </div>
        <Card className="bg-black/80 backdrop-blur-xl border-red-500/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-2">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state when no recommendations exist
  if (!hasRealData) {
    return (
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Recommendations</h2>
            <p className="text-gray-400">
              AI-powered suggestions to optimize your SaaS spending
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">Potential Savings</p>
                <p className="text-xl font-bold text-gray-500">$0/mo</p>
              </CardContent>
            </Card>
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">Applied</p>
                <p className="text-xl font-bold text-gray-500">0</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
              <Lightbulb className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              No Recommendations Yet
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Connect your tools and run a cost analysis to get AI-powered recommendations
              for optimizing your SaaS spending.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => window.location.href = "/dashboard/tools"}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
              >
                Connect Tools
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Recommendations</h2>
          <p className="text-gray-400">
            AI-powered suggestions to optimize your SaaS spending
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 mb-1">Potential Savings</p>
              <p className="text-xl font-bold text-green-400">${totalSavings}/mo</p>
            </CardContent>
          </Card>
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 mb-1">Applied</p>
              <p className="text-xl font-bold text-cyan-400">{appliedCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec) => {
          const isApplied = applied.includes(rec.id)
          return (
            <Card
              key={rec.id}
              className={`bg-black/80 backdrop-blur-xl border-white/10 transition-all ${
                isApplied
                  ? "opacity-60 border-green-500/30"
                  : "hover:border-cyan-500/30"
              }`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5">
                    {getTypeIcon(rec.type || rec.title)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-white">{rec.title}</CardTitle>
                          {isApplied && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Applied
                            </Badge>
                          )}
                        </div>
                        <Badge className={getImpactBadge(rec.impact)}>
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <div className="text-right">
                        {rec.savings > 0 ? (
                          <>
                            <p className="text-2xl font-bold text-green-400">
                              ${rec.savings}/mo
                            </p>
                            <p className="text-xs text-gray-500">Savings</p>
                          </>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Optimization
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{rec.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {rec.tool}
                      </span>
                      {rec.category && (
                        <>
                          <span>•</span>
                          <span>{rec.category}</span>
                        </>
                      )}
                      {rec.effort && (
                        <>
                          <span>•</span>
                          <span>Effort: {rec.effort}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-black/50 text-white"
                  >
                    View Details
                  </Button>
                  {!isApplied && (
                    <Button
                      onClick={() => handleApply(rec.id)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                    >
                      Apply Recommendation
                    </Button>
                  )}
                  {isApplied && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500/30 bg-green-500/10 text-green-400"
                      disabled
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Applied
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Last Analysis Info */}
      {dashboardData?.lastAnalysisAt && (
        <div className="text-center text-sm text-gray-500">
          Last analysis: {new Date(dashboardData.lastAnalysisAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}
