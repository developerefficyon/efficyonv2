"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"

interface AuditIssue {
  findingTitle: string
  classification: "correct" | "misclassified" | "hallucinated" | "logic_gap"
  explanation: string
  affectedRows: number
  suggestedCorrection: string | null
}

interface AuditReport {
  totalFindingsAudited: number
  correct: number
  misclassified: number
  hallucinated: number
  logicGaps: number
  accuracy: number
  issues: AuditIssue[]
  summary: string
  recommendation: string
  generatedAt?: string
  parseError?: boolean
}

interface Props {
  analysisId: string
  audit?: AuditReport | null
  onAuditComplete?: (audit: AuditReport) => void
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle; bg: string }> = {
  correct: { label: "Correct", color: "text-green-400", icon: CheckCircle, bg: "bg-green-500/10 border-green-500/30" },
  misclassified: { label: "Misclassified", color: "text-yellow-400", icon: AlertTriangle, bg: "bg-yellow-500/10 border-yellow-500/30" },
  hallucinated: { label: "Hallucinated", color: "text-red-400", icon: XCircle, bg: "bg-red-500/10 border-red-500/30" },
  logic_gap: { label: "Logic Gap", color: "text-orange-400", icon: Info, bg: "bg-orange-500/10 border-orange-500/30" },
}

export function AgentAuditPanel({ analysisId, audit: initialAudit, onAuditComplete }: Props) {
  const [audit, setAudit] = useState<AuditReport | null>(initialAudit || null)
  const [running, setRunning] = useState(false)
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())

  const handleRunAudit = async () => {
    setRunning(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) throw new Error("Authentication required")

      const res = await fetch(`${apiBase}/api/test/analyses/${analysisId}/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Audit failed")
      }

      const data = await res.json()
      const auditData = data.audit
      setAudit(auditData)
      onAuditComplete?.(auditData)
      const acc = typeof auditData?.accuracy === "number" ? (auditData.accuracy * 100).toFixed(0) : "?"
      toast.success("Agent audit complete", {
        description: `Accuracy: ${acc}% — ${auditData?.totalFindingsAudited ?? 0} findings audited`,
      })
    } catch (err: any) {
      toast.error("Audit failed", { description: err.message })
    } finally {
      setRunning(false)
    }
  }

  const toggleIssue = (idx: number) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const accuracyColor = (a: number) => {
    if (a >= 0.8) return "text-green-400"
    if (a >= 0.5) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Agent Audit
          </CardTitle>
          <Button
            size="sm"
            onClick={handleRunAudit}
            disabled={running}
            className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
          >
            {running ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Running Audit...
              </>
            ) : audit ? (
              "Re-run Audit"
            ) : (
              "Run Agent Audit"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!audit && !running && (
          <p className="text-xs text-gray-500 text-center py-4">
            Run an AI-powered audit to classify each finding as correct, misclassified, hallucinated, or a logic gap.
          </p>
        )}

        {running && !audit && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <p className="text-sm text-gray-400">
              AI agent is auditing the analysis findings...
            </p>
          </div>
        )}

        {audit && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Accuracy</p>
                <p className={`text-lg font-bold mt-1 ${accuracyColor(audit.accuracy)}`}>
                  {(audit.accuracy * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Correct</p>
                <p className="text-lg font-bold mt-1 text-green-400">{audit.correct}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Misclassified</p>
                <p className="text-lg font-bold mt-1 text-yellow-400">{audit.misclassified}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Hallucinated</p>
                <p className="text-lg font-bold mt-1 text-red-400">{audit.hallucinated}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Logic Gaps</p>
                <p className="text-lg font-bold mt-1 text-orange-400">{audit.logicGaps}</p>
              </div>
            </div>

            {/* Executive summary */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase mb-1.5">Summary</p>
              <p className="text-sm text-gray-200 leading-relaxed">
                {typeof audit.summary === "string" ? audit.summary : JSON.stringify(audit.summary)}
              </p>
            </div>

            {/* Recommendation */}
            {audit.recommendation && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <p className="text-[10px] text-purple-300 uppercase mb-1.5">Recommendation</p>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {typeof audit.recommendation === "string" ? audit.recommendation : JSON.stringify(audit.recommendation)}
                </p>
              </div>
            )}

            {/* Issues table */}
            {audit.issues && audit.issues.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase mb-2">
                  Finding Classifications ({audit.issues.length})
                </p>
                <div className="space-y-1.5">
                  {audit.issues.map((issue, idx) => {
                    const config = CLASSIFICATION_CONFIG[issue.classification] || CLASSIFICATION_CONFIG.correct
                    const Icon = config.icon
                    const isExpanded = expandedIssues.has(idx)

                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg transition-colors ${config.bg}`}
                      >
                        <button
                          onClick={() => toggleIssue(idx)}
                          className="w-full flex items-center gap-2 p-2.5 text-left"
                        >
                          <ChevronRight
                            className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                          <Icon className={`w-3.5 h-3.5 ${config.color} shrink-0`} />
                          <span className="text-xs text-white flex-1 truncate">
                            {issue.findingTitle}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${config.color} border-current shrink-0`}
                          >
                            {config.label}
                          </Badge>
                          {issue.affectedRows > 0 && (
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {issue.affectedRows} rows
                            </span>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase mb-0.5">Explanation</p>
                              <p className="text-xs text-gray-300 leading-relaxed">
                                {issue.explanation}
                              </p>
                            </div>
                            {issue.suggestedCorrection && (
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase mb-0.5">
                                  Suggested Correction
                                </p>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                  {issue.suggestedCorrection}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timestamp */}
            {audit.generatedAt && (
              <p className="text-[10px] text-gray-600 text-right">
                Generated: {new Date(audit.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
