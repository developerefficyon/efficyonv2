"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  ArrowLeft,
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const DragDropUploadZone = dynamic(
  () => import("@/components/testing/drag-drop-upload-zone").then((m) => m.DragDropUploadZone),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

interface Workspace {
  id: string
  name: string
  description: string | null
  scenario_profile: string
  status: string
  metadata: Record<string, any>
}

interface UploadRecord {
  id: string
  filename: string
  integration_label: string
  data_type: string
  validation_status: string
  validation_report: any
  created_at: string
}

interface AnalysisRecord {
  id: string
  analysis_type: string
  integration_labels: string[]
  status: string
  scoring: any
  analysis_result: any
  duration_ms: number | null
  created_at: string
}

export default function WorkspaceDetailPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [selectedUploadIds, setSelectedUploadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  async function fetchWorkspace() {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setWorkspace(data.workspace)
        setUploads(data.uploads)
        setAnalyses(data.analyses)
        setSelectedUploadIds(new Set(data.uploads.map((u: UploadRecord) => u.id)))
      }
    } catch (err) {
      console.error("Failed to fetch workspace:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === "admin" && workspaceId) {
      fetchWorkspace()
    }
  }, [user, workspaceId])

  async function runAnalysis() {
    const selected = uploads.filter((u) => selectedUploadIds.has(u.id))
    if (selected.length === 0) return
    setAnalyzing(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const integrations = [...new Set(selected.map((u) => u.integration_label))]
      const effectiveType = integrations.length >= 2 ? "cross_platform" : "standard"

      const res = await fetch(`${apiBase}/api/test/workspaces/${workspaceId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysis_type: effectiveType,
          integration_labels: integrations,
          upload_ids: selected.map((u) => u.id),
        }),
      })

      if (res.ok) {
        await fetchWorkspace()
        toast.success("Analysis complete!")
      } else {
        const err = await res.json()
        toast.error(`Analysis failed: ${err.error}`)
      }
    } catch (err) {
      console.error("Analysis failed:", err)
      toast.error("Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  async function viewAnalysis(analysisId: string) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/analyses/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedAnalysis(data.analysis)
      }
    } catch (err) {
      console.error("Failed to fetch analysis:", err)
    }
  }

  async function deleteAnalysis(analysisId: string) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/analyses/${analysisId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setAnalyses((prev) => prev.filter((a) => a.id !== analysisId))
        if (selectedAnalysis?.id === analysisId) setSelectedAnalysis(null)
        toast.success("Analysis deleted")
      } else {
        const err = await res.json()
        toast.error(`Failed to delete: ${err.error}`)
      }
    } catch (err) {
      toast.error("Failed to delete analysis")
    }
  }

  async function reclassifyUpload(uploadId: string, integration_label: string, data_type: string) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/uploads/${uploadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ integration_label, data_type }),
      })

      if (res.ok) {
        const data = await res.json()
        setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, ...data.upload } : u)))
        toast.success(`Reclassified as ${integration_label} / ${data_type}`)
      } else {
        const err = await res.json()
        toast.error(`Failed: ${err.error}`)
      }
    } catch (err) {
      toast.error("Failed to reclassify")
    }
  }

  async function deleteUpload(uploadId: string) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/uploads/${uploadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId))
        setSelectedUploadIds((prev) => { const next = new Set(prev); next.delete(uploadId); return next })
        toast.success("Upload deleted")
      } else {
        const err = await res.json()
        toast.error(`Failed to delete: ${err.error}`)
      }
    } catch (err) {
      toast.error("Failed to delete upload")
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!workspace) {
    return <div className="text-center py-20 text-gray-400">Workspace not found.</div>
  }

  // Collect all findings from the selected analysis
  const findings = selectedAnalysis ? extractFindings(selectedAnalysis.analysis_result) : []
  const summary = selectedAnalysis?.analysis_result?.overallSummary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/testing/workspaces">
          <Button size="sm" className="bg-transparent text-gray-400 hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-gray-400">{workspace.description}</p>
          )}
        </div>
      </div>

      {/* Step 1: Upload */}
      <DragDropUploadZone
        workspaceId={workspaceId}
        onUploadComplete={() => fetchWorkspace()}
      />

      {/* Uploaded files list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {selectedUploadIds.size} of {uploads.length} file{uploads.length !== 1 ? "s" : ""} selected
            </p>
            <button
              onClick={() => {
                if (selectedUploadIds.size === uploads.length) {
                  setSelectedUploadIds(new Set())
                } else {
                  setSelectedUploadIds(new Set(uploads.map((u) => u.id)))
                }
              }}
              className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
            >
              {selectedUploadIds.size === uploads.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          {uploads.map((upload) => (
            <div
              key={upload.id}
              onClick={() => {
                setSelectedUploadIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(upload.id)) next.delete(upload.id)
                  else next.add(upload.id)
                  return next
                })
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selectedUploadIds.has(upload.id)
                  ? "bg-cyan-500/10 border-cyan-500/20"
                  : "bg-white/5 border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedUploadIds.has(upload.id)}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 shrink-0 cursor-pointer accent-cyan-500"
                />
                {upload.validation_status === "valid" ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                ) : upload.validation_status === "partial" ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{upload.filename}</p>
                  <UploadClassificationSelect
                    uploadId={upload.id}
                    value={`${upload.integration_label}::${upload.data_type}`}
                    onReclassify={reclassifyUpload}
                  />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteUpload(upload.id) }}
                className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Step 2: Analyze */}
          <Button
            onClick={runAnalysis}
            disabled={analyzing || selectedUploadIds.size === 0}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white mt-2"
            size="lg"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {analyzing ? "Analyzing..." : `Analyze ${selectedUploadIds.size} file${selectedUploadIds.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}

      {/* Step 3: Results */}
      {analyses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            {selectedAnalysis && (
              <button
                onClick={() => deleteAnalysis(selectedAnalysis.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>

          {/* Analysis selector (if multiple) */}
          {analyses.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {analyses.map((a, i) => (
                <div key={a.id} className="flex items-center gap-1">
                  <button
                    onClick={() => viewAnalysis(a.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                      selectedAnalysis?.id === a.id
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                        : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Run {analyses.length - i} &middot; {new Date(a.created_at).toLocaleString()}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id) }}
                    className="p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Auto-load latest if none selected */}
          {!selectedAnalysis && analyses.length > 0 && (
            <AutoLoadAnalysis analysisId={analyses[0].id} onLoad={viewAnalysis} />
          )}

          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Findings" value={summary.totalFindings || 0} />
              <StatCard
                label="Potential Savings"
                value={`${Math.round(summary.totalPotentialSavings || 0).toLocaleString()} SEK`}
                color="text-green-400"
              />
              <StatCard label="High Severity" value={summary.highSeverity || 0} color="text-red-400" />
              <StatCard label="Medium" value={summary.mediumSeverity || 0} color="text-yellow-400" />
            </div>
          )}

          {/* Findings list */}
          {findings.length > 0 && (
            <div className="space-y-2">
              {findings.map((f, i) => (
                <FindingCard key={i} finding={f} />
              ))}
            </div>
          )}

          {findings.length === 0 && selectedAnalysis && !selectedAnalysis.analysis_result?.aiAnalysis && (
            <p className="text-gray-400 text-sm py-4 text-center">No findings detected.</p>
          )}

          {/* AI Analysis */}
          {selectedAnalysis?.analysis_result?.aiAnalysis && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-[10px] text-purple-400 font-bold">AI</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">AI Analysis</h3>
                </div>
                <div className="ai-analysis-content text-sm text-gray-300 leading-relaxed space-y-3">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-base font-bold text-white mt-4 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-semibold text-white mt-4 mb-1.5">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-medium text-white mt-3 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="my-1.5">{children}</p>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-300">{children}</li>,
                      hr: () => <hr className="border-white/10 my-3" />,
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full text-xs border-collapse border border-white/10">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                      th: ({ children }) => <th className="text-left text-gray-400 font-medium px-3 py-2 border border-white/10 whitespace-nowrap">{children}</th>,
                      td: ({ children }) => <td className="text-gray-300 px-3 py-1.5 border border-white/10">{children}</td>,
                      tr: ({ children }) => <tr className="border-b border-white/5">{children}</tr>,
                    }}
                  >
                    {selectedAnalysis.analysis_result.aiAnalysis}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw JSON toggle */}
          {selectedAnalysis && (
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showRawJson ? "Hide" : "Show"} raw JSON
            </button>
          )}
          {showRawJson && selectedAnalysis && (
            <pre className="text-xs text-gray-400 bg-black/30 rounded-lg p-3 overflow-auto max-h-64 font-mono border border-white/5">
              {JSON.stringify(selectedAnalysis.analysis_result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

/** Auto-loads the latest analysis on mount */
const CLASSIFICATION_OPTIONS = [
  { group: "Fortnox", items: [
    { value: "Fortnox::supplier_invoices", label: "Supplier Invoices" },
    { value: "Fortnox::invoices", label: "Invoices" },
    { value: "Fortnox::licenses", label: "Licenses" },
    { value: "Fortnox::users", label: "Users" },
    { value: "Fortnox::usage_reports", label: "Usage Reports" },
    { value: "Fortnox::accounts", label: "Accounts" },
    { value: "Fortnox::customers", label: "Customers" },
    { value: "Fortnox::expenses", label: "Expenses" },
    { value: "Fortnox::articles", label: "Articles" },
    { value: "Fortnox::profit_loss", label: "Profit & Loss" },
  ]},
  { group: "Microsoft 365", items: [
    { value: "Microsoft365::licenses", label: "Licenses" },
    { value: "Microsoft365::users", label: "Users" },
    { value: "Microsoft365::usage_reports", label: "Usage Reports" },
  ]},
  { group: "HubSpot", items: [
    { value: "HubSpot::hubspot_users", label: "Users" },
    { value: "HubSpot::hubspot_account", label: "Account" },
  ]},
]

function UploadClassificationSelect({
  uploadId, value, onReclassify,
}: {
  uploadId: string
  value: string
  onReclassify: (id: string, integration: string, dataType: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = CLASSIFICATION_OPTIONS.flatMap((g) => g.items).find((i) => i.value === value)
  const [integ, dt] = value.split("::")
  const displayLabel = current ? `${integ} · ${current.label}` : value.replace("::", " · ")

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
      >
        {displayLabel}
        <Pencil className="w-2.5 h-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-1 min-w-[200px] max-h-64 overflow-y-auto">
            {CLASSIFICATION_OPTIONS.map((group) => (
              <div key={group.group}>
                <p className="px-3 py-1 text-[10px] text-gray-500 uppercase font-medium">{group.group}</p>
                {group.items.map((item) => (
                  <button
                    key={item.value}
                    onClick={(e) => {
                      e.stopPropagation()
                      const [i, d] = item.value.split("::")
                      onReclassify(uploadId, i, d)
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      item.value === value
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AutoLoadAnalysis({ analysisId, onLoad }: { analysisId: string; onLoad: (id: string) => void }) {
  useEffect(() => {
    onLoad(analysisId)
  }, [analysisId])
  return null
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || "text-white"}`}>{value}</p>
    </div>
  )
}

function FindingCard({ finding }: { finding: any }) {
  const severityStyles = {
    high: { border: "border-red-500/20", icon: "text-red-400", badge: "border-red-500/30 text-red-400" },
    medium: { border: "border-yellow-500/20", icon: "text-yellow-400", badge: "border-yellow-500/30 text-yellow-400" },
    low: { border: "border-blue-500/20", icon: "text-blue-400", badge: "border-blue-500/30 text-blue-400" },
  }
  const s = severityStyles[finding.severity as keyof typeof severityStyles] || severityStyles.low

  return (
    <div className={`flex items-start gap-3 p-3 bg-white/5 rounded-lg border ${s.border}`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${s.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm text-white font-medium">{finding.title}</p>
          <Badge variant="outline" className={`text-[10px] ${s.badge}`}>
            {finding.severity}
          </Badge>
          {finding.type && (
            <Badge variant="outline" className="text-[10px] border-white/10 text-gray-500">
              {finding.type}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-400">{finding.description}</p>
        {finding.potentialSavings > 0 && (
          <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {Math.round(finding.potentialSavings).toLocaleString()} SEK potential savings
          </p>
        )}
      </div>
    </div>
  )
}

/** Extract all findings from analysis result across all platforms */
function extractFindings(result: any): any[] {
  if (!result) return []
  const findings: any[] = []

  // Fortnox findings
  if (result.fortnox?.supplierInvoiceAnalysis?.findings) {
    findings.push(...result.fortnox.supplierInvoiceAnalysis.findings.map((f: any) => ({ ...f, platform: "Fortnox" })))
  }
  if (result.fortnox?.customerInvoiceAnalysis?.findings) {
    findings.push(...result.fortnox.customerInvoiceAnalysis.findings.map((f: any) => ({ ...f, platform: "Fortnox" })))
  }

  // SaaS analysis findings (license utilization, usage, price drift)
  if (result.saasAnalysis?.findings) {
    findings.push(...result.saasAnalysis.findings.map((f: any) => ({ ...f, platform: f.platform || "SaaS" })))
  }

  // M365 findings
  if (result.microsoft365?.licenseAnalysis?.findings) {
    findings.push(...result.microsoft365.licenseAnalysis.findings.map((f: any) => ({ ...f, platform: "Microsoft 365" })))
  }

  // HubSpot findings
  if (result.hubspot?.findings) {
    findings.push(...result.hubspot.findings.map((f: any) => ({ ...f, platform: "HubSpot" })))
  }

  // Cross-platform findings
  if (result.crossPlatform?.findings) {
    findings.push(...result.crossPlatform.findings.map((f: any) => ({ ...f, platform: "Cross-Platform" })))
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 }
  findings.sort((a, b) => (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3))

  return findings
}

