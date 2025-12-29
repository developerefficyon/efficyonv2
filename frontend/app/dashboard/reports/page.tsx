"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react"

export default function ReportsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dateRange, setDateRange] = useState("last-month")
  const [format, setFormat] = useState("pdf")

  const reports = [
    {
      id: 1,
      name: "Monthly Savings Report - June 2024",
      type: "Savings",
      generated: "2 days ago",
      size: "2.4 MB",
      format: "PDF",
      period: "June 2024",
      status: "completed",
    },
    {
      id: 2,
      name: "Usage Summary - Q2 2024",
      type: "Usage",
      generated: "5 days ago",
      size: "1.8 MB",
      format: "PDF",
      period: "Q2 2024",
      status: "completed",
    },
    {
      id: 3,
      name: "Spend Breakdown - May 2024",
      type: "Spend",
      generated: "1 week ago",
      size: "3.2 MB",
      format: "PDF",
      period: "May 2024",
      status: "completed",
    },
    {
      id: 4,
      name: "Team Utilization Report - June 2024",
      type: "Team",
      generated: "1 week ago",
      size: "2.1 MB",
      format: "PDF",
      period: "June 2024",
      status: "completed",
    },
    {
      id: 5,
      name: "Comprehensive Analysis - Q2 2024",
      type: "Comprehensive",
      generated: "Just now",
      size: "4.5 MB",
      format: "CSV",
      period: "Q2 2024",
      status: "generating",
    },
  ]

  const reportTemplates = [
    {
      id: "savings",
      name: "Monthly Savings Report",
      description: "Detailed breakdown of savings and optimizations",
      icon: DollarSign,
      generateTime: "~30 seconds",
    },
    {
      id: "usage",
      name: "Usage Summary",
      description: "Tool usage and license utilization",
      icon: TrendingUp,
      generateTime: "~20 seconds",
    },
    {
      id: "spend",
      name: "Spend Breakdown",
      description: "Complete cost analysis by tool and department",
      icon: FileText,
      generateTime: "~45 seconds",
    },
    {
      id: "team",
      name: "Team Utilization",
      description: "Team member activity and license usage",
      icon: Clock,
      generateTime: "~25 seconds",
    },
  ]

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
    setSelectedTemplate(null)
  }

  const handleExport = (reportId: number, exportFormat: string) => {
    // Simulate export
    console.log(`Exporting report ${reportId} as ${exportFormat}`)
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Reports</h2>
          <p className="text-sm sm:text-base text-gray-400">Download and generate detailed reports</p>
        </div>
        <Dialog open={selectedTemplate !== null} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" />
              Generate New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/95 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription className="text-gray-400">
                Configure your report settings and generate
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Report Type</Label>
                <Select value={selectedTemplate || ""} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    {reportTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id} className="text-white">
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="last-week" className="text-white">Last Week</SelectItem>
                    <SelectItem value="last-month" className="text-white">Last Month</SelectItem>
                    <SelectItem value="last-quarter" className="text-white">Last Quarter</SelectItem>
                    <SelectItem value="last-year" className="text-white">Last Year</SelectItem>
                    <SelectItem value="custom" className="text-white">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Export Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="pdf" className="text-white">PDF</SelectItem>
                    <SelectItem value="csv" className="text-white">CSV</SelectItem>
                    <SelectItem value="xlsx" className="text-white">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!selectedTemplate || isGenerating}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Templates */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTemplates.map((template) => {
            const Icon = template.icon
            return (
              <Card
                key={template.id}
                className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer"
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-white text-base">{template.name}</CardTitle>
                      <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{template.generateTime}</p>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                    >
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Report History</h3>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Generated Reports</CardTitle>
            <CardDescription className="text-gray-400">
              {reports.length} reports available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                    {report.format === "CSV" ? (
                      <FileSpreadsheet className="w-5 h-5 text-red-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white">{report.name}</p>
                      {report.status === "generating" && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating
                        </Badge>
                      )}
                      {report.status === "completed" && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ready
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-400">
                      <span>{report.type}</span>
                      <span>•</span>
                      <span>{report.period}</span>
                      <span>•</span>
                      <span>{report.size}</span>
                      <span>•</span>
                      <span>{report.format}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{report.generated}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 sm:hidden">{report.generated}</span>
                    {report.status === "completed" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(report.id, "pdf")}
                          className="text-gray-400 hover:text-white hover:bg-white/5"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(report.id, "csv")}
                          className="text-gray-400 hover:text-white hover:bg-white/5"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

