"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import {
  AlertTriangle,
  TrendingDown,
  FileBarChart,
  Clock,
  DollarSign,
} from "lucide-react"

const AnalysisScoringPanel = dynamic(
  () => import("@/components/testing/analysis-scoring-panel").then((m) => m.AnalysisScoringPanel),
  { loading: () => <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

const AgentAuditPanel = dynamic(
  () => import("@/components/testing/agent-audit-panel").then((m) => m.AgentAuditPanel),
  { loading: () => <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

interface AnalysisResult {
  id: string
  workspace_id: string
  analysis_type: string
  template_version: number | null
  integration_labels: string[]
  status: string
  analysis_result: any
  ai_summary: string | null
  scoring: any
  duration_ms: number | null
  created_at: string
  completed_at: string | null
}

export function AnalysisResultViewer({
  analysis,
  onScoringUpdate,
}: {
  analysis: AnalysisResult
  onScoringUpdate?: (newScoring: any) => void
}) {
  const result = analysis.analysis_result
  const summary = result?.overallSummary

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileBarChart className="w-6 h-6 text-cyan-400" />
              <div>
                <h2 className="text-lg font-semibold text-white capitalize">
                  {analysis.analysis_type.replace("_", " ")} Analysis
                </h2>
                <p className="text-sm text-gray-400">
                  {analysis.integration_labels.join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  analysis.status === "completed"
                    ? "border-green-500/30 text-green-400"
                    : "border-red-500/30 text-red-400"
                }
              >
                {analysis.status}
              </Badge>
              {analysis.duration_ms && (
                <Badge variant="outline" className="border-white/20 text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {analysis.duration_ms}ms
                </Badge>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-white/5 text-center">
                <p className="text-xs text-gray-500">Findings</p>
                <p className="text-2xl font-bold text-white">{summary.totalFindings || 0}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5 text-center">
                <p className="text-xs text-gray-500">Savings</p>
                <p className="text-2xl font-bold text-green-400">
                  ${Math.round(summary.totalPotentialSavings || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-red-500/10 text-center">
                <p className="text-xs text-gray-500">High</p>
                <p className="text-2xl font-bold text-red-400">{summary.highSeverity || 0}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-yellow-500/10 text-center">
                <p className="text-xs text-gray-500">Medium</p>
                <p className="text-2xl font-bold text-yellow-400">{summary.mediumSeverity || 0}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-blue-500/10 text-center">
                <p className="text-xs text-gray-500">Low</p>
                <p className="text-2xl font-bold text-blue-400">{summary.lowSeverity || 0}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Panel */}
      {analysis.status === "completed" && (
        <AnalysisScoringPanel
          analysisId={analysis.id}
          scoring={analysis.scoring}
          status={analysis.status}
          onScoringUpdate={(newScoring) => onScoringUpdate?.(newScoring)}
        />
      )}

      {/* Agent Audit Panel */}
      {analysis.status === "completed" && (
        <AgentAuditPanel
          analysisId={analysis.id}
          audit={analysis.scoring?.audit || null}
        />
      )}

      {/* Per-Platform Results */}
      {result?.fortnox && (
        <PlatformResultCard
          title="Fortnox"
          result={result.fortnox}
          findingsKey="supplierInvoiceAnalysis"
        />
      )}

      {result?.microsoft365 && (
        <PlatformResultCard
          title="Microsoft 365"
          result={result.microsoft365}
          findingsKey="licenseAnalysis"
        />
      )}

      {result?.hubspot && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">HubSpot Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result.hubspot.findings?.length > 0 ? (
              <div className="space-y-2">
                {result.hubspot.findings.map((f: any, i: number) => (
                  <FindingRow key={i} finding={f} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No findings.</p>
            )}
          </CardContent>
        </Card>
      )}

      {result?.crossPlatform && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Cross-Platform Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-gray-300 bg-black/30 rounded p-3 overflow-auto max-h-96 font-mono">
              {JSON.stringify(result.crossPlatform, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON Fallback */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Raw Result JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-gray-400 bg-black/30 rounded p-3 overflow-auto max-h-64 font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function PlatformResultCard({
  title,
  result,
  findingsKey,
}: {
  title: string
  result: any
  findingsKey: string
}) {
  const findings = result?.[findingsKey]?.findings || []

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">{title} Results</CardTitle>
      </CardHeader>
      <CardContent>
        {findings.length > 0 ? (
          <div className="space-y-2">
            {findings.map((f: any, i: number) => (
              <FindingRow key={i} finding={f} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No findings.</p>
        )}
      </CardContent>
    </Card>
  )
}

function FindingRow({ finding }: { finding: any }) {
  const severityColor =
    finding.severity === "high"
      ? "border-red-500/30 text-red-400"
      : finding.severity === "medium"
      ? "border-yellow-500/30 text-yellow-400"
      : "border-blue-500/30 text-blue-400"

  return (
    <div className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-white/5">
      <AlertTriangle
        className={`w-4 h-4 mt-0.5 ${
          finding.severity === "high"
            ? "text-red-400"
            : finding.severity === "medium"
            ? "text-yellow-400"
            : "text-blue-400"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm text-white font-medium">{finding.title}</p>
          <Badge variant="outline" className={`${severityColor} text-xs`}>
            {finding.severity}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-gray-400 text-xs">
            {finding.type}
          </Badge>
        </div>
        <p className="text-sm text-gray-400">{finding.description}</p>
        {finding.potentialSavings > 0 && (
          <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            ${Math.round(finding.potentialSavings).toLocaleString()} potential savings
          </p>
        )}
      </div>
    </div>
  )
}
