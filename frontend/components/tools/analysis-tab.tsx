"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles, Zap, Search, Loader2, BarChart3, Target, DollarSign,
  ShieldAlert, ShieldCheck, AlertTriangle, Eye, EyeOff,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface AnalysisTabProps {
  integration: Integration
  config: UnifiedToolConfig
}

export function AnalysisTab({ integration, config }: AnalysisTabProps) {
  if (config.analysisType === "costLeaks") {
    return <CostLeaksAnalysis integration={integration} config={config} />
  }
  if (config.analysisType === "usage") {
    return <UsageAnalysis integration={integration} config={config} />
  }
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="py-12 text-center">
        <p className="text-white/40 text-sm">Analysis not available for this tool.</p>
      </CardContent>
    </Card>
  )
}

// --- Cost Leaks Mode ---

function CostLeaksAnalysis({ integration, config }: AnalysisTabProps) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [inactivityDays, setInactivityDays] = useState(30)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const handleAnalyze = useCallback(async () => {
    if (!config.analysisEndpoint) return
    setIsLoading(true)
    try {
      const token = await getBackendToken()
      if (!token) {
        router.push("/login")
        return
      }

      const url = new URL(`${API_BASE}${config.analysisEndpoint}`)
      if (config.analysisSupportsInactivity) {
        url.searchParams.set("inactivityDays", String(inactivityDays))
      }
      if (config.analysisSupportsDateRange) {
        if (startDate) url.searchParams.set("startDate", startDate)
        if (endDate) url.searchParams.set("endDate", endDate)
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setAnalysis(data)
      toast.success("Analysis complete")

      const providerName = integration.provider || integration.tool_name
      const parameters: Record<string, any> = {}
      if (config.analysisSupportsDateRange) {
        if (startDate) parameters.startDate = startDate
        if (endDate) parameters.endDate = endDate
      }
      if (config.analysisSupportsInactivity) {
        parameters.inactivityDays = inactivityDays
      }

      const saveRes = await fetch(`${API_BASE}/api/analysis-history`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integrationId: integration.id,
          provider: providerName,
          parameters,
          analysisData: data,
        }),
      })
      if (!saveRes.ok && saveRes.status !== 409) {
        const err = await saveRes.json().catch(() => ({ error: "Unknown" }))
        console.warn("Failed to save analysis to history:", err.error)
      }
    } catch (err: any) {
      toast.error("Analysis failed", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [config, integration, inactivityDays, startDate, endDate, router])

  const allFindings = [
    ...(analysis?.supplierInvoiceAnalysis?.findings || []),
    ...(analysis?.customerInvoiceAnalysis?.findings || []),
    ...(analysis?.licenseAnalysis?.findings || []),
    ...(analysis?.findings || []),
  ]

  const filteredFindings = severityFilter === "all"
    ? allFindings
    : allFindings.filter(f => f.severity === severityFilter)

  return (
    <div className="space-y-6">
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white text-xl font-bold">Cost Leak Analysis</CardTitle>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500/60" />
                  AI-powered analysis to identify savings opportunities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analysis && (
                <Button
                  onClick={() => setIsVisible(!isVisible)}
                  variant="outline"
                  size="sm"
                  className="border-white/[0.06] bg-white/[0.03] text-white/70 hover:bg-white/10 h-9 w-9 p-0"
                >
                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-400 text-white h-9 px-4 text-sm font-medium"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" />{analysis ? "Re-analyze" : "Analyze Cost Leaks"}</>
                )}
              </Button>
            </div>
          </div>

          {(config.analysisSupportsDateRange || config.analysisSupportsInactivity) && (
            <div className="pt-4 mt-4 border-t border-white/[0.04] flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {config.analysisSupportsDateRange && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 w-40 bg-white/[0.03] border-white/[0.06] text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 w-40 bg-white/[0.03] border-white/[0.06] text-white text-sm"
                    />
                  </div>
                </>
              )}
              {config.analysisSupportsInactivity && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Inactivity Threshold</label>
                  <select
                    value={inactivityDays}
                    onChange={(e) => setInactivityDays(parseInt(e.target.value))}
                    className="h-9 px-3 rounded-md bg-black/30 border border-white/[0.06] text-white text-sm"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {analysis && isVisible && (
        <>
          {analysis.aiSummary && <AiSummaryCard summary={analysis.aiSummary} />}

          {analysis.overallSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Issues"
                value={analysis.overallSummary.totalFindings || 0}
                icon={<Target className="w-5 h-5 text-gray-400" />}
              />
              <MetricCard
                label="Potential Savings"
                value={`$${(analysis.overallSummary.totalPotentialSavings || 0).toLocaleString()}`}
                valueClass="text-emerald-400"
                icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                gradient="from-emerald-950 to-slate-900 border-emerald-800/30"
                sublabel="USD annually"
              />
              <MetricCard
                label="High Priority"
                value={analysis.overallSummary.highSeverity || 0}
                valueClass="text-red-400"
                icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
                gradient="from-red-950 to-slate-900 border-red-800/30"
                sublabel="Needs attention"
              />
              <MetricCard
                label="Medium Priority"
                value={analysis.overallSummary.mediumSeverity || 0}
                valueClass="text-amber-400"
                icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                gradient="from-amber-950 to-slate-900 border-amber-800/30"
                sublabel="Review recommended"
              />
            </div>
          )}

          {allFindings.length > 0 && (
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Findings ({filteredFindings.length})</CardTitle>
                  <div className="flex gap-1">
                    {(["all", "high", "medium", "low"] as const).map(s => (
                      <Button
                        key={s}
                        variant={severityFilter === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSeverityFilter(s)}
                        className="h-7 text-xs capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredFindings.map((f, idx) => (
                    <FindingCard key={f.findingHash || idx} finding={f} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {allFindings.length === 0 && (
            <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-800/30">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">No Cost Leaks Detected</h3>
                <p className="text-gray-400 max-w-md mx-auto">Everything looks well-optimized.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!analysis && !isLoading && (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="text-xl text-white mb-2">Ready to Analyze</h3>
            <p className="text-[13px] text-white/30 max-w-md mx-auto mb-6">
              Run analysis to identify cost optimization opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Usage Mode (OpenAI/Anthropic/Gemini) ---

function UsageAnalysis({ integration, config }: AnalysisTabProps) {
  const router = useRouter()
  const [result, setResult] = useState<{ summary_text: string; created_at: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const token = await getBackendToken()
      if (!token) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}/api/integrations/${integration.id}/usage-summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResult({ summary_text: data.summary_text, created_at: data.created_at })
      toast.success("Usage summary generated")
    } catch (err: any) {
      toast.error("Summary generation failed", { description: err.message })
    } finally {
      setIsGenerating(false)
    }
  }, [integration.id, router])

  return (
    <div className="space-y-6">
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white">{config.label} Usage Insights</CardTitle>
                <p className="text-gray-400 text-sm">AI-generated analysis of your {config.label} API usage</p>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-emerald-500 hover:bg-emerald-400 text-white h-9 px-4 text-sm"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{result ? "Regenerate" : "Generate Summary"}</>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {result && <AiSummaryCard summary={result.summary_text} />}

      {!result && !isGenerating && (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">Click "Generate Summary" to get AI insights on your usage.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Shared sub-components ---

function AiSummaryCard({ summary }: { summary: string }) {
  return (
    <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-violet-500/10 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-white font-semibold">AI Summary</h3>
              <Badge variant="outline" className="text-[9px] h-[16px] border-violet-500/15 text-violet-400/70 bg-violet-500/[0.06] rounded-full px-1.5">AI</Badge>
            </div>
            <div className="prose prose-invert prose-sm max-w-none
              [&_p]:text-gray-300 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2
              [&_strong]:text-white [&_strong]:font-semibold
              [&_ul]:text-gray-300 [&_ul]:text-sm [&_ul]:space-y-1 [&_ul]:mb-3
              [&_ol]:text-gray-300 [&_ol]:text-sm [&_ol]:space-y-1 [&_ol]:mb-3
              [&_li]:text-gray-300
              [&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4
              [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
              [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1.5 [&_h3]:mt-2
              [&_hr]:border-white/10 [&_hr]:my-3
              [&_code]:text-emerald-400 [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                  th: ({ children }) => <th className="text-left text-gray-400 font-medium px-3 py-2 border-b border-white/10 whitespace-nowrap">{children}</th>,
                  td: ({ children }) => <td className="text-gray-300 px-3 py-1.5 border-b border-white/[0.04]">{children}</td>,
                  tr: ({ children }) => <tr className="border-b border-white/[0.04]">{children}</tr>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  label, value, icon, valueClass = "text-white", gradient = "bg-white/[0.02] border-white/[0.06]", sublabel,
}: {
  label: string; value: number | string; icon: React.ReactNode; valueClass?: string; gradient?: string; sublabel?: string
}) {
  const isGradient = gradient.includes("from-")
  return (
    <Card className={isGradient ? `bg-gradient-to-br ${gradient} rounded-xl` : `${gradient} rounded-xl`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${valueClass}`}>{value}</p>
            {sublabel && <p className="text-xs text-white/30 mt-1">{sublabel}</p>}
          </div>
          <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function FindingCard({ finding }: { finding: any }) {
  const severityColor =
    finding.severity === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" :
    finding.severity === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
    "bg-white/5 text-white/50 border-white/10"

  return (
    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-[10px] uppercase ${severityColor}`}>{finding.severity}</Badge>
            <span className="text-[10px] uppercase tracking-wide text-white/30">{finding.type}</span>
          </div>
          <p className="text-[13px] font-medium text-white/85 mb-1">{finding.title}</p>
          <p className="text-[11.5px] text-white/40 mb-2">{finding.description}</p>
          {finding.recommendation && (
            <p className="text-[11px] text-emerald-400/60">→ {finding.recommendation}</p>
          )}
        </div>
        {(finding.potentialSavings || 0) > 0 && (
          <div className="text-right shrink-0">
            <div className="text-[11px] text-white/30">Save</div>
            <div className="text-[15px] font-medium text-emerald-400/90">
              ${finding.potentialSavings.toLocaleString()}
            </div>
            <div className="text-[10px] text-white/30">/year</div>
          </div>
        )}
      </div>
    </div>
  )
}
