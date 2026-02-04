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
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Zap,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { toast } from "sonner"

interface Integration {
  id: string
  tool_name: string
  connection_type: string
  status: string
  environment: string
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
  cost: number
  seats: number
  activeSeats: number
  unusedSeats: number
  wasteLevel: "high" | "medium" | "low"
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
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([])
  const [integrationLimits, setIntegrationLimits] = useState<IntegrationLimits>({
    current: 0,
    max: 5,
    canAddMore: true,
    planTier: "startup",
    planName: "Startup",
  })
  const [isLoading, setIsLoading] = useState(true)
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
    environment: "sandbox",
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
      setAvailableTools(data.tools || [])
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
      setIsLoading(true)
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
      setIntegrations(data.integrations || [])

      // Update integration limits from response
      if (data.limits) {
        setIntegrationLimits({
          current: data.limits.current || 0,
          max: data.limits.max || 5,
          canAddMore: data.limits.canAddMore ?? true,
          planTier: data.limits.planTier || "startup",
          planName: data.limits.planName || "Startup",
        })
      }
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
        let description = hubspotStatus.replace("error_", "").replace(/_/g, " ")
        if (errorDetails) {
          description += `: ${decodeURIComponent(errorDetails)}`
        } else if (errorParam) {
          description += `: ${decodeURIComponent(errorParam)}`
        }

        console.error("HubSpot OAuth error:", { status: hubspotStatus, details: errorDetails, error: errorParam })

        toast.error("Failed to connect HubSpot", {
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
              environment: fortnoxForm.environment,
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

  const handleConnectHubSpot = async () => {
    if (!hubspotForm.clientId || !hubspotForm.clientSecret || !hubspotForm.paidSeats) {
      toast.error("Please fill in all required fields")
      return
    }

    const paidSeatsNum = parseInt(hubspotForm.paidSeats, 10)
    if (isNaN(paidSeatsNum) || paidSeatsNum < 1) {
      toast.error("Please enter a valid number of paid seats")
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
                paid_seats: paidSeatsNum,
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

  // Helper to check if token is expired
  const isTokenExpired = (integration: Integration): boolean => {
    const expiresAt = integration.oauth_data?.tokens?.expires_at
    if (!expiresAt) return false // No expiry info, assume valid

    const now = Math.floor(Date.now() / 1000)
    // Consider expired if less than 5 minutes remaining (same as backend buffer)
    return now >= (expiresAt - 300)
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

    // Calculate waste level based on status
    const getWasteLevel = (status: string): "high" | "medium" | "low" => {
      if (status === "error" || status === "expired") return "high"
      if (status === "disconnected" || status === "pending") return "medium"
      return "low"
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

    // Default values (can be enhanced by fetching from company_plans table)
    const defaultCost = 0
    const defaultSeats = 0
    const defaultActiveSeats = 0

    return {
      id: integration.id,
      name: integration.tool_name,
      category: getCategory(integration.tool_name),
      cost: defaultCost,
      seats: defaultSeats,
      activeSeats: defaultActiveSeats,
      unusedSeats: Math.max(0, defaultSeats - defaultActiveSeats),
      wasteLevel: getWasteLevel(isTokenExpired(integration) ? "expired" : integration.status),
      status: (integration.status === "expired" || isTokenExpired(integration))
        ? "expired"
        : integration.status as "connected" | "error" | "disconnected" | "expired" | "pending",
      lastSync: getLastSync(integration.updated_at),
      issues: getIssues(isTokenExpired(integration) ? "expired" : integration.status),
    }
  })

  // Tools are now mapped from integrations - no hardcoded data

  const getWasteBadge = (level: string) => {
    const styles = {
      high: "bg-red-500/20 text-red-400 border-red-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      low: "bg-green-500/20 text-green-400 border-green-500/30",
    }
    return styles[level as keyof typeof styles] || styles.low
  }

  const getStatusIcon = (status: string) => {
    if (status === "connected") {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else if (status === "error" || status === "expired") {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
            {status === "expired" ? "Reconnect needed" : "Error"}
          </span>
          <XCircle className="w-4 h-4 text-red-400" />
        </div>
      )
    } else if (status === "pending") {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Pending
          </span>
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
        </div>
      )
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />
  }

  const categories = ["all", ...Array.from(new Set(tools.map((t) => t.category)))]
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || tool.category === filterCategory
    const matchesStatus = filterStatus === "all" || tool.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalCost = tools.reduce((sum, t) => sum + t.cost, 0)
  const totalUnusedSeats = tools.reduce((sum, t) => sum + t.unusedSeats, 0)
  const toolsNeedingAttention = tools.filter((t) => t.wasteLevel !== "low" || t.status === "error").length

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tools & Integrations</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage your connected tools and optimize costs</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            disabled={isLoading}
            className={`w-full sm:w-auto ${
              isLoading || integrationLimits.canAddMore
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-50"
                : "bg-gray-600 text-gray-300 cursor-not-allowed"
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Connect New Tool
          </Button>
          {!isLoading && !integrationLimits.canAddMore && (
            <p className="text-xs text-orange-400">Limit reached - upgrade to add more</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Connected Tools</p>
                {isLoading ? (
                  <>
                    <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse mt-2" />
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-white">
                        {integrationLimits.current}
                        <span className="text-lg text-gray-400">/{integrationLimits.max === 999 ? "∞" : integrationLimits.max}</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{integrationLimits.planName} plan</p>
                  </>
                )}
              </div>
              <BarChart3 className="w-8 h-8 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Monthly Cost</p>
                {isLoading ? (
                  <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Unused Seats</p>
                {isLoading ? (
                  <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-red-400">{totalUnusedSeats}</p>
                )}
              </div>
              <Users className="w-8 h-8 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Needs Attention</p>
                {isLoading ? (
                  <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-orange-400">{toolsNeedingAttention}</p>
                )}
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48 bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-white">
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="connected" className="text-white">Connected</SelectItem>
                <SelectItem value="error" className="text-white">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      {isLoading ? (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-12">
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-cyan-400 animate-spin" />
              <p className="text-gray-400">Loading tools...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredTools.length === 0 ? (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-12">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
              <p className="text-gray-400 mb-4">
                {integrations.length === 0 
                  ? "No tools connected yet. Connect your first tool to get started."
                  : "No tools found matching your filters"}
              </p>
              {integrations.length === 0 && (
                <Button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white mt-4"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Your First Tool
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const usagePercent = tool.seats > 0 ? Math.round((tool.activeSeats / tool.seats) * 100) : 0
            const potentialSavings = tool.seats > 0 ? tool.unusedSeats * (tool.cost / tool.seats) : 0

            return (
              <Card
                key={tool.id}
                className="bg-black/80 backdrop-blur-xl border-white/10 hover:border-cyan-500/30 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-1">{tool.name}</CardTitle>
                      <p className="text-xs text-gray-400">{tool.category}</p>
                    </div>
                    {getStatusIcon(tool.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {tool.cost > 0 || tool.seats > 0 ? (
                      <>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-bold text-white">${tool.cost}</span>
                          <span className="text-sm text-gray-400">/mo</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{tool.activeSeats}/{tool.seats} seats</span>
                          </div>
                          {tool.unusedSeats > 0 && (
                            <span className="text-red-400">{tool.unusedSeats} unused</span>
                          )}
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 mb-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              usagePercent >= 80
                                ? "bg-green-500"
                                : usagePercent >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{usagePercent}% utilization</p>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400">
                        <p>Cost and seat information not available</p>
                        <p className="text-xs text-gray-500 mt-1">Add plan details to see cost optimization</p>
                      </div>
                    )}
                  </div>

                  {tool.unusedSeats > 0 && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-400">Potential Savings</span>
                        <span className="text-sm font-semibold text-red-400">
                          ${Math.round(potentialSavings)}/mo
                        </span>
                      </div>
                    </div>
                  )}

                  {tool.issues.length > 0 && (
                    <div className="space-y-1">
                      {tool.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-orange-400 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <Badge className={getWasteBadge(tool.wasteLevel)}>
                      {tool.wasteLevel} waste
                    </Badge>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        const integration = integrations.find(i => i.id === tool.id)
                        if (!integration) return null

                        return (
                          <>
                            {integration.tool_name === "Fortnox" && (
                              <Button
                                size="sm"
                                className={`h-7 px-2 text-xs ${
                                  tool.status === "expired" || tool.status === "error"
                                    ? "bg-gradient-to-r from-red-500 to-orange-600 text-white"
                                    : "border-white/10 bg-black/50 text-white border"
                                }`}
                                onClick={() => startFortnoxOAuth(integration.id)}
                                disabled={reconnectingId === integration.id}
                              >
                                {reconnectingId === integration.id ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                )}
                                {reconnectingId === integration.id ? "Reconnecting..." : "Reconnect"}
                              </Button>
                            )}
                            {integration.tool_name === "Microsoft365" && (
                              <Button
                                size="sm"
                                className={`h-7 px-2 text-xs ${
                                  tool.status === "expired" || tool.status === "error"
                                    ? "bg-gradient-to-r from-red-500 to-orange-600 text-white"
                                    : "border-white/10 bg-black/50 text-white border"
                                }`}
                                onClick={() => startMicrosoft365OAuth(integration.id)}
                                disabled={reconnectingId === integration.id}
                              >
                                {reconnectingId === integration.id ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                )}
                                {reconnectingId === integration.id ? "Reconnecting..." : "Reconnect"}
                              </Button>
                            )}
                            {integration.tool_name === "HubSpot" && (
                              <Button
                                size="sm"
                                className={`h-7 px-2 text-xs ${
                                  tool.status === "expired" || tool.status === "error"
                                    ? "bg-gradient-to-r from-red-500 to-orange-600 text-white"
                                    : "border-white/10 bg-black/50 text-white border"
                                }`}
                                onClick={() => startHubSpotOAuth(integration.id)}
                                disabled={reconnectingId === integration.id}
                              >
                                {reconnectingId === integration.id ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                )}
                                {reconnectingId === integration.id ? "Reconnecting..." : "Reconnect"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleDeleteClick(integration)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>Last sync: {tool.lastSync}</span>
                    </div>
                    <Link
                      href={`/dashboard/tools/${tool.id}`}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      View Details →
                    </Link>
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
            setFortnoxForm({ clientId: "", clientSecret: "", environment: "sandbox" })
            setMicrosoft365Form({ tenantId: "", clientId: "", clientSecret: "" })
            setHubspotForm({ clientId: "", clientSecret: "", hubType: "sales", tier: "professional", paidSeats: "" })
          }
        }}
      >
        <DialogContent className="!bg-black/95 !border-white/10 text-white w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Connect New Tool</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a tool to connect to your account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tool-select" className="text-gray-300">
                Select Tool
              </Label>
              <Select
                value={selectedTool || undefined}
                onValueChange={(value) => setSelectedTool(value)}
              >
                <SelectTrigger
                  id="tool-select"
                  className="w-full h-10 !bg-black/95 !border !border-white/10 !text-white"
                >
                  <SelectValue placeholder="Choose a tool..." />
                </SelectTrigger>
                <SelectContent 
                  className="bg-black/95 border border-white/10 backdrop-blur-xl z-[100] shadow-lg"
                  position="popper"
                  sideOffset={4}
                >
                  {isLoadingTools ? (
                    <SelectItem value="loading" disabled className="text-gray-400">
                      Loading tools...
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="fortnox" className="text-white hover:bg-cyan-500/30 focus:bg-cyan-500/30 data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer">
                        Fortnox
                      </SelectItem>
                      <SelectItem value="microsoft365" className="text-white hover:bg-cyan-500/30 focus:bg-cyan-500/30 data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer">
                        Microsoft 365
                      </SelectItem>
                      <SelectItem value="hubspot" className="text-white hover:bg-cyan-500/30 focus:bg-cyan-500/30 data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer">
                        HubSpot
                      </SelectItem>
                      {availableTools.length > 0 && availableTools
                        .filter(tool => !["fortnox", "microsoft365", "hubspot"].includes(tool.name.toLowerCase()))
                        .map((tool) => (
                          <SelectItem
                            key={tool.id}
                            value={tool.name.toLowerCase()}
                            className="text-white hover:bg-cyan-500/30 focus:bg-cyan-500/30 data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer"
                          >
                            {tool.name}
                          </SelectItem>
                        ))
                      }
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedTool === "fortnox" && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <Label htmlFor="client-id" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-secret" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment" className="text-gray-300">
                    Environment
                  </Label>
                  <select
                    id="environment"
                    value={fortnoxForm.environment}
                    onChange={(e) =>
                      setFortnoxForm({ ...fortnoxForm, environment: e.target.value })
                    }
                    className="bg-black/50 border-white/10 text-white rounded-md px-3 py-2 w-full"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
            )}

            {selectedTool === "microsoft365" && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <Label htmlFor="m365-tenant-id" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m365-client-id" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m365-client-secret" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  Requires Azure AD app with admin consent for User.Read.All, Directory.Read.All, Reports.Read.All permissions.
                </p>
              </div>
            )}

            {selectedTool === "hubspot" && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <Label htmlFor="hubspot-client-id" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hubspot-client-secret" className="text-gray-300">
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
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-sm text-cyan-400 mb-3">Pricing Information (for accurate cost analysis)</p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hubspot-hub-type" className="text-gray-300">
                        Primary Hub <span className="text-red-400">*</span>
                      </Label>
                      <select
                        id="hubspot-hub-type"
                        value={hubspotForm.hubType}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, hubType: e.target.value })
                        }
                        className="w-full bg-black/50 border border-white/10 text-white rounded-md px-3 py-2"
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
                      <Label htmlFor="hubspot-tier" className="text-gray-300">
                        Plan Tier <span className="text-red-400">*</span>
                      </Label>
                      <select
                        id="hubspot-tier"
                        value={hubspotForm.tier}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, tier: e.target.value })
                        }
                        className="w-full bg-black/50 border border-white/10 text-white rounded-md px-3 py-2"
                      >
                        <option value="starter">Starter ($15-20/seat)</option>
                        <option value="professional">Professional ($50-100/seat)</option>
                        <option value="enterprise">Enterprise ($75-150/seat)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hubspot-seats" className="text-gray-300">
                        Number of Paid Seats <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="hubspot-seats"
                        type="number"
                        min="1"
                        placeholder="e.g., 10"
                        value={hubspotForm.paidSeats}
                        onChange={(e) =>
                          setHubspotForm({ ...hubspotForm, paidSeats: e.target.value })
                        }
                        className="bg-black/50 border-white/10 text-white"
                      />
                      <p className="text-xs text-gray-500">
                        Total paid seats in your HubSpot subscription (excludes free view-only seats)
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Requires a HubSpot Private App or OAuth App with settings.users.read, settings.users.write, and account-info.security.read scopes.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConnectModalOpen(false)
                setSelectedTool("")
                setFortnoxForm({ clientId: "", clientSecret: "", environment: "sandbox" })
                setMicrosoft365Form({ tenantId: "", clientId: "", clientSecret: "" })
                setHubspotForm({ clientId: "", clientSecret: "", hubType: "sales", tier: "professional", paidSeats: "" })
              }}
              className="border-white/10 bg-black/50 text-white"
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
                }
              }}
              disabled={
                !selectedTool ||
                (selectedTool === "fortnox" && (!fortnoxForm.clientId || !fortnoxForm.clientSecret)) ||
                (selectedTool === "microsoft365" && (!microsoft365Form.tenantId || !microsoft365Form.clientId || !microsoft365Form.clientSecret)) ||
                (selectedTool === "hubspot" && (!hubspotForm.clientId || !hubspotForm.clientSecret || !hubspotForm.paidSeats)) ||
                isConnecting
              }
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="!bg-black/95 !border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Integration</DialogTitle>
            <DialogDescription className="text-gray-400">
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
              className="border-white/10 bg-black/50 text-white"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
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

