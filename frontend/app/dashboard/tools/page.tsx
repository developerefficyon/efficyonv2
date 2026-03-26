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
      const limits = data.limits ? {
        current: data.limits.current || 0,
        max: data.limits.max || 5,
        canAddMore: data.limits.canAddMore ?? true,
        planTier: data.limits.planTier || "startup",
        planName: data.limits.planName || "Startup",
      } : integrationLimits

      if (data.limits) {
        setIntegrationLimits(limits)
      }

      // Save to cache for instant loading on revisit
      setCache("integrations-data", { integrations: loadedIntegrations, limits })
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

      const res = await fetch(`${apiBase}/api/integrations/fortnox/sync-customers`, {
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
      const customerCount = data.active_customers_count ?? 0

      toast.success("Synced successfully", {
        description: `${customerCount} active customer${customerCount !== 1 ? "s" : ""} synced.`,
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
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        tool.status === "connected" ? "bg-emerald-400" :
                        tool.status === "error" || tool.status === "expired" ? "bg-red-400" :
                        tool.status === "pending" ? "bg-amber-400" : "bg-white/15"
                      }`} />
                      <div>
                        <p className="text-[14px] font-medium text-white/85">{tool.name}</p>
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
          }
        }}
      >
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white w-[95vw] max-w-lg sm:w-full max-h-[90vh] overflow-y-auto rounded-2xl premium-scrollbar p-0" style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-white tracking-tight">Connect New Tool</DialogTitle>
              <DialogDescription className="text-[13px] text-white/40 mt-1">
                {selectedTool ? "Configure your integration" : "Choose an integration to get started"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6">
            {/* Tool Picker Grid */}
            {!selectedTool && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "fortnox", name: "Fortnox", category: "Finance", color: "#2DB250", logo: (
                    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                      <rect width="32" height="32" rx="8" fill="#2DB250" fillOpacity="0.12"/>
                      <text x="16" y="21" textAnchor="middle" fill="#2DB250" fontSize="14" fontWeight="700" fontFamily="system-ui">F</text>
                    </svg>
                  )},
                  { id: "microsoft365", name: "Microsoft 365", category: "Productivity", color: "#0078D4", logo: (
                    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                      <rect width="32" height="32" rx="8" fill="#0078D4" fillOpacity="0.12"/>
                      <g transform="translate(8, 8)">
                        <rect x="0" y="0" width="7" height="7" rx="1" fill="#F25022"/>
                        <rect x="9" y="0" width="7" height="7" rx="1" fill="#7FBA00"/>
                        <rect x="0" y="9" width="7" height="7" rx="1" fill="#00A4EF"/>
                        <rect x="9" y="9" width="7" height="7" rx="1" fill="#FFB900"/>
                      </g>
                    </svg>
                  )},
                  { id: "hubspot", name: "HubSpot", category: "CRM / Marketing", color: "#FF7A59", logo: (
                    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                      <rect width="32" height="32" rx="8" fill="#FF7A59" fillOpacity="0.12"/>
                      <g transform="translate(7, 7)">
                        <path d="M13.5 6.3V3.6a1.8 1.8 0 10-1.2 0v2.7a4.5 4.5 0 00-2.7 1.6L3.2 3.6a1.5 1.5 0 10-.7 1l6.3 4.2a4.5 4.5 0 00-.3 1.7 4.5 4.5 0 004.5 4.5 4.5 4.5 0 004.5-4.5 4.5 4.5 0 00-4-4.2zm0 6.7a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="#FF7A59"/>
                      </g>
                    </svg>
                  )},
                  { id: "quickbooks", name: "QuickBooks", category: "Finance", color: "#2CA01C", logo: (
                    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                      <rect width="32" height="32" rx="8" fill="#2CA01C" fillOpacity="0.12"/>
                      <circle cx="16" cy="16" r="8" fill="#2CA01C" fillOpacity="0.2"/>
                      <path d="M12 13h-1a2 2 0 000 4h1m8 2h1a2 2 0 000-4h-1" stroke="#2CA01C" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M14 11v10m4-10v10" stroke="#2CA01C" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )},
                  { id: "shopify", name: "Shopify", category: "E-Commerce", color: "#95BF47", logo: (
                    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                      <rect width="32" height="32" rx="8" fill="#95BF47" fillOpacity="0.12"/>
                      <g transform="translate(9, 6)">
                        <path d="M11.5 4.2s-.3 0-.3.1l-.5 1.6a3.4 3.4 0 00-2.2-1c-1.8-.1-3 1.4-3.4 2.8L3 7.2c-.5-.2-.6-.2-.6-.2s-.1 0-.2.1L.7 14.7l8.5 1.5 4.5-1s-2.2-10.8-2.2-11zM8.3 6.4l-.8 2.5A3 3 0 005.7 8l.8-2.5c.3-.2.6-.3.8-.3s.6 0 1 .2z" fill="#95BF47"/>
                        <path d="M11.2 4.3a1.4 1.4 0 00-1-.4h-.2l-.3-.3C9.3 3.2 8.8 3 8.3 3c-2 0-3 2.5-3.3 3.8l-2 .6c-.6.2-.6.2-.7.8L1 14.7l7.2 1.3L11.2 4.3z" fill="#5E8E3E"/>
                      </g>
                    </svg>
                  )},
                ].map((tool) => {
                  const alreadyConnected = integrations.some(
                    (i) => i.tool_name.toLowerCase().replace(/\s+/g, '') === tool.id.replace(/\s+/g, '')
                  )
                  return (
                    <button
                      key={tool.id}
                      onClick={() => !alreadyConnected && setSelectedTool(tool.id)}
                      disabled={alreadyConnected}
                      className={`group relative flex flex-col items-start gap-3 p-4 rounded-xl border transition-all duration-200 text-left ${
                        alreadyConnected
                          ? "border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        {tool.logo}
                        {alreadyConnected && (
                          <span className="text-[10px] text-emerald-400/60 font-medium bg-emerald-400/[0.08] px-2 py-0.5 rounded-full">Connected</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white/90">{tool.name}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">{tool.category}</p>
                      </div>
                      {!alreadyConnected && (
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${tool.color}30, 0 0 20px ${tool.color}08` }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Selected tool header with back button */}
            {selectedTool && (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedTool("")}
                  className="flex items-center gap-2 text-[12px] text-white/30 hover:text-white/60 transition-colors -mt-1 mb-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                  All integrations
                </button>
              </div>
            )}

            {selectedTool === "fortnox" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-id" className="text-white/60 text-[13px]">
                    Client ID <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="client-id"
                    type="text"
                    placeholder="Enter your Fortnox Client ID"
                    value={fortnoxForm.clientId}
                    onChange={(e) =>
                      setFortnoxForm({ ...fortnoxForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-secret" className="text-white/60 text-[13px]">
                    Client Secret <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="client-secret"
                    type="password"
                    placeholder="Enter your Fortnox Client Secret"
                    value={fortnoxForm.clientSecret}
                    onChange={(e) =>
                      setFortnoxForm({ ...fortnoxForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <p className="text-[11px] font-medium text-emerald-400/80 mb-2">Quick Setup</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Log into developer.fortnox.se and create an app</li>
                    <li>Set the redirect URI provided during onboarding</li>
                    <li>Copy the Client ID and Client Secret here</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">Scopes: companyinformation, customer, invoice, supplierinvoice, bookkeeping, salary, article, supplier</p>
                  <Link
                    href="/dashboard/tools/guide#fortnox"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 mt-2"
                  >
                    <BookOpen className="w-3 h-3" />
                    Full setup guide
                  </Link>
                </div>
              </div>
            )}

            {selectedTool === "microsoft365" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="m365-tenant-id" className="text-white/60 text-[13px]">
                    Tenant ID <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="m365-tenant-id"
                    type="text"
                    placeholder="Your Azure AD Tenant ID or domain"
                    value={microsoft365Form.tenantId}
                    onChange={(e) =>
                      setMicrosoft365Form({ ...microsoft365Form, tenantId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m365-client-id" className="text-white/60 text-[13px]">
                    Client ID <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="m365-client-id"
                    type="text"
                    placeholder="Azure AD Application (client) ID"
                    value={microsoft365Form.clientId}
                    onChange={(e) =>
                      setMicrosoft365Form({ ...microsoft365Form, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m365-client-secret" className="text-white/60 text-[13px]">
                    Client Secret <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="m365-client-secret"
                    type="password"
                    placeholder="Azure AD Client Secret"
                    value={microsoft365Form.clientSecret}
                    onChange={(e) =>
                      setMicrosoft365Form({ ...microsoft365Form, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <p className="text-[11px] font-medium text-emerald-400/80 mb-2">Quick Setup</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Go to Azure Portal &gt; App registrations, create a new app</li>
                    <li>Add API permissions: User.Read.All, Directory.Read.All, AuditLog.Read.All, Reports.Read.All</li>
                    <li>Grant admin consent, then create a Client Secret</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">Requires admin consent for all permissions</p>
                  <Link
                    href="/dashboard/tools/guide#microsoft365"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 mt-2"
                  >
                    <BookOpen className="w-3 h-3" />
                    Full setup guide
                  </Link>
                </div>
              </div>
            )}

            {selectedTool === "hubspot" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hubspot-client-id" className="text-white/60 text-[13px]">
                    Client ID <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="hubspot-client-id"
                    type="text"
                    placeholder="Your HubSpot App Client ID"
                    value={hubspotForm.clientId}
                    onChange={(e) =>
                      setHubspotForm({ ...hubspotForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hubspot-client-secret" className="text-white/60 text-[13px]">
                    Client Secret <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="hubspot-client-secret"
                    type="password"
                    placeholder="Your HubSpot App Client Secret"
                    value={hubspotForm.clientSecret}
                    onChange={(e) =>
                      setHubspotForm({ ...hubspotForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-sm text-cyan-400 mb-1">Pricing Information</p>
                  <p className="text-xs text-gray-500 mb-3">Optional — helps provide more accurate cost analysis</p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hubspot-hub-type" className="text-white/60 text-[13px]">
                        Primary Hub
                      </Label>
                      <select
                        id="hubspot-hub-type"
                        value={hubspotForm.hubType}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, hubType: e.target.value })
                        }
                        className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-lg px-3 py-2 text-[13px] focus:border-emerald-500/30 outline-none"
                      >
                        <option value="starter_platform">Starter Customer Platform (All Hubs)</option>
                        <option value="marketing">Marketing Hub</option>
                        <option value="sales">Sales Hub</option>
                        <option value="service">Service Hub</option>
                        <option value="content">Content Hub</option>
                        <option value="operations">Operations Hub</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hubspot-tier" className="text-white/60 text-[13px]">
                        Plan Tier
                      </Label>
                      <select
                        id="hubspot-tier"
                        value={hubspotForm.tier}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, tier: e.target.value })
                        }
                        className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-lg px-3 py-2 text-[13px] focus:border-emerald-500/30 outline-none"
                      >
                        <option value="starter">Starter ($15-20/seat)</option>
                        <option value="professional">Professional ($50-100/seat)</option>
                        <option value="enterprise">Enterprise ($75-150/seat)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hubspot-seats" className="text-white/60 text-[13px]">
                        Number of Paid Seats
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
                        className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                      />
                      <p className="text-xs text-gray-500">
                        Leave blank to auto-detect from your HubSpot account
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <p className="text-[11px] font-medium text-emerald-400/80 mb-2">Quick Setup</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Go to HubSpot &gt; Settings &gt; Integrations &gt; Private Apps</li>
                    <li>Create app with scopes: settings.users.read, settings.users.write, account-info.security.read, crm.objects.contacts.read</li>
                    <li>Copy the Client ID and Client Secret here</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">Scopes: settings.users.read, settings.users.write, account-info.security.read, crm.objects.contacts.read</p>
                  <Link
                    href="/dashboard/tools/guide#hubspot"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 mt-2"
                  >
                    <BookOpen className="w-3 h-3" />
                    Full setup guide
                  </Link>
                </div>
              </div>
            )}

            {selectedTool === "quickbooks" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qb-client-id" className="text-white/60 text-[13px]">
                    Client ID <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="qb-client-id"
                    type="text"
                    placeholder="Your QuickBooks App Client ID"
                    value={quickbooksForm.clientId}
                    onChange={(e) =>
                      setQuickbooksForm({ ...quickbooksForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qb-client-secret" className="text-white/60 text-[13px]">
                    Client Secret <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="qb-client-secret"
                    type="password"
                    placeholder="Your QuickBooks App Client Secret"
                    value={quickbooksForm.clientSecret}
                    onChange={(e) =>
                      setQuickbooksForm({ ...quickbooksForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <p className="text-[11px] font-medium text-emerald-400/80 mb-2">Quick Setup</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Go to developer.intuit.com and create an app</li>
                    <li>Select &quot;Accounting&quot; scope</li>
                    <li>Add redirect URI: your backend callback URL</li>
                    <li>Copy Client ID and Client Secret here</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedTool === "shopify" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopify-shop" className="text-white/60 text-[13px]">
                    Shop Domain <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="shopify-shop"
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={shopifyForm.shopDomain}
                    onChange={(e) =>
                      setShopifyForm({ ...shopifyForm, shopDomain: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                  <p className="text-xs text-gray-500">
                    Your Shopify store URL (e.g., my-store or my-store.myshopify.com)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopify-client-id" className="text-white/60 text-[13px]">
                    Client ID <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="shopify-client-id"
                    type="text"
                    placeholder="Your Shopify App API Key"
                    value={shopifyForm.clientId}
                    onChange={(e) =>
                      setShopifyForm({ ...shopifyForm, clientId: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopify-client-secret" className="text-white/60 text-[13px]">
                    Client Secret <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="shopify-client-secret"
                    type="password"
                    placeholder="Your Shopify App API Secret Key"
                    value={shopifyForm.clientSecret}
                    onChange={(e) =>
                      setShopifyForm({ ...shopifyForm, clientSecret: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <p className="text-[11px] font-medium text-emerald-400/80 mb-2">Quick Setup</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Go to partners.shopify.com and create an app</li>
                    <li>Set redirect URL to your backend callback URL</li>
                    <li>Copy the API Key (Client ID) and API Secret Key (Client Secret)</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {selectedTool && (
            <div className="px-6 pb-6 pt-2 flex justify-end gap-2 border-t border-white/[0.04]">
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
                }}
                className="border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
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
                  }
                }}
                disabled={
                  !selectedTool ||
                  (selectedTool === "fortnox" && (!fortnoxForm.clientId || !fortnoxForm.clientSecret)) ||
                  (selectedTool === "microsoft365" && (!microsoft365Form.tenantId || !microsoft365Form.clientId || !microsoft365Form.clientSecret)) ||
                  (selectedTool === "hubspot" && (!hubspotForm.clientId || !hubspotForm.clientSecret)) ||
                  (selectedTool === "quickbooks" && (!quickbooksForm.clientId || !quickbooksForm.clientSecret)) ||
                  (selectedTool === "shopify" && (!shopifyForm.shopDomain || !shopifyForm.clientId || !shopifyForm.clientSecret)) ||
                  isConnecting
                }
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium disabled:opacity-50 rounded-lg h-9 text-[13px]"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          )}
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

