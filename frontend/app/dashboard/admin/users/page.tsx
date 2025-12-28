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
import { supabase } from "@/lib/supabaseClient"

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
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
  >([])
  const itemsPerPage = 10

  // Helper function to get a fresh access token
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        // Try to refresh the session
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession()

        if (refreshError || !refreshedSession) {
          console.error("Failed to refresh session:", refreshError)
          return null
        }

        return refreshedSession.access_token
      }

      // Check if token is close to expiring (within 5 minutes)
      if (session.expires_at) {
        const expiresAt = session.expires_at * 1000 // Convert to milliseconds
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (expiresAt - now < fiveMinutes) {
          // Token is expiring soon, refresh it
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession()

          if (refreshError || !refreshedSession) {
            console.error("Failed to refresh expiring session:", refreshError)
            return session.access_token // Return current token as fallback
          }

          return refreshedSession.access_token
        }
      }

      return session.access_token
    } catch (error) {
      console.error("Error getting access token:", error)
      return null
    }
  }

  const loadEmployees = async () => {
    try {
      setIsLoading(true)
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
    } catch (error) {
      console.error("Error loading employees:", error)
      // keep existing employees list on error so data doesn't disappear
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEmployees()

    // Listen to auth state changes to reload data when session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Reload employees when user signs in or token is refreshed
        await loadEmployees()
      } else if (event === "SIGNED_OUT") {
        // Clear employees when user signs out
        setEmployees([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
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

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Users</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage admins and internal users</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or role..."
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
              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
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
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-lg sm:text-xl">
            All Users ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">Email</TableHead>
                <TableHead className="text-white font-semibold">Role</TableHead>
                <TableHead className="text-white font-semibold">Status</TableHead>
                <TableHead className="text-white font-semibold">Joined</TableHead>
                <TableHead className="text-white font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Loading employees...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    No users found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {employee.avatar}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{employee.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                        {employee.emailVerified ? (
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
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                        <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{employee.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <Badge
                        className={
                          employee.status === "active"
                            ? "bg-green-500/20 text-green-400 border-green-500/30 text-[10px] sm:text-xs"
                            : "bg-red-500/20 text-red-400 border-red-500/30 text-[10px] sm:text-xs"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="text-xs sm:text-sm text-gray-400">{employee.joined}</span>
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
                          <DropdownMenuItem className="hover:bg-white/10">
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/10">
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/10">
                            {employee.status === "active" ? "Deactivate" : "Activate"}
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of{" "}
                {filteredEmployees.length} employees
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
