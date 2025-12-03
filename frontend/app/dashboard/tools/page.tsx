"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Settings,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Zap,
} from "lucide-react"
import Link from "next/link"

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const tools = [
    {
      id: 1,
      name: "Slack",
      category: "Communication",
      cost: 250,
      seats: 50,
      activeSeats: 42,
      unusedSeats: 8,
      wasteLevel: "high",
      status: "connected",
      lastSync: "2 hours ago",
      issues: ["8 unused seats", "Overage charges"],
    },
    {
      id: 2,
      name: "Jira",
      category: "Project Management",
      cost: 320,
      seats: 30,
      activeSeats: 28,
      unusedSeats: 2,
      wasteLevel: "low",
      status: "connected",
      lastSync: "1 hour ago",
      issues: [],
    },
    {
      id: 3,
      name: "HubSpot",
      category: "CRM/Marketing",
      cost: 600,
      seats: 10,
      activeSeats: 6,
      unusedSeats: 4,
      wasteLevel: "medium",
      status: "connected",
      lastSync: "3 hours ago",
      issues: ["Underused features", "Plan downgrade available"],
    },
    {
      id: 4,
      name: "Notion",
      category: "Productivity",
      cost: 120,
      seats: 20,
      activeSeats: 18,
      unusedSeats: 2,
      wasteLevel: "low",
      status: "connected",
      lastSync: "30 minutes ago",
      issues: [],
    },
    {
      id: 5,
      name: "Google Workspace",
      category: "Productivity",
      cost: 480,
      seats: 25,
      activeSeats: 13,
      unusedSeats: 12,
      wasteLevel: "high",
      status: "connected",
      lastSync: "1 hour ago",
      issues: ["12 inactive accounts", "Unused licenses"],
    },
    {
      id: 6,
      name: "Salesforce",
      category: "CRM",
      cost: 50,
      seats: 5,
      activeSeats: 5,
      unusedSeats: 0,
      wasteLevel: "low",
      status: "connected",
      lastSync: "15 minutes ago",
      issues: [],
    },
    {
      id: 7,
      name: "Zoom",
      category: "Communication",
      cost: 180,
      seats: 15,
      activeSeats: 12,
      unusedSeats: 3,
      wasteLevel: "medium",
      status: "connected",
      lastSync: "45 minutes ago",
      issues: ["3 unused licenses"],
    },
    {
      id: 8,
      name: "Asana",
      category: "Project Management",
      cost: 200,
      seats: 20,
      activeSeats: 15,
      unusedSeats: 5,
      wasteLevel: "medium",
      status: "error",
      lastSync: "Failed",
      issues: ["API connection error", "Needs reconnection"],
    },
  ]

  const getWasteBadge = (level: string) => {
    const styles = {
      high: "bg-red-500/20 text-red-400 border-red-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      low: "bg-green-500/20 text-green-400 border-green-500/30",
    }
    return styles[level as keyof typeof styles] || styles.low
  }

  const getStatusIcon = (status: string) => {
    if (status === "connected") {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else if (status === "error") {
      return <XCircle className="w-4 h-4 text-red-400" />
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />
  }

  const categories = ["all", ...Array.from(new Set(tools.map((t) => t.category)))]
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || tool.category === filterCategory
    const matchesStatus = filterStatus === "all" || tool.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalCost = tools.reduce((sum, t) => sum + t.cost, 0)
  const totalUnusedSeats = tools.reduce((sum, t) => sum + t.unusedSeats, 0)
  const toolsNeedingAttention = tools.filter((t) => t.wasteLevel !== "low" || t.status === "error").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tools & Integrations</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage your connected tools and optimize costs</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto">
          <ExternalLink className="w-4 h-4 mr-2" />
          Connect New Tool
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Tools</p>
                <p className="text-2xl font-bold text-white">{tools.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Monthly Cost</p>
                <p className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Unused Seats</p>
                <p className="text-2xl font-bold text-red-400">{totalUnusedSeats}</p>
              </div>
              <Users className="w-8 h-8 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Needs Attention</p>
                <p className="text-2xl font-bold text-orange-400">{toolsNeedingAttention}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48 bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-white">
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="connected" className="text-white">Connected</SelectItem>
                <SelectItem value="error" className="text-white">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-12">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
              <p className="text-gray-400">No tools found matching your filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const usagePercent = Math.round((tool.activeSeats / tool.seats) * 100)
            const potentialSavings = tool.unusedSeats * (tool.cost / tool.seats)

            return (
              <Card
                key={tool.id}
                className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-1">{tool.name}</CardTitle>
                      <p className="text-xs text-gray-400">{tool.category}</p>
                    </div>
                    {getStatusIcon(tool.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-white">${tool.cost}</span>
                      <span className="text-sm text-gray-400">/mo</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{tool.activeSeats}/{tool.seats} seats</span>
                      </div>
                      {tool.unusedSeats > 0 && (
                        <span className="text-red-400">{tool.unusedSeats} unused</span>
                      )}
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 mb-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          usagePercent >= 80
                            ? "bg-green-500"
                            : usagePercent >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{usagePercent}% utilization</p>
                  </div>

                  {tool.unusedSeats > 0 && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-400">Potential Savings</span>
                        <span className="text-sm font-semibold text-red-400">
                          ${Math.round(potentialSavings)}/mo
                        </span>
                      </div>
                    </div>
                  )}

                  {tool.issues.length > 0 && (
                    <div className="space-y-1">
                      {tool.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-orange-400 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <Badge className={getWasteBadge(tool.wasteLevel)}>
                      {tool.wasteLevel} waste
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Settings className="w-3 h-3 mr-1" />
                        Settings
                      </Button>
                      {tool.wasteLevel !== "low" && (
                        <Link href={`/dashboard/tools/${tool.id}`}>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Optimize
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>Last sync: {tool.lastSync}</span>
                    </div>
                    <Link
                      href={`/dashboard/tools/${tool.id}`}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

