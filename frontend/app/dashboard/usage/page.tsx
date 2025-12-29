"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Users,
  TrendingUp,
  Download,
  Calendar,
  Activity,
} from "lucide-react"

export default function UsagePage() {
  const usageData = [
    { tool: "Slack", purchased: 50, active: 42, inactive: 8, usage: 84 },
    { tool: "Jira", purchased: 30, active: 28, inactive: 2, usage: 93 },
    { tool: "HubSpot", purchased: 10, active: 6, inactive: 4, usage: 60 },
    { tool: "Notion", purchased: 20, active: 18, inactive: 2, usage: 90 },
    { tool: "Google Workspace", purchased: 25, active: 13, inactive: 12, usage: 52 },
    { tool: "Salesforce", purchased: 5, active: 5, inactive: 0, usage: 100 },
  ]

  const departmentUsage = [
    { department: "Engineering", spend: 850, tools: 8, users: 25 },
    { department: "Sales", spend: 620, tools: 6, users: 15 },
    { department: "Marketing", spend: 480, tools: 5, users: 12 },
    { department: "Operations", spend: 320, tools: 4, users: 10 },
  ]

  const topToolsBySpend = [
    { tool: "HubSpot", spend: 600, change: "+5%" },
    { tool: "Google Workspace", spend: 480, change: "+2%" },
    { tool: "Jira", spend: 320, change: "-3%" },
    { tool: "Slack", spend: 250, change: "+8%" },
    { tool: "Asana", spend: 200, change: "0%" },
  ]

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Usage Insights</h2>
          <p className="text-gray-400">License usage, team activity, and cost breakdowns</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-white/10 bg-black/50 text-white">
            <Calendar className="w-4 h-4 mr-2" />
            Last 30 days
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* License Usage Overview */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">License Usage vs Purchased</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium w-32">{item.tool}</span>
                    <span className="text-gray-400">
                      {item.active}/{item.purchased} active
                    </span>
                    {item.inactive > 0 && (
                      <span className="text-red-400">{item.inactive} inactive</span>
                    )}
                  </div>
                  <span className="text-gray-400">{item.usage}% usage</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      item.usage >= 80
                        ? "bg-green-500"
                        : item.usage >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${item.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Usage */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Cost per Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentUsage.map((dept, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{dept.department}</p>
                    <p className="text-xs text-gray-400">
                      {dept.users} users • {dept.tools} tools
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">${dept.spend}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tools by Spend */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top Tools by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topToolsBySpend.map((tool, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-cyan-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tool.tool}</p>
                      <p className="text-xs text-gray-400">
                        {tool.change} vs last month
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-white">${tool.spend}/mo</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active vs Inactive Users */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Active vs Inactive Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">112</p>
              <p className="text-sm text-gray-400">Active Users</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <Users className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">28</p>
              <p className="text-sm text-gray-400">Inactive Users</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">80%</p>
              <p className="text-sm text-gray-400">Utilization Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

