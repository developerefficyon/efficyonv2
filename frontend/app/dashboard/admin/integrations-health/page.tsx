"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Database,
  Server,
} from "lucide-react"

export default function IntegrationsHealthPage() {
  const integrations = [
    {
      name: "HubSpot",
      company: "Acme Corporation",
      status: "error",
      lastSync: "Failed",
      error: "OAuth refresh failure",
      action: "Needs reconnection",
      apiCalls: 1247,
      successRate: 98.5,
    },
    {
      name: "Slack",
      company: "TechStart Inc",
      status: "connected",
      lastSync: "15 minutes ago",
      error: null,
      action: "Healthy",
      apiCalls: 3421,
      successRate: 99.8,
    },
    {
      name: "Salesforce",
      company: "Global Solutions",
      status: "warning",
      lastSync: "2 hours ago",
      error: "Rate limit approaching",
      action: "Monitor closely",
      apiCalls: 892,
      successRate: 97.2,
    },
    {
      name: "Google Workspace",
      company: "Innovate Labs",
      status: "error",
      lastSync: "Failed",
      error: "API key revoked",
      action: "Needs reconnection",
      apiCalls: 0,
      successRate: 0,
    },
  ]

  const syncHistory = [
    {
      company: "Acme Corporation",
      tool: "HubSpot",
      time: "03:42",
      status: "failed",
      error: "Expired API key",
    },
    {
      company: "TechStart Inc",
      tool: "Slack",
      time: "04:15",
      status: "success",
      error: null,
    },
    {
      company: "Global Solutions",
      tool: "Salesforce",
      time: "04:30",
      status: "warning",
      error: "Rate limit warning",
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

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Integrations Health</h2>
        <p className="text-sm sm:text-base text-gray-400">
          Monitor API connections, sync status, and integration errors
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Connections</p>
                <p className="text-2xl font-bold text-white">1,247</p>
              </div>
              <Database className="w-8 h-8 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Healthy</p>
                <p className="text-2xl font-bold text-green-400">1,198</p>
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
                <p className="text-2xl font-bold text-red-400">32</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">API Calls Today</p>
                <p className="text-2xl font-bold text-blue-400">45.2K</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrations.map((integration, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  integration.status === "error"
                    ? "bg-red-500/10 border-red-500/30"
                    : integration.status === "warning"
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(integration.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{integration.name}</p>
                      <p className="text-xs text-gray-400 truncate">{integration.company}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Success Rate</p>
                    <p
                      className={`text-lg font-bold ${
                        integration.successRate >= 98
                          ? "text-green-400"
                          : integration.successRate >= 95
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {integration.successRate}%
                    </p>
                  </div>
                </div>
                {integration.error && (
                  <div className="mb-3 p-2 rounded bg-black/30 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium mb-1">Error:</p>
                    <p className="text-xs text-red-300">{integration.error}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-400 flex-wrap">
                    <span>Last sync: {integration.lastSync}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{integration.apiCalls.toLocaleString()} API calls</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {integration.status === "error" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-black/50 text-white"
                    >
                      View Logs
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sync History */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncHistory.map((sync, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  {sync.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : sync.status === "failed" ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {sync.company} - {sync.tool}
                    </p>
                    {sync.error && (
                      <p className="text-xs text-red-400 mt-1">{sync.error}</p>
                    )}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400">{sync.time}</p>
                  <Badge
                    className={
                      sync.status === "success"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : sync.status === "failed"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }
                  >
                    {sync.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

