"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Users,
  Search,
  Plus,
  Shield,
  Mail,
  Briefcase,
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
import { getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const cachedEmployees = getCache<{
    id: string
    name: string
    email: string
    role: string
    department: string
    status: string
    joined: string
    avatar: string
    emailVerified: boolean
  }[]>("admin-employees")
  const [isLoading, setIsLoading] = useState(!cachedEmployees)
  const [employees, setEmployees] = useState<
    {
      id: string
      name: string
      email: string
      role: string
      department: string
      status: string
      joined: string
      avatar: string
      emailVerified: boolean
    }[]
  >(cachedEmployees || [])
  const itemsPerPage = 10

  // Helper function to get a fresh access token
  const getAccessToken = async (): Promise<string | null> => {
    return await getBackendToken()
  }

  const loadEmployees = async () => {
    try {
      if (!getCache("admin-employees")) {
        setIsLoading(true)
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getAccessToken()

      if (!accessToken) {
        throw new Error("No valid session. Please log in again.")
      }

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired, try to refresh and retry once
          const refreshedToken = await getAccessToken()
          if (!refreshedToken) {
            throw new Error("Session expired. Please log in again.")
          }

          const retryRes = await fetch(`${apiBase}/api/admin/employees`, {
            headers: { Authorization: `Bearer ${refreshedToken}` },
          })

          if (!retryRes.ok) {
            throw new Error("Failed to load employees after token refresh")
          }

          const raw = await retryRes.json()
          const list = Array.isArray(raw) ? raw : raw.employees ?? []
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
                role: p.role || "Employee",
                department: "—",
                status: p.status || (p.admin_approved ? "active" : "inactive"),
                joined: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "",
                avatar: initials,
                emailVerified: p.email_verified ?? false,
              }
            }) ?? []
          setEmployees(mapped)
          setCache("admin-employees", mapped)
          return
        }
        throw new Error("Failed to load employees")
      }

      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : raw.employees ?? []
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
            role: p.role || "Employee",
            department: "—",
            status: p.status || (p.admin_approved ? "active" : "inactive"),
            joined: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "",
            avatar: initials,
            emailVerified: p.email_verified ?? false,
          }
        }) ?? []
      setEmployees(mapped)
      setCache("admin-employees", mapped)
    } catch (error) {
      console.error("Error loading employees:", error)
      // keep existing employees list on error so data doesn't disappear
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEmployees()
  }, [])

  // Get unique roles for filters
  const roles = useMemo(
    () => Array.from(new Set(employees.map((e) => e.role))).sort(),
    [employees]
  )

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        searchQuery === "" ||
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || employee.status === statusFilter
      const matchesRole = roleFilter === "all" || employee.role === roleFilter

      return matchesSearch && matchesStatus && matchesRole
    })
  }, [employees, searchQuery, statusFilter, roleFilter])

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // Stats
  const activeCount = employees.filter((e) => e.status === "active").length
  const adminCount = employees.filter((e) => e.role.toLowerCase() === "admin").length

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up delay-0">
        <div>
          <p className="text-[13px] text-white/30 font-medium mb-1">Team Management</p>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
            Internal <span className="italic text-violet-400/90">Users</span>
          </h2>
          <p className="text-[14px] text-white/35 mt-1">Manage admins and internal team members</p>
        </div>
        <Button className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white/80 rounded-lg h-8 text-[12px] gap-1.5 px-3 w-fit">
          <Plus className="w-3.5 h-3.5" />
          Add User
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up delay-1">
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-violet-400/80" />
              </div>
              <div>
                <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Total Users</p>
                <p className="text-xl font-semibold text-white/90 mt-0.5">
                  {isLoading ? (
                    <span className="inline-block h-5 w-10 bg-white/[0.04] rounded animate-pulse" />
                  ) : (
                    employees.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400/80" />
              </div>
              <div>
                <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Active</p>
                <p className="text-xl font-semibold text-white/90 mt-0.5">
                  {isLoading ? (
                    <span className="inline-block h-5 w-10 bg-white/[0.04] rounded animate-pulse" />
                  ) : (
                    activeCount
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-amber-400/80" />
              </div>
              <div>
                <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Admins</p>
                <p className="text-xl font-semibold text-white/90 mt-0.5">
                  {isLoading ? (
                    <span className="inline-block h-5 w-10 bg-white/[0.04] rounded animate-pulse" />
                  ) : (
                    adminCount
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-2">
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleFilterChange()
                  }}
                  className="pl-10 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20"
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
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/80">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/80">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-3">
        <CardContent className="p-5 sm:p-6">
          {/* Inline section header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-violet-400/80" />
              </div>
              <div>
                <p className="text-[12px] text-white/40 font-medium uppercase tracking-wider">All Users</p>
                <p className="text-[13px] text-white/50 mt-0.5">{filteredEmployees.length} members found</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Name</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Email</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Role</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Status</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Joined</TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      <TableCell><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" /><div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" /></div></TableCell>
                      <TableCell><div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-5 w-12 bg-white/[0.04] rounded-full animate-pulse" /></TableCell>
                      <TableCell><div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!isLoading && paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-white/25">
                    No users found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400/80 to-violet-600/80 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-semibold">
                            {employee.avatar}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white/80">{employee.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex items-center gap-2 text-[12px] text-white/40">
                        <Mail className="w-3 h-3 text-white/20 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                        {employee.emailVerified ? (
                          <span title="Email verified">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" />
                          </span>
                        ) : (
                          <span title="Email not verified">
                            <Clock className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2 text-[12px] text-white/40">
                        <Briefcase className="w-3 h-3 text-white/20 flex-shrink-0" />
                        <span className="truncate">{employee.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <Badge
                        className={
                          employee.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[10px]"
                            : "bg-red-500/10 text-red-400/80 border-red-500/15 text-[10px]"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="text-[11px] text-white/20">{employee.joined}</span>
                    </TableCell>
                    <TableCell className="text-right min-w-[60px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-white/20 hover:text-white/50 hover:bg-white/[0.04]"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#0a0a0a] border-white/[0.08] text-white/70"
                        >
                          <DropdownMenuItem className="hover:bg-white/[0.04] text-[12px]">
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/[0.04] text-[12px]">
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/[0.04] text-[12px]">
                            {employee.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400/80 hover:bg-red-500/10 text-[12px]">
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-5 border-t border-white/[0.06]">
              <div className="text-[12px] text-white/30 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of{" "}
                {filteredEmployees.length} employees
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronsLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
                          <span className="text-white/20 px-1 sm:px-2 text-[11px]">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={
                            currentPage === page
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/30 h-7 w-7 sm:h-8 sm:w-8 p-0 text-[11px] sm:text-[12px]"
                              : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.04] h-7 w-7 sm:h-8 sm:w-8 p-0 text-[11px] sm:text-[12px]"
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
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="border-white/[0.06] bg-white/[0.02] text-white/60 disabled:opacity-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronsRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
