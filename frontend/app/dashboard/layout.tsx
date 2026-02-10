"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { TokenProvider } from "@/lib/token-context"
import { TeamRoleProvider, useTeamRole } from "@/lib/team-role-context"
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
    title: "Integrations Health",
    icon: Zap,
    href: "/dashboard/admin/integrations-health",
    badge: null,
    description: "API monitoring",
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
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-2 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex items-center gap-3 h-11 px-3">
                    <div className="w-7 h-7 rounded-md bg-white/5 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                      <div className="h-2 w-28 bg-white/[0.03] rounded animate-pulse" />
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
    <SidebarContent className="px-3 py-4">
      <SidebarGroup>
        <SidebarGroupLabel className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-2 mb-2">
          {isAdmin ? "Administration" : "Navigation"}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon
              // Use exact match for main dashboard routes, startsWith for others (to match sub-routes)
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
                      "group relative h-11 px-3 rounded-lg transition-all duration-200",
                      "text-gray-300 hover:text-white",
                      "hover:bg-gradient-to-r hover:from-cyan-600/30 hover:to-blue-700/30",
                      "hover:border-l-2 hover:border-cyan-500/50",
                      "hover:shadow-md hover:shadow-cyan-500/10",
                      "data-[active=true]:bg-gradient-to-r data-[active=true]:from-cyan-600/30 data-[active=true]:to-blue-700/30",
                      "data-[active=true]:text-cyan-400 data-[active=true]:font-semibold",
                      "data-[active=true]:shadow-lg data-[active=true]:shadow-cyan-500/10",
                      "data-[active=true]:border-l-2 data-[active=true]:border-cyan-500"
                    )}
                  >
                    <Link href={item.href} onClick={handleNavClick} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-md transition-all",
                          isActive
                            ? "bg-cyan-600/30 text-cyan-400"
                            : "bg-white/5 text-gray-400 group-hover:bg-cyan-600/30 group-hover:text-cyan-400 group-hover:scale-105"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-[10px] text-gray-500 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge
                            variant={item.badge === "New" ? "default" : "secondary"}
                            className={cn(
                              "h-5 px-1.5 text-[10px] font-semibold",
                              item.badge === "New"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-cyan-400" />
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white">Loading...</div>
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
      <div className="flex min-h-screen w-full bg-black overflow-x-hidden">
        <Sidebar className="border-r border-white/10 !bg-gradient-to-b from-black via-black/98 to-black/95 backdrop-blur-xl [&>div]:!bg-transparent [&_[data-sidebar=sidebar]]:!bg-transparent [&_[data-sidebar=sidebar]]:!text-white shrink-0">
          {/* Sidebar Header with Logo */}
          <SidebarHeader className="p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Efficyon"
                width={56}
                height={56}
                className="h-14 w-auto object-contain"
                priority
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Efficyon
                </h2>
                <p className="text-xs text-gray-400">
                  {isAdmin ? "Admin Portal" : "Customer Portal"}
                </p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarNavigation menuItems={menuItems} pathname={pathname} isAdmin={isAdmin} />

          {/* Footer with User Profile */}
          <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-sm">
            {/* User Profile */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-white/10 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <span className="text-white text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {user.role === "admin" && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-cyan-500 border-2 border-black flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {user.role === "admin" && (
                    <Badge className="mt-1 h-4 px-1.5 text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <SidebarMenuButton
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  await logout()
                } catch (error) {
                  console.error("Logout error:", error)
                  // Force redirect even if logout fails
                  router.push("/login")
                }
              }}
              className="w-full h-9 px-3 text-gray-300 hover:text-white hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </SidebarMenuButton>
          </div>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl shrink-0">
            <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-6 max-w-full">
              <SidebarTrigger className="text-white shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-semibold text-white truncate">
                  {isAdmin ? "Admin Dashboard" : "Dashboard"}
                </h1>
              </div>
              {/* Trial Days Remaining - Only for trial users */}
              {!isAdmin && trialStatus?.isTrialActive && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">
                    {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"} left
                  </span>
                </div>
              )}
              {/* Token Balance Display - Only for non-admin users */}
              {!isAdmin && (
                <div className="hidden sm:block shrink-0">
                  <TokenBalanceDisplay variant="header" />
                </div>
              )}
              <div className="relative hidden sm:block w-48 lg:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Quick search..."
                  className="pl-9 h-9 bg-black/50 border-white/10 text-white placeholder:text-gray-500 text-sm focus:border-cyan-500/50 w-full"
                />
              </div>
              {/* Notifications */}
              <div className="relative shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-gray-300 hover:text-white hover:bg-white/5 relative"
                >
                  <Bell className="w-4 h-4" />
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                    2
                  </Badge>
                </Button>
              </div>
            </div>
          </header>
          <div className="flex-1 p-3 sm:p-4 lg:p-6 min-w-0 overflow-x-hidden">{children}</div>
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

