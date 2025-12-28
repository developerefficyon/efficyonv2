"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, TrendingDown, AlertTriangle, CheckCircle, Brain, Zap, DollarSign, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AIInsightsProps {
  analysisData: any
  onEnhance?: (enhancedData: any) => void
}

export function AIInsights({ analysisData, onEnhance }: AIInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const generateInsights = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisData }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate insights")
      }

      const data = await response.json()
      setInsights(data.analysis)
      onEnhance?.(data.analysis)

      toast.success("AI insights generated successfully!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate insights"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate Insights Button */}
      {!insights && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <Brain className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-white text-xl">AI-Powered Insights</CardTitle>
                <CardDescription className="text-gray-400">
                  Get intelligent recommendations and savings estimates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <Button 
              onClick={generateInsights} 
              disabled={loading} 
              size="lg" 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating AI Insights...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Insights
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Powered by OpenAI GPT-4 • Analyzes your findings and provides actionable recommendations
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Insights Display */}
      {insights && (
        <>
          {/* Summary */}
          {insights.aiSummary && (
            <Card className="bg-gradient-to-br from-black/80 via-black/80 to-black/95 backdrop-blur-xl border-cyan-500/20 shadow-xl shadow-cyan-500/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-xl">Executive Summary</CardTitle>
                    <CardDescription className="text-gray-400">
                      AI-generated analysis of your cost leaks
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-xl p-6 border border-cyan-500/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                      {insights.aiSummary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Findings */}
          {insights.findings && insights.findings.length > 0 && (
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                    <TrendingDown className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-xl">
                      AI-Enhanced Findings
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {insights.findings.length} findings with AI recommendations
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.findings.map((finding: any, index: number) => (
                    <div 
                      key={index} 
                      className="relative rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-5 hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              {finding.type}
                            </Badge>
                            {finding.aiEnhanced && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Enhanced
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-white text-lg mb-1">{finding.type}</h4>
                          <p className="text-sm text-gray-400">
                            {finding.supplierName || "Unknown Supplier"}
                          </p>
                        </div>
                        {finding.aiEstimatedSavings > 0 && (
                          <div className="text-right">
                            <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
                              <DollarSign className="w-3 h-3 mr-1" />
                              Save ${(finding.aiEstimatedSavings / 100).toFixed(2)}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Finding Details */}
                      {(finding.amount || finding.total) && (
                        <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">Current Amount:</span>
                            <span className="text-white font-semibold">
                              ${((finding.amount || finding.total) / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* AI Recommendations */}
                      {finding.aiRecommendations && (
                        <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20">
                          <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-green-400 mb-2">
                                AI Recommendations:
                              </p>
                              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {finding.aiRecommendations}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Estimated Impact */}
                      {finding.aiEstimatedSavings && finding.aiEstimatedSavings > 0 && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20">
                          <div className="flex items-center gap-3">
                            <TrendingDown className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-xs text-blue-400 mb-1">Estimated Annual Savings</p>
                              <p className="text-xl font-bold text-white">
                                ${(finding.aiEstimatedSavings / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total Estimated Savings */}
          {insights.findings && insights.findings.length > 0 && (
            <Card className="bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent border-2 border-green-500/30 shadow-2xl shadow-green-500/20">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-400/50 mb-2">
                    <DollarSign className="w-8 h-8 text-green-300" />
                  </div>
                  <p className="text-sm text-green-400 font-medium uppercase tracking-wider">
                    Total Estimated Annual Savings
                  </p>
                  <p className="text-5xl font-extrabold bg-gradient-to-r from-green-300 via-emerald-300 to-green-300 bg-clip-text text-transparent">
                    $
                    {(
                      insights.findings.reduce(
                        (sum: number, f: any) => sum + (f.aiEstimatedSavings || 0),
                        0
                      ) / 100
                    ).toFixed(2)}
                  </p>
                  <p className="text-xs text-green-400/80 mt-3">
                    Based on AI analysis of {insights.findings.length} findings
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regenerate */}
          <Button
            onClick={generateInsights}
            disabled={loading}
            variant="outline"
            className="w-full border-white/10 bg-black/50 text-white hover:bg-white/10 hover:border-white/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Insights
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
