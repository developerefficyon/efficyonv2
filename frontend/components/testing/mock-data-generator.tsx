"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, CheckCircle, Info, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"

interface Props {
  workspaceId: string
  scenarioProfile: string
  onGenerateComplete: () => void
}

const INTEGRATIONS = [
  { key: "Fortnox", label: "Fortnox", description: "Supplier invoices, customer invoices, expenses" },
  { key: "Microsoft365", label: "Microsoft 365", description: "Licenses, users, usage activity" },
  { key: "HubSpot", label: "HubSpot", description: "Users, account info, roles" },
]

const ANOMALY_OPTIONS: Record<string, { key: string; label: string; description: string }[]> = {
  Fortnox: [
    { key: "duplicates", label: "Duplicate Invoices", description: "Same supplier + amount within 30 days" },
    { key: "unusualAmounts", label: "Unusual Amounts", description: "Invoice spikes 3-5x normal" },
    { key: "overdueInvoices", label: "Overdue Invoices", description: "Unpaid past due date" },
    { key: "priceDrift", label: "Price Drift", description: "25-50% gradual increase over 12 months" },
  ],
  Microsoft365: [
    { key: "inactiveUsers", label: "Inactive Users", description: "No sign-in for 45+ days" },
    { key: "orphanedLicenses", label: "Orphaned Licenses", description: "Licenses on disabled accounts" },
    { key: "overProvisioned", label: "Over-Provisioned", description: "E5 licenses for basic users" },
  ],
  HubSpot: [
    { key: "inactiveUsers", label: "Inactive Users", description: "No login for 45+ days" },
    { key: "unassignedRoles", label: "Unassigned Roles", description: "Users without role assignments" },
    { key: "pendingInvitations", label: "Pending Invitations", description: "Users who haven't accepted" },
  ],
}

// Initialize all anomalies as ON by default
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
  const [showAnomalies, setShowAnomalies] = useState(false)
  const [showGuide, setShowGuide] = useState(true)

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

  async function handleGenerate() {
    if (selectedIntegrations.length === 0) return
    setGenerating(true)
    setResult(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces/${workspaceId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          integrations: selectedIntegrations,
          anomaly_config: anomalyConfig,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
        toast.success(`Generated ${data.uploads.length} mock data uploads`)
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
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Generate Mock Data
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
            {scenarioLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Guide Section */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-blue-500/10 transition-colors"
            onClick={() => setShowGuide(!showGuide)}
          >
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-blue-300">How to use the Mock Data Generator</span>
            {showGuide ? (
              <ChevronDown className="w-4 h-4 text-blue-400 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
            )}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex gap-3 items-start">
                <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-sm text-gray-300">
                  <span className="text-white font-medium">Select integrations</span> — Choose which platforms to generate test data for. Each integration produces realistic synthetic datasets matching the workspace&apos;s scenario profile.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-sm text-gray-300">
                  <span className="text-white font-medium">Configure anomalies</span> (optional) — Expand &quot;Anomaly Injection&quot; to toggle specific issues the analysis engine should detect. All anomalies are enabled by default.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-sm text-gray-300">
                  <span className="text-white font-medium">Generate</span> — Click the button to create mock uploads. Once generated, switch to the <span className="text-cyan-400">Run Analysis</span> tab to analyze the data and verify findings in <span className="text-cyan-400">Results</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Integration Selection */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Select Integrations</label>
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
                  <div className="flex items-center justify-between mb-1">
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
          {selectedIntegrations.length === 0 && (
            <p className="text-xs text-amber-400/80 mt-2">Select at least one integration to generate data</p>
          )}
        </div>

        {/* Anomaly Toggles — only show when integrations are selected */}
        {selectedIntegrations.length > 0 && (
          <div>
            <button
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
              onClick={() => setShowAnomalies(!showAnomalies)}
            >
              {showAnomalies ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Anomaly Injection
              {!showAnomalies && (
                <span className="text-xs text-gray-500 ml-1">(all enabled by default)</span>
              )}
            </button>

            {showAnomalies && (
              <div className="mt-3 space-y-4">
                {selectedIntegrations.map((integration) => {
                  const options = ANOMALY_OPTIONS[integration]
                  if (!options) return null
                  const configKey = integration === "Microsoft365" ? "microsoft365" : integration.toLowerCase()

                  return (
                    <div key={integration}>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{integration}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map((opt) => {
                          const enabled = anomalyConfig[configKey]?.[opt.key] !== false
                          return (
                            <button
                              key={opt.key}
                              className={`text-left p-2.5 rounded-lg border transition-colors ${
                                enabled
                                  ? "border-cyan-500/30 bg-cyan-500/5"
                                  : "border-white/5 bg-black/20"
                              }`}
                              onClick={() => toggleAnomaly(integration, opt.key)}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${enabled ? "text-white" : "text-gray-500"}`}>
                                  {opt.label}
                                </span>
                                <div className={`w-8 h-4 rounded-full transition-colors ${
                                  enabled ? "bg-cyan-500" : "bg-gray-700"
                                }`}>
                                  <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${
                                    enabled ? "translate-x-4" : "translate-x-0.5"
                                  }`} />
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
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

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || selectedIntegrations.length === 0}
          className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {generating ? "Generating..." : `Generate Mock Data${selectedIntegrations.length > 0 ? ` (${selectedIntegrations.length} integration${selectedIntegrations.length > 1 ? "s" : ""})` : ""}`}
        </Button>

        {/* Result Summary */}
        {result && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">{result.message}</span>
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
              Data is ready. Go to <span className="text-cyan-400">Run Analysis</span> tab to analyze, then check <span className="text-cyan-400">Results</span> for findings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
