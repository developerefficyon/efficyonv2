"use client"

import { useEffect, useState, useMemo } from "react"
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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<
    {
      id: string
      name: string
      email: string
      plan: string
      employees: number
      status: string
      joined: string
      monthlyRevenue: number
      totalSavings: number
      avatar: string
      emailVerified: boolean
      adminApproved: boolean
    }[]
  >([])
  const itemsPerPage = 10

  const loadCustomers = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const res = await fetch(`${apiBase}/api/admin/customers`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (!res.ok) {
        throw new Error("Failed to load customers")
      }
      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : raw.customers ?? []
      const mapped =
        list?.map((p: any) => {
          const name = p.full_name || p.email || "Unknown"
          const initials = name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((n: string) => n[0]?.toUpperCase())
            .join("") || "??"
          return {
            id: p.id,
            name,
            email: p.email,
            plan: "Customer",
            employees: 0,
            status: p.status || (p.admin_approved ? "active" : "pending"),
            joined: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "",
            monthlyRevenue: 0,
            totalSavings: 0,
            avatar: initials,
            emailVerified: p.email_verified ?? false,
            adminApproved: p.admin_approved ?? false,
          }
        }) ?? []
      setCustomers(mapped)
    } catch {
      // keep existing customers list on error so data doesn't disappear
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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

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

  const stats = [
    { label: "Total Customers", value: "342", icon: Building2, color: "text-blue-400" },
    { label: "Active Subscriptions", value: "328", icon: CheckCircle, color: "text-green-400" },
    { label: "Monthly Revenue", value: "$45.2K", icon: DollarSign, color: "text-cyan-400" },
    { label: "Avg Employees", value: "67", icon: Users, color: "text-orange-400" },
  ]

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
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
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white font-semibold">Company</TableHead>
                <TableHead className="text-white font-semibold">Email</TableHead>
                <TableHead className="text-white font-semibold">Plan</TableHead>
                <TableHead className="text-white font-semibold">Employees</TableHead>
                <TableHead className="text-white font-semibold">Monthly Revenue</TableHead>
                <TableHead className="text-white font-semibold">Total Savings</TableHead>
                <TableHead className="text-white font-semibold">Status</TableHead>
                <TableHead className="text-white font-semibold">Joined</TableHead>
                <TableHead className="text-white font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                    Loading customers...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                    No customers found matching your filters
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
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" title="Email verified" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" title="Email not verified" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge
                        className={
                          customer.plan === "Enterprise"
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] sm:text-xs"
                            : customer.plan === "Growth"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] sm:text-xs"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px] sm:text-xs"
                        }
                      >
                        {customer.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                        <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {customer.employees}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-white font-medium">
                        <DollarSign className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="truncate">{formatCurrency(customer.monthlyRevenue)}/mo</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="text-xs sm:text-sm text-green-400 font-medium truncate block">
                        {formatCurrency(customer.totalSavings)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <Badge
                        className={
                          customer.status === "active"
                            ? "bg-green-500/20 text-green-400 border-green-500/30 text-[10px] sm:text-xs"
                            : customer.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs"
                              : "bg-red-500/20 text-red-400 border-red-500/30 text-[10px] sm:text-xs"
                        }
                      >
                        {customer.status}
                      </Badge>
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
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
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
                          <DropdownMenuItem className="hover:bg-white/10">
                            View Details
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
    </div>
  )
}
