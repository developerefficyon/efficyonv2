"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  TrendingDown,
  X,
  ArrowRight,
  DollarSign,
  Zap,
  Loader2,
  Lightbulb,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useApiCache } from "@/lib/use-api-cache"
import Link from "next/link"

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
  integrationId?: string
}

interface DashboardData {
  hasData: boolean
  summary: {
    totalPotentialSavings: number
    totalFindings: number
    highSeverity: number
    avgHealthScore: number | null
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
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)

  const fetchRecommendations = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()

    if (!accessToken) {
      return null
    }

    const response = await fetch(`${apiBase}/api/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch recommendations")
    }

    return response.json()
  }, [])

  const { data: dashboardData, isLoading: loading, error } = useApiCache<DashboardData>(
    "dashboard-summary",
    fetchRecommendations
  )

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

  const totalPotentialSavings = dashboardData?.summary?.totalPotentialSavings ||
    recommendations.reduce((sum, r) => sum + (r.savings || 0), 0)

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
          <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl px-5 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Potential Savings</p>
            <p className="text-xl font-bold text-gray-500">$0/mo</p>
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Recommendations</h2>
          <p className="text-gray-400">
            AI-powered suggestions to optimize your SaaS spending
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Potential Savings</p>
          <p className="text-2xl font-bold text-green-400 whitespace-nowrap">${totalPotentialSavings % 1 === 0 ? totalPotentialSavings.toLocaleString() : totalPotentialSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</p>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <Card
            key={rec.id}
            className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-all"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-white/5 mt-0.5">
                  {getTypeIcon(rec.type || rec.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white truncate mb-1.5">{rec.title}</h3>
                      <Badge className={getImpactBadge(rec.impact)}>
                        {rec.impact} impact
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      {rec.savings > 0 ? (
                        <>
                          <p className="text-xl font-bold text-green-400">
                            ${rec.savings % 1 === 0 ? rec.savings.toLocaleString() : rec.savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
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
                  <p className="text-sm text-gray-400 mt-2">{rec.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {rec.tool}
                      </span>
                      {rec.category && (
                        <>
                          <span>·</span>
                          <span>{rec.category}</span>
                        </>
                      )}
                      {rec.effort && (
                        <>
                          <span>·</span>
                          <span>Effort: {rec.effort}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white h-8 text-xs"
                        onClick={() => setSelectedRecommendation(rec)}
                      >
                        <Info className="w-3.5 h-3.5 mr-1.5" />
                        Details
                      </Button>
                      {rec.integrationId && (
                        <Link href={`/dashboard/tools/${rec.integrationId}`}>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white h-8 text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            View in Tool
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Last Analysis Info */}
      {dashboardData?.lastAnalysisAt && (
        <div className="text-center text-sm text-gray-500">
          Last analysis: {new Date(dashboardData.lastAnalysisAt).toLocaleString()}
        </div>
      )}

      {/* Recommendation Details Dialog */}
      <Dialog open={!!selectedRecommendation} onOpenChange={() => setSelectedRecommendation(null)}>
        <DialogContent className="bg-black/95 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              {selectedRecommendation && getTypeIcon(selectedRecommendation.type || selectedRecommendation.title)}
              {selectedRecommendation?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Recommendation for {selectedRecommendation?.tool}
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge className={getImpactBadge(selectedRecommendation.impact)}>
                  {selectedRecommendation.impact} impact
                </Badge>
                {selectedRecommendation.effort && (
                  <Badge className="bg-white/10 text-gray-300 border-white/20">
                    {selectedRecommendation.effort} effort
                  </Badge>
                )}
                {selectedRecommendation.category && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {selectedRecommendation.category}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                <p className="text-white">{selectedRecommendation.description}</p>
              </div>

              {selectedRecommendation.savings > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-400 mb-1">Potential Savings</h4>
                  <p className="text-2xl font-bold text-green-400">
                    ${selectedRecommendation.savings}/month
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRecommendation(null)}
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Close
                </Button>
                {selectedRecommendation.integrationId && (
                  <Link href={`/dashboard/tools/${selectedRecommendation.integrationId}`}>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View in Tool
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
