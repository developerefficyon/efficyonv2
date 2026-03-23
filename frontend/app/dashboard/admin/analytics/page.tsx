"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Loader2,
  BarChart3,
  Zap,
  UserPlus,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { toast } from "sonner"

interface AnalyticsData {
  overview: {
    mrr: number
    activeCustomers: number
    avgCustomerValue: number
    churnRate: number
    retentionRate: number
  }
  revenueByPlan: {
    plan_tier: string
    plan_name: string
    customers: number
    revenue: number
    percentage: number
  }[]
  growthTrend: {
    month: string
    customers: number
    revenue: number
  }[]
  topCustomers: {
    name: string
    email: string
    plan: string
    revenue: number
  }[]
  metrics: {
    newCustomersThisMonth: number
    tokenUsageRate: number
  }
}

const planColors: Record<string, string> = {
  free: "from-gray-500 to-gray-600",
  startup: "from-blue-500 to-blue-600",
  growth: "from-cyan-500 to-blue-500",
  custom: "from-purple-500 to-indigo-600",
}

const planBadgeColors: Record<string, string> = {
  free: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  startup: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  growth: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  custom: "bg-purple-500/20 text-purple-400 border-purple-500/30",
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function AdminAnalyticsPage() {
  const cachedData = getCache<AnalyticsData>("admin-analytics")
  const [data, setData] = useState<AnalyticsData | null>(cachedData || null)
  const [isLoading, setIsLoading] = useState(!cachedData)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!getCache("admin-analytics")) {
          setIsLoading(true)
        }
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const accessToken = await getBackendToken()

        if (!accessToken) {
          toast.error("Session expired", { description: "Please log in again" })
          return
        }

        const res = await fetch(`${apiBase}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
          let errorMessage = `Failed to fetch analytics: ${res.status}`
          try {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = `Failed to fetch analytics: ${res.status} ${res.statusText}`
          }
          throw new Error(errorMessage)
        }

        const result: AnalyticsData = await res.json()
        setData(result)
        setCache("admin-analytics", result)
      } catch (error) {
        console.error("Error fetching analytics:", error)
        toast.error("Failed to load analytics", {
          description: error instanceof Error ? error.message : "An error occurred",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const overview = data?.overview
  const revenueByPlan = data?.revenueByPlan || []
  const growthTrend = data?.growthTrend || []
  const topCustomers = data?.topCustomers || []
  const metrics = data?.metrics

  const overviewStats = [
    {
      title: "Monthly Revenue",
      value: overview ? formatCurrency(overview.mrr) : "$0",
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Active Customers",
      value: overview ? overview.activeCustomers.toString() : "0",
      icon: Users,
      color: "blue",
    },
    {
      title: "Avg Customer Value",
      value: overview ? `$${overview.avgCustomerValue.toFixed(0)}` : "$0",
      icon: TrendingUp,
      color: "cyan",
    },
    {
      title: "Churn Rate",
      value: overview ? `${overview.churnRate}%` : "0%",
      icon: TrendingDown,
      color: overview && overview.churnRate > 5 ? "red" : "green",
    },
  ]

  // Compute max values for growth trend bars
  const maxCustomers = Math.max(...growthTrend.map((g) => g.customers), 1)
  const maxRevenue = Math.max(...growthTrend.map((g) => g.revenue), 1)

  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-green-500/10", text: "text-green-400/70" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400/70" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400/70" },
    red: { bg: "bg-red-500/10", text: "text-red-400/70" },
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="animate-slide-up delay-0">
        <p className="text-[13px] text-white/30 font-medium mb-1">Performance Insights</p>
        <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
          Platform <span className="italic text-blue-400/90">Analytics</span>
        </h2>
        <p className="text-[14px] text-white/35 mt-1">Comprehensive insights and performance metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up">
                <CardContent className="p-5">
                  <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse mb-3" />
                  <div className="h-8 w-20 bg-white/[0.04] rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          : overviewStats.map((stat, i) => {
              const Icon = stat.icon
              const colors = colorMap[stat.color] || colorMap.cyan
              return (
                <Card key={stat.title} className={`bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-${i + 1}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-7 h-7 rounded-md ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                      </div>
                      <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{stat.title}</span>
                    </div>
                    <p className="text-3xl font-semibold text-white tracking-tight">{stat.value}</p>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
          <CardHeader>
            <CardTitle className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Revenue by Plan</CardTitle>
            <p className="text-[11px] text-white/25">Monthly recurring revenue breakdown</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 w-full bg-white/[0.02] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : revenueByPlan.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/25">No subscription data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {revenueByPlan.map((item) => (
                  <div key={item.plan_tier} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 font-medium">{item.plan_name}</span>
                        <span className="text-white/40">({item.customers} customers)</span>
                      </div>
                      <span className="text-white/80 font-semibold">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="w-full bg-white/[0.03] rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${planColors[item.plan_tier] || "from-cyan-500 to-blue-500"} h-2 rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/25">{item.percentage}% of total revenue</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Trend */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
          <CardHeader>
            <CardTitle className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Growth Trend</CardTitle>
            <p className="text-[11px] text-white/25">6-month customer and revenue growth</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 w-full bg-white/[0.02] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : growthTrend.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/25">No growth data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {growthTrend.map((metric) => (
                  <div key={metric.month} className="flex items-center gap-4">
                    <div className="w-12 text-[12px] text-white/30">{metric.month}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Customers</span>
                        <span className="text-white/80">{metric.customers}</span>
                      </div>
                      <div className="w-full bg-white/[0.03] rounded-full h-1.5">
                        <div
                          className="bg-blue-500/80 h-1.5 rounded-full"
                          style={{ width: `${(metric.customers / maxCustomers) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Revenue</span>
                        <span className="text-white/80">{formatCurrency(metric.revenue)}</span>
                      </div>
                      <div className="w-full bg-white/[0.03] rounded-full h-1.5">
                        <div
                          className="bg-green-500/80 h-1.5 rounded-full"
                          style={{ width: `${(metric.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
        <CardHeader>
          <CardTitle className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Top Customers by Revenue</CardTitle>
          <p className="text-[11px] text-white/25">Highest value active customers</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full bg-white/[0.02] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : topCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-white/25">No customer data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/80 to-teal-600/80 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/80 truncate">{customer.name}</p>
                    <div className="flex items-center gap-2 sm:gap-4 text-white/40 mt-1 flex-wrap">
                      <span className="text-[12px] truncate">{customer.email}</span>
                      <Badge className={planBadgeColors[customer.plan.toLowerCase()] || "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"}>
                        {customer.plan}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-[13px] font-medium text-white/60">${customer.revenue}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-cyan-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Customer Acquisition</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-white tracking-tight mb-1">
                  {metrics?.newCustomersThisMonth ?? 0}
                </p>
                <p className="text-[11px] text-white/25">New customers this month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-yellow-500/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-yellow-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Token Usage</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-white tracking-tight mb-1">
                  {metrics?.tokenUsageRate ?? 0}%
                </p>
                <p className="text-[11px] text-white/25">Overall token utilization</p>
                <div className="w-full bg-white/[0.04] rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      (metrics?.tokenUsageRate ?? 0) > 80
                        ? "bg-red-500"
                        : (metrics?.tokenUsageRate ?? 0) > 50
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${metrics?.tokenUsageRate ?? 0}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-green-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Retention Rate</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-white tracking-tight mb-1">
                  {overview?.retentionRate ?? 100}%
                </p>
                <p className="text-[11px] text-white/25">Monthly retention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
