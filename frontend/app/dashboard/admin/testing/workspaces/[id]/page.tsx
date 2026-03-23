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
  Download,
} from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const DragDropUploadZone = dynamic(
  () => import("@/components/testing/drag-drop-upload-zone").then((m) => m.DragDropUploadZone),
  { loading: () => <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div> }
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
        <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  if (!workspace) {
    return <div className="text-center py-20 text-white/25">Workspace not found.</div>
  }

  // Collect all findings from the selected analysis
  const findings = selectedAnalysis ? extractFindings(selectedAnalysis.analysis_result) : []
  const summary = selectedAnalysis?.analysis_result?.overallSummary

  function exportAiAnalysisPDF() {
    const aiText = selectedAnalysis?.analysis_result?.aiAnalysis
    if (!aiText) {
      toast.error("No AI analysis to export")
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const maxWidth = pageWidth - margin * 2
    let y = margin

    const checkPage = (needed: number = 12) => {
      if (y > pageHeight - needed - 10) {
        doc.addPage()
        y = margin
      }
    }

    const renderText = (text: string, x: number, fontSize: number, style: string, color: [number, number, number], width: number) => {
      doc.setFont("helvetica", style)
      doc.setFontSize(fontSize)
      doc.setTextColor(...color)
      const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      const lines = doc.splitTextToSize(clean, width)
      for (const line of lines) {
        checkPage()
        doc.text(line, x, y)
        y += fontSize * 0.45 + 1
      }
    }

    // Header bar
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageWidth, 32, "F")
    doc.setDrawColor(52, 211, 153)
    doc.setLineWidth(1.5)
    doc.line(0, 32, pageWidth, 32)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text("AI Cost Analysis Summary", margin, 18)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    doc.text(`${workspace?.name || "Test Workspace"} | ${dateStr}`, margin, 26)

    y = 42

    // Summary stats bar
    if (summary) {
      checkPage(20)
      const stats = [
        { label: "Findings", value: String(summary.totalFindings || 0) },
        { label: "Savings", value: `${Math.round(summary.totalPotentialSavings || 0).toLocaleString()} SEK` },
        { label: "High", value: String(summary.highSeverity || 0) },
        { label: "Medium", value: String(summary.mediumSeverity || 0) },
      ]
      const colW = maxWidth / stats.length
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, y, maxWidth, 16, 2, 2, "F")
      stats.forEach((s, idx) => {
        const cx = margin + colW * idx + colW / 2
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(s.value, cx, y + 7, { align: "center" })
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text(s.label, cx, y + 13, { align: "center" })
      })
      y += 22
    }

    // Parse markdown
    const lines = aiText.split("\n")
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      if (!line.trim()) { y += 3; i++; continue }

      // Table
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const tableLines: string[] = []
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          tableLines.push(lines[i].trim())
          i++
        }
        if (tableLines.length >= 2) {
          const parseRow = (row: string) =>
            row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim())
          const headerCells = parseRow(tableLines[0])
          const bodyRows: string[][] = []
          for (let r = 1; r < tableLines.length; r++) {
            if (/^[\s|:-]+$/.test(tableLines[r].replace(/\|/g, "").trim())) continue
            bodyRows.push(parseRow(tableLines[r]))
          }
          checkPage(20 + bodyRows.length * 8)
          autoTable(doc, {
            startY: y,
            head: [headerCells],
            body: bodyRows,
            theme: "striped",
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            styles: { cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.2 },
            margin: { left: margin, right: margin },
          })
          y = (doc as any).lastAutoTable.finalY + 6
          continue
        }
      }

      // Headings
      const h1 = line.match(/^#\s+(.+)/)
      const h2 = line.match(/^##\s+(.+)/)
      const h3 = line.match(/^###\s+(.+)/)
      if (h1) { y += 4; checkPage(); renderText(h1[1], margin, 14, "bold", [30, 30, 30], maxWidth); y += 2; i++; continue }
      if (h2) { y += 3; checkPage(); renderText(h2[1], margin, 12, "bold", [40, 40, 40], maxWidth); y += 1; i++; continue }
      if (h3) { y += 2; checkPage(); renderText(h3[1], margin, 10, "bold", [50, 50, 50], maxWidth); y += 1; i++; continue }

      // HR
      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
        checkPage(); doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
        doc.line(margin, y, pageWidth - margin, y); y += 4; i++; continue
      }

      // Bullets
      const bullet = line.match(/^(\s*)[-*]\s+(.+)/)
      if (bullet) {
        const indent = Math.min(Math.floor((bullet[1]?.length || 0) / 2), 3) * 5
        checkPage(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60)
        doc.text("•", margin + indent, y)
        renderText(bullet[2], margin + indent + 5, 9, "normal", [60, 60, 60], maxWidth - indent - 5)
        i++; continue
      }

      // Numbered list
      const num = line.match(/^(\s*)(\d+)\.\s+(.+)/)
      if (num) {
        const indent = Math.min(Math.floor((num[1]?.length || 0) / 2), 3) * 5
        checkPage(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60)
        doc.text(`${num[2]}.`, margin + indent, y)
        renderText(num[3], margin + indent + 7, 9, "normal", [60, 60, 60], maxWidth - indent - 7)
        i++; continue
      }

      // Paragraph
      checkPage()
      renderText(line, margin, 9, "normal", [60, 60, 60], maxWidth)
      y += 1; i++
    }

    // Footer
    const footerY = pageHeight - 10
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text("Generated by Efficyon — AI-Powered Cost Optimization", pageWidth / 2, footerY, { align: "center" })

    const filename = `AI_Analysis_${(workspace?.name || "workspace").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(filename)
    toast.success("PDF exported", { description: filename })
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/testing/workspaces">
          <button className="inline-flex items-center bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 rounded-lg h-8 px-3 text-[12px] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-white tracking-tight">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-[13px] text-white/35 mt-0.5">{workspace.description}</p>
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
            <p className="text-[13px] text-white/35">
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
              className="text-[11px] text-white/25 hover:text-emerald-400/80 transition-colors"
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
              className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                selectedUploadIds.has(upload.id)
                  ? "bg-white/[0.03] border-white/[0.08]"
                  : "bg-white/[0.01] border-white/[0.04] opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedUploadIds.has(upload.id)}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 shrink-0 cursor-pointer accent-emerald-500"
                />
                {upload.validation_status === "valid" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400/70 shrink-0" />
                ) : upload.validation_status === "partial" ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400/70 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400/70 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[13px] text-white/80 truncate">{upload.filename}</p>
                  <UploadClassificationSelect
                    uploadId={upload.id}
                    value={`${upload.integration_label}::${upload.data_type}`}
                    onReclassify={reclassifyUpload}
                  />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteUpload(upload.id) }}
                className="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400/80 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Step 2: Analyze */}
          <button
            onClick={runAnalysis}
            disabled={analyzing || selectedUploadIds.size === 0}
            className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {analyzing ? "Analyzing..." : `Analyze ${selectedUploadIds.size} file${selectedUploadIds.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Step 3: Results */}
      {analyses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Results</h2>
            {selectedAnalysis && (
              <button
                onClick={() => deleteAnalysis(selectedAnalysis.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-white/20 hover:text-red-400/80 hover:bg-red-500/10 transition-colors"
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
                    className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors border ${
                      selectedAnalysis?.id === a.id
                        ? "bg-white/[0.06] border-white/[0.08] text-white/70"
                        : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
                    }`}
                  >
                    Run {analyses.length - i} &middot; {new Date(a.created_at).toLocaleString()}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id) }}
                    className="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400/80 transition-colors"
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

          {/* AI Analysis - shown first */}
          {selectedAnalysis?.analysis_result?.aiAnalysis && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-[10px] text-purple-400 font-bold">AI</span>
                  </div>
                  <h3 className="text-[13px] font-medium text-white/70">AI Analysis</h3>
                </div>
                <button
                  onClick={exportAiAnalysisPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
              </div>
              <div className="ai-analysis-content text-[13px] text-white/50 leading-relaxed space-y-3">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-base font-bold text-white/90 mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-semibold text-white/80 mt-4 mb-1.5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-medium text-white/70 mt-3 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="my-1.5">{children}</p>,
                    strong: ({ children }) => <strong className="text-white/80 font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="text-white/50">{children}</li>,
                    hr: () => <hr className="border-white/[0.06] my-3" />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3">
                        <table className="w-full text-xs border-collapse border border-white/[0.06]">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-white/[0.03]">{children}</thead>,
                    th: ({ children }) => <th className="text-left text-white/40 font-medium px-3 py-2 border border-white/[0.06] whitespace-nowrap">{children}</th>,
                    td: ({ children }) => <td className="text-white/50 px-3 py-1.5 border border-white/[0.06]">{children}</td>,
                    tr: ({ children }) => <tr className="border-b border-white/[0.04]">{children}</tr>,
                  }}
                >
                  {selectedAnalysis.analysis_result.aiAnalysis}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Findings" value={summary.totalFindings || 0} />
              <StatCard
                label="Potential Savings"
                value={`${Math.round(summary.totalPotentialSavings || 0).toLocaleString()} SEK`}
                color="text-emerald-400"
              />
              <StatCard label="High Severity" value={summary.highSeverity || 0} color="text-red-400" />
              <StatCard label="Medium" value={summary.mediumSeverity || 0} color="text-yellow-400" />
            </div>
          )}

          {/* Findings list - expandable */}
          {findings.length > 0 && (
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-medium text-white/70">Cost Leak Findings</h3>
                  <span className="text-[11px] bg-white/[0.04] text-white/30 px-2 py-0.5 rounded-full">{findings.length}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-white/25 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-2 mt-3">
                {findings.map((f, i) => (
                  <FindingCard key={i} finding={f} />
                ))}
              </div>
            </details>
          )}

          {findings.length === 0 && selectedAnalysis && !selectedAnalysis.analysis_result?.aiAnalysis && (
            <p className="text-white/25 text-[13px] py-4 text-center">No findings detected.</p>
          )}

          {/* Raw JSON toggle */}
          {selectedAnalysis && (
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors"
            >
              {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showRawJson ? "Hide" : "Show"} raw JSON
            </button>
          )}
          {showRawJson && selectedAnalysis && (
            <pre className="text-[11px] text-white/30 font-mono bg-white/[0.01] border border-white/[0.04] rounded-lg p-3 overflow-auto max-h-64">
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
        className="flex items-center gap-1 text-[11px] text-white/30 hover:text-emerald-400/80 transition-colors"
      >
        {displayLabel}
        <Pencil className="w-2.5 h-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#0a0a0a] border border-white/[0.08] rounded-lg shadow-xl py-1 min-w-[200px] max-h-64 overflow-y-auto">
            {CLASSIFICATION_OPTIONS.map((group) => (
              <div key={group.group}>
                <p className="px-3 py-1 text-[10px] text-white/25 uppercase font-medium">{group.group}</p>
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
                        ? "text-emerald-400/80 bg-emerald-500/[0.06]"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
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
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
      <p className="text-[10px] text-white/25 uppercase">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${color || "text-white"}`}>{value}</p>
    </div>
  )
}

function FindingCard({ finding }: { finding: any }) {
  const severityStyles = {
    high: { border: "border-red-500/10", icon: "text-red-400/80", badge: "bg-red-500/10 border-red-500/10 text-red-400/80" },
    medium: { border: "border-yellow-500/10", icon: "text-yellow-400/80", badge: "bg-yellow-500/10 border-yellow-500/10 text-yellow-400/80" },
    low: { border: "border-blue-500/10", icon: "text-blue-400/80", badge: "bg-blue-500/10 border-blue-500/10 text-blue-400/80" },
  }
  const s = severityStyles[finding.severity as keyof typeof severityStyles] || severityStyles.low

  return (
    <div className={`flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border ${s.border}`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${s.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-[13px] text-white/80 font-medium">{finding.title}</p>
          <Badge variant="outline" className={`text-[10px] ${s.badge}`}>
            {finding.severity}
          </Badge>
          {finding.type && (
            <Badge variant="outline" className="text-[10px] border-white/[0.06] text-white/30">
              {finding.type}
            </Badge>
          )}
        </div>
        <p className="text-[12px] text-white/35">{finding.description}</p>
        {finding.potentialSavings > 0 && (
          <p className="text-[12px] text-emerald-400/80 mt-1 flex items-center gap-1">
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
