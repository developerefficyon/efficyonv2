"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react"

export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)

  const reportTemplates = [
    {
      id: "revenue",
      title: "Revenue Report",
      description: "Monthly revenue breakdown by plan and customer",
      icon: DollarSign,
      category: "Financial",
      lastGenerated: "2 days ago",
    },
    {
      id: "customers",
      title: "Customer Growth Report",
      description: "New customers, churn, and retention metrics",
      icon: Users,
      category: "Customers",
      lastGenerated: "1 day ago",
    },
    {
      id: "analytics",
      title: "Analytics Summary",
      description: "Comprehensive analytics and performance metrics",
      icon: BarChart3,
      category: "Analytics",
      lastGenerated: "3 days ago",
    },
    {
      id: "savings",
      title: "Customer Savings Report",
      description: "Total savings generated for all customers",
      icon: TrendingUp,
      category: "Performance",
      lastGenerated: "4 days ago",
    },
  ]

  const recentReports = [
    {
      name: "Revenue Report - June 2024",
      type: "Revenue",
      generated: "2 days ago",
      size: "2.4 MB",
      format: "PDF",
    },
    {
      name: "Customer Growth - Q2 2024",
      type: "Customers",
      generated: "5 days ago",
      size: "1.8 MB",
      format: "PDF",
    },
    {
      name: "Analytics Summary - May 2024",
      type: "Analytics",
      generated: "1 week ago",
      size: "3.2 MB",
      format: "PDF",
    },
    {
      name: "Savings Report - June 2024",
      type: "Performance",
      generated: "1 week ago",
      size: "2.1 MB",
      format: "PDF",
    },
  ]

  const handleGenerateReport = (reportId: string) => {
    setSelectedReport(reportId)
    // Simulate report generation
    setTimeout(() => {
      setSelectedReport(null)
      alert("Report generated successfully!")
    }, 2000)
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Reports</h2>
          <p className="text-sm sm:text-base text-gray-400">Generate and manage business reports</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto">
          <FileText className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Create Custom Report</span>
          <span className="sm:hidden">Create Report</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search reports..."
                className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Button variant="outline" className="border-white/10 bg-black/50 text-white flex-1 sm:flex-none text-xs sm:text-sm">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span className="hidden sm:inline">Date Range</span>
                <span className="sm:hidden">Date</span>
              </Button>
              <Button variant="outline" className="border-white/10 bg-black/50 text-white flex-1 sm:flex-none text-xs sm:text-sm">
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTemplates.map((template) => {
            const Icon = template.icon
            const isGenerating = selectedReport === template.id
            return (
              <Card
                key={template.id}
                className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">{template.title}</CardTitle>
                        <p className="text-xs text-gray-400 mt-1">{template.category}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 mb-4">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Last generated: {template.lastGenerated}
                    </p>
                    <Button
                      onClick={() => handleGenerateReport(template.id)}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                      size="sm"
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
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
        <h3 className="text-xl font-semibold text-white mb-4">Recent Reports</h3>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{report.name}</p>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{report.type}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{report.size}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{report.format}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-xs text-gray-500">{report.generated}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Reports</p>
                <p className="text-2xl font-bold text-white">127</p>
              </div>
              <FileText className="w-8 h-8 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">This Month</p>
                <p className="text-2xl font-bold text-white">23</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Storage Used</p>
                <p className="text-2xl font-bold text-white">2.4 GB</p>
              </div>
              <Download className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

