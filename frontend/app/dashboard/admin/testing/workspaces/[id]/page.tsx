"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  ArrowLeft,
  Upload,
  Play,
  FileBarChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ScrollText,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

const MockDataGenerator = dynamic(
  () => import("@/components/testing/mock-data-generator").then((m) => m.MockDataGenerator),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

const WorkspaceUploadPanel = dynamic(
  () => import("@/components/testing/workspace-upload-panel").then((m) => m.WorkspaceUploadPanel),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

const AnalysisResultViewer = dynamic(
  () => import("@/components/testing/analysis-result-viewer").then((m) => m.AnalysisResultViewer),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

const LogViewer = dynamic(
  () => import("@/components/testing/log-viewer").then((m) => m.LogViewer),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

const ComparisonPanel = dynamic(
  () => import("@/components/testing/comparison-panel").then((m) => m.ComparisonPanel),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
)

const ImprovementCyclePanel = dynamic(
  () => import("@/components/testing/improvement-cycle-panel").then((m) => m.ImprovementCyclePanel),
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
  template_id: string | null
  template_version: number | null
  integration_labels: string[]
  status: string
  scoring: any
  duration_ms: number | null
  created_at: string
  completed_at: string | null
}

interface Template {
  id: string
  slug: string
  name: string
  version: number
}

export default function WorkspaceDetailPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("uploads")

  // Analysis form state
  const [analysisType, setAnalysisType] = useState("standard")
  const [selectedTemplate, setSelectedTemplate] = useState("none")
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([])

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

      const [wsRes, tmplRes] = await Promise.all([
        fetch(`${apiBase}/api/test/workspaces/${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/test/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (wsRes.ok) {
        const data = await wsRes.json()
        setWorkspace(data.workspace)
        setUploads(data.uploads)
        setAnalyses(data.analyses)

        // Auto-detect integrations from uploads
        const integrations = [...new Set(data.uploads.map((u: UploadRecord) => u.integration_label))]
        setSelectedIntegrations(integrations)
      }

      if (tmplRes.ok) {
        const data = await tmplRes.json()
        setTemplates(data.templates)
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
    if (selectedIntegrations.length === 0) return
    setAnalyzing(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const body: any = {
        analysis_type: analysisType,
        integration_labels: selectedIntegrations,
      }

      if (selectedTemplate !== "none") {
        body.template_id = selectedTemplate
      }

      const res = await fetch(`${apiBase}/api/test/workspaces/${workspaceId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchWorkspace()
        toast.success("Analysis complete! Switching to Results tab.", {
          duration: 4000,
        })
        setActiveTab("results")
      } else {
        const err = await res.json()
        toast.error(`Analysis failed: ${err.error}`)
      }
    } catch (err) {
      console.error("Analysis failed:", err)
      toast.error("Analysis failed. Check console for details.")
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

  function handleUploadComplete() {
    fetchWorkspace()
  }

  const validationIcon = (status: string) => {
    if (status === "valid") return <CheckCircle className="w-4 h-4 text-green-400" />
    if (status === "partial") return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    return <XCircle className="w-4 h-4 text-red-400" />
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-20 text-gray-400">Workspace not found.</div>
    )
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="uploads" className="text-gray-400 data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400">
            <Upload className="w-4 h-4 mr-2" />
            Uploads ({uploads.length})
          </TabsTrigger>
          <TabsTrigger value="analyze" className="text-gray-400 data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400">
            <Play className="w-4 h-4 mr-2" />
            Run Analysis
          </TabsTrigger>
          <TabsTrigger value="results" className="text-gray-400 data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400">
            <FileBarChart className="w-4 h-4 mr-2" />
            Results ({analyses.length})
          </TabsTrigger>
          <TabsTrigger value="compare" className="text-gray-400 data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400">
            <BarChart3 className="w-4 h-4 mr-2" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="improve" className="text-gray-400 data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400">
            <RefreshCw className="w-4 h-4 mr-2" />
            Improve
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-gray-400 data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400">
            <ScrollText className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Uploads Tab */}
        <TabsContent value="uploads" className="space-y-4">
          <MockDataGenerator
            workspaceId={workspaceId}
            scenarioProfile={workspace.scenario_profile}
            onGenerateComplete={handleUploadComplete}
          />

          <WorkspaceUploadPanel
            workspaceId={workspaceId}
            onUploadComplete={handleUploadComplete}
          />

          {uploads.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Uploaded Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        {validationIcon(upload.validation_status)}
                        <div>
                          <p className="text-sm text-white font-medium">
                            {upload.integration_label} — {upload.data_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {upload.filename} · {new Date(upload.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          upload.validation_status === "valid"
                            ? "border-green-500/30 text-green-400"
                            : upload.validation_status === "partial"
                            ? "border-yellow-500/30 text-yellow-400"
                            : "border-red-500/30 text-red-400"
                        }
                      >
                        {upload.validation_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analyze">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Run Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploads.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Upload data first before running an analysis.
                </p>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-gray-400">Analysis Type</label>
                    <Select value={analysisType} onValueChange={setAnalysisType}>
                      <SelectTrigger className="mt-1 bg-black/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        <SelectItem value="standard" className="text-white focus:bg-white/10 focus:text-white">Standard</SelectItem>
                        <SelectItem value="deep" className="text-white focus:bg-white/10 focus:text-white">Deep Research</SelectItem>
                        <SelectItem value="cross_platform" className="text-white focus:bg-white/10 focus:text-white">Cross-Platform</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Template (optional)</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="mt-1 bg-black/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        <SelectItem value="none" className="text-white focus:bg-white/10 focus:text-white">No template</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-white focus:bg-white/10 focus:text-white">
                            {t.name} (v{t.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Integrations</label>
                    <div className="flex flex-wrap gap-2">
                      {["Fortnox", "Microsoft365", "HubSpot"].map((label) => {
                        const hasData = uploads.some((u) => u.integration_label === label)
                        const selected = selectedIntegrations.includes(label)
                        return (
                          <Button
                            key={label}
                            size="sm"
                            disabled={!hasData}
                            className={
                              selected
                                ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-md"
                                : "border border-white/10 bg-transparent text-gray-400 hover:bg-white/10 hover:text-white rounded-md"
                            }
                            onClick={() => {
                              if (selected) {
                                setSelectedIntegrations((prev) => prev.filter((i) => i !== label))
                              } else {
                                setSelectedIntegrations((prev) => [...prev, label])
                              }
                            }}
                          >
                            {label}
                            {!hasData && " (no data)"}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    onClick={runAnalysis}
                    disabled={analyzing || selectedIntegrations.length === 0}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {analyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {analyzing ? "Running Analysis..." : "Run Analysis"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {selectedAnalysis ? (
            <div className="space-y-4">
              <Button
                size="sm"
                className="bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setSelectedAnalysis(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to list
              </Button>
              <AnalysisResultViewer
                analysis={selectedAnalysis}
                onScoringUpdate={(newScoring) => {
                  setSelectedAnalysis((prev: any) => prev ? { ...prev, scoring: newScoring } : prev)
                  setAnalyses((prev) =>
                    prev.map((a) =>
                      a.id === selectedAnalysis.id ? { ...a, scoring: newScoring } : a
                    )
                  )
                }}
              />
            </div>
          ) : analyses.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <FileBarChart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No analyses run yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {analyses.map((a) => (
                <Card
                  key={a.id}
                  className="bg-white/5 border-white/10 hover:border-cyan-500/20 transition-colors cursor-pointer"
                  onClick={() => viewAnalysis(a.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            a.status === "completed"
                              ? "border-green-500/30 text-green-400"
                              : a.status === "failed"
                              ? "border-red-500/30 text-red-400"
                              : "border-yellow-500/30 text-yellow-400"
                          }
                        >
                          {a.status}
                        </Badge>
                        <div>
                          <p className="text-sm text-white font-medium">
                            {a.analysis_type} — {a.integration_labels.join(", ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(a.created_at).toLocaleString()}
                            {a.duration_ms ? ` · ${a.duration_ms}ms` : ""}
                          </p>
                        </div>
                      </div>
                      {a.scoring && Object.keys(a.scoring).length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {a.scoring.detection && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              F1: {(a.scoring.detection.f1Score * 100).toFixed(0)}%
                            </Badge>
                          )}
                          {a.scoring.quality && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Q: {a.scoring.quality.average}/5
                            </Badge>
                          )}
                          {!a.scoring.detection && !a.scoring.quality && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Scored
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare">
          <ComparisonPanel
            workspaceId={workspaceId}
            analyses={analyses}
          />
        </TabsContent>

        {/* Improve Tab */}
        <TabsContent value="improve">
          <ImprovementCyclePanel
            workspaceId={workspaceId}
          />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <LogViewer workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
