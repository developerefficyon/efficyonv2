"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { TokenProvider } from "@/lib/token-context"
import { TeamRoleProvider, useTeamRole } from "@/lib/team-role-context"
import { clearAllCache } from "@/lib/use-api-cache"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { TrialExpiredModal } from "@/components/trial-expired-modal"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  LogOut,
  Shield,
  Building2,
  Bell,
  Search,
  ChevronRight,
  Coins,
  MessageSquare,
  FlaskConical,
} from "lucide-react"
import { TokenBalanceDisplay } from "@/components/token-balance-display"
import { LowTokenWarning } from "@/components/low-token-warning"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const userMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    badge: null,
    description: "Overview & insights",
  },
  {
    title: "Tools",
    icon: Zap,
    href: "/dashboard/tools",
    badge: null,
    description: "Connected tools",
  },
  {
    title: "Chatbot",
    icon: MessageSquare,
    href: "/dashboard/chatbot",
    badge: null,
    description: "AI assistant",
  },
  {
    title: "Recommendations",
    icon: TrendingUp,
    href: "/dashboard/recommendations",
    badge: null,
    description: "Optimization suggestions",
  },
  {
    title: "Usage",
    icon: BarChart3,
    href: "/dashboard/usage",
    badge: null,
    description: "Usage insights",
  },
  {
    title: "Team",
    icon: Users,
    href: "/dashboard/team",
    badge: null,
    description: "Team management",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/dashboard/reports",
    badge: null,
    description: "Generated reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    badge: null,
    description: "Preferences",
  },
]

const adminMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard/admin",
    badge: null,
    description: "System overview",
  },
  {
    title: "Users",
    icon: Users,
    href: "/dashboard/admin/users",
    description: "Efficyon Employees",
    badge: null,
  },
  {
    title: "Customers",
    icon: Building2,
    href: "/dashboard/admin/customers",
    description: "Subscribers",
    badge: null,
  },
  {
    title: "Billing",
    icon: DollarSign,
    href: "/dashboard/admin/billing",
    badge: null,
    description: "Revenue & subscriptions",
  },
  {
    title: "Token Management",
    icon: Coins,
    href: "/dashboard/admin/tokens",
    badge: null,
    description: "Customer token usage",
  },
{
    title: "Analytics",
    icon: BarChart3,
    href: "/dashboard/admin/analytics",
    badge: null,
    description: "Business insights",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/dashboard/admin/reports",
    badge: null,
    description: "System reports",
  },
  {
    title: "Testing",
    icon: FlaskConical,
    href: "/dashboard/admin/testing",
    badge: "New",
    description: "AI agent testing",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/admin/settings",
    badge: null,
    description: "Configuration",
  },
]

// Hook to close sidebar on mobile when navigating
function useCloseSidebarOnMobile() {
  const { setOpenMobile, isMobile } = useSidebar()

  return () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }
}

// Navigation component that can access sidebar context
function SidebarNavigation({
  menuItems,
  pathname,
  isAdmin
}: {
  menuItems: typeof userMenuItems
  pathname: string | null
  isAdmin: boolean
}) {
  const handleNavClick = useCloseSidebarOnMobile()
  const { canManageTeam, isViewer, isLoading: isRoleLoading } = useTeamRole()

  // Filter menu items based on role (skip filtering for admin sidebar)
  const filteredItems = isAdmin
    ? menuItems
    : menuItems.filter((item) => {
        if (item.title === "Team" && !canManageTeam) return false
        if (item.title === "Tools" && isViewer) return false
        return true
      })

  // Show skeleton placeholders while role is loading (non-admin only)
  if (isRoleLoading && !isAdmin) {
    return (
      <SidebarContent className="px-3 py-5">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/30 text-[10px] font-medium uppercase tracking-[0.15em] px-3 mb-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex items-center gap-3 h-10 px-3">
                    <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    )
  }

  return (
    <SidebarContent className="px-3 py-5">
      <SidebarGroup>
        <SidebarGroupLabel className="text-white/30 text-[10px] font-medium uppercase tracking-[0.15em] px-3 mb-3">
          {isAdmin ? "Administration" : "Navigation"}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="space-y-0.5">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isDashboardRoot = item.href === "/dashboard" || item.href === "/dashboard/admin"
              const isActive = isDashboardRoot
                ? pathname === item.href
                : pathname?.startsWith(item.href) ?? false
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "group relative h-10 px-3 rounded-lg transition-all duration-200",
                      "text-white/50 hover:text-white/90",
                      "hover:bg-white/[0.04]",
                      "data-[active=true]:bg-white/[0.06]",
                      "data-[active=true]:text-white data-[active=true]:font-medium",
                    )}
                  >
                    <Link href={item.href} onClick={handleNavClick} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full bg-emerald-400 sidebar-active-bar" />
                        )}
                        <Icon className={cn(
                          "w-[18px] h-[18px] transition-colors",
                          isActive ? "text-emerald-400" : "text-white/40 group-hover:text-white/70"
                        )} />
                        <span className="text-[13px]">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge
                            variant={item.badge === "New" ? "default" : "secondary"}
                            className={cn(
                              "h-[18px] px-1.5 text-[9px] font-semibold rounded-full",
                              item.badge === "New"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                : "bg-white/10 text-white/60 border-white/10"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/dashboard/admin")

  // Trial status state
  const [trialStatus, setTrialStatus] = useState<{
    isTrialActive: boolean
    isTrialExpired: boolean
    trialEndsAt: string | null
    daysRemaining: number
  } | null>(null)
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // Check subscription and trial status
  const userId = user?.id
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!userId || isAdmin) {
        setIsCheckingSubscription(false)
        return
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const accessToken = await getBackendToken()

        if (!accessToken) {
          setIsCheckingSubscription(false)
          return
        }

        const response = await fetch(`${apiBase}/api/stripe/subscription`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (response.ok) {
          const data = await response.json()
          setTrialStatus(data.trialStatus)

          // Show modal if trial has expired
          if (data.trialStatus?.isTrialExpired) {
            setShowTrialExpiredModal(true)
          }
        }
      } catch (error) {
        console.error("Error checking subscription status:", error)
      } finally {
        setIsCheckingSubscription(false)
      }
    }

    if (userId && !isAdmin) {
      checkSubscriptionStatus()
    } else {
      setIsCheckingSubscription(false)
    }
  }, [userId, isAdmin])

  if (isLoading || isCheckingSubscription) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-700" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* Loading Indicator */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-cyan-500/30 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-cyan-500 rounded-full animate-spin" />
            </div>
            <p className="text-gray-400 text-sm">Loading your dashboard...</p>
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const menuItems = isAdmin ? adminMenuItems : userMenuItems

  // Handle plan selection from trial expired modal
  const handleSelectPlan = async (planTier: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      const response = await fetch(`${apiBase}/api/stripe/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planTier,
          email: user.email,
          returnUrl: "/dashboard",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.sessionUrl) {
          window.location.href = data.sessionUrl
        }
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    }
  }

  return (
    <TeamRoleProvider>
    <TokenProvider>
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#0a0a0b] overflow-x-hidden">
        <Sidebar className="border-r border-white/[0.06] !bg-[#0a0a0b] [&>div]:!bg-transparent [&_[data-sidebar=sidebar]]:!bg-transparent [&_[data-sidebar=sidebar]]:!text-white shrink-0">
          {/* Sidebar Header with Logo */}
          <SidebarHeader className="px-5 py-5 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Efficyon"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-white tracking-tight">
                  Efficyon
                </h2>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.1em] font-medium">
                  {isAdmin ? "Admin" : "Cost Intelligence"}
                </p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarNavigation menuItems={menuItems} pathname={pathname} isAdmin={isAdmin} />

          {/* Footer with User Profile */}
          <div className="p-4 border-t border-white/[0.06]">
            {/* User Profile */}
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {user.role === "admin" && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0b] flex items-center justify-center">
                    <Shield className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/90 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-white/30 truncate">{user.email}</p>
              </div>
            </div>

            {/* Logout Button */}
            <SidebarMenuButton
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  clearAllCache()
                  await logout()
                } catch (error) {
                  console.error("Logout error:", error)
                  clearAllCache()
                  router.push("/login")
                }
              }}
              className="w-full h-8 px-3 text-white/30 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[12px]">Sign out</span>
            </SidebarMenuButton>
          </div>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0a0b]/90 backdrop-blur-xl shrink-0">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6 max-w-full">
              <SidebarTrigger className="text-white/50 hover:text-white shrink-0" />

              {/* Breadcrumb-style page title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[13px] text-white/30">
                  {isAdmin ? "Admin" : "Efficyon"}
                </span>
                <span className="text-white/15">/</span>
                <span className="text-[13px] text-white/80 font-medium truncate">
                  {isAdmin ? "Overview" : "Dashboard"}
                </span>
              </div>

              {/* Trial Days Remaining */}
              {!isAdmin && trialStatus?.isTrialActive && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/8 border border-amber-500/15 shrink-0">
                  <Clock className="w-3 h-3 text-amber-400/80" />
                  <span className="text-[11px] font-medium text-amber-400/80">
                    {trialStatus.daysRemaining}d left
                  </span>
                </div>
              )}

              {/* Token Balance */}
              {!isAdmin && (
                <div className="hidden sm:block shrink-0">
                  <TokenBalanceDisplay variant="header" />
                </div>
              )}

              {/* Search */}
              <div className="relative hidden sm:block w-44 lg:w-56 shrink-0">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20 text-[12px] rounded-lg focus:border-emerald-500/30 focus:bg-white/[0.05] w-full transition-all"
                />
              </div>

              {/* Notifications */}
              <div className="relative shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white/30 hover:text-white/70 hover:bg-white/[0.04] relative"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </Button>
              </div>
            </div>
          </header>
          <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden premium-scrollbar">{children}</div>
        </main>
      </div>
      {/* Low Token Warning Modal - Only for non-admin users */}
      {!isAdmin && <LowTokenWarning />}
      {/* Trial Expired Modal - Only for non-admin users with expired trials */}
      {!isAdmin && (
        <TrialExpiredModal
          open={showTrialExpiredModal}
          onSelectPlan={handleSelectPlan}
          trialEndsAt={trialStatus?.trialEndsAt || null}
        />
      )}
    </SidebarProvider>
    </TokenProvider>
    </TeamRoleProvider>
  )
}

