"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  Zap,
  XCircle,
  ArrowUpRight,
} from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

const savingsHistory = [
  { month: "Jan", realized: 0, potential: 420 },
  { month: "Feb", realized: 70, potential: 420 },
  { month: "Mar", realized: 140, potential: 420 },
  { month: "Apr", realized: 200, potential: 420 },
  { month: "May", realized: 240, potential: 420 },
  { month: "Jun", realized: 300, potential: 420 },
]

const savingsByCategory = [
  { category: "License Optimization", amount: 180, count: 8, color: "#06b6d4" },
  { category: "Plan Downgrades", amount: 120, count: 3, color: "#3b82f6" },
  { category: "Unused Seats", amount: 96, count: 12, color: "#8b5cf6" },
  { category: "Tool Consolidation", amount: 24, count: 2, color: "#10b981" },
]

const optimizationHistory = [
  {
    id: 1,
    title: "Removed 12 inactive Google Workspace accounts",
    category: "License Optimization",
    savings: 144,
    date: "2024-06-15",
    status: "completed",
    tool: "Google Workspace",
  },
  {
    id: 2,
    title: "Downgraded HubSpot from Professional to Starter",
    category: "Plan Downgrade",
    savings: 300,
    date: "2024-06-10",
    status: "completed",
    tool: "HubSpot",
  },
  {
    id: 3,
    title: "Removed 6 inactive Slack seats",
    category: "Unused Seats",
    savings: 96,
    date: "2024-06-05",
    status: "completed",
    tool: "Slack",
  },
  {
    id: 4,
    title: "Consolidated automation tools",
    category: "Tool Consolidation",
    savings: 180,
    date: "2024-05-28",
    status: "completed",
    tool: "Custom Automation",
  },
  {
    id: 5,
    title: "Optimize Zoom license allocation",
    category: "License Optimization",
    savings: 54,
    date: "2024-05-20",
    status: "pending",
    tool: "Zoom",
  },
]

const chartConfig = {
  realized: {
    label: "Realized Savings",
    color: "#10b981",
  },
  potential: {
    label: "Potential Savings",
    color: "#06b6d4",
  },
}

export default function SavingsPage() {
  const [timeframe, setTimeframe] = useState("6m")

  const totalRealized = optimizationHistory
    .filter((opt) => opt.status === "completed")
    .reduce((sum, opt) => sum + opt.savings, 0)

  const totalPotential = optimizationHistory
    .filter((opt) => opt.status === "pending")
    .reduce((sum, opt) => sum + opt.savings, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Savings</h2>
          <p className="text-sm sm:text-base text-gray-400">Cost optimizations and savings tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-white/10 bg-black/50 text-white">
            <Calendar className="w-4 h-4 mr-2" />
            {timeframe === "6m" ? "6 Months" : timeframe === "3m" ? "3 Months" : "1 Month"}
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 bg-black/50 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Savings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Realized Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 mb-2">${totalRealized.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Potential Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400 mb-2">${totalPotential.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Pending optimizations</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Monthly Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400 mb-2">$300/mo</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <ArrowUpRight className="w-3 h-3 text-blue-400" />
              <span>Average over 6 months</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Trend Chart */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Savings Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart data={savingsHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="realized"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="potential"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#06b6d4", r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings by Category */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Savings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={savingsByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="#06b6d4" />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {savingsByCategory.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-white">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">${item.amount}/mo</div>
                    <div className="text-xs text-gray-400">{item.count} optimizations</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Optimizations */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Optimization History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationHistory.map((optimization) => (
                <div
                  key={optimization.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">{optimization.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={
                            optimization.status === "completed"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {optimization.status === "completed" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {optimization.status}
                        </Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {optimization.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-400">${optimization.savings}/mo</div>
                      <div className="text-xs text-gray-400">{optimization.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Zap className="w-3 h-3" />
                    <span>{optimization.tool}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Savings Opportunities */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Savings Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {optimizationHistory
              .filter((opt) => opt.status === "pending")
              .map((optimization) => (
                <div
                  key={optimization.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-yellow-500/30"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white mb-1">{optimization.title}</h4>
                    <p className="text-xs text-gray-400">{optimization.tool} • {optimization.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-400">${optimization.savings}/mo</div>
                      <div className="text-xs text-gray-400">Potential</div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
