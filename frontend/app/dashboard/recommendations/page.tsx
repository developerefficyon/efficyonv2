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
  ArrowUpRight,
  Layers,
  Sparkles,
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

function formatSavings(amount: number): string {
  if (amount % 1 === 0) return amount.toLocaleString()
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
        return <TrendingDown className="w-4 h-4 text-blue-400/70" />
      case "remove":
      case "Remove Inactive Seats":
        return <X className="w-4 h-4 text-red-400/70" />
      case "switch":
        return <ArrowRight className="w-4 h-4 text-violet-400/70" />
      case "Audit HubSpot Plan":
      case "Review User Access":
        return <Lightbulb className="w-4 h-4 text-amber-400/70" />
      default:
        return <Zap className="w-4 h-4 text-emerald-400/70" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "downgrade": return "bg-blue-500/10"
      case "remove":
      case "Remove Inactive Seats": return "bg-red-500/10"
      case "switch": return "bg-violet-500/10"
      case "Audit HubSpot Plan":
      case "Review User Access": return "bg-amber-500/10"
      default: return "bg-emerald-500/10"
    }
  }

  const getImpactStyle = (impact: string) => {
    const n = impact?.toLowerCase() || "medium"
    if (n === "high") return "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
    if (n === "low") return "bg-white/[0.04] text-white/35 border-white/[0.06]"
    return "bg-amber-500/10 text-amber-400/80 border-amber-500/15"
  }

  const getEffortStyle = (effort: string) => {
    const n = effort?.toLowerCase() || ""
    if (n === "low") return "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/15"
    if (n === "high") return "bg-red-500/10 text-red-400/70 border-red-500/15"
    return "bg-white/[0.04] text-white/35 border-white/[0.06]"
  }

  const recommendations: Recommendation[] = dashboardData?.recommendations || []
  const hasRealData = dashboardData?.hasData === true && recommendations.length > 0

  const totalPotentialSavings = dashboardData?.summary?.totalPotentialSavings ||
    recommendations.reduce((sum, r) => sum + (r.savings || 0), 0)

  // Count by impact
  const highImpact = recommendations.filter(r => r.impact?.toLowerCase() === "high").length
  const withSavings = recommendations.filter(r => r.savings > 0).length

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative mx-auto w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
          </div>
          <p className="text-[13px] text-white/30">Loading recommendations...</p>
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
            Recommend<span className="italic text-emerald-400/90">ations</span>
          </h2>
          <p className="text-[14px] text-white/35">AI-powered suggestions to optimize your spending</p>
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

  // ── Empty State ──
  if (!hasRealData) {
    return (
      <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up delay-0">
          <div>
            <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
              Recommend<span className="italic text-emerald-400/90">ations</span>
            </h2>
            <p className="text-[14px] text-white/35">AI-powered suggestions to optimize your spending</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-white/25 uppercase tracking-wider mb-0.5">Potential Savings</p>
            <p className="text-xl font-semibold text-white/20">$0/mo</p>
          </div>
        </div>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl overflow-hidden relative animate-slide-up delay-1">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl" />
          <CardContent className="p-12 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <Lightbulb className="w-7 h-7 text-white/15" />
            </div>
            <h3 className="text-xl font-display text-white mb-2">No Recommendations Yet</h3>
            <p className="text-[13px] text-white/30 max-w-md mx-auto mb-6 leading-relaxed">
              Connect your tools and run a cost analysis to get AI-powered
              recommendations for optimizing your SaaS spending.
            </p>
            <Link href="/dashboard/tools">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg">
                Connect Tools
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Main View ──
  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up delay-0">
        <div>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
            Recommend<span className="italic text-emerald-400/90">ations</span>
          </h2>
          <p className="text-[14px] text-white/35">AI-powered suggestions to optimize your spending</p>
        </div>
      </div>

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 animate-slide-up delay-1">
        {/* Total Savings */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift relative overflow-hidden group">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/[0.06] rounded-full blur-3xl group-hover:bg-emerald-500/[0.1] transition-all duration-700" />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400/60" />
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Potential Savings</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-emerald-400 tracking-tight">
              ${formatSavings(totalPotentialSavings)}
              <span className="text-[12px] text-white/20 font-normal ml-0.5">/mo</span>
            </p>
          </CardContent>
        </Card>

        {/* High Impact Count */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400/60" />
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">High Impact</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{highImpact}</p>
          </CardContent>
        </Card>

        {/* Total Recommendations */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-white/25" />
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Total</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {recommendations.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Recommendations List ── */}
      <div className="space-y-2 animate-slide-up delay-2">
        {recommendations.map((rec, index) => (
          <Card
            key={rec.id}
            className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift group relative overflow-hidden"
          >
            {/* Left accent */}
            <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
              rec.impact?.toLowerCase() === "high" ? "bg-emerald-400/50" :
              rec.impact?.toLowerCase() === "low" ? "bg-white/[0.08]" : "bg-amber-400/40"
            }`} />

            <CardContent className="p-4 pl-5 sm:p-5 sm:pl-6">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Type icon */}
                <div className={`w-9 h-9 rounded-lg ${getTypeColor(rec.type || rec.title)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {getTypeIcon(rec.type || rec.title)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-medium text-white/85 mb-1.5 line-clamp-1">{rec.title}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`${getImpactStyle(rec.impact)} text-[9px] h-[18px] px-1.5 rounded-full font-medium`}>
                          {rec.impact} impact
                        </Badge>
                        {rec.effort && (
                          <Badge className={`${getEffortStyle(rec.effort)} text-[9px] h-[18px] px-1.5 rounded-full font-medium`}>
                            {rec.effort} effort
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Savings */}
                    <div className="text-right shrink-0">
                      {rec.savings > 0 ? (
                        <div>
                          <p className="text-lg font-semibold text-emerald-400">
                            ${formatSavings(rec.savings)}
                          </p>
                          <p className="text-[10px] text-white/20">/month</p>
                        </div>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-400/70 border-blue-500/15 text-[9px] h-[18px] px-1.5 rounded-full">
                          Optimization
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-[12px] text-white/30 mt-2 line-clamp-2 leading-relaxed">{rec.description}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-[11px] text-white/20">
                      <span>{rec.tool}</span>
                      {rec.category && (
                        <>
                          <span className="text-white/10">·</span>
                          <span>{rec.category}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-white/25 hover:text-white/60 hover:bg-white/[0.04] rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedRecommendation(rec)}
                      >
                        <Info className="w-2.5 h-2.5 mr-0.5" />
                        Details
                      </Button>
                      {rec.integrationId && (
                        <Link href={`/dashboard/tools/${rec.integrationId}`}>
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-emerald-500/90 hover:bg-emerald-400 text-black font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View Tool <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
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

      {/* ── Last Analysis ── */}
      {dashboardData?.lastAnalysisAt && (
        <div className="text-center animate-slide-up delay-3">
          <p className="text-[11px] text-white/15">
            Last analysis: {new Date(dashboardData.lastAnalysisAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* ── Details Dialog ── */}
      <Dialog open={!!selectedRecommendation} onOpenChange={() => setSelectedRecommendation(null)}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium text-white flex items-center gap-2.5">
              {selectedRecommendation && (
                <div className={`w-8 h-8 rounded-lg ${getTypeColor(selectedRecommendation.type || selectedRecommendation.title)} flex items-center justify-center flex-shrink-0`}>
                  {getTypeIcon(selectedRecommendation.type || selectedRecommendation.title)}
                </div>
              )}
              <span className="line-clamp-1">{selectedRecommendation?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-[13px] text-white/35">
              Recommendation for {selectedRecommendation?.tool}
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-4 mt-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className={`${getImpactStyle(selectedRecommendation.impact)} text-[9px] h-[18px] px-1.5 rounded-full font-medium`}>
                  {selectedRecommendation.impact} impact
                </Badge>
                {selectedRecommendation.effort && (
                  <Badge className={`${getEffortStyle(selectedRecommendation.effort)} text-[9px] h-[18px] px-1.5 rounded-full font-medium`}>
                    {selectedRecommendation.effort} effort
                  </Badge>
                )}
                {selectedRecommendation.category && (
                  <Badge className="bg-violet-500/10 text-violet-400/70 border-violet-500/15 text-[9px] h-[18px] px-1.5 rounded-full font-medium">
                    {selectedRecommendation.category}
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-[11px] text-white/25 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-[13px] text-white/70 leading-relaxed">{selectedRecommendation.description}</p>
              </div>

              {selectedRecommendation.savings > 0 && (
                <div className="bg-emerald-500/[0.05] border border-emerald-500/10 rounded-lg p-4">
                  <p className="text-[11px] text-emerald-400/60 uppercase tracking-wider mb-1">Potential Savings</p>
                  <p className="text-2xl font-semibold text-emerald-400">
                    ${formatSavings(selectedRecommendation.savings)}
                    <span className="text-[12px] text-white/20 font-normal ml-0.5">/month</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedRecommendation(null)}
                  className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
                >
                  Close
                </Button>
                {selectedRecommendation.integrationId && (
                  <Link href={`/dashboard/tools/${selectedRecommendation.integrationId}`}>
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg h-9 text-[13px]">
                      View in Tool <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
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
