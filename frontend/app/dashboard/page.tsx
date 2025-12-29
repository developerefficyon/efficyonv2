"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Settings,
  Download,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

export default function UserDashboard() {
  const { user } = useAuth()

  // Cost Summary Data
  const costSummary = {
    totalSpend: 1820,
    wastedSpend: 420,
    potentialSavings: 420,
    efficiencyScore: 77,
    toolsAnalyzed: 12,
  }

  // Tools Overview
  const tools = [
    {
      name: "Slack",
      cost: 250,
      usage: "8 unused seats",
      wasteLevel: "high",
      status: "needs_attention",
    },
    {
      name: "Jira",
      cost: 320,
      usage: "Heavy usage",
      wasteLevel: "low",
      status: "optimal",
    },
    {
      name: "HubSpot",
      cost: 600,
      usage: "Underused",
      wasteLevel: "medium",
      status: "needs_attention",
    },
    {
      name: "Notion",
      cost: 120,
      usage: "Optimal",
      wasteLevel: "low",
      status: "optimal",
    },
    {
      name: "Google Workspace",
      cost: 480,
      usage: "12 inactive accounts",
      wasteLevel: "high",
      status: "needs_attention",
    },
    {
      name: "Salesforce",
      cost: 50,
      usage: "Optimal",
      wasteLevel: "low",
      status: "optimal",
    },
  ]

  // Recommendations
  const recommendations = [
    {
      id: 1,
      type: "downgrade",
      title: "Downgrade HubSpot from Professional to Starter",
      savings: 300,
      impact: "high",
      description: "You're not using features included in Professional plan",
    },
    {
      id: 2,
      type: "remove",
      title: "Remove 12 inactive Google Workspace accounts",
      savings: 144,
      impact: "high",
      description: "These accounts haven't been active in 90+ days",
    },
    {
      id: 3,
      type: "optimize",
      title: "Remove 6 inactive Slack seats",
      savings: 96,
      impact: "medium",
      description: "Save on unused licenses",
    },
    {
      id: 4,
      type: "switch",
      title: "Consider switching automation platform",
      savings: 180,
      impact: "medium",
      description: "You're overpaying for features you don't use",
    },
  ]

  // Renewal Alerts
  const renewals = [
    {
      tool: "Slack",
      daysUntil: 18,
      savings: 96,
      action: "Remove 6 inactive seats before renewal",
    },
    {
      tool: "HubSpot",
      daysUntil: 30,
      savings: 0,
      action: "Annual renewal coming up",
    },
  ]

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Welcome back, {user?.name}!
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          Here's your cost optimization overview
        </p>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Monthly SaaS Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              ${costSummary.totalSpend.toLocaleString()}/mo
            </div>
            <p className="text-sm text-gray-400">
              You can save{" "}
              <span className="text-green-400 font-semibold">
                ${costSummary.potentialSavings}/mo
              </span>{" "}
              with recommended changes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Wasted Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400 mb-1">
              ${costSummary.wastedSpend}/mo
            </div>
            <p className="text-xs text-gray-500">
              {((costSummary.wastedSpend / costSummary.totalSpend) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Efficiency Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400 mb-1">
              {costSummary.efficiencyScore}%
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                style={{ width: `${costSummary.efficiencyScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Tools Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              {costSummary.toolsAnalyzed}
            </div>
            <p className="text-xs text-gray-500">Connected tools</p>
          </CardContent>
        </Card>
      </div>

      {/* Renewal Alerts */}
      {renewals.length > 0 && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <CardTitle className="text-white">Renewal Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {renewals.map((renewal, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {renewal.tool} renews in {renewal.daysUntil} days
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{renewal.action}</p>
                  </div>
                  {renewal.savings > 0 && (
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-green-400">
                        Save ${renewal.savings}/mo
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Recommendations</h3>
          <Link href="/dashboard/recommendations">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 w-full sm:w-auto">
              View All
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-sm mb-1">{rec.title}</CardTitle>
                    <p className="text-xs text-gray-400">{rec.description}</p>
                  </div>
                  <Badge
                    className={
                      rec.impact === "high"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }
                  >
                    {rec.impact}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">
                      ${rec.savings}/mo
                    </p>
                    <p className="text-xs text-gray-500">Potential savings</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto"
                  >
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tools Overview */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Tools Overview</h3>
          <Link href="/dashboard/tools">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 w-full sm:w-auto">
              View All
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, index) => (
            <Card
              key={index}
              className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">{tool.name}</CardTitle>
                  {tool.status === "optimal" ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-white">${tool.cost}/mo</p>
                  <p className="text-xs text-gray-400 mt-1">{tool.usage}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Badge
                    className={
                      tool.wasteLevel === "high"
                        ? "bg-red-500/20 text-red-400 border-red-500/30 w-fit"
                        : tool.wasteLevel === "medium"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 w-fit"
                          : "bg-green-500/20 text-green-400 border-green-500/30 w-fit"
                    }
                  >
                    {tool.wasteLevel} waste
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1 sm:flex-initial">
                      View
                    </Button>
                    {tool.status === "needs_attention" && (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex-1 sm:flex-initial"
                      >
                        Optimize
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Savings</p>
                <p className="text-2xl font-bold text-white">$47,500</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Hours Saved</p>
                <p className="text-2xl font-bold text-white">2,340</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Efficiency</p>
                <p className="text-2xl font-bold text-white">+34%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">ROI</p>
                <p className="text-2xl font-bold text-white">340%</p>
              </div>
              <Zap className="w-8 h-8 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
