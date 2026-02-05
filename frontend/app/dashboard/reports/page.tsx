"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisReport[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisReport | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState("pdf")

  const fetchReportData = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        setLoading(false)
        return
      }

      const [analysisRes, dashboardRes] = await Promise.all([
        fetch(`${apiBase}/api/analysis-history?limit=20`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/dashboard/summary`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      if (analysisRes.ok) {
        const data = await analysisRes.json()
        setAnalyses(data.analyses || [])
      }

      if (dashboardRes.ok) {
        const data = await dashboardRes.json()
        setDashboardSummary(data)
      }
    } catch (err) {
      console.error("Error fetching report data:", err)
      setError("Failed to load report data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [])

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
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      let yPosition = margin

      // Colors
      const primaryColor: [number, number, number] = [6, 182, 212]
      const darkBg: [number, number, number] = [15, 23, 42]
      const successColor: [number, number, number] = [16, 185, 129]

      // Header Background
      doc.setFillColor(...darkBg)
      doc.rect(0, 0, pageWidth, 45, "F")

      // Header
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont("helvetica", "bold")
      doc.text("Cost Analysis Report", margin, 25)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...primaryColor)
      doc.text(`${analysis.provider} | Generated ${formatDate(analysis.created_at)}`, margin, 35)

      yPosition = 55

      // Summary Section
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(50, 50, 50)
      doc.text("Executive Summary", margin, yPosition)
      yPosition += 10

      // Summary boxes
      const boxWidth = (pageWidth - margin * 2 - 20) / 3
      const boxHeight = 30

      // Findings box
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, "F")
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(50, 50, 50)
      doc.text(String(analysis.summary.totalFindings), margin + boxWidth / 2, yPosition + 15, { align: "center" })
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text("Total Findings", margin + boxWidth / 2, yPosition + 23, { align: "center" })

      // Savings box
      doc.setFillColor(220, 252, 231)
      doc.roundedRect(margin + boxWidth + 10, yPosition, boxWidth, boxHeight, 3, 3, "F")
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...successColor)
      doc.text(`$${analysis.summary.totalPotentialSavings.toFixed(0)}`, margin + boxWidth + 10 + boxWidth / 2, yPosition + 15, { align: "center" })
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text("Potential Savings", margin + boxWidth + 10 + boxWidth / 2, yPosition + 23, { align: "center" })

      // Health Score box
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(margin + (boxWidth + 10) * 2, yPosition, boxWidth, boxHeight, 3, 3, "F")
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      const healthScore = analysis.summary.healthScore
      if (healthScore !== null) {
        if (healthScore >= 70) doc.setTextColor(16, 185, 129)
        else if (healthScore >= 40) doc.setTextColor(245, 158, 11)
        else doc.setTextColor(239, 68, 68)
        doc.text(`${healthScore}%`, margin + (boxWidth + 10) * 2 + boxWidth / 2, yPosition + 15, { align: "center" })
      } else {
        doc.setTextColor(100, 100, 100)
        doc.text("N/A", margin + (boxWidth + 10) * 2 + boxWidth / 2, yPosition + 15, { align: "center" })
      }
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text("Health Score", margin + (boxWidth + 10) * 2 + boxWidth / 2, yPosition + 23, { align: "center" })

      yPosition += boxHeight + 15

      // Severity Breakdown
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(50, 50, 50)
      doc.text("Findings by Severity", margin, yPosition)
      yPosition += 10

      const severityData = [
        ["High Priority", String(analysis.summary.highSeverity), "Requires immediate attention"],
        ["Medium Priority", String(analysis.summary.mediumSeverity), "Should be reviewed soon"],
        ["Low Priority", String(analysis.summary.lowSeverity), "Monitor and address when possible"],
      ]

      autoTable(doc, {
        startY: yPosition,
        head: [["Severity", "Count", "Action"]],
        body: severityData,
        theme: "striped",
        headStyles: {
          fillColor: darkBg,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        margin: { left: margin, right: margin },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      // Analysis Parameters
      if (analysis.parameters && Object.keys(analysis.parameters).length > 0) {
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(50, 50, 50)
        doc.text("Analysis Parameters", margin, yPosition)
        yPosition += 10

        const paramData = Object.entries(analysis.parameters).map(([key, value]) => [
          key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          String(value),
        ])

        if (paramData.length > 0) {
          autoTable(doc, {
            startY: yPosition,
            head: [["Parameter", "Value"]],
            body: paramData,
            theme: "striped",
            headStyles: {
              fillColor: darkBg,
              textColor: [255, 255, 255],
              fontStyle: "bold",
            },
            styles: {
              fontSize: 10,
              cellPadding: 5,
            },
            margin: { left: margin, right: margin },
          })
        }
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 10
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text("Generated by Efficyon - SaaS Cost Optimization Platform", pageWidth / 2, footerY, { align: "center" })

      // Save
      const filename = `${analysis.provider}_Analysis_${new Date(analysis.created_at).toISOString().split("T")[0]}.pdf`
      doc.save(filename)

      toast.success("Report downloaded", {
        description: `${filename} has been saved`,
      })
    } catch (err) {
      console.error("Error generating PDF:", err)
      toast.error("Failed to generate PDF")
    } finally {
      setIsExporting(false)
      setShowExportDialog(false)
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

  const openExportDialog = (analysis: AnalysisReport) => {
    setSelectedAnalysis(analysis)
    setShowExportDialog(true)
  }

  // Calculate summary stats
  const totalAnalyses = analyses.length
  const totalSavingsFound = analyses.reduce((sum, a) => sum + (a.summary?.totalPotentialSavings || 0), 0)
  const toolsAnalyzed = new Set(analyses.map(a => a.provider)).size

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Reports</h2>
          <p className="text-gray-400">Download and generate detailed reports</p>
        </div>
        <Card className="bg-black/80 backdrop-blur-xl border-red-500/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-2">{error}</p>
            <Button
              onClick={fetchReportData}
              className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Reports</h2>
          <p className="text-sm sm:text-base text-gray-400">Download and export your analysis reports</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalAnalyses}</p>
                <p className="text-sm text-gray-400">Total Analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${totalSavingsFound.toFixed(0)}</p>
                <p className="text-sm text-gray-400">Total Savings Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{toolsAnalyzed}</p>
                <p className="text-sm text-gray-400">Tools Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Reports */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Analysis Reports
          </CardTitle>
          <CardDescription className="text-gray-400">
            {analyses.length > 0
              ? `${analyses.length} reports available for download`
              : "No reports available yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Reports Yet</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                Run a cost analysis on your connected tools to generate downloadable reports.
              </p>
              <Button
                onClick={() => window.location.href = "/dashboard/tools"}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
              >
                Go to Tools
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white">
                        {analysis.provider} Cost Analysis
                      </p>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {analysis.summary?.totalFindings || 0} findings
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-green-400">
                        <DollarSign className="w-3 h-3" />
                        ${(analysis.summary?.totalPotentialSavings || 0).toFixed(0)} savings
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatRelativeTime(analysis.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 sm:hidden">
                      {formatRelativeTime(analysis.created_at)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExportDialog(analysis)}
                      className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:text-cyan-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      {analyses.length > 0 && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Report Formats</h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>
                    <span className="text-cyan-400">PDF</span> - Professional format for sharing with stakeholders
                  </li>
                  <li>
                    <span className="text-cyan-400">CSV</span> - Import into spreadsheets for further analysis
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-black/95 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose your preferred export format
            </DialogDescription>
          </DialogHeader>
          {selectedAnalysis && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm font-medium text-white mb-1">
                  {selectedAnalysis.provider} Cost Analysis
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(selectedAnalysis.created_at)}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-gray-400">
                    {selectedAnalysis.summary?.totalFindings || 0} findings
                  </span>
                  <span className="text-green-400">
                    ${(selectedAnalysis.summary?.totalPotentialSavings || 0).toFixed(0)} savings
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Export Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="pdf" className="text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF Document
                      </div>
                    </SelectItem>
                    <SelectItem value="csv" className="text-white">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV Spreadsheet
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
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
