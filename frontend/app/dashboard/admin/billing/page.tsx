"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  Search,
} from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { toast } from "sonner"

interface Subscription {
  id: string
  company_name: string
  user_email: string
  user_name: string | null
  plan_tier: string
  plan_name: string
  status: string
  amount_cents: number
  currency: string
  current_period_start: string | null
  current_period_end: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
  cancel_at: string | null
  canceled_at: string | null
  created_at: string
}

interface FailedPayment {
  id: string
  company_name: string
  user_email: string
  amount_cents: number
  currency: string
  status: string
  reason: string
  created_at: string
}

interface BillingStats {
  mrr: number
  activeCount: number
  churnRate: number
  avgRevenue: number
}

interface CachedBillingData {
  subscriptions: Subscription[]
  failedPayments: FailedPayment[]
  billingStats: BillingStats
}

type TabType = "trials" | "failed" | "active"

export default function AdminBillingPage() {
  const cachedBilling = getCache<CachedBillingData>("admin-billing")
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(cachedBilling?.subscriptions || [])
  const [failedPaymentsData, setFailedPaymentsData] = useState<FailedPayment[]>(cachedBilling?.failedPayments || [])
  const [isLoading, setIsLoading] = useState(!cachedBilling)
  const [billingStats, setBillingStats] = useState<BillingStats>(
    cachedBilling?.billingStats || {
      mrr: 0,
      activeCount: 0,
      churnRate: 0,
      avgRevenue: 0,
    }
  )
  const [activeTab, setActiveTab] = useState<TabType>("active")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        if (!getCache("admin-billing")) {
          setIsLoading(true)
        }
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const accessToken = await getBackendToken()

        if (!accessToken) {
          toast.error("Session expired", { description: "Please log in again" })
          return
        }

        const res = await fetch(`${apiBase}/api/admin/subscriptions`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!res.ok) {
          let errorMessage = `Failed to fetch subscriptions: ${res.status}`
          try {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
            if (errorData.details) {
              errorMessage += ` - ${errorData.details}`
            }
          } catch {
            errorMessage = `Failed to fetch subscriptions: ${res.status} ${res.statusText}`
          }
          throw new Error(errorMessage)
        }

        const data = await res.json()
        const allSubs: Subscription[] = data.subscriptions || []
        setSubscriptions(allSubs)
        setFailedPaymentsData(data.failedPayments || [])

        // Calculate stats
        const activeSubs = allSubs.filter((s) => s.status === "active")
        const totalCents = activeSubs.reduce((sum, s) => sum + (s.amount_cents || 0), 0)
        const mrr = totalCents / 100
        const avgRevenue = activeSubs.length > 0 ? mrr / activeSubs.length : 0

        // Calculate churn rate: canceled in last 30 days / (active + recently canceled)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const recentlyCanceled = allSubs.filter(
          (s) => s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo
        )
        const activeAtPeriodStart = activeSubs.length + recentlyCanceled.length
        const churnRate = activeAtPeriodStart > 0
          ? (recentlyCanceled.length / activeAtPeriodStart) * 100
          : 0

        const newStats: BillingStats = {
          mrr,
          activeCount: activeSubs.length,
          churnRate,
          avgRevenue,
        }
        setBillingStats(newStats)
        setCache("admin-billing", {
          subscriptions: allSubs,
          failedPayments: data.failedPayments || [],
          billingStats: newStats,
        })
      } catch (error) {
        console.error("Error fetching subscriptions:", error)
        toast.error("Failed to load subscriptions", {
          description: error instanceof Error ? error.message : "An error occurred",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptions()
  }, [])

  // Format MRR display
  const formatMrr = (mrr: number) => {
    if (mrr >= 1000) return `$${(mrr / 1000).toFixed(1)}K`
    return `$${mrr.toFixed(0)}`
  }

  const displayStats = [
    {
      title: "Monthly Recurring Revenue",
      value: formatMrr(billingStats.mrr),
      icon: DollarSign,
      color: "text-cyan-400",
    },
    {
      title: "Churn Rate",
      value: `${billingStats.churnRate.toFixed(1)}%`,
      icon: TrendingDown,
      color: billingStats.churnRate > 5 ? "text-red-400" : "text-green-400",
    },
    {
      title: "Active Subscriptions",
      value: billingStats.activeCount.toString(),
      icon: Users,
      color: "text-cyan-400",
    },
    {
      title: "Avg Revenue per Customer",
      value: `$${billingStats.avgRevenue.toFixed(0)}`,
      icon: TrendingUp,
      color: "text-cyan-400",
    },
  ]

  // Derive active subscriptions for the Active tab
  const activeSubscriptions = subscriptions
    .filter((s) => s.status === "active" || s.status === "trialing")
    .map((s) => ({
      company: s.company_name,
      plan: s.plan_name,
      amount: s.amount_cents / 100,
      status: s.status,
      nextBilling: s.current_period_end
        ? new Date(s.current_period_end).toISOString().slice(0, 10)
        : "N/A",
      customerSince: s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : "N/A",
    }))

  // Derive trials from subscriptions with status "trialing"
  const trials = subscriptions
    .filter((s) => s.status === "trialing" && s.trial_ends_at)
    .map((s) => {
      const trialEnd = new Date(s.trial_ends_at!)
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      return {
        company: s.company_name,
        plan: s.plan_name,
        daysLeft,
        email: s.user_email,
      }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)

  // Derive failed payments from API data + past_due subscriptions
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    return `${days} days ago`
  }

  const paymentIssues = failedPaymentsData.map((p) => ({
    company: p.company_name,
    email: p.user_email,
    amount: p.amount_cents / 100,
    failedDate: timeAgo(p.created_at),
    reason: p.reason,
  }))

  // Also include past_due subscriptions as payment issues
  const pastDueIssues = subscriptions
    .filter((s) => s.status === "past_due")
    .map((s) => ({
      company: s.company_name,
      email: s.user_email,
      amount: s.amount_cents / 100,
      failedDate: s.current_period_end
        ? `Due ${new Date(s.current_period_end).toISOString().slice(0, 10)}`
        : "Unknown",
      reason: "Payment past due",
    }))

  const allFailedPayments = [...paymentIssues, ...pastDueIssues]

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Billing & Subscriptions</h2>
        <p className="text-sm sm:text-base text-gray-400">Monitor revenue, subscriptions, and payment issues</p>
      </div>

      {/* Billing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-black/95 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : (
          displayStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card
                key={stat.title}
                className="bg-black/95 backdrop-blur-xl border-white/10"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Tabbed Content Section */}
      <Card className="bg-black/95 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by company, email, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "active"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Active Subscriptions</span>
                <span className="sm:hidden">Active</span>
                <Badge className="h-5 px-1.5 text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {activeSubscriptions.filter(s =>
                    s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.plan.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length}
                </Badge>
              </button>
              <button
                onClick={() => setActiveTab("trials")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "trials"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Trials Ending Soon</span>
                <span className="sm:hidden">Trials</span>
                <Badge className="h-5 px-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  {trials.filter(t =>
                    t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.plan.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length}
                </Badge>
              </button>
              <button
                onClick={() => setActiveTab("failed")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "failed"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Payment Issues</span>
                <span className="sm:hidden">Issues</span>
                <Badge className="h-5 px-1.5 text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                  {allFailedPayments.filter(p =>
                    p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.email.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length}
                </Badge>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Active Subscriptions Tab */}
          {activeTab === "active" && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="ml-3 text-gray-400">Loading subscriptions...</span>
                </div>
              ) : (() => {
                const filteredSubscriptions = activeSubscriptions.filter(s =>
                  s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.plan.toLowerCase().includes(searchQuery.toLowerCase())
                )
                if (filteredSubscriptions.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-cyan-400/50 mx-auto mb-3" />
                      <p className="text-gray-400">
                        {searchQuery ? "No subscriptions match your search" : "No active subscriptions found"}
                      </p>
                    </div>
                  )
                }
                return filteredSubscriptions.map((sub, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-white truncate">{sub.company}</p>
                        <Badge
                          className={
                            sub.status === "active"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {sub.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span>{sub.plan} Plan</span>
                        <span className="hidden sm:inline">&bull;</span>
                        <span>Next billing: {sub.nextBilling}</span>
                        <span className="hidden sm:inline">&bull;</span>
                        <span>Since: {sub.customerSince}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-lg font-bold text-white">${sub.amount}/mo</p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* Trials Ending Soon Tab */}
          {activeTab === "trials" && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="ml-3 text-gray-400">Loading trials...</span>
                </div>
              ) : (() => {
                const filteredTrials = trials.filter(t =>
                  t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.plan.toLowerCase().includes(searchQuery.toLowerCase())
                )
                if (filteredTrials.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-yellow-400/50 mx-auto mb-3" />
                      <p className="text-gray-400">
                        {searchQuery ? "No trials match your search" : "No trials ending soon"}
                      </p>
                    </div>
                  )
                }
                return filteredTrials.map((trial, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-yellow-500/20 hover:bg-yellow-500/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{trial.company}</p>
                      <p className="text-xs text-gray-400 truncate">{trial.email}</p>
                      <p className="text-xs text-gray-500 mt-1">{trial.plan} Plan</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`text-sm font-semibold ${trial.daysLeft <= 3 ? "text-red-400" : "text-yellow-400"}`}>
                        {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left
                      </p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* Payment Issues Tab */}
          {activeTab === "failed" && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="ml-3 text-gray-400">Loading payment data...</span>
                </div>
              ) : (() => {
                const filteredPayments = allFailedPayments.filter(p =>
                  p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
                if (filteredPayments.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-green-400/50 mx-auto mb-3" />
                      <p className="text-gray-400">
                        {searchQuery ? "No payment issues match your search" : "No payment issues"}
                      </p>
                    </div>
                  )
                }
                return filteredPayments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-red-500/20 hover:bg-red-500/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{payment.company}</p>
                      <p className="text-xs text-gray-400 truncate">{payment.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {payment.reason} &bull; ${payment.amount}/mo
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs text-gray-400">{payment.failedDate}</p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
