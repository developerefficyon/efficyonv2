"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Zap,
  Calendar,
  Download,
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"

const costTrendData = [
  { month: "Jan", cost: 1820, savings: 0 },
  { month: "Feb", cost: 1750, savings: 70 },
  { month: "Mar", cost: 1680, savings: 140 },
  { month: "Apr", cost: 1620, savings: 200 },
  { month: "May", cost: 1580, savings: 240 },
  { month: "Jun", cost: 1520, savings: 300 },
]

const usageData = [
  { tool: "Slack", usage: 84, cost: 250, efficiency: 75 },
  { tool: "Jira", usage: 93, cost: 320, efficiency: 88 },
  { tool: "HubSpot", usage: 60, cost: 600, efficiency: 45 },
  { tool: "Notion", usage: 90, cost: 120, efficiency: 92 },
  { tool: "Google Workspace", usage: 52, cost: 480, efficiency: 40 },
  { tool: "Salesforce", usage: 100, cost: 50, efficiency: 95 },
]

const roiData = [
  { month: "Jan", roi: 0 },
  { month: "Feb", roi: 45 },
  { month: "Mar", roi: 120 },
  { month: "Apr", roi: 185 },
  { month: "May", roi: 250 },
  { month: "Jun", roi: 340 },
]

const departmentSpend = [
  { name: "Engineering", value: 850, color: "#06b6d4" },
  { name: "Sales", value: 620, color: "#3b82f6" },
  { name: "Marketing", value: 480, color: "#8b5cf6" },
  { name: "Operations", value: 320, color: "#10b981" },
]

const chartConfig = {
  cost: {
    label: "Monthly Cost",
    color: "#ef4444",
  },
  savings: {
    label: "Savings",
    color: "#10b981",
  },
  usage: {
    label: "Usage %",
    color: "#06b6d4",
  },
  roi: {
    label: "ROI %",
    color: "#f59e0b",
  },
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("6m")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Analytics</h2>
          <p className="text-sm sm:text-base text-gray-400">Performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={dateRange === "1m" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("1m")}
              className={dateRange === "1m" ? "bg-cyan-600 text-white" : "border-white/10 bg-black/50 text-white"}
            >
              1M
            </Button>
            <Button
              variant={dateRange === "3m" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("3m")}
              className={dateRange === "3m" ? "bg-cyan-600 text-white" : "border-white/10 bg-black/50 text-white"}
            >
              3M
            </Button>
            <Button
              variant={dateRange === "6m" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("6m")}
              className={dateRange === "6m" ? "bg-cyan-600 text-white" : "border-white/10 bg-black/50 text-white"}
            >
              6M
            </Button>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 bg-black/50 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400 mb-1">$47,500</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400">+15.2%</span>
              <span>vs last period</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Current ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400 mb-1">340%</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400">+25%</span>
              <span>vs last month</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Efficiency Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400 mb-1">77%</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400">+5%</span>
              <span>vs last month</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Hours Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400 mb-1">2,340</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3 text-purple-400" />
              <span>This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trend Chart */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Cost Trend & Savings</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart data={costTrendData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorCost)"
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorSavings)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Trend */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">ROI Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Department Spend */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Spend by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <PieChart>
                <Pie
                  data={departmentSpend}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentSpend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tool Usage vs Cost */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Tool Usage vs Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="tool" stroke="#9ca3af" />
              <YAxis yAxisId="left" stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar yAxisId="left" dataKey="usage" fill="#06b6d4" />
              <Bar yAxisId="right" dataKey="cost" fill="#ef4444" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Performing Tools */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Tool Efficiency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageData.map((tool, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{tool.tool}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">Usage: {tool.usage}%</span>
                      <span className="text-xs text-gray-400">${tool.cost}/mo</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        tool.efficiency >= 80
                          ? "bg-green-500"
                          : tool.efficiency >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${tool.efficiency}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
