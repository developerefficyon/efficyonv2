"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  CreditCard,
  Calendar,
  Loader2,
} from "lucide-react"
import { getValidSessionToken } from "@/lib/auth-helpers"
import { toast } from "sonner"

interface Subscription {
  id: string
  plan_tier: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  amount_cents: number
  currency: string
  plan_catalog?: {
    name: string
    price_monthly_cents: number
    included_tokens: number
    max_integrations: number
    max_team_members: number
    features: string[]
  }
  token_balance?: {
    total_tokens: number
    used_tokens: number
  }
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const isFetchingRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  const fetchSubscription = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      console.log("[AdminDashboard] Already fetching subscription, skipping duplicate call")
      return
    }

    if (!user || user.role !== "admin") {
      setIsLoadingSubscription(false)
      return
    }

    // Only fetch if user ID changed (not just user object reference)
    const currentUserId = user.id
    if (currentUserId === lastUserIdRef.current) {
      console.log("[AdminDashboard] Subscription already loaded for this user, skipping")
      return
    }

    isFetchingRef.current = true
    lastUserIdRef.current = currentUserId

    try {
      setIsLoadingSubscription(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        console.warn("No access token for fetching subscription")
        setIsLoadingSubscription(false)
        return
      }

      const res = await fetch(`${apiBase}/api/stripe/subscription`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.subscription) {
          // Include token balance if available
          setSubscription({
            ...data.subscription,
            token_balance: data.tokenBalance || null,
          })
        } else {
          setSubscription(null)
        }
      } else if (res.status === 404) {
        // No subscription found - that's okay
        setSubscription(null)
      } else {
        console.error("Failed to fetch subscription:", res.status)
        setSubscription(null)
      }
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setIsLoadingSubscription(false)
      isFetchingRef.current = false
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  if (user?.role !== "admin") {
    return null
  }

  const stats = [
    {
      title: "Efficyon Employees",
      value: "47",
      change: "+2.5%",
      icon: Users,
      color: "text-cyan-400",
    },
    {
      title: "Customers",
      value: "342",
      change: "+8.2%",
      icon: Building2,
      color: "text-cyan-400",
    },
    {
      title: "Total Savings",
      value: "$2.4M",
      change: "+15.1%",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      title: "Avg ROI",
      value: "285%",
      change: "+5.3%",
      icon: TrendingUp,
      color: "text-cyan-400",
    },
  ]

  const recentEmployees = [
    { name: "John Doe", email: "john@efficyon.com", role: "Developer", joined: "2 hours ago", status: "active" },
    { name: "Jane Smith", email: "jane@efficyon.com", role: "Analyst", joined: "5 hours ago", status: "active" },
    { name: "Mike Johnson", email: "mike@efficyon.com", role: "Support", joined: "1 day ago", status: "active" },
  ]

  const recentCustomers = [
    { name: "Acme Corp", email: "contact@acme.com", plan: "Growth", joined: "2 hours ago", status: "active" },
    { name: "TechStart Inc", email: "admin@techstart.com", plan: "Enterprise", joined: "5 hours ago", status: "active" },
    { name: "Global Solutions", email: "info@global.com", plan: "Startup", joined: "1 day ago", status: "pending" },
  ]

  const systemAlerts = [
    {
      type: "success",
      message: "System backup completed successfully",
      time: "10 minutes ago",
      icon: CheckCircle,
    },
    {
      type: "warning",
      message: "High server load detected",
      time: "1 hour ago",
      icon: AlertCircle,
    },
    {
      type: "info",
      message: "New feature deployment scheduled",
      time: "3 hours ago",
      icon: AlertCircle,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Admin Dashboard
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          Manage employees, customers, and monitor system performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="bg-black/80 backdrop-blur-xl border-white/10"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 text-xs mt-2">
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">{stat.change}</span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Current Subscription */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            Current Subscription
          </CardTitle>
          <p className="text-sm text-gray-400">Your active subscription plan</p>
        </CardHeader>
        <CardContent>
          {isLoadingSubscription ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="ml-3 text-gray-400">Loading subscription...</span>
            </div>
          ) : subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {subscription.plan_catalog?.name || subscription.plan_tier.charAt(0).toUpperCase() + subscription.plan_tier.slice(1)} Plan
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {subscription.plan_tier}
                  </p>
                </div>
                <Badge
                  className={
                    subscription.status === "active"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : subscription.status === "past_due"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Monthly Price</p>
                  <p className="text-lg font-semibold text-white">
                    ${((subscription.amount_cents || subscription.plan_catalog?.price_monthly_cents || 0) / 100).toFixed(2)}
                  </p>
                </div>
                {subscription.token_balance && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Token Usage</p>
                    <p className="text-lg font-semibold text-white">
                      {subscription.token_balance.used_tokens} / {subscription.token_balance.total_tokens}
                    </p>
                  </div>
                )}
              </div>

              {subscription.plan_catalog && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Plan Features</p>
                  <ul className="space-y-1">
                    {subscription.plan_catalog.features && Array.isArray(subscription.plan_catalog.features) && (
                      subscription.plan_catalog.features.slice(0, 3).map((feature: string, index: number) => (
                        <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))
                    )}
                    {subscription.plan_catalog.max_integrations && (
                      <li className="text-sm text-gray-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        Up to {subscription.plan_catalog.max_integrations} integrations
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {subscription.current_period_end && (
                <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">
                    {subscription.cancel_at_period_end ? "Cancels on" : "Renews on"}{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No active subscription found</p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
              >
                Subscribe to a Plan
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Employees</CardTitle>
            <p className="text-sm text-gray-400">Efficyon team members</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEmployees.map((employee, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {employee.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {employee.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {employee.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                      {employee.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {employee.joined}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
            <p className="text-sm text-gray-400">Subscribers</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCustomers.map((customer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {customer.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {customer.plan} Plan
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        customer.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {customer.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {customer.joined}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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

        {/* System Alerts */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => {
                const Icon = alert.icon
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      alert.type === "success"
                        ? "bg-green-500/10 border-green-500/30"
                        : alert.type === "warning"
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-blue-500/10 border-blue-500/30"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        alert.type === "success"
                          ? "text-green-400"
                          : alert.type === "warning"
                            ? "text-yellow-400"
                            : "text-blue-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

