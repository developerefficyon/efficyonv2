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
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
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
  const [findingsFilter, setFindingsFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [findingsSearch, setFindingsSearch] = useState("")
  const [dismissedFindings, setDismissedFindings] = useState<Set<number>>(new Set())
  const [resolvedFindings, setResolvedFindings] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["duplicates", "anomalies", "overdue"]))
  const [groupPages, setGroupPages] = useState<{ [key: string]: number }>({})
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const ITEMS_PER_PAGE = 10

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

  // Helper functions for findings management
  const getFilteredFindings = () => {
    if (!costLeakAnalysis?.supplierInvoiceAnalysis?.findings) return []

    let findings = costLeakAnalysis.supplierInvoiceAnalysis.findings

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
    const groups: { [key: string]: { title: string; icon: any; findings: any[]; color: string } } = {
      duplicates: { title: "Duplicate Payments", icon: FileText, findings: [], color: "red" },
      anomalies: { title: "Price Anomalies", icon: TrendingDown, findings: [], color: "amber" },
      overdue: { title: "Overdue & Payment Issues", icon: Clock, findings: [], color: "orange" },
      other: { title: "Other Findings", icon: AlertTriangle, findings: [], color: "slate" },
    }

    findings.forEach((finding: any, idx: number) => {
      const originalIdx = costLeakAnalysis?.supplierInvoiceAnalysis?.findings?.indexOf(finding) ?? idx
      const findingWithIdx = { ...finding, originalIdx }

      if (finding.title?.toLowerCase().includes("duplicate")) {
        groups.duplicates.findings.push(findingWithIdx)
      } else if (finding.title?.toLowerCase().includes("price") || finding.title?.toLowerCase().includes("anomal")) {
        groups.anomalies.findings.push(findingWithIdx)
      } else if (finding.title?.toLowerCase().includes("overdue") || finding.title?.toLowerCase().includes("payment")) {
        groups.overdue.findings.push(findingWithIdx)
      } else {
        groups.other.findings.push(findingWithIdx)
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

  // PDF Export Function
  const exportToPDF = () => {
    if (!costLeakAnalysis) {
      toast.error("No analysis data to export")
      return
    }

    setIsExporting(true)
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Colors
    const primaryColor: [number, number, number] = [6, 182, 212] // Cyan-500
    const secondaryColor: [number, number, number] = [59, 130, 246] // Blue-500
    const darkBg: [number, number, number] = [15, 23, 42] // Slate-900
    const highSeverity: [number, number, number] = [239, 68, 68] // Red-500
    const mediumSeverity: [number, number, number] = [245, 158, 11] // Amber-500
    const lowSeverity: [number, number, number] = [100, 116, 139] // Slate-500
    const successColor: [number, number, number] = [16, 185, 129] // Emerald-500

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
        return true
      }
      return false
    }

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, color: [number, number, number]) => {
      doc.setFillColor(...color)
      doc.roundedRect(x, y, w, h, r, r, 'F')
    }

    // ===== HEADER =====
    // Header background
    drawRoundedRect(0, 0, pageWidth, 45, 0, darkBg)

    // Gradient accent line
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(3)
    doc.line(0, 45, pageWidth, 45)

    // Logo placeholder (circle)
    doc.setFillColor(...primaryColor)
    doc.circle(margin + 8, 22, 8, 'F')
    doc.setFillColor(255, 255, 255)
    doc.circle(margin + 5, 19, 2, 'F')
    doc.circle(margin + 11, 19, 1.5, 'F')
    doc.circle(margin + 5, 25, 1.5, 'F')

    // Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.text("Efficyon", margin + 22, 20)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(148, 163, 184)
    doc.text("Cost Leak Analysis Report", margin + 22, 30)

    // Date
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184)
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    doc.text(`Generated: ${reportDate}`, pageWidth - margin - 60, 25)

    yPosition = 60

    // ===== EXECUTIVE SUMMARY =====
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text("Executive Summary", margin, yPosition)
    yPosition += 12

    if (costLeakAnalysis.overallSummary) {
      const summary = costLeakAnalysis.overallSummary
      const cardWidth = (pageWidth - margin * 2 - 15) / 4
      const cardHeight = 35

      // Card 1: Total Issues
      drawRoundedRect(margin, yPosition, cardWidth, cardHeight, 3, [241, 245, 249])
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text("TOTAL ISSUES", margin + 5, yPosition + 10)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(20)
      doc.setTextColor(15, 23, 42)
      doc.text(String(summary.totalFindings || 0), margin + 5, yPosition + 26)

      // Card 2: Potential Savings
      const card2X = margin + cardWidth + 5
      drawRoundedRect(card2X, yPosition, cardWidth, cardHeight, 3, [209, 250, 229])
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...successColor)
      doc.text("POTENTIAL SAVINGS", card2X + 5, yPosition + 10)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(5, 150, 105)
      const savingsText = `$${(summary.totalPotentialSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
      doc.text(savingsText, card2X + 5, yPosition + 26)

      // Card 3: High Priority
      const card3X = margin + (cardWidth + 5) * 2
      drawRoundedRect(card3X, yPosition, cardWidth, cardHeight, 3, [254, 226, 226])
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...highSeverity)
      doc.text("HIGH PRIORITY", card3X + 5, yPosition + 10)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(20)
      doc.setTextColor(185, 28, 28)
      doc.text(String(summary.highSeverity || 0), card3X + 5, yPosition + 26)

      // Card 4: Medium Priority
      const card4X = margin + (cardWidth + 5) * 3
      drawRoundedRect(card4X, yPosition, cardWidth, cardHeight, 3, [254, 243, 199])
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...mediumSeverity)
      doc.text("MEDIUM PRIORITY", card4X + 5, yPosition + 10)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(20)
      doc.setTextColor(180, 83, 9)
      doc.text(String(summary.mediumSeverity || 0), card4X + 5, yPosition + 26)

      yPosition += cardHeight + 15
    }

    // ===== AI INSIGHTS =====
    if (costLeakAnalysis.overallSummary && costLeakAnalysis.overallSummary.totalFindings > 0) {
      checkPageBreak(50)

      drawRoundedRect(margin, yPosition, pageWidth - margin * 2, 40, 5, [236, 254, 255])
      doc.setDrawColor(...primaryColor)
      doc.setLineWidth(0.5)
      doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 40, 5, 5, 'S')

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(...primaryColor)
      doc.text("AI Analysis Summary", margin + 8, yPosition + 12)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      const insightText = `We identified ${costLeakAnalysis.overallSummary.totalFindings} potential cost leaks that could save your company approximately $${(costLeakAnalysis.overallSummary.totalPotentialSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD. Review the detailed findings below to take action.`
      const splitInsight = doc.splitTextToSize(insightText, pageWidth - margin * 2 - 16)
      doc.text(splitInsight, margin + 8, yPosition + 24)

      yPosition += 50
    }

    // ===== DETAILED FINDINGS =====
    const findings = costLeakAnalysis.supplierInvoiceAnalysis?.findings || []

    if (findings.length > 0) {
      checkPageBreak(30)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42)
      doc.text("Detailed Findings", margin, yPosition)
      yPosition += 15

      // Group findings
      const grouped = {
        duplicates: { title: "Duplicate Payments", findings: [] as any[], color: highSeverity },
        anomalies: { title: "Price Anomalies", findings: [] as any[], color: mediumSeverity },
        overdue: { title: "Overdue & Payment Issues", findings: [] as any[], color: [249, 115, 22] as [number, number, number] },
        other: { title: "Other Findings", findings: [] as any[], color: lowSeverity },
      }

      findings.forEach((finding: any) => {
        if (finding.title?.toLowerCase().includes("duplicate")) {
          grouped.duplicates.findings.push(finding)
        } else if (finding.title?.toLowerCase().includes("price") || finding.title?.toLowerCase().includes("anomal")) {
          grouped.anomalies.findings.push(finding)
        } else if (finding.title?.toLowerCase().includes("overdue") || finding.title?.toLowerCase().includes("payment")) {
          grouped.overdue.findings.push(finding)
        } else {
          grouped.other.findings.push(finding)
        }
      })

      // Render each group
      Object.entries(grouped).forEach(([key, group]) => {
        if (group.findings.length === 0) return

        checkPageBreak(40)

        // Group header
        drawRoundedRect(margin, yPosition, pageWidth - margin * 2, 12, 3, group.color)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text(`${group.title} (${group.findings.length})`, margin + 5, yPosition + 8)
        yPosition += 16

        // Findings table
        const tableData = group.findings.map((finding: any) => [
          finding.severity?.toUpperCase() || 'N/A',
          finding.title || 'Untitled',
          finding.description?.substring(0, 80) + (finding.description?.length > 80 ? '...' : '') || 'No description',
          finding.potentialSavings ? `$${finding.potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
          finding.invoices?.length ? `${finding.invoices.length} invoice(s)` : '-'
        ])

        autoTable(doc, {
          startY: yPosition,
          head: [['Severity', 'Issue', 'Description', 'Savings', 'Related']],
          body: tableData,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: darkBg,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 65 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'center' },
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const severity = data.cell.raw as string
              if (severity === 'HIGH') {
                data.cell.styles.textColor = highSeverity
                data.cell.styles.fontStyle = 'bold'
              } else if (severity === 'MEDIUM') {
                data.cell.styles.textColor = mediumSeverity
                data.cell.styles.fontStyle = 'bold'
              } else {
                data.cell.styles.textColor = lowSeverity
              }
            }
          },
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10
      })
    }

    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      // Footer line
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

      // Footer text
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("Confidential - For internal use only", margin, pageHeight - 8)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 25, pageHeight - 8)

      // Efficyon branding
      doc.setTextColor(...primaryColor)
      doc.text("Powered by Efficyon", pageWidth / 2 - 18, pageHeight - 8)
    }

    // Save the PDF
    const fileName = `cost-leak-analysis-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success("PDF exported successfully", { description: fileName })
    setShowPdfPreview(false)
    setIsExporting(false)
  }

  // Get grouped findings for preview
  const getGroupedFindingsForPreview = () => {
    const findings = costLeakAnalysis?.supplierInvoiceAnalysis?.findings || []
    const grouped = {
      duplicates: { title: "Duplicate Payments", count: 0, color: "red" },
      anomalies: { title: "Price Anomalies", count: 0, color: "amber" },
      overdue: { title: "Overdue & Payment Issues", count: 0, color: "orange" },
      other: { title: "Other Findings", count: 0, color: "slate" },
    }

    findings.forEach((finding: any) => {
      if (finding.title?.toLowerCase().includes("duplicate")) {
        grouped.duplicates.count++
      } else if (finding.title?.toLowerCase().includes("price") || finding.title?.toLowerCase().includes("anomal")) {
        grouped.anomalies.count++
      } else if (finding.title?.toLowerCase().includes("overdue") || finding.title?.toLowerCase().includes("payment")) {
        grouped.overdue.count++
      } else {
        grouped.other.count++
      }
    })

    return Object.entries(grouped).filter(([_, g]) => g.count > 0)
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
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
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
                      onClick={fetchCostLeakAnalysis}
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
                            <h3 className="text-white font-semibold text-lg mb-2">AI Analysis Summary</h3>
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
                {costLeakAnalysis.supplierInvoiceAnalysis?.findings?.length > 0 && (
                  <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-white text-lg">Cost Leak Findings</CardTitle>
                          <Badge variant="outline" className="border-slate-600 text-gray-400">
                            {activeFindings.length} of {costLeakAnalysis.supplierInvoiceAnalysis.findings.length}
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
                                                Save ${finding.potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                {(!costLeakAnalysis.supplierInvoiceAnalysis?.findings ||
                  costLeakAnalysis.supplierInvoiceAnalysis.findings.length === 0) && (
                  <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-800/30">
                    <CardContent className="py-16 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-2">Excellent! No Cost Leaks Detected</h3>
                      <p className="text-gray-400 max-w-md mx-auto">
                        Your supplier invoices appear well-managed with no duplicate payments, unusual amounts, or concerning patterns.
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
                    Our AI will scan your supplier invoices to identify duplicate payments, price anomalies, and other cost optimization opportunities.
                  </p>
                  <Button
                    onClick={fetchCostLeakAnalysis}
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

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 text-white max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              PDF Export Preview
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Review the content that will be included in your PDF report before downloading.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
            {/* PDF Preview Content */}
            <div className="bg-white rounded-lg p-6 text-slate-900 shadow-xl">
              {/* Mock PDF Header */}
              <div className="bg-slate-900 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Efficyon</h3>
                    <p className="text-gray-400 text-sm">Cost Leak Analysis Report</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-gray-400 text-xs">
                    Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Executive Summary Preview */}
              <div className="mb-6">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  Executive Summary
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-slate-100 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Issues</p>
                    <p className="text-xl font-bold text-slate-800">
                      {costLeakAnalysis?.overallSummary?.totalFindings || 0}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Savings</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ${(costLeakAnalysis?.overallSummary?.totalPotentialSavings || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                    <p className="text-[10px] text-red-600 uppercase tracking-wider">High</p>
                    <p className="text-xl font-bold text-red-600">
                      {costLeakAnalysis?.overallSummary?.highSeverity || 0}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
                    <p className="text-[10px] text-amber-600 uppercase tracking-wider">Medium</p>
                    <p className="text-xl font-bold text-amber-600">
                      {costLeakAnalysis?.overallSummary?.mediumSeverity || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Findings Preview */}
              <div className="mb-4">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                  Detailed Findings
                </h4>
                <div className="space-y-2">
                  {getGroupedFindingsForPreview().map(([key, group]) => (
                    <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          group.color === 'red' ? 'bg-red-500' :
                          group.color === 'amber' ? 'bg-amber-500' :
                          group.color === 'orange' ? 'bg-orange-500' :
                          'bg-slate-500'
                        }`} />
                        <span className="text-sm text-slate-700">{group.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                        {group.count} item{group.count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Preview */}
              <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span>Confidential - For internal use only</span>
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
                  Executive summary with key metrics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  AI analysis summary and insights
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  All {costLeakAnalysis?.supplierInvoiceAnalysis?.findings?.length || 0} findings grouped by category
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Detailed tables with severity, descriptions, and savings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Professional formatting with Efficyon branding
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
  )
}

