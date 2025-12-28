"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabaseClient"
import { getValidSessionToken } from "@/lib/auth-helpers"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    price: "$29.99",
    period: "month",
    description: "For companies with 1-10 employees",
    features: [
      "5 integrations",
      "10 monthly credits",
      "Email support",
      "Basic analytics",
      "Up to 3 team members",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$99.99",
    period: "month",
    description: "For companies with 11-50 employees",
    features: [
      "15 integrations",
      "50 monthly credits",
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
    price: "$299.99",
    period: "month",
    description: "For companies with 50+ employees",
    features: [
      "Unlimited integrations",
      "200 monthly credits",
      "Dedicated support",
      "Custom analytics",
      "Unlimited team members",
      "Custom features",
    ],
  },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
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

  // Check for payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment")
    if (paymentStatus === "success") {
      toast.success("Plan changed successfully!", {
        description: "Your subscription has been updated.",
      })
      // Clean up URL
      router.replace("/dashboard/settings")
    } else if (paymentStatus === "canceled") {
      toast.error("Payment canceled", {
        description: "Your plan change was canceled.",
      })
      // Clean up URL
      router.replace("/dashboard/settings")
    }
  }, [searchParams, router])

  const handleChangePlan = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan")
      return
    }

    setIsProcessing(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getValidSessionToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      // Get user's company name if available
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userEmail = session?.user?.email || user?.email || ""

      // Get company name from profile or use user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_id")
        .eq("id", user?.id)
        .maybeSingle()

      let companyName = profile?.full_name || user?.name || ""
      
      // Try to get company name from companies table
      if (profile?.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", profile.company_id)
          .maybeSingle()
        if (company?.name) {
          companyName = company.name
        }
      }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-sm sm:text-base text-gray-400">Manage your account, billing, and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-black/50 border border-white/10 mb-6 w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap">
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="billing"
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="security"
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Profile</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Your account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      defaultValue={user?.name}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user?.email}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-gray-300">
                      Company Name
                    </Label>
                    <Input
                      id="company"
                      className="bg-black/50 border-white/10 text-white"
                      placeholder="Your Company"
                    />
                  </div>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Billing</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Manage your subscription and payment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-white/5 via-white/5 to-transparent border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                          <CreditCard className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Current Plan</p>
                          <p className="text-xs text-gray-400 mt-0.5">{billing.plan} Plan</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 hover:text-white hover:border-cyan-500/50 w-full sm:w-auto shadow-lg shadow-cyan-500/10 transition-all"
                        onClick={() => setIsChangePlanModalOpen(true)}
                      >
                        <Sparkles className="w-3 h-3 mr-2" />
                        Change Plan
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                      <span>Next billing: {billing.nextBilling}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">Payment Method</p>
                        <p className="text-xs text-gray-400">{billing.paymentMethod}</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-white/10 bg-black/50 text-white w-full sm:w-auto">
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Notifications</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure your notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Email Alerts</Label>
                      <p className="text-sm text-gray-400">Receive email notifications</p>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, emailAlerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Weekly Reports</Label>
                      <p className="text-sm text-gray-400">Automated weekly summaries</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, weeklyReports: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Renewal Reminders</Label>
                      <p className="text-sm text-gray-400">Get notified before renewals</p>
                    </div>
                    <Switch
                      checked={notifications.renewalReminders}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, renewalReminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Recommendations</Label>
                      <p className="text-sm text-gray-400">New optimization suggestions</p>
                    </div>
                    <Switch
                      checked={notifications.recommendations}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, recommendations: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Security</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full border-white/10 bg-black/50 text-white">
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full border-white/10 bg-black/50 text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Company Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Plan Modal */}
      <Dialog open={isChangePlanModalOpen} onOpenChange={setIsChangePlanModalOpen}>
        <DialogContent className="bg-black border-white/10 backdrop-blur-2xl max-w-7xl max-h-[95vh] overflow-hidden p-0 gap-0">
          {/* Header Section */}
          <div className="relative p-8 border-b border-white/10 bg-gradient-to-br from-black via-black to-black/95">
            <button
              onClick={() => setIsChangePlanModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/30 mb-4">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
              <DialogTitle className="text-4xl font-bold text-white tracking-tight">
                Choose Your Plan
              </DialogTitle>
              <DialogDescription className="text-lg text-gray-300 max-w-2xl mx-auto">
                Select the perfect plan for your business. Upgrade or downgrade anytime.
              </DialogDescription>
            </div>
          </div>

          {/* Plans Section */}
          <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
                    className={cn(
                      "relative group",
                      isPopular && "lg:-mt-4 lg:mb-4"
                    )}
                  >
                    {/* Popular Badge - Outside Card */}
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-xl shadow-blue-500/50 animate-pulse">
                          ⭐ MOST POPULAR
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={cn(
                        "relative w-full h-full p-8 rounded-2xl border-2 text-left transition-all duration-500",
                        "hover:scale-[1.02] hover:shadow-2xl",
                        isSelected
                          ? "border-cyan-400 bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent shadow-[0_0_50px_rgba(34,211,238,0.4)] ring-4 ring-cyan-500/20"
                          : "border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent hover:border-white/20 hover:bg-white/10",
                        isPopular && !isSelected && "border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent"
                      )}
                    >
                      {/* Selected Checkmark - Top Right */}
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-cyan-500/50 z-10 animate-in zoom-in-50 duration-300">
                          <Check className="w-6 h-6 text-white font-bold" />
                        </div>
                      )}

                      {/* Background Glow Effect */}
                      {isSelected && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 animate-pulse" />
                      )}

                      {/* Content */}
                      <div className="relative z-10">
                        {/* Icon */}
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300",
                          isSelected
                            ? "bg-gradient-to-br from-cyan-500/40 to-blue-500/40 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/30"
                            : "bg-white/10 border border-white/20 group-hover:bg-white/15 group-hover:border-white/30"
                        )}>
                          <Icon className={cn(
                            "w-7 h-7 transition-all duration-300",
                            isSelected 
                              ? "text-cyan-300 drop-shadow-lg" 
                              : "text-gray-400 group-hover:text-cyan-400"
                          )} />
                        </div>

                        {/* Plan Name */}
                        <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">
                          {plan.name}
                        </h3>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-5xl font-extrabold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                            {plan.price.split('.')[0]}
                          </span>
                          <span className="text-2xl font-bold text-gray-400">
                            .{plan.price.split('.')[1]}
                          </span>
                          <span className="text-gray-500 text-lg ml-1">/{plan.period}</span>
                        </div>

                        {/* Description */}
                        <p className="text-gray-400 mb-8 min-h-[2.5rem] text-sm leading-relaxed">
                          {plan.description}
                        </p>

                        {/* Features List */}
                        <ul className="space-y-4 mb-8">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 group/item">
                              <div className={cn(
                                "mt-1 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300",
                                isSelected
                                  ? "bg-cyan-500/20 border-2 border-cyan-400/50 shadow-md shadow-cyan-500/20"
                                  : "bg-white/5 border border-white/10 group-hover/item:border-cyan-400/30"
                              )}>
                                <Check className={cn(
                                  "w-4 h-4 transition-all duration-300",
                                  isSelected 
                                    ? "text-cyan-300 font-bold" 
                                    : "text-gray-500 group-hover/item:text-cyan-400"
                                )} strokeWidth={3} />
                              </div>
                              <span className={cn(
                                "text-base leading-relaxed transition-colors duration-300",
                                isSelected ? "text-gray-100" : "text-gray-400 group-hover/item:text-gray-200"
                              )}>
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* CTA Section */}
                        <div className={cn(
                          "pt-6 border-t transition-all duration-300",
                          isSelected
                            ? "border-cyan-400/40"
                            : "border-white/10 group-hover:border-white/20"
                        )}>
                          <div className={cn(
                            "flex items-center justify-center gap-2 text-base font-semibold transition-all duration-300",
                            isSelected
                              ? "text-cyan-300"
                              : "text-gray-400 group-hover:text-white"
                          )}>
                            {isSelected ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <span>Currently Selected</span>
                              </>
                            ) : (
                              <>
                                <span>Select This Plan</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover Gradient Overlay */}
                      {!isSelected && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Action Footer */}
            <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/10">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-300">Secure checkout</span>
                    <span className="text-gray-500 ml-1">powered by Stripe</span>
                  </div>
                </div>
                
                <div className="flex gap-4 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setIsChangePlanModalOpen(false)}
                    className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:border-white/20 px-6 h-11 flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangePlan}
                    disabled={!selectedPlan || isProcessing}
                    className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-base px-8 h-11 shadow-2xl shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none min-w-[200px] transition-all duration-300 hover:scale-105"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to Checkout
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
