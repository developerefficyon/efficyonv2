"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Building2,
  DollarSign,
  CreditCard,
  Coins,
  Loader2,
  Mail,
} from "lucide-react"

interface DashboardData {
  stats: {
    totalEmployees: number
    totalCustomers: number
    activeSubscriptions: number
    mrr: number
    planDistribution: Record<string, number>
    tokenStats: {
      totalAllocated: number
      totalUsed: number
      usagePercent: number
    }
  }
  recentEmployees: {
    id: string
    email: string
    full_name: string
    role: string
    created_at: string
  }[]
  recentCustomers: {
    id: string
    email: string
    full_name: string
    company_name: string | null
    plan_tier: string
    created_at: string
  }[]
}

const planColors: Record<string, string> = {
  free: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  startup: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  growth: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  custom: "bg-purple-500/20 text-purple-400 border-purple-500/30",
}

const planNames: Record<string, string> = {
  free: "Free",
  startup: "Startup",
  growth: "Growth",
  custom: "Enterprise",
}

const planBarColors: Record<string, string> = {
  free: "bg-gray-500",
  startup: "bg-cyan-500",
  growth: "bg-blue-500",
  custom: "bg-purple-500",
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`
  }
  return `$${amount.toFixed(0)}`
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getInitials(name: string | null, email: string): string {
  const source = name || email
  return source
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join("") || "??"
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const cached = getCache<DashboardData>("admin-dashboard-summary")
  const [data, setData] = useState<DashboardData | null>(cached)
  const [isLoading, setIsLoading] = useState(!cached)

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!getCache("admin-dashboard-summary")) {
        setIsLoading(true)
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const accessToken = await getBackendToken()
        if (!accessToken) return

        const res = await fetch(`${apiBase}/api/admin/dashboard/summary`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (res.ok) {
          const result = await res.json()
          setData(result)
          setCache("admin-dashboard-summary", result)
        }
      } catch (error) {
        console.error("Failed to fetch admin dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.role === "admin") {
      fetchDashboard()
    }
  }, [user])

  if (user?.role !== "admin") {
    return null
  }

  const stats = data?.stats
  const recentEmployees = data?.recentEmployees || []
  const recentCustomers = data?.recentCustomers || []

  const statCards = [
    {
      title: "Employees",
      value: stats?.totalEmployees?.toString() || "0",
      icon: Users,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20 border-cyan-500/30",
    },
    {
      title: "Customers",
      value: stats?.totalCustomers?.toString() || "0",
      icon: Building2,
      color: "text-green-400",
      bgColor: "bg-green-500/20 border-green-500/30",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions?.toString() || "0",
      icon: CreditCard,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20 border-blue-500/30",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(stats?.mrr || 0),
      icon: DollarSign,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20 border-emerald-500/30",
    },
  ]

  // Plan distribution for bar chart
  const planDist = stats?.planDistribution || {}
  const totalSubs = Object.values(planDist).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Admin Dashboard
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          Overview of employees, customers, and platform metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="bg-black/80 backdrop-blur-xl border-white/10"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Employees + Recent Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Employees</CardTitle>
            <p className="text-sm text-gray-400">Latest admin team members</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : recentEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No employees found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {getInitials(employee.full_name, employee.email)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {employee.full_name || employee.email}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                        {employee.role}
                      </Badge>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {timeAgo(employee.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/dashboard/admin/users"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all employees →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Customers</CardTitle>
            <p className="text-sm text-gray-400">Latest registered subscribers</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : recentCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No customers found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {getInitials(customer.company_name || customer.full_name, customer.email)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {customer.company_name || customer.full_name || customer.email}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={planColors[customer.plan_tier] || planColors.free + " text-[10px]"}>
                        {planNames[customer.plan_tier] || "Free"}
                      </Badge>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {timeAgo(customer.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/dashboard/admin/customers"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all customers →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution + Token Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Plan Distribution
            </CardTitle>
            <p className="text-sm text-gray-400">Subscriptions by plan tier</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : totalSubs === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No subscriptions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(["free", "startup", "growth", "custom"] as const).map((tier) => {
                  const count = planDist[tier] || 0
                  const percent = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0
                  return (
                    <div key={tier} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={`${planColors[tier]} text-[10px]`}>
                            {planNames[tier]}
                          </Badge>
                        </div>
                        <span className="text-gray-300 font-medium">
                          {count} <span className="text-gray-500 text-xs">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${planBarColors[tier]}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white font-semibold">{totalSubs} subscriptions</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token Overview */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-400" />
              Token Overview
            </CardTitle>
            <p className="text-sm text-gray-400">Platform-wide token allocation & usage</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Usage Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Overall Usage</span>
                    <span className={`font-semibold ${
                      (stats?.tokenStats.usagePercent || 0) >= 80
                        ? "text-red-400"
                        : (stats?.tokenStats.usagePercent || 0) >= 50
                          ? "text-yellow-400"
                          : "text-green-400"
                    }`}>
                      {stats?.tokenStats.usagePercent || 0}%
                    </span>
                  </div>
                  <Progress
                    value={stats?.tokenStats.usagePercent || 0}
                    className="h-3 bg-white/10"
                  />
                </div>

                {/* Token Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                    <p className="text-lg font-bold text-white">
                      {(stats?.tokenStats.totalAllocated || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Allocated</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                    <p className="text-lg font-bold text-cyan-400">
                      {(stats?.tokenStats.totalUsed || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Used</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                    <p className="text-lg font-bold text-green-400">
                      {((stats?.tokenStats.totalAllocated || 0) - (stats?.tokenStats.totalUsed || 0)).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Available</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <Link
                    href="/dashboard/admin/tokens"
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Manage tokens →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
