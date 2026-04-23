"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  ExternalLink,
  Activity,
  Clock,
  Plug,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Trash2,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useTeamRole } from "@/lib/team-role-context"
import { ToolLogo } from "@/components/tools/tool-logos"
import { getCache, setCache } from "@/lib/use-api-cache"
import { toast } from "sonner"
import type { Integration as SharedIntegration } from "@/lib/tools/types"
import { ToolConnectForm } from "@/components/tools/tool-connect-form"
import { TOOL_REGISTRY, getToolConfig } from "@/lib/tools/registry"
import { useOAuthCallback } from "@/lib/tools/oauth-callback-handler"
import { startOAuthRedirect } from "@/lib/tools/start-oauth-redirect"

type Integration = SharedIntegration

interface Tool {
  id: string
  name: string
  category: string
  description: string
  connectedSince: string
  status: "connected" | "error" | "disconnected" | "expired" | "pending"
  lastSync: string
  issues: string[]
}

interface AvailableTool {
  id: string
  name: string
  category: string | null
  created_at: string
}

interface IntegrationLimits {
  current: number
  max: number
  canAddMore: boolean
  planTier: string
  planName: string
}

export default function ToolsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { canWrite } = useTeamRole()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const cachedIntegrations = getCache<{ integrations: Integration[]; limits: IntegrationLimits }>("integrations-data")
  const cachedTools = getCache<{ tools: AvailableTool[] }>("available-tools-data")
  const [integrations, setIntegrations] = useState<Integration[]>(cachedIntegrations?.integrations || [])
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>(cachedTools?.tools || [])
  const [integrationLimits, setIntegrationLimits] = useState<IntegrationLimits>(
    cachedIntegrations?.limits || {
      current: 0,
      max: 5,
      canAddMore: true,
      planTier: "startup",
      planName: "Startup",
    }
  )
  const [isLoading, setIsLoading] = useState(!cachedIntegrations)
  const [isLoadingTools, setIsLoadingTools] = useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<string>("")
  const [modalSearchQuery, setModalSearchQuery] = useState("")
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>("all")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const isLoadingIntegrationsRef = useRef(false)

  const loadTools = useCallback(async () => {
    try {
      setIsLoadingTools(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        setAvailableTools([])
        setIsLoadingTools(false)
        return
      }

      const res = await fetch(`${apiBase}/api/tools`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        // Handle 404 gracefully - endpoint might not exist yet or tools table might be empty
        if (res.status === 404) {
          console.log("Tools endpoint not found, using empty list")
          setAvailableTools([])
          setIsLoadingTools(false)
          return
        }
        console.error("Failed to load tools:", res.status)
        setAvailableTools([])
        setIsLoadingTools(false)
        return
      }

      const data = await res.json()
      const tools = data.tools || []
      setAvailableTools(tools)
      setCache("available-tools-data", { tools })
    } catch (error) {
      console.error("Error loading tools:", error)
      // Silently fail - tools list is optional
      setAvailableTools([])
    } finally {
      setIsLoadingTools(false)
    }
  }, [])

  const loadIntegrations = useCallback(async (force = false) => {
    // Prevent multiple simultaneous calls unless forced
    if (isLoadingIntegrationsRef.current && !force) {
      console.log("[loadIntegrations] Already loading, skipping duplicate call")
      return
    }

    isLoadingIntegrationsRef.current = true
    try {
      // Only show loading spinner if no cached data exists
      if (!getCache("integrations-data")) {
        setIsLoading(true)
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        console.warn("No access token available for loading integrations")
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        setIntegrations([])
        setIsLoading(false)
        isLoadingIntegrationsRef.current = false
        return
      }

      const res = await fetch(`${apiBase}/api/integrations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("Failed to load integrations:", res.status, errorText)
        throw new Error(`Failed to load integrations: ${res.status}`)
      }

      const data = await res.json()
      console.log("Integrations loaded:", data.integrations?.length || 0)
      const loadedIntegrations = data.integrations || []
      setIntegrations(loadedIntegrations)

      // Update integration limits from response
      if (data.limits) {
        const limits = {
          current: data.limits.current || 0,
          max: data.limits.max || 5,
          canAddMore: data.limits.canAddMore ?? true,
          planTier: data.limits.planTier || "startup",
          planName: data.limits.planName || "Startup",
        }
        setIntegrationLimits(limits)
      }

      // Save to cache for instant loading on revisit
      setCache("integrations-data", { integrations: loadedIntegrations, limits: data.limits || null })
    } catch (error) {
      console.error("Error loading integrations:", error)
      toast.error("Failed to load integrations", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      setIntegrations([])
    } finally {
      setIsLoading(false)
      isLoadingIntegrationsRef.current = false
    }
  }, [router])

  // OAuth callback handling is registry-driven — see lib/tools/oauth-callback-handler.
  useOAuthCallback({
    onSuccess: () => void loadIntegrations(true),
    onDone: () => setIsConnecting(false),
  })

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      setIsLoading(false)
      hasLoadedRef.current = false
      lastUserIdRef.current = null
      return
    }

    const currentUserId = user.id
    const userChanged = lastUserIdRef.current !== currentUserId

    if (userChanged) {
      lastUserIdRef.current = currentUserId
      hasLoadedRef.current = false
    }

    if (hasLoadedRef.current && !userChanged) {
      return
    }

    hasLoadedRef.current = true
    void loadIntegrations()
    void loadTools()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const handleSyncNow = async (integration: Integration) => {
    setSyncingId(integration.id)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required", {
          description: "Please log in again to sync.",
        })
        return
      }

      // Route to the correct sync endpoint for each tool
      const syncEndpoints: Record<string, string> = {
        Fortnox: "/api/integrations/fortnox/sync-customers",
        OpenAI: "/api/integrations/openai/sync",
        Anthropic: "/api/integrations/anthropic/sync",
        Gemini: "/api/integrations/gemini/sync",
      }
      const syncPath = syncEndpoints[integration.tool_name]
      if (!syncPath) {
        toast.error("Sync not available", {
          description: `Manual sync is not supported for ${integration.tool_name}.`,
        })
        setSyncingId(null)
        return
      }

      const res = await fetch(`${apiBase}${syncPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to sync")
      }

      const data = await res.json()

      toast.success("Synced successfully", {
        description: data.message || `${integration.tool_name} data refreshed.`,
        duration: 6000,
      })

      await loadIntegrations(true)
    } catch (error: any) {
      console.error("Error syncing:", error)
      toast.error("Failed to sync", {
        description: error.message || "An error occurred while syncing.",
      })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDeleteClick = (integration: Integration) => {
    setIntegrationToDelete(integration)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!integrationToDelete) return

    setIsDeleting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        setIsDeleting(false)
        return
      }

      const deleteUrl = `${apiBase}/api/integrations/${integrationToDelete.id}`

      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to delete integration")
      }

      toast.success("Integration deleted", {
        description: `${integrationToDelete.tool_name} has been removed. Reconnect anytime — your history is preserved.`,
      })

      setIsDeleteModalOpen(false)
      setIntegrationToDelete(null)
      await loadIntegrations(true)
    } catch (error: any) {
      console.error("Error deleting integration:", error)
      toast.error("Failed to delete integration", {
        description: error.message || "An error occurred while deleting.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Reconnect handler driven by the tool registry — only returns a handler for
  // OAuth tools that expose an oauth start endpoint.
  const getReconnectHandler = (integration: Integration) => {
    const cfg = getToolConfig(integration.tool_name)
    if (!cfg || cfg.authType !== "oauth" || !cfg.oauthStartEndpoint) return null
    return async () => {
      setReconnectingId(integration.id)
      const result = await startOAuthRedirect(cfg, { onUnauthenticated: () => router.push("/login") })
      if (!result.redirected) {
        setReconnectingId(null)
      }
    }
  }

  // Map integrations to tools format
  const tools: Tool[] = integrations.map((integration) => {
    const getCategory = (toolName: string): string => {
      const config = getToolConfig(toolName)
      return config?.category || "Other"
    }

    const getDescription = (toolName: string): string => {
      const config = getToolConfig(toolName)
      return config?.description || "Connected integration"
    }

    const getConnectedSince = (createdAt: string): string => {
      const date = new Date(createdAt)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    // Format last sync time
    const getLastSync = (updatedAt: string): string => {
      const updated = new Date(updatedAt)
      const now = new Date()
      const diffMs = now.getTime() - updated.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
      } else {
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
      }
    }

    // Generate issues based on status
    const getIssues = (status: string): string[] => {
      const issues: string[] = []
      if (status === "error") {
        issues.push("Connection error - needs reconnection")
      } else if (status === "expired") {
        issues.push("Token expired - please reconnect")
      } else if (status === "disconnected") {
        issues.push("Integration disconnected")
      } else if (status === "pending") {
        issues.push("Authorization pending - please complete OAuth flow")
      }
      return issues
    }

    return {
      id: integration.id,
      name: integration.tool_name,
      category: getCategory(integration.tool_name),
      description: getDescription(integration.tool_name),
      connectedSince: getConnectedSince(integration.created_at),
      status: integration.status as "connected" | "error" | "disconnected" | "expired" | "pending",
      lastSync: getLastSync(integration.updated_at),
      issues: getIssues(integration.status),
    }
  })

  // Tools are now mapped from integrations - no hardcoded data

  const getStatusIcon = (status: string) => {
    if (status === "connected") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[9px] h-[18px] px-1.5 rounded-full font-medium">
          Connected
        </Badge>
      )
    } else if (status === "error" || status === "expired") {
      return (
        <Badge className="bg-red-500/10 text-red-400/80 border-red-500/15 text-[9px] h-[18px] px-1.5 rounded-full font-medium">
          {status === "expired" ? "Expired" : "Error"}
        </Badge>
      )
    } else if (status === "pending") {
      return (
        <Badge className="bg-amber-500/10 text-amber-400/80 border-amber-500/15 text-[9px] h-[18px] px-1.5 rounded-full font-medium">
          Pending
        </Badge>
      )
    } else if (status === "disconnected") {
      return (
        <Badge className="bg-white/[0.06] text-white/40 border-white/[0.08] text-[9px] h-[18px] px-1.5 rounded-full font-medium">
          Disconnected
        </Badge>
      )
    }
    return (
      <Badge className="bg-white/[0.04] text-white/30 border-white/[0.06] text-[9px] h-[18px] px-1.5 rounded-full font-medium">
        Unknown
      </Badge>
    )
  }

  const categories = ["all", ...Array.from(new Set(tools.map((t) => t.category)))]
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || tool.category === filterCategory
    const matchesStatus = filterStatus === "all" || tool.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const healthyTools = tools.filter((t) => t.status === "connected").length
  const issueTools = tools.filter((t) => t.status === "error" || t.status === "expired" || t.status === "pending").length
  const slotsRemaining = integrationLimits.max === 999 ? null : integrationLimits.max - integrationLimits.current
  const lastActivity = tools.length > 0
    ? tools.reduce((latest, t) => {
        const tDate = new Date(integrations.find(i => i.id === t.id)?.updated_at || 0)
        return tDate > latest ? tDate : latest
      }, new Date(0))
    : null

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="animate-slide-up delay-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
              Tools & <span className="italic text-emerald-400/90">Integrations</span>
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-[14px] text-white/35">Manage connections and optimize costs</p>
              <Link
                href="/dashboard/tools/guide"
                className="inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Guide
              </Link>
            </div>
          </div>
          {canWrite && (
            <div className="flex flex-col items-end gap-1">
              <Button
                disabled={isLoading}
                className={`w-full sm:w-auto h-9 px-4 text-[13px] rounded-lg transition-all ${
                  isLoading || integrationLimits.canAddMore
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black font-medium disabled:opacity-50"
                    : "bg-white/[0.06] text-white/40 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!integrationLimits.canAddMore) {
                    toast.error("Integration limit reached", {
                      description: `Your ${integrationLimits.planName} plan allows up to ${integrationLimits.max} integrations. Upgrade your plan to connect more tools.`,
                    })
                    return
                  }
                  setIsConnectModalOpen(true)
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plug className="w-3.5 h-3.5 mr-1.5" />
                )}
                Connect Tool
              </Button>
              {!isLoading && !integrationLimits.canAddMore && (
                <p className="text-[11px] text-amber-400/70">Limit reached — upgrade to add more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Connected — with slots display */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-1">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Plug className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Connected</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-3xl font-semibold text-white tracking-tight">
                  {integrationLimits.current}
                  <span className="text-lg text-white/20 font-normal">/{integrationLimits.max === 999 ? "\u221E" : integrationLimits.max}</span>
                </p>
                <p className="text-[12px] text-white/25 mt-0.5">{integrationLimits.planName} plan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Healthy */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-2">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Healthy</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-3xl font-semibold text-emerald-400 tracking-tight">{healthyTools}</p>
                <p className="text-[12px] text-white/25 mt-0.5">
                  {tools.length > 0 ? `${Math.round((healthyTools / tools.length) * 100)}% uptime` : "No tools yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issues */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-3">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${issueTools > 0 ? "bg-red-500/10" : "bg-white/[0.04]"}`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${issueTools > 0 ? "text-red-400/70" : "text-white/20"}`} />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Issues</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div>
                <p className={`text-3xl font-semibold tracking-tight ${issueTools > 0 ? "text-red-400" : "text-white/40"}`}>{issueTools}</p>
                <p className="text-[12px] text-white/25 mt-0.5">
                  {issueTools > 0 ? "Action required" : "All clear"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Activity */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-4">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-white/30" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Last Activity</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-3xl font-semibold text-white tracking-tight">
                  {lastActivity ? (() => {
                    const diffMs = Date.now() - lastActivity.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMs / 3600000)
                    const diffDays = Math.floor(diffMs / 86400000)
                    if (diffMins < 1) return "Now"
                    if (diffMins < 60) return `${diffMins}m`
                    if (diffHours < 24) return `${diffHours}h`
                    return `${diffDays}d`
                  })() : "—"}
                </p>
                <p className="text-[12px] text-white/25 mt-0.5">
                  {lastActivity ? "ago" : "No activity yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Search and Filters ── */}
      <div className="animate-slide-up delay-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <Input
              type="search"
              name="tool-search"
              autoComplete="off"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20 text-[12px] rounded-lg focus:border-emerald-500/30 focus:bg-white/[0.05] transition-all"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40 h-9 bg-white/[0.03] border-white/[0.06] text-white/60 text-[12px] rounded-lg">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#141415] border-white/[0.08] rounded-lg">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">
                  {cat === "all" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36 h-9 bg-white/[0.03] border-white/[0.06] text-white/60 text-[12px] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#141415] border-white/[0.08] rounded-lg">
              <SelectItem value="all" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">All Status</SelectItem>
              <SelectItem value="connected" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Connected</SelectItem>
              <SelectItem value="error" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Error</SelectItem>
              <SelectItem value="expired" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Expired</SelectItem>
              <SelectItem value="pending" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Pending</SelectItem>
              <SelectItem value="disconnected" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Disconnected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tools Grid ── */}
      {isLoading ? (
        <div className="animate-scale-in">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
            <CardContent className="p-16">
              <div className="text-center">
                <div className="relative mx-auto w-12 h-12 mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                </div>
                <p className="text-[13px] text-white/30">Loading tools...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="animate-slide-up delay-5">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl" />
            <CardContent className="p-12 relative z-10">
              <div className="text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <Plug className="w-6 h-6 text-white/15" />
                </div>
                <h3 className="text-lg font-display text-white mb-2">
                  {integrations.length === 0 ? "No tools connected yet" : "No matching tools"}
                </h3>
                <p className="text-[13px] text-white/30 leading-relaxed mb-6">
                  {integrations.length === 0
                    ? canWrite
                      ? "Connect your first integration to start analyzing costs."
                      : "Ask your team owner to connect tools."
                    : "Try adjusting your search or filters."}
                </p>
                {integrations.length === 0 && canWrite && (
                  <Button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-5 text-[13px] rounded-lg"
                  >
                    <Plug className="w-3.5 h-3.5 mr-1.5" />
                    Connect Your First Tool
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-slide-up delay-6">
          {filteredTools.map((tool, index) => {
            const integration = integrations.find(i => i.id === tool.id)
            const reconnectHandler = integration ? getReconnectHandler(integration) : null

            return (
              <Card
                key={tool.id}
                className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift group relative overflow-hidden"
              >
                {/* Status accent line */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                  tool.status === "connected" ? "bg-emerald-400/40" :
                  tool.status === "error" || tool.status === "expired" ? "bg-red-400/40" :
                  tool.status === "pending" ? "bg-amber-400/40" : "bg-white/[0.06]"
                }`} />

                <CardContent className="p-4 pt-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <ToolLogo name={tool.name} size={36} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a] ${
                            tool.status === "connected" ? "bg-emerald-400" :
                            tool.status === "error" || tool.status === "expired" ? "bg-red-400" :
                            tool.status === "pending" ? "bg-amber-400" : "bg-white/15"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-white/85 truncate">{tool.name}</p>
                        <p className="text-[11px] text-white/25">{tool.category}</p>
                      </div>
                    </div>
                    {getStatusIcon(tool.status)}
                  </div>

                  {/* Description & connected date */}
                  <div className="mb-3">
                    <p className="text-[12px] text-white/40 leading-relaxed">{tool.description}</p>
                    <p className="text-[10px] text-white/20 mt-1.5">Connected {tool.connectedSince}</p>
                  </div>

                  {/* Issues */}
                  {tool.issues.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {tool.issues.map((issue, idx) => (
                        <div key={idx} className="text-[11px] text-amber-400/60 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/20">
                      <Activity className="w-3 h-3" />
                      <span>{tool.lastSync}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {canWrite && integration && (
                        <>
                          {reconnectHandler && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 px-2 text-[10px] rounded-md ${
                                tool.status === "expired" || tool.status === "error"
                                  ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                                  : "text-white/25 hover:text-white/60 hover:bg-white/[0.04]"
                              }`}
                              onClick={reconnectHandler}
                              disabled={reconnectingId === integration.id}
                            >
                              {reconnectingId === integration.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                              )}
                              {tool.status === "expired" || tool.status === "error" ? "Reconnect" : "Sync"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-white/15 hover:text-red-400/70 hover:bg-red-500/[0.05] rounded-md"
                            onClick={() => handleDeleteClick(integration)}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </Button>
                        </>
                      )}
                      <Link href={`/dashboard/tools/${tool.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-white/25 hover:text-white/60 hover:bg-white/[0.04] rounded-md"
                        >
                          Details <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Connect Tool Modal */}
      <Dialog
        open={isConnectModalOpen}
        onOpenChange={(open) => {
          setIsConnectModalOpen(open)
          if (open) {
            // Load tools when modal opens
            void loadTools()
          } else {
            setIsConnecting(false)
            setSelectedTool("")
            setModalSearchQuery("")
            setModalCategoryFilter("all")
          }
        }}
      >
        <DialogContent
          className="!bg-[#0c0c0e] !border-white/[0.06] text-white max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl premium-scrollbar !p-0 !block !gap-0"
          style={{
            scrollbarColor: 'rgba(255,255,255,0.06) transparent',
            width: 'min(calc(100vw - 2rem), 520px)',
            maxWidth: '520px',
            display: 'block',
          }}
        >
          {/* Ambient top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          {/* Header */}
          <div className="relative px-6 pt-7 pb-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Plug className="w-3 h-3 text-emerald-400/80" />
                </div>
                <DialogTitle className="text-[17px] font-semibold text-white/95 tracking-[-0.01em]">
                  {selectedTool
                    ? `Connect ${Object.values(TOOL_REGISTRY).find((c) => c.id === selectedTool)?.label || selectedTool}`
                    : "Connect New Tool"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-[12.5px] text-white/30 pl-[34px]">
                {selectedTool ? "Enter your credentials to authorize access" : "Select an integration to connect"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6">
            {/* Tool Picker with search + category filter */}
            {!selectedTool && (() => {
              const allTools = Object.values(TOOL_REGISTRY)
              const modalCategories = ["all", ...Array.from(new Set(allTools.map((t) => t.category)))]
              const query = modalSearchQuery.trim().toLowerCase()
              const filteredPickerTools = allTools.filter((tool) => {
                const matchesCategory = modalCategoryFilter === "all" || tool.category === modalCategoryFilter
                if (!matchesCategory) return false
                if (!query) return true
                return (
                  tool.label.toLowerCase().includes(query) ||
                  tool.category.toLowerCase().includes(query) ||
                  (tool.description?.toLowerCase().includes(query) ?? false)
                )
              })

              return (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                    <Input
                      type="search"
                      autoComplete="off"
                      placeholder="Search integrations..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-white/85 placeholder:text-white/25 text-[12.5px] rounded-lg focus:border-emerald-500/30 focus:bg-white/[0.05] transition-all"
                    />
                  </div>

                  {/* Category pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {modalCategories.map((cat) => {
                      const active = modalCategoryFilter === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setModalCategoryFilter(cat)}
                          className={`h-7 px-2.5 rounded-md text-[11px] font-medium tracking-wide transition-all border ${
                            active
                              ? "bg-emerald-500/[0.12] text-emerald-300/90 border-emerald-500/20"
                              : "bg-white/[0.02] text-white/40 border-white/[0.05] hover:text-white/70 hover:bg-white/[0.04] hover:border-white/[0.08]"
                          }`}
                        >
                          {cat === "all" ? "All" : cat}
                        </button>
                      )
                    })}
                  </div>

                  {/* Result list */}
                  <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredPickerTools.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
                          <Search className="w-4 h-4 text-white/20" />
                        </div>
                        <p className="text-[12.5px] text-white/40">No integrations match your search</p>
                        <button
                          type="button"
                          onClick={() => {
                            setModalSearchQuery("")
                            setModalCategoryFilter("all")
                          }}
                          className="mt-2 text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      filteredPickerTools.map((tool) => {
                        const alreadyConnected = integrations.some(
                          (i) => i.tool_name.toLowerCase().replace(/[\s\-_]+/g, '') === tool.id.replace(/[\s\-_]+/g, '')
                        )
                        return (
                          <button
                            key={tool.id}
                            onClick={() => !alreadyConnected && setSelectedTool(tool.id)}
                            disabled={alreadyConnected}
                            className={`group relative w-full flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-200 text-left ${
                              alreadyConnected
                                ? "border-white/[0.03] bg-white/[0.01] opacity-35 cursor-not-allowed"
                                : "border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.035] cursor-pointer"
                            }`}
                            style={!alreadyConnected ? { ["--tool-color" as string]: tool.brandColor } : undefined}
                          >
                            <ToolLogo name={tool.id} size={40} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-[13px] font-medium text-white/90 truncate">{tool.label}</p>
                                <span className="text-[10px] text-white/20 font-medium tracking-wide uppercase shrink-0">{tool.category}</span>
                              </div>
                              <p className="text-[11.5px] text-white/25 mt-0.5 truncate">{tool.description}</p>
                            </div>
                            {alreadyConnected ? (
                              <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400/50 font-medium bg-emerald-400/[0.06] px-2 py-1 rounded-md">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Connected
                              </span>
                            ) : (
                              <svg className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            )}
                            {!alreadyConnected && (
                              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${tool.brandColor}18, 0 0 24px -4px ${tool.brandColor}08` }} />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Selected tool: back button */}
            {selectedTool && (
              <div className="mb-5">
                <button
                  onClick={() => setSelectedTool("")}
                  className="group flex items-center gap-1.5 text-[11.5px] text-white/25 hover:text-white/50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                  Back to all integrations
                </button>
              </div>
            )}

            {selectedTool && (() => {
              const cfg = Object.values(TOOL_REGISTRY).find((c) => c.id === selectedTool)
              if (!cfg) return null
              return (
                <ToolConnectForm
                  config={cfg}
                  onCancel={() => {
                    setIsConnectModalOpen(false)
                    setSelectedTool("")
                  }}
                  onSuccess={() => {
                    setIsConnectModalOpen(false)
                    setSelectedTool("")
                    void loadIntegrations(true)
                  }}
                />
              )
            })()}
          </div>


          {/* Privacy & Terms Notice */}
          <div className="px-6 pb-5 pt-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/40 mt-0.5 shrink-0" />
              <p className="text-[10.5px] leading-[1.5] text-white/25">
                By connecting, you agree to our{" "}
                <Link href="/terms" target="_blank" className="text-emerald-400/50 hover:text-emerald-400/70 underline underline-offset-2 transition-colors">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-emerald-400/50 hover:text-emerald-400/70 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </Link>
                . Efficyon does not store, sell, or share your data. Your information is used solely for analysis purposes within your account.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium text-white">
              Delete {integrationToDelete?.tool_name}?
            </DialogTitle>
            <DialogDescription className="text-[13px] text-white/50 leading-relaxed">
              This will immediately:
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const cfg = integrationToDelete ? getToolConfig(integrationToDelete.tool_name) : undefined
            const revocation = cfg?.tokenRevocation

            return (
              <div className="space-y-3 py-2">
                <ul className="space-y-1.5 text-[12.5px] text-white/60 pl-4">
                  <li className="list-disc">Remove the integration from your dashboard</li>
                  <li className="list-disc">Delete stored credentials and OAuth tokens on our servers</li>
                  {revocation?.automated && (
                    <li className="list-disc">
                      Revoke the OAuth token with {cfg?.label || integrationToDelete?.tool_name}
                    </li>
                  )}
                </ul>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[11.5px] text-white/45 leading-relaxed">
                    Your usage history and past cost analyses will be preserved and will reappear
                    if you reconnect this tool later.
                  </p>
                </div>

                {revocation && !revocation.automated && revocation.manualStepsNote && (
                  <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                    <p className="text-[11.5px] text-amber-100/70 leading-relaxed">
                      {revocation.manualStepsNote}
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setIntegrationToDelete(null)
              }}
              className="border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500/90 hover:bg-red-500 text-white font-medium rounded-lg h-9 text-[13px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete integration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

