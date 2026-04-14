"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Key, Clock, Timer, Shield, RefreshCw, CheckCircle, Copy } from "lucide-react"
import { toast } from "sonner"
import type { Integration } from "@/lib/tools/types"

interface OverviewTabProps {
  integration: Integration
}

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export function OverviewTab({ integration }: OverviewTabProps) {
  const tokens = integration.settings?.oauth_data?.tokens

  return (
    <div className="space-y-6">
      {/* Connection Details Card */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Connection Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Connection Type</p>
              <p className="text-white font-medium capitalize">{integration.connection_type || "N/A"}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
              <p className="text-white font-medium">{formatDate(integration.created_at)}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-white font-medium">{formatDate(integration.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Information Card */}
      {tokens && (
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Token Expires</p>
                </div>
                <p className="text-white font-medium">
                  {tokens.expires_at
                    ? new Date(tokens.expires_at * 1000).toLocaleString()
                    : "N/A"}
                </p>
                {tokens.expires_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(tokens.expires_at * 1000) > new Date()
                      ? <span className="text-emerald-400">Active</span>
                      : <span className="text-red-400">Expired</span>}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Token Duration</p>
                </div>
                <p className="text-white font-medium">
                  {tokens.expires_in
                    ? `${Math.floor(tokens.expires_in / 60)} minutes`
                    : "N/A"}
                </p>
                {tokens.expires_in && (
                  <p className="text-xs text-gray-500 mt-1">{tokens.expires_in} seconds</p>
                )}
              </div>
            </div>

            {tokens.access_token && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Access Token</p>
                  </div>
                  <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30">
                    {tokens.token_type || "bearer"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                    {String(tokens.access_token).substring(0, 50)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(tokens.access_token)
                      toast.success("Access token copied to clipboard")
                    }}
                    className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {tokens.refresh_token && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Refresh Token</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15">
                    Available
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                    {String(tokens.refresh_token).substring(0, 50)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(tokens.refresh_token)
                      toast.success("Refresh token copied to clipboard")
                    }}
                    className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {tokens.scope && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Scopes</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {String(tokens.scope).split(" ").filter(Boolean).map((scope: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs text-gray-300 border-white/20 bg-white/5">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
