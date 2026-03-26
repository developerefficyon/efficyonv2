"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  Clock,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Calendar,
  Target,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Eye,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useApiCache } from "@/lib/use-api-cache"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface AnalysisReport {
  id: string
  provider: string
  parameters: any
  summary: {
    totalFindings: number
    totalPotentialSavings: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
    healthScore: number | null
  }
  created_at: string
}

interface DashboardSummary {
  hasData: boolean
  summary: {
    totalPotentialSavings: number
    totalFindings: number
    highSeverity: number
    avgHealthScore: number | null
  } | null
  tools: any[]
  recommendations: any[]
  lastAnalysisAt: string | null
}

export default function ReportsPage() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisReport | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState("pdf")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  const fetchAnalyses = useCallback(async () => {
    const accessToken = await getBackendToken()
    if (!accessToken) return []
    const res = await fetch(`${apiBase}/api/analysis-history?limit=20`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch analysis history")
    const data = await res.json()
    return (data.analyses || []) as AnalysisReport[]
  }, [apiBase])

  const fetchDashboardSummary = useCallback(async () => {
    const accessToken = await getBackendToken()
    if (!accessToken) return null
    const res = await fetch(`${apiBase}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch dashboard summary")
    return res.json() as Promise<DashboardSummary>
  }, [apiBase])

  const { data: analysesData, isLoading: loadingAnalyses, error: errorAnalyses, refresh: refreshAnalyses } = useApiCache<AnalysisReport[]>("analysis-history:20", fetchAnalyses)
  const { data: dashboardSummary, isLoading: loadingSummary } = useApiCache<DashboardSummary | null>("dashboard-summary", fetchDashboardSummary)

  const analyses = analysesData || []
  const loading = loadingAnalyses || loadingSummary
  const error = errorAnalyses

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const generatePDF = async (analysis: AnalysisReport) => {
    setIsExporting(true)

    try {
      // Fetch full analysis detail to get AI summary
      const token = await getBackendToken()
      const res = await fetch(`${apiBase}/api/analysis-history/${analysis.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch analysis detail")
      const data = await res.json()
      const aiSummary = data.analysis?.analysis_data?.aiSummary

      if (!aiSummary) {
        toast.error("No AI summary available for this analysis")
        return
      }

      exportAiSummaryPDF(aiSummary, analysis.provider)
      setShowExportDialog(false)
    } catch (err) {
      console.error("Error generating PDF:", err)
      toast.error("Failed to generate PDF")
    } finally {
      setIsExporting(false)
    }
  }

  const generateCSV = (analysis: AnalysisReport) => {
    setIsExporting(true)

    try {
      const rows = [
        ["Cost Analysis Report"],
        ["Provider", analysis.provider],
        ["Generated", formatDate(analysis.created_at)],
        [""],
        ["Summary"],
        ["Total Findings", String(analysis.summary.totalFindings)],
        ["Potential Savings", `$${analysis.summary.totalPotentialSavings.toFixed(2)}`],
        ["Health Score", analysis.summary.healthScore !== null ? `${analysis.summary.healthScore}%` : "N/A"],
        [""],
        ["Severity Breakdown"],
        ["High Priority", String(analysis.summary.highSeverity)],
        ["Medium Priority", String(analysis.summary.mediumSeverity)],
        ["Low Priority", String(analysis.summary.lowSeverity)],
      ]

      if (analysis.parameters && Object.keys(analysis.parameters).length > 0) {
        rows.push([""], ["Parameters"])
        Object.entries(analysis.parameters).forEach(([key, value]) => {
          rows.push([key, String(value)])
        })
      }

      const csvContent = rows.map(row => row.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      const filename = `${analysis.provider}_Analysis_${new Date(analysis.created_at).toISOString().split("T")[0]}.csv`
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Report downloaded", {
        description: `${filename} has been saved`,
      })
    } catch (err) {
      console.error("Error generating CSV:", err)
      toast.error("Failed to generate CSV")
    } finally {
      setIsExporting(false)
      setShowExportDialog(false)
    }
  }

  const handleExport = () => {
    if (!selectedAnalysis) return

    if (exportFormat === "pdf") {
      generatePDF(selectedAnalysis)
    } else {
      generateCSV(selectedAnalysis)
    }
  }

  const toggleExpand = async (analysisId: string) => {
    if (expandedId === analysisId) {
      setExpandedId(null)
      setExpandedData(null)
      return
    }

    setExpandedId(analysisId)
    setLoadingDetail(true)
    try {
      const token = await getBackendToken()
      const res = await fetch(`${apiBase}/api/analysis-history/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setExpandedData(data.analysis)
      }
    } catch (err) {
      console.error("Failed to load analysis detail:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const openExportDialog = (analysis: AnalysisReport) => {
    setSelectedAnalysis(analysis)
    setShowExportDialog(true)
  }

  // Export AI Summary as PDF with markdown formatting
  const exportAiSummaryPDF = (summary: string, provider?: string) => {
    if (!summary) { toast.error("No AI summary to export"); return }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    const maxWidth = pageWidth - margin * 2
    let y = margin

    const checkPage = (needed: number = 12) => {
      if (y > doc.internal.pageSize.getHeight() - needed - 10) { doc.addPage(); y = margin }
    }

    const renderText = (text: string, x: number, fontSize: number, style: string, color: [number, number, number], width: number) => {
      doc.setFont("helvetica", style)
      doc.setFontSize(fontSize)
      doc.setTextColor(...color)
      const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      const lines = doc.splitTextToSize(clean, width)
      for (const line of lines) { checkPage(); doc.text(line, x, y); y += fontSize * 0.45 + 1 }
    }

    // Header
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
    const toolName = provider || "Unknown"
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    doc.text(`${toolName} | ${dateStr}`, margin, 26)
    y = 42

    // Parse markdown
    const mdLines = summary.split("\n")
    let idx = 0

    while (idx < mdLines.length) {
      const line = mdLines[idx]

      if (!line.trim()) { y += 3; idx++; continue }

      // Tables
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const tableLines: string[] = []
        while (idx < mdLines.length && mdLines[idx].trim().startsWith("|") && mdLines[idx].trim().endsWith("|")) {
          tableLines.push(mdLines[idx].trim()); idx++
        }
        if (tableLines.length >= 2) {
          const parseRow = (row: string) => row.split("|").filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim())
          const headerCells = parseRow(tableLines[0])
          const bodyRows: string[][] = []
          for (let r = 1; r < tableLines.length; r++) {
            if (/^[\s|:-]+$/.test(tableLines[r].replace(/\|/g, "").trim())) continue
            bodyRows.push(parseRow(tableLines[r]))
          }
          checkPage(20 + bodyRows.length * 8)
          autoTable(doc, {
            startY: y, head: [headerCells], body: bodyRows, theme: "striped",
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
      const h1 = line.match(/^#\s+(.+)/); const h2 = line.match(/^##\s+(.+)/); const h3 = line.match(/^###\s+(.+)/)
      if (h1) { y += 4; checkPage(); renderText(h1[1], margin, 14, "bold", [30, 30, 30], maxWidth); y += 2; idx++; continue }
      if (h2) { y += 3; checkPage(); renderText(h2[1], margin, 12, "bold", [40, 40, 40], maxWidth); y += 1; idx++; continue }
      if (h3) { y += 2; checkPage(); renderText(h3[1], margin, 10, "bold", [50, 50, 50], maxWidth); y += 1; idx++; continue }

      // HR
      if (/^---+$/.test(line.trim())) { checkPage(); doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(margin, y, pageWidth - margin, y); y += 4; idx++; continue }

      // Bullets
      const bullet = line.match(/^(\s*)[-*]\s+(.+)/)
      if (bullet) { const indent = Math.min(Math.floor((bullet[1]?.length || 0) / 2), 3) * 5; checkPage(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.text("•", margin + indent, y); renderText(bullet[2], margin + indent + 5, 9, "normal", [60, 60, 60], maxWidth - indent - 5); idx++; continue }

      // Numbered list
      const num = line.match(/^(\s*)(\d+)\.\s+(.+)/)
      if (num) { const indent = Math.min(Math.floor((num[1]?.length || 0) / 2), 3) * 5; checkPage(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.text(`${num[2]}.`, margin + indent, y); renderText(num[3], margin + indent + 7, 9, "normal", [60, 60, 60], maxWidth - indent - 7); idx++; continue }

      // Paragraph
      checkPage(); renderText(line, margin, 9, "normal", [60, 60, 60], maxWidth); y += 1; idx++
    }

    doc.setFontSize(7); doc.setTextColor(150, 150, 150)
    doc.text("Generated by Efficyon — AI-Powered Cost Optimization", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" })

    const filename = `AI_Summary_${toolName}_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(filename)
    toast.success("AI Summary exported", { description: `${filename} saved` })
  }

  // Calculate summary stats
  const totalAnalyses = analyses.length
  const totalSavingsFound = analyses.reduce((sum, a) => sum + (a.summary?.totalPotentialSavings || 0), 0)
  const toolsAnalyzed = new Set(analyses.map(a => a.provider)).size

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative mx-auto w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
          </div>
          <p className="text-[13px] text-white/30">Loading reports...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
        <div className="animate-slide-up delay-0">
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
            Rep<span className="italic text-emerald-400/90">orts</span>
          </h2>
          <p className="text-[14px] text-white/35">Download and generate detailed reports</p>
        </div>
        <Card className="bg-red-500/[0.03] border-red-500/10 rounded-xl animate-slide-up delay-1">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-5 h-5 text-red-400/70" />
            </div>
            <p className="text-[13px] text-red-400/70 mb-4">{error}</p>
            <Button onClick={refreshAnalyses} className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="animate-slide-up delay-0">
        <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
          Rep<span className="italic text-emerald-400/90">orts</span>
        </h2>
        <p className="text-[14px] text-white/35">Download and export your analysis reports</p>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-slide-up delay-1">
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Analyses</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">{totalAnalyses}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift relative overflow-hidden group">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/[0.05] rounded-full blur-3xl group-hover:bg-emerald-500/[0.08] transition-all duration-700" />
          <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Savings Found</span>
            </div>
            <p className="text-3xl font-semibold text-emerald-400 tracking-tight">${Math.round(totalSavingsFound).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-violet-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Tools Analyzed</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">{toolsAnalyzed}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Analysis Reports ── */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-2">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/30" />
              <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Analysis Reports</span>
            </div>
            {analyses.length > 0 && (
              <span className="text-[11px] text-white/20">{analyses.length} available</span>
            )}
          </div>

          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <FileText className="w-6 h-6 text-white/15" />
              </div>
              <h3 className="text-lg font-display text-white mb-2">No Reports Yet</h3>
              <p className="text-[13px] text-white/30 max-w-md mx-auto mb-6 leading-relaxed">
                Run a cost analysis on your connected tools to generate downloadable reports.
              </p>
              <Button
                onClick={() => window.location.href = "/dashboard/tools"}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg"
              >
                Go to Tools
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {analyses.map((analysis) => {
                const isExpanded = expandedId === analysis.id
                return (
                  <div key={analysis.id} className="rounded-lg border border-white/[0.04] overflow-hidden">
                    {/* Row */}
                    <div className="flex items-center gap-3 p-3 sm:p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      onClick={() => toggleExpand(analysis.id)}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 text-white/15 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/80 truncate">
                          {analysis.provider} Cost Analysis
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-white/25 mt-0.5">
                          <span>{analysis.summary?.totalFindings || 0} findings</span>
                          <span className="text-emerald-400/70">
                            ${Math.round(analysis.summary?.totalPotentialSavings || 0).toLocaleString()} savings
                          </span>
                          <span className="hidden sm:inline">{formatRelativeTime(analysis.created_at)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openExportDialog(analysis) }}
                        className="h-7 px-2.5 text-[11px] text-white/30 hover:text-white/70 border border-white/[0.06] hover:bg-white/[0.04] rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Download className="w-3 h-3 sm:mr-1" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.04] bg-white/[0.01] p-4 space-y-4">
                        {loadingDetail ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="relative w-8 h-8">
                              <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                            </div>
                          </div>
                        ) : expandedData ? (
                          <>
                            {/* Stat row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                                <p className="text-[10px] text-white/25 uppercase tracking-wider">Findings</p>
                                <p className="text-[15px] font-semibold text-white mt-0.5">{expandedData.summary?.totalFindings || 0}</p>
                              </div>
                              <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                                <p className="text-[10px] text-white/25 uppercase tracking-wider">Savings</p>
                                <p className="text-[15px] font-semibold text-emerald-400 mt-0.5">
                                  ${Math.round(expandedData.summary?.totalPotentialSavings || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                                <p className="text-[10px] text-white/25 uppercase tracking-wider">High</p>
                                <p className="text-[15px] font-semibold text-red-400 mt-0.5">{expandedData.summary?.highSeverity || 0}</p>
                              </div>
                              <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                                <p className="text-[10px] text-white/25 uppercase tracking-wider">Medium</p>
                                <p className="text-[15px] font-semibold text-amber-400 mt-0.5">{expandedData.summary?.mediumSeverity || 0}</p>
                              </div>
                            </div>

                            {/* AI Summary */}
                            {expandedData.analysis_data?.aiSummary && (
                              <div className="rounded-lg border border-violet-500/10 bg-violet-500/[0.03] p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-violet-400/60" />
                                    <h4 className="text-[12px] font-medium text-white/70">AI Summary</h4>
                                    <Badge variant="outline" className="text-[9px] h-[16px] border-violet-500/15 text-violet-400/60 bg-violet-500/[0.06] rounded-full px-1.5">AI</Badge>
                                  </div>
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none
                                  [&_p]:text-white/50 [&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:mb-2
                                  [&_strong]:text-white/70 [&_strong]:font-semibold
                                  [&_ul]:text-white/50 [&_ul]:text-[12px] [&_ul]:space-y-1 [&_ul]:mb-3
                                  [&_ol]:text-white/50 [&_ol]:text-[12px] [&_ol]:space-y-1 [&_ol]:mb-3
                                  [&_li]:text-white/50
                                  [&_h1]:text-white/70 [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4
                                  [&_h2]:text-white/70 [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
                                  [&_h3]:text-white/70 [&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:mb-1.5 [&_h3]:mt-2
                                  [&_hr]:border-white/[0.06] [&_hr]:my-3
                                ">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      table: ({ children }) => (
                                        <div className="overflow-x-auto my-3 rounded-lg border border-white/[0.06]">
                                          <table className="w-full text-[11px] border-collapse">{children}</table>
                                        </div>
                                      ),
                                      thead: ({ children }) => <thead className="bg-white/[0.03]">{children}</thead>,
                                      th: ({ children }) => <th className="text-left text-white/30 font-medium px-3 py-2 border-b border-white/[0.06] whitespace-nowrap">{children}</th>,
                                      td: ({ children }) => <td className="text-white/50 px-3 py-1.5 border-b border-white/[0.03]">{children}</td>,
                                      tr: ({ children }) => <tr className="border-b border-white/[0.03]">{children}</tr>,
                                    }}
                                  >
                                    {expandedData.analysis_data.aiSummary}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}

                            {!expandedData.analysis_data?.aiSummary && (
                              <p className="text-[12px] text-white/20 text-center py-4">
                                No AI summary available. Re-run analysis to generate one.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[12px] text-white/20 text-center py-4">Failed to load details.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Export Dialog ── */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium text-white">Export Report</DialogTitle>
            <DialogDescription className="text-[13px] text-white/35">
              Choose your preferred export format
            </DialogDescription>
          </DialogHeader>
          {selectedAnalysis && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[13px] font-medium text-white/80 mb-1">
                  {selectedAnalysis.provider} Cost Analysis
                </p>
                <p className="text-[11px] text-white/25">
                  {formatDate(selectedAnalysis.created_at)}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[12px]">
                  <span className="text-white/30">
                    {selectedAnalysis.summary?.totalFindings || 0} findings
                  </span>
                  <span className="text-emerald-400/70">
                    ${Math.round(selectedAnalysis.summary?.totalPotentialSavings || 0).toLocaleString()} savings
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/60 text-[13px]">Export Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141415] border-white/[0.08] rounded-lg">
                    <SelectItem value="pdf" className="text-white/60 text-[12px] focus:bg-white/[0.06] focus:text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        PDF Document
                      </div>
                    </SelectItem>
                    <SelectItem value="csv" className="text-white/60 text-[12px] focus:bg-white/[0.06] focus:text-white">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        CSV Spreadsheet
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <Button
                  variant="ghost"
                  onClick={() => setShowExportDialog(false)}
                  className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium disabled:opacity-50 rounded-lg h-9 text-[13px]"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
