"use client"

import { useEffect, useState, useMemo } from "react"
import { getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Search,
  Plus,
  DollarSign,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  CheckCircle,
  Clock,
  Loader2,
  Coins,
  ArrowUpDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

// Format currency helper function (defined outside component to avoid recreation)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  type CustomerData = {
    id: string
    name: string
    email: string
    plan: string
    planTier: string
    employees: number
    status: string
    joined: string
    monthlyRevenue: number
    totalSavings: number
    avatar: string
    emailVerified: boolean
    adminApproved: boolean
    subscription?: any
  }
  const cachedCustomers = getCache<CustomerData[]>("admin-customers")
  const [isLoading, setIsLoading] = useState(!cachedCustomers)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<(typeof customers)[number] | null>(null)
  const [customerDetails, setCustomerDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [changePlanCustomer, setChangePlanCustomer] = useState<(typeof customers)[number] | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [resetTokens, setResetTokens] = useState(true)
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const [customers, setCustomers] = useState<CustomerData[]>(cachedCustomers || [])
  const itemsPerPage = 10

  const loadCustomers = async () => {
    try {
      if (!getCache("admin-customers")) {
        setIsLoading(true)
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        console.error("No access token for loading customers")
        toast.error("Authentication required", { description: "Please log in again" })
        setCustomers([])
        return
      }

      const res = await fetch(`${apiBase}/api/admin/customers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error")
        console.error("Failed to load customers:", res.status, errorText)
        throw new Error(`Failed to load customers: ${res.status}`)
      }

      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : raw.customers ?? []

      console.log(`[Customers] Loaded ${list.length} customers from API`)

      const mapped =
        list?.map((p: any) => {
          // Backend now returns 'company' (singular) instead of 'companies'
          const companyName = p.company?.name || p.full_name || p.email || "Unknown"
          const employees = p.company?.size ? parseInt(p.company.size, 10) || 0 : 0
          const initials = companyName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((n: string) => n[0]?.toUpperCase())
            .join("") || "??"

          // Extract subscription/plan information
          const subscription = p.subscription || null
          const planName = subscription?.plan_name || subscription?.plan_tier || "Free"
          const planTier = subscription?.plan_tier || "free"
          const monthlyRevenue = subscription?.plan_price_monthly_cents
            ? subscription.plan_price_monthly_cents / 100
            : 0
          const subscriptionStatus = subscription?.status || "incomplete"

          return {
            id: p.id,
            name: companyName,
            email: p.email,
            plan: planName,
            planTier: planTier,
            employees,
            status: subscriptionStatus === "active" ? "active" : subscriptionStatus === "past_due" ? "past_due" : subscriptionStatus === "canceled" ? "canceled" : "inactive",
            joined: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "",
            monthlyRevenue: monthlyRevenue,
            totalSavings: 0, // TODO: Calculate from cost leak analysis
            avatar: initials,
            emailVerified: true, // Email verification is handled by Supabase auth
            adminApproved: true, // In new schema, no admin approval needed
            subscription: subscription, // Keep full subscription object for details
          }
        }) ?? []
      setCustomers(mapped)
      setCache("admin-customers", mapped)
    } catch (error: any) {
      console.error("Error loading customers:", error)
      toast.error("Failed to load customers", {
        description: error.message || "An error occurred while loading customers.",
      })
      setCustomers([]) // Clear customers on error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCustomers()
  }, [])

  const handleApprove = async (customerId: string) => {
    if (approvingId) return // Prevent multiple simultaneous approvals

    setApprovingId(customerId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Not authenticated", {
          description: "Please log in again to approve customers.",
        })
        return
      }

      const res = await fetch(`${apiBase}/api/admin/profiles/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: customerId,
          role: "customer",
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to approve customer")
      }

      toast.success("Customer approved", {
        description: "The customer has been approved and can now access the platform.",
      })

      // Reload customers list
      await loadCustomers()
    } catch (error: any) {
      toast.error("Failed to approve customer", {
        description: error.message || "An error occurred while approving the customer.",
      })
    } finally {
      setApprovingId(null)
    }
  }

  // Calculate real stats from customers data
  const stats = useMemo(() => {
    const totalCustomers = customers.length
    const activeCustomers = customers.filter(c => c.status === "active").length
    const totalRevenue = customers.reduce((sum, c) => sum + c.monthlyRevenue, 0)
    const avgEmployees = customers.length > 0
      ? Math.round(customers.reduce((sum, c) => sum + c.employees, 0) / customers.length)
      : 0

    return [
      { label: "Total Customers", value: totalCustomers.toString(), icon: Building2, bgColor: "bg-blue-500/10", iconColor: "text-blue-400/70", delay: "delay-1" },
      { label: "Active Subscriptions", value: activeCustomers.toString(), icon: CheckCircle, bgColor: "bg-emerald-500/10", iconColor: "text-emerald-400/70", delay: "delay-2" },
      { label: "Monthly Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, bgColor: "bg-cyan-500/10", iconColor: "text-cyan-400/70", delay: "delay-3" },
      { label: "Avg Employees", value: avgEmployees.toString(), icon: Users, bgColor: "bg-orange-500/10", iconColor: "text-orange-400/70", delay: "delay-4" },
    ]
  }, [customers])

  // Get unique plans for filter
  const plans = useMemo(
    () => Array.from(new Set(customers.map((c) => c.plan))).sort(),
    [customers]
  )

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        searchQuery === "" ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.plan.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || customer.status === statusFilter
      const matchesPlan = planFilter === "all" || customer.plan === planFilter

      return matchesSearch && matchesStatus && matchesPlan
    })
  }, [customers, searchQuery, statusFilter, planFilter])

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const openDetails = async (customer: (typeof customers)[number]) => {
    setSelectedCustomer(customer)
    setCustomerDetails(null)
    setDetailsLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required", { description: "Please log in again" })
        setDetailsLoading(false)
        return
      }

      const res = await fetch(`${apiBase}/api/admin/customers/${customer.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        console.error("Failed to load customer details", await res.text())
        setDetailsLoading(false)
        return
      }

      const data = await res.json()
      setCustomerDetails(data)
    } catch (err) {
      console.error("Network error loading customer details", err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleChangePlan = async () => {
    if (!changePlanCustomer || !selectedPlan) {
      toast.error("Please select a plan")
      return
    }

    setIsChangingPlan(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required", { description: "Please log in again" })
        return
      }

      const res = await fetch(`${apiBase}/api/admin/subscription/change-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: changePlanCustomer.id,
          planTier: selectedPlan,
          resetTokens: resetTokens,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to change plan")
      }

      await res.json()

      const tokensByPlan: Record<string, number> = {
        free: 5,
        startup: 10,
        growth: 50,
        custom: 200,
      }

      toast.success("Plan changed successfully", {
        description: `${changePlanCustomer.name} is now on ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan with ${tokensByPlan[selectedPlan] || 0} tokens`,
      })

      setChangePlanCustomer(null)
      setSelectedPlan("")
      setResetTokens(true)

      // Reload customers list
      await loadCustomers()
    } catch (error: any) {
      toast.error("Failed to change plan", {
        description: error.message || "An error occurred",
      })
    } finally {
      setIsChangingPlan(false)
    }
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="animate-slide-up delay-0">
          <p className="text-[13px] text-white/30 font-medium mb-1">Client Management</p>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
            Customer <span className="italic text-emerald-400/90">Directory</span>
          </h2>
          <p className="text-[14px] text-white/35 mt-1">Manage subscriber companies and their subscriptions</p>
        </div>
        <div className="animate-slide-up delay-1">
          <Button className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className={`bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up ${stat.delay}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                  </div>
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-3xl font-semibold text-white tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-3">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input
                  placeholder="Search by company name, email, or plan..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleFilterChange()
                  }}
                  className="pl-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={planFilter}
              onValueChange={(value) => {
                setPlanFilter(value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                <SelectItem value="all">All Plans</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-4">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white/40 text-[11px] uppercase tracking-wider font-medium">
            All Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Company</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Email</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Plan</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Employees</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Joined</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/[0.04] animate-pulse" />
                          <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-5 w-16 bg-white/[0.04] rounded-full animate-pulse" /></TableCell>
                      <TableCell><div className="h-3 w-10 bg-white/[0.04] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" /></TableCell>
                      <TableCell className="text-right"><div className="h-6 w-6 bg-white/[0.04] rounded animate-pulse ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Building2 className="w-12 h-12 text-white/10" />
                      <p className="text-white/30 text-[13px]">
                        {customers.length === 0
                          ? "No customers found. Customers will appear here once they register."
                          : "No customers found matching your filters"}
                      </p>
                      {customers.length === 0 && (
                        <p className="text-white/20 text-[11px] mt-2">
                          Try registering a new user account to see it appear here.
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400/80 to-teal-600/80 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">
                            {customer.avatar}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white/80">{customer.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex items-center gap-2 text-[12px] text-white/40">
                        <Mail className="w-3 h-3 text-white/20 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                        {customer.emailVerified ? (
                          <span title="Email verified">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                          </span>
                        ) : (
                          <span title="Email not verified">
                            <Clock className="w-3.5 h-3.5 text-yellow-400/60 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge
                        className={
                          customer.plan === "Enterprise" || customer.planTier === "custom"
                            ? "bg-purple-500/10 text-purple-400/80 border-purple-500/15 text-[10px]"
                            : customer.plan === "Growth" || customer.planTier === "growth"
                              ? "bg-blue-500/10 text-blue-400/80 border-blue-500/15 text-[10px]"
                              : customer.plan === "Startup" || customer.planTier === "startup"
                                ? "bg-cyan-500/10 text-cyan-400/80 border-cyan-500/15 text-[10px]"
                                : customer.plan === "Free" || customer.planTier === "free"
                                  ? "bg-white/[0.04] text-white/40 border-white/[0.08] text-[10px]"
                                  : "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[10px]"
                        }
                      >
                        {customer.plan || "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <div className="flex items-center gap-2 text-[13px] text-white/40">
                        <Users className="w-3 h-3 text-white/20 flex-shrink-0" />
                        {customer.employees}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="text-[11px] text-white/20">{customer.joined}</span>
                    </TableCell>
                    <TableCell className="text-right min-w-[60px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#0a0a0a] border-white/[0.08] text-white"
                        >
                          {!customer.adminApproved && (
                            <DropdownMenuItem
                              className="hover:bg-white/[0.04] text-emerald-400"
                              onClick={() => handleApprove(customer.id)}
                              disabled={approvingId === customer.id}
                            >
                              {approvingId === customer.id ? "Approving..." : "Approve Customer"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="hover:bg-white/[0.04]"
                            onClick={() => void openDetails(customer)}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-white/[0.04]"
                            onClick={() => {
                              setChangePlanCustomer(customer)
                              setSelectedPlan(customer.planTier || "free")
                            }}
                          >
                            Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/[0.04]">
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/[0.04]">
                            {customer.status === "active" ? "Suspend" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/[0.04]">
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400/80 hover:bg-red-500/10">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 px-4 sm:px-6 border-t border-white/[0.06]">
              <div className="text-[11px] text-white/30 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of{" "}
                {filteredCustomers.length} customers
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center gap-1">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-white/20 px-1 sm:px-2 text-xs">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={
                            currentPage === page
                              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                              : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.04] h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                          }
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Customer details dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white w-[95vw] max-w-2xl sm:w-full">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white/90">{selectedCustomer.name}</DialogTitle>
                <DialogDescription className="text-white/30">
                  Customer details and subscription overview
                </DialogDescription>
              </DialogHeader>
              {detailsLoading && (
                <p className="text-[13px] text-white/30 mt-4">Loading details...</p>
              )}
              {!detailsLoading && customerDetails && (
                <Tabs defaultValue="summary" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="tools">Tools</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="mt-4 space-y-4">
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-[13px] flex items-center gap-2 text-white/70">
                        <Mail className="w-3 h-3 text-white/30" />
                        {selectedCustomer.email}
                        {selectedCustomer.emailVerified ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[10px]">
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-400/80 border-yellow-500/15 text-[10px]">
                            Pending verification
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Plan</p>
                        <p className="text-[13px] text-white/70">{selectedCustomer.plan}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Employees
                        </p>
                        <p className="text-[13px] text-white/70">{selectedCustomer.employees || "—"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Monthly Revenue
                        </p>
                        <p className="text-[13px] text-white/70">
                          {formatCurrency(selectedCustomer.monthlyRevenue)}/mo
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Total Savings
                        </p>
                        <p className="text-[13px] text-emerald-400/80">
                          {formatCurrency(selectedCustomer.totalSavings)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Status</p>
                        <Badge className="bg-white/[0.04] text-white/60 border-white/[0.08] text-[10px]">
                          {selectedCustomer.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Joined</p>
                        <p className="text-[11px] text-white/20">{selectedCustomer.joined}</p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="company" className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Company Name
                        </p>
                        <p className="text-[13px] text-white/70">
                          {customerDetails.company?.name || selectedCustomer.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Industry
                        </p>
                        <p className="text-[13px] text-white/70">
                          {customerDetails.company?.industry || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Employees
                        </p>
                        <p className="text-[13px] text-white/70">
                          {selectedCustomer.employees || customerDetails.company?.size || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                          Website
                        </p>
                        <p className="text-[13px] text-white/70 break-all">
                          {customerDetails.company?.website || "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-[13px] text-white/70">
                        {customerDetails.company?.phone || "—"}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="tools" className="mt-4 space-y-3">
                    {customerDetails.integrations?.length ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {customerDetails.integrations.map((integration: any) => (
                          <div
                            key={integration.id}
                            className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.02] border border-white/[0.06]"
                          >
                            <div>
                              <p className="text-[13px] font-medium text-white/70">{integration.tool_name}</p>
                              <p className="text-[11px] text-white/30">
                                {integration.connection_type.toUpperCase()} •{" "}
                                {integration.environment}
                              </p>
                            </div>
                            <Badge
                              className={
                                integration.status === "connected"
                                  ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[10px]"
                                  : "bg-yellow-500/10 text-yellow-400/80 border-yellow-500/15 text-[10px]"
                              }
                            >
                              {integration.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-white/30">No tools connected yet.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="alerts" className="mt-4 space-y-3">
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                        Alert Email
                      </p>
                      <p className="text-[13px] text-white/70">
                        {customerDetails.alerts?.email_for_alerts || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                        Slack Channel
                      </p>
                      <p className="text-[13px] text-white/70">
                        {customerDetails.alerts?.slack_channel || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                        Frequency
                      </p>
                      <p className="text-[13px] text-white/70">
                        {customerDetails.alerts?.frequency || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
                        Alert Types
                      </p>
                      <p className="text-[13px] text-white/70">
                        {customerDetails.alerts?.alert_types
                          ? Object.entries(customerDetails.alerts.alert_types)
                              .filter(([, enabled]: any) => enabled)
                              .map(([key]: any) => key)
                              .join(", ") || "—"
                          : "—"}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Plan Modal */}
      <Dialog open={!!changePlanCustomer} onOpenChange={(open) => !open && setChangePlanCustomer(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white/90">
              <ArrowUpDown className="w-5 h-5 text-emerald-400/70" />
              Change Plan
            </DialogTitle>
            <DialogDescription className="text-white/30">
              Change subscription plan for {changePlanCustomer?.name || changePlanCustomer?.email}
            </DialogDescription>
          </DialogHeader>

          {changePlanCustomer && (
            <div className="space-y-6 py-4">
              {/* Current Plan */}
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Current Plan</p>
                <p className="text-white/80 font-medium">
                  {changePlanCustomer.plan || "Free"}
                </p>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label className="text-white/40 text-[12px]">Select New Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-white/[0.08] z-[200]">
                    <SelectItem value="free" className="text-white focus:bg-white/[0.04] focus:text-white">
                      Free - $0/mo (5 tokens)
                    </SelectItem>
                    <SelectItem value="startup" className="text-white focus:bg-white/[0.04] focus:text-white">
                      Startup - $39/mo (10 tokens)
                    </SelectItem>
                    <SelectItem value="growth" className="text-white focus:bg-white/[0.04] focus:text-white">
                      Growth - $119/mo (50 tokens)
                    </SelectItem>
                    <SelectItem value="custom" className="text-white focus:bg-white/[0.04] focus:text-white">
                      Enterprise - Custom (200 tokens)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Token Info */}
              {selectedPlan && (
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-emerald-400/70" />
                    <span className="text-emerald-400/80 font-medium text-[13px]">Token Allocation</span>
                  </div>
                  <p className="text-[13px] text-white/40">
                    {selectedPlan === "free"
                      ? "Free plan includes 5 tokens (trial)"
                      : selectedPlan === "startup"
                        ? "Startup plan includes 10 tokens per month"
                        : selectedPlan === "growth"
                          ? "Growth plan includes 50 tokens per month"
                          : "Enterprise plan includes 200 tokens per month"}
                  </p>
                </div>
              )}

              {/* Reset Tokens Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resetTokens"
                  checked={resetTokens}
                  onChange={(e) => setResetTokens(e.target.checked)}
                  className="w-4 h-4 rounded border-white/[0.08] bg-white/[0.03] text-emerald-500 focus:ring-emerald-500"
                />
                <Label htmlFor="resetTokens" className="text-white/40 text-[13px] cursor-pointer">
                  Reset tokens to new plan allocation
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePlanCustomer(null)
                setSelectedPlan("")
                setResetTokens(true)
              }}
              className="border-white/[0.08] bg-transparent text-white/60 hover:bg-white/[0.04] hover:text-white/80"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || isChangingPlan}
              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20"
            >
              {isChangingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Change Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
