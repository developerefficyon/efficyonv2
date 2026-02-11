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
      color: "text-green-400",
    },
    {
      title: "Active Customers",
      value: overview ? overview.activeCustomers.toString() : "0",
      icon: Users,
      color: "text-blue-400",
    },
    {
      title: "Avg Customer Value",
      value: overview ? `$${overview.avgCustomerValue.toFixed(0)}` : "$0",
      icon: TrendingUp,
      color: "text-cyan-400",
    },
    {
      title: "Churn Rate",
      value: overview ? `${overview.churnRate}%` : "0%",
      icon: TrendingDown,
      color: overview && overview.churnRate > 5 ? "text-red-400" : "text-green-400",
    },
  ]

  // Compute max values for growth trend bars
  const maxCustomers = Math.max(...growthTrend.map((g) => g.customers), 1)
  const maxRevenue = Math.max(...growthTrend.map((g) => g.revenue), 1)

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Analytics</h2>
        <p className="text-sm sm:text-base text-gray-400">Comprehensive insights and performance metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-2">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          : overviewStats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title} className="bg-black/80 backdrop-blur-xl border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">{stat.title}</CardTitle>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue by Plan</CardTitle>
            <p className="text-sm text-gray-400">Monthly recurring revenue breakdown</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : revenueByPlan.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No subscription data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {revenueByPlan.map((item) => (
                  <div key={item.plan_tier} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{item.plan_name}</span>
                        <span className="text-gray-400">({item.customers} customers)</span>
                      </div>
                      <span className="text-white font-semibold">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${planColors[item.plan_tier] || "from-cyan-500 to-blue-500"} h-2 rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{item.percentage}% of total revenue</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Trend */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Growth Trend</CardTitle>
            <p className="text-sm text-gray-400">6-month customer and revenue growth</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : growthTrend.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No growth data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {growthTrend.map((metric) => (
                  <div key={metric.month} className="flex items-center gap-4">
                    <div className="w-12 text-sm text-gray-400">{metric.month}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Customers</span>
                        <span className="text-white">{metric.customers}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${(metric.customers / maxCustomers) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Revenue</span>
                        <span className="text-white">{formatCurrency(metric.revenue)}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
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
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Customers by Revenue</CardTitle>
          <p className="text-sm text-gray-400">Highest value active customers</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : topCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No customer data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{customer.name}</p>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                      <span className="truncate">{customer.email}</span>
                      <Badge className={planBadgeColors[customer.plan.toLowerCase()] || "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"}>
                        {customer.plan}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">${customer.revenue}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Customer Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white mb-1">
                  {metrics?.newCustomersThisMonth ?? 0}
                </div>
                <p className="text-xs text-gray-400">New customers this month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white mb-1">
                  {metrics?.tokenUsageRate ?? 0}%
                </div>
                <p className="text-xs text-gray-400">Overall token utilization</p>
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
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

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Retention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white mb-1">
                  {overview?.retentionRate ?? 100}%
                </div>
                <p className="text-xs text-gray-400">Monthly retention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
