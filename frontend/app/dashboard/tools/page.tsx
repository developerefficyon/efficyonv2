"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  XCircle,
  ExternalLink,
  Settings,
  Activity,
  Clock,
  Plug,
  ShieldCheck,
  Zap,
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

interface Integration {
  id: string
  tool_name: string
  connection_type: string
  status: string
  created_at: string
  updated_at: string
  oauth_data?: {
    tokens?: {
      access_token?: string
      refresh_token?: string
      expires_at?: number
      expires_in?: number
      scope?: string
    }
  } | null
}

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const isLoadingIntegrationsRef = useRef(false)
  const [fortnoxForm, setFortnoxForm] = useState({
    clientId: "",
    clientSecret: "",
  })
  const [microsoft365Form, setMicrosoft365Form] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
  })
  const [hubspotForm, setHubspotForm] = useState({
    clientId: "",
    clientSecret: "",
    hubType: "sales",
    tier: "professional",
    paidSeats: "",
  })
  const [quickbooksForm, setQuickbooksForm] = useState({
    clientId: "",
    clientSecret: "",
  })
  const [shopifyForm, setShopifyForm] = useState({
    shopDomain: "",
    clientId: "",
    clientSecret: "",
  })
  const [openaiForm, setOpenaiForm] = useState({ apiKey: "" })
  const [anthropicForm, setAnthropicForm] = useState({ apiKey: "" })
  const [geminiForm, setGeminiForm] = useState({ serviceAccountJson: "", bigqueryTable: "" })
  const [googleWorkspaceForm, setGoogleWorkspaceForm] = useState({ clientId: "", clientSecret: "" })

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

  // Track if OAuth callback was just processed (need to force refresh data)
  const oauthCallbackProcessedRef = useRef(false)

  // Separate effect for OAuth callback handling - runs immediately regardless of auth state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const microsoft365Status = params.get("microsoft365")
    const hubspotStatus = params.get("hubspot")
    const quickbooksStatus = params.get("quickbooks")
    const shopifyStatus = params.get("shopify")
    const googleWorkspaceStatus = params.get("googleworkspace")

    if (googleWorkspaceStatus) {
      setIsConnecting(false)
      window.history.replaceState({}, "", window.location.pathname)
      oauthCallbackProcessedRef.current = true
      if (googleWorkspaceStatus === "connected") {
        toast.success("Google Workspace connected successfully!", {
          description: "Your Google Workspace integration is now active.",
          duration: 5000,
        })
      } else {
        toast.error("Failed to connect Google Workspace", {
          description: googleWorkspaceStatus.replace("error_", "").replace(/_/g, " "),
          duration: 10000,
        })
      }
    }

    // Handle Microsoft 365 OAuth callback immediately (before auth check)
    if (microsoft365Status) {
      setIsConnecting(false)
      window.history.replaceState({}, "", window.location.pathname)
      oauthCallbackProcessedRef.current = true // Mark that we need to refresh data

      if (microsoft365Status === "connected") {
        toast.success("Microsoft 365 connected successfully!", {
          description: "Your Microsoft 365 integration is now active.",
          duration: 5000,
        })
      } else {
        toast.error("Failed to connect Microsoft 365", {
          description: microsoft365Status.replace("error_", "").replace(/_/g, " "),
          duration: 10000,
        })
      }
    }

    // Handle HubSpot OAuth callback immediately (before auth check)
    if (hubspotStatus) {
      setIsConnecting(false)
      window.history.replaceState({}, "", window.location.pathname)
      oauthCallbackProcessedRef.current = true // Mark that we need to refresh data

      if (hubspotStatus === "connected") {
        toast.success("HubSpot connected successfully!", {
          description: "Your HubSpot integration is now active.",
          duration: 5000,
        })
      } else {
        // Get additional error details if available
        const errorDetails = params.get("details")
        const errorParam = params.get("error")
        let description = hubspotStatus === "error" ? "Connection failed" : hubspotStatus.replace("error_", "").replace(/_/g, " ")
        if (errorDetails) {
          description += `: ${decodeURIComponent(errorDetails)}`
        } else if (errorParam) {
          description += `: ${decodeURIComponent(errorParam)}`
        }

        console.error(`HubSpot OAuth error: status=${hubspotStatus}, details=${errorDetails || "none"}, error=${errorParam || "none"}`)

        toast.error("Failed to connect HubSpot", {
          description,
          duration: 10000,
        })
      }
    }

    // Handle QuickBooks OAuth callback immediately (before auth check)
    if (quickbooksStatus) {
      setIsConnecting(false)
      window.history.replaceState({}, "", window.location.pathname)
      oauthCallbackProcessedRef.current = true

      if (quickbooksStatus === "connected") {
        toast.success("QuickBooks connected successfully!", {
          description: "Your QuickBooks integration is now active.",
          duration: 5000,
        })
      } else {
        const errorDetails = params.get("details")
        const errorParam = params.get("error")
        let description = quickbooksStatus === "error" ? "Connection failed" : quickbooksStatus.replace("error_", "").replace(/_/g, " ")
        if (errorDetails) {
          description += `: ${decodeURIComponent(errorDetails)}`
        } else if (errorParam) {
          description += `: ${decodeURIComponent(errorParam)}`
        }

        console.error(`QuickBooks OAuth error: status=${quickbooksStatus}, details=${errorDetails || "none"}, error=${errorParam || "none"}`)

        toast.error("Failed to connect QuickBooks", {
          description,
          duration: 10000,
        })
      }
    }

    // Handle Shopify OAuth callback immediately (before auth check)
    if (shopifyStatus) {
      setIsConnecting(false)
      window.history.replaceState({}, "", window.location.pathname)
      oauthCallbackProcessedRef.current = true

      if (shopifyStatus === "connected") {
        toast.success("Shopify connected successfully!", {
          description: "Your Shopify integration is now active.",
          duration: 5000,
        })
      } else {
        const errorDetails = params.get("details")
        const errorParam = params.get("error")
        let description = shopifyStatus === "error" ? "Connection failed" : shopifyStatus.replace("error_", "").replace(/_/g, " ")
        if (errorDetails) {
          description += `: ${decodeURIComponent(errorDetails)}`
        } else if (errorParam) {
          description += `: ${decodeURIComponent(errorParam)}`
        }

        console.error(`Shopify OAuth error: status=${shopifyStatus}, details=${errorDetails || "none"}, error=${errorParam || "none"}`)

        toast.error("Failed to connect Shopify", {
          description,
          duration: 10000,
        })
      }
    }
  }, []) // Run once on mount

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

    // Check for OAuth callback result in URL params
    const params = new URLSearchParams(window.location.search)
    const fortnoxStatus = params.get("fortnox")
    const fortnoxError = params.get("error")
    const fortnoxErrorDesc = params.get("error_desc")

    if (fortnoxStatus || fortnoxError) {
      setIsConnecting(false)
      
      if (fortnoxStatus === "connected") {
        // Clean up URL immediately
        window.history.replaceState({}, "", window.location.pathname)
        toast.success("Fortnox connected successfully!", {
          description: "Your Fortnox integration is now active.",
          duration: 5000,
        })
        hasLoadedRef.current = true
        // Load integrations and tools, then ensure loading state is cleared
        loadIntegrations().then(() => {
          setIsLoading(false)
        }).catch(() => {
          setIsLoading(false)
        })
        loadTools().catch(() => {
          // Ignore errors
        })
        return
      } else if (fortnoxError || fortnoxStatus) {
        let errorMessage = "Failed to connect Fortnox"
        let errorDescription = fortnoxErrorDesc || "An unknown error occurred."
        
        if (fortnoxStatus) {
          switch (fortnoxStatus) {
            case "error_missing_code":
              errorDescription = "Missing authorization code from Fortnox. Please try again."
              break
            case "error_invalid_state":
              errorDescription = "Invalid authorization state. Please try reconnecting."
              break
            case "error_integration_not_found":
              errorDescription = "Fortnox integration not found. Please set up the integration again."
              break
            case "error_token":
              errorDescription = "Failed to exchange authorization code for tokens. Check your Client ID and Secret."
              break
            case "error_saving_tokens":
              errorDescription = "Failed to save tokens. Please try again."
              break
            default:
              errorDescription = fortnoxErrorDesc || "An error occurred during authorization."
          }
        }
        
        toast.error(errorMessage, {
          description: errorDescription,
          duration: 10000,
        })
        window.history.replaceState({}, "", window.location.pathname)
        hasLoadedRef.current = true
        // Load integrations and tools, then ensure loading state is cleared
        loadIntegrations().then(() => {
          setIsLoading(false)
        }).catch(() => {
          setIsLoading(false)
        })
        loadTools().catch(() => {
          // Ignore errors
        })
        return
      }
    }
    
    // Force refresh if OAuth callback was just processed, or if data hasn't been loaded yet
    const shouldForceRefresh = oauthCallbackProcessedRef.current
    if (hasLoadedRef.current && !userChanged && !shouldForceRefresh) {
      return
    }

    // Reset the OAuth callback flag
    if (oauthCallbackProcessedRef.current) {
      oauthCallbackProcessedRef.current = false
    }

    setIsConnecting(false)
    hasLoadedRef.current = true
    void loadIntegrations()
    void loadTools()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const startFortnoxOAuth = async (integrationId?: string) => {
    if (integrationId) setReconnectingId(integrationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const oauthRes = await fetch(`${apiBase}/api/integrations/fortnox/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start Fortnox OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Fortnox to authorize...", {
        description: "You'll be taken to Fortnox to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error starting Fortnox OAuth:", error)
      toast.error("Failed to start Fortnox OAuth", {
        description: error.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }

  const startMicrosoft365OAuth = async (integrationId?: string) => {
    if (integrationId) setReconnectingId(integrationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const oauthRes = await fetch(`${apiBase}/api/integrations/microsoft365/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start Microsoft 365 OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Microsoft to authorize...", {
        description: "You'll be taken to Microsoft to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error starting Microsoft 365 OAuth:", error)
      toast.error("Failed to start Microsoft 365 OAuth", {
        description: error.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }

  const handleConnectFortnox = async () => {
    if (!fortnoxForm.clientId || !fortnoxForm.clientSecret) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsConnecting(true)
    let createdIntegrationId: string | null = null
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "Fortnox",
              connection_type: "oauth",
              status: "pending",
              client_id: fortnoxForm.clientId,
              client_secret: fortnoxForm.clientSecret,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))

        // Handle integration limit error specifically
        if (res.status === 403 && errorData.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: errorData.message || `Your plan allows up to ${errorData.maxIntegrations} integrations.`,
          })
          // Refresh limits to ensure UI is in sync
          loadIntegrations()
          setIsConnecting(false)
          return
        }

        throw new Error(errorData.error || "Failed to connect Fortnox")
      }

      const resData = await res.json()
      createdIntegrationId = resData.integrations?.[0]?.id || null

      await new Promise(resolve => setTimeout(resolve, 200))

      const oauthRes = await fetch(`${apiBase}/api/integrations/fortnox/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Fortnox to authorize...", {
        description: "You'll be taken to Fortnox to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error connecting Fortnox:", error)
      toast.error("Failed to connect Fortnox", {
        description: error.message || "An error occurred.",
      })
      if (createdIntegrationId) {
        cleanupFailedIntegration(createdIntegrationId)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectMicrosoft365 = async () => {
    if (!microsoft365Form.tenantId || !microsoft365Form.clientId || !microsoft365Form.clientSecret) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsConnecting(true)
    let createdIntegrationId: string | null = null
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      // Save integration first
      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "Microsoft365",
              connection_type: "oauth",
              status: "pending",
              tenant_id: microsoft365Form.tenantId,
              client_id: microsoft365Form.clientId,
              client_secret: microsoft365Form.clientSecret,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))

        // Handle integration limit error specifically
        if (res.status === 403 && errorData.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: errorData.message || `Your plan allows up to ${errorData.maxIntegrations} integrations.`,
          })
          // Refresh limits to ensure UI is in sync
          loadIntegrations()
          setIsConnecting(false)
          return
        }

        throw new Error(errorData.error || "Failed to save Microsoft 365 configuration")
      }

      const resData = await res.json()
      createdIntegrationId = resData.integrations?.[0]?.id || null

      await new Promise(resolve => setTimeout(resolve, 200))

      // Start OAuth flow
      const oauthRes = await fetch(`${apiBase}/api/integrations/microsoft365/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Microsoft to authorize...", {
        description: "You'll be taken to Microsoft to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error connecting Microsoft 365:", error)
      toast.error("Failed to connect Microsoft 365", {
        description: error.message || "An error occurred.",
      })
      if (createdIntegrationId) {
        cleanupFailedIntegration(createdIntegrationId)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const startHubSpotOAuth = async (integrationId?: string) => {
    if (integrationId) setReconnectingId(integrationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const oauthRes = await fetch(`${apiBase}/api/integrations/hubspot/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start HubSpot OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to HubSpot to authorize...", {
        description: "You'll be taken to HubSpot to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error starting HubSpot OAuth:", error)
      toast.error("Failed to start HubSpot OAuth", {
        description: error.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }

  const startQuickBooksOAuth = async (integrationId?: string) => {
    if (integrationId) setReconnectingId(integrationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const oauthRes = await fetch(`${apiBase}/api/integrations/quickbooks/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start QuickBooks OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to QuickBooks to authorize...", {
        description: "You'll be taken to Intuit to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error starting QuickBooks OAuth:", error)
      toast.error("Failed to start QuickBooks OAuth", {
        description: error.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }

  const startShopifyOAuth = async (integrationId?: string) => {
    if (integrationId) setReconnectingId(integrationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const oauthRes = await fetch(`${apiBase}/api/integrations/shopify/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start Shopify OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Shopify to authorize...", {
        description: "You'll be taken to Shopify to install the app.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error starting Shopify OAuth:", error)
      toast.error("Failed to start Shopify OAuth", {
        description: error.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }

  const handleConnectHubSpot = async () => {
    if (!hubspotForm.clientId || !hubspotForm.clientSecret) {
      toast.error("Please fill in all required fields")
      return
    }

    let paidSeatsNum: number | null = null
    if (hubspotForm.paidSeats) {
      paidSeatsNum = parseInt(hubspotForm.paidSeats, 10)
      if (isNaN(paidSeatsNum) || paidSeatsNum < 1) {
        toast.error("Please enter a valid number of paid seats")
        return
      }
    }

    setIsConnecting(true)
    let createdIntegrationId: string | null = null
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      // Save integration first
      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "HubSpot",
              connection_type: "oauth",
              status: "pending",
              client_id: hubspotForm.clientId,
              client_secret: hubspotForm.clientSecret,
              pricing: {
                hub_type: hubspotForm.hubType,
                tier: hubspotForm.tier,
                ...(paidSeatsNum ? { paid_seats: paidSeatsNum } : {}),
              },
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))

        // Handle integration limit error specifically
        if (res.status === 403 && errorData.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: errorData.message || `Your plan allows up to ${errorData.maxIntegrations} integrations.`,
          })
          // Refresh limits to ensure UI is in sync
          loadIntegrations()
          setIsConnecting(false)
          return
        }

        throw new Error(errorData.error || "Failed to save HubSpot configuration")
      }

      const resData = await res.json()
      createdIntegrationId = resData.integrations?.[0]?.id || null

      await new Promise(resolve => setTimeout(resolve, 200))

      // Start OAuth flow
      const oauthRes = await fetch(`${apiBase}/api/integrations/hubspot/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to HubSpot to authorize...", {
        description: "You'll be taken to HubSpot to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error connecting HubSpot:", error)
      toast.error("Failed to connect HubSpot", {
        description: error.message || "An error occurred.",
      })
      if (createdIntegrationId) {
        cleanupFailedIntegration(createdIntegrationId)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectQuickBooks = async () => {
    if (!quickbooksForm.clientId || !quickbooksForm.clientSecret) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsConnecting(true)
    let createdIntegrationId: string | null = null
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "QuickBooks",
              connection_type: "oauth",
              status: "pending",
              client_id: quickbooksForm.clientId,
              client_secret: quickbooksForm.clientSecret,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        if (res.status === 403 && errorData.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: errorData.message || `Your plan allows up to ${errorData.maxIntegrations} integrations.`,
          })
          loadIntegrations()
          setIsConnecting(false)
          return
        }
        throw new Error(errorData.error || "Failed to save QuickBooks configuration")
      }

      const resData = await res.json()
      createdIntegrationId = resData.integrations?.[0]?.id || null

      await new Promise(resolve => setTimeout(resolve, 200))

      const oauthRes = await fetch(`${apiBase}/api/integrations/quickbooks/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to QuickBooks to authorize...", {
        description: "You'll be taken to Intuit to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error connecting QuickBooks:", error)
      toast.error("Failed to connect QuickBooks", {
        description: error.message || "An error occurred.",
      })
      if (createdIntegrationId) {
        cleanupFailedIntegration(createdIntegrationId)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectShopify = async () => {
    if (!shopifyForm.shopDomain || !shopifyForm.clientId || !shopifyForm.clientSecret) {
      toast.error("Please fill in all required fields")
      return
    }

    // Normalize shop domain
    let shopDomain = shopifyForm.shopDomain.trim()
    if (!shopDomain.includes(".myshopify.com")) {
      shopDomain = `${shopDomain}.myshopify.com`
    }

    setIsConnecting(true)
    let createdIntegrationId: string | null = null
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "Shopify",
              connection_type: "oauth",
              status: "pending",
              client_id: shopifyForm.clientId,
              client_secret: shopifyForm.clientSecret,
              shop_domain: shopDomain,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        if (res.status === 403 && errorData.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: errorData.message || `Your plan allows up to ${errorData.maxIntegrations} integrations.`,
          })
          loadIntegrations()
          setIsConnecting(false)
          return
        }
        throw new Error(errorData.error || "Failed to save Shopify configuration")
      }

      const resData = await res.json()
      createdIntegrationId = resData.integrations?.[0]?.id || null

      await new Promise(resolve => setTimeout(resolve, 200))

      const oauthRes = await fetch(`${apiBase}/api/integrations/shopify/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Shopify to authorize...", {
        description: "You'll be taken to Shopify to install the app.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error connecting Shopify:", error)
      toast.error("Failed to connect Shopify", {
        description: error.message || "An error occurred.",
      })
      if (createdIntegrationId) {
        cleanupFailedIntegration(createdIntegrationId)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectOpenAI = async () => {
    const apiKey = openaiForm.apiKey.trim()
    if (!apiKey) {
      toast.error("Please paste your OpenAI Admin API key")
      return
    }
    if (!apiKey.startsWith("sk-admin-")) {
      toast.error("That looks like a regular API key", {
        description: "OpenAI cost analysis requires an Admin key (starts with sk-admin-).",
      })
      return
    }

    setIsConnecting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations/openai/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ api_key: apiKey }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect OpenAI")
      }

      toast.success("OpenAI connected", {
        description: "Backfilling 90 days of usage in the background…",
      })
      setOpenaiForm({ apiKey: "" })
      setSelectedTool("")
      setIsConnectModalOpen(false)
      await loadIntegrations()
    } catch (err: any) {
      toast.error("Failed to connect OpenAI", { description: err.message })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectAnthropic = async () => {
    const apiKey = anthropicForm.apiKey.trim()
    if (!apiKey) {
      toast.error("Please paste your Anthropic Admin API key")
      return
    }
    if (!apiKey.startsWith("sk-ant-admin")) {
      toast.error("That looks like a regular API key", {
        description: "Anthropic cost analysis requires an Admin key (starts with sk-ant-admin01-).",
      })
      return
    }

    setIsConnecting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations/anthropic/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ api_key: apiKey }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Anthropic")
      }

      toast.success("Anthropic connected", {
        description: "Backfilling 90 days of usage in the background…",
      })
      setAnthropicForm({ apiKey: "" })
      setSelectedTool("")
      setIsConnectModalOpen(false)
      await loadIntegrations()
    } catch (err: any) {
      toast.error("Failed to connect Anthropic", { description: err.message })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectGoogleWorkspace = async () => {
    if (!googleWorkspaceForm.clientId || !googleWorkspaceForm.clientSecret) {
      toast.error("Please fill in Client ID and Client Secret")
      return
    }

    setIsConnecting(true)
    let createdIntegrationId: string | null = null
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      // Save credentials first (status=pending), then trigger OAuth
      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "GoogleWorkspace",
              connection_type: "oauth",
              status: "pending",
              client_id: googleWorkspaceForm.clientId,
              client_secret: googleWorkspaceForm.clientSecret,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        if (res.status === 403 && errorData.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: errorData.message || `Your plan allows up to ${errorData.maxIntegrations} integrations.`,
          })
          loadIntegrations()
          setIsConnecting(false)
          return
        }
        throw new Error(errorData.error || "Failed to save Google Workspace configuration")
      }

      const resData = await res.json()
      createdIntegrationId = resData.integrations?.[0]?.id || null

      await new Promise((resolve) => setTimeout(resolve, 200))

      const oauthRes = await fetch(`${apiBase}/api/integrations/googleworkspace/oauth/start`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      })
      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start OAuth")
      }
      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url
      if (!redirectUrl) throw new Error("No OAuth URL returned from backend")

      toast.success("Redirecting to Google to authorize...", {
        description: "You'll be taken to Google to grant access.",
      })
      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error connecting Google Workspace:", error)
      toast.error("Failed to connect Google Workspace", {
        description: error.message || "An error occurred.",
      })
      if (createdIntegrationId) {
        cleanupFailedIntegration(createdIntegrationId)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectGemini = async () => {
    const json = geminiForm.serviceAccountJson.trim()
    if (!json) {
      toast.error("Please paste your service account JSON")
      return
    }
    // Basic shape check before sending — backend re-validates against Google
    try {
      const parsed = JSON.parse(json)
      if (parsed.type !== "service_account" || !parsed.private_key || !parsed.client_email) {
        toast.error("That doesn't look like a service account JSON", {
          description: "It must include type='service_account', private_key, and client_email.",
        })
        return
      }
    } catch {
      toast.error("Invalid JSON", { description: "Could not parse the pasted text as JSON." })
      return
    }

    setIsConnecting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations/gemini/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          service_account_json: json,
          bigquery_table: geminiForm.bigqueryTable.trim() || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Gemini")
      }

      toast.success("Gemini connected", {
        description: geminiForm.bigqueryTable
          ? "Backfilling 90 days of usage from BigQuery export…"
          : "Backfilling 90 days of usage from Cloud Monitoring (estimated cost)…",
      })
      setGeminiForm({ serviceAccountJson: "", bigqueryTable: "" })
      setSelectedTool("")
      setIsConnectModalOpen(false)
      await loadIntegrations()
    } catch (err: any) {
      toast.error("Failed to connect Gemini", { description: err.message })
    } finally {
      setIsConnecting(false)
    }
  }

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

  // Silently delete a pending integration that failed OAuth
  const cleanupFailedIntegration = async (integrationId: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) return
      await fetch(`${apiBase}/api/integrations/${integrationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      loadIntegrations()
    } catch {
      // Silent cleanup - don't bother the user
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

      const isHubSpot = integrationToDelete.tool_name?.toLowerCase() === "hubspot"
      toast.success("Integration deleted successfully", {
        description: isHubSpot
          ? `${integrationToDelete.tool_name} has been removed and disconnected. You'll need to re-authorize when reconnecting.`
          : `${integrationToDelete.tool_name} has been removed from your account.`,
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

  // Map integrations to tools format
  const tools: Tool[] = integrations.map((integration) => {
    // Determine category based on tool name (can be enhanced with actual category from tools table)
    const getCategory = (toolName: string): string => {
      const name = toolName.toLowerCase()
      if (name.includes("slack") || name.includes("zoom") || name.includes("teams")) {
        return "Communication"
      }
      if (name.includes("jira") || name.includes("asana") || name.includes("trello")) {
        return "Project Management"
      }
      if (name.includes("hubspot") || name.includes("salesforce") || name.includes("crm")) {
        return "CRM/Marketing"
      }
      if (name.includes("openai") || name.includes("anthropic") || name.includes("gemini")) {
        return "AI"
      }
      if (name.includes("shopify")) {
        return "E-Commerce"
      }
      if (name.includes("notion") || name.includes("workspace") || name.includes("office")) {
        return "Productivity"
      }
      if (name.includes("microsoft") || name.includes("365") || name.includes("m365")) {
        return "Productivity"
      }
      if (name.includes("fortnox") || name.includes("quickbooks") || name.includes("xero")) {
        return "Finance"
      }
      return "Other"
    }

    const getDescription = (toolName: string): string => {
      const name = toolName.toLowerCase()
      if (name.includes("fortnox")) return "Invoices, suppliers & accounting data"
      if (name.includes("quickbooks")) return "Bills, expenses & financial reports"
      if (name.includes("hubspot")) return "Contacts, deals & marketing data"
      if (name.includes("microsoft") || name.includes("365")) return "Users, licenses & productivity tools"
      if (name.includes("shopify")) return "Products, orders & customer data"
      if (name.includes("openai")) return "ChatGPT API spend & cost analysis"
      if (name.includes("anthropic")) return "Claude API spend & cost analysis"
      if (name.includes("gemini")) return "Google Gemini API spend & cost analysis"
      if (name.includes("googleworkspace")) return "Users, licenses & directory data"
      if (name.includes("slack")) return "Channels, users & messaging data"
      if (name.includes("salesforce")) return "CRM contacts, leads & opportunities"
      return "Connected integration"
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

            // Determine which reconnect handler to use
            const getReconnectHandler = () => {
              if (!integration) return null
              const name = integration.tool_name
              if (name === "Fortnox") return () => startFortnoxOAuth(integration.id)
              if (name === "Microsoft365") return () => startMicrosoft365OAuth(integration.id)
              if (name === "HubSpot") return () => startHubSpotOAuth(integration.id)
              if (name === "QuickBooks") return () => startQuickBooksOAuth(integration.id)
              if (name === "Shopify") return () => startShopifyOAuth(integration.id)
              return null
            }
            const reconnectHandler = getReconnectHandler()

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
            setFortnoxForm({ clientId: "", clientSecret: "" })
            setMicrosoft365Form({ tenantId: "", clientId: "", clientSecret: "" })
            setHubspotForm({ clientId: "", clientSecret: "", hubType: "sales", tier: "professional", paidSeats: "" })
            setQuickbooksForm({ clientId: "", clientSecret: "" })
            setShopifyForm({ shopDomain: "", clientId: "", clientSecret: "" })
            setOpenaiForm({ apiKey: "" })
            setAnthropicForm({ apiKey: "" })
            setGeminiForm({ serviceAccountJson: "", bigqueryTable: "" })
            setGoogleWorkspaceForm({ clientId: "", clientSecret: "" })
          }
        }}
      >
        <DialogContent className="!bg-[#0c0c0e] !border-white/[0.06] text-white w-[95vw] max-w-[520px] sm:w-full max-h-[90vh] overflow-y-auto rounded-2xl premium-scrollbar p-0 overflow-hidden" style={{ scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
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
                  {selectedTool ? (() => {
                    const names: Record<string, string> = { fortnox: "Fortnox", microsoft365: "Microsoft 365", hubspot: "HubSpot", quickbooks: "QuickBooks", shopify: "Shopify", openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini", googleworkspace: "Google Workspace" }
                    return `Connect ${names[selectedTool] || selectedTool}`
                  })() : "Connect New Tool"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-[12.5px] text-white/30 pl-[34px]">
                {selectedTool ? "Enter your credentials to authorize access" : "Select an integration to connect"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6">
            {/* Tool Picker Grid */}
            {!selectedTool && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {[
                  { id: "fortnox", name: "Fortnox", desc: "Invoices, suppliers & accounting", category: "Finance", color: "#2DB250" },
                  { id: "microsoft365", name: "Microsoft 365", desc: "Users, licenses & productivity tools", category: "Productivity", color: "#0078D4" },
                  { id: "hubspot", name: "HubSpot", desc: "Contacts, deals & marketing data", category: "CRM", color: "#FF7A59" },
                  { id: "quickbooks", name: "QuickBooks", desc: "Bills, expenses & financial reports", category: "Finance", color: "#2CA01C" },
                  { id: "shopify", name: "Shopify", desc: "Products, orders & customer data", category: "E-Commerce", color: "#95BF47" },
                  { id: "openai", name: "OpenAI", desc: "ChatGPT API spend & cost analysis", category: "AI", color: "#10A37F" },
                  { id: "anthropic", name: "Anthropic", desc: "Claude API spend & cost analysis", category: "AI", color: "#D97757" },
                  { id: "gemini", name: "Gemini", desc: "Google Gemini API spend & cost analysis", category: "AI", color: "#4285F4" },
                  { id: "googleworkspace", name: "Google Workspace", desc: "Users, licenses & directory data", category: "Productivity", color: "#4285F4" },
                ].map((tool) => {
                  const alreadyConnected = integrations.some(
                    (i) => i.tool_name.toLowerCase().replace(/\s+/g, '') === tool.id.replace(/\s+/g, '')
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
                      style={!alreadyConnected ? { ["--tool-color" as string]: tool.color } : undefined}
                    >
                      <ToolLogo name={tool.id} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-white/90">{tool.name}</p>
                          <span className="text-[10px] text-white/20 font-medium tracking-wide uppercase">{tool.category}</span>
                        </div>
                        <p className="text-[11.5px] text-white/25 mt-0.5 truncate">{tool.desc}</p>
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
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${tool.color}18, 0 0 24px -4px ${tool.color}08` }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

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

            {selectedTool === "fortnox" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="client-id" className="text-white/50 text-[12px] font-medium">
                    Client ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="client-id"
                    type="text"
                    placeholder="Enter your Fortnox Client ID"
                    value={fortnoxForm.clientId}
                    onChange={(e) =>
                      setFortnoxForm({ ...fortnoxForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-secret" className="text-white/50 text-[12px] font-medium">
                    Client Secret <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="client-secret"
                    type="password"
                    placeholder="Enter your Fortnox Client Secret"
                    value={fortnoxForm.clientSecret}
                    onChange={(e) =>
                      setFortnoxForm({ ...fortnoxForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Log into developer.fortnox.se and create an app</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Set the redirect URI provided during onboarding</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Copy the Client ID and Client Secret here</li>
                  </ol>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                    <p className="text-[10px] text-white/15 font-mono truncate mr-2">companyinformation, customer, invoice, supplier...</p>
                    <Link
                      href="/dashboard/tools/guide#fortnox"
                      onClick={() => setIsConnectModalOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400/50 hover:text-emerald-400/80 transition-colors shrink-0"
                    >
                      <BookOpen className="w-3 h-3" />
                      Guide
                    </Link>
                  </div>
                </div>

                {/* Read-only enforcement tip */}
                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-emerald-500/[0.02] to-emerald-500/[0.005] border border-emerald-500/[0.08] mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/[0.08] flex items-center justify-center">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400/50" />
                    </div>
                    <p className="text-[11.5px] font-medium text-emerald-400/50">Read-Only Guarantee</p>
                  </div>
                  <p className="text-[11px] text-white/25 leading-relaxed pl-6">
                    Effycion only reads data — we never write to Fortnox. For extra security, activate this integration with a user that has the <span className="text-white/40 font-medium">Fortnox Läs</span> (Read) license. Fortnox will then enforce read-only at the API level.{" "}
                    <Link
                      href="/dashboard/tools/guide#fortnox"
                      onClick={() => setIsConnectModalOpen(false)}
                      className="text-emerald-400/50 hover:text-emerald-400/80 transition-colors"
                    >
                      Learn more
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {selectedTool === "microsoft365" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="m365-tenant-id" className="text-white/50 text-[12px] font-medium">
                    Tenant ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="m365-tenant-id"
                    type="text"
                    placeholder="Your Azure AD Tenant ID or domain"
                    value={microsoft365Form.tenantId}
                    onChange={(e) =>
                      setMicrosoft365Form({ ...microsoft365Form, tenantId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="m365-client-id" className="text-white/50 text-[12px] font-medium">
                    Client ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="m365-client-id"
                    type="text"
                    placeholder="Azure AD Application (client) ID"
                    value={microsoft365Form.clientId}
                    onChange={(e) =>
                      setMicrosoft365Form({ ...microsoft365Form, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="m365-client-secret" className="text-white/50 text-[12px] font-medium">
                    Client Secret <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="m365-client-secret"
                    type="password"
                    placeholder="Azure AD Client Secret"
                    value={microsoft365Form.clientSecret}
                    onChange={(e) =>
                      setMicrosoft365Form({ ...microsoft365Form, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Go to Azure Portal &gt; App registrations, create a new app</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Add API permissions: User.Read.All, Directory.Read.All, AuditLog.Read.All</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Grant admin consent, then create a Client Secret</li>
                  </ol>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                    <p className="text-[10px] text-white/15 font-mono">Requires admin consent</p>
                    <Link
                      href="/dashboard/tools/guide#microsoft365"
                      onClick={() => setIsConnectModalOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400/50 hover:text-emerald-400/80 transition-colors shrink-0"
                    >
                      <BookOpen className="w-3 h-3" />
                      Guide
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {selectedTool === "hubspot" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hubspot-client-id" className="text-white/50 text-[12px] font-medium">
                    Client ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="hubspot-client-id"
                    type="text"
                    placeholder="Your HubSpot App Client ID"
                    value={hubspotForm.clientId}
                    onChange={(e) =>
                      setHubspotForm({ ...hubspotForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hubspot-client-secret" className="text-white/50 text-[12px] font-medium">
                    Client Secret <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="hubspot-client-secret"
                    type="password"
                    placeholder="Your HubSpot App Client Secret"
                    value={hubspotForm.clientSecret}
                    onChange={(e) =>
                      setHubspotForm({ ...hubspotForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[12px] font-medium text-white/40">Pricing Info</p>
                    <span className="text-[10px] text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded">Optional</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="hubspot-hub-type" className="text-white/50 text-[12px] font-medium">
                        Primary Hub
                      </Label>
                      <select
                        id="hubspot-hub-type"
                        value={hubspotForm.hubType}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, hubType: e.target.value })
                        }
                        className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-lg px-3 py-2.5 text-[13px] focus:border-emerald-500/30 outline-none transition-all"
                      >
                        <option value="starter_platform">Starter Customer Platform (All Hubs)</option>
                        <option value="marketing">Marketing Hub</option>
                        <option value="sales">Sales Hub</option>
                        <option value="service">Service Hub</option>
                        <option value="content">Content Hub</option>
                        <option value="operations">Operations Hub</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="hubspot-tier" className="text-white/50 text-[12px] font-medium">
                        Plan Tier
                      </Label>
                      <select
                        id="hubspot-tier"
                        value={hubspotForm.tier}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, tier: e.target.value })
                        }
                        className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-lg px-3 py-2.5 text-[13px] focus:border-emerald-500/30 outline-none transition-all"
                      >
                        <option value="starter">Starter ($15-20/seat)</option>
                        <option value="professional">Professional ($50-100/seat)</option>
                        <option value="enterprise">Enterprise ($75-150/seat)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="hubspot-seats" className="text-white/50 text-[12px] font-medium">
                        Paid Seats
                      </Label>
                      <Input
                        id="hubspot-seats"
                        type="number"
                        min="1"
                        placeholder="Auto-detected after connection"
                        value={hubspotForm.paidSeats}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, paidSeats: e.target.value })
                        }
                        className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Go to HubSpot &gt; Settings &gt; Integrations &gt; Private Apps</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Create app with required scopes</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Copy the Client ID and Client Secret here</li>
                  </ol>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                    <p className="text-[10px] text-white/15 font-mono truncate mr-2">settings.users.read, account-info.security.read...</p>
                    <Link
                      href="/dashboard/tools/guide#hubspot"
                      onClick={() => setIsConnectModalOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400/50 hover:text-emerald-400/80 transition-colors shrink-0"
                    >
                      <BookOpen className="w-3 h-3" />
                      Guide
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {selectedTool === "quickbooks" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qb-client-id" className="text-white/50 text-[12px] font-medium">
                    Client ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="qb-client-id"
                    type="text"
                    placeholder="Your QuickBooks App Client ID"
                    value={quickbooksForm.clientId}
                    onChange={(e) =>
                      setQuickbooksForm({ ...quickbooksForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qb-client-secret" className="text-white/50 text-[12px] font-medium">
                    Client Secret <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="qb-client-secret"
                    type="password"
                    placeholder="Your QuickBooks App Client Secret"
                    value={quickbooksForm.clientSecret}
                    onChange={(e) =>
                      setQuickbooksForm({ ...quickbooksForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Go to developer.intuit.com and create an app</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Select &quot;Accounting&quot; scope</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Add redirect URI: your backend callback URL</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">04</span>Copy Client ID and Client Secret here</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedTool === "shopify" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shopify-shop" className="text-white/50 text-[12px] font-medium">
                    Shop Domain <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="shopify-shop"
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={shopifyForm.shopDomain}
                    onChange={(e) =>
                      setShopifyForm({ ...shopifyForm, shopDomain: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                  <p className="text-[10.5px] text-white/15">
                    e.g., my-store or my-store.myshopify.com
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shopify-client-id" className="text-white/50 text-[12px] font-medium">
                    Client ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="shopify-client-id"
                    type="text"
                    placeholder="Your Shopify App API Key"
                    value={shopifyForm.clientId}
                    onChange={(e) =>
                      setShopifyForm({ ...shopifyForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shopify-client-secret" className="text-white/50 text-[12px] font-medium">
                    Client Secret <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="shopify-client-secret"
                    type="password"
                    placeholder="Your Shopify App API Secret Key"
                    value={shopifyForm.clientSecret}
                    onChange={(e) =>
                      setShopifyForm({ ...shopifyForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Go to partners.shopify.com and create an app</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Set redirect URL to your backend callback URL</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Copy the API Key and API Secret Key</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedTool === "openai" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="openai-admin-key" className="text-white/50 text-[12px] font-medium">
                    Admin API Key <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="openai-admin-key"
                    name="openai-admin-key"
                    type="password"
                    placeholder="sk-admin-..."
                    value={openaiForm.apiKey}
                    onChange={(e) => setOpenaiForm({ apiKey: e.target.value })}
                    autoComplete="new-password"
                    data-1p-ignore
                    data-lpignore="true"
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                  <p className="text-[10.5px] text-white/15">
                    Must start with <code>sk-admin-</code>. Regular project keys won&apos;t work.
                  </p>
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Go to platform.openai.com → Organization → Admin keys</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Create a new Admin key with billing read access</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Paste it here — we&apos;ll backfill 90 days of usage</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedTool === "googleworkspace" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gw-client-id" className="text-white/50 text-[12px] font-medium">
                    Client ID <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="gw-client-id"
                    name="gw-client-id"
                    type="text"
                    placeholder="123456789-xxxxxxx.apps.googleusercontent.com"
                    value={googleWorkspaceForm.clientId}
                    onChange={(e) => setGoogleWorkspaceForm({ ...googleWorkspaceForm, clientId: e.target.value })}
                    autoComplete="off"
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gw-client-secret" className="text-white/50 text-[12px] font-medium">
                    Client Secret <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="gw-client-secret"
                    name="gw-client-secret"
                    type="password"
                    placeholder="GOCSPX-..."
                    value={googleWorkspaceForm.clientSecret}
                    onChange={(e) => setGoogleWorkspaceForm({ ...googleWorkspaceForm, clientSecret: e.target.value })}
                    autoComplete="new-password"
                    data-1p-ignore
                    data-lpignore="true"
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>In Google Cloud Console, create an OAuth 2.0 Client ID (type: Web application)</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Add the Effycion callback URL as an authorized redirect URI</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Enable Admin SDK API in the same project; sign in as a Workspace admin when prompted</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">04</span>Paste Client ID and Client Secret here</li>
                  </ol>
                  <p className="text-[10.5px] text-white/15 mt-2.5">
                    Required scopes: <code className="text-white/30">admin.directory.user.readonly</code>, <code className="text-white/30">admin.directory.customer.readonly</code>
                  </p>
                </div>
              </div>
            )}

            {selectedTool === "gemini" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gemini-sa-json" className="text-white/50 text-[12px] font-medium">
                    Service Account JSON <span className="text-red-400/70">*</span>
                  </Label>
                  <textarea
                    id="gemini-sa-json"
                    name="gemini-sa-json"
                    placeholder='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----..."}'
                    value={geminiForm.serviceAccountJson}
                    onChange={(e) => setGeminiForm({ ...geminiForm, serviceAccountJson: e.target.value })}
                    autoComplete="off"
                    spellCheck={false}
                    rows={6}
                    className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 text-[11px] font-mono rounded-lg p-3 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all resize-y"
                  />
                  <p className="text-[10.5px] text-white/15">
                    Paste the full JSON key file. Stored encrypted with AES-256-GCM.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gemini-bq-table" className="text-white/50 text-[12px] font-medium">
                    BigQuery Billing Export Table <span className="text-white/25 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="gemini-bq-table"
                    name="gemini-bq-table"
                    type="text"
                    placeholder="myproject.billing_export.gcp_billing_export_v1_XXXXXX"
                    value={geminiForm.bigqueryTable}
                    onChange={(e) => setGeminiForm({ ...geminiForm, bigqueryTable: e.target.value })}
                    autoComplete="off"
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[12px] font-mono rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                  <p className="text-[10.5px] text-white/15">
                    With BigQuery export connected, costs are <strong>actual</strong>. Without it,
                    we pull token counts from Cloud Monitoring and estimate cost from Google&apos;s public price table.
                  </p>
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>In Google Cloud Console, create a service account in the project where Gemini runs</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Grant role <code className="text-white/50">Monitoring Viewer</code> (and <code className="text-white/50">BigQuery Data Viewer</code> if using export)</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Create a JSON key for the service account and paste it above</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedTool === "anthropic" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="anthropic-admin-key" className="text-white/50 text-[12px] font-medium">
                    Admin API Key <span className="text-red-400/70">*</span>
                  </Label>
                  <Input
                    id="anthropic-admin-key"
                    name="anthropic-admin-key"
                    type="password"
                    placeholder="sk-ant-admin01-..."
                    value={anthropicForm.apiKey}
                    onChange={(e) => setAnthropicForm({ apiKey: e.target.value })}
                    autoComplete="new-password"
                    data-1p-ignore
                    data-lpignore="true"
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
                  />
                  <p className="text-[10.5px] text-white/15">
                    Must start with <code>sk-ant-admin01-</code>. Regular API keys won&apos;t work.
                  </p>
                </div>

                <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[11.5px] font-medium text-white/50">Quick Setup</p>
                  </div>
                  <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">01</span>Go to console.anthropic.com → Settings → Admin Keys</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">02</span>Create an Admin key with usage &amp; billing read access</li>
                    <li className="flex gap-2.5"><span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">03</span>Paste it here — we&apos;ll backfill 90 days of usage</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Footer with actions */}
          {selectedTool && (
            <div className="relative px-6 pb-6 pt-4 border-t border-white/[0.04]">
              <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
              <div className="flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConnectModalOpen(false)
                    setSelectedTool("")
                    setFortnoxForm({ clientId: "", clientSecret: "" })
                    setMicrosoft365Form({ tenantId: "", clientId: "", clientSecret: "" })
                    setHubspotForm({ clientId: "", clientSecret: "", hubType: "sales", tier: "professional", paidSeats: "" })
                    setQuickbooksForm({ clientId: "", clientSecret: "" })
                    setShopifyForm({ shopDomain: "", clientId: "", clientSecret: "" })
                    setOpenaiForm({ apiKey: "" })
                    setAnthropicForm({ apiKey: "" })
                    setGeminiForm({ serviceAccountJson: "", bigqueryTable: "" })
                    setGoogleWorkspaceForm({ clientId: "", clientSecret: "" })
                  }}
                  className="border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/70 hover:bg-white/[0.05] rounded-lg h-9 text-[12.5px] px-4 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedTool === "fortnox") {
                      handleConnectFortnox()
                    } else if (selectedTool === "microsoft365") {
                      handleConnectMicrosoft365()
                    } else if (selectedTool === "hubspot") {
                      handleConnectHubSpot()
                    } else if (selectedTool === "quickbooks") {
                      handleConnectQuickBooks()
                    } else if (selectedTool === "shopify") {
                      handleConnectShopify()
                    } else if (selectedTool === "openai") {
                      handleConnectOpenAI()
                    } else if (selectedTool === "anthropic") {
                      handleConnectAnthropic()
                    } else if (selectedTool === "gemini") {
                      handleConnectGemini()
                    } else if (selectedTool === "googleworkspace") {
                      handleConnectGoogleWorkspace()
                    }
                  }}
                  disabled={
                    !selectedTool ||
                    (selectedTool === "fortnox" && (!fortnoxForm.clientId || !fortnoxForm.clientSecret)) ||
                    (selectedTool === "microsoft365" && (!microsoft365Form.tenantId || !microsoft365Form.clientId || !microsoft365Form.clientSecret)) ||
                    (selectedTool === "hubspot" && (!hubspotForm.clientId || !hubspotForm.clientSecret)) ||
                    (selectedTool === "quickbooks" && (!quickbooksForm.clientId || !quickbooksForm.clientSecret)) ||
                    (selectedTool === "shopify" && (!shopifyForm.shopDomain || !shopifyForm.clientId || !shopifyForm.clientSecret)) ||
                    (selectedTool === "openai" && !openaiForm.apiKey) ||
                    (selectedTool === "anthropic" && !anthropicForm.apiKey) ||
                    (selectedTool === "gemini" && !geminiForm.serviceAccountJson) ||
                    (selectedTool === "googleworkspace" && (!googleWorkspaceForm.clientId || !googleWorkspaceForm.clientSecret)) ||
                    isConnecting
                  }
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold disabled:opacity-30 disabled:hover:bg-emerald-500 rounded-lg h-9 text-[12.5px] px-5 transition-all shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)] hover:shadow-[0_0_24px_-2px_rgba(52,211,153,0.4)] disabled:shadow-none"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plug className="w-3 h-3 mr-1.5" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

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
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium text-white">Delete Integration</DialogTitle>
            <DialogDescription className="text-[13px] text-white/35">
              Are you sure you want to delete {integrationToDelete?.tool_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
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
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

