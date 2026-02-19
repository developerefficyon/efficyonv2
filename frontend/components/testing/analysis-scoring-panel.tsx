"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  Star,
  Brain,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"

interface AnalysisScoringPanelProps {
  analysisId: string
  scoring: any
  status: string
  onScoringUpdate: (newScoring: any) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  true_positive: { label: "Detected", color: "border-green-500/30 text-green-400", icon: CheckCircle2 },
  missed: { label: "Missed", color: "border-red-500/30 text-red-400", icon: XCircle },
  false_positive: { label: "False Positive", color: "border-yellow-500/30 text-yellow-400", icon: AlertCircle },
  true_negative: { label: "Not Expected", color: "border-gray-500/30 text-gray-500", icon: MinusCircle },
}

function metricColor(value: number) {
  if (value >= 0.8) return "text-green-400"
  if (value >= 0.5) return "text-yellow-400"
  return "text-red-400"
}

function metricBgColor(value: number) {
  if (value >= 0.8) return "border-green-500/10"
  if (value >= 0.5) return "border-yellow-500/10"
  return "border-red-500/10"
}

export function AnalysisScoringPanel({
  analysisId,
  scoring,
  status,
  onScoringUpdate,
}: AnalysisScoringPanelProps) {
  const [autoScoring, setAutoScoring] = useState(false)
  const [savingQuality, setSavingQuality] = useState(false)
  const [aiEvaluating, setAiEvaluating] = useState(false)
  const [showImprovements, setShowImprovements] = useState(false)
  const [showDiagnoses, setShowDiagnoses] = useState(false)

  const [clarity, setClarity] = useState(scoring?.quality?.clarity ?? 3)
  const [precision, setPrecision] = useState(scoring?.quality?.precision ?? 3)
  const [realism, setRealism] = useState(scoring?.quality?.realism ?? 3)
  const [actionability, setActionability] = useState(scoring?.quality?.actionability ?? 3)

  const detection = scoring?.detection
  const details = scoring?.details as any[] | undefined
  const quality = scoring?.quality
  const aiEvaluation = scoring?.aiEvaluation

  async function handleAutoScore() {
    setAutoScoring(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/analyses/${analysisId}/auto-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        const data = await res.json()
        onScoringUpdate(data.scoring)
        toast.success("Auto-scoring complete")
      } else {
        const err = await res.json()
        toast.error(err.error || "Auto-scoring failed")
      }
    } catch {
      toast.error("Network error during auto-scoring")
    } finally {
      setAutoScoring(false)
    }
  }

  async function handleAiEvaluate() {
    setAiEvaluating(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/analyses/${analysisId}/ai-evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        onScoringUpdate({ ...scoring, aiEvaluation: data.aiEvaluation })
        toast.success("AI evaluation complete")
      } else {
        const err = await res.json()
        toast.error(err.error || "AI evaluation failed")
      }
    } catch {
      toast.error("Network error during AI evaluation")
    } finally {
      setAiEvaluating(false)
    }
  }

  async function handleSaveQuality() {
    setSavingQuality(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/analyses/${analysisId}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quality_scores: { clarity, precision, realism, actionability },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onScoringUpdate(data.scoring)
        toast.success("Quality scores saved")
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save quality scores")
      }
    } catch {
      toast.error("Network error saving quality scores")
    } finally {
      setSavingQuality(false)
    }
  }

  if (status !== "completed") return null

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Analysis Scoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section A: Detection Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Detection Metrics</h3>
            <Button
              onClick={handleAutoScore}
              disabled={autoScoring}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {autoScoring ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Target className="w-3.5 h-3.5 mr-1.5" />
              )}
              {autoScoring ? "Scoring..." : detection ? "Re-Score" : "Run Auto-Score"}
            </Button>
          </div>

          {detection ? (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`bg-black/30 rounded-lg p-3 border ${metricBgColor(detection.precision)} text-center`}>
                  <p className="text-xs text-gray-500 mb-1">Precision</p>
                  <p className={`text-2xl font-bold ${metricColor(detection.precision)}`}>
                    {(detection.precision * 100).toFixed(0)}%
                  </p>
                </div>
                <div className={`bg-black/30 rounded-lg p-3 border ${metricBgColor(detection.recall)} text-center`}>
                  <p className="text-xs text-gray-500 mb-1">Recall</p>
                  <p className={`text-2xl font-bold ${metricColor(detection.recall)}`}>
                    {(detection.recall * 100).toFixed(0)}%
                  </p>
                </div>
                <div className={`bg-black/30 rounded-lg p-3 border ${metricBgColor(detection.f1Score)} text-center`}>
                  <p className="text-xs text-gray-500 mb-1">F1 Score</p>
                  <p className={`text-2xl font-bold ${metricColor(detection.f1Score)}`}>
                    {(detection.f1Score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Counts */}
              <div className="flex gap-4 text-sm mb-4">
                <span className="text-gray-400">
                  Expected: <span className="text-white font-medium">{detection.totalExpectedAnomalyTypes}</span>
                </span>
                <span className="text-gray-400">
                  Detected: <span className="text-green-400 font-medium">{detection.totalTruePositives}</span>
                </span>
                <span className="text-gray-400">
                  Missed: <span className="text-red-400 font-medium">{detection.totalMissed}</span>
                </span>
                <span className="text-gray-400">
                  False Pos: <span className="text-yellow-400 font-medium">{detection.totalFalsePositives}</span>
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Click &quot;Run Auto-Score&quot; to compare analysis findings against injected anomalies.
            </p>
          )}
        </div>

        {/* Section B: Expected vs Actual Table */}
        {details && details.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Expected vs Actual</h3>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_80px_80px_120px] gap-2 px-3 py-2 bg-white/[0.03] text-xs text-gray-500 uppercase tracking-wider">
                <span>Anomaly</span>
                <span>Finding Type</span>
                <span className="text-center">Injected</span>
                <span className="text-center">Found</span>
                <span className="text-center">Status</span>
              </div>
              {/* Rows */}
              {details.map((d: any) => {
                const config = STATUS_CONFIG[d.status] || STATUS_CONFIG.true_negative
                const Icon = config.icon
                return (
                  <div
                    key={d.anomalyType}
                    className="grid grid-cols-[1fr_1fr_80px_80px_120px] gap-2 px-3 py-2.5 border-t border-white/5 items-center"
                  >
                    <span className="text-sm text-gray-300">{d.label || d.anomalyType}</span>
                    <span className="text-sm text-gray-500 font-mono">{d.findingType}</span>
                    <span className="text-center">
                      {d.injected ? (
                        <span className="text-cyan-400 text-sm">Yes</span>
                      ) : (
                        <span className="text-gray-600 text-sm">No</span>
                      )}
                    </span>
                    <span className="text-center text-sm text-white font-medium">{d.detectedCount}</span>
                    <span className="flex justify-center">
                      <Badge variant="outline" className={`${config.color} text-xs gap-1`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section C: Manual Quality Scores */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-400" />
            Quality Assessment
            {quality && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 ml-2">
                Avg: {quality.average}/5
              </Badge>
            )}
          </h3>

          <div className="space-y-4">
            <QualitySlider label="Clarity" description="Are findings easy to understand?" value={clarity} onChange={setClarity} />
            <QualitySlider label="Precision" description="Are recommendations specific?" value={precision} onChange={setPrecision} />
            <QualitySlider label="Realism" description="Are savings estimates realistic?" value={realism} onChange={setRealism} />
            <QualitySlider label="Actionability" description="Can users act on findings?" value={actionability} onChange={setActionability} />
          </div>

          <Button
            onClick={handleSaveQuality}
            disabled={savingQuality}
            size="sm"
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {savingQuality ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Star className="w-3.5 h-3.5 mr-1.5" />
            )}
            {savingQuality ? "Saving..." : "Save Quality Scores"}
          </Button>
        </div>

        {/* Section D: AI Evaluation (Claude) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-400" />
              AI Evaluation
              {aiEvaluation && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-2">
                  Score: {aiEvaluation.quality?.overallScore ?? "N/A"}/5
                </Badge>
              )}
            </h3>
            <Button
              onClick={handleAiEvaluate}
              disabled={aiEvaluating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {aiEvaluating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Brain className="w-3.5 h-3.5 mr-1.5" />
              )}
              {aiEvaluating ? "Evaluating..." : aiEvaluation ? "Re-Evaluate" : "Run AI Evaluation"}
            </Button>
          </div>

          {aiEvaluation ? (
            <div className="space-y-4">
              {/* AI Quality Scores */}
              {aiEvaluation.quality && (
                <div className="grid grid-cols-4 gap-2">
                  {["clarity", "precision", "realism", "actionability"].map((dim) => {
                    const val = aiEvaluation.quality[dim]
                    const score = typeof val === "object" ? val.score : val
                    return (
                      <div key={dim} className="bg-black/30 rounded-lg p-2 border border-blue-500/10 text-center">
                        <p className="text-[10px] text-gray-500 capitalize">{dim}</p>
                        <p className={`text-lg font-bold ${score >= 4 ? "text-green-400" : score >= 3 ? "text-amber-400" : "text-red-400"}`}>
                          {score}/5
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Strengths & Weaknesses */}
              {(aiEvaluation.quality?.topStrengths || aiEvaluation.quality?.topWeaknesses) && (
                <div className="grid grid-cols-2 gap-3">
                  {aiEvaluation.quality.topStrengths?.length > 0 && (
                    <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/10">
                      <p className="text-xs text-green-400 font-medium mb-1">Strengths</p>
                      {aiEvaluation.quality.topStrengths.map((s: string, i: number) => (
                        <p key={i} className="text-xs text-gray-300">• {s}</p>
                      ))}
                    </div>
                  )}
                  {aiEvaluation.quality.topWeaknesses?.length > 0 && (
                    <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                      <p className="text-xs text-red-400 font-medium mb-1">Weaknesses</p>
                      {aiEvaluation.quality.topWeaknesses.map((w: string, i: number) => (
                        <p key={i} className="text-xs text-gray-300">• {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Improvement Suggestions */}
              {aiEvaluation.improvements?.improvements?.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowImprovements(!showImprovements)}
                    className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {aiEvaluation.improvements.improvements.length} Improvement Suggestions
                    {showImprovements ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showImprovements && (
                    <div className="mt-2 space-y-2">
                      {aiEvaluation.improvements.improvements.map((imp: any, i: number) => (
                        <div key={i} className="bg-black/30 rounded-lg p-3 border border-amber-500/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                              {imp.category}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${imp.priority === "high" ? "border-red-500/30 text-red-400" : imp.priority === "medium" ? "border-amber-500/30 text-amber-400" : "border-gray-500/30 text-gray-400"}`}>
                              {imp.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-300">{imp.description}</p>
                          {imp.suggestedChange && (
                            <p className="text-xs text-gray-500 mt-1 font-mono bg-black/30 rounded px-2 py-1">
                              {imp.suggestedChange}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Missed Anomaly Diagnoses */}
              {aiEvaluation.missedDiagnosis?.diagnoses?.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowDiagnoses(!showDiagnoses)}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {aiEvaluation.missedDiagnosis.diagnoses.length} Missed Anomaly Diagnoses
                    {showDiagnoses ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showDiagnoses && (
                    <div className="mt-2 space-y-2">
                      {aiEvaluation.missedDiagnosis.diagnoses.map((d: any, i: number) => (
                        <div key={i} className="bg-black/30 rounded-lg p-3 border border-red-500/10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400 font-mono">{d.anomalyType}</span>
                            <Badge variant="outline" className={`text-[10px] ${d.confidence === "high" ? "border-red-500/30 text-red-400" : "border-gray-500/30 text-gray-400"}`}>
                              {d.confidence} confidence
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-300">{d.likelyReason}</p>
                          {d.suggestedFix && (
                            <p className="text-xs text-green-400/70 mt-1">Fix: {d.suggestedFix}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-gray-600">
                Evaluated by {aiEvaluation.model} at {new Date(aiEvaluation.evaluatedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Click &quot;Run AI Evaluation&quot; to get Claude&apos;s assessment of analysis quality, improvement suggestions, and missed anomaly diagnoses.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function QualitySlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-white font-medium">{label}</span>
          <span className="text-xs text-gray-500 ml-2">{description}</span>
        </div>
        <span className="text-sm font-bold text-purple-400 w-6 text-right">{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-600 w-8">Poor</span>
        <Slider
          value={[value]}
          min={1}
          max={5}
          step={1}
          onValueChange={(v) => onChange(v[0])}
          className="flex-1 [&_[data-slot=slider-track]]:bg-gray-700 [&_[data-slot=slider-range]]:bg-purple-500 [&_[data-slot=slider-thumb]]:border-purple-500 [&_[data-slot=slider-thumb]]:bg-gray-900"
        />
        <span className="text-[10px] text-gray-600 w-14 text-right">Excellent</span>
      </div>
    </div>
  )
}
