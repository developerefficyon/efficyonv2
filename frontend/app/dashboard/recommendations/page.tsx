"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingDown,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  DollarSign,
  Zap,
} from "lucide-react"

export default function RecommendationsPage() {
  const [applied, setApplied] = useState<number[]>([])

  const recommendations = [
    {
      id: 1,
      type: "downgrade",
      category: "Plan Optimization",
      title: "Downgrade HubSpot from Professional to Starter",
      description:
        "You're paying for Professional features (Marketing Automation, Advanced Reporting) that haven't been used in the last 60 days. The Starter plan includes all features you actually use.",
      savings: 300,
      impact: "high",
      effort: "low",
      tool: "HubSpot",
      applied: false,
    },
    {
      id: 2,
      type: "remove",
      category: "License Cleanup",
      title: "Remove 12 inactive Google Workspace accounts",
      description:
        "These accounts haven't logged in or been accessed in 90+ days. Removing them will save $144/month immediately.",
      savings: 144,
      impact: "high",
      effort: "low",
      tool: "Google Workspace",
      applied: false,
    },
    {
      id: 3,
      type: "optimize",
      category: "Seat Optimization",
      title: "Remove 6 inactive Slack seats",
      description:
        "6 team members haven't used Slack in the last 30 days. Consider removing their licenses before the next renewal.",
      savings: 96,
      impact: "medium",
      effort: "low",
      tool: "Slack",
      applied: false,
    },
    {
      id: 4,
      type: "switch",
      category: "Alternative Solution",
      title: "Consider switching automation platform",
      description:
        "You're paying $180/mo for automation features you rarely use. Alternative solutions like Zapier or Make.com offer similar functionality at $50/mo.",
      savings: 180,
      impact: "medium",
      effort: "medium",
      tool: "Custom Automation",
      applied: false,
    },
    {
      id: 5,
      type: "feature",
      category: "Feature Usage",
      title: "Zendesk plan includes unused features",
      description:
        "Your Zendesk plan includes Advanced Analytics and Custom Fields that haven't been used in 60 days. Consider downgrading to a plan without these features.",
      savings: 120,
      impact: "medium",
      effort: "low",
      tool: "Zendesk",
      applied: false,
    },
    {
      id: 6,
      type: "optimize",
      category: "Usage Optimization",
      title: "Optimize Zoom license allocation",
      description:
        "3 Zoom licenses are assigned to team members who primarily use Google Meet. Reallocate these licenses or remove them.",
      savings: 54,
      impact: "low",
      effort: "low",
      tool: "Zoom",
      applied: false,
    },
  ]

  const handleApply = (id: number) => {
    setApplied([...applied, id])
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "downgrade":
        return <TrendingDown className="w-5 h-5 text-blue-400" />
      case "remove":
        return <X className="w-5 h-5 text-red-400" />
      case "switch":
        return <ArrowRight className="w-5 h-5 text-purple-400" />
      default:
        return <Zap className="w-5 h-5 text-cyan-400" />
    }
  }

  const getImpactBadge = (impact: string) => {
    const styles = {
      high: "bg-green-500/20 text-green-400 border-green-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
    return styles[impact as keyof typeof styles] || styles.medium
  }

  const totalSavings = recommendations
    .filter((r) => !applied.includes(r.id))
    .reduce((sum, r) => sum + r.savings, 0)

  const appliedCount = applied.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Recommendations</h2>
          <p className="text-gray-400">
            AI-powered suggestions to optimize your SaaS spending
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 mb-1">Potential Savings</p>
              <p className="text-xl font-bold text-green-400">${totalSavings}/mo</p>
            </CardContent>
          </Card>
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 mb-1">Applied</p>
              <p className="text-xl font-bold text-cyan-400">{appliedCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec) => {
          const isApplied = applied.includes(rec.id)
          return (
            <Card
              key={rec.id}
              className={`bg-black/80 backdrop-blur-xl border-white/10 transition-all ${
                isApplied
                  ? "opacity-60 border-green-500/30"
                  : "hover:border-cyan-500/30"
              }`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5">
                    {getTypeIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-white">{rec.title}</CardTitle>
                          {isApplied && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Applied
                            </Badge>
                          )}
                        </div>
                        <Badge className={getImpactBadge(rec.impact)}>
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          ${rec.savings}/mo
                        </p>
                        <p className="text-xs text-gray-500">Savings</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{rec.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {rec.tool}
                      </span>
                      <span>•</span>
                      <span>{rec.category}</span>
                      <span>•</span>
                      <span>Effort: {rec.effort}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-black/50 text-white"
                  >
                    View Details
                  </Button>
                  {!isApplied && (
                    <Button
                      onClick={() => handleApply(rec.id)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                    >
                      Apply Recommendation
                    </Button>
                  )}
                  {isApplied && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500/30 bg-green-500/10 text-green-400"
                      disabled
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Applied
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

