"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Trophy,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

interface AnalysisEntry {
  id: string
  analysis_type: string
  template_id: string | null
  template_version: number | null
  status: string
  scoring: any
  duration_ms: number | null
  created_at: string
}

interface ComparisonResult {
  id: string
  name: string
  analysis_ids: string[]
  workspace_id: string
  metrics: AnalysisMetrics[]
  detection_matrix: DetectionMatrixEntry[]
  best_f1_analysis_id: string | null
}

interface AnalysisMetrics {
  analysis_id: string
  precision: number
  recall: number
  f1: number
}

interface DetectionMatrixEntry {
  anomaly_type: string
  label: string
  results: Record<string, boolean>
}

interface ComparisonPanelProps {
  workspaceId: string
  analyses: AnalysisEntry[]
  onComparisonCreated?: () => void
}

function metricColor(value: number): string {
  if (value >= 0.8) return "text-green-400"
  if (value >= 0.5) return "text-yellow-400"
  return "text-red-400"
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function DeltaIndicator({ current, baseline }: { current: number; baseline: number }) {
  const delta = current - baseline
  if (Math.abs(delta) < 0.001) {
    return (
      <span className="text-gray-500 text-xs flex items-center gap-0.5">
        <Minus className="w-3 h-3" />
        0%
      </span>
    )
  }
  if (delta > 0) {
    return (
      <span className="text-green-400 text-xs flex items-center gap-0.5">
        <ArrowUp className="w-3 h-3" />
        +{(delta * 100).toFixed(1)}%
      </span>
    )
  }
  return (
    <span className="text-red-400 text-xs flex items-center gap-0.5">
      <ArrowDown className="w-3 h-3" />
      {(delta * 100).toFixed(1)}%
    </span>
  )
}

export function ComparisonPanel({
  workspaceId,
  analyses,
  onComparisonCreated,
}: ComparisonPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)

  const completedAnalyses = useMemo(
    () => analyses.filter((a) => a.status === "completed"),
    [analyses]
  )

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === completedAnalyses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(completedAnalyses.map((a) => a.id)))
    }
  }

  async function handleCreateComparison() {
    if (selectedIds.size < 2) return
    setCreating(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const now = new Date()
      const name = `Comparison ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`

      const res = await fetch(`${apiBase}/api/test/comparisons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          analysis_ids: Array.from(selectedIds),
          workspace_id: workspaceId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComparison(data)
        toast.success("Comparison created")
        onComparisonCreated?.()
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(err.error || "Failed to create comparison")
      }
    } catch {
      toast.error("Network error creating comparison")
    } finally {
      setCreating(false)
    }
  }

  const bestF1Id = comparison?.best_f1_analysis_id ?? null
  const metrics = comparison?.metrics ?? []
  const detectionMatrix = comparison?.detection_matrix ?? []

  // Use the first analysis as the baseline for delta calculations
  const baselineMetrics = metrics.length > 0 ? metrics[0] : null

  return (
    <div className="space-y-4">
      {/* Selection Card */}
      <Card className="bg-[#1a1a2e] border-[#2a2a4a]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Compare Analyses
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#2a2a4a] text-gray-400"
              >
                {selectedIds.size} selected
              </Badge>
              <Button
                onClick={handleCreateComparison}
                disabled={selectedIds.size < 2 || creating}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                )}
                {creating ? "Comparing..." : "Compare Selected"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {completedAnalyses.length === 0 ? (
            <p className="text-sm text-gray-500">
              No completed analyses available for comparison.
            </p>
          ) : (
            <div className="space-y-1">
              {/* Select All header */}
              <div className="flex items-center gap-3 px-3 py-2 border-b border-[#2a2a4a]">
                <Checkbox
                  checked={
                    completedAnalyses.length > 0 &&
                    selectedIds.size === completedAnalyses.length
                  }
                  onCheckedChange={toggleAll}
                  className="border-gray-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                />
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  Select All
                </span>
              </div>

              {completedAnalyses.map((analysis) => {
                const isSelected = selectedIds.has(analysis.id)
                const detection = analysis.scoring?.detection
                const f1 = detection?.f1Score
                return (
                  <div
                    key={analysis.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-cyan-500/10 border border-cyan-500/20"
                        : "bg-black/20 border border-transparent hover:border-[#2a2a4a]"
                    }`}
                    onClick={() => toggleSelection(analysis.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(analysis.id)}
                      className="border-gray-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium capitalize">
                          {analysis.analysis_type.replace(/_/g, " ")}
                        </span>
                        {analysis.template_version != null && (
                          <Badge
                            variant="outline"
                            className="border-[#2a2a4a] text-gray-400 text-xs"
                          >
                            v{analysis.template_version}
                          </Badge>
                        )}
                        {f1 != null && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              f1 >= 0.8
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : f1 >= 0.5
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            }`}
                          >
                            F1: {(f1 * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {new Date(analysis.created_at).toLocaleDateString()}{" "}
                          {new Date(analysis.created_at).toLocaleTimeString()}
                        </span>
                        {analysis.duration_ms != null && (
                          <span className="text-xs text-gray-600">
                            {analysis.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-mono">
                      {analysis.id.slice(0, 8)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Metric Cards - Side by Side */}
          <Card className="bg-[#1a1a2e] border-[#2a2a4a]">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Comparison Results
                {comparison.name && (
                  <span className="text-sm text-gray-400 font-normal ml-2">
                    {comparison.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${metrics.length}, minmax(200px, 1fr))`,
                  }}
                >
                  {metrics.map((m, idx) => {
                    const isBestF1 = m.analysis_id === bestF1Id
                    const matchedAnalysis = completedAnalyses.find(
                      (a) => a.id === m.analysis_id
                    )
                    return (
                      <div
                        key={m.analysis_id}
                        className={`rounded-lg border p-4 space-y-3 ${
                          isBestF1
                            ? "border-yellow-500/40 bg-yellow-500/5"
                            : "border-[#2a2a4a] bg-black/20"
                        }`}
                      >
                        {/* Analysis Header */}
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate capitalize">
                              {matchedAnalysis
                                ? matchedAnalysis.analysis_type.replace(/_/g, " ")
                                : m.analysis_id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {m.analysis_id.slice(0, 8)}
                            </p>
                          </div>
                          {isBestF1 && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs shrink-0">
                              <Trophy className="w-3 h-3 mr-1" />
                              Best F1
                            </Badge>
                          )}
                        </div>

                        {/* Precision */}
                        <div className="bg-black/30 rounded-lg p-3 border border-[#2a2a4a]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-gray-500">Precision</p>
                            {baselineMetrics && idx > 0 && (
                              <DeltaIndicator
                                current={m.precision}
                                baseline={baselineMetrics.precision}
                              />
                            )}
                          </div>
                          <p
                            className={`text-2xl font-bold ${metricColor(m.precision)}`}
                          >
                            {formatPercent(m.precision)}
                          </p>
                        </div>

                        {/* Recall */}
                        <div className="bg-black/30 rounded-lg p-3 border border-[#2a2a4a]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-gray-500">Recall</p>
                            {baselineMetrics && idx > 0 && (
                              <DeltaIndicator
                                current={m.recall}
                                baseline={baselineMetrics.recall}
                              />
                            )}
                          </div>
                          <p
                            className={`text-2xl font-bold ${metricColor(m.recall)}`}
                          >
                            {formatPercent(m.recall)}
                          </p>
                        </div>

                        {/* F1 */}
                        <div
                          className={`bg-black/30 rounded-lg p-3 border ${
                            isBestF1 ? "border-yellow-500/30" : "border-[#2a2a4a]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-gray-500">F1 Score</p>
                            {baselineMetrics && idx > 0 && (
                              <DeltaIndicator
                                current={m.f1}
                                baseline={baselineMetrics.f1}
                              />
                            )}
                          </div>
                          <p
                            className={`text-2xl font-bold ${
                              isBestF1 ? "text-yellow-400" : metricColor(m.f1)
                            }`}
                          >
                            {formatPercent(m.f1)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detection Matrix */}
          {detectionMatrix.length > 0 && (
            <Card className="bg-[#1a1a2e] border-[#2a2a4a]">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Detection Matrix
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Which anomaly types each analysis run detected
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a4a]">
                        <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                          Anomaly Type
                        </th>
                        {comparison.analysis_ids.map((id) => {
                          const matched = completedAnalyses.find(
                            (a) => a.id === id
                          )
                          return (
                            <th
                              key={id}
                              className={`text-center py-2 px-3 text-xs uppercase tracking-wider font-medium ${
                                id === bestF1Id
                                  ? "text-yellow-400"
                                  : "text-gray-500"
                              }`}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="capitalize">
                                  {matched
                                    ? matched.analysis_type
                                        .replace(/_/g, " ")
                                        .slice(0, 12)
                                    : "Analysis"}
                                </span>
                                <span className="font-mono text-gray-600 normal-case">
                                  {id.slice(0, 8)}
                                </span>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {detectionMatrix.map((entry) => (
                        <tr
                          key={entry.anomaly_type}
                          className="border-b border-[#2a2a4a]/50 hover:bg-white/[0.02]"
                        >
                          <td className="py-2.5 px-3 text-gray-300">
                            {entry.label || entry.anomaly_type}
                          </td>
                          {comparison.analysis_ids.map((id) => {
                            const detected = entry.results?.[id] ?? false
                            return (
                              <td
                                key={id}
                                className="text-center py-2.5 px-3"
                              >
                                {detected ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400/50 mx-auto" />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary row */}
                <div className="mt-3 pt-3 border-t border-[#2a2a4a] flex flex-wrap gap-3">
                  {comparison.analysis_ids.map((id) => {
                    const detectedCount = detectionMatrix.filter(
                      (e) => e.results?.[id]
                    ).length
                    const total = detectionMatrix.length
                    const matched = completedAnalyses.find((a) => a.id === id)
                    return (
                      <Badge
                        key={id}
                        variant="outline"
                        className={`text-xs ${
                          detectedCount === total
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : detectedCount >= total * 0.5
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {matched
                          ? matched.analysis_type.replace(/_/g, " ").slice(0, 10)
                          : id.slice(0, 8)}
                        : {detectedCount}/{total} detected
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
