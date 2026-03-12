"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, CheckCircle, ChevronDown, ChevronRight, Zap, Settings2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  workspaceId: string
  scenarioProfile: string
  onGenerateComplete: () => void
}

const INTEGRATIONS = [
  { key: "Fortnox", label: "Fortnox", description: "Invoices, expenses, suppliers" },
  { key: "Microsoft365", label: "Microsoft 365", description: "Licenses, users, usage" },
  { key: "HubSpot", label: "HubSpot", description: "Users, accounts, roles" },
]

const ANOMALY_OPTIONS: Record<string, { key: string; label: string }[]> = {
  Fortnox: [
    { key: "duplicates", label: "Duplicate invoices" },
    { key: "unusualAmounts", label: "Unusual amounts" },
    { key: "overdueInvoices", label: "Overdue invoices" },
    { key: "priceDrift", label: "Price drift" },
  ],
  Microsoft365: [
    { key: "inactiveUsers", label: "Inactive users" },
    { key: "orphanedLicenses", label: "Orphaned licenses" },
    { key: "overProvisioned", label: "Over-provisioned" },
  ],
  HubSpot: [
    { key: "inactiveUsers", label: "Inactive users" },
    { key: "unassignedRoles", label: "Unassigned roles" },
    { key: "pendingInvitations", label: "Pending invitations" },
  ],
}

const STRESS_SCENARIOS = [
  { key: "extreme_values", label: "Extreme values" },
  { key: "large_datasets", label: "Large datasets (1k-5k rows)" },
  { key: "partial_data", label: "Missing fields (40%)" },
  { key: "empty_arrays", label: "Empty arrays" },
  { key: "type_mismatches", label: "Type mismatches" },
  { key: "duplicate_heavy", label: "50%+ duplicates" },
  { key: "boundary_dates", label: "Boundary dates" },
]

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

export function MockDataGenerator({ workspaceId, scenarioProfile, onGenerateComplete }: Props) {
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([])
  const [anomalyConfig, setAnomalyConfig] = useState(getDefaultAnomalyConfig)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [stressMode, setStressMode] = useState(false)
  const [selectedStressScenarios, setSelectedStressScenarios] = useState<string[]>([])

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

  function toggleStressScenario(key: string) {
    setSelectedStressScenarios((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  async function handleGenerate() {
    if (selectedIntegrations.length === 0) return
    if (stressMode && selectedStressScenarios.length === 0) {
      toast.error("Select at least one stress scenario")
      return
    }
    setGenerating(true)
    setResult(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const endpoint = stressMode
        ? `${apiBase}/api/test/workspaces/${workspaceId}/stress-test`
        : `${apiBase}/api/test/workspaces/${workspaceId}/generate`

      const body = stressMode
        ? { integrations: selectedIntegrations, scenarios: selectedStressScenarios }
        : { integrations: selectedIntegrations, anomaly_config: anomalyConfig }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
        toast.success(`Generated ${data.uploads.length} ${stressMode ? "stress test" : "mock data"} uploads`)
        onGenerateComplete()
      } else {
        const err = await res.json()
        toast.error(`Generation failed: ${err.error}`)
      }
    } catch {
      toast.error("Network error during generation")
    } finally {
      setGenerating(false)
    }
  }

  const scenarioLabel =
    scenarioProfile === "startup_60" ? "60-Person Startup" :
    scenarioProfile === "agency_25" ? "25-Person Agency" :
    scenarioProfile === "scaleup_200" ? "200-Person Scale-up" :
    "Custom"

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Generate Mock Data
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
            {scenarioLabel}
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Select integrations below, then hit generate. Anomalies are injected automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Integration Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INTEGRATIONS.map(({ key, label, description }) => {
            const selected = selectedIntegrations.includes(key)
            return (
              <button
                key={key}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selected
                    ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20"
                }`}
                onClick={() => toggleIntegration(key)}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-medium ${selected ? "text-cyan-400" : "text-gray-300"}`}>
                    {label}
                  </span>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selected ? "border-cyan-500 bg-cyan-500" : "border-gray-600 bg-transparent"
                  }`}>
                    {selected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{description}</p>
              </button>
            )
          })}
        </div>

        {/* Advanced Options Toggle */}
        {selectedIntegrations.length > 0 && (
          <button
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Advanced options
            {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Advanced Panel */}
        {selectedIntegrations.length > 0 && showAdvanced && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !stressMode
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
                onClick={() => setStressMode(false)}
              >
                <Sparkles className="w-3 h-3" />
                Normal
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  stressMode
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
                onClick={() => setStressMode(true)}
              >
                <Zap className="w-3 h-3" />
                Stress Test
              </button>
            </div>

            {/* Normal mode: Anomaly toggles */}
            {!stressMode && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Anomalies to inject (all on by default):</p>
                {selectedIntegrations.map((integration) => {
                  const options = ANOMALY_OPTIONS[integration]
                  if (!options) return null
                  const configKey = integration === "Microsoft365" ? "microsoft365" : integration.toLowerCase()
                  return (
                    <div key={integration} className="space-y-1.5">
                      <p className="text-xs text-gray-500 font-medium">{integration}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((opt) => {
                          const enabled = anomalyConfig[configKey]?.[opt.key] !== false
                          return (
                            <button
                              key={opt.key}
                              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                                enabled
                                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                                  : "bg-white/5 text-gray-500 border border-white/5"
                              }`}
                              onClick={() => toggleAnomaly(integration, opt.key)}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Stress mode: Scenario selection */}
            {stressMode && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Select stress scenarios:</p>
                <div className="flex flex-wrap gap-1.5">
                  {STRESS_SCENARIOS.map(({ key, label }) => {
                    const selected = selectedStressScenarios.includes(key)
                    return (
                      <button
                        key={key}
                        className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                          selected
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10"
                        }`}
                        onClick={() => toggleStressScenario(key)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {selectedStressScenarios.length === 0 && (
                  <p className="text-xs text-amber-400/80">Pick at least one scenario</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || selectedIntegrations.length === 0 || (stressMode && selectedStressScenarios.length === 0)}
          className={`${stressMode && showAdvanced ? "bg-amber-600 hover:bg-amber-700" : "bg-cyan-600 hover:bg-cyan-700"} text-white disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : stressMode && showAdvanced ? (
            <Zap className="w-4 h-4 mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {generating
            ? "Generating..."
            : stressMode && showAdvanced
              ? `Run Stress Test (${selectedStressScenarios.length})`
              : `Generate${selectedIntegrations.length > 0 ? ` (${selectedIntegrations.length})` : ""}`
          }
        </Button>

        {/* Result Summary */}
        {result && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium text-sm">{result.message}</span>
            </div>
            <div className="space-y-1">
              {result.uploads.map((upload: any) => (
                <div key={upload.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {upload.integration_label} / {upload.data_type}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      upload.validation_status === "valid"
                        ? "border-green-500/30 text-green-400"
                        : "border-yellow-500/30 text-yellow-400"
                    }
                  >
                    {upload.validation_status}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ready — switch to <span className="text-cyan-400">Run Analysis</span> to analyze.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
