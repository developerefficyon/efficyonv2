"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Settings,
  Bell,
  CreditCard,
  Key,
  User,
  Mail,
  Building2,
  Save,
  Shield,
  Loader2,
  Check,
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  X,
  Clock,
  AlertCircle,
  Coins,
  Plus,
  TrendingUp,
} from "lucide-react"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useTeamRole } from "@/lib/team-role-context"
import { useApiCache } from "@/lib/use-api-cache"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { TokenBalanceDisplay } from "@/components/token-balance-display"
import { TokenUsageHistory } from "@/components/token-usage-history"
import { AiModelSelector } from "@/components/ai-model-selector"

type Plan = {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: "startup",
    name: "Startup",
    price: "$39",
    period: "month",
    description: "For companies with 1-10 employees",
    features: [
      "5 integrations",
      "10 monthly tokens",
      "Email support",
      "Basic analytics",
      "Up to 3 team members",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$119",
    period: "month",
    description: "For companies with 11-50 employees",
    features: [
      "15 integrations",
      "50 monthly tokens",
      "Priority support",
      "Advanced analytics",
      "Up to 10 team members",
      "Team collaboration",
    ],
    popular: true,
  },
  {
    id: "custom",
    name: "Enterprise",
    price: "$299",
    period: "month",
    description: "For companies with 50+ employees",
    features: [
      "Unlimited integrations",
      "200 monthly tokens",
      "Dedicated support",
      "Custom analytics",
      "Unlimited team members",
      "Custom features",
    ],
  },
]

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const { user } = useAuth()
  const { isOwner } = useTeamRole()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [isTopUpProcessing, setIsTopUpProcessing] = useState(false)
  const [tokenPackages, setTokenPackages] = useState<any[]>([])

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReports: true,
    renewalReminders: true,
    recommendations: true,
    systemUpdates: false,
  })

  const [billing, setBilling] = useState({
    plan: "Growth",
    nextBilling: "2024-07-15",
    paymentMethod: "•••• •••• •••• 4242",
  })

  // Fetch subscription and trial status
  const fetchSubscriptionStatus = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()
    if (!accessToken) return null
    const response = await fetch(`${apiBase}/api/stripe/subscription`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) throw new Error("Failed to fetch subscription")
    return response.json()
  }, [])

  const { data: subscriptionData } = useApiCache<any>("subscription", fetchSubscriptionStatus)

  // Derive trial status and billing from cached subscription data
  const trialStatus = subscriptionData?.trialStatus ?? null

  useEffect(() => {
    if (subscriptionData?.subscription) {
      const sub = subscriptionData.subscription
      const planName = sub.plan_catalog?.name || sub.plan_tier
      setBilling(prev => ({
        ...prev,
        plan: planName || prev.plan,
        nextBilling: sub.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString()
          : prev.nextBilling,
      }))
    }
  }, [subscriptionData])

  // Check for payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment")
    const tokenPurchaseStatus = searchParams.get("token_purchase")

    if (paymentStatus === "success") {
      toast.success("Plan changed successfully!", {
        description: "Your subscription has been updated.",
      })
      router.replace("/dashboard/settings")
    } else if (paymentStatus === "canceled") {
      toast.error("Payment canceled", {
        description: "Your plan change was canceled.",
      })
      router.replace("/dashboard/settings")
    } else if (tokenPurchaseStatus === "success") {
      toast.success("Tokens purchased successfully!", {
        description: "Your token balance has been updated.",
      })
      router.replace("/dashboard/settings")
    } else if (tokenPurchaseStatus === "canceled") {
      toast.error("Token purchase canceled", {
        description: "No tokens were added.",
      })
      router.replace("/dashboard/settings")
    }

    // Open top-up modal if URL has topup=true
    if (searchParams.get("topup") === "true") {
      setIsTopUpModalOpen(true)
    }
  }, [searchParams, router])

  // Fetch token packages when top-up modal opens
  useEffect(() => {
    if (isTopUpModalOpen && tokenPackages.length === 0) {
      const fetchPackages = async () => {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
          const accessToken = await getBackendToken()
          if (!accessToken) return
          const response = await fetch(`${apiBase}/api/stripe/token-packages`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (response.ok) {
            const data = await response.json()
            setTokenPackages(data.packages || [])
          }
        } catch (error) {
          console.error("Failed to fetch token packages:", error)
        }
      }
      fetchPackages()
    }
  }, [isTopUpModalOpen, tokenPackages.length])

  // Set current plan when modal opens
  useEffect(() => {
    if (isChangePlanModalOpen && billing.plan) {
      // Map billing.plan name to plan.id (e.g., "Growth" -> "growth", "Startup" -> "startup", "Enterprise" -> "custom")
      let currentPlanId = billing.plan.toLowerCase()
      
      // Handle special case: "Enterprise" maps to "custom" in the plans array
      if (currentPlanId === "enterprise") {
        currentPlanId = "custom"
      }
      
      // Check if the plan exists in the plans array
      const planExists = plans.some(plan => plan.id === currentPlanId)
      if (planExists) {
        setSelectedPlan(currentPlanId)
      } else {
        // If no match found, try to find by name (case-insensitive)
        const planByName = plans.find(plan => plan.name.toLowerCase() === billing.plan.toLowerCase())
        if (planByName) {
          setSelectedPlan(planByName.id)
        }
      }
    } else if (!isChangePlanModalOpen) {
      // Reset selected plan when modal closes
      setSelectedPlan("")
    }
  }, [isChangePlanModalOpen, billing.plan])

  const handleChangePlan = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan")
      return
    }

    setIsProcessing(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const userEmail = user?.email || ""
      const companyName = user?.name || ""

      // Create Stripe checkout session
      const response = await fetch(`${apiBase}/api/stripe/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planTier: selectedPlan.toLowerCase(),
          email: userEmail,
          companyName: companyName,
          returnUrl: "/dashboard/settings",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl
        return
      } else if (data.sessionId) {
        // Fallback: use Stripe.js redirect if sessionUrl not available
        const { loadStripe } = await import("@stripe/stripe-js")
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.sessionId })
          return
        }
      }

      throw new Error("No checkout URL available")
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast.error("Failed to start checkout", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      setIsProcessing(false)
    }
  }

  const handlePurchaseTokens = async () => {
    if (!selectedPackage) {
      toast.error("Please select a package")
      return
    }

    setIsTopUpProcessing(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const response = await fetch(`${apiBase}/api/stripe/purchase-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          packageId: selectedPackage,
          returnUrl: "/dashboard/settings",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl
        return
      }

      throw new Error("No checkout URL available")
    } catch (error) {
      console.error("Error creating token purchase session:", error)
      toast.error("Failed to start checkout", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      setIsTopUpProcessing(false)
    }
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="animate-slide-up delay-0">
        <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
          Sett<span className="italic text-emerald-400/90">ings</span>
        </h2>
        <p className="text-[14px] text-white/35">Manage your account, billing, and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up delay-1">
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-white/[0.02] border border-white/[0.06] mb-6 w-full sm:w-auto flex-wrap sm:flex-nowrap rounded-lg p-1">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none text-white/40 text-[12px] rounded-md"
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                Profile
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger
                  value="billing"
                  className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none text-white/40 text-[12px] rounded-md"
                >
                  <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                  Billing
                </TabsTrigger>
              )}
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none text-white/40 text-[12px] rounded-md"
              >
                <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none text-white/40 text-[12px] rounded-md"
              >
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-white/30" />
                    <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Profile</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/60 text-[13px]">Full Name</Label>
                      <Input id="name" defaultValue={user?.name} className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/60 text-[13px]">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email} className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-white/60 text-[13px]">Company Name</Label>
                      <Input id="company" className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30 placeholder:text-white/20" placeholder="Your Company" />
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-4 text-[13px] rounded-lg">
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isOwner && <TabsContent value="billing" className="mt-0 space-y-4">
              <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <CreditCard className="w-4 h-4 text-white/30" />
                    <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Subscription</span>
                  </div>

                  <div className="space-y-4">
                    {/* Trial Banner */}
                    {trialStatus?.isTrialActive && (
                      <div className="p-4 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-400/70" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-medium text-amber-400/90">Free Trial Active</p>
                            <p className="text-[11px] text-white/25 mt-0.5">
                              {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"} remaining
                              {trialStatus.trialEndsAt && <span> — expires {new Date(trialStatus.trialEndsAt).toLocaleDateString()}</span>}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="bg-amber-500/90 hover:bg-amber-400 text-black font-medium h-7 px-3 text-[11px] rounded-md"
                            onClick={() => setIsChangePlanModalOpen(true)}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Upgrade
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Current Plan */}
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400/70" />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-white/80">
                              {trialStatus?.isTrialActive ? "Free Trial" : `${billing.plan} Plan`}
                            </p>
                            {!trialStatus?.isTrialActive && (
                              <p className="text-[11px] text-white/25">Next billing: {billing.nextBilling}</p>
                            )}
                          </div>
                        </div>
                        {!trialStatus?.isTrialActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.04] h-7 px-3 text-[11px] rounded-md"
                            onClick={() => setIsChangePlanModalOpen(true)}
                          >
                            Change Plan
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-medium text-white/80">Payment Method</p>
                          <p className="text-[11px] text-white/25">{billing.paymentMethod}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.04] h-7 px-3 text-[11px] rounded-md">
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Token Top-Up */}
              <div className="p-4 rounded-xl bg-violet-500/[0.03] border border-violet-500/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5 text-violet-400/60" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white/80">Need More Tokens?</p>
                      <p className="text-[11px] text-white/25">One-time purchase, no plan change</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-violet-500/15 text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/[0.06] h-7 px-3 text-[11px] rounded-md"
                    onClick={() => setIsTopUpModalOpen(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Buy Tokens
                  </Button>
                </div>
              </div>

              {/* AI Model Selection */}
              <AiModelSelector />

              {/* Token Balance */}
              <div className="space-y-4">
                <span className="text-[14px] text-white/60 font-medium">Token Balance</span>
                <TokenBalanceDisplay variant="card" showUpgrade={true} />
                <TokenUsageHistory />
              </div>
            </TabsContent>}

            <TabsContent value="notifications" className="mt-0">
              <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Bell className="w-4 h-4 text-white/30" />
                    <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Notifications</span>
                  </div>
                  <div className="space-y-5">
                    {[
                      { key: "emailAlerts" as const, title: "Email Alerts", desc: "Receive email notifications" },
                      { key: "weeklyReports" as const, title: "Weekly Reports", desc: "Automated weekly summaries" },
                      { key: "renewalReminders" as const, title: "Renewal Reminders", desc: "Get notified before renewals" },
                      { key: "recommendations" as const, title: "Recommendations", desc: "New optimization suggestions" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-[13px] text-white/80">{item.title}</Label>
                          <p className="text-[11px] text-white/25">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key]}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, [item.key]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Shield className="w-4 h-4 text-white/30" />
                    <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Security</span>
                  </div>
                  <div className="space-y-3">
                    <Button variant="ghost" className="w-full justify-start border border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.04] h-10 text-[13px] rounded-lg">
                      <Key className="w-3.5 h-3.5 mr-2" />
                      Change Password
                    </Button>
                    <Button variant="ghost" className="w-full justify-start border border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.04] h-10 text-[13px] rounded-lg">
                      <Shield className="w-3.5 h-3.5 mr-2" />
                      Enable Two-Factor Authentication
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
            <CardContent className="p-4">
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Quick Links</span>
              <div className="space-y-1 mt-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white/40 hover:text-white/70 hover:bg-white/[0.04] h-9 text-[12px] rounded-lg"
                >
                  <Building2 className="w-3.5 h-3.5 mr-2" />
                  Company Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white/40 hover:text-white/70 hover:bg-white/[0.04] h-9 text-[12px] rounded-lg"
                >
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Token Top-Up Modal */}
      <Dialog open={isTopUpModalOpen} onOpenChange={(open) => {
        setIsTopUpModalOpen(open)
        if (!open) {
          setSelectedPackage("")
          setIsTopUpProcessing(false)
        }
      }}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] w-[96vw] sm:max-w-2xl max-h-[95vh] overflow-hidden p-0 gap-0 flex flex-col rounded-xl">
          {/* Header */}
          <div className="relative px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
            <button
              onClick={() => setIsTopUpModalOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-display text-white tracking-tight">
                Buy More Tokens
              </DialogTitle>
              <DialogDescription className="text-[13px] text-white/35">
                One-time purchase. Added to your balance, resets with billing cycle.
              </DialogDescription>
            </div>
          </div>

          {/* Packages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tokenPackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all duration-300",
                      "hover:scale-[1.01]",
                      isSelected
                        ? "border-emerald-400/50 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-10">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}

                    {pkg.savings && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/15">
                          {pkg.savings}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold",
                        isSelected
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-white/[0.04] border border-white/[0.06] text-white/50"
                      )}>
                        {pkg.tokens}
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">{pkg.label}</p>
                        <p className="text-xs text-gray-400">{pkg.perToken} per token</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white">
                        ${(pkg.priceCents / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">one-time</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {tokenPackages.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-[#0e0e10]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] text-white/20 order-2 sm:order-1">
                <Shield className="w-3 h-3 text-emerald-400/60" />
                <span>Secure checkout powered by Stripe</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] h-9 px-4 w-full sm:w-auto text-[13px] rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchaseTokens}
                  disabled={!selectedPackage || isTopUpProcessing}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-[13px] px-5 h-9 disabled:opacity-50 w-full sm:w-auto sm:min-w-[160px] rounded-lg"
                >
                  {isTopUpProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Purchase Tokens
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Plan Modal */}
      <Dialog open={isChangePlanModalOpen} onOpenChange={setIsChangePlanModalOpen}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] w-[96vw] sm:max-w-7xl max-h-[95vh] overflow-hidden p-0 gap-0 flex flex-col rounded-xl">
          {/* Header Section */}
          <div className="relative px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
            <button
              onClick={() => setIsChangePlanModalOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-display text-white tracking-tight">
                Choose Your Plan
              </DialogTitle>
              <DialogDescription className="text-[13px] text-white/35">
                Select the perfect plan for your business. Change anytime.
              </DialogDescription>
            </div>
          </div>

          {/* Plans Section */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-full mx-auto">
              {plans.map((plan, index) => {
                const isSelected = selectedPlan === plan.id
                const isPopular = plan.popular
                const planIcons = {
                  startup: Zap,
                  growth: Sparkles,
                  custom: Crown,
                }
                const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles

                return (
                  <div
                    key={plan.id}
                    className="relative group"
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-emerald-500 text-black text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider">
                          Most Popular
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={cn(
                        "relative w-full h-full p-4 sm:p-5 rounded-xl border-2 text-left transition-all duration-300",
                        "hover:scale-[1.01]",
                        isSelected
                          ? "border-emerald-400/50 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]",
                        isPopular && !isSelected && "border-emerald-500/15 bg-emerald-500/[0.02]"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-10">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}

                      <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            isSelected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.04] border border-white/[0.06]"
                          )}>
                            <Icon className={cn("w-4 h-4", isSelected ? "text-emerald-400" : "text-white/30")} />
                          </div>
                          <h3 className="text-[15px] font-semibold text-white tracking-tight">{plan.name}</h3>
                        </div>

                        <div className="flex items-baseline gap-1 mb-0.5">
                          <span className="text-2xl sm:text-3xl font-semibold text-white">{plan.price}</span>
                          <span className="text-white/25 text-[12px]">/{plan.period}</span>
                        </div>

                        <p className="text-white/30 mb-3 text-[11px] leading-relaxed">{plan.description}</p>

                        <ul className="space-y-1.5 mb-3">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Check className={cn("w-3 h-3 flex-shrink-0", isSelected ? "text-emerald-400" : "text-white/20")} strokeWidth={2.5} />
                              <span className={cn("text-[11px] sm:text-[12px] leading-snug", isSelected ? "text-white/70" : "text-white/35")}>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <div className={cn("pt-3 border-t", isSelected ? "border-emerald-500/15" : "border-white/[0.04]")}>
                          <div className={cn("flex items-center justify-center gap-1.5 text-[12px] font-medium", isSelected ? "text-emerald-400" : "text-white/30")}>
                            {isSelected ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Selected
                              </>
                            ) : (
                              <>
                                Select Plan
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-[#0e0e10]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] text-white/20 order-2 sm:order-1">
                <Shield className="w-3 h-3 text-emerald-400/60" />
                <span>Secure checkout powered by Stripe</span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsChangePlanModalOpen(false)}
                  className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] h-9 px-4 w-full sm:w-auto text-[13px] rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePlan}
                  disabled={!selectedPlan || isProcessing}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-[13px] px-5 h-9 disabled:opacity-50 w-full sm:w-auto sm:min-w-[160px] rounded-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Checkout
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
