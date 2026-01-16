"use client"

import { useEffect, useState, useMemo } from "react"
import { getValidSessionToken } from "@/lib/auth-helpers"
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
import { supabase } from "@/lib/supabaseClient"
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
  const [isLoading, setIsLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<(typeof customers)[number] | null>(null)
  const [customerDetails, setCustomerDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [changePlanCustomer, setChangePlanCustomer] = useState<(typeof customers)[number] | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [resetTokens, setResetTokens] = useState(true)
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const [customers, setCustomers] = useState<
    {
      id: string
      name: string // company name
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
    }[]
  >([])
  const itemsPerPage = 10

  const loadCustomers = async () => {
    try {
      setIsLoading(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

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
      const accessToken = await getValidSessionToken()

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
      { label: "Total Customers", value: totalCustomers.toString(), icon: Building2, color: "text-blue-400" },
      { label: "Active Subscriptions", value: activeCustomers.toString(), icon: CheckCircle, color: "text-green-400" },
      { label: "Monthly Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-cyan-400" },
      { label: "Avg Employees", value: avgEmployees.toString(), icon: Users, color: "text-orange-400" },
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
      const accessToken = await getValidSessionToken()

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
      const accessToken = await getValidSessionToken()

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
        free: 0,
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
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Customers</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage subscriber companies and their subscriptions</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="bg-black/80 backdrop-blur-xl border-white/10"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by company name, email, or plan..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleFilterChange()
                  }}
                  className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
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
              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
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
              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
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
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-lg sm:text-xl">
            All Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white font-semibold">Company</TableHead>
                <TableHead className="text-white font-semibold">Email</TableHead>
                <TableHead className="text-white font-semibold">Plan</TableHead>
                <TableHead className="text-white font-semibold">Employees</TableHead>
                <TableHead className="text-white font-semibold">Joined</TableHead>
                <TableHead className="text-white font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400">Loading customers...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Building2 className="w-12 h-12 text-gray-600" />
                      <p className="text-gray-400 text-sm">
                        {customers.length === 0 
                          ? "No customers found. Customers will appear here once they register."
                          : "No customers found matching your filters"}
                      </p>
                      {customers.length === 0 && (
                        <p className="text-gray-500 text-xs mt-2">
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
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {customer.avatar}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{customer.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                        {customer.emailVerified ? (
                          <span title="Email verified">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          </span>
                        ) : (
                          <span title="Email not verified">
                            <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge
                        className={
                          customer.plan === "Enterprise" || customer.planTier === "custom"
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] sm:text-xs"
                            : customer.plan === "Growth" || customer.planTier === "growth"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] sm:text-xs"
                              : customer.plan === "Startup" || customer.planTier === "startup"
                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] sm:text-xs"
                                : customer.plan === "Free" || customer.planTier === "free"
                                  ? "bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px] sm:text-xs"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px] sm:text-xs"
                        }
                      >
                        {customer.plan || "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                        <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {customer.employees}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="text-xs sm:text-sm text-gray-400">{customer.joined}</span>
                    </TableCell>
                    <TableCell className="text-right min-w-[60px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:border hover:border-cyan-500/30"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-black border-white/10 text-white"
                        >
                          {!customer.adminApproved && (
                            <DropdownMenuItem
                              className="hover:bg-white/10 text-green-400"
                              onClick={() => handleApprove(customer.id)}
                              disabled={approvingId === customer.id}
                            >
                              {approvingId === customer.id ? "Approving..." : "Approve Customer"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="hover:bg-white/10"
                            onClick={() => void openDetails(customer)}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-white/10"
                            onClick={() => {
                              setChangePlanCustomer(customer)
                              setSelectedPlan(customer.planTier || "free")
                            }}
                          >
                            Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/10">
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/10">
                            {customer.status === "active" ? "Suspend" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/10">
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 px-4 sm:px-6 border-t border-white/10">
              <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of{" "}
                {filteredCustomers.length} customers
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="border-white/10 bg-black/50 text-white disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-white/10 bg-black/50 text-white disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
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
                          <span className="text-gray-500 px-1 sm:px-2 text-xs">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={
                            currentPage === page
                              ? "bg-cyan-500 text-white hover:bg-cyan-400 h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                              : "border-white/10 bg-black/50 text-white hover:bg-white/10 h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
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
                  className="border-white/10 bg-black/50 text-white disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="border-white/10 bg-black/50 text-white disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
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
        <DialogContent className="bg-black border-white/10 text-white w-[95vw] max-w-2xl sm:w-full">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCustomer.name}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Customer details and subscription overview
                </DialogDescription>
              </DialogHeader>
              {detailsLoading && (
                <p className="text-sm text-gray-400 mt-4">Loading details...</p>
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
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {selectedCustomer.email}
                        {selectedCustomer.emailVerified ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
                            Pending verification
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan</p>
                        <p className="text-sm">{selectedCustomer.plan}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Employees
                        </p>
                        <p className="text-sm">{selectedCustomer.employees || "—"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Monthly Revenue
                        </p>
                        <p className="text-sm">
                          {formatCurrency(selectedCustomer.monthlyRevenue)}/mo
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Total Savings
                        </p>
                        <p className="text-sm text-green-400">
                          {formatCurrency(selectedCustomer.totalSavings)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                        <Badge className="bg-white/10 text-white text-[10px]">
                          {selectedCustomer.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Joined</p>
                        <p className="text-sm text-gray-300">{selectedCustomer.joined}</p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="company" className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Company Name
                        </p>
                        <p className="text-sm">
                          {customerDetails.company?.name || selectedCustomer.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Industry
                        </p>
                        <p className="text-sm">
                          {customerDetails.company?.industry || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Employees
                        </p>
                        <p className="text-sm">
                          {selectedCustomer.employees || customerDetails.company?.size || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Website
                        </p>
                        <p className="text-sm break-all">
                          {customerDetails.company?.website || "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                      <p className="text-sm">
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
                            className="flex items-center justify-between px-3 py-2 rounded-md bg-white/5 border border-white/10"
                          >
                            <div>
                              <p className="text-sm font-medium">{integration.tool_name}</p>
                              <p className="text-xs text-gray-400">
                                {integration.connection_type.toUpperCase()} •{" "}
                                {integration.environment}
                              </p>
                            </div>
                            <Badge
                              className={
                                integration.status === "connected"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]"
                              }
                            >
                              {integration.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No tools connected yet.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="alerts" className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Alert Email
                      </p>
                      <p className="text-sm">
                        {customerDetails.alerts?.email_for_alerts || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Slack Channel
                      </p>
                      <p className="text-sm">
                        {customerDetails.alerts?.slack_channel || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Frequency
                      </p>
                      <p className="text-sm">
                        {customerDetails.alerts?.frequency || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Alert Types
                      </p>
                      <p className="text-sm">
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
        <DialogContent className="bg-black border-white/10 text-white w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-cyan-400" />
              Change Plan
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Change subscription plan for {changePlanCustomer?.name || changePlanCustomer?.email}
            </DialogDescription>
          </DialogHeader>

          {changePlanCustomer && (
            <div className="space-y-6 py-4">
              {/* Current Plan */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Plan</p>
                <p className="text-white font-medium">
                  {changePlanCustomer.plan || "Free"}
                </p>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label className="text-gray-300">Select New Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 z-[200]">
                    <SelectItem value="free" className="text-white focus:bg-white/10 focus:text-white">
                      Free - $0/mo (0 tokens)
                    </SelectItem>
                    <SelectItem value="startup" className="text-white focus:bg-white/10 focus:text-white">
                      Startup - $29/mo (10 tokens)
                    </SelectItem>
                    <SelectItem value="growth" className="text-white focus:bg-white/10 focus:text-white">
                      Growth - $99/mo (50 tokens)
                    </SelectItem>
                    <SelectItem value="custom" className="text-white focus:bg-white/10 focus:text-white">
                      Enterprise - $299/mo (200 tokens)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Token Info */}
              {selectedPlan && (
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 font-medium">Token Allocation</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {selectedPlan === "free"
                      ? "Free plan includes 0 tokens (limited access)"
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
                  className="w-4 h-4 rounded border-white/10 bg-black/50 text-cyan-500 focus:ring-cyan-500"
                />
                <Label htmlFor="resetTokens" className="text-gray-300 text-sm cursor-pointer">
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
              className="border-white/10 bg-transparent text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:border-cyan-500/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || isChangingPlan}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
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
