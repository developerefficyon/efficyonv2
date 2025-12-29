"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getValidSessionToken } from "@/lib/auth-helpers"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

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
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [infoSearchQuery, setInfoSearchQuery] = useState("")
  const [isInfoVisible, setIsInfoVisible] = useState(true)
  const [costLeakAnalysis, setCostLeakAnalysis] = useState<any>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(true)

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
      const accessToken = await getValidSessionToken()

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

      // If it's Fortnox and connected, load the information (but not analysis - user must click button)
      if (found.tool_name === "Fortnox" && found.status === "connected") {
        void loadFortnoxInfo(found)
        // Analysis is only loaded when user clicks "Analyze Cost Leaks" button
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
      const accessToken = await getValidSessionToken()

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
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        toast.error("Session expired", { 
          description: "Please log in again to continue" 
        })
        router.push("/login")
        setIsLoadingAnalysis(false)
        return
      }

      const res = await fetch(`${apiBase}/api/integrations/fortnox/cost-leaks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        // Handle authentication errors
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
        
        // Check if it's a token refresh error
        if (errorMessage.toLowerCase().includes("token") || errorMessage.toLowerCase().includes("refresh")) {
          toast.error("Session expired", { 
            description: "Please log in again to continue" 
          })
          router.push("/login")
          setIsLoadingAnalysis(false)
          return
        }
        
        throw new Error(errorMessage)
      }

      const data = await res.json()
      setCostLeakAnalysis(data)
    } catch (error: any) {
      console.error("Error fetching cost leak analysis:", error)
      
      // Don't show error toast if we're redirecting to login
      if (!error.message?.toLowerCase().includes("session expired") && 
          !error.message?.toLowerCase().includes("token")) {
        toast.error("Failed to analyze cost leaks", {
          description: error.message || "An error occurred.",
        })
      }
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

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

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/tools")}
          className="text-gray-400 hover:text-white self-start"
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
      {isFortnox && integration.status === "connected" ? (
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

          {/* Cost Analysis Tab - Prominent First Tab */}
          <TabsContent value="analysis" className="mt-0">
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
              {costLeakAnalysis && isAnalysisVisible && (
                <CardContent className="space-y-6">
                  {/* Summary Paragraph */}
                  {costLeakAnalysis.overallSummary && (
                    <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-lg p-5 border border-slate-700/50">
                      <div className="space-y-3">
                        {costLeakAnalysis.overallSummary.totalFindings > 0 ? (
                          <>
                            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                              After analyzing your supplier invoices, we've discovered several opportunities to optimize your spending. 
                              Our review identified <span className="font-semibold text-white">{costLeakAnalysis.overallSummary.totalFindings}</span> cost leak{costLeakAnalysis.overallSummary.totalFindings !== 1 ? 's' : ''} that, if addressed, could save your company approximately <span className="font-semibold text-green-400">${costLeakAnalysis.overallSummary.totalPotentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>.
                            </p>
                            <div className="space-y-2">
                              {costLeakAnalysis.overallSummary.highSeverity > 0 && (
                                <p className="text-sm text-gray-300 leading-relaxed">
                                  <span className="font-semibold text-red-400">Immediate Action Required:</span> We found <span className="font-semibold text-white">{costLeakAnalysis.overallSummary.highSeverity}</span> high-priority issue{costLeakAnalysis.overallSummary.highSeverity !== 1 ? 's' : ''} that need{costLeakAnalysis.overallSummary.highSeverity === 1 ? 's' : ''} your urgent attention. These typically include duplicate payments or significant anomalies that could be costing you money right now. We recommend reviewing these findings first to prevent further financial impact.
                                </p>
                              )}
                              {costLeakAnalysis.overallSummary.mediumSeverity > 0 && (
                                <p className="text-sm text-gray-300 leading-relaxed">
                                  <span className="font-semibold text-amber-400">Review Recommended:</span> Additionally, <span className="font-semibold text-white">{costLeakAnalysis.overallSummary.mediumSeverity}</span> medium-priority finding{costLeakAnalysis.overallSummary.mediumSeverity !== 1 ? 's' : ''} suggest{costLeakAnalysis.overallSummary.mediumSeverity === 1 ? 's' : ''} potential areas for optimization, such as unusual invoice amounts, price increases, or overdue payments. Addressing these can help improve your cash flow and prevent future cost escalations.
                                </p>
                              )}
                              <p className="text-sm text-gray-300 leading-relaxed">
                                <span className="font-semibold text-cyan-400">Key Recommendations:</span> Start by investigating the high-priority findings, particularly any duplicate payments or suspicious transactions. Next, review recurring subscriptions to ensure you're only paying for services you actively use. Finally, establish regular monitoring of supplier invoices to catch these issues early and maintain better control over your expenses.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                              Excellent news! Our comprehensive analysis of your supplier invoices found no significant cost leaks or anomalies. 
                              Your financial data appears well-managed with no duplicate payments, unusual amounts, or other concerning patterns detected.
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed">
                              <span className="font-semibold text-green-400">Recommendations to Maintain This Status:</span> Continue monitoring your expenses regularly, especially when onboarding new suppliers or processing large invoices. Set up automated alerts for duplicate payments and unusual amounts. Consider reviewing your recurring subscriptions quarterly to ensure you're only paying for services you actively use. Regular audits like this one will help you maintain healthy financial controls and catch potential issues before they become costly problems.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

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
                          {costLeakAnalysis.overallSummary.totalPotentialSavings 
                            ? `$${costLeakAnalysis.overallSummary.totalPotentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                            : "$0.00 USD"}
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
                                      ${finding.potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
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
                                                {inv.calculatedTotal ? `$${inv.calculatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : '$0.00 USD'}
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
              {!costLeakAnalysis && !isLoadingAnalysis && (
                <CardContent className="py-12">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-amber-400 opacity-50" />
                    <p className="text-gray-400 mb-4">No analysis data yet. Click "Analyze Cost Leaks" to get started.</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <Card className="bg-black/80 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Integration Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Connection Type</p>
                    <p className="text-white">{integration.connection_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Environment</p>
                    <p className="text-white">{integration.environment || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Created</p>
                    <p className="text-white">{formatDate(integration.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                    <p className="text-white">{formatDate(integration.updated_at)}</p>
                  </div>
                </div>

                {integration.settings && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Settings</p>
                    <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300">
                      {JSON.stringify(integration.settings, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="mt-0">
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
          </TabsContent>
        </Tabs>
      ) : (
        /* Non-Fortnox or not connected - show only Overview */
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Integration Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Connection Type</p>
                <p className="text-white">{integration.connection_type || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Environment</p>
                <p className="text-white">{integration.environment || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Created</p>
                <p className="text-white">{formatDate(integration.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                <p className="text-white">{formatDate(integration.updated_at)}</p>
              </div>
            </div>

            {integration.settings && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Settings</p>
                <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-gray-300">
                  {JSON.stringify(integration.settings, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
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
                      {costLeakAnalysis.overallSummary.totalPotentialSavings 
                        ? `${costLeakAnalysis.overallSummary.totalPotentialSavings.toLocaleString('sv-SE')} SEK`
                        : "0 SEK"}
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
    </div>
  )
}

