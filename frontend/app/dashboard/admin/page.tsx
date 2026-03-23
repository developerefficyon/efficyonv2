"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Building2,
  DollarSign,
  CreditCard,
  Coins,
  Loader2,
  Mail,
  ArrowUpRight,
  TrendingUp,
  Activity,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  free: "bg-white/[0.06] text-white/40 border-white/[0.08]",
  startup: "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15",
  growth: "bg-blue-500/10 text-blue-400/80 border-blue-500/15",
  custom: "bg-violet-500/10 text-violet-400/80 border-violet-500/15",
}

const planNames: Record<string, string> = {
  free: "Free",
  startup: "Startup",
  growth: "Growth",
  custom: "Enterprise",
}

const planRingColors: Record<string, string> = {
  free: "#525252",
  startup: "#34d399",
  growth: "#60a5fa",
  custom: "#a78bfa",
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

// ── Donut chart for plan distribution ──
function PlanDonut({
  distribution,
  total,
}: {
  distribution: Record<string, number>
  total: number
}) {
  const size = 140
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const tiers = ["free", "startup", "growth", "custom"] as const
  let cumulativeOffset = 0

  const segments = tiers
    .filter((tier) => (distribution[tier] || 0) > 0)
    .map((tier) => {
      const count = distribution[tier] || 0
      const ratio = total > 0 ? count / total : 0
      const dashLength = ratio * circumference
      const gapLength = circumference - dashLength
      const offset = -cumulativeOffset
      cumulativeOffset += dashLength

      return {
        tier,
        count,
        color: planRingColors[tier],
        dashArray: `${dashLength} ${gapLength}`,
        dashOffset: offset,
      }
    })

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map((seg) => (
          <circle
            key={seg.tier}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white">{total}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Total</span>
      </div>
    </div>
  )
}

// ── Token usage gauge ──
function TokenGauge({ percent }: { percent: number }) {
  const width = 140
  const strokeWidth = 10
  const radius = (width - strokeWidth) / 2
  const semiCircumference = Math.PI * radius
  const offset = semiCircumference - (percent / 100) * semiCircumference
  const color =
    percent >= 80 ? "#f87171" : percent >= 50 ? "#fbbf24" : "#34d399"

  // Position circle center at bottom of the visible area
  const cx = width / 2
  const cy = radius + strokeWidth / 2
  const svgHeight = cy + strokeWidth / 2

  return (
    <div className="relative" style={{ width, height: svgHeight + 28 }}>
      <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${semiCircumference} ${semiCircumference}`}
          strokeDashoffset={0}
          transform={`rotate(180, ${cx}, ${cy})`}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${semiCircumference} ${semiCircumference}`}
          strokeDashoffset={offset}
          transform={`rotate(180, ${cx}, ${cy})`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-2xl font-semibold text-white">{percent}%</span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Used</span>
      </div>
    </div>
  )
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
  const planDist = stats?.planDistribution || {}
  const totalSubs = Object.values(planDist).reduce((a, b) => a + b, 0)

  const now = new Date()
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="animate-slide-up delay-0">
        <p className="text-[13px] text-white/30 font-medium mb-1">{dateDisplay}</p>
        <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
          Command <span className="italic text-emerald-400/90">Center</span>
        </h2>
        <p className="text-[14px] text-white/35 mt-1">
          Platform metrics, revenue, and team activity
        </p>
      </div>

      {/* ── Hero KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* MRR — Hero metric */}
        <Card className="col-span-2 bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-1 relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/[0.06] rounded-full blur-3xl group-hover:bg-emerald-500/[0.1] transition-all duration-700" />
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Monthly Revenue</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15 text-[10px] h-5 px-2 rounded-full font-medium">
                MRR
              </Badge>
            </div>
            {isLoading ? (
              <div className="h-12 w-32 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div className="animate-count-up delay-3">
                <p className="text-4xl sm:text-5xl font-semibold text-white tracking-tight mb-1">
                  {formatCurrency(stats?.mrr || 0)}
                </p>
                <p className="text-[12px] text-white/30">
                  {stats?.activeSubscriptions || 0} active subscription{(stats?.activeSubscriptions || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-2">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-blue-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Customers</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-3xl font-semibold text-white tracking-tight">
                  {stats?.totalCustomers || 0}
                </p>
                <p className="text-[12px] text-white/25 mt-0.5">
                  {stats?.activeSubscriptions || 0} paying
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employees */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-3">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-violet-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Team</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-3xl font-semibold text-white tracking-tight">
                  {stats?.totalEmployees || 0}
                </p>
                <p className="text-[12px] text-white/25 mt-0.5">
                  employees
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Plan Distribution + Token Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Distribution — Donut */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-4">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white/30" />
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Plan Distribution</span>
              </div>
              <Link href="/dashboard/admin/billing">
                <Button variant="ghost" size="sm" className="text-white/25 hover:text-white/60 h-6 text-[11px] gap-1 px-2">
                  Details <ArrowUpRight className="w-2.5 h-2.5" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                </div>
              </div>
            ) : totalSubs === 0 ? (
              <div className="text-center py-10">
                <CreditCard className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-[12px] text-white/25">No subscriptions yet</p>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                {/* Donut */}
                <div className="flex-shrink-0">
                  <PlanDonut distribution={planDist} total={totalSubs} />
                </div>
                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {(["free", "startup", "growth", "custom"] as const).map((tier) => {
                    const count = planDist[tier] || 0
                    const percent = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0
                    return (
                      <div key={tier} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: planRingColors[tier] }}
                          />
                          <span className="text-[12px] text-white/50">{planNames[tier]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-white/80">{count}</span>
                          <span className="text-[10px] text-white/20 w-8 text-right">{percent}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token Overview — Semicircle gauge */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-5">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-white/30" />
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Token Usage</span>
              </div>
              <Link href="/dashboard/admin/tokens">
                <Button variant="ghost" size="sm" className="text-white/25 hover:text-white/60 h-6 text-[11px] gap-1 px-2">
                  Manage <ArrowUpRight className="w-2.5 h-2.5" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Gauge */}
                <TokenGauge percent={stats?.tokenStats.usagePercent || 0} />

                {/* Token stats row */}
                <div className="grid grid-cols-3 gap-3 w-full mt-4">
                  <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[15px] font-semibold text-white">
                      {(stats?.tokenStats.totalAllocated || 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mt-1">Allocated</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[15px] font-semibold text-emerald-400">
                      {(stats?.tokenStats.totalUsed || 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mt-1">Used</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[15px] font-semibold text-white/60">
                      {((stats?.tokenStats.totalAllocated || 0) - (stats?.tokenStats.totalUsed || 0)).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mt-1">Available</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Employees + Recent Customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Employees */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-6">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/30" />
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Recent Team Members</span>
              </div>
              <Link href="/dashboard/admin/users">
                <Button variant="ghost" size="sm" className="text-white/25 hover:text-white/60 h-6 text-[11px] gap-1 px-2">
                  View all <ArrowUpRight className="w-2.5 h-2.5" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 h-12">
                    <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" />
                      <div className="h-2 w-36 bg-white/[0.02] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentEmployees.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-[12px] text-white/25">No employees found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400/80 to-violet-600/80 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-semibold">
                        {getInitials(employee.full_name, employee.email)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/80 truncate">
                        {employee.full_name || employee.email}
                      </p>
                      <p className="text-[11px] text-white/25 truncate">{employee.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-white/20">
                        {timeAgo(employee.created_at)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-7">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/30" />
                <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Recent Customers</span>
              </div>
              <Link href="/dashboard/admin/customers">
                <Button variant="ghost" size="sm" className="text-white/25 hover:text-white/60 h-6 text-[11px] gap-1 px-2">
                  View all <ArrowUpRight className="w-2.5 h-2.5" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 h-12">
                    <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" />
                      <div className="h-2 w-36 bg-white/[0.02] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentCustomers.length === 0 ? (
              <div className="text-center py-10">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-[12px] text-white/25">No customers found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/80 to-teal-600/80 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-semibold">
                        {getInitials(customer.company_name || customer.full_name, customer.email)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/80 truncate">
                        {customer.company_name || customer.full_name || customer.email}
                      </p>
                      <p className="text-[11px] text-white/25 truncate">{customer.email}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <Badge className={`${planColors[customer.plan_tier] || planColors.free} text-[9px] h-[18px] px-1.5 rounded-full font-medium`}>
                        {planNames[customer.plan_tier] || "Free"}
                      </Badge>
                      <span className="text-[10px] text-white/20 hidden sm:inline">
                        {timeAgo(customer.created_at)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
