"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, MessageSquare, Zap, GitCompare } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBackendToken } from "@/lib/auth-hooks"

// Tool icon mapping
const toolIcons: Record<string, string> = {
  fortnox: "F",
  "microsoft365": "M",
  "microsoft 365": "M",
  slack: "S",
  google: "G",
  hubspot: "H",
  salesforce: "SF",
}

export type ConnectedTool = {
  id: string
  provider: string
  status: string
  created_at: string
}

interface ToolChatTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

// Hook to fetch connected tools with caching
export function useConnectedTools() {
  const [tools, setTools] = useState<ConnectedTool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const cacheRef = useRef<{ tools: ConnectedTool[]; loadedAt: number } | null>(null)
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  const fetchTools = useCallback(async (forceRefresh = false) => {
    // Check cache first
    const now = Date.now()
    if (!forceRefresh && cacheRef.current && (now - cacheRef.current.loadedAt) < CACHE_TTL) {
      setTools(cacheRef.current.tools)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) return

      const response = await fetch(`${apiBase}/api/integrations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Filter only connected integrations
        const connectedTools = (data.integrations || []).filter(
          (tool: ConnectedTool) => tool.status === "connected"
        )

        // Update cache
        cacheRef.current = {
          tools: connectedTools,
          loadedAt: now,
        }

        setTools(connectedTools)
      }
    } catch (error) {
      console.error("Failed to fetch tools:", error)
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  return {
    tools,
    isLoading,
    refreshTools: () => fetchTools(true),
  }
}

// Get display name for a tool
function getToolDisplayName(provider: string): string {
  const displayNames: Record<string, string> = {
    fortnox: "Fortnox",
    microsoft365: "Microsoft 365",
    "microsoft 365": "Microsoft 365",
    slack: "Slack",
    google: "Google Workspace",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
  }
  return displayNames[provider.toLowerCase()] || provider
}

// Get tool icon letter
function getToolIcon(provider: string): string {
  return toolIcons[provider.toLowerCase()] || provider.charAt(0).toUpperCase()
}

// Get tool color
function getToolColor(provider: string): string {
  const colors: Record<string, string> = {
    fortnox: "from-green-500 to-emerald-600",
    microsoft365: "from-blue-500 to-indigo-600",
    "microsoft 365": "from-blue-500 to-indigo-600",
    slack: "from-purple-500 to-violet-600",
    google: "from-red-500 to-orange-500",
    hubspot: "from-orange-500 to-red-600",
    salesforce: "from-blue-400 to-cyan-500",
  }
  return colors[provider.toLowerCase()] || "from-gray-500 to-gray-600"
}

export function ToolChatTabs({ activeTab, onTabChange, className }: ToolChatTabsProps) {
  const { tools, isLoading } = useConnectedTools()

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 p-2", className)}>
        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
        <span className="text-sm text-gray-400">Loading tools...</span>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full h-auto flex-wrap gap-2 bg-transparent p-0 justify-start">
          {/* General Tab */}
          <TabsTrigger
            value="general"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              "data-[state=inactive]:bg-white/5 data-[state=inactive]:hover:bg-white/10",
              "data-[state=inactive]:border data-[state=inactive]:border-white/10",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-500/20",
              "data-[state=active]:border data-[state=active]:border-cyan-500/30",
              "text-sm font-medium"
            )}
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-gray-200">General</span>
          </TabsTrigger>

          {/* Tool Tabs */}
          {tools.map((tool) => (
            <TabsTrigger
              key={tool.id}
              value={tool.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                "data-[state=inactive]:bg-white/5 data-[state=inactive]:hover:bg-white/10",
                "data-[state=inactive]:border data-[state=inactive]:border-white/10",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-500/20",
                "data-[state=active]:border data-[state=active]:border-cyan-500/30",
                "text-sm font-medium"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                  getToolColor(tool.provider)
                )}
              >
                {getToolIcon(tool.provider)}
              </div>
              <span className="text-gray-200">{getToolDisplayName(tool.provider)}</span>
            </TabsTrigger>
          ))}

          {/* Comparison Tab - Only show when both Fortnox and Microsoft 365 are connected */}
          {(() => {
            const hasFortnox = tools.some(t => t.provider?.toLowerCase() === "fortnox")
            const hasMicrosoft365 = tools.some(t =>
              t.provider?.toLowerCase() === "microsoft365" ||
              t.provider?.toLowerCase() === "microsoft 365"
            )
            const showComparison = hasFortnox && hasMicrosoft365

            return showComparison ? (
              <TabsTrigger
                value="comparison"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                  "data-[state=inactive]:bg-white/5 data-[state=inactive]:hover:bg-white/10",
                  "data-[state=inactive]:border data-[state=inactive]:border-white/10",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-teal-500/20",
                  "data-[state=active]:border data-[state=active]:border-purple-500/30",
                  "text-sm font-medium"
                )}
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
                  <GitCompare className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-gray-200">Comparison</span>
              </TabsTrigger>
            ) : null
          })()}

          {/* No tools message */}
          {tools.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-2 text-gray-500 text-sm">
              <Zap className="w-4 h-4" />
              <span>Connect tools in the Tools page to chat with them</span>
            </div>
          )}
        </TabsList>
      </Tabs>
    </div>
  )
}

// Export types and helpers for use in chatbot page
export { getToolDisplayName, getToolColor, getToolIcon }
