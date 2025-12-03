"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Settings,
} from "lucide-react"

export default function IntegrationsPage() {
  const integrations = [
    {
      id: 1,
      name: "Slack",
      status: "connected",
      lastSync: "2 hours ago",
      issues: [],
      dataQuality: "excellent",
    },
    {
      id: 2,
      name: "Jira",
      status: "connected",
      lastSync: "1 hour ago",
      issues: [],
      dataQuality: "good",
    },
    {
      id: 3,
      name: "HubSpot",
      status: "connected",
      lastSync: "3 hours ago",
      issues: ["Missing usage data"],
      dataQuality: "fair",
    },
    {
      id: 4,
      name: "Google Workspace",
      status: "connected",
      lastSync: "1 hour ago",
      issues: [],
      dataQuality: "excellent",
    },
    {
      id: 5,
      name: "Salesforce",
      status: "error",
      lastSync: "Failed",
      issues: ["API connection error", "OAuth token expired"],
      dataQuality: "poor",
    },
    {
      id: 6,
      name: "Notion",
      status: "connected",
      lastSync: "30 minutes ago",
      issues: [],
      dataQuality: "excellent",
    },
    {
      id: 7,
      name: "Zoom",
      status: "warning",
      lastSync: "12 hours ago",
      issues: ["Sync delayed"],
      dataQuality: "good",
    },
    {
      id: 8,
      name: "Asana",
      status: "error",
      lastSync: "Failed",
      issues: ["API key revoked", "Needs reconnection"],
      dataQuality: "poor",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />
    }
  }

  const getDataQualityBadge = (quality: string) => {
    const styles = {
      excellent: "bg-green-500/20 text-green-400 border-green-500/30",
      good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      fair: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      poor: "bg-red-500/20 text-red-400 border-red-500/30",
    }
    return styles[quality as keyof typeof styles] || styles.poor
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length
  const errorCount = integrations.filter((i) => i.status === "error").length
  const warningCount = integrations.filter((i) => i.status === "warning").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Integrations</h2>
          <p className="text-gray-400">
            Manage your connected tools and monitor sync status
          </p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
          <ExternalLink className="w-4 h-4 mr-2" />
          Connect New Tool
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Connected</p>
                <p className="text-2xl font-bold text-green-400">{connectedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Errors</p>
                <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Warnings</p>
                <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card
            key={integration.id}
            className={`bg-black/80 backdrop-blur-xl border-white/10 transition-all ${
              integration.status === "error"
                ? "border-red-500/30"
                : integration.status === "warning"
                  ? "border-yellow-500/30"
                  : "hover:border-cyan-500/30"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(integration.status)}
                  <div>
                    <CardTitle className="text-white">{integration.name}</CardTitle>
                    <p className="text-xs text-gray-400 mt-1">
                      Last sync: {integration.lastSync}
                    </p>
                  </div>
                </div>
                <Badge className={getDataQualityBadge(integration.dataQuality)}>
                  {integration.dataQuality}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {integration.issues.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs font-semibold text-red-400 mb-2">Issues:</p>
                  <ul className="space-y-1">
                    {integration.issues.map((issue, idx) => (
                      <li key={idx} className="text-xs text-red-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2">
                {integration.status === "error" ? (
                  <Button
                    className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-white/10 bg-black/50 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-white/10 bg-black/50 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                {integration.status === "error" && (
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

