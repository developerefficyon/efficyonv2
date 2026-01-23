"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  Briefcase,
  CheckCircle,
  CreditCard,
  Target,
  Check,
  Mail,
  Lock,
  User,
  Phone,
  Globe,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/auth-context"
import { PaymentForm as StripePaymentForm } from "@/components/payment-form-v2"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Education",
  "Consulting",
  "Real Estate",
  "Marketing & Advertising",
  "Other",
]

function OnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isProcessingPaymentSuccess, setIsProcessingPaymentSuccess] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Account (basic identity only)
    name: "",
    email: "",
    // Step 2: Company
    companyName: "",
    industry: "",
    employees: 25,
    phone: "",
    website: "",
    // Step 3: Goals
    primaryGoal: "",
    secondaryGoals: [] as string[],
    // Step 4: Plan
    plan: "",
    // Step 6: Billing
    billingName: "",
    billingEmail: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill form data from user profile on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // Get user email from session
          const userEmail = session.user.email || ""

          // Fetch profile to get full_name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", session.user.id)
            .maybeSingle()

          // Pre-fill form with user data
          setFormData((prev) => ({
            ...prev,
            name: profile?.full_name || session.user.user_metadata?.name || "",
            email: profile?.email || userEmail || "",
            billingEmail: profile?.email || userEmail || "",
            billingName: profile?.full_name || session.user.user_metadata?.name || "",
          }))
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }

    loadUserData()
  }, [])

  // Check if returning from successful Stripe payment or trial setup
  useEffect(() => {
    const paymentStatus = searchParams.get("payment")
    const trialStatus = searchParams.get("trial")

    if (paymentStatus === "success" || trialStatus === "success") {
      // Payment or trial setup was successful, complete onboarding and go to dashboard
      setIsProcessingPaymentSuccess(true)
      const handleSuccess = async () => {
        try {
          await completeOnboarding()
        } catch (err) {
          console.error("Error completing onboarding after payment/trial", err)
          // Even if there's an error, redirect to dashboard
          router.push("/dashboard")
        }
      }
      handleSuccess()
    } else if (paymentStatus === "canceled") {
      // Payment was canceled, show error
      setPaymentError("Payment was canceled. Please try again.")
    } else if (trialStatus === "canceled") {
      // Trial setup was canceled, show error
      setPaymentError("Trial setup was canceled. Please try again.")
    }
  }, [searchParams, router])

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.name) newErrors.name = "Name is required"
      if (!formData.email) newErrors.email = "Email is required"
    }

    if (step === 2) {
      if (!formData.companyName) newErrors.companyName = "Company name is required"
      if (!formData.industry) newErrors.industry = "Industry is required"
      if (!formData.employees || formData.employees < 1)
        newErrors.employees = "Number of employees is required"
    }

    if (step === 3) {
      // Goals step - no required validation for now
    }

    if (step === 4) {
      if (!formData.plan || formData.plan.trim() === "") {
        newErrors.plan = "Please select a plan"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    try {
      // For step 4 (plan selection), handle Stripe checkout for paid plans
      if (currentStep === 4) {
        if (!formData.plan || formData.plan.trim() === "") {
          setErrors({ ...errors, plan: "Please select a plan" })
          window.scrollTo({ top: 0, behavior: 'smooth' })
          console.warn("Step 4: No plan selected")
          return
        }
        
        console.log("Step 4: Proceeding with plan:", formData.plan)
        
        // For free trial, redirect to Stripe setup mode to collect card details
        if (formData.plan === "Free Trial") {
          console.log("Step 4: Free Trial selected, redirecting to Stripe setup mode")
          setIsSubmitting(true)

          try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
            const {
              data: { session },
            } = await supabase.auth.getSession()
            const accessToken = session?.access_token

            // Save company first before redirecting to Stripe
            if (formData.companyName && formData.companyName.trim()) {
              try {
                await fetch(`${apiBase}/api/company`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                  body: JSON.stringify({
                    name: formData.companyName.trim(),
                    size: formData.employees ? String(formData.employees) : undefined,
                    industry: formData.industry || undefined,
                    website: formData.website || undefined,
                    phone: formData.phone || undefined,
                  }),
                })
              } catch (err) {
                console.error("Error saving company before trial setup:", err)
              }
            }

            // Create trial setup session (collects card without charging)
            const response = await fetch(`${apiBase}/api/stripe/create-trial-setup`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify({
                email: formData.email,
                companyName: formData.companyName || formData.name,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || "Failed to create trial session")
            }

            const data = await response.json()

            // Redirect to Stripe setup mode
            if (data.sessionUrl) {
              window.location.href = data.sessionUrl
              return
            }

            throw new Error("No checkout URL available")
          } catch (error) {
            console.error("Error creating trial session:", error)
            setPaymentError(error instanceof Error ? error.message : "Failed to start trial setup")
            setIsSubmitting(false)
          }
          return
        }
        
        // For non-free-trial plans, save company first, then redirect to Stripe checkout
        console.log("Step 4: Paid plan selected, saving company and redirecting to Stripe checkout")
        setIsSubmitting(true)
        
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
          const {
            data: { session },
          } = await supabase.auth.getSession()
          const accessToken = session?.access_token

          const commonOptions: RequestInit = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          }

          // Save company first before redirecting to Stripe
          if (formData.companyName && formData.companyName.trim()) {
            try {
              const companyRes = await fetch(`${apiBase}/api/company`, {
                ...commonOptions,
                body: JSON.stringify({
                  name: formData.companyName.trim(),
                  size: formData.employees ? String(formData.employees) : undefined,
                  industry: formData.industry || undefined,
                  website: formData.website || undefined,
                  phone: formData.phone || undefined,
                }),
              })
              if (!companyRes.ok) {
                const errorText = await companyRes.text()
                console.error("Failed to save company before checkout:", errorText)
                // Continue anyway - company can be saved later
              } else {
                console.log("Company saved successfully before checkout")
              }
            } catch (err) {
              console.error("Error saving company before checkout:", err)
              // Continue anyway - company can be saved later
            }
          }

          // Create Stripe checkout session
          const response = await fetch(`${apiBase}/api/stripe/create-payment-intent`, {
            ...commonOptions,
            body: JSON.stringify({
              planTier: formData.plan.toLowerCase(),
              email: formData.email,
              companyName: formData.companyName || formData.name,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Failed to create checkout session")
          }

          const data = await response.json()
          
          // Immediately redirect to Stripe checkout
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
          setPaymentError(error instanceof Error ? error.message : "Failed to start checkout")
          setIsSubmitting(false)
        }
        
        return
      }
      
      // For other steps, use normal validation
      const isValid = validateStep(currentStep)
      
      if (isValid) {
        if (currentStep < totalSteps) {
          setCurrentStep(currentStep + 1)
        } else {
          await completeOnboarding()
        }
      } else {
        // Scroll to top to show errors
        window.scrollTo({ top: 0, behavior: 'smooth' })
        console.warn("Validation failed for step", currentStep, "Errors:", errors)
      }
    } catch (error) {
      console.error("Error in handleNext:", error)
      // Even if there's an error, try to proceed if we're on step 4 and have a plan
      if (currentStep === 4 && formData.plan && formData.plan !== "Free Trial") {
        console.log("Attempting to proceed despite error...")
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setPaymentError(null)
    }
  }

  const handlePaymentSuccess = async () => {
    try {
      await completeOnboarding()
    } catch (err) {
      console.error("Error completing onboarding after payment", err)
      setPaymentError("Failed to complete onboarding after payment")
    }
  }

  const completeOnboarding = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

      // Get current session for auth
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const commonOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      }

      // 1) Company - only save if company name is provided
      if (formData.companyName && formData.companyName.trim()) {
        try {
          const companyRes = await fetch(`${apiBase}/api/company`, {
            ...commonOptions,
            body: JSON.stringify({
              name: formData.companyName.trim(),
              size: formData.employees ? String(formData.employees) : undefined,
              industry: formData.industry || undefined,
              website: formData.website || undefined,
              phone: formData.phone || undefined,
            }),
          })
          if (!companyRes.ok) {
            const errorText = await companyRes.text()
            console.error("Failed to save company", errorText)
          } else {
            console.log("Company saved successfully")
          }
        } catch (err) {
          console.error("Network error saving company", err)
        }
      } else {
        console.warn("Skipping company save - company name not provided")
      }


      // 3) Plans (simple placeholder: one plan for Efficyon itself)
      if (formData.plan) {
        try {
          const plansRes = await fetch(`${apiBase}/api/plans`, {
            ...commonOptions,
            body: JSON.stringify({
              plans: [
                {
                  tool_name: "Efficyon",
                  current_plan: formData.plan,
                  seats: formData.employees || undefined,
                  billing_cycle: "monthly",
                },
              ],
            }),
          })
          if (!plansRes.ok) {
            console.error("Failed to save plans", await plansRes.text())
          }
        } catch (err) {
          console.error("Network error saving plans", err)
        }
      }

      // 4) Alerts (basic: use billing email for alerts)
      try {
        const alertsRes = await fetch(`${apiBase}/api/alerts`, {
          ...commonOptions,
          body: JSON.stringify({
            email_for_alerts: formData.billingEmail || formData.email || undefined,
            slack_channel: undefined,
            alert_types: {
              renewal: true,
              license_waste: true,
            },
            frequency: "weekly",
          }),
        })
        if (!alertsRes.ok) {
          console.error("Failed to save alerts", await alertsRes.text())
        }
      } catch (err) {
        console.error("Network error saving alerts", err)
      }

      // 5) Mark onboarding as completed on the profile
      try {
        const completeRes = await fetch(`${apiBase}/api/profile/onboarding-complete`, {
          ...commonOptions,
        })
        if (!completeRes.ok) {
          console.error("Failed to mark onboarding complete", await completeRes.text())
        }
      } catch (err) {
        console.error("Network error marking onboarding complete", err)
      }

    console.log("Onboarding complete:", formData)
    router.push("/dashboard")
    } catch (error) {
      console.error("Error completing onboarding", error)
    } finally {
      setIsSubmitting(false)
    }
  }


  const toggleGoal = (goal: string) => {
    // Don't allow selecting the primary goal as a secondary goal
    if (goal === formData.primaryGoal) {
      return
    }
    setFormData((prev) => ({
      ...prev,
      secondaryGoals: prev.secondaryGoals.includes(goal)
        ? prev.secondaryGoals.filter((g) => g !== goal)
        : [...prev.secondaryGoals, goal],
    }))
  }

  const getRecommendedPlan = () => {
    if (formData.employees <= 10) return "startup"
    if (formData.employees <= 50) return "growth"
    return "custom"
  }

  type Plan = {
    id: string
    name: string
    price: string
    period: string
    description: string
    features: string[]
    isTrial?: boolean
    discount?: string
    popular?: boolean
    originalPrice?: string
  }

  const plans: Plan[] = [
    {
      id: "Free Trial",
      name: "7-Day Free Trial",
      price: "Free",
      period: "7 days",
      description: "Try Efficyon risk-free with one tool",
      features: [
        "7 days full access",
        "Run analysis on your tools",
        "View sample insights",
        "Upgrade to Startup at 50% off",
      ],
      isTrial: true,
    },
    {
      id: "startup",
      name: "Startup",
      price: "$39",
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
      price: "$119",
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
      price: "$299",
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

  const goals = [
    "Reduce software costs",
    "Improve workflow efficiency",
    "Identify unused licenses",
    "Automate manual processes",
    "Better tool integration",
    "Increase ROI",
  ]

  // If processing payment success, show loading and don't render the form
  if (isProcessingPaymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="w-full max-w-md bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-center text-white">Completing your subscription...</p>
              <p className="text-center text-sm text-gray-400">Redirecting to dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-400">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <Card className="bg-black/80 backdrop-blur-xl border-white/10 shadow-2xl">
            {/* Step 1: Account Creation */}
            {currentStep === 1 && (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-white">
                    Create Your Account
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Let's start with your basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="you@company.com"
                        disabled
                        title="Email cannot be changed (from your account)"
                      />
                    </div>
                    {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
                    <p className="text-xs text-gray-500">Email is from your account and cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    {/* Password fields removed – login already handled separately */}
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2: Company Information */}
            {currentStep === 2 && (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-white">
                    Company Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Tell us about your company
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-gray-300">
                      Company Name *
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) =>
                          setFormData({ ...formData, companyName: e.target.value })
                        }
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="Acme Corporation"
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-sm text-red-400">{errors.companyName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-gray-300">
                      Industry *
                    </Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => setFormData({ ...formData, industry: value })}
                    >
                      <SelectTrigger
                        id="industry"
                        className="w-full bg-black/50 border-white/10 text-white hover:bg-black/70 focus:border-cyan-500 [&>span]:text-white"
                      >
                        <SelectValue placeholder="Select industry" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/10 backdrop-blur-xl">
                        {industries.map((ind) => (
                          <SelectItem
                            key={ind}
                            value={ind}
                            className="text-white hover:bg-cyan-500/30 hover:text-white focus:bg-cyan-500/30 focus:text-white data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer"
                          >
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industry && <p className="text-sm text-red-400">{errors.industry}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employees" className="text-gray-300">
                        Number of Employees *
                      </Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="employees"
                          type="number"
                          min="1"
                          value={formData.employees}
                          onChange={(e) =>
                            setFormData({ ...formData, employees: parseInt(e.target.value) || 0 })
                          }
                          className="pl-10 bg-black/50 border-white/10 text-white"
                        />
                      </div>
                      {errors.employees && (
                        <p className="text-sm text-red-400">{errors.employees}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-10 bg-black/50 border-white/10 text-white"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-gray-300">
                      Company Website
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="https://www.company.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 3: Goals & Preferences */}
            {currentStep === 3 && (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-white">
                    Your Goals & Preferences
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Help us personalize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Primary Goal</Label>
                    <Select
                      value={formData.primaryGoal}
                      onValueChange={(value) => {
                        // Remove the new primary goal from secondary goals if it was there
                        setFormData((prev) => ({
                          ...prev,
                          primaryGoal: value,
                          secondaryGoals: prev.secondaryGoals.filter((g) => g !== value),
                        }))
                      }}
                    >
                      <SelectTrigger className="w-full bg-black/50 border-white/10 text-white hover:bg-black/70 focus:border-cyan-500 [&>span]:text-white">
                        <SelectValue placeholder="Select your primary goal" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/10 backdrop-blur-xl">
                        {goals.map((goal) => (
                          <SelectItem
                            key={goal}
                            value={goal}
                            className="text-white hover:bg-cyan-500/30 hover:text-white focus:bg-cyan-500/30 focus:text-white data-[highlighted]:bg-cyan-500/30 data-[highlighted]:text-white cursor-pointer"
                          >
                            {goal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Secondary Goals (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {goals.map((goal) => {
                        const isPrimaryGoal = goal === formData.primaryGoal
                        const isSelected = formData.secondaryGoals.includes(goal)
                        const isDisabled = isPrimaryGoal
                        
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => toggleGoal(goal)}
                            disabled={isDisabled}
                            className={cn(
                              "p-3 rounded-lg border text-left transition-all",
                              isSelected
                                ? "border-cyan-500 bg-cyan-500/10 text-white"
                                : "border-white/10 bg-black/50 text-gray-400 hover:border-white/30",
                              isDisabled && "opacity-50 cursor-not-allowed hover:border-white/10"
                            )}
                            title={isDisabled ? "This is already selected as your primary goal" : undefined}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 border rounded",
                                  isDisabled ? "border-gray-600" : "border-gray-400"
                                )} />
                              )}
                              <span className={cn(
                                "text-sm",
                                isDisabled && "text-gray-600"
                              )}>
                                {goal}
                                {isDisabled && " (Primary)"}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 4: Plan Selection */}
            {currentStep === 4 && (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-white">
                    Choose Your Plan
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Based on {formData.employees} employees, we recommend{" "}
                    <span className="text-cyan-400 font-semibold">
                      {getRecommendedPlan()}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          console.log("Plan selected:", plan.id)

                          // Clear any previous plan errors
                          const newErrors = { ...errors }
                          delete newErrors.plan
                          setErrors(newErrors)

                          setFormData((prev) => ({ ...prev, plan: plan.id }))

                          console.log("Plan state updated to:", plan.id)
                        }}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all relative",
                          formData.plan === plan.id
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-white/10 bg-black/50 hover:border-white/30",
                          plan.popular && "ring-2 ring-blue-500/50",
                          plan.isTrial && "ring-2 ring-green-500/50"
                        )}
                      >
                        {plan.popular && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full mb-2 inline-block">
                            Popular
                          </span>
                        )}
                        {plan.isTrial && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full mb-2 inline-block">
                            Try Free
                          </span>
                        )}
                        {plan.discount && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full mb-2 inline-block">
                            {plan.discount}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-bold text-white">{plan.price}</span>
                          {plan.originalPrice && (
                            <span className="text-sm text-gray-500 line-through ml-1">
                              {plan.originalPrice}
                            </span>
                          )}
                          <span className="text-sm text-gray-400">/{plan.period}</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{plan.description}</p>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                              <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                  {errors.plan && <p className="text-sm text-red-400 mt-2">{errors.plan}</p>}
                  {paymentError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      {paymentError}
                    </div>
                  )}
                  {isSubmitting && formData.plan !== "Free Trial" && (
                    <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Redirecting to Stripe checkout...</span>
                      </div>
                    </div>
                  )}
                  {formData.plan === "Free Trial" && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-400">
                        <strong>Great choice!</strong> You'll get 7 days to explore Efficyon. 
                        After your trial, upgrade to Startup at 50% off to unlock full analysis and insights.
                      </p>
                    </div>
                  )}
                </CardContent>
              </>
            )}


            {/* Navigation Buttons */}
            <CardContent className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="border-white/10 bg-black/50 text-white disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        await handleNext()
                      } catch (error) {
                        console.error("Error in Next button click:", error)
                        setIsSubmitting(false)
                      }
                    }}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {currentStep === totalSteps
                      ? isSubmitting
                        ? "Completing..."
                        : "Complete Setup"
                      : isSubmitting
                      ? "Processing..."
                      : "Next"}
                    {currentStep < totalSteps && !isSubmitting && (
                      <ArrowRight className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    }>
      <OnboardingPageContent />
    </Suspense>
  )
}
