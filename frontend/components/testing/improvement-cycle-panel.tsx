"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  SkipForward,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepResult {
  step: string
  status: "completed" | "skipped" | "failed"
  details?: string
}

interface IterationResult {
  iteration: number
  f1Score: number
  totalFindings: number
  aiQualityScore: number
  improvementsCount: number
  steps: StepResult[]
}

interface CycleReport {
  iterationsCompleted: number
  iterations: IterationResult[]
  f1Start: number
  f1End: number
  f1Delta: number
  earlyStopReason?: string
}

interface Props {
  workspaceId: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INTEGRATIONS = [
  { key: "Fortnox", label: "Fortnox" },
  { key: "Microsoft365", label: "Microsoft 365" },
  { key: "HubSpot", label: "HubSpot" },
]

const ANOMALY_OPTIONS: Record<string, { key: string; label: string }[]> = {
  Fortnox: [
    { key: "duplicates", label: "Duplicate Invoices" },
    { key: "unusualAmounts", label: "Unusual Amounts" },
    { key: "overdueInvoices", label: "Overdue Invoices" },
    { key: "priceDrift", label: "Price Drift" },
  ],
  Microsoft365: [
    { key: "inactiveUsers", label: "Inactive Users" },
    { key: "orphanedLicenses", label: "Orphaned Licenses" },
    { key: "overProvisioned", label: "Over-Provisioned" },
  ],
  HubSpot: [
    { key: "inactiveUsers", label: "Inactive Users" },
    { key: "unassignedRoles", label: "Unassigned Roles" },
    { key: "pendingInvitations", label: "Pending Invitations" },
  ],
}

function getDefaultAnomalyConfig() {
  const config: Record<string, Record<string, boolean>> = {}
  for (const [integration, options] of Object.entries(ANOMALY_OPTIONS)) {
    const key = integration === "Microsoft365" ? "microsoft365" : integration.toLowerCase()
    config[key] = {}
    for (const opt of options) {
      config[key][opt.key] = true
    }
  }
  return config
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function metricColor(value: number): string {
  if (value >= 0.8) return "text-green-400"
  if (value >= 0.5) return "text-amber-400"
  return "text-red-400"
}

function deltaColor(value: number): string {
  if (value > 0) return "text-green-400"
  if (value < 0) return "text-red-400"
  return "text-gray-400"
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function stepStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      )
    case "skipped":
      return (
        <Badge variant="outline" className="border-gray-500/30 text-gray-400 text-xs gap-1">
          <SkipForward className="w-3 h-3" />
          Skipped
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs gap-1">
          <XCircle className="w-3 h-3" />
          Failed
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-gray-500/30 text-gray-500 text-xs">
          {status}
        </Badge>
      )
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ImprovementCyclePanel({ workspaceId }: Props) {
  // Form state
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(
    INTEGRATIONS.map((i) => i.key)
  )
  const [anomalyConfig, setAnomalyConfig] = useState(getDefaultAnomalyConfig)
  const [showAnomalies, setShowAnomalies] = useState(false)
  const [templateId, setTemplateId] = useState("")
  const [autoApplyTweaks, setAutoApplyTweaks] = useState(false)
  const [maxIterations, setMaxIterations] = useState(1)

  // Run state
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<CycleReport | null>(null)

  // Iteration detail expansion
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set())

  /* ---- Handlers ---- */

  function toggleIntegration(key: string) {
    setSelectedIntegrations((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    )
  }

  function toggleAnomaly(integration: string, anomalyKey: string) {
    const configKey = integration === "Microsoft365" ? "microsoft365" : integration.toLowerCase()
    setAnomalyConfig((prev) => ({
      ...prev,
      [configKey]: {
        ...prev[configKey],
        [anomalyKey]: !prev[configKey][anomalyKey],
      },
    }))
  }

  function toggleIterationExpand(iteration: number) {
    setExpandedIterations((prev) => {
      const next = new Set(prev)
      if (next.has(iteration)) {
        next.delete(iteration)
      } else {
        next.add(iteration)
      }
      return next
    })
  }

  async function handleRun() {
    if (selectedIntegrations.length === 0) return
    setRunning(true)
    setReport(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const body: Record<string, unknown> = {
        integrations: selectedIntegrations,
        anomaly_config: anomalyConfig,
        auto_apply_tweaks: autoApplyTweaks,
        max_iterations: maxIterations,
      }
      if (templateId.trim()) {
        body.template_id = templateId.trim()
      }

      const res = await fetch(
        `${apiBase}/api/test/workspaces/${workspaceId}/improvement-cycle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      )

      if (res.ok) {
        const json = await res.json()
        const raw = json.report || json

        // Map backend shape to frontend CycleReport shape
        const firstScoring = raw.iterations?.[0]?.scoring || raw.iterations?.[0]?.steps?.score
        const lastScoring = raw.iterations?.[raw.iterations.length - 1]?.scoring || raw.iterations?.[raw.iterations.length - 1]?.steps?.score
        const f1Start = raw.overallImprovement?.f1Start ?? firstScoring?.f1Score ?? 0
        const f1End = raw.overallImprovement?.f1End ?? lastScoring?.f1Score ?? 0

        const mappedReport: CycleReport = {
          iterationsCompleted: raw.totalIterations ?? raw.iterations?.length ?? 0,
          f1Start,
          f1End,
          f1Delta: raw.overallImprovement?.f1Delta ?? Math.round((f1End - f1Start) * 10000) / 10000,
          earlyStopReason: raw.iterations?.find((it: any) => it.earlyStop)?.earlyStop,
          iterations: (raw.iterations || []).map((it: any) => {
            // Convert steps object → array
            const stepsObj = it.steps || {}
            const stepsArray: StepResult[] = Object.entries(stepsObj).map(([key, val]: [string, any]) => ({
              step: key,
              status: val.status || "completed",
              details: val.reason || val.error || (val.uploadCount != null ? `${val.uploadCount} uploads` : undefined),
            }))

            return {
              iteration: it.iteration,
              f1Score: it.scoring?.f1Score ?? it.steps?.score?.f1Score ?? 0,
              totalFindings: it.steps?.analyze?.totalFindings ?? 0,
              aiQualityScore: it.steps?.aiEvaluate?.qualityScore ?? 0,
              improvementsCount: it.steps?.aiEvaluate?.improvementCount ?? 0,
              steps: stepsArray,
            }
          }),
        }

        setReport(mappedReport)
        setExpandedIterations(
          new Set(mappedReport.iterations.map((it) => it.iteration))
        )
        toast.success(
          `Improvement cycle completed: ${mappedReport.iterationsCompleted} iteration${mappedReport.iterationsCompleted !== 1 ? "s" : ""}`
        )
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(`Cycle failed: ${err.error || "Unknown error"}`)
      }
    } catch {
      toast.error("Network error during improvement cycle")
    } finally {
      setRunning(false)
    }
  }

  /* ---- Render ---- */

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a4a]">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-cyan-400" />
          Continuous Improvement Cycle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ---- Integration Checkboxes ---- */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Integrations</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {INTEGRATIONS.map(({ key, label }) => {
              const selected = selectedIntegrations.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selected
                      ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                      : "border-[#2a2a4a] bg-white/[0.02] hover:bg-white/5 hover:border-white/20"
                  }`}
                  onClick={() => toggleIntegration(key)}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        selected ? "text-cyan-400" : "text-gray-300"
                      }`}
                    >
                      {label}
                    </span>
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        selected
                          ? "border-cyan-500 bg-cyan-500"
                          : "border-gray-600 bg-transparent"
                      }`}
                    >
                      {selected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {selectedIntegrations.length === 0 && (
            <p className="text-xs text-amber-400/80 mt-2">
              Select at least one integration
            </p>
          )}
        </div>

        {/* ---- Anomaly Config Toggles ---- */}
        {selectedIntegrations.length > 0 && (
          <div>
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
              onClick={() => setShowAnomalies(!showAnomalies)}
            >
              {showAnomalies ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Anomaly Configuration
              {!showAnomalies && (
                <span className="text-xs text-gray-500 ml-1">
                  (all enabled by default)
                </span>
              )}
            </button>

            {showAnomalies && (
              <div className="mt-3 space-y-4">
                {selectedIntegrations.map((integration) => {
                  const options = ANOMALY_OPTIONS[integration]
                  if (!options) return null
                  const configKey =
                    integration === "Microsoft365"
                      ? "microsoft365"
                      : integration.toLowerCase()

                  return (
                    <div key={integration}>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        {integration}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map((opt) => {
                          const enabled =
                            anomalyConfig[configKey]?.[opt.key] !== false
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className={`text-left p-2.5 rounded-lg border transition-colors ${
                                enabled
                                  ? "border-cyan-500/30 bg-cyan-500/5"
                                  : "border-[#2a2a4a] bg-black/20"
                              }`}
                              onClick={() =>
                                toggleAnomaly(integration, opt.key)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-sm font-medium ${
                                    enabled ? "text-white" : "text-gray-500"
                                  }`}
                                >
                                  {opt.label}
                                </span>
                                <div
                                  className={`w-8 h-4 rounded-full transition-colors ${
                                    enabled ? "bg-cyan-500" : "bg-gray-700"
                                  }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${
                                      enabled
                                        ? "translate-x-4"
                                        : "translate-x-0.5"
                                    }`}
                                  />
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- Template ID (optional) ---- */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Template ID{" "}
            <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="e.g. tmpl_abc123"
            className="w-full bg-black/30 border border-[#2a2a4a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
        </div>

        {/* ---- Auto-apply tweaks toggle ---- */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Auto-Apply Tweaks</p>
            <p className="text-xs text-gray-500">
              Automatically apply suggested improvements between iterations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoApplyTweaks(!autoApplyTweaks)}
            className={`w-10 h-5 rounded-full transition-colors ${
              autoApplyTweaks ? "bg-cyan-500" : "bg-gray-700"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${
                autoApplyTweaks ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* ---- Max iterations ---- */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Max Iterations
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={5}
              value={maxIterations}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1 && v <= 5) setMaxIterations(v)
              }}
              className="w-20 bg-black/30 border border-[#2a2a4a] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
            <span className="text-xs text-gray-500">Between 1 and 5</span>
          </div>
        </div>

        {/* ---- Run Button ---- */}
        <Button
          onClick={handleRun}
          disabled={running || selectedIntegrations.length === 0}
          className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {running ? "Running Improvement Cycle..." : "Run Improvement Cycle"}
        </Button>

        {/* ---- Report ---- */}
        {report && (
          <div className="space-y-5">
            {/* Overall Summary */}
            <div className="rounded-lg border border-[#2a2a4a] bg-black/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">
                Cycle Report
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Iterations</p>
                  <p className="text-xl font-bold text-white">
                    {report.iterationsCompleted}
                  </p>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">F1 Start</p>
                  <p className={`text-xl font-bold ${metricColor(report.f1Start)}`}>
                    {formatPercent(report.f1Start)}
                  </p>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">F1 End</p>
                  <p className={`text-xl font-bold ${metricColor(report.f1End)}`}>
                    {formatPercent(report.f1End)}
                  </p>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Delta</p>
                  <div className="flex items-center justify-center gap-1">
                    {report.f1Delta > 0 && (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    )}
                    {report.f1Delta < 0 && (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    {report.f1Delta === 0 && (
                      <Minus className="w-4 h-4 text-gray-400" />
                    )}
                    <p className={`text-xl font-bold ${deltaColor(report.f1Delta)}`}>
                      {report.f1Delta > 0 ? "+" : ""}
                      {formatPercent(report.f1Delta)}
                    </p>
                  </div>
                </div>
              </div>

              {report.earlyStopReason && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <p className="text-sm text-amber-400">
                    <span className="font-medium">Early stop:</span>{" "}
                    {report.earlyStopReason}
                  </p>
                </div>
              )}
            </div>

            {/* Per-Iteration Details */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">
                Iteration Details
              </h3>

              {report.iterations.map((iter) => {
                const expanded = expandedIterations.has(iter.iteration)
                return (
                  <div
                    key={iter.iteration}
                    className="rounded-lg border border-[#2a2a4a] bg-black/30 overflow-hidden"
                  >
                    {/* Iteration header row */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleIterationExpand(iter.iteration)}
                    >
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-white">
                        Iteration {iter.iteration}
                      </span>

                      <div className="flex items-center gap-4 ml-auto text-xs">
                        <span className="text-gray-400">
                          F1:{" "}
                          <span className={`font-medium ${metricColor(iter.f1Score)}`}>
                            {formatPercent(iter.f1Score)}
                          </span>
                        </span>
                        <span className="text-gray-400">
                          Findings:{" "}
                          <span className="text-white font-medium">
                            {iter.totalFindings}
                          </span>
                        </span>
                        <span className="text-gray-400">
                          AI Quality:{" "}
                          <span
                            className={`font-medium ${
                              iter.aiQualityScore >= 4
                                ? "text-green-400"
                                : iter.aiQualityScore >= 2.5
                                  ? "text-amber-400"
                                  : "text-red-400"
                            }`}
                          >
                            {(iter.aiQualityScore ?? 0).toFixed(1)}
                          </span>
                        </span>
                        <span className="text-gray-400">
                          Improvements:{" "}
                          <span className="text-cyan-400 font-medium">
                            {iter.improvementsCount}
                          </span>
                        </span>
                      </div>
                    </button>

                    {/* Steps detail */}
                    {expanded && iter.steps && iter.steps.length > 0 && (
                      <div className="border-t border-[#2a2a4a] px-4 py-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Steps
                        </p>
                        <div className="space-y-2">
                          {iter.steps.map((step, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-1.5 px-3 rounded bg-[#1a1a2e] border border-[#2a2a4a]"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-300">
                                  {step.step}
                                </span>
                                {step.details && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {step.details}
                                  </p>
                                )}
                              </div>
                              <div className="ml-3 shrink-0">
                                {stepStatusBadge(step.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
