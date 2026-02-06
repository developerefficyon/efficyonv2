"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Search,
  FileText,
  Receipt,
  CreditCard,
  BookOpen,
  Wallet,
  Package,
  Users,
  BarChart3,
  Info,
  Database,
  Filter,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCheck,
  X,
  Sparkles,
  Target,
  Zap,
  DollarSign,
  Download,
  Key,
  Timer,
  Shield,
  Copy,
  Settings,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { toast } from "sonner"
import { formatCurrencyForIntegration } from "@/lib/currency"

interface Integration {
  id: string
  tool_name: string
  provider: string
  connection_type: string
  status: string
  environment: string
  created_at: string
  updated_at: string
  settings?: any
}

export default function ToolDetailPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const integrationId = params.id as string

  const [integration, setIntegration] = useState<Integration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
  const [microsoft365Info, setMicrosoft365Info] = useState<{
    licenses?: any[]
    users?: any[]
    usageReports?: any
  }>({})
  const [hubspotInfo, setHubspotInfo] = useState<{
    users?: any[]
    accountInfo?: any
  }>({})
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [infoSearchQuery, setInfoSearchQuery] = useState("")
  const [isInfoVisible, setIsInfoVisible] = useState(true)
  const [costLeakAnalysis, setCostLeakAnalysis] = useState<any>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(true)
  const [findingsFilter, setFindingsFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [findingsSearch, setFindingsSearch] = useState("")

  // Date range for Fortnox analysis
  const [fortnoxStartDate, setFortnoxStartDate] = useState<string>("")
  const [fortnoxEndDate, setFortnoxEndDate] = useState<string>("")

  // Inactivity threshold for MS365 and HubSpot (in days)
  const [inactivityDays, setInactivityDays] = useState<number>(30)

  // Analysis history state
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoricalAnalysis, setSelectedHistoricalAnalysis] = useState<any>(null)
  const [isLoadingHistoricalAnalysis, setIsLoadingHistoricalAnalysis] = useState(false)
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"current" | "history">("current")
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false)

  const [dismissedFindings, setDismissedFindings] = useState<Set<number>>(new Set())
  const [resolvedFindings, setResolvedFindings] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["duplicates", "anomalies", "overdue"]))
  const [groupPages, setGroupPages] = useState<{ [key: string]: number }>({})
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const ITEMS_PER_PAGE = 10

  // Data tab pagination states
  const [customersPage, setCustomersPage] = useState(1)
  const [invoicesPage, setInvoicesPage] = useState(1)
  const [supplierInvoicesPage, setSupplierInvoicesPage] = useState(1)
  const [accountsPage, setAccountsPage] = useState(1)
  const [articlesPage, setArticlesPage] = useState(1)
  const [suppliersPage, setSuppliersPage] = useState(1)
  const [activeDataTab, setActiveDataTab] = useState<string>("company")

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    void loadIntegration()
  }, [authLoading, user, integrationId, router])

  const loadIntegration = async () => {
    try {
      setIsLoading(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const res = await fetch(`${apiBase}/api/integrations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        throw new Error("Failed to load integrations")
      }

      const data = await res.json()
      const found = data.integrations?.find((i: Integration) => i.id === integrationId)

      if (!found) {
        toast.error("Integration not found")
        router.push("/dashboard/tools")
        return
      }

      setIntegration(found)

      // Set default data tab based on integration type
      if (found.tool_name === "Microsoft365" || found.provider === "Microsoft365") {
        setActiveDataTab("licenses")
      } else if (found.tool_name === "HubSpot" || found.provider === "HubSpot") {
        setActiveDataTab("users")
      } else {
        setActiveDataTab("company")
      }

      // If it's Fortnox and connected, load the information (but not analysis - user must click button)
      if (found.tool_name === "Fortnox" && found.status === "connected") {
        void loadFortnoxInfo(found)
        // Analysis is only loaded when user clicks "Analyze Cost Leaks" button
      }

      // If it's Microsoft 365 and connected, load the information
      if (found.tool_name === "Microsoft365" && found.status === "connected") {
        void loadMicrosoft365Info(found)
      }

      // If it's HubSpot and connected, load the information
      if (found.tool_name === "HubSpot" && found.status === "connected") {
        void loadHubSpotInfo(found)
      }
    } catch (error) {
      console.error("Error loading integration:", error)
      toast.error("Failed to load integration", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      router.push("/dashboard/tools")
    } finally {
      setIsLoading(false)
    }
  }

  const loadFortnoxInfo = async (integration: Integration) => {
    setIsLoadingInfo(true)
    setFortnoxInfo({})

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required")
        setIsLoadingInfo(false)
        return
      }

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
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/invoices`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/supplier-invoices`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/expenses`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/vouchers`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/accounts`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/articles`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/customers`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/fortnox/suppliers`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      const info: any = {}

      // Check if any response indicates token expiration
      const allResponses = [
        companyRes, settingsRes, invoicesRes, supplierInvoicesRes,
        expensesRes, vouchersRes, accountsRes, articlesRes, customersRes, suppliersRes
      ]

      for (const response of allResponses) {
        if (response.status === "fulfilled" && !response.value.ok) {
          try {
            const errorClone = response.value.clone()
            const errorData = await errorClone.json()
            if (errorData.requiresReconnect || errorData.code === "TOKEN_EXPIRED") {
              toast.error("Integration token expired", {
                description: "Please reconnect your Fortnox integration to continue.",
                duration: 10000,
              })
              setIsLoadingInfo(false)
              return
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }

      if (companyRes.status === "fulfilled" && companyRes.value.ok) {
        try {
          const data = await companyRes.value.json()
          info.company = data.companyInformation || data
        } catch (e) {
          console.error("Error parsing company info:", e)
        }
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        try {
          const data = await settingsRes.value.json()
          info.settings = data.settings || data
        } catch (e) {
          console.error("Error parsing settings:", e)
        }
      }

      if (invoicesRes.status === "fulfilled" && invoicesRes.value.ok) {
        try {
          const data = await invoicesRes.value.json()
          info.invoices = data.Invoices || data.invoices || []
        } catch (e) {
          console.error("Error parsing invoices:", e)
        }
      }

      if (supplierInvoicesRes.status === "fulfilled" && supplierInvoicesRes.value.ok) {
        try {
          const data = await supplierInvoicesRes.value.json()
          info.supplierInvoices = data.SupplierInvoices || data.supplierInvoices || []
        } catch (e) {
          console.error("Error parsing supplier invoices:", e)
        }
      }

      if (expensesRes.status === "fulfilled" && expensesRes.value.ok) {
        try {
          const data = await expensesRes.value.json()
          info.expenses = data.SalaryExpenses || data.Expenses || data.expenses || []
        } catch (e) {
          console.error("Error parsing expenses:", e)
        }
      }

      if (vouchersRes.status === "fulfilled" && vouchersRes.value.ok) {
        try {
          const data = await vouchersRes.value.json()
          info.vouchers = data.Vouchers || data.vouchers || []
        } catch (e) {
          console.error("Error parsing vouchers:", e)
        }
      }

      if (accountsRes.status === "fulfilled" && accountsRes.value.ok) {
        try {
          const data = await accountsRes.value.json()
          info.accounts = data.Accounts || data.accounts || []
        } catch (e) {
          console.error("Error parsing accounts:", e)
        }
      }

      if (articlesRes.status === "fulfilled" && articlesRes.value.ok) {
        try {
          const data = await articlesRes.value.json()
          info.articles = data.Articles || data.articles || []
        } catch (e) {
          console.error("Error parsing articles:", e)
        }
      }

      if (customersRes.status === "fulfilled" && customersRes.value.ok) {
        try {
          const data = await customersRes.value.json()
          info.customers = data.customers || data.Customers || []
        } catch (e) {
          console.error("Error parsing customers:", e)
        }
      }

      if (suppliersRes.status === "fulfilled" && suppliersRes.value.ok) {
        try {
          const data = await suppliersRes.value.json()
          info.suppliers = data.Suppliers || data.suppliers || []
        } catch (e) {
          console.error("Error parsing suppliers:", e)
        }
      }

      setFortnoxInfo(info)
    } catch (error) {
      console.error("Error loading Fortnox info:", error)
      toast.error("Failed to load integration information")
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const loadMicrosoft365Info = async (integration: Integration) => {
    setIsLoadingInfo(true)
    setMicrosoft365Info({})

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required")
        setIsLoadingInfo(false)
        return
      }

      const [licensesRes, usersRes] = await Promise.allSettled([
        fetch(`${apiBase}/api/integrations/microsoft365/licenses`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/microsoft365/users`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      const info: any = {}

      // Check if any response indicates token expiration
      for (const response of [licensesRes, usersRes]) {
        if (response.status === "fulfilled" && !response.value.ok) {
          try {
            const errorClone = response.value.clone()
            const errorData = await errorClone.json()
            if (errorData.requiresReconnect || errorData.code === "TOKEN_EXPIRED") {
              toast.error("Integration token expired", {
                description: "Please reconnect your Microsoft 365 integration to continue.",
                duration: 10000,
              })
              setIsLoadingInfo(false)
              return
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }

      if (licensesRes.status === "fulfilled" && licensesRes.value.ok) {
        try {
          const data = await licensesRes.value.json()
          info.licenses = data.licenses || []
        } catch (e) {
          console.error("Error parsing licenses:", e)
        }
      }

      if (usersRes.status === "fulfilled" && usersRes.value.ok) {
        try {
          const data = await usersRes.value.json()
          info.users = data.users || []
        } catch (e) {
          console.error("Error parsing users:", e)
        }
      }

      setMicrosoft365Info(info)
    } catch (error) {
      console.error("Error loading Microsoft 365 info:", error)
      toast.error("Failed to load Microsoft 365 information")
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const loadHubSpotInfo = async (integration: Integration) => {
    setIsLoadingInfo(true)
    setHubspotInfo({})

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required")
        setIsLoadingInfo(false)
        return
      }

      const [usersRes, accountRes] = await Promise.allSettled([
        fetch(`${apiBase}/api/integrations/hubspot/users`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${apiBase}/api/integrations/hubspot/account`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      const info: any = {}

      // Check if any response indicates token expiration
      for (const response of [usersRes, accountRes]) {
        if (response.status === "fulfilled" && !response.value.ok) {
          try {
            const errorClone = response.value.clone()
            const errorData = await errorClone.json()
            if (errorData.requiresReconnect || errorData.code === "TOKEN_EXPIRED") {
              toast.error("Integration token expired", {
                description: "Please reconnect your HubSpot integration to continue.",
                duration: 10000,
              })
              setIsLoadingInfo(false)
              return
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }

      if (usersRes.status === "fulfilled" && usersRes.value.ok) {
        try {
          const data = await usersRes.value.json()
          info.users = data.users || []
        } catch (e) {
          console.error("Error parsing HubSpot users:", e)
        }
      }

      if (accountRes.status === "fulfilled" && accountRes.value.ok) {
        try {
          const data = await accountRes.value.json()
          info.accountInfo = data
        } catch (e) {
          console.error("Error parsing HubSpot account info:", e)
        }
      }

      setHubspotInfo(info)
    } catch (error) {
      console.error("Error loading HubSpot info:", error)
      toast.error("Failed to load HubSpot information")
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const fetchHubSpotCostLeakAnalysis = async () => {
    setIsLoadingAnalysis(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", {
          description: "Please log in again to continue"
        })
        return
      }

      // Include inactivity threshold parameter
      const params = new URLSearchParams()
      params.append("inactivityDays", inactivityDays.toString())

      const res = await fetch(`${apiBase}/api/integrations/hubspot/cost-leaks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to analyze HubSpot cost leaks")
      }

      const data = await res.json()
      const rawAnalysis = data.analysis || data

      // Normalize HubSpot data structure to match UI expectations
      const normalizedAnalysis = {
        ...rawAnalysis,
        // Create overallSummary from HubSpot's summary structure
        overallSummary: {
          totalFindings: rawAnalysis.summary?.issuesFound || 0,
          totalPotentialSavings: rawAnalysis.summary?.potentialMonthlySavings || 0,
          highSeverity: rawAnalysis.summary?.highSeverityIssues || 0,
          mediumSeverity: rawAnalysis.summary?.mediumSeverityIssues || 0,
          lowSeverity: rawAnalysis.summary?.lowSeverityIssues || 0,
          healthScore: rawAnalysis.summary?.healthScore,
          utilizationScore: rawAnalysis.summary?.utilizationScore,
        },
        // Keep findings at root level but also create supplierInvoiceAnalysis for UI compatibility
        supplierInvoiceAnalysis: {
          findings: rawAnalysis.findings || [],
        },
      }

      setCostLeakAnalysis(normalizedAnalysis)
      toast.success("Analysis complete", {
        description: "HubSpot cost leak analysis has been generated. Saving to history..."
      })

      // Auto-save to history for dashboard (await to keep loading state until saved)
      await autoSaveAnalysis(normalizedAnalysis, "HubSpot", { inactivityDays })
    } catch (error) {
      console.error("Error fetching HubSpot cost leak analysis:", error)
      toast.error("Failed to analyze HubSpot cost leaks", {
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

  const fetchMicrosoft365CostLeakAnalysis = async () => {
    setIsLoadingAnalysis(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", {
          description: "Please log in again to continue"
        })
        router.push("/login")
        setIsLoadingAnalysis(false)
        return
      }

      // Include inactivity threshold parameter
      const params = new URLSearchParams()
      params.append("inactivityDays", inactivityDays.toString())

      const res = await fetch(`${apiBase}/api/integrations/microsoft365/cost-leaks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast.error("Session expired", {
            description: "Please log in again to continue"
          })
          router.push("/login")
          setIsLoadingAnalysis(false)
          return
        }

        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))

        // Check if it's a token expired error that requires reconnection
        if (errorData.requiresReconnect || errorData.code === "TOKEN_EXPIRED") {
          toast.error("Integration token expired", {
            description: "Please reconnect your Microsoft 365 integration to continue.",
            duration: 10000,
          })
          setIsLoadingAnalysis(false)
          return
        }

        throw new Error(errorData.error || "Failed to analyze cost leaks")
      }

      const data = await res.json()
      setCostLeakAnalysis(data)

      toast.success("Analysis complete", {
        description: `Found ${data.overallSummary?.totalFindings || 0} potential cost optimization opportunities. Saving to history...`,
      })

      // Auto-save to history for dashboard (await to keep loading state until saved)
      await autoSaveAnalysis(data, "Microsoft365", { inactivityDays })
    } catch (error) {
      console.error("Error analyzing Microsoft 365 cost leaks:", error)
      toast.error("Failed to analyze cost leaks", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === "connected") {
      return <CheckCircle className="w-5 h-5 text-green-400" />
    } else if (status === "error") {
      return <XCircle className="w-5 h-5 text-red-400" />
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-400" />
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const filterData = (data: any[], query: string) => {
    if (!query) return data
    const lowerQuery = query.toLowerCase()
    return data.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(lowerQuery)
    )
  }

  const fetchCostLeakAnalysis = async () => {
    setIsLoadingAnalysis(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { 
          description: "Please log in again to continue" 
        })
        router.push("/login")
        setIsLoadingAnalysis(false)
        return
      }

      // Build URL with optional date range parameters
      const params = new URLSearchParams()
      if (fortnoxStartDate) {
        params.append("startDate", fortnoxStartDate)
      }
      if (fortnoxEndDate) {
        params.append("endDate", fortnoxEndDate)
      }
      const queryString = params.toString()
      const url = `${apiBase}/api/integrations/fortnox/cost-leaks${queryString ? `?${queryString}` : ""}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        // Handle authentication errors (actual session expiry)
        if (res.status === 401 || res.status === 403) {
          toast.error("Session expired", {
            description: "Please log in again to continue"
          })
          router.push("/login")
          setIsLoadingAnalysis(false)
          return
        }

        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        const errorMessage = errorData.error || "Failed to analyze cost leaks"

        // Check if it's a token expired error that requires reconnection (not login)
        if (errorData.requiresReconnect || errorData.code === "TOKEN_EXPIRED") {
          toast.error("Integration token expired", {
            description: "Please reconnect your Fortnox integration to continue.",
            duration: 10000,
          })
          setIsLoadingAnalysis(false)
          return
        }

        throw new Error(errorMessage)
      }

      const data = await res.json()
      setCostLeakAnalysis(data)

      // Build description with date range info
      let description = `Found ${data.overallSummary?.totalFindings || 0} potential cost optimization opportunities`
      if (fortnoxStartDate || fortnoxEndDate) {
        const dateInfo = fortnoxStartDate && fortnoxEndDate
          ? `(${fortnoxStartDate} to ${fortnoxEndDate})`
          : fortnoxStartDate
            ? `(from ${fortnoxStartDate})`
            : `(until ${fortnoxEndDate})`
        description += ` ${dateInfo}`
      }
      description += ". Saving to history..."

      toast.success("Analysis complete", {
        description,
      })

      // Auto-save to history for dashboard (await to keep loading state until saved)
      await autoSaveAnalysis(data, "Fortnox", { startDate: fortnoxStartDate || null, endDate: fortnoxEndDate || null })
    } catch (error: any) {
      console.error("Error fetching cost leak analysis:", error)
      toast.error("Failed to analyze cost leaks", {
        description: error.message || "An error occurred.",
      })
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

  // Wrapper function to call appropriate analysis based on integration type
  const handleAnalyzeCostLeaks = () => {
    if (!integration) return

    if (integration.tool_name === "Microsoft365" || integration.provider === "Microsoft365") {
      fetchMicrosoft365CostLeakAnalysis()
    } else if (integration.tool_name === "HubSpot" || integration.provider === "HubSpot") {
      fetchHubSpotCostLeakAnalysis()
    } else {
      fetchCostLeakAnalysis()
    }
  }

  // Fetch analysis history for this integration
  const fetchAnalysisHistory = async () => {
    if (!integration) return

    setIsLoadingHistory(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) return

      const provider = integration.tool_name || integration.provider
      const res = await fetch(
        `${apiBase}/api/analysis-history?integrationId=${integration.id}&provider=${provider}&limit=50`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (res.ok) {
        const data = await res.json()
        setAnalysisHistory(data.analyses || [])
      }
    } catch (error) {
      console.error("Failed to fetch analysis history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Auto-save analysis to history (called after analysis completes)
  // Returns true on success, false on failure
  const autoSaveAnalysis = async (analysisData: any, provider: string, params: any): Promise<boolean> => {
    if (!integration || !analysisData) return false

    setIsSavingAnalysis(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Failed to save analysis", {
          description: "Session expired. Please log in again."
        })
        return false
      }

      const res = await fetch(`${apiBase}/api/analysis-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrationId: integration.id,
          provider,
          parameters: params,
          analysisData,
        }),
      })

      if (res.ok) {
        toast.success("Analysis saved", {
          description: "Your analysis has been saved to history and is available on the dashboard."
        })
        // Refresh history list
        fetchAnalysisHistory()
        return true
      } else {
        toast.error("Failed to save analysis", {
          description: "Could not save to history. Please try running the analysis again."
        })
        return false
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
      toast.error("Failed to save analysis", {
        description: "An error occurred while saving. Please try again."
      })
      return false
    } finally {
      setIsSavingAnalysis(false)
    }
  }

  // Load a historical analysis
  const loadHistoricalAnalysis = async (analysisId: string) => {
    setIsLoadingHistoricalAnalysis(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) return

      const res = await fetch(`${apiBase}/api/analysis-history/${analysisId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedHistoricalAnalysis(data.analysis)
      } else {
        toast.error("Failed to load analysis")
      }
    } catch (error) {
      console.error("Failed to load historical analysis:", error)
      toast.error("Failed to load analysis")
    } finally {
      setIsLoadingHistoricalAnalysis(false)
    }
  }

  // Delete a historical analysis
  const deleteHistoricalAnalysis = async (analysisId: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) return

      const res = await fetch(`${apiBase}/api/analysis-history/${analysisId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (res.ok) {
        toast.success("Analysis deleted from history")
        // Refresh history list
        fetchAnalysisHistory()
        // Clear selected if it was the deleted one
        if (selectedHistoricalAnalysis?.id === analysisId) {
          setSelectedHistoricalAnalysis(null)
        }
      } else {
        toast.error("Failed to delete analysis")
      }
    } catch (error) {
      console.error("Failed to delete analysis:", error)
      toast.error("Failed to delete analysis")
    }
  }

  // Load history when integration changes or tab switches to history
  useEffect(() => {
    if (integration && activeAnalysisTab === "history") {
      fetchAnalysisHistory()
    }
  }, [integration?.id, activeAnalysisTab])

  // Helper functions for findings management
  const getFilteredFindings = () => {
    // Support Fortnox (supplierInvoiceAnalysis), Microsoft 365 (licenseAnalysis), and HubSpot (findings)
    const findings_source = costLeakAnalysis?.supplierInvoiceAnalysis?.findings ||
                           costLeakAnalysis?.licenseAnalysis?.findings ||
                           costLeakAnalysis?.findings ||
                           []

    if (findings_source.length === 0) return []

    let findings = [...findings_source]

    // Filter by severity
    if (findingsFilter !== "all") {
      findings = findings.filter((f: any) => f.severity === findingsFilter)
    }

    // Filter by search
    if (findingsSearch) {
      const search = findingsSearch.toLowerCase()
      findings = findings.filter((f: any) =>
        f.title?.toLowerCase().includes(search) ||
        f.description?.toLowerCase().includes(search) ||
        f.invoices?.some((inv: any) =>
          inv.SupplierName?.toLowerCase().includes(search) ||
          inv.GivenNumber?.toString().includes(search)
        )
      )
    }

    // Filter out dismissed
    findings = findings.filter((_: any, idx: number) => !dismissedFindings.has(idx))

    return findings
  }

  const groupFindings = (findings: any[]) => {
    // Dynamic groups based on integration type
    const isMicrosoft365Analysis = costLeakAnalysis?.licenseAnalysis?.findings?.length > 0
    const isHubSpotAnalysis = costLeakAnalysis?.findings?.length > 0 && costLeakAnalysis?.summary?.healthScore !== undefined

    let groups: { [key: string]: { title: string; icon: any; findings: any[]; color: string } }

    if (isMicrosoft365Analysis) {
      groups = {
        orphaned: { title: "Orphaned Licenses", icon: Users, findings: [], color: "red" },
        inactive: { title: "Inactive Users", icon: Clock, findings: [], color: "orange" },
        overprovisioned: { title: "Over-Provisioned Licenses", icon: TrendingDown, findings: [], color: "amber" },
        unused: { title: "Unused Add-ons", icon: Package, findings: [], color: "slate" },
        other: { title: "Other Findings", icon: AlertTriangle, findings: [], color: "slate" },
      }
    } else if (isHubSpotAnalysis) {
      groups = {
        inactive: { title: "Inactive Seats", icon: Clock, findings: [], color: "orange" },
        utilization: { title: "Low Utilization", icon: TrendingDown, findings: [], color: "amber" },
        unassigned: { title: "Unassigned Roles", icon: Users, findings: [], color: "red" },
        other: { title: "Other Findings", icon: AlertTriangle, findings: [], color: "slate" },
      }
    } else {
      groups = {
        duplicates: { title: "Duplicate Payments", icon: FileText, findings: [], color: "red" },
        anomalies: { title: "Price Anomalies", icon: TrendingDown, findings: [], color: "amber" },
        overdue: { title: "Overdue & Payment Issues", icon: Clock, findings: [], color: "orange" },
        other: { title: "Other Findings", icon: AlertTriangle, findings: [], color: "slate" },
      }
    }

    // Get the original findings source for index lookup
    const findingsSource = costLeakAnalysis?.supplierInvoiceAnalysis?.findings ||
                          costLeakAnalysis?.licenseAnalysis?.findings ||
                          costLeakAnalysis?.findings ||
                          []

    findings.forEach((finding: any, idx: number) => {
      const originalIdx = findingsSource.indexOf(finding) ?? idx
      const findingWithIdx = { ...finding, originalIdx }

      if (isMicrosoft365Analysis) {
        // Microsoft 365 grouping
        if (finding.type === "orphaned_license" || finding.title?.toLowerCase().includes("orphan") || finding.title?.toLowerCase().includes("disabled")) {
          groups.orphaned.findings.push(findingWithIdx)
        } else if (finding.type === "inactive_license" || finding.title?.toLowerCase().includes("inactive") || finding.title?.toLowerCase().includes("never signed")) {
          groups.inactive.findings.push(findingWithIdx)
        } else if (finding.type === "over_provisioned" || finding.title?.toLowerCase().includes("over-provisioned") || finding.title?.toLowerCase().includes("downgrade")) {
          groups.overprovisioned.findings.push(findingWithIdx)
        } else if (finding.type === "unused_addon" || finding.title?.toLowerCase().includes("unused") || finding.title?.toLowerCase().includes("add-on")) {
          groups.unused.findings.push(findingWithIdx)
        } else {
          groups.other.findings.push(findingWithIdx)
        }
      } else if (isHubSpotAnalysis) {
        // HubSpot grouping
        if (finding.type === "inactive_seats" || finding.title?.toLowerCase().includes("inactive")) {
          groups.inactive.findings.push(findingWithIdx)
        } else if (finding.type === "low_utilization" || finding.type === "moderate_utilization" || finding.title?.toLowerCase().includes("utilization")) {
          groups.utilization.findings.push(findingWithIdx)
        } else if (finding.type === "unassigned_roles" || finding.title?.toLowerCase().includes("role") || finding.title?.toLowerCase().includes("unassigned")) {
          groups.unassigned.findings.push(findingWithIdx)
        } else {
          groups.other.findings.push(findingWithIdx)
        }
      } else {
        // Fortnox grouping
        if (finding.title?.toLowerCase().includes("duplicate")) {
          groups.duplicates.findings.push(findingWithIdx)
        } else if (finding.title?.toLowerCase().includes("price") || finding.title?.toLowerCase().includes("anomal")) {
          groups.anomalies.findings.push(findingWithIdx)
        } else if (finding.title?.toLowerCase().includes("overdue") || finding.title?.toLowerCase().includes("payment")) {
          groups.overdue.findings.push(findingWithIdx)
        } else {
          groups.other.findings.push(findingWithIdx)
        }
      }
    })

    return Object.entries(groups).filter(([_, group]) => group.findings.length > 0)
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const handleDismiss = (idx: number) => {
    setDismissedFindings(prev => new Set(prev).add(idx))
    toast.success("Finding dismissed")
  }

  const handleResolve = (idx: number) => {
    setResolvedFindings(prev => new Set(prev).add(idx))
    toast.success("Marked as resolved", { description: "Great job addressing this issue!" })
  }

  const handleUndoDismiss = (idx: number) => {
    setDismissedFindings(prev => {
      const next = new Set(prev)
      next.delete(idx)
      return next
    })
  }

  const getGroupPage = (groupKey: string) => groupPages[groupKey] || 0

  const setGroupPage = (groupKey: string, page: number) => {
    setGroupPages(prev => ({ ...prev, [groupKey]: page }))
  }

  const getPagedFindings = (findings: any[], groupKey: string) => {
    const page = getGroupPage(groupKey)
    const start = page * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return findings.slice(start, end)
  }

  const getTotalPages = (totalItems: number) => Math.ceil(totalItems / ITEMS_PER_PAGE)

  // Open PDF Preview
  const openPdfPreview = () => {
    if (!costLeakAnalysis) {
      toast.error("No analysis data to export")
      return
    }
    setShowPdfPreview(true)
  }

  // PDF Export Function - Concise 1-Page Summary
  const exportToPDF = () => {
    if (!costLeakAnalysis) {
      toast.error("No analysis data to export")
      return
    }

    setIsExporting(true)
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPosition = margin

    // Colors
    const primaryColor: [number, number, number] = [6, 182, 212] // Cyan-500
    const darkBg: [number, number, number] = [15, 23, 42] // Slate-900
    const highSeverity: [number, number, number] = [239, 68, 68] // Red-500
    const mediumSeverity: [number, number, number] = [245, 158, 11] // Amber-500
    const lowSeverity: [number, number, number] = [100, 116, 139] // Slate-500
    const successColor: [number, number, number] = [16, 185, 129] // Emerald-500

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, color: [number, number, number]) => {
      doc.setFillColor(...color)
      doc.roundedRect(x, y, w, h, r, r, 'F')
    }

    // Helper to draw a pie/donut chart segment
    const drawPieSegment = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number, color: [number, number, number]) => {
      doc.setFillColor(...color)
      const steps = 50
      const angleStep = (endAngle - startAngle) / steps
      const points: [number, number][] = [[cx, cy]]

      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + i * angleStep
        points.push([
          cx + radius * Math.cos(angle),
          cy + radius * Math.sin(angle)
        ])
      }

      // Draw filled polygon
      doc.setFillColor(...color)
      let path = `M ${cx} ${cy} `
      points.forEach((p, i) => {
        if (i === 0) return
        path += `L ${p[0]} ${p[1]} `
      })
      path += 'Z'

      // Simple triangle fan approach
      for (let i = 1; i < points.length - 1; i++) {
        doc.triangle(
          cx, cy,
          points[i][0], points[i][1],
          points[i + 1][0], points[i + 1][1],
          'F'
        )
      }
    }

    // ===== HEADER =====
    drawRoundedRect(0, 0, pageWidth, 35, 0, darkBg)
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(2)
    doc.line(0, 35, pageWidth, 35)

    // Logo
    doc.setFillColor(...primaryColor)
    doc.circle(margin + 6, 17, 6, 'F')
    doc.setFillColor(255, 255, 255)
    doc.circle(margin + 4, 15, 1.5, 'F')
    doc.circle(margin + 8, 15, 1, 'F')
    doc.circle(margin + 4, 19, 1, 'F')

    // Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text("Efficyon", margin + 16, 15)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184)
    doc.text("Cost Leak Analysis Summary", margin + 16, 23)

    // Date
    doc.setFontSize(9)
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    doc.text(reportDate, pageWidth - margin - 30, 20)

    yPosition = 45

    const summary = costLeakAnalysis.overallSummary || { totalFindings: 0, totalPotentialSavings: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 }
    // Get findings from either Fortnox (supplierInvoiceAnalysis) or Microsoft 365 (licenseAnalysis)
    const findings = costLeakAnalysis.supplierInvoiceAnalysis?.findings || costLeakAnalysis.licenseAnalysis?.findings || []

    // ===== KEY METRICS ROW =====
    const metricCardWidth = (pageWidth - margin * 2 - 12) / 4
    const metricCardHeight = 28

    // Total Issues
    drawRoundedRect(margin, yPosition, metricCardWidth, metricCardHeight, 3, [241, 245, 249])
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text("TOTAL ISSUES", margin + 4, yPosition + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text(String(summary.totalFindings || 0), margin + 4, yPosition + 22)

    // Potential Savings
    const card2X = margin + metricCardWidth + 4
    drawRoundedRect(card2X, yPosition, metricCardWidth, metricCardHeight, 3, [209, 250, 229])
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(5, 150, 105)
    doc.text("POTENTIAL SAVINGS", card2X + 4, yPosition + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`$${(summary.totalPotentialSavings || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, card2X + 4, yPosition + 22)

    // High Priority
    const card3X = margin + (metricCardWidth + 4) * 2
    drawRoundedRect(card3X, yPosition, metricCardWidth, metricCardHeight, 3, [254, 226, 226])
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(185, 28, 28)
    doc.text("HIGH PRIORITY", card3X + 4, yPosition + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text(String(summary.highSeverity || 0), card3X + 4, yPosition + 22)

    // Medium Priority
    const card4X = margin + (metricCardWidth + 4) * 3
    drawRoundedRect(card4X, yPosition, metricCardWidth, metricCardHeight, 3, [254, 243, 199])
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(180, 83, 9)
    doc.text("MEDIUM PRIORITY", card4X + 4, yPosition + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text(String(summary.mediumSeverity || 0), card4X + 4, yPosition + 22)

    yPosition += metricCardHeight + 10

    // ===== CHARTS SECTION =====
    const chartSectionY = yPosition
    const leftColumnX = margin
    const rightColumnX = pageWidth / 2 + 5
    const columnWidth = (pageWidth - margin * 2 - 10) / 2

    // Left: Severity Distribution (Donut Chart)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text("Issues by Severity", leftColumnX, yPosition)
    yPosition += 8

    const total = (summary.highSeverity || 0) + (summary.mediumSeverity || 0) + (summary.lowSeverity || 0)
    const chartCenterX = leftColumnX + 35
    const chartCenterY = yPosition + 30
    const chartRadius = 25

    if (total > 0) {
      let currentAngle = -Math.PI / 2 // Start from top

      // High severity (red)
      if (summary.highSeverity > 0) {
        const highAngle = (summary.highSeverity / total) * 2 * Math.PI
        drawPieSegment(chartCenterX, chartCenterY, chartRadius, currentAngle, currentAngle + highAngle, highSeverity)
        currentAngle += highAngle
      }

      // Medium severity (amber)
      if (summary.mediumSeverity > 0) {
        const medAngle = (summary.mediumSeverity / total) * 2 * Math.PI
        drawPieSegment(chartCenterX, chartCenterY, chartRadius, currentAngle, currentAngle + medAngle, mediumSeverity)
        currentAngle += medAngle
      }

      // Low severity (gray)
      if (summary.lowSeverity > 0) {
        const lowAngle = (summary.lowSeverity / total) * 2 * Math.PI
        drawPieSegment(chartCenterX, chartCenterY, chartRadius, currentAngle, currentAngle + lowAngle, lowSeverity)
      }

      // Center circle (donut hole)
      doc.setFillColor(255, 255, 255)
      doc.circle(chartCenterX, chartCenterY, 12, 'F')

      // Center text
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text(String(total), chartCenterX - 4, chartCenterY + 2)
      doc.setFontSize(6)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      doc.text("issues", chartCenterX - 5, chartCenterY + 8)
    } else {
      doc.setFillColor(241, 245, 249)
      doc.circle(chartCenterX, chartCenterY, chartRadius, 'F')
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text("No issues", chartCenterX - 10, chartCenterY + 3)
    }

    // Legend for pie chart
    const legendX = leftColumnX + 70
    const legendY = chartCenterY - 15

    // High
    doc.setFillColor(...highSeverity)
    doc.rect(legendX, legendY, 8, 8, 'F')
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(`High (${summary.highSeverity || 0})`, legendX + 11, legendY + 6)

    // Medium
    doc.setFillColor(...mediumSeverity)
    doc.rect(legendX, legendY + 12, 8, 8, 'F')
    doc.text(`Medium (${summary.mediumSeverity || 0})`, legendX + 11, legendY + 18)

    // Low
    doc.setFillColor(...lowSeverity)
    doc.rect(legendX, legendY + 24, 8, 8, 'F')
    doc.text(`Low (${summary.lowSeverity || 0})`, legendX + 11, legendY + 30)

    // Right: Savings by Category (Horizontal Bar Chart)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text("Savings by Category", rightColumnX, chartSectionY)

    // Group findings by category and calculate savings
    const categoryMap: Record<string, { name: string, savings: number, color: [number, number, number] }> = {
      duplicates: { name: "Duplicate/Unused", savings: 0, color: highSeverity },
      anomalies: { name: "Price/License Issues", savings: 0, color: mediumSeverity },
      overdue: { name: "Payment/Inactive", savings: 0, color: [249, 115, 22] },
      other: { name: "Other", savings: 0, color: lowSeverity },
    }

    findings.forEach((finding: any) => {
      const savings = finding.potentialSavings || 0
      const title = finding.title?.toLowerCase() || ''

      if (title.includes("duplicate") || title.includes("orphan") || title.includes("unused")) {
        categoryMap.duplicates.savings += savings
      } else if (title.includes("price") || title.includes("anomal") || title.includes("over-provision") || title.includes("downgrade")) {
        categoryMap.anomalies.savings += savings
      } else if (title.includes("overdue") || title.includes("payment") || title.includes("inactive")) {
        categoryMap.overdue.savings += savings
      } else {
        categoryMap.other.savings += savings
      }
    })

    // Limit to top 3 categories like the preview
    const categories = Object.values(categoryMap).filter(c => c.savings > 0).sort((a, b) => b.savings - a.savings).slice(0, 3)
    const maxSavings = Math.max(...categories.map(c => c.savings), 1)
    const barMaxWidth = columnWidth - 10
    let barY = chartSectionY + 12

    if (categories.length > 0) {
      categories.forEach((cat) => {
        const barWidth = (cat.savings / maxSavings) * barMaxWidth

        // Row 1: Category name (left) and Amount (right) - matching preview layout
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text(cat.name, rightColumnX, barY)

        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        const amountText = `$${cat.savings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        doc.text(amountText, rightColumnX + barMaxWidth - doc.getTextWidth(amountText), barY)

        // Row 2: Bar below the text
        drawRoundedRect(rightColumnX, barY + 3, barMaxWidth, 6, 1, [241, 245, 249])
        if (barWidth > 0) {
          drawRoundedRect(rightColumnX, barY + 3, Math.max(barWidth, 2), 6, 1, cat.color)
        }

        barY += 18
      })
    } else {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text("No savings identified", rightColumnX, barY + 10)
    }

    yPosition = Math.max(chartCenterY + chartRadius + 15, barY + 5)

    // ===== TOP ACTIONS SECTION =====
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text("Top Priority Actions", margin, yPosition)
    yPosition += 8

    // Consolidate findings by title to avoid duplicates
    const consolidatedFindings: Record<string, { title: string, count: number, totalSavings: number, severity: string }> = {}
    findings.forEach((finding: any) => {
      const title = finding.title || 'Untitled'
      if (!consolidatedFindings[title]) {
        consolidatedFindings[title] = {
          title,
          count: 0,
          totalSavings: 0,
          severity: finding.severity || 'low'
        }
      }
      consolidatedFindings[title].count++
      consolidatedFindings[title].totalSavings += finding.potentialSavings || 0
      // Keep highest severity
      if (finding.severity === 'high') consolidatedFindings[title].severity = 'high'
      else if (finding.severity === 'medium' && consolidatedFindings[title].severity !== 'high') {
        consolidatedFindings[title].severity = 'medium'
      }
    })

    // Sort by total savings and take top 3 (matching preview)
    const topActions = Object.values(consolidatedFindings)
      .sort((a, b) => b.totalSavings - a.totalSavings)
      .slice(0, 3)

    if (topActions.length > 0) {
      topActions.forEach((action, index: number) => {
        const rowY = yPosition + index * 18

        // Row background
        drawRoundedRect(margin, rowY, pageWidth - margin * 2, 16, 2, index % 2 === 0 ? [248, 250, 252] : [255, 255, 255])

        // Priority number
        const severityColor = action.severity === 'high' ? highSeverity : action.severity === 'medium' ? mediumSeverity : lowSeverity
        doc.setFillColor(...severityColor)
        doc.circle(margin + 8, rowY + 8, 5, 'F')
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text(String(index + 1), margin + 6.5, rowY + 10)

        // Finding title with count if multiple
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        const countText = action.count > 1 ? ` (${action.count} instances)` : ''
        const maxTitleLength = action.count > 1 ? 35 : 50
        const titleText = action.title.substring(0, maxTitleLength) + (action.title.length > maxTitleLength ? '...' : '') + countText
        doc.text(titleText, margin + 18, rowY + 10)

        // Savings amount
        if (action.totalSavings > 0) {
          doc.setFont("helvetica", "bold")
          doc.setTextColor(5, 150, 105)
          doc.text(`$${action.totalSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, pageWidth - margin - 25, rowY + 10)
        }
      })
      yPosition += topActions.length * 18 + 8
    } else {
      drawRoundedRect(margin, yPosition, pageWidth - margin * 2, 20, 3, [241, 245, 249])
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text("No action items identified - great job!", margin + (pageWidth - margin * 2) / 2 - 35, yPosition + 12)
      yPosition += 28
    }

    // ===== AI INSIGHT BOX =====
    if (summary.totalFindings > 0) {
      drawRoundedRect(margin, yPosition, pageWidth - margin * 2, 30, 4, [236, 254, 255])
      doc.setDrawColor(...primaryColor)
      doc.setLineWidth(0.5)
      doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 30, 4, 4, 'S')

      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(...primaryColor)
      doc.text("AI Insight", margin + 6, yPosition + 10)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      const insightText = `Based on our analysis, addressing the top ${Math.min(3, topActions.length)} issues could recover approximately $${topActions.slice(0, 3).reduce((sum: number, a: any) => sum + (a.totalSavings || 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} in savings. We recommend prioritizing the highest-impact items first.`
      const splitInsight = doc.splitTextToSize(insightText, pageWidth - margin * 2 - 12)
      doc.text(splitInsight, margin + 6, yPosition + 20)
    }

    // ===== FOOTER =====
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text("Confidential - For internal use only", margin, pageHeight - 8)
    doc.text("Page 1 of 1", pageWidth - margin - 20, pageHeight - 8)
    doc.setTextColor(...primaryColor)
    doc.text("Powered by Efficyon", pageWidth / 2 - 15, pageHeight - 8)

    // Save the PDF
    const fileName = `cost-leak-summary-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success("PDF exported successfully", { description: fileName })
    setShowPdfPreview(false)
    setIsExporting(false)
  }

  // Get grouped findings for preview
  const getGroupedFindingsForPreview = () => {
    // Get findings from either Fortnox (supplierInvoiceAnalysis) or Microsoft 365 (licenseAnalysis)
    const findings = costLeakAnalysis?.supplierInvoiceAnalysis?.findings || costLeakAnalysis?.licenseAnalysis?.findings || []
    const grouped = {
      duplicates: { title: "Duplicate/Unused", count: 0, savings: 0, color: "red" },
      anomalies: { title: "Price/License Issues", count: 0, savings: 0, color: "amber" },
      overdue: { title: "Payment/Inactive", count: 0, savings: 0, color: "orange" },
      other: { title: "Other Findings", count: 0, savings: 0, color: "slate" },
    }

    findings.forEach((finding: any) => {
      const savings = finding.potentialSavings || 0
      const title = finding.title?.toLowerCase() || ''

      // Fortnox categories
      if (title.includes("duplicate") || title.includes("orphan") || title.includes("unused")) {
        grouped.duplicates.count++
        grouped.duplicates.savings += savings
      } else if (title.includes("price") || title.includes("anomal") || title.includes("over-provision") || title.includes("downgrade")) {
        grouped.anomalies.count++
        grouped.anomalies.savings += savings
      } else if (title.includes("overdue") || title.includes("payment") || title.includes("inactive")) {
        grouped.overdue.count++
        grouped.overdue.savings += savings
      } else {
        grouped.other.count++
        grouped.other.savings += savings
      }
    })

    // Sort by savings (highest first) and filter out empty groups
    return Object.entries(grouped)
      .filter(([_, g]) => g.count > 0)
      .sort((a, b) => b[1].savings - a[1].savings)
  }

  const activeFindings = getFilteredFindings()
  const groupedFindings = groupFindings(activeFindings)
  const totalDismissed = dismissedFindings.size
  const totalResolved = resolvedFindings.size

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!integration) {
    return null
  }

  const isFortnox = integration.tool_name === "Fortnox" || integration.provider === "Fortnox"
  const isMicrosoft365 = integration.tool_name === "Microsoft365" || integration.provider === "Microsoft365"
  const isHubSpot = integration.tool_name === "HubSpot" || integration.provider === "HubSpot"
  const hasFullUI = isFortnox || isMicrosoft365 || isHubSpot

  return (
    <>
      {/* Full-screen loading overlay during analysis saving */}
      {(isLoadingAnalysis || isSavingAnalysis) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-black/90 border border-white/10 rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium text-lg">
                {isSavingAnalysis ? "Saving Analysis..." : "Analyzing..."}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {isSavingAnalysis
                  ? "Please wait while we save your analysis to the database."
                  : "Please wait while we analyze your data."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/tools")}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 truncate">{integration.tool_name || integration.provider}</h2>
          <p className="text-sm sm:text-base text-gray-400">Integration Details</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusIcon(integration.status)}
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
      </div>

      {/* Tabs for organized sections */}
      {hasFullUI && integration.status === "connected" ? (
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="bg-black/50 border border-white/10 mb-6 w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger
              value="analysis"
              className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Cost Analysis
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/50 text-gray-300 text-xs sm:text-sm"
              onClick={() => setActiveAnalysisTab("history")}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              History
              {analysisHistory.length > 0 && (
                <Badge className="ml-1 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs px-1.5">
                  {analysisHistory.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
            >
              <Info className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
            >
              <Database className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* Cost Analysis Tab - Redesigned */}
          <TabsContent value="analysis" className="mt-0 space-y-6">
            {/* Header Card */}
            <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border-slate-700/50 overflow-hidden relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <CardHeader className="relative">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg shadow-amber-500/25">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-white text-xl sm:text-2xl font-bold">
                        Cost Leak Analysis
                      </CardTitle>
                    </div>
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      AI-powered analysis to identify savings opportunities
                    </p>
                  </div>
                </div>

                {/* Analysis Parameters */}
                <div className="px-4 sm:px-6 pb-4 border-t border-white/5 pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 justify-between">
                    {/* Fortnox: Date Range */}
                    {isFortnox && (
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400">Start Date</label>
                          <Input
                            type="date"
                            value={fortnoxStartDate}
                            onChange={(e) => setFortnoxStartDate(e.target.value)}
                            className="h-9 w-full sm:w-40 bg-black/30 border-white/10 text-white text-sm"
                            placeholder="Start date"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400">End Date</label>
                          <Input
                            type="date"
                            value={fortnoxEndDate}
                            onChange={(e) => setFortnoxEndDate(e.target.value)}
                            className="h-9 w-full sm:w-40 bg-black/30 border-white/10 text-white text-sm"
                            placeholder="End date"
                          />
                        </div>
                        {(fortnoxStartDate || fortnoxEndDate) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFortnoxStartDate("")
                              setFortnoxEndDate("")
                            }}
                            className="text-gray-400 hover:text-white h-9 self-end"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    )}

                    {/* MS365/HubSpot: Inactivity Threshold */}
                    {(isMicrosoft365 || isHubSpot) && (
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs text-gray-400">Inactivity Threshold</label>
                        <select
                          value={inactivityDays}
                          onChange={(e) => setInactivityDays(parseInt(e.target.value))}
                          className="h-9 px-3 rounded-md bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value={7}>7 days</option>
                          <option value={14}>14 days</option>
                          <option value={30}>30 days (default)</option>
                          <option value={60}>60 days</option>
                          <option value={90}>90 days</option>
                        </select>
                        <p className="text-xs text-gray-500">Users inactive for more than this period</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end ml-auto">
                      {costLeakAnalysis && (
                        <>
                          <Button
                            onClick={openPdfPreview}
                            variant="outline"
                            size="sm"
                            className="group relative border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-cyan-500/20 h-8 sm:h-9 px-2 sm:px-3"
                            title="Export PDF"
                          >
                            <Download className="w-4 h-4 sm:mr-2 group-hover:animate-bounce" />
                            <span className="hidden sm:inline">Export PDF</span>
                          </Button>
                          <Button
                            onClick={() => setIsAnalysisVisible(!isAnalysisVisible)}
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-black/50 text-white hover:bg-white/10 h-8 sm:h-9 w-8 sm:w-9 p-0"
                            title={isAnalysisVisible ? "Hide analysis" : "Show analysis"}
                          >
                            {isAnalysisVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={handleAnalyzeCostLeaks}
                        disabled={isLoadingAnalysis}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
                      >
                        {isLoadingAnalysis ? (
                          <>
                            <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">{costLeakAnalysis ? "Re-analyze" : "Analyze Cost Leaks"}</span>
                            <span className="sm:hidden">{costLeakAnalysis ? "Re-run" : "Analyze"}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Analysis Results */}
            {costLeakAnalysis && isAnalysisVisible && (
              <>
                {/* Summary Cards - Enhanced */}
                {costLeakAnalysis.overallSummary && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Findings */}
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 overflow-hidden group hover:border-slate-600/50 transition-all">
                      <CardContent className="p-4 relative">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Issues</p>
                            <p className="text-3xl font-bold text-white">
                              {costLeakAnalysis.overallSummary.totalFindings || 0}
                            </p>
                            {totalDismissed > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{totalDismissed} dismissed</p>
                            )}
                          </div>
                          <div className="p-2 bg-white/5 rounded-lg">
                            <Target className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Potential Savings */}
                    <Card className="bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-800/30 overflow-hidden group hover:border-emerald-700/50 transition-all">
                      <CardContent className="p-4 relative">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Potential Savings</p>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
                              ${costLeakAnalysis.overallSummary.totalPotentialSavings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
                            </p>
                            <p className="text-xs text-emerald-400/50 mt-1">USD annually</p>
                          </div>
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* High Priority */}
                    <Card className="bg-gradient-to-br from-red-950 to-slate-900 border-red-800/30 overflow-hidden group hover:border-red-700/50 transition-all">
                      <CardContent className="p-4 relative">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all" />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-red-400/70 uppercase tracking-wider mb-1">High Priority</p>
                            <p className="text-3xl font-bold text-red-400">
                              {costLeakAnalysis.overallSummary.highSeverity || 0}
                            </p>
                            <p className="text-xs text-red-400/50 mt-1">Needs attention</p>
                          </div>
                          <div className="p-2 bg-red-500/10 rounded-lg">
                            <ShieldAlert className="w-5 h-5 text-red-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Medium Priority */}
                    <Card className="bg-gradient-to-br from-amber-950 to-slate-900 border-amber-800/30 overflow-hidden group hover:border-amber-700/50 transition-all">
                      <CardContent className="p-4 relative">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Medium Priority</p>
                            <p className="text-3xl font-bold text-amber-400">
                              {costLeakAnalysis.overallSummary.mediumSeverity || 0}
                            </p>
                            <p className="text-xs text-amber-400/50 mt-1">Review recommended</p>
                          </div>
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Summary Insights */}
                {costLeakAnalysis.overallSummary && costLeakAnalysis.overallSummary.totalFindings > 0 && (
                  <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl shrink-0">
                          <Sparkles className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="space-y-4 flex-1">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-semibold text-lg">AI Analysis Summary</h3>
                              {/* Show analysis parameters */}
                              {costLeakAnalysis.dateRange?.filtered && (
                                <Badge variant="outline" className="text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {costLeakAnalysis.dateRange.startDate && costLeakAnalysis.dateRange.endDate
                                    ? `${costLeakAnalysis.dateRange.startDate} - ${costLeakAnalysis.dateRange.endDate}`
                                    : costLeakAnalysis.dateRange.startDate
                                      ? `From ${costLeakAnalysis.dateRange.startDate}`
                                      : `Until ${costLeakAnalysis.dateRange.endDate}`}
                                </Badge>
                              )}
                              {costLeakAnalysis.inactivityThreshold && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-400">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {costLeakAnalysis.inactivityThreshold} days inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              We identified <span className="text-white font-semibold">{costLeakAnalysis.overallSummary.totalFindings}</span> potential cost leaks
                              that could save your company approximately <span className="text-emerald-400 font-semibold">${costLeakAnalysis.overallSummary.totalPotentialSavings?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>.
                            </p>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-3">
                            {costLeakAnalysis.overallSummary.highSeverity > 0 && (
                              <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-red-400 font-medium text-sm">Urgent Action</p>
                                  <p className="text-gray-400 text-xs mt-0.5">{costLeakAnalysis.overallSummary.highSeverity} high-priority issues need immediate review</p>
                                </div>
                              </div>
                            )}
                            {costLeakAnalysis.overallSummary.mediumSeverity > 0 && (
                              <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-amber-400 font-medium text-sm">Review Needed</p>
                                  <p className="text-gray-400 text-xs mt-0.5">{costLeakAnalysis.overallSummary.mediumSeverity} items could improve cash flow</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                              <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-cyan-400 font-medium text-sm">Quick Win</p>
                                <p className="text-gray-400 text-xs mt-0.5">Start with duplicate payments for immediate savings</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Findings Section */}
                {(costLeakAnalysis.supplierInvoiceAnalysis?.findings?.length > 0 ||
                  costLeakAnalysis.licenseAnalysis?.findings?.length > 0) && (
                  <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-white text-lg">Cost Leak Findings</CardTitle>
                          <Badge variant="outline" className="border-slate-600 text-gray-400">
                            {activeFindings.length} of {(costLeakAnalysis.supplierInvoiceAnalysis?.findings?.length || costLeakAnalysis.licenseAnalysis?.findings?.length || 0)}
                          </Badge>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                              placeholder="Search findings..."
                              value={findingsSearch}
                              onChange={(e) => setFindingsSearch(e.target.value)}
                              className="pl-9 h-9 w-full sm:w-48 bg-black/50 border-slate-700 text-white text-sm"
                            />
                          </div>
                          <div className="flex items-center bg-black/50 rounded-lg p-1 border border-slate-700">
                            {(["all", "high", "medium", "low"] as const).map((filter) => (
                              <button
                                key={filter}
                                onClick={() => setFindingsFilter(filter)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                  findingsFilter === filter
                                    ? filter === "high"
                                      ? "bg-red-500/20 text-red-400"
                                      : filter === "medium"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : filter === "low"
                                      ? "bg-slate-500/20 text-slate-400"
                                      : "bg-white/10 text-white"
                                    : "text-gray-500 hover:text-gray-300"
                                }`}
                              >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Grouped Findings */}
                      {groupedFindings.map(([groupKey, group]) => (
                        <div key={groupKey} className="border border-slate-700/50 rounded-xl overflow-hidden">
                          {/* Group Header */}
                          <button
                            onClick={() => toggleGroup(groupKey)}
                            className={`w-full flex items-center justify-between p-4 transition-all ${
                              group.color === "red"
                                ? "bg-gradient-to-r from-red-950/50 to-slate-900/50 hover:from-red-950/70"
                                : group.color === "amber"
                                ? "bg-gradient-to-r from-amber-950/50 to-slate-900/50 hover:from-amber-950/70"
                                : group.color === "orange"
                                ? "bg-gradient-to-r from-orange-950/50 to-slate-900/50 hover:from-orange-950/70"
                                : "bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:from-slate-800/70"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                group.color === "red" ? "bg-red-500/20" :
                                group.color === "amber" ? "bg-amber-500/20" :
                                group.color === "orange" ? "bg-orange-500/20" :
                                "bg-slate-500/20"
                              }`}>
                                <group.icon className={`w-4 h-4 ${
                                  group.color === "red" ? "text-red-400" :
                                  group.color === "amber" ? "text-amber-400" :
                                  group.color === "orange" ? "text-orange-400" :
                                  "text-slate-400"
                                }`} />
                              </div>
                              <div className="text-left">
                                <p className="text-white font-medium">{group.title}</p>
                                <p className="text-gray-500 text-xs">{group.findings.length} issue{group.findings.length !== 1 ? 's' : ''} found</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={`${
                                group.color === "red" ? "border-red-500/30 text-red-400" :
                                group.color === "amber" ? "border-amber-500/30 text-amber-400" :
                                group.color === "orange" ? "border-orange-500/30 text-orange-400" :
                                "border-slate-500/30 text-slate-400"
                              }`}>
                                {group.findings.length}
                              </Badge>
                              {expandedGroups.has(groupKey) ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Group Content */}
                          {expandedGroups.has(groupKey) && (
                            <div className="divide-y divide-slate-800/50">
                              {getPagedFindings(group.findings, groupKey).map((finding: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-4 bg-slate-900/50 hover:bg-slate-800/50 transition-all ${
                                    resolvedFindings.has(finding.originalIdx) ? 'opacity-50' : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-4">
                                    {/* Severity Indicator */}
                                    <div className={`w-1 h-full min-h-[60px] rounded-full shrink-0 ${
                                      finding.severity === "high" ? "bg-red-500" :
                                      finding.severity === "medium" ? "bg-amber-500" :
                                      "bg-slate-500"
                                    }`} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <Badge
                                              className={`text-[10px] px-1.5 py-0 ${
                                                finding.severity === "high"
                                                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                                                  : finding.severity === "medium"
                                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                  : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                                              }`}
                                              variant="outline"
                                            >
                                              {finding.severity?.toUpperCase()}
                                            </Badge>
                                            {resolvedFindings.has(finding.originalIdx) && (
                                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0" variant="outline">
                                                RESOLVED
                                              </Badge>
                                            )}
                                          </div>
                                          <h4 className="font-medium text-white text-sm mb-1">{finding.title}</h4>
                                          <p className="text-gray-400 text-xs leading-relaxed">{finding.description}</p>

                                          {finding.potentialSavings > 0 && (
                                            <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md">
                                              <DollarSign className="w-3 h-3" />
                                              <span className="text-xs font-medium">
                                                Save {formatCurrencyForIntegration(finding.potentialSavings, integration?.connection_type || 'fortnox')}
                                              </span>
                                            </div>
                                          )}

                                          {/* Invoice Details */}
                                          {finding.invoices?.length > 0 && (
                                            <details className="mt-3 group/details">
                                              <summary className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300 font-medium flex items-center gap-1.5">
                                                <ChevronRight className="w-3 h-3 transition-transform group-open/details:rotate-90" />
                                                {finding.invoices.length} related invoice{finding.invoices.length !== 1 ? 's' : ''}
                                              </summary>
                                              <div className="mt-2 space-y-1.5 ml-4">
                                                {finding.invoices.slice(0, 3).map((inv: any, invIdx: number) => (
                                                  <div key={invIdx} className="flex items-center justify-between text-xs bg-black/30 px-3 py-2 rounded-lg border border-slate-800">
                                                    <div className="flex items-center gap-2">
                                                      <Receipt className="w-3 h-3 text-gray-500" />
                                                      <span className="text-gray-300">#{inv.GivenNumber || inv.DocumentNumber}</span>
                                                      {inv.SupplierName && (
                                                        <span className="text-gray-500">• {inv.SupplierName}</span>
                                                      )}
                                                    </div>
                                                    <span className="text-emerald-400 font-medium">
                                                      ${inv.calculatedTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                                                    </span>
                                                  </div>
                                                ))}
                                                {finding.invoices.length > 3 && (
                                                  <p className="text-gray-500 text-xs ml-5">+{finding.invoices.length - 3} more</p>
                                                )}
                                              </div>
                                            </details>
                                          )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {!resolvedFindings.has(finding.originalIdx) && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleResolve(finding.originalIdx)}
                                              className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                                              title="Mark as resolved"
                                            >
                                              <CheckCheck className="w-4 h-4" />
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDismiss(finding.originalIdx)}
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                            title="Dismiss"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {/* Pagination */}
                              {group.findings.length > ITEMS_PER_PAGE && (
                                <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-900/50 via-slate-800/30 to-slate-900/50 border-t border-slate-700/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                                  <p className="text-xs text-gray-500 order-2 sm:order-1">
                                    <span className="hidden sm:inline">Showing </span>
                                    <span className="text-gray-400 font-medium">{getGroupPage(groupKey) * ITEMS_PER_PAGE + 1}-{Math.min((getGroupPage(groupKey) + 1) * ITEMS_PER_PAGE, group.findings.length)}</span>
                                    <span className="text-gray-500"> of </span>
                                    <span className="text-gray-400 font-medium">{group.findings.length}</span>
                                  </p>
                                  <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
                                    <button
                                      onClick={() => setGroupPage(groupKey, getGroupPage(groupKey) - 1)}
                                      disabled={getGroupPage(groupKey) === 0}
                                      className="group relative flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
                                        bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600
                                        border border-slate-600/50 hover:border-slate-500/70
                                        text-gray-300 hover:text-white
                                        shadow-md hover:shadow-lg hover:shadow-slate-500/10
                                        disabled:hover:from-slate-800 disabled:hover:to-slate-700 disabled:hover:border-slate-600/50 disabled:hover:shadow-md"
                                    >
                                      <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                                      <span className="hidden sm:inline">Previous</span>
                                    </button>
                                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/30 min-w-[70px] sm:min-w-[90px] justify-center">
                                      <span className="text-sm font-semibold text-cyan-400">{getGroupPage(groupKey) + 1}</span>
                                      <span className="text-xs text-gray-500">/</span>
                                      <span className="text-sm font-semibold text-gray-300">{getTotalPages(group.findings.length)}</span>
                                    </div>
                                    <button
                                      onClick={() => setGroupPage(groupKey, getGroupPage(groupKey) + 1)}
                                      disabled={getGroupPage(groupKey) >= getTotalPages(group.findings.length) - 1}
                                      className="group relative flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
                                        bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500
                                        border border-cyan-500/30 hover:border-cyan-400/50
                                        text-white
                                        shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30
                                        disabled:hover:from-cyan-600/80 disabled:hover:to-blue-600/80 disabled:hover:border-cyan-500/30 disabled:hover:shadow-md disabled:hover:shadow-cyan-500/20"
                                    >
                                      <span className="hidden sm:inline">Next</span>
                                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* No Results */}
                      {activeFindings.length === 0 && (
                        <div className="text-center py-12">
                          {findingsSearch || findingsFilter !== "all" ? (
                            <>
                              <Search className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                              <p className="text-gray-400 mb-2">No findings match your filters</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setFindingsSearch(""); setFindingsFilter("all"); }}
                                className="border-slate-600 text-gray-400 hover:text-white"
                              >
                                Clear filters
                              </Button>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                              <p className="text-white font-medium mb-1">All findings addressed!</p>
                              <p className="text-gray-500 text-sm">Great job reviewing all cost leaks.</p>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* No Findings State */}
                {(!costLeakAnalysis.supplierInvoiceAnalysis?.findings?.length &&
                  !costLeakAnalysis.licenseAnalysis?.findings?.length &&
                  !costLeakAnalysis.findings?.length) && (
                  <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-800/30">
                    <CardContent className="py-16 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-2">Excellent! No Cost Leaks Detected</h3>
                      <p className="text-gray-400 max-w-md mx-auto">
                        {isMicrosoft365
                          ? "Your Microsoft 365 licenses appear well-optimized with no inactive users, orphaned licenses, or over-provisioning detected."
                          : "Your supplier invoices appear well-managed with no duplicate payments, unusual amounts, or concerning patterns."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Debug JSON */}
                <details className="group">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                    View raw analysis data
                  </summary>
                  <pre className="mt-3 bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-400 max-h-64 border border-slate-800">
                    {JSON.stringify(costLeakAnalysis, null, 2)}
                  </pre>
                </details>
              </>
            )}

            {/* Empty State */}
            {!costLeakAnalysis && !isLoadingAnalysis && (
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
                    <BarChart3 className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">Ready to Analyze</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    {isMicrosoft365
                      ? "Our AI will analyze your Microsoft 365 licenses to identify inactive users, orphaned licenses, over-provisioning, and cost optimization opportunities."
                      : "Our AI will scan your supplier invoices to identify duplicate payments, price anomalies, and other cost optimization opportunities."}
                  </p>
                  <Button
                    onClick={handleAnalyzeCostLeaks}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Start Analysis
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isLoadingAnalysis && (
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 mb-6">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">Analyzing Your Data</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Our AI is scanning your invoices for cost optimization opportunities. This usually takes a few seconds...
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0 space-y-6">
            <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border-slate-700/50 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg shadow-purple-500/25">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl font-bold">Analysis History</CardTitle>
                      <p className="text-gray-400 text-sm">View and compare past cost leak analyses</p>
                    </div>
                  </div>
                  <Button
                    onClick={fetchAnalysisHistory}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingHistory}
                    className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                  >
                    {isLoadingHistory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="relative">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : analysisHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">No Analysis History</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Run a cost leak analysis and save it to start building your history.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysisHistory.map((analysis) => (
                      <div
                        key={analysis.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedHistoricalAnalysis?.id === analysis.id
                            ? "bg-purple-500/20 border-purple-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        }`}
                        onClick={() => loadHistoricalAnalysis(analysis.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-medium">
                                {new Date(analysis.created_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="text-gray-500 text-sm">
                                {new Date(analysis.created_at).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {analysis.parameters?.startDate && (
                                <Badge variant="outline" className="text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                                  {analysis.parameters.startDate} - {analysis.parameters.endDate || "now"}
                                </Badge>
                              )}
                              {analysis.parameters?.inactivityDays && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-400">
                                  {analysis.parameters.inactivityDays} days
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-400">
                                <Target className="w-4 h-4 inline mr-1" />
                                {analysis.summary?.totalFindings || 0} findings
                              </span>
                              <span className="text-emerald-400">
                                <DollarSign className="w-4 h-4 inline mr-1" />
                                ${(analysis.summary?.totalPotentialSavings || 0).toLocaleString()}
                              </span>
                              {analysis.summary?.highSeverity > 0 && (
                                <span className="text-red-400">
                                  <ShieldAlert className="w-4 h-4 inline mr-1" />
                                  {analysis.summary.highSeverity} high
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm("Delete this analysis from history?")) {
                                deleteHistoricalAnalysis(analysis.id)
                              }
                            }}
                            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Historical Analysis Display */}
            {selectedHistoricalAnalysis && (
              <Card className="bg-black/80 backdrop-blur-xl border-purple-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Historical Analysis Details
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-1">
                        From {new Date(selectedHistoricalAnalysis.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedHistoricalAnalysis(null)}
                      className="border-white/10 text-gray-400 hover:text-white"
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingHistoricalAnalysis ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-xs text-gray-500 mb-1">Total Findings</p>
                          <p className="text-xl font-bold text-white">{selectedHistoricalAnalysis.summary?.totalFindings || 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs text-emerald-400/70 mb-1">Potential Savings</p>
                          <p className="text-xl font-bold text-emerald-400">
                            ${(selectedHistoricalAnalysis.summary?.totalPotentialSavings || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-400/70 mb-1">High Severity</p>
                          <p className="text-xl font-bold text-red-400">{selectedHistoricalAnalysis.summary?.highSeverity || 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-xs text-amber-400/70 mb-1">Medium Severity</p>
                          <p className="text-xl font-bold text-amber-400">{selectedHistoricalAnalysis.summary?.mediumSeverity || 0}</p>
                        </div>
                      </div>

                      {/* Parameters Used */}
                      {selectedHistoricalAnalysis.parameters && Object.keys(selectedHistoricalAnalysis.parameters).length > 0 && (
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-xs text-gray-500 mb-2">Analysis Parameters</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedHistoricalAnalysis.parameters.startDate && (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                Start: {selectedHistoricalAnalysis.parameters.startDate}
                              </Badge>
                            )}
                            {selectedHistoricalAnalysis.parameters.endDate && (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                End: {selectedHistoricalAnalysis.parameters.endDate}
                              </Badge>
                            )}
                            {selectedHistoricalAnalysis.parameters.inactivityDays && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                Inactivity: {selectedHistoricalAnalysis.parameters.inactivityDays} days
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Findings Preview */}
                      {(() => {
                        const findings = selectedHistoricalAnalysis.analysis_data?.supplierInvoiceAnalysis?.findings ||
                                        selectedHistoricalAnalysis.analysis_data?.licenseAnalysis?.findings ||
                                        selectedHistoricalAnalysis.analysis_data?.findings || []
                        if (findings.length === 0) return null

                        return (
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Top Findings</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {findings.slice(0, 5).map((finding: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <div className="flex items-start gap-2">
                                    <Badge
                                      className={
                                        finding.severity === "high"
                                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                                          : finding.severity === "medium"
                                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                      }
                                    >
                                      {finding.severity}
                                    </Badge>
                                    <div>
                                      <p className="text-white text-sm font-medium">{finding.title}</p>
                                      <p className="text-gray-400 text-xs mt-1">{finding.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {findings.length > 5 && (
                                <p className="text-center text-gray-500 text-sm py-2">
                                  +{findings.length - 5} more findings
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {/* Connection Details Card */}
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  Connection Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Connection Type</p>
                    <p className="text-white font-medium capitalize">{integration.connection_type || "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Environment</p>
                    <Badge className={integration.environment === "production" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
                      {integration.environment || "N/A"}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
                    <p className="text-white font-medium">{formatDate(integration.created_at)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-white font-medium">{formatDate(integration.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Token Information Card */}
            {integration.settings?.oauth_data?.tokens && (
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-cyan-400" />
                    Authentication Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Token Status Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Token Expiry */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Token Expires</p>
                      </div>
                      <p className="text-white font-medium">
                        {integration.settings.oauth_data.tokens.expires_at
                          ? new Date(integration.settings.oauth_data.tokens.expires_at * 1000).toLocaleString()
                          : "N/A"}
                      </p>
                      {integration.settings.oauth_data.tokens.expires_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(integration.settings.oauth_data.tokens.expires_at * 1000) > new Date()
                            ? <span className="text-green-400">Active</span>
                            : <span className="text-red-400">Expired</span>}
                        </p>
                      )}
                    </div>

                    {/* Token Duration */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className="w-4 h-4 text-gray-400" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Token Duration</p>
                      </div>
                      <p className="text-white font-medium">
                        {integration.settings.oauth_data.tokens.expires_in
                          ? `${Math.floor(integration.settings.oauth_data.tokens.expires_in / 60)} minutes`
                          : "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {integration.settings.oauth_data.tokens.expires_in} seconds
                      </p>
                    </div>
                  </div>

                  {/* Access Token */}
                  {integration.settings.oauth_data.tokens.access_token && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-cyan-400" />
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Access Token</p>
                        </div>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {integration.settings.oauth_data.tokens.token_type || "bearer"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                          {integration.settings.oauth_data.tokens.access_token.substring(0, 50)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(integration.settings.oauth_data.tokens.access_token)
                            toast.success("Access token copied to clipboard")
                          }}
                          className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Refresh Token */}
                  {integration.settings.oauth_data.tokens.refresh_token && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-green-400" />
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Refresh Token</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Available
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                          {integration.settings.oauth_data.tokens.refresh_token.substring(0, 50)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(integration.settings.oauth_data.tokens.refresh_token)
                            toast.success("Refresh token copied to clipboard")
                          }}
                          className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Scopes */}
                  {integration.settings.oauth_data.tokens.scope && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Scopes</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {integration.settings.oauth_data.tokens.scope.split(" ").map((scope: string, index: number) => (
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
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="mt-0">
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {isMicrosoft365 ? "Microsoft 365 Data" : "Fortnox Data"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsInfoVisible(!isInfoVisible)}
                      className="border-white/10 bg-black/50 text-white"
                    >
                      {isInfoVisible ? (
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
                    {isLoadingInfo && (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {isInfoVisible && (
                <CardContent className="space-y-6">
                  {isLoadingInfo ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    </div>
                  ) : (
                    <>
                      {/* Search and Tab Navigation */}
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search data..."
                            value={infoSearchQuery}
                            onChange={(e) => setInfoSearchQuery(e.target.value)}
                            className="pl-10 bg-black/50 border-white/10 text-white"
                          />
                        </div>

                        {/* Data Tab Navigation - Microsoft 365 */}
                        {isMicrosoft365 && (
                          <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                            <button
                              onClick={() => setActiveDataTab("licenses")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "licenses"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Key className="w-4 h-4" />
                              <span className="hidden sm:inline">Licenses</span>
                              {microsoft365Info.licenses && microsoft365Info.licenses.length > 0 && (
                                <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                  {microsoft365Info.licenses.length}
                                </Badge>
                              )}
                            </button>
                            <button
                              onClick={() => setActiveDataTab("users")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "users"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              <span className="hidden sm:inline">Users</span>
                              {microsoft365Info.users && microsoft365Info.users.length > 0 && (
                                <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                  {microsoft365Info.users.length}
                                </Badge>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Data Tab Navigation - HubSpot */}
                        {isHubSpot && (
                          <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                            <button
                              onClick={() => setActiveDataTab("users")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "users"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              <span className="hidden sm:inline">Users</span>
                              {hubspotInfo.users && hubspotInfo.users.length > 0 && (
                                <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                  {hubspotInfo.users.length}
                                </Badge>
                              )}
                            </button>
                            <button
                              onClick={() => setActiveDataTab("account")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "account"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Settings className="w-4 h-4" />
                              <span className="hidden sm:inline">Account</span>
                            </button>
                          </div>
                        )}

                        {/* Data Tab Navigation - Fortnox */}
                        {isFortnox && (
                        <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                          <button
                            onClick={() => setActiveDataTab("company")}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                              activeDataTab === "company"
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <Wallet className="w-4 h-4" />
                            <span className="hidden sm:inline">Company</span>
                          </button>
                          {fortnoxInfo.customers && fortnoxInfo.customers.length > 0 && (
                            <button
                              onClick={() => setActiveDataTab("customers")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "customers"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              <span className="hidden sm:inline">Customers</span>
                              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                {fortnoxInfo.customers.length}
                              </Badge>
                            </button>
                          )}
                          {fortnoxInfo.invoices && fortnoxInfo.invoices.length > 0 && (
                            <button
                              onClick={() => setActiveDataTab("invoices")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "invoices"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="hidden sm:inline">Invoices</span>
                              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                {fortnoxInfo.invoices.length}
                              </Badge>
                            </button>
                          )}
                          {fortnoxInfo.supplierInvoices && fortnoxInfo.supplierInvoices.length > 0 && (
                            <button
                              onClick={() => setActiveDataTab("supplierInvoices")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "supplierInvoices"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Receipt className="w-4 h-4" />
                              <span className="hidden sm:inline">Supplier Inv.</span>
                              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                {fortnoxInfo.supplierInvoices.length}
                              </Badge>
                            </button>
                          )}
                          {fortnoxInfo.accounts && fortnoxInfo.accounts.length > 0 && (
                            <button
                              onClick={() => setActiveDataTab("accounts")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "accounts"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <BookOpen className="w-4 h-4" />
                              <span className="hidden sm:inline">Accounts</span>
                              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                {fortnoxInfo.accounts.length}
                              </Badge>
                            </button>
                          )}
                          {fortnoxInfo.articles && fortnoxInfo.articles.length > 0 && (
                            <button
                              onClick={() => setActiveDataTab("articles")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "articles"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Package className="w-4 h-4" />
                              <span className="hidden sm:inline">Articles</span>
                              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                {fortnoxInfo.articles.length}
                              </Badge>
                            </button>
                          )}
                          {fortnoxInfo.suppliers && fortnoxInfo.suppliers.length > 0 && (
                            <button
                              onClick={() => setActiveDataTab("suppliers")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                activeDataTab === "suppliers"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              <span className="hidden sm:inline">Suppliers</span>
                              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                                {fortnoxInfo.suppliers.length}
                              </Badge>
                            </button>
                          )}
                        </div>
                        )}
                      </div>

                      {/* Microsoft 365 Licenses Tab */}
                      {isMicrosoft365 && activeDataTab === "licenses" && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Key className="w-4 h-4 text-cyan-400" />
                            Licenses
                            {microsoft365Info.licenses && (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                {microsoft365Info.licenses.length}
                              </Badge>
                            )}
                          </h3>
                          {microsoft365Info.licenses && microsoft365Info.licenses.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">License Name</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU ID</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Consumed</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Available</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filterData(microsoft365Info.licenses, infoSearchQuery).map((license: any, idx: number) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                      <td className="py-3 px-4 text-white font-medium">
                                        {license.skuPartNumber || license.displayName || "Unknown"}
                                      </td>
                                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                                        {license.skuId?.substring(0, 8)}...
                                      </td>
                                      <td className="py-3 px-4 text-right text-white">
                                        {license.consumedUnits || 0}
                                      </td>
                                      <td className="py-3 px-4 text-right text-green-400">
                                        {(license.prepaidUnits?.enabled || 0) - (license.consumedUnits || 0)}
                                      </td>
                                      <td className="py-3 px-4 text-right text-cyan-400">
                                        {license.prepaidUnits?.enabled || 0}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              No licenses found.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Microsoft 365 Users Tab */}
                      {isMicrosoft365 && activeDataTab === "users" && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            Users
                            {microsoft365Info.users && (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                {microsoft365Info.users.length}
                              </Badge>
                            )}
                          </h3>
                          {microsoft365Info.users && microsoft365Info.users.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Licenses</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Sign-In</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filterData(microsoft365Info.users, infoSearchQuery).slice(0, 50).map((user: any, idx: number) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                      <td className="py-3 px-4 text-white font-medium">
                                        {user.displayName || "Unknown"}
                                      </td>
                                      <td className="py-3 px-4 text-gray-400">
                                        {user.mail || user.userPrincipalName || "N/A"}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <Badge className={user.accountEnabled
                                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                                          : "bg-red-500/20 text-red-400 border-red-500/30"
                                        }>
                                          {user.accountEnabled ? "Active" : "Disabled"}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-4 text-center text-cyan-400">
                                        {user.assignedLicenses?.length || 0}
                                      </td>
                                      <td className="py-3 px-4 text-gray-400 text-xs">
                                        {user.signInActivity?.lastSignInDateTime
                                          ? new Date(user.signInActivity.lastSignInDateTime).toLocaleDateString()
                                          : "Never"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {microsoft365Info.users.length > 50 && (
                                <p className="text-center text-gray-500 text-sm mt-4">
                                  Showing 50 of {microsoft365Info.users.length} users. Use search to filter.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              No users found.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show message if no M365 data */}
                      {isMicrosoft365 && Object.keys(microsoft365Info).length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-400">No data available. Data is loading or integration needs to be reconnected.</p>
                        </div>
                      )}

                      {/* HubSpot Users Tab */}
                      {isHubSpot && activeDataTab === "users" && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            HubSpot Users
                            {hubspotInfo.users && (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                {hubspotInfo.users.length}
                              </Badge>
                            )}
                          </h3>
                          {hubspotInfo.users && hubspotInfo.users.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Login</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filterData(hubspotInfo.users, infoSearchQuery).slice(0, 50).map((user: any, idx: number) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                      <td className="py-3 px-4 text-white font-medium">
                                        {user.email || "Unknown"}
                                      </td>
                                      <td className="py-3 px-4 text-gray-400">
                                        {user.roleId || user.role || "N/A"}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <Badge className={user.superAdmin
                                          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                          : "bg-green-500/20 text-green-400 border-green-500/30"
                                        }>
                                          {user.superAdmin ? "Super Admin" : "Active"}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-4 text-gray-400 text-xs">
                                        {user.lastLoginAt
                                          ? new Date(user.lastLoginAt).toLocaleDateString()
                                          : "Never"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {hubspotInfo.users.length > 50 && (
                                <p className="text-center text-gray-500 text-sm mt-4">
                                  Showing 50 of {hubspotInfo.users.length} users. Use search to filter.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              No users found.
                            </div>
                          )}
                        </div>
                      )}

                      {/* HubSpot Account Tab */}
                      {isHubSpot && activeDataTab === "account" && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-cyan-400" />
                            Account Information
                          </h3>
                          {hubspotInfo.accountInfo ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {hubspotInfo.accountInfo.portalId && (
                                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Portal ID</p>
                                  <p className="text-white font-medium">{hubspotInfo.accountInfo.portalId}</p>
                                </div>
                              )}
                              {hubspotInfo.accountInfo.accountType && (
                                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Account Type</p>
                                  <p className="text-white font-medium capitalize">{hubspotInfo.accountInfo.accountType}</p>
                                </div>
                              )}
                              {hubspotInfo.accountInfo.timeZone && (
                                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Timezone</p>
                                  <p className="text-white font-medium">{hubspotInfo.accountInfo.timeZone}</p>
                                </div>
                              )}
                              {hubspotInfo.accountInfo.currency && (
                                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Currency</p>
                                  <p className="text-white font-medium">{hubspotInfo.accountInfo.currency}</p>
                                </div>
                              )}
                              {hubspotInfo.users && (
                                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Seats</p>
                                  <p className="text-white font-medium">{hubspotInfo.users.length}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              Account information not available.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show message if no HubSpot data */}
                      {isHubSpot && Object.keys(hubspotInfo).length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-400">No data available. Data is loading or integration needs to be reconnected.</p>
                        </div>
                      )}

                      {/* Company Information Tab - Fortnox */}
                      {isFortnox && activeDataTab === "company" && fortnoxInfo.company && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-cyan-400" />
                            Company Information
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(fortnoxInfo.company.CompanyName || fortnoxInfo.company.Name) && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company Name</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.CompanyName || fortnoxInfo.company.Name}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.OrganisationNumber && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Organization Number</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.OrganisationNumber}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.Email && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.Email}</p>
                              </div>
                            )}
                            {(fortnoxInfo.company.Phone1 || fortnoxInfo.company.Phone) && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.Phone1 || fortnoxInfo.company.Phone}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.Address && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.Address}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.City && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">City</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.City}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.ZipCode && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Zip Code</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.ZipCode}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.Country && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Country</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.Country}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.CountryCode && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Country Code</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.CountryCode}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.WWW && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Website</p>
                                <p className="text-cyan-400 font-medium">{fortnoxInfo.company.WWW}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.VatNumber && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">VAT Number</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.VatNumber}</p>
                              </div>
                            )}
                            {fortnoxInfo.company.DatabaseNumber && (
                              <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Database Number</p>
                                <p className="text-white font-medium">{fortnoxInfo.company.DatabaseNumber}</p>
                              </div>
                            )}
                          </div>

                          {/* Settings sub-section */}
                          {fortnoxInfo.settings && Object.keys(fortnoxInfo.settings).length > 0 && (
                            <div className="mt-6">
                              <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-cyan-400" />
                                Settings
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(fortnoxInfo.settings).map(([key, value]) => (
                                  <div key={key} className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </p>
                                    <p className="text-white font-medium">
                                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || 'N/A')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customers Tab */}
                      {isFortnox && activeDataTab === "customers" && fortnoxInfo.customers && fortnoxInfo.customers.length > 0 && (() => {
                        const filteredCustomers = filterData(fortnoxInfo.customers, infoSearchQuery)
                        const totalCustomerPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
                        const paginatedCustomers = filteredCustomers.slice(
                          (customersPage - 1) * ITEMS_PER_PAGE,
                          customersPage * ITEMS_PER_PAGE
                        )
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-cyan-400" />
                                Customers
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                  {filteredCustomers.length}
                                </Badge>
                              </h3>
                              {totalCustomerPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
                                    disabled={customersPage === 1}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-400">
                                    {customersPage} / {totalCustomerPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCustomersPage(p => Math.min(totalCustomerPages, p + 1))}
                                    disabled={customersPage === totalCustomerPages}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-white/5 border-b border-white/10">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Customer</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Number</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Email</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">City</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedCustomers.map((customer: any, idx: number) => (
                                    <tr key={customer.CustomerNumber || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="p-3">
                                        <p className="text-white font-medium">{customer.Name || 'N/A'}</p>
                                        <p className="text-xs text-gray-500 sm:hidden">{customer.Email || '-'}</p>
                                      </td>
                                      <td className="p-3 text-gray-300">{customer.CustomerNumber || '-'}</td>
                                      <td className="p-3 text-gray-300 hidden sm:table-cell">{customer.Email || '-'}</td>
                                      <td className="p-3 text-gray-300 hidden md:table-cell">{customer.City || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Invoices Tab */}
                      {isFortnox && activeDataTab === "invoices" && fortnoxInfo.invoices && fortnoxInfo.invoices.length > 0 && (() => {
                        const filteredInvoices = filterData(fortnoxInfo.invoices, infoSearchQuery)
                        const totalInvoicePages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
                        const paginatedInvoices = filteredInvoices.slice(
                          (invoicesPage - 1) * ITEMS_PER_PAGE,
                          invoicesPage * ITEMS_PER_PAGE
                        )
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-cyan-400" />
                                Invoices
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                  {filteredInvoices.length}
                                </Badge>
                              </h3>
                              {totalInvoicePages > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInvoicesPage(p => Math.max(1, p - 1))}
                                    disabled={invoicesPage === 1}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-400">
                                    {invoicesPage} / {totalInvoicePages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInvoicesPage(p => Math.min(totalInvoicePages, p + 1))}
                                    disabled={invoicesPage === totalInvoicePages}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-white/5 border-b border-white/10">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Invoice #</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Customer</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Date</th>
                                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Amount</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedInvoices.map((invoice: any, idx: number) => (
                                    <tr key={invoice.DocumentNumber || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-white font-medium">{invoice.DocumentNumber || '-'}</td>
                                      <td className="p-3">
                                        <p className="text-gray-300">{invoice.CustomerName || '-'}</p>
                                        <p className="text-xs text-gray-500 sm:hidden">{invoice.InvoiceDate || '-'}</p>
                                      </td>
                                      <td className="p-3 text-gray-300 hidden sm:table-cell">{invoice.InvoiceDate || '-'}</td>
                                      <td className="p-3 text-right text-white font-medium">
                                        {formatCurrencyForIntegration(invoice.Total, integration?.connection_type || 'fortnox')}
                                      </td>
                                      <td className="p-3 hidden md:table-cell">
                                        <Badge className={
                                          invoice.Cancelled ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                          invoice.Booked ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                          "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                        }>
                                          {invoice.Cancelled ? 'Cancelled' : invoice.Booked ? 'Booked' : 'Draft'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Supplier Invoices Tab */}
                      {isFortnox && activeDataTab === "supplierInvoices" && fortnoxInfo.supplierInvoices && fortnoxInfo.supplierInvoices.length > 0 && (() => {
                        const filteredSupplierInvoices = filterData(fortnoxInfo.supplierInvoices, infoSearchQuery)
                        const totalSupplierInvoicePages = Math.ceil(filteredSupplierInvoices.length / ITEMS_PER_PAGE)
                        const paginatedSupplierInvoices = filteredSupplierInvoices.slice(
                          (supplierInvoicesPage - 1) * ITEMS_PER_PAGE,
                          supplierInvoicesPage * ITEMS_PER_PAGE
                        )
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-cyan-400" />
                                Supplier Invoices
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                  {filteredSupplierInvoices.length}
                                </Badge>
                              </h3>
                              {totalSupplierInvoicePages > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSupplierInvoicesPage(p => Math.max(1, p - 1))}
                                    disabled={supplierInvoicesPage === 1}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-400">
                                    {supplierInvoicesPage} / {totalSupplierInvoicePages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSupplierInvoicesPage(p => Math.min(totalSupplierInvoicePages, p + 1))}
                                    disabled={supplierInvoicesPage === totalSupplierInvoicePages}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-white/5 border-b border-white/10">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Invoice #</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Supplier</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Date</th>
                                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Amount</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Due Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedSupplierInvoices.map((invoice: any, idx: number) => (
                                    <tr key={invoice.GivenNumber || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-white font-medium">{invoice.GivenNumber || '-'}</td>
                                      <td className="p-3">
                                        <p className="text-gray-300">{invoice.SupplierName || '-'}</p>
                                        <p className="text-xs text-gray-500 sm:hidden">{invoice.InvoiceDate || '-'}</p>
                                      </td>
                                      <td className="p-3 text-gray-300 hidden sm:table-cell">{invoice.InvoiceDate || '-'}</td>
                                      <td className="p-3 text-right text-white font-medium">
                                        {formatCurrencyForIntegration(invoice.Total, integration?.connection_type || 'fortnox')}
                                      </td>
                                      <td className="p-3 text-gray-300 hidden md:table-cell">{invoice.DueDate || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Accounts Tab */}
                      {isFortnox && activeDataTab === "accounts" && fortnoxInfo.accounts && fortnoxInfo.accounts.length > 0 && (() => {
                        const filteredAccounts = filterData(fortnoxInfo.accounts, infoSearchQuery)
                        const totalAccountPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)
                        const paginatedAccounts = filteredAccounts.slice(
                          (accountsPage - 1) * ITEMS_PER_PAGE,
                          accountsPage * ITEMS_PER_PAGE
                        )
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-cyan-400" />
                                Accounts
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                  {filteredAccounts.length}
                                </Badge>
                              </h3>
                              {totalAccountPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAccountsPage(p => Math.max(1, p - 1))}
                                    disabled={accountsPage === 1}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-400">
                                    {accountsPage} / {totalAccountPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAccountsPage(p => Math.min(totalAccountPages, p + 1))}
                                    disabled={accountsPage === totalAccountPages}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-white/5 border-b border-white/10">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Account #</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Description</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">SRU</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedAccounts.map((account: any, idx: number) => (
                                    <tr key={account.Number || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-white font-medium">{account.Number || '-'}</td>
                                      <td className="p-3 text-gray-300">{account.Description || '-'}</td>
                                      <td className="p-3 text-gray-300 hidden sm:table-cell">{account.SRU || '-'}</td>
                                      <td className="p-3 hidden md:table-cell">
                                        <Badge className={account.Active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                                          {account.Active ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Articles Tab */}
                      {isFortnox && activeDataTab === "articles" && fortnoxInfo.articles && fortnoxInfo.articles.length > 0 && (() => {
                        const filteredArticles = filterData(fortnoxInfo.articles, infoSearchQuery)
                        const totalArticlePages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE)
                        const paginatedArticles = filteredArticles.slice(
                          (articlesPage - 1) * ITEMS_PER_PAGE,
                          articlesPage * ITEMS_PER_PAGE
                        )
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Package className="w-4 h-4 text-cyan-400" />
                                Articles
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                  {filteredArticles.length}
                                </Badge>
                              </h3>
                              {totalArticlePages > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setArticlesPage(p => Math.max(1, p - 1))}
                                    disabled={articlesPage === 1}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-400">
                                    {articlesPage} / {totalArticlePages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setArticlesPage(p => Math.min(totalArticlePages, p + 1))}
                                    disabled={articlesPage === totalArticlePages}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-white/5 border-b border-white/10">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Article #</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Description</th>
                                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Price</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedArticles.map((article: any, idx: number) => (
                                    <tr key={article.ArticleNumber || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-white font-medium">{article.ArticleNumber || '-'}</td>
                                      <td className="p-3 text-gray-300">{article.Description || '-'}</td>
                                      <td className="p-3 text-right text-white font-medium hidden sm:table-cell">
                                        {formatCurrencyForIntegration(article.SalesPrice, integration?.connection_type || 'fortnox')}
                                      </td>
                                      <td className="p-3 text-gray-300 hidden md:table-cell">{article.Unit || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Suppliers Tab */}
                      {isFortnox && activeDataTab === "suppliers" && fortnoxInfo.suppliers && fortnoxInfo.suppliers.length > 0 && (() => {
                        const filteredSuppliers = filterData(fortnoxInfo.suppliers, infoSearchQuery)
                        const totalSupplierPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE)
                        const paginatedSuppliers = filteredSuppliers.slice(
                          (suppliersPage - 1) * ITEMS_PER_PAGE,
                          suppliersPage * ITEMS_PER_PAGE
                        )
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-cyan-400" />
                                Suppliers
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-2">
                                  {filteredSuppliers.length}
                                </Badge>
                              </h3>
                              {totalSupplierPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSuppliersPage(p => Math.max(1, p - 1))}
                                    disabled={suppliersPage === 1}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-400">
                                    {suppliersPage} / {totalSupplierPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSuppliersPage(p => Math.min(totalSupplierPages, p + 1))}
                                    disabled={suppliersPage === totalSupplierPages}
                                    className="h-8 w-8 p-0 border-white/10 bg-black/50 text-white disabled:opacity-50"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-white/5 border-b border-white/10">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Supplier</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Number</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Email</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">City</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedSuppliers.map((supplier: any, idx: number) => (
                                    <tr key={supplier.SupplierNumber || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="p-3">
                                        <p className="text-white font-medium">{supplier.Name || 'N/A'}</p>
                                        <p className="text-xs text-gray-500 sm:hidden">{supplier.Email || '-'}</p>
                                      </td>
                                      <td className="p-3 text-gray-300">{supplier.SupplierNumber || '-'}</td>
                                      <td className="p-3 text-gray-300 hidden sm:table-cell">{supplier.Email || '-'}</td>
                                      <td className="p-3 text-gray-300 hidden md:table-cell">{supplier.City || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Show message if no Fortnox data */}
                      {isFortnox && Object.keys(fortnoxInfo).length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-400">No data available. Click "Show" to load information.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Non-Fortnox or not connected - show only Overview */
        <div className="space-y-6">
          {/* Connection Details Card */}
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Connection Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Connection Type</p>
                  <p className="text-white font-medium capitalize">{integration.connection_type || "N/A"}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Environment</p>
                  <Badge className={integration.environment === "production" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
                    {integration.environment || "N/A"}
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
                  <p className="text-white font-medium">{formatDate(integration.created_at)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
                  <p className="text-white font-medium">{formatDate(integration.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Information Card */}
          {integration.settings?.oauth_data?.tokens && (
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  Authentication Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Token Expiry */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Token Expires</p>
                    </div>
                    <p className="text-white font-medium">
                      {integration.settings.oauth_data.tokens.expires_at
                        ? new Date(integration.settings.oauth_data.tokens.expires_at * 1000).toLocaleString()
                        : "N/A"}
                    </p>
                    {integration.settings.oauth_data.tokens.expires_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(integration.settings.oauth_data.tokens.expires_at * 1000) > new Date()
                          ? <span className="text-green-400">Active</span>
                          : <span className="text-red-400">Expired</span>}
                      </p>
                    )}
                  </div>

                  {/* Token Duration */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Token Duration</p>
                    </div>
                    <p className="text-white font-medium">
                      {integration.settings.oauth_data.tokens.expires_in
                        ? `${Math.floor(integration.settings.oauth_data.tokens.expires_in / 60)} minutes`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {integration.settings.oauth_data.tokens.expires_in} seconds
                    </p>
                  </div>
                </div>

                {/* Access Token */}
                {integration.settings.oauth_data.tokens.access_token && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Access Token</p>
                      </div>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                        {integration.settings.oauth_data.tokens.token_type || "bearer"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                        {integration.settings.oauth_data.tokens.access_token.substring(0, 50)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(integration.settings.oauth_data.tokens.access_token)
                          toast.success("Access token copied to clipboard")
                        }}
                        className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Refresh Token */}
                {integration.settings.oauth_data.tokens.refresh_token && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-green-400" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Refresh Token</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Available
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-gray-400 bg-black/50 px-3 py-2 rounded-md truncate">
                        {integration.settings.oauth_data.tokens.refresh_token.substring(0, 50)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(integration.settings.oauth_data.tokens.refresh_token)
                          toast.success("Refresh token copied to clipboard")
                        }}
                        className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Scopes */}
                {integration.settings.oauth_data.tokens.scope && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Scopes</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {integration.settings.oauth_data.tokens.scope.split(" ").map((scope: string, index: number) => (
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
      )}

      {/* Legacy Cost Leak Analysis Section - Remove this after confirming tabs work */}
      {false && isFortnox && integration.status === "connected" && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Fortnox Data
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInfoVisible(!isInfoVisible)}
                  className="border-white/10 bg-black/50 text-white"
                >
                  {isInfoVisible ? (
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
                {isLoadingInfo && (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                )}
              </div>
            </div>
          </CardHeader>
          {isInfoVisible && (
            <CardContent className="space-y-6">
              {isLoadingInfo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search data..."
                      value={infoSearchQuery}
                      onChange={(e) => setInfoSearchQuery(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white"
                    />
                  </div>

                  {/* Company Information */}
                  {fortnoxInfo.company && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Company Information
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(fortnoxInfo.company, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Settings */}
                  {fortnoxInfo.settings && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Settings
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(fortnoxInfo.settings, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Customers */}
                  {fortnoxInfo.customers && fortnoxInfo.customers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Customers ({fortnoxInfo.customers.length})
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(filterData(fortnoxInfo.customers, infoSearchQuery), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Invoices */}
                  {fortnoxInfo.invoices && fortnoxInfo.invoices.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Invoices ({fortnoxInfo.invoices.length})
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(filterData(fortnoxInfo.invoices, infoSearchQuery), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Supplier Invoices */}
                  {fortnoxInfo.supplierInvoices && fortnoxInfo.supplierInvoices.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Supplier Invoices ({fortnoxInfo.supplierInvoices.length})
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(filterData(fortnoxInfo.supplierInvoices, infoSearchQuery), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Accounts */}
                  {fortnoxInfo.accounts && fortnoxInfo.accounts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Accounts ({fortnoxInfo.accounts.length})
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(filterData(fortnoxInfo.accounts, infoSearchQuery), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Articles */}
                  {fortnoxInfo.articles && fortnoxInfo.articles.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Articles ({fortnoxInfo.articles.length})
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(filterData(fortnoxInfo.articles, infoSearchQuery), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Suppliers */}
                  {fortnoxInfo.suppliers && fortnoxInfo.suppliers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Suppliers ({fortnoxInfo.suppliers.length})
                      </h3>
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                        {JSON.stringify(filterData(fortnoxInfo.suppliers, infoSearchQuery), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Show message if no data */}
                  {Object.keys(fortnoxInfo).length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No data available. Click "Show" to load information.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Old Cost Leak Analysis Section - Removed, now in tabs */}
      {false && isFortnox && integration.status === "connected" && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-white flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-lg sm:text-xl">Cost Leak Analysis</span>
                </CardTitle>
                <p className="text-gray-400 text-xs sm:text-sm">
                  AI-powered analysis to identify potential cost leaks and savings opportunities
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {costLeakAnalysis && (
                  <Button
                    onClick={() => setIsAnalysisVisible(!isAnalysisVisible)}
                    variant="outline"
                    className="border-white/10 bg-black/50 text-white hover:bg-white/10"
                    title={isAnalysisVisible ? "Hide analysis" : "Show analysis"}
                  >
                    {isAnalysisVisible ? (
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
                  onClick={handleAnalyzeCostLeaks}
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
          {costLeakAnalysis && isAnalysisVisible && (
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              {costLeakAnalysis.overallSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-black/40 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                    <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Total Findings</p>
                    <p className="text-2xl font-bold text-white">
                      {costLeakAnalysis.overallSummary.totalFindings || 0}
                    </p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 border border-green-500/30 hover:border-green-500/50 transition-colors">
                    <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Potential Savings</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrencyForIntegration(
                        costLeakAnalysis.overallSummary.totalPotentialSavings || 0,
                        integration?.connection_type || 'fortnox'
                      )}
                    </p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 border border-red-500/30 hover:border-red-500/50 transition-colors">
                    <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">High Priority</p>
                    <p className="text-2xl font-bold text-red-400">
                      {costLeakAnalysis.overallSummary.highSeverity || 0}
                    </p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30 hover:border-amber-500/50 transition-colors">
                    <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Medium Priority</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {costLeakAnalysis.overallSummary.mediumSeverity || 0}
                    </p>
                  </div>
                </div>
              )}

              {/* Subscription Analysis */}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                                  {formatCurrencyForIntegration(finding.potentialSavings, integration?.connection_type || 'fortnox')}
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
                                            {formatCurrencyForIntegration(inv.calculatedTotal || 0, integration?.connection_type || 'fortnox')}
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
                  <p className="text-gray-400 text-sm">
                    {isMicrosoft365 ? "Your Microsoft 365 licenses are well-optimized." : "Your supplier invoices look good."}
                  </p>
                </div>
              )}

              {/* Full Analysis JSON */}
              <details className="mt-6">
                <summary className="text-sm text-cyan-400 cursor-pointer hover:text-cyan-300 font-medium list-none flex items-center gap-2 mb-3">
                  <span className="transition-transform group-open:rotate-90">▶</span>
                  View Full Analysis JSON
                </summary>
                <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-96">
                  {JSON.stringify(costLeakAnalysis, null, 2)}
                </pre>
              </details>
            </CardContent>
          )}
        </Card>
      )}

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 text-white max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              PDF Summary Preview
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              A concise 1-page summary with key metrics, charts, and top priority actions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
            {/* PDF Preview Content */}
            <div className="bg-white rounded-lg p-4 text-slate-900 shadow-xl">
              {/* Mock PDF Header */}
              <div className="bg-slate-900 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">Efficyon</h3>
                      <p className="text-gray-400 text-[10px]">Cost Leak Analysis Summary</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-[10px]">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-slate-100 rounded p-2 text-center">
                  <p className="text-[8px] text-slate-500 uppercase">Total Issues</p>
                  <p className="text-lg font-bold text-slate-800">
                    {costLeakAnalysis?.overallSummary?.totalFindings || 0}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded p-2 text-center border border-emerald-200">
                  <p className="text-[8px] text-emerald-600 uppercase">Savings</p>
                  <p className="text-sm font-bold text-emerald-600">
                    ${(costLeakAnalysis?.overallSummary?.totalPotentialSavings || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-red-50 rounded p-2 text-center border border-red-200">
                  <p className="text-[8px] text-red-600 uppercase">High</p>
                  <p className="text-lg font-bold text-red-600">
                    {costLeakAnalysis?.overallSummary?.highSeverity || 0}
                  </p>
                </div>
                <div className="bg-amber-50 rounded p-2 text-center border border-amber-200">
                  <p className="text-[8px] text-amber-600 uppercase">Medium</p>
                  <p className="text-lg font-bold text-amber-600">
                    {costLeakAnalysis?.overallSummary?.mediumSeverity || 0}
                  </p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Donut Chart Preview */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-700 mb-2">Issues by Severity</h4>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                        {(costLeakAnalysis?.overallSummary?.highSeverity || 0) > 0 && (
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3"
                            strokeDasharray={`${((costLeakAnalysis?.overallSummary?.highSeverity || 0) / Math.max((costLeakAnalysis?.overallSummary?.totalFindings || 1), 1)) * 100} 100`}
                            strokeDashoffset="25" />
                        )}
                        {(costLeakAnalysis?.overallSummary?.mediumSeverity || 0) > 0 && (
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3"
                            strokeDasharray={`${((costLeakAnalysis?.overallSummary?.mediumSeverity || 0) / Math.max((costLeakAnalysis?.overallSummary?.totalFindings || 1), 1)) * 100} 100`}
                            strokeDashoffset={`${25 - ((costLeakAnalysis?.overallSummary?.highSeverity || 0) / Math.max((costLeakAnalysis?.overallSummary?.totalFindings || 1), 1)) * 100}`} />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-700">{costLeakAnalysis?.overallSummary?.totalFindings || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-[9px]">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-sm" />
                        <span className="text-slate-600">High ({costLeakAnalysis?.overallSummary?.highSeverity || 0})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-sm" />
                        <span className="text-slate-600">Medium ({costLeakAnalysis?.overallSummary?.mediumSeverity || 0})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-sm" />
                        <span className="text-slate-600">Low ({costLeakAnalysis?.overallSummary?.lowSeverity || 0})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar Chart Preview */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-700 mb-2">Savings by Category</h4>
                  <div className="space-y-2">
                    {getGroupedFindingsForPreview().slice(0, 3).map(([key, group]) => (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[8px]">
                          <span className="text-slate-600">{group.title}</span>
                          <span className="font-medium text-slate-700">${(group.savings || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${
                              group.color === 'red' ? 'bg-red-500' :
                              group.color === 'amber' ? 'bg-amber-500' :
                              group.color === 'orange' ? 'bg-orange-500' :
                              'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(((group.savings || 0) / Math.max(costLeakAnalysis?.overallSummary?.totalPotentialSavings || 1, 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Actions Preview */}
              <div className="mb-3">
                <h4 className="text-[10px] font-bold text-slate-700 mb-2">Top Priority Actions</h4>
                <div className="space-y-1">
                  {(() => {
                    // Consolidate findings by title (check both Fortnox and M365 data sources)
                    const findings = costLeakAnalysis?.supplierInvoiceAnalysis?.findings || costLeakAnalysis?.licenseAnalysis?.findings || []
                    const consolidated: Record<string, { title: string, count: number, totalSavings: number, severity: string }> = {}
                    findings.forEach((f: any) => {
                      const title = f.title || 'Untitled'
                      if (!consolidated[title]) {
                        consolidated[title] = { title, count: 0, totalSavings: 0, severity: f.severity || 'low' }
                      }
                      consolidated[title].count++
                      consolidated[title].totalSavings += f.potentialSavings || 0
                      if (f.severity === 'high') consolidated[title].severity = 'high'
                      else if (f.severity === 'medium' && consolidated[title].severity !== 'high') {
                        consolidated[title].severity = 'medium'
                      }
                    })
                    return Object.values(consolidated)
                      .sort((a, b) => b.totalSavings - a.totalSavings)
                      .slice(0, 3)
                      .map((action, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
                            action.severity === 'high' ? 'bg-red-500' : action.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-[9px] text-slate-700 flex-1 truncate">
                            {action.title}{action.count > 1 ? ` (${action.count})` : ''}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600">
                            ${action.totalSavings.toLocaleString()}
                          </span>
                        </div>
                      ))
                  })()}
                </div>
              </div>

              {/* Footer Preview */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[8px] text-slate-400">
                <span>Confidential</span>
                <span className="text-cyan-600">Powered by Efficyon</span>
                <span>Page 1 of 1</span>
              </div>
            </div>

            {/* PDF Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                What's included in the PDF
              </h4>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Key metrics summary (issues, savings, severity counts)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Visual donut chart showing severity distribution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Bar chart showing savings by category
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Top 3 priority actions with potential savings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  AI insight with actionable recommendation
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-700/50 pt-4 gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPdfPreview(false)}
              className="border-slate-600 text-gray-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}

