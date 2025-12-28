"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Settings,
  Loader2,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Search,
  FileText,
  Receipt,
  CreditCard,
  BookOpen,
  Wallet,
  Package,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/auth-context"
import { getValidSessionToken } from "@/lib/auth-helpers"
import { toast } from "sonner"

interface Integration {
  id: string
  tool_name: string
  connection_type: string
  status: string
  environment: string
  created_at: string
  updated_at: string
}

export default function IntegrationsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<string>("")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isViewInfoModalOpen, setIsViewInfoModalOpen] = useState(false)
  const [fortnoxInfo, setFortnoxInfo] = useState<{
    company?: any
    settings?: any
    invoices?: any[]
    supplierInvoices?: any[]
    expenses?: any[]
    vouchers?: any[]
    accounts?: any[]
    articles?: any[]
    customers?: any[]
    suppliers?: any[]
  }>({})
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [infoSearchQuery, setInfoSearchQuery] = useState("")
  const [costLeakAnalysis, setCostLeakAnalysis] = useState<any>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [isCostAnalysisVisible, setIsCostAnalysisVisible] = useState(true)
  const [fortnoxForm, setFortnoxForm] = useState({
    clientId: "",
    clientSecret: "",
    environment: "sandbox",
  })

  // Ref to prevent multiple simultaneous calls
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)

  const loadIntegrations = useCallback(async (force = false) => {
    // Prevent multiple simultaneous calls unless forced
    if (isLoadingRef.current && !force) {
      console.log("[loadIntegrations] Already loading, skipping duplicate call")
      return
    }

    isLoadingRef.current = true
    try {
      setIsLoading(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        console.warn("No access token available for loading integrations")
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        setIntegrations([])
        setIsLoading(false)
        isLoadingRef.current = false
        return
      }

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const res = await fetch(`${apiBase}/api/integrations`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errorText = await res.text()
          console.error("Failed to load integrations:", res.status, errorText)
          throw new Error(`Failed to load integrations: ${res.status}`)
        }

        const data = await res.json()
        console.log("Integrations loaded:", data.integrations?.length || 0)
        setIntegrations(data.integrations || [])
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error("Request timed out. Please check your connection and try again.")
        }
        throw fetchError
      }
    } catch (error) {
      console.error("Error loading integrations:", error)
      toast.error("Failed to load integrations", {
        description: error instanceof Error ? error.message : "An error occurred",
        duration: 5000,
      })
      // Set empty array on error so UI doesn't stay in loading state
      setIntegrations([])
    } finally {
      // Always reset loading state, even on error
      setIsLoading(false)
      isLoadingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // router.push is stable and doesn't need to be a dependency
  }, [])

  useEffect(() => {
    // Wait for auth to be ready before doing anything
    if (authLoading) {
      return
    }

    // If user is not authenticated, don't try to load integrations
    // (the layout will handle redirecting to login)
    if (!user) {
      setIsLoading(false)
      hasLoadedRef.current = false
      lastUserIdRef.current = null
      return
    }

    // Check if user actually changed (not just token refresh)
    const currentUserId = user.id
    const userChanged = lastUserIdRef.current !== currentUserId
    
    // Update the last user ID
    if (userChanged) {
      lastUserIdRef.current = currentUserId
      hasLoadedRef.current = false // Reset loaded flag when user changes
    }

    // Check for OAuth callback result in URL params first
    const params = new URLSearchParams(window.location.search)
    const fortnoxStatus = params.get("fortnox")
    const fortnoxError = params.get("error")
    const fortnoxErrorDesc = params.get("error_desc")
    const scopeWarning = params.get("scope_warning") === "true"
    const scopeInfo = params.get("scope_info") // Read scope_info before URL cleanup
    
    // If OAuth callback, always process it (even if we've loaded before)
    if (fortnoxStatus || fortnoxError) {
      // Reset connecting state when handling OAuth callback
      setIsConnecting(false)
      // Process OAuth callback (will load integrations at the end)
    } else {
      // No OAuth callback - only load if we haven't loaded yet for this user
      if (hasLoadedRef.current && !userChanged) {
        console.log("[Integrations] Already loaded for this user, skipping duplicate load")
        return
      }
      
      // Reset connecting state when component loads (in case user returns from OAuth)
      setIsConnecting(false)
      
      // Load integrations only once per user
      console.log("[Integrations] Loading integrations", userChanged ? "for new user" : "for the first time")
      hasLoadedRef.current = true
      void loadIntegrations()
      return
    }
    
    // Handle OAuth callback - clean up URL immediately to prevent re-triggering
    if (fortnoxStatus === "connected") {
      console.log(`[OAuth Callback] Processing successful connection. scopeInfo: ${scopeInfo}, scopeWarning: ${scopeWarning}`)
      
      // Clean up URL FIRST to prevent re-triggering this block on next render
      const currentPath = window.location.pathname
      window.history.replaceState({}, "", currentPath)
      console.log(`[OAuth Callback] Cleaned up URL, removed query params. Path: ${currentPath}`)
      
      // Refresh the session to ensure it's still valid after OAuth redirect
      const refreshSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            // Try to refresh if no session found
            await supabase.auth.refreshSession()
          }
        } catch (error) {
          console.error("Error refreshing session after OAuth:", error)
        }
      }
      void refreshSession()

      // We're going to reload integrations after OAuth; mark page as loading and
      // let loadIntegrations() handle turning the spinner off in its finally block
      setIsLoading(true)
      
      // Show appropriate success message based on scope
      if (scopeWarning) {
        toast.warning("Fortnox Connected - Missing Customer Permission", {
          description: "Fortnox is connected, but the 'customer' permission was not granted. You need to reconnect and grant customer access to sync customers. Click 'Reconnect' to fix this.",
          action: {
            label: "Reconnect",
            onClick: startFortnoxOAuth,
          },
          duration: 15000,
        })
      } else if (scopeInfo === "companyinfo") {
        // Handle company info scope (works with any license, but no customer sync)
        console.log("[OAuth Callback] Showing success toast for company info scope")
      toast.success("Fortnox connected successfully!", {
          description: "Your Fortnox integration is connected with company information access. Customer sync requires a Fortnox subscription with customer register access.",
          duration: 8000,
        })
      } else {
        console.log("[OAuth Callback] Showing success toast for full access")
        toast.success("Fortnox connected successfully!", {
          description: "Your Fortnox integration is now active. Loading customers...",
          duration: 5000,
        })
        
        // Automatically fetch and show customers after successful connection
        setTimeout(async () => {
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
            const accessToken = await getValidSessionToken()

            if (accessToken) {
              const res = await fetch(`${apiBase}/api/integrations/fortnox/customers`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              })

              // Note: Customers removed from View Information - requires license
              // Customers can still be synced via "Sync Now" button
              if (res.ok) {
                const data = await res.json()
                const customers = data.customers || []
                if (customers.length > 0) {
                  toast.success(`${customers.length} customer${customers.length !== 1 ? "s" : ""} synced`, {
                    description: "Customers have been synced. Use 'Sync Now' to view them in the customers page.",
                    duration: 3000,
                  })
                }
              }
            }
          } catch (error) {
            console.error("Error auto-loading customers:", error)
            // Don't show error toast, just log it
          }
        }, 1500) // Wait a bit longer to ensure backend has saved tokens
      }

      // Load integrations to reflect the new Fortnox connection
      console.log("[OAuth Callback] Loading integrations after successful connection...")
      hasLoadedRef.current = true // Mark as loaded so we don't reload again
      // Force reload to ensure we get the latest integration status
      loadIntegrations(true).catch((error) => {
        console.error("[OAuth Callback] Error loading integrations:", error)
        // Ensure we don't stay stuck in loading state on failure
        setIsLoading(false)
        isLoadingRef.current = false
      })
      
      // Return early to prevent normal flow from running (URL already cleaned up)
      return
    } else if (fortnoxStatus) {
      let errorMessage = "Failed to connect Fortnox"
      let errorDescription = fortnoxErrorDesc || "An unknown error occurred."
      
      // Use Fortnox's error message if available, otherwise use our own
      if (!fortnoxErrorDesc) {
        switch (fortnoxStatus) {
          case "error":
            errorDescription = fortnoxError
              ? `Fortnox error: ${fortnoxError}`
              : "Fortnox returned an error during authorization."
            break
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
            errorDescription = "Failed to save access tokens. Please try reconnecting."
            break
          case "error_missing_license":
            errorMessage = "Fortnox License Required"
            errorDescription = "The Fortnox account you're connecting doesn't have a license for customer data access. You need a Fortnox subscription that includes customer register access. Please contact Fortnox support or upgrade your subscription, then try connecting again."
            break
          case "error_invalid_scope":
            errorMessage = "Invalid Fortnox Scope"
            errorDescription = "One or more requested scopes are not valid or not enabled in your Fortnox Developer Portal. Please check your app settings in the Fortnox Developer Portal and ensure all requested scopes (companyinformation, settings, profile, archive, inbox) are enabled in the Permissions tab."
            break
        }
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 10000,
      })
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
      // Load integrations even on error to show current state
      hasLoadedRef.current = true // Mark as loaded
      void loadIntegrations(true)
      return
    }
    
    // This should never be reached if the above conditions are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // loadIntegrations is stable (empty deps), authLoading and user are the only triggers we need
  }, [authLoading, user])

  const startFortnoxOAuth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

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
    }
  }

  const handleSyncNow = async (integration: Integration) => {
    setSyncingId(integration.id)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      
      // Refresh session to ensure we have a valid token
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession()
      
      // Get valid session token (will auto-refresh if needed)
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        toast.error("Authentication required", {
          description: "Please log in again to sync customers.",
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
        const errorMessage = errorData.error || "Failed to sync Fortnox customers"
        const errorDetails = errorData.details || errorData.statusText || ""
        
        // Handle authentication errors - try to refresh session once more
        if (res.status === 401) {
          console.log("Got 401, attempting to refresh session and retry...")
          try {
            // Try refreshing session one more time
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.refreshSession()
            
            if (retryError || !retrySession?.access_token) {
              toast.error("Session expired", {
                description: "Please refresh the page and try again. If the problem persists, please log out and log back in.",
                duration: 8000,
              })
              return
            }
            
            // Retry the request with refreshed token
            const retryRes = await fetch(`${apiBase}/api/integrations/fortnox/sync-customers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${retrySession.access_token}`,
              },
            })
            
            if (retryRes.ok) {
              const retryData = await retryRes.json()
              const customerCount = retryData.active_customers_count ?? 0
              
              toast.success("Fortnox synced successfully", {
                description: `${customerCount} active customer${customerCount !== 1 ? "s" : ""} synced from Fortnox.`,
                action: {
                  label: "View Customers",
                  onClick: () => router.push("/dashboard/admin/customers"),
                },
                duration: 6000,
              })
              
              await loadIntegrations(true)
              return
            }
          } catch (retryError) {
            console.error("Retry after refresh failed:", retryError)
          }
        }
        
        // Check for refresh token expired (401 with reconnect action)
        if (res.status === 401 && errorData.action === "reconnect") {
          toast.error("Fortnox Session Expired", {
            description: errorDetails || "Your Fortnox session has expired. Click 'Reconnect' to re-authorize the integration.",
            action: {
              label: "Reconnect Fortnox",
              onClick: startFortnoxOAuth,
            },
            duration: 20000,
          })
          return
        }
        
        // Check for Fortnox permission error (403 with reconnect action)
        if (res.status === 403 && errorData.action === "reconnect") {
          toast.error("Missing Fortnox Customer Permission", {
            description: errorDetails || "The integration doesn't have permission to access customer data. Click 'Reconnect' and make sure to grant 'customer' permissions when authorizing in Fortnox.",
            action: {
              label: "Reconnect Fortnox",
              onClick: startFortnoxOAuth,
            },
            duration: 20000,
          })
          return
        }
        
        // If error is about authentication/authorization or permissions, offer to reconnect
        if (
          errorMessage.includes("no access token") ||
          errorMessage.includes("authentication failed") ||
          errorMessage.includes("expired") ||
          errorMessage.includes("reconnect") ||
          errorMessage.includes("Missing permission") ||
          errorMessage.includes("permission") ||
          errorMessage.includes("customer register") ||
          errorMessage.includes("customer data") ||
          errorMessage.includes("behörighet") ||
          errorMessage.includes("2001538") ||
          errorData.action === "reconnect" ||
          res.status === 401 ||
          res.status === 403
        ) {
          const isPermissionError = 
            errorMessage.includes("Missing permission") || 
            errorMessage.includes("permission") ||
            errorMessage.includes("customer register") ||
            errorMessage.includes("customer data") ||
            errorMessage.includes("behörighet") ||
            errorMessage.includes("2001538") ||
            res.status === 403
          
          toast.error(
            isPermissionError ? "Missing Fortnox Permissions" : "Authentication Error",
            {
              description: errorDetails || (isPermissionError 
                ? "The integration doesn't have permission to access customer data. When reconnecting, make sure to grant access to customer information in Fortnox."
                : "Your session may have expired. Please refresh the page and try again."),
              action: res.status === 401 ? undefined : {
                label: "Reconnect",
                onClick: startFortnoxOAuth,
              },
              duration: 15000,
            }
          )
        } else {
          // Show detailed error for other cases
          throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage)
        }
        return
      }

      const data = await res.json()
      const customerCount = data.active_customers_count ?? 0

      toast.success("Fortnox synced successfully", {
        description: `${customerCount} active customer${customerCount !== 1 ? "s" : ""} synced from Fortnox.`,
        action: {
          label: "View Customers",
          onClick: () => router.push("/dashboard/admin/customers"),
        },
        duration: 6000,
      })

      // Force reload integrations after sync
      await loadIntegrations(true)
    } catch (error: any) {
      console.error("Error syncing Fortnox:", error)
      toast.error("Failed to sync Fortnox", {
        description: error.message || "An error occurred while syncing.",
      })
    } finally {
      setSyncingId(null)
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
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      console.log("[Fortnox Connect] Step 1: Saving integration...")
      const res = await fetch(`${apiBase}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrations: [
            {
              tool_name: "Fortnox", // Backend maps this to 'provider'
              connection_type: "oauth",
              status: "connected",
              environment: fortnoxForm.environment,
              client_id: fortnoxForm.clientId,
              client_secret: fortnoxForm.clientSecret,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        console.error("[Fortnox Connect] Error saving integration:", errorData)
        throw new Error(errorData.error || "Failed to connect Fortnox")
      }

      const savedData = await res.json()
      console.log("[Fortnox Connect] Integration saved successfully:", savedData)
      
      // Small delay to ensure database write is committed
      await new Promise(resolve => setTimeout(resolve, 200))

      console.log("[Fortnox Connect] Step 2: Getting OAuth URL...")
      // Now start the Fortnox OAuth flow to complete the connection.
      // We call the backend via fetch so the Authorization header is included,
      // then redirect the browser to the URL returned by the backend.
      const oauthRes = await fetch(`${apiBase}/api/integrations/fortnox/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorText = await oauthRes.text().catch(() => "Unknown error")
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText, details: "Failed to parse error response" }
        }
        console.error("[Fortnox Connect] Error getting OAuth URL:", {
          status: oauthRes.status,
          statusText: oauthRes.statusText,
          error: errorData,
        })
        throw new Error(errorData.error || errorData.details || "Failed to start Fortnox OAuth")
      }

      const oauthData = await oauthRes.json()
      console.log("[Fortnox Connect] OAuth response received:", oauthData)
      
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        console.error("[Fortnox Connect] No URL in response:", oauthData)
        throw new Error("No OAuth URL returned from backend")
      }

      console.log("[Fortnox Connect] Step 3: Redirecting to Fortnox...", redirectUrl)

      // Reset all states before redirecting
      setIsConnecting(false)
      setIsConnectModalOpen(false)
      setFortnoxForm({ clientId: "", clientSecret: "", environment: "sandbox" })
      setSelectedTool("")

      toast.success("Fortnox integration created. Redirecting to Fortnox to authorize...", {
        description: "You'll be taken to Fortnox to grant access.",
        duration: 2000,
      })

      // Small delay to let the toast show, then redirect
      setTimeout(() => {
        console.log("[Fortnox Connect] Executing redirect to:", redirectUrl)
        try {
          window.location.href = redirectUrl
        } catch (redirectError) {
          console.error("[Fortnox Connect] Error during redirect:", redirectError)
          toast.error("Failed to redirect to Fortnox", {
            description: "Please try clicking the OAuth link manually or check the console for the URL.",
          })
        }
      }, 500)
    } catch (error: any) {
      console.error("[Fortnox Connect] Error:", error)
      toast.error("Failed to connect Fortnox", {
        description: error.message || "An error occurred while connecting.",
      })
      setIsConnecting(false)
    }
  }

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  const handleDeleteClick = (integration: Integration) => {
    setIntegrationToDelete(integration)
    setIsDeleteModalOpen(true)
  }

  const handleViewInformation = async (integration: Integration) => {
    console.log("[View Information] Clicked for integration:", integration)
    
    // Check if it's Fortnox (handle both tool_name and provider for backward compatibility)
    const isFortnox = integration.tool_name === "Fortnox" || (integration as any).provider === "Fortnox"
    if (!isFortnox) {
      console.log("[View Information] Not Fortnox integration, skipping")
      return
    }
    
    console.log("[View Information] Opening modal and loading data...")
    setIsViewInfoModalOpen(true)
    setIsLoadingInfo(true)
    setFortnoxInfo({})
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      
      // Try to get valid session token with retry
      let accessToken = await getValidSessionToken()
      
      // If no token, try one more time after a short delay
      if (!accessToken) {
        console.warn("[View Information] No access token on first attempt, retrying...")
        await new Promise(resolve => setTimeout(resolve, 500))
        accessToken = await getValidSessionToken()
      }

      if (!accessToken) {
        console.error("[View Information] No access token after retry")
        toast.error("Authentication required", { 
          description: "Your session has expired. Please refresh the page or log in again.",
          duration: 5000,
        })
        setIsLoadingInfo(false)
        // Don't close modal or redirect immediately - let user see the error
        // They can close it manually or we'll redirect after a delay
        setTimeout(() => {
          setIsViewInfoModalOpen(false)
          router.push("/login")
        }, 2000)
        return
      }
      
      console.log("[View Information] Access token obtained successfully")

      console.log("[View Information] Fetching Fortnox data...")

      // Fetch all available information in parallel
      // NOTE: Profile endpoint doesn't exist in Fortnox API - the "profile" scope is for OAuth only
      const [
        companyRes,
        settingsRes,
        invoicesRes,
        supplierInvoicesRes,
        expensesRes,
        vouchersRes,
        accountsRes,
        articlesRes,
        customersRes,
        suppliersRes,
      ] = await Promise.allSettled([
        fetch(`${apiBase}/api/integrations/fortnox/company`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/settings`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/invoices`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/supplier-invoices`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/expenses`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/vouchers`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/accounts`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/articles`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/customers`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/suppliers`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      const info: any = {}

      // Process company information
      if (companyRes.status === "fulfilled" && companyRes.value.ok) {
        try {
          const data = await companyRes.value.json()
          info.company = data.companyInformation || data
          console.log("✅ Company info loaded successfully")
        } catch (e) {
          console.error("❌ Error parsing company info:", e)
        }
      } else if (companyRes.status === "fulfilled") {
        console.error("❌ Company info request failed:", companyRes.value.status, companyRes.value.statusText)
        try {
          const errorText = await companyRes.value.text()
          console.error("Company info error response:", errorText)
        } catch (e) {
          console.error("Could not read company info error response")
        }
      } else {
        console.error("❌ Company info request rejected:", companyRes.reason)
      }

      // Process settings
      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        try {
          const data = await settingsRes.value.json()
          info.settings = data.settings || data
          console.log("✅ Settings loaded successfully")
        } catch (e) {
          console.error("❌ Error parsing settings:", e)
        }
      } else if (settingsRes.status === "fulfilled") {
        // Settings endpoint might fail if scope is missing or endpoint doesn't exist
        if (settingsRes.value.status === 400 || settingsRes.value.status === 403 || settingsRes.value.status === 404) {
          try {
            const errorText = await settingsRes.value.text()
            let errorData: any = {}
            try {
              errorData = JSON.parse(errorText)
            } catch (e) {
              errorData = { error: errorText }
            }
            const errorMsg = errorData.error || errorData.details || "Settings endpoint not available"
            console.log(`ℹ️ Settings not available: ${errorMsg} (Status: ${settingsRes.value.status})`)
          } catch (e) {
            console.log(`ℹ️ Settings endpoint returned ${settingsRes.value.status} - may require "settings" scope`)
          }
        } else {
          console.error("❌ Settings request failed:", settingsRes.value.status, settingsRes.value.statusText)
          try {
            const errorText = await settingsRes.value.text()
            console.error("Settings error response:", errorText)
          } catch (e) {
            console.error("Could not read settings error response")
          }
        }
      } else {
        console.error("❌ Settings request rejected:", settingsRes.reason)
      }

      // Process invoices
      if (invoicesRes.status === "fulfilled" && invoicesRes.value.ok) {
        try {
          const data = await invoicesRes.value.json()
          info.invoices = data.Invoices || data.invoices || []
          console.log(`✅ Invoices loaded: ${info.invoices.length} items`)
        } catch (e) {
          console.error("❌ Error parsing invoices:", e)
        }
      } else if (invoicesRes.status === "fulfilled") {
        if (invoicesRes.value.status === 403 || invoicesRes.value.status === 400) {
          console.log("ℹ️ Invoices not available - may require 'invoice' scope")
        } else {
          console.error("❌ Invoices request failed:", invoicesRes.value.status)
        }
      }

      // Process supplier invoices
      if (supplierInvoicesRes.status === "fulfilled" && supplierInvoicesRes.value.ok) {
        try {
          const data = await supplierInvoicesRes.value.json()
          info.supplierInvoices = data.SupplierInvoices || data.supplierInvoices || []
          console.log(`✅ Supplier invoices loaded: ${info.supplierInvoices.length} items`)
        } catch (e) {
          console.error("❌ Error parsing supplier invoices:", e)
        }
      } else if (supplierInvoicesRes.status === "fulfilled") {
        if (supplierInvoicesRes.value.status === 403 || supplierInvoicesRes.value.status === 400) {
          console.log("ℹ️ Supplier invoices not available - may require 'supplierinvoice' scope")
        } else {
          console.error("❌ Supplier invoices request failed:", supplierInvoicesRes.value.status)
        }
      }

      // Process expenses
      if (expensesRes.status === "fulfilled" && expensesRes.value.ok) {
        try {
          const data = await expensesRes.value.json()
          info.expenses = data.SalaryExpenses || data.Expenses || data.expenses || []
          console.log(`✅ Expenses loaded: ${info.expenses.length} items`)
        } catch (e) {
          console.error("❌ Error parsing expenses:", e)
        }
      } else if (expensesRes.status === "fulfilled") {
        // Handle scope/permission errors gracefully
        if (expensesRes.value.status === 403 || expensesRes.value.status === 400) {
          try {
            const errorText = await expensesRes.value.text()
            let errorData: any = {}
            try {
              errorData = JSON.parse(errorText)
            } catch (e) {
              errorData = { error: errorText }
            }
            const errorMsg = errorData.error || errorData.details || "Expenses endpoint not available"
            console.log(`ℹ️ Expenses not available: ${errorMsg} (Status: ${expensesRes.value.status})`)
          } catch (e) {
            console.log(`ℹ️ Expenses endpoint returned ${expensesRes.value.status} - may require "expense" or "salary" scope`)
          }
        } else if (expensesRes.value.status === 404) {
          console.log("ℹ️ Expenses endpoint not available - Fortnox API may not support listing expenses directly")
        } else {
          console.error("❌ Expenses request failed:", expensesRes.value.status, expensesRes.value.statusText)
        }
      } else {
        // Promise was rejected (network error, etc.)
        console.log("ℹ️ Expenses request failed (network error or missing scope):", expensesRes.reason?.message || expensesRes.reason)
      }

      // Process vouchers
      if (vouchersRes.status === "fulfilled" && vouchersRes.value.ok) {
        try {
          const data = await vouchersRes.value.json()
          info.vouchers = data.Vouchers || data.vouchers || []
          console.log(`✅ Vouchers loaded: ${info.vouchers.length} items`)
        } catch (e) {
          console.error("❌ Error parsing vouchers:", e)
        }
      } else if (vouchersRes.status === "fulfilled") {
        if (vouchersRes.value.status === 403 || vouchersRes.value.status === 400) {
          console.log("ℹ️ Vouchers not available - may require 'bookkeeping' scope")
        } else {
          console.error("❌ Vouchers request failed:", vouchersRes.value.status)
        }
      }

      // Process accounts
      if (accountsRes.status === "fulfilled" && accountsRes.value.ok) {
        try {
          const data = await accountsRes.value.json()
          info.accounts = data.Accounts || data.accounts || []
          console.log(`✅ Accounts loaded: ${info.accounts.length} items`)
        } catch (e) {
          console.error("❌ Error parsing accounts:", e)
        }
      } else if (accountsRes.status === "fulfilled") {
        if (accountsRes.value.status === 403 || accountsRes.value.status === 400) {
          console.log("ℹ️ Accounts not available - may require 'bookkeeping' scope")
        } else {
          console.error("❌ Accounts request failed:", accountsRes.value.status)
        }
      }

      // Process articles
      if (articlesRes.status === "fulfilled" && articlesRes.value.ok) {
        try {
          const data = await articlesRes.value.json()
          info.articles = data.Articles || data.articles || []
          console.log(`✅ Articles loaded: ${info.articles.length} items`)
        } catch (e) {
          console.error("❌ Error parsing articles:", e)
        }
      } else if (articlesRes.status === "fulfilled") {
        if (articlesRes.value.status === 403 || articlesRes.value.status === 400) {
          console.log("ℹ️ Articles not available - may require 'article' scope")
        } else {
          console.error("❌ Articles request failed:", articlesRes.value.status)
        }
      }

      // Process customers
      if (customersRes.status === "fulfilled" && customersRes.value.ok) {
        try {
          const data = await customersRes.value.json()
          // Existing endpoint returns { customers: [...] } format
          info.customers = data.customers || data.Customers || []
          console.log(`✅ Customers loaded: ${info.customers.length} items`)
        } catch (e) {
          console.error("❌ Error parsing customers:", e)
        }
      } else if (customersRes.status === "fulfilled") {
        if (customersRes.value.status === 403 || customersRes.value.status === 400) {
          console.log("ℹ️ Customers not available - may require 'customer' scope")
        } else {
          console.error("❌ Customers request failed:", customersRes.value.status)
        }
      }

      // Process suppliers
      if (suppliersRes.status === "fulfilled" && suppliersRes.value.ok) {
        try {
          const data = await suppliersRes.value.json()
          info.suppliers = data.Suppliers || data.suppliers || []
          console.log(`✅ Suppliers loaded: ${info.suppliers.length} items`)
        } catch (e) {
          console.error("❌ Error parsing suppliers:", e)
        }
      } else if (suppliersRes.status === "fulfilled") {
        if (suppliersRes.value.status === 403 || suppliersRes.value.status === 400) {
          console.log("ℹ️ Suppliers not available - may require 'supplier' scope")
        } else {
          console.error("❌ Suppliers request failed:", suppliersRes.value.status)
        }
      }

      setFortnoxInfo(info)
      
      const loadedSections = Object.keys(info).filter(key => info[key] !== undefined && info[key] !== null)
      if (loadedSections.length > 0) {
        toast.success("Information loaded", {
          description: `Successfully loaded ${loadedSections.length} section${loadedSections.length !== 1 ? "s" : ""} from Fortnox.`,
          duration: 3000,
        })
      } else {
        toast.warning("No information available", {
          description: "Could not load any information. Please check your permissions and try again.",
          duration: 5000,
        })
      }
      
      setIsLoadingInfo(false)
      console.log("[View Information] Successfully completed")
    } catch (error: any) {
      console.error("[View Information] Error fetching information:", error)
      toast.error("Failed to fetch information", {
        description: error.message || "An error occurred.",
      })
      setIsLoadingInfo(false)
      // Keep modal open so user can see the error
    }
  }

  // Fetch cost leak analysis
  const fetchCostLeakAnalysis = async () => {
    setIsLoadingAnalysis(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        setIsLoadingAnalysis(false)
        return
      }

      const response = await fetch(`${apiBase}/api/integrations/fortnox/cost-leaks`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch analysis: ${response.status}`)
      }

      const data = await response.json()
      setCostLeakAnalysis(data)
      
      if (data.overallSummary?.totalFindings > 0) {
        toast.success("Cost leak analysis completed", {
          description: `Found ${data.overallSummary.totalFindings} potential issues with ${data.overallSummary.totalPotentialSavings?.toLocaleString() || 0} SEK potential savings`,
          duration: 5000,
        })
      } else {
        toast.info("No cost leaks detected", {
          description: "Your supplier invoices look good!",
          duration: 3000,
        })
      }
    } catch (error: any) {
      console.error("Error fetching cost leak analysis:", error)
      toast.error("Failed to analyze cost leaks", {
        description: error.message || "An error occurred.",
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  }

  // Temporary helper to get token for testing
  const getTokenForTesting = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      console.log('✅ Your Supabase Access Token:')
      console.log(session.access_token)
      console.log('\n📋 Use this curl command:')
      console.log(`curl -H "Authorization: Bearer ${session.access_token}" http://localhost:4000/api/integrations/fortnox/cost-leaks`)
      // Copy to clipboard if possible
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(session.access_token)
        toast.success('Token copied to clipboard!')
      }
    } else {
      toast.error('No session found. Please log in.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!integrationToDelete) return

    setIsDeleting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        setIsDeleting(false)
        return
      }

      console.log(`[Delete Integration] Attempting to delete integration ${integrationToDelete.id}`)
      const deleteUrl = `${apiBase}/api/integrations/${integrationToDelete.id}`
      console.log(`[Delete Integration] URL: ${deleteUrl}`)

      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`[Delete Integration] Response status: ${res.status} ${res.statusText}`)

      if (!res.ok) {
        let errorMessage = `Failed to delete integration (${res.status} ${res.statusText})`
        try {
          const errorData = await res.json()
          console.error("[Delete Integration] Error response:", errorData)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await res.text()
            console.error("[Delete Integration] Error text:", errorText)
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error("[Delete Integration] Failed to parse error response:", textError)
          }
        }
        throw new Error(errorMessage)
      }

      // Parse successful response
      try {
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json()
          console.log("[Delete Integration] Success response:", data)
        } else {
          console.log("[Delete Integration] Success (no JSON response)")
        }
      } catch (parseError) {
        // Response might be empty, which is fine
        console.log("[Delete Integration] Success (empty or non-JSON response)")
      }

      toast.success("Integration deleted successfully", {
        description: `${integrationToDelete.tool_name} has been removed from your account.`,
      })

      // Close modal and reload integrations
      setIsDeleteModalOpen(false)
      setIntegrationToDelete(null)
      await loadIntegrations(true)
    } catch (error: any) {
      console.error("[Delete Integration] Error:", error)
      console.error("[Delete Integration] Error stack:", error.stack)
      toast.error("Failed to delete integration", {
        description: error.message || "An error occurred while deleting.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length
  const errorCount = integrations.filter((i) => i.status === "error").length
  const warningCount = integrations.filter((i) => i.status === "warning").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Integrations</h2>
          <p className="text-gray-400">Manage your connected tools and monitor sync status</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={getTokenForTesting}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
            title="Get token for API testing"
          >
            🔑 Get Token
          </Button>
          <Button
            onClick={() => loadIntegrations(true)}
            variant="outline"
            className="border-white/10 bg-black/50 text-white hover:bg-cyan-500/20"
            disabled={isLoading}
            title="Refresh integrations list"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        <Button
          onClick={() => setIsConnectModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Connect New Tool
        </Button>
        </div>
      </div>

      {/* Cost Leak Analysis Section */}
      {integrations.some((i) => i.tool_name === "Fortnox" && i.status === "connected") && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <CardTitle className="text-white flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Cost Leak Analysis
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  AI-powered analysis to identify potential cost leaks and savings opportunities
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {costLeakAnalysis && (
                  <Button
                    onClick={() => setIsCostAnalysisVisible(!isCostAnalysisVisible)}
                    variant="outline"
                    className="border-white/10 bg-black/50 text-white hover:bg-white/10"
                    title={isCostAnalysisVisible ? "Hide analysis" : "Show analysis"}
                  >
                    {isCostAnalysisVisible ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={fetchCostLeakAnalysis}
                  disabled={isLoadingAnalysis}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
                >
                  {isLoadingAnalysis ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analyze Cost Leaks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {costLeakAnalysis && isCostAnalysisVisible && (
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/40 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Total Findings</p>
                  <p className="text-2xl font-bold text-white">
                    {costLeakAnalysis.overallSummary?.totalFindings || 0}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-green-500/30 hover:border-green-500/50 transition-colors">
                  <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Potential Savings</p>
                  <p className="text-2xl font-bold text-green-400">
                    {costLeakAnalysis.overallSummary?.totalPotentialSavings 
                      ? `${costLeakAnalysis.overallSummary.totalPotentialSavings.toLocaleString('sv-SE')} SEK`
                      : "0 SEK"}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-red-500/30 hover:border-red-500/50 transition-colors">
                  <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">High Priority</p>
                  <p className="text-2xl font-bold text-red-400">
                    {costLeakAnalysis.overallSummary?.highSeverity || 0}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30 hover:border-amber-500/50 transition-colors">
                  <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Medium Priority</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {costLeakAnalysis.overallSummary?.mediumSeverity || 0}
                  </p>
                </div>
              </div>

              {/* Subscription Optimization Section */}
              {costLeakAnalysis.subscriptionAnalysis && (
                <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-lg p-5 border border-indigo-500/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-400" />
                      Subscription Optimization
                    </h3>
                    {costLeakAnalysis.subscriptionAnalysis.summary && (
                      <Badge variant="outline" className="border-indigo-500/50 text-indigo-300 bg-indigo-500/10">
                        {costLeakAnalysis.subscriptionAnalysis.summary.utilizationScore}% Utilization
                      </Badge>
                    )}
                  </div>
                  
                  {costLeakAnalysis.subscriptionAnalysis.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-black/40 rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Features Used</p>
                        <p className="text-xl font-bold text-white">
                          {costLeakAnalysis.subscriptionAnalysis.summary.activeFeaturesCount}/{costLeakAnalysis.subscriptionAnalysis.summary.totalFeaturesCount}
                        </p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Transactions</p>
                        <p className="text-xl font-bold text-white">
                          {costLeakAnalysis.subscriptionAnalysis.summary.transactionVolume}
                        </p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-indigo-500/30">
                        <p className="text-xs text-gray-400 mb-1">Utilization</p>
                        <p className="text-xl font-bold text-indigo-400">
                          {costLeakAnalysis.subscriptionAnalysis.summary.utilizationScore}%
                        </p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-amber-500/30">
                        <p className="text-xs text-gray-400 mb-1">Recommendations</p>
                        <p className="text-xl font-bold text-amber-400">
                          {costLeakAnalysis.subscriptionAnalysis.summary.recommendations}
                        </p>
                      </div>
                    </div>
                  )}

                  {costLeakAnalysis.subscriptionAnalysis.findings && 
                   costLeakAnalysis.subscriptionAnalysis.findings.length > 0 && (
                    <div className="space-y-2">
                      {costLeakAnalysis.subscriptionAnalysis.findings.map((finding: any, idx: number) => (
                        <div
                          key={idx}
                          className={`bg-black/40 rounded-lg p-3 border ${
                            finding.severity === "high"
                              ? "border-red-500/40"
                              : finding.severity === "medium"
                              ? "border-amber-500/40"
                              : "border-indigo-500/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Badge
                              className={
                                finding.severity === "high"
                                  ? "bg-red-500/20 text-red-300 border-red-500/50"
                                  : finding.severity === "medium"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                  : "bg-indigo-500/20 text-indigo-300 border-indigo-500/50"
                              }
                              variant="outline"
                            >
                              {finding.severity === "high" ? "High" : finding.severity === "medium" ? "Medium" : "Low"}
                            </Badge>
                            <div className="flex-1">
                              <h4 className="font-semibold text-white text-sm mb-1">{finding.title}</h4>
                              <p className="text-xs text-gray-300 mb-2">{finding.description}</p>
                              {finding.recommendation && (
                                <p className="text-xs text-indigo-300 italic">💡 {finding.recommendation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Findings List */}
              {costLeakAnalysis.supplierInvoiceAnalysis?.findings && 
               costLeakAnalysis.supplierInvoiceAnalysis.findings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-400" />
                      Cost Leak Findings
                    </h3>
                    <Badge variant="outline" className="border-white/20 text-gray-300">
                      {costLeakAnalysis.supplierInvoiceAnalysis.findings.length} issue{costLeakAnalysis.supplierInvoiceAnalysis.findings.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {costLeakAnalysis.supplierInvoiceAnalysis.findings.slice(0, 20).map((finding: any, idx: number) => (
                      <div
                        key={idx}
                        className={`bg-black/40 rounded-lg p-4 border transition-all hover:shadow-lg ${
                          finding.severity === "high"
                            ? "border-red-500/50 hover:border-red-500/70"
                            : finding.severity === "medium"
                            ? "border-amber-500/50 hover:border-amber-500/70"
                            : "border-slate-500/50 hover:border-slate-500/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                className={
                                  finding.severity === "high"
                                    ? "bg-red-500/20 text-red-300 border-red-500/50"
                                    : finding.severity === "medium"
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                    : "bg-slate-500/20 text-slate-300 border-slate-500/50"
                                }
                                variant="outline"
                              >
                                {finding.severity === "high" ? "High" : finding.severity === "medium" ? "Medium" : "Low"}
                              </Badge>
                              <h4 className="font-semibold text-white text-sm">{finding.title}</h4>
                            </div>
                            <p className="text-sm text-gray-300 mb-3 leading-relaxed">{finding.description}</p>
                            {finding.potentialSavings > 0 && (
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs text-gray-400">Potential Savings:</span>
                                <span className="text-sm font-semibold text-green-400">
                                  {finding.potentialSavings.toLocaleString('sv-SE')} SEK
                                </span>
                              </div>
                            )}
                            {finding.invoices && finding.invoices.length > 0 && (
                              <details className="mt-3 group">
                                <summary className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300 font-medium list-none flex items-center gap-2">
                                  <span className="transition-transform group-open:rotate-90">▶</span>
                                  View {finding.invoices.length} invoice{finding.invoices.length !== 1 ? 's' : ''}
                                </summary>
                                <div className="mt-3 space-y-2 pl-4 border-l-2 border-white/10">
                                  {finding.invoices.map((inv: any, invIdx: number) => (
                                    <div key={invIdx} className="text-xs bg-black/30 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                          <Receipt className="w-3 h-3 text-gray-500" />
                                          <span className="text-white font-medium">
                                            Invoice #{inv.GivenNumber || inv.DocumentNumber}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-400">
                                          <span>{inv.InvoiceDate || 'N/A'}</span>
                                          <span className="text-green-400 font-medium">
                                            {inv.calculatedTotal ? `${inv.calculatedTotal.toLocaleString('sv-SE')} SEK` : '0 SEK'}
                                          </span>
                                        </div>
                                      </div>
                                      {inv.SupplierName && (
                                        <div className="mt-1 text-gray-500">
                                          Supplier: {inv.SupplierName}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {costLeakAnalysis.supplierInvoiceAnalysis.findings.length > 20 && (
                    <div className="text-center pt-2">
                      <p className="text-xs text-gray-500">
                        Showing 20 of {costLeakAnalysis.supplierInvoiceAnalysis.findings.length} findings
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* No Findings */}
              {(!costLeakAnalysis.supplierInvoiceAnalysis?.findings || 
                costLeakAnalysis.supplierInvoiceAnalysis.findings.length === 0) && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-white font-semibold text-lg mb-1">No cost leaks detected!</p>
                  <p className="text-gray-400 text-sm">Your supplier invoices look good.</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

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
      {isLoading ? (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading integrations...</p>
          </CardContent>
        </Card>
      ) : integrations.length === 0 ? (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-8 text-center">
            <ExternalLink className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No integrations connected yet</p>
            <Button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
            >
              Connect Your First Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                      <CardTitle className="text-white">{integration.tool_name}</CardTitle>
                      <p className="text-xs text-gray-400 mt-1">
                        Last sync: {formatDate(integration.updated_at || integration.created_at)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {integration.connection_type} • {integration.environment}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      integration.status === "connected"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : integration.status === "error"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }
                  >
                    {integration.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {integration.tool_name === "Fortnox" && (
                    <>
                  {integration.status === "error" ? (
                    <Button
                      className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white"
                      onClick={startFortnoxOAuth}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconnect
                    </Button>
                  ) : (
                    <>
                        <Button
                          variant="outline"
                          className="border-white/10 bg-black/50 text-white hover:bg-cyan-500/20"
                          onClick={() => {
                            console.log("[View Information] Button clicked for:", integration.tool_name || (integration as any).provider)
                            handleViewInformation(integration)
                          }}
                          disabled={isLoadingInfo || integration.status !== "connected"}
                        >
                          {isLoadingInfo ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              View Information
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/10 bg-black/50 text-white"
                          onClick={() => handleSyncNow(integration)}
                          disabled={syncingId === integration.id}
                        >
                          {syncingId === integration.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                            </>
                          )}
                    </Button>
                    </>
                      )}
                    </>
                  )}
                  <Button variant="outline" className="border-white/10 bg-black/50 text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                    <Button
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDeleteClick(integration)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Tool Modal */}
      <Dialog 
        open={isConnectModalOpen} 
        onOpenChange={(open) => {
          setIsConnectModalOpen(open)
          // Reset connecting state when modal closes
          if (!open) {
            setIsConnecting(false)
          }
        }}
      >
        <DialogContent className="!bg-black/95 !border-white/10 text-white max-w-md">
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
                  className="w-full h-10 !bg-black/95 !border !border-white/10 !text-white hover:!bg-cyan-500/30 focus:!bg-cyan-500/30 focus:!ring-2 focus:!ring-cyan-500/50 data-[placeholder]:!text-gray-400 !rounded-md !px-3 !py-2 [&>span]:!text-white"
                >
                  <SelectValue placeholder="Choose a tool..." />
                </SelectTrigger>
                <SelectContent 
                  className="bg-black/95 border border-white/10 backdrop-blur-xl z-[100] shadow-lg"
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem
                    value="fortnox"
                    className="text-white hover:bg-cyan-500/30 focus:bg-cyan-500/30 data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer"
                  >
                    Fortnox
                  </SelectItem>
                  {/* Add more tools here later */}
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
                  <p className="text-xs text-gray-500">
                    Get this from your Fortnox Developer Portal
                  </p>
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
                  <p className="text-xs text-gray-500">
                    Keep this secure. We'll encrypt it when stored.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment" className="text-gray-300">
                    Environment
                  </Label>
                {/* Native select for environment to avoid Radix issues inside dialog */}
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
                  <p className="text-xs text-gray-500">
                    Use sandbox for testing, production for live data
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-blue-400">
                    <strong>Note:</strong> After connecting, you'll need to complete the OAuth
                    authorization flow in your Fortnox account to grant access.
                  </p>
                </div>
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
              }}
              className="border-white/10 bg-black/50 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectFortnox}
              disabled={!selectedTool || (selectedTool === "fortnox" && (!fortnoxForm.clientId || !fortnoxForm.clientSecret)) || isConnecting}
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
      <Dialog 
        open={isDeleteModalOpen} 
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open)
          if (!open) {
            setIntegrationToDelete(null)
            setIsDeleting(false)
          }
        }}
      >
        <DialogContent className="!bg-black/95 !border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Integration</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this integration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {integrationToDelete && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3">
                  {getStatusIcon(integrationToDelete.status)}
                  <div>
                    <p className="text-white font-medium">{integrationToDelete.tool_name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {integrationToDelete.connection_type} • {integrationToDelete.environment}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                This will permanently remove the integration and all associated data. You will need to reconnect if you want to use this integration again.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setIntegrationToDelete(null)
              }}
              disabled={isDeleting}
              className="border-white/10 bg-black/50 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Integration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Information Modal */}
      <Dialog 
        open={isViewInfoModalOpen} 
        onOpenChange={(open) => {
          setIsViewInfoModalOpen(open)
          if (!open) {
            setFortnoxInfo({})
            setInfoSearchQuery("")
          }
        }}
      >
        <DialogContent className="!bg-black/95 !border-white/10 text-white max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Fortnox Information
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              View all available information from Fortnox (read-only)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoadingInfo ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="ml-3 text-gray-400">Loading information...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Company Information Section */}
                {fortnoxInfo.company && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Company Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {fortnoxInfo.company.CompanyName && (
                        <div>
                          <span className="text-gray-500">Company Name:</span>
                          <p className="text-white font-medium">{fortnoxInfo.company.CompanyName}</p>
                        </div>
                      )}
                      {fortnoxInfo.company.OrganizationNumber && (
                        <div>
                          <span className="text-gray-500">Organization Number:</span>
                          <p className="text-white font-medium">{fortnoxInfo.company.OrganizationNumber}</p>
                        </div>
                      )}
                      {(fortnoxInfo.company.Street || fortnoxInfo.company.Address) && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Address:</span>
                          <p className="text-white font-medium">
                            {fortnoxInfo.company.Street || fortnoxInfo.company.Address}
                            {fortnoxInfo.company.City && `, ${fortnoxInfo.company.City}`}
                            {fortnoxInfo.company.ZipCode && ` ${fortnoxInfo.company.ZipCode}`}
                          </p>
                        </div>
                      )}
                      {fortnoxInfo.company.Phone && (
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="text-white font-medium">{fortnoxInfo.company.Phone}</p>
                        </div>
                      )}
                      {fortnoxInfo.company.Email && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="text-white font-medium">{fortnoxInfo.company.Email}</p>
                        </div>
                      )}
                      {(fortnoxInfo.company.CountryCode || fortnoxInfo.company.Country) && (
                        <div>
                          <span className="text-gray-500">Country:</span>
                          <p className="text-white font-medium">{fortnoxInfo.company.CountryCode || fortnoxInfo.company.Country}</p>
                        </div>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View Full JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.company, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Settings Section */}
                {fortnoxInfo.settings && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Settings
                    </h3>
                    <details>
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                        View Settings JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10">
                        {JSON.stringify(fortnoxInfo.settings, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Invoices Section */}
                {fortnoxInfo.invoices && fortnoxInfo.invoices.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Invoices ({fortnoxInfo.invoices.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.invoices.slice(0, 10).map((invoice: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {invoice.DocumentNumber || invoice.InvoiceNumber || `Invoice #${idx + 1}`}
                              </p>
                              {invoice.CustomerName && (
                                <p className="text-gray-400 text-xs mt-1">Customer: {invoice.CustomerName}</p>
                              )}
                              {invoice.Total && (
                                <p className="text-cyan-400 text-xs mt-1">
                                  {invoice.Total} {invoice.Currency || "SEK"}
                                </p>
                              )}
                            </div>
                            {invoice.InvoiceDate && (
                              <span className="text-gray-500 text-xs">
                                {new Date(invoice.InvoiceDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.invoices.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.invoices.length} invoices
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Invoices JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.invoices, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Supplier Invoices Section */}
                {fortnoxInfo.supplierInvoices && fortnoxInfo.supplierInvoices.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Supplier Invoices ({fortnoxInfo.supplierInvoices.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.supplierInvoices.slice(0, 10).map((invoice: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {invoice.DocumentNumber || invoice.InvoiceNumber || `Supplier Invoice #${idx + 1}`}
                              </p>
                              {invoice.SupplierName && (
                                <p className="text-gray-400 text-xs mt-1">Supplier: {invoice.SupplierName}</p>
                              )}
                              {invoice.Total && (
                                <p className="text-orange-400 text-xs mt-1">
                                  {invoice.Total} {invoice.Currency || "SEK"}
                                </p>
                              )}
                            </div>
                            {invoice.InvoiceDate && (
                              <span className="text-gray-500 text-xs">
                                {new Date(invoice.InvoiceDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.supplierInvoices.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.supplierInvoices.length} supplier invoices
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Supplier Invoices JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.supplierInvoices, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Expenses Section */}
                {fortnoxInfo.expenses && fortnoxInfo.expenses.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Expenses ({fortnoxInfo.expenses.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.expenses.slice(0, 10).map((expense: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {expense.Description || expense.Text || `Expense #${idx + 1}`}
                              </p>
                              {expense.EmployeeName && (
                                <p className="text-gray-400 text-xs mt-1">Employee: {expense.EmployeeName}</p>
                              )}
                              {expense.Total && (
                                <p className="text-red-400 text-xs mt-1">
                                  {expense.Total} {expense.Currency || "SEK"}
                                </p>
                              )}
                            </div>
                            {expense.ExpenseDate && (
                              <span className="text-gray-500 text-xs">
                                {new Date(expense.ExpenseDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.expenses.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.expenses.length} expenses
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Expenses JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.expenses, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Vouchers Section */}
                {fortnoxInfo.vouchers && fortnoxInfo.vouchers.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Vouchers ({fortnoxInfo.vouchers.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.vouchers.slice(0, 10).map((voucher: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {voucher.VoucherNumber || voucher.Series || `Voucher #${idx + 1}`}
                              </p>
                              {voucher.Description && (
                                <p className="text-gray-400 text-xs mt-1">{voucher.Description}</p>
                              )}
                            </div>
                            {voucher.VoucherDate && (
                              <span className="text-gray-500 text-xs">
                                {new Date(voucher.VoucherDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.vouchers.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.vouchers.length} vouchers
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Vouchers JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.vouchers, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Accounts Section */}
                {fortnoxInfo.accounts && fortnoxInfo.accounts.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Accounts ({fortnoxInfo.accounts.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.accounts.slice(0, 10).map((account: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {account.AccountNumber || account.Number || `Account #${idx + 1}`}
                              </p>
                              {account.Description && (
                                <p className="text-gray-400 text-xs mt-1">{account.Description}</p>
                              )}
                              {account.Balance && (
                                <p className="text-green-400 text-xs mt-1">
                                  Balance: {account.Balance} {account.Currency || "SEK"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.accounts.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.accounts.length} accounts
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Accounts JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.accounts, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Customers Section */}
                {fortnoxInfo.customers && fortnoxInfo.customers.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Customers ({fortnoxInfo.customers.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.customers.slice(0, 10).map((customer: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {customer.CustomerNumber || customer.Number || `Customer #${idx + 1}`}
                              </p>
                              <p className="text-gray-300 text-xs mt-1">{customer.Name}</p>
                              {customer.Email && (
                                <p className="text-gray-400 text-xs mt-1">Email: {customer.Email}</p>
                              )}
                              {customer.Phone1 && (
                                <p className="text-gray-400 text-xs mt-1">Phone: {customer.Phone1}</p>
                              )}
                              {customer.City && (
                                <p className="text-gray-400 text-xs mt-1">
                                  {customer.City}
                                  {customer.ZipCode && `, ${customer.ZipCode}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.customers.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.customers.length} customers
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Customers JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.customers, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Suppliers Section */}
                {fortnoxInfo.suppliers && fortnoxInfo.suppliers.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Suppliers ({fortnoxInfo.suppliers.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.suppliers.slice(0, 10).map((supplier: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {supplier.SupplierNumber || supplier.Number || `Supplier #${idx + 1}`}
                              </p>
                              <p className="text-gray-300 text-xs mt-1">{supplier.Name}</p>
                              {supplier.Email && (
                                <p className="text-gray-400 text-xs mt-1">Email: {supplier.Email}</p>
                              )}
                              {supplier.Phone1 && (
                                <p className="text-gray-400 text-xs mt-1">Phone: {supplier.Phone1}</p>
                              )}
                              {supplier.City && (
                                <p className="text-gray-400 text-xs mt-1">
                                  {supplier.City}
                                  {supplier.ZipCode && `, ${supplier.ZipCode}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.suppliers.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.suppliers.length} suppliers
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Suppliers JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.suppliers, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Articles Section */}
                {fortnoxInfo.articles && fortnoxInfo.articles.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Articles ({fortnoxInfo.articles.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fortnoxInfo.articles.slice(0, 10).map((article: any, idx: number) => (
                        <div key={idx} className="bg-black/30 p-3 rounded border border-white/5 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">
                                {article.ArticleNumber || article.Number || `Article #${idx + 1}`}
                              </p>
                              {article.Description && (
                                <p className="text-gray-400 text-xs mt-1">{article.Description}</p>
                              )}
                              {article.Price && (
                                <p className="text-purple-400 text-xs mt-1">
                                  Price: {article.Price} {article.Currency || "SEK"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {fortnoxInfo.articles.length > 10 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          Showing 10 of {fortnoxInfo.articles.length} articles
                        </p>
                      )}
                    </div>
                    <details className="mt-4">
                      <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                        View All Articles JSON
                      </summary>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-black/50 p-4 rounded border border-white/10 mt-2">
                        {JSON.stringify(fortnoxInfo.articles, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* No Information Available */}
                {!fortnoxInfo.company && 
                 !fortnoxInfo.settings && 
                 !fortnoxInfo.invoices?.length && 
                 !fortnoxInfo.supplierInvoices?.length && 
                 !fortnoxInfo.expenses?.length && 
                 !fortnoxInfo.vouchers?.length && 
                 !fortnoxInfo.accounts?.length && 
                 !fortnoxInfo.articles?.length &&
                 !fortnoxInfo.customers?.length &&
                 !fortnoxInfo.suppliers?.length && (
                  <div className="text-center py-12">
                    <Settings className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No information available</p>
                    <p className="text-sm text-gray-500 mt-2">Please check your permissions and try again.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-gray-400">
                {(() => {
                  const loadedSections = Object.keys(fortnoxInfo).filter(key => {
                    const value = (fortnoxInfo as any)[key]
                    return value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true)
                  })
                  return loadedSections.length > 0 ? (
                    <>
                      {loadedSections.length} section{loadedSections.length !== 1 ? "s" : ""} loaded
                    </>
                  ) : null
                })()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsViewInfoModalOpen(false)}
                  className="border-white/10 bg-black/50 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
