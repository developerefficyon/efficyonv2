"use client"

import { useEffect, useState, useCallback } from "react"
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
  Search,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/auth-context"
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
  }>({})
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [infoSearchQuery, setInfoSearchQuery] = useState("")
  const [fortnoxForm, setFortnoxForm] = useState({
    clientId: "",
    clientSecret: "",
    environment: "sandbox",
  })

  const loadIntegrations = useCallback(async () => {
    try {
      setIsLoading(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        console.warn("No access token available for loading integrations")
        setIsLoading(false)
        setIntegrations([])
        return
      }

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

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
      setIsLoading(false)
    }
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
      return
    }

    // Reset connecting state when component loads (in case user returns from OAuth)
    setIsConnecting(false)
    
    // Check for OAuth callback result in URL params first
    const params = new URLSearchParams(window.location.search)
    const fortnoxStatus = params.get("fortnox")
    const fortnoxError = params.get("error")
    const fortnoxErrorDesc = params.get("error_desc")
    const scopeWarning = params.get("scope_warning") === "true"
    
    // If no OAuth callback params, just load integrations normally
    if (!fortnoxStatus && !fortnoxError) {
      void loadIntegrations()
      return
    }
    
    // Handle OAuth callback - clean up URL immediately to prevent re-triggering
    if (fortnoxStatus === "connected") {
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

      if (scopeWarning) {
        toast.warning("Fortnox Connected - Missing Customer Permission", {
          description: "Fortnox is connected, but the 'customer' permission was not granted. You need to reconnect and grant customer access to sync customers. Click 'Reconnect' to fix this.",
          action: {
            label: "Reconnect",
            onClick: startFortnoxOAuth,
          },
          duration: 15000,
        })
      } else {
      toast.success("Fortnox connected successfully!", {
          description: "Your Fortnox integration is now active. Loading customers...",
        duration: 5000,
      })
        
        // Automatically fetch and show customers after successful connection
        setTimeout(async () => {
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
            const {
              data: { session },
            } = await supabase.auth.getSession()
            const accessToken = session?.access_token

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
      
      // Load integrations immediately, then reload after delay to ensure backend has saved
      void loadIntegrations()
      // Also reload after a short delay to ensure backend has saved the connection
      setTimeout(() => {
        console.log("Reloading integrations after successful connection...")
        void loadIntegrations()
      }, 1000)
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
      void loadIntegrations()
      return
    }
    
    // Always load integrations (only if not handling OAuth callback)
    void loadIntegrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const startFortnoxOAuth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        toast.error("You must be logged in to connect Fortnox")
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
      
      if (refreshError || !refreshedSession) {
        // If refresh fails, try to get current session
      const {
        data: { session },
      } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          toast.error("Session expired", {
            description: "Please log in again to continue.",
          })
          return
        }
      }
      
      // Use refreshed session or fallback to current session
      const session = refreshedSession || (await supabase.auth.getSession()).data.session
      const accessToken = session?.access_token

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
              
              await loadIntegrations()
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

      await loadIntegrations()
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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("You must be logged in to connect integrations")
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
              tool_name: "Fortnox",
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
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        console.error("[Fortnox Connect] Error getting OAuth URL:", errorData)
        throw new Error(errorData.error || "Failed to start Fortnox OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        console.error("[Fortnox Connect] No URL in response:", oauthData)
        throw new Error("No OAuth URL returned from backend")
      }

      console.log("[Fortnox Connect] Step 3: Redirecting to Fortnox...", redirectUrl)

      toast.success("Fortnox integration created. Redirecting to Fortnox to authorize...", {
        description: "You'll be taken to Fortnox to grant access.",
      })

      // Reset all states before redirecting
      setIsConnecting(false)
      setIsConnectModalOpen(false)
      setFortnoxForm({ clientId: "", clientSecret: "", environment: "sandbox" })
      setSelectedTool("")

      // Small delay to let the toast show, then redirect
      setTimeout(() => {
        window.location.href = redirectUrl
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
    if (integration.tool_name !== "Fortnox") return
    
    setIsViewInfoModalOpen(true)
    setIsLoadingInfo(true)
    setFortnoxInfo({})
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        toast.error("You must be logged in to view information")
        setIsViewInfoModalOpen(false)
        return
      }

      // Fetch all available information in parallel
      // NOTE: Profile endpoint doesn't exist in Fortnox API - the "profile" scope is for OAuth only
      // NOTE: Customers removed - requires license
      const [companyRes, settingsRes] = await Promise.allSettled([
        fetch(`${apiBase}/api/integrations/fortnox/company`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/settings`, {
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
    } catch (error: any) {
      console.error("Error fetching information:", error)
      toast.error("Failed to fetch information", {
        description: error.message || "An error occurred.",
      })
    } finally {
      setIsLoadingInfo(false)
    }
  }


  const handleDeleteConfirm = async () => {
    if (!integrationToDelete) return

    setIsDeleting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        toast.error("You must be logged in to delete integrations")
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
      await loadIntegrations()
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
        <Button
          onClick={() => setIsConnectModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
        >
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
                          className="border-white/10 bg-black/50 text-white"
                          onClick={() => handleViewInformation(integration)}
                          disabled={isLoadingInfo}
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
              {/* Use a simple native select here to avoid any Radix / portal issues inside the dialog */}
              <select
                  id="tool-select"
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="bg-black/50 border-white/10 text-white rounded-md px-3 py-2 w-full"
                >
                <option value="">Choose a tool...</option>
                <option value="fortnox">Fortnox</option>
                  {/* Add more tools here later */}
              </select>
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

                {/* No Information Available */}
                {!fortnoxInfo.company && !fortnoxInfo.settings && (
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
