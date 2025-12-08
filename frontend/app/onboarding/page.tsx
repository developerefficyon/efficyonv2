"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"

// Tools from ROI calculator
const tools = [
  { name: "Microsoft 365", category: "Productivity" },
  { name: "HubSpot", category: "CRM/Marketing" },
  { name: "QuickBooks", category: "Finance" },
  { name: "Fortnox", category: "Finance" },
  { name: "Slack", category: "Communication" },
  { name: "Salesforce", category: "CRM" },
  { name: "Google Workspace", category: "Productivity" },
  { name: "Zoom", category: "Communication" },
  { name: "Asana", category: "Project Mgmt" },
  { name: "Jira", category: "Project Mgmt" },
  { name: "Notion", category: "Productivity" },
  { name: "Dropbox", category: "Storage" },
  { name: "Adobe Creative", category: "Design" },
  { name: "Monday.com", category: "Project Mgmt" },
  { name: "Zendesk", category: "Support" },
  { name: "Mailchimp", category: "Marketing" },
  { name: "Figma", category: "Design" },
  { name: "Airtable", category: "Database" },
  { name: "Confluence", category: "Documentation" },
  { name: "Miro", category: "Collaboration" },
]

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

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6

  const [isSubmitting, setIsSubmitting] = useState(false)

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
    // Step 3: Tools
    selectedTools: [] as string[],
    // Step 4: Goals
    primaryGoal: "",
    secondaryGoals: [] as string[],
    // Step 5: Plan
    plan: "",
    // Step 6: Billing
    billingName: "",
    billingEmail: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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
      // For free trial, allow 1 tool; otherwise at least 1
      if (formData.selectedTools.length === 0) {
        newErrors.selectedTools = "Please select at least one tool"
      }
    }

    if (step === 4) {
      // Goals step - no required validation for now
    }

    if (step === 5) {
      if (!formData.plan || formData.plan.trim() === "") {
        newErrors.plan = "Please select a plan"
      }
    }

    if (step === 6) {
      // Billing only required if not free trial
      if (formData.plan !== "Free Trial") {
      if (!formData.billingName) newErrors.billingName = "Billing name is required"
      if (!formData.billingEmail) newErrors.billingEmail = "Billing email is required"
      if (!formData.cardNumber) newErrors.cardNumber = "Card number is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    try {
      // For step 5, validate plan selection
      if (currentStep === 5) {
        if (!formData.plan || formData.plan.trim() === "") {
          setErrors({ ...errors, plan: "Please select a plan" })
          window.scrollTo({ top: 0, behavior: 'smooth' })
          console.warn("Step 5: No plan selected")
          return
        }
        
        console.log("Step 5: Proceeding with plan:", formData.plan)
        
        // Skip billing step if free trial is selected
        if (formData.plan === "Free Trial") {
          console.log("Step 5: Free Trial selected, skipping to submit")
          await handleSubmit()
          return
        }
        
        // For non-free-trial plans, go to step 6
        console.log("Step 5: Paid plan selected, going to step 6")
        setCurrentStep(6)
        return
      }
      
      // For other steps, use normal validation
      const isValid = validateStep(currentStep)
      
      if (isValid) {
        if (currentStep < totalSteps) {
          setCurrentStep(currentStep + 1)
        } else {
          await handleSubmit()
        }
      } else {
        // Scroll to top to show errors
        window.scrollTo({ top: 0, behavior: 'smooth' })
        console.warn("Validation failed for step", currentStep, "Errors:", errors)
      }
    } catch (error) {
      console.error("Error in handleNext:", error)
      // Even if there's an error, try to proceed if we're on step 5 and have a plan
      if (currentStep === 5 && formData.plan && formData.plan !== "Free Trial") {
        console.log("Attempting to proceed despite error...")
        setCurrentStep(6)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
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

      // 1) Company
      try {
        const companyRes = await fetch(`${apiBase}/api/company`, {
          ...commonOptions,
          body: JSON.stringify({
            name: formData.companyName,
            size: formData.employees ? String(formData.employees) : undefined,
            industry: formData.industry || undefined,
            website: formData.website || undefined,
            phone: formData.phone || undefined,
          }),
        })
        if (!companyRes.ok) {
          console.error("Failed to save company", await companyRes.text())
        }
      } catch (err) {
        console.error("Network error saving company", err)
      }

      // 2) Integrations (from selected tools)
      if (formData.selectedTools.length > 0) {
        try {
          const integrationsRes = await fetch(`${apiBase}/api/integrations`, {
            ...commonOptions,
            body: JSON.stringify({
              integrations: formData.selectedTools.map((toolName) => ({
                tool_name: toolName,
                connection_type: "api_key", // placeholder; real OAuth/API key screens later
              })),
            }),
          })
          if (!integrationsRes.ok) {
            console.error("Failed to save integrations", await integrationsRes.text())
          }
        } catch (err) {
          console.error("Network error saving integrations", err)
        }
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

  const toggleTool = (toolName: string) => {
    setFormData((prev) => {
      // If free trial is already selected, limit to 1 tool
      const isFreeTrial = prev.plan === "Free Trial"
      
      if (prev.selectedTools.includes(toolName)) {
        return {
      ...prev,
          selectedTools: prev.selectedTools.filter((t) => t !== toolName),
        }
      } else {
        // For free trial, only allow 1 tool
        if (isFreeTrial && prev.selectedTools.length >= 1) {
          return prev // Don't add more tools
        }
        return {
          ...prev,
          selectedTools: [...prev.selectedTools, toolName],
        }
      }
    })
  }

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      secondaryGoals: prev.secondaryGoals.includes(goal)
        ? prev.secondaryGoals.filter((g) => g !== goal)
        : [...prev.secondaryGoals, goal],
    }))
  }

  const getRecommendedPlan = () => {
    if (formData.employees <= 10) return "Startup"
    if (formData.employees <= 50) return "Growth"
    return "Enterprise"
  }

  const plans = [
    {
      id: "Free Trial",
      name: "7-Day Free Trial",
      price: "Free",
      period: "7 days",
      description: "Try Efficyon risk-free with one tool",
      features: [
        "7 days full access",
        "Choose 1 tool to connect",
        "Run analysis on selected tool",
        "View sample insights",
        "Upgrade to Startup at 50% off",
      ],
      isTrial: true,
    },
    {
      id: "Startup",
      name: "Startup",
      price: "$19.50",
      originalPrice: "$39",
      period: "month",
      description: "For companies with 1-10 employees",
      features: [
        "AI-driven process analysis",
        "Monthly optimization reports",
        "Email support",
        "Basic integrations",
        "ROI tracking",
      ],
      discount: "50% off for new customers",
    },
    {
      id: "Growth",
      name: "Growth",
      price: "$119",
      period: "month",
      description: "For companies with 11-50 employees",
      features: [
        "Everything in Startup +",
        "Advanced AI analysis",
        "Custom automations",
        "Priority support",
        "API integrations",
        "Team training included",
      ],
      popular: true,
    },
    {
      id: "Enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "month",
      description: "For companies with 50+ employees",
      features: [
        "Everything in Growth +",
        "Dedicated team",
        "Custom AI model",
        "On-premise deployment",
        "SLA guarantee",
        "Quarterly strategy review",
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
                      />
                    </div>
                    {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
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
                    <select
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Select industry</option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
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

            {/* Step 3: Tools & Systems */}
            {currentStep === 3 && (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-white">
                    Your Current Tools & Systems
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Select the tools your company currently uses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {formData.plan === "Free Trial" && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-400">
                        <strong>Free Trial:</strong> You can select 1 tool to connect and run analysis on during your 7-day trial.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {tools.map((tool) => {
                      const isFreeTrial = formData.plan === "Free Trial"
                      const isDisabled = isFreeTrial && 
                        formData.selectedTools.length >= 1 && 
                        !formData.selectedTools.includes(tool.name)
                      
                      return (
                      <button
                        key={tool.name}
                        onClick={() => toggleTool(tool.name)}
                          disabled={isDisabled}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all",
                          formData.selectedTools.includes(tool.name)
                            ? "border-cyan-500 bg-cyan-500/10 text-white"
                              : "border-white/10 bg-black/50 text-gray-400 hover:border-white/30",
                            isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {formData.selectedTools.includes(tool.name) ? (
                            <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border border-gray-400 rounded flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{tool.name}</p>
                            <p className="text-xs text-gray-500">{tool.category}</p>
                          </div>
                        </div>
                      </button>
                      )
                    })}
                  </div>
                  {errors.selectedTools && (
                    <p className="text-sm text-red-400 mt-2">{errors.selectedTools}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-4">
                    Selected: {formData.selectedTools.length} tool{formData.selectedTools.length !== 1 ? 's' : ''}
                    {formData.plan === "Free Trial" && formData.selectedTools.length >= 1 && " (Free trial limit reached)"}
                  </p>
                </CardContent>
              </>
            )}

            {/* Step 4: Goals & Preferences */}
            {currentStep === 4 && (
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
                    <select
                      value={formData.primaryGoal}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryGoal: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Select your primary goal</option>
                      {goals.map((goal) => (
                        <option key={goal} value={goal}>
                          {goal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Secondary Goals (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {goals.map((goal) => (
                        <button
                          key={goal}
                          onClick={() => toggleGoal(goal)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-all",
                            formData.secondaryGoals.includes(goal)
                              ? "border-cyan-500 bg-cyan-500/10 text-white"
                              : "border-white/10 bg-black/50 text-gray-400 hover:border-white/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {formData.secondaryGoals.includes(goal) ? (
                              <CheckCircle className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <div className="w-4 h-4 border border-gray-400 rounded" />
                            )}
                            <span className="text-sm">{goal}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 5: Plan Selection */}
            {currentStep === 5 && (
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
                          
                          // If selecting free trial and multiple tools are selected, keep only the first one
                          if (plan.id === "Free Trial" && formData.selectedTools.length > 1) {
                            setFormData((prev) => ({ 
                              ...prev, 
                              plan: plan.id,
                              selectedTools: [prev.selectedTools[0]]
                            }))
                          } else {
                            setFormData((prev) => ({ ...prev, plan: plan.id }))
                          }
                          
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
                  {formData.plan === "Free Trial" && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-400">
                        <strong>Great choice!</strong> You'll get 7 days to explore Efficyon with one tool ({formData.selectedTools[0] || 'selected tool'}). 
                        After your trial, upgrade to Startup at 50% off to unlock full analysis and insights.
                      </p>
                    </div>
                  )}
                  {formData.plan === "Free Trial" && formData.selectedTools.length === 0 && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        <strong>Note:</strong> Please select at least one tool in step 3 to use with your free trial.
                      </p>
                    </div>
                  )}
                </CardContent>
              </>
            )}

            {/* Step 6: Billing - Only shown if not Free Trial */}
            {currentStep === 6 && (
              <>
                {formData.plan === "Free Trial" ? (
                  <>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-2xl font-bold text-white">
                        Ready to Start Your Trial!
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        No payment required for your 7-day free trial
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                        <p className="text-lg text-green-400 mb-2">
                          🎉 Your free trial is ready!
                        </p>
                        <p className="text-sm text-gray-300 mb-4">
                          You'll have 7 days to explore Efficyon with <strong>{formData.selectedTools[0] || 'your selected tool'}</strong>.
                        </p>
                        <p className="text-xs text-gray-400">
                          After your trial ends, upgrade to Startup at 50% off ($19.50/month) to continue accessing full analysis and insights.
                        </p>
                      </div>
                    </CardContent>
                  </>
                ) : (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-white">
                    Billing Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Secure payment processing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingName" className="text-gray-300">
                      Cardholder Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="billingName"
                        value={formData.billingName}
                        onChange={(e) =>
                          setFormData({ ...formData, billingName: e.target.value })
                        }
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.billingName && (
                      <p className="text-sm text-red-400">{errors.billingName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingEmail" className="text-gray-300">
                      Billing Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="billingEmail"
                        type="email"
                        value={formData.billingEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, billingEmail: e.target.value })
                        }
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="billing@company.com"
                      />
                    </div>
                    {errors.billingEmail && (
                      <p className="text-sm text-red-400">{errors.billingEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-gray-300">
                      Card Number *
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, cardNumber: e.target.value })
                        }
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    {errors.cardNumber && (
                      <p className="text-sm text-red-400">{errors.cardNumber}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate" className="text-gray-300">
                        Expiry Date
                      </Label>
                      <Input
                        id="expiryDate"
                        value={formData.expiryDate}
                        onChange={(e) =>
                          setFormData({ ...formData, expiryDate: e.target.value })
                        }
                        className="bg-black/50 border-white/10 text-white"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="text-gray-300">
                        CVV
                      </Label>
                      <Input
                        id="cvv"
                        type="password"
                        value={formData.cvv}
                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                        className="bg-black/50 border-white/10 text-white"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </CardContent>
              </>
            )}
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
                      // Ensure button doesn't get stuck
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {currentStep === totalSteps ? (isSubmitting ? "Completing..." : "Complete Setup") : (isSubmitting ? "Processing..." : "Next")}
                  {currentStep < totalSteps && !isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

