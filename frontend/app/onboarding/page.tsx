"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/ui/navbar"
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

// Tools from ROI calculator
const tools = [
  { name: "Microsoft 365", category: "Productivity" },
  { name: "HubSpot", category: "CRM/Marketing" },
  { name: "QuickBooks", category: "Finance" },
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

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Account
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Step 2: Company
    companyName: "",
    industry: "",
    employees: 25,
    phone: "",
    website: "",
    // Step 3: Tools
    selectedTools: [] as string[],
    // Step 4: Plan
    plan: "",
    // Step 5: Billing
    billingName: "",
    billingEmail: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    // Step 6: Goals
    primaryGoal: "",
    secondaryGoals: [] as string[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.name) newErrors.name = "Name is required"
      if (!formData.email) newErrors.email = "Email is required"
      if (!formData.password) newErrors.password = "Password is required"
      if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match"
    }

    if (step === 2) {
      if (!formData.companyName) newErrors.companyName = "Company name is required"
      if (!formData.industry) newErrors.industry = "Industry is required"
      if (!formData.employees || formData.employees < 1)
        newErrors.employees = "Number of employees is required"
    }

    if (step === 3) {
      if (formData.selectedTools.length === 0)
        newErrors.selectedTools = "Please select at least one tool"
    }

    if (step === 4) {
      if (!formData.plan) newErrors.plan = "Please select a plan"
    }

    if (step === 5) {
      if (!formData.billingName) newErrors.billingName = "Billing name is required"
      if (!formData.billingEmail) newErrors.billingEmail = "Billing email is required"
      if (!formData.cardNumber) newErrors.cardNumber = "Card number is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      } else {
        handleSubmit()
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // Handle final submission
    console.log("Onboarding complete:", formData)
    // Redirect to dashboard
    router.push("/dashboard")
  }

  const toggleTool = (toolName: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTools: prev.selectedTools.includes(toolName)
        ? prev.selectedTools.filter((t) => t !== toolName)
        : [...prev.selectedTools, toolName],
    }))
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
      id: "Startup",
      name: "Startup",
      price: "$39",
      period: "month",
      description: "For companies with 1-10 employees",
      features: [
        "AI-driven process analysis",
        "Monthly optimization reports",
        "Email support",
        "Basic integrations",
        "ROI tracking",
      ],
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
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
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
                    <Label htmlFor="password" className="text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="Create a secure password"
                      />
                    </div>
                    {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-300">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        className="pl-10 bg-black/50 border-white/10 text-white"
                        placeholder="Confirm your password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-400">{errors.confirmPassword}</p>
                    )}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {tools.map((tool) => (
                      <button
                        key={tool.name}
                        onClick={() => toggleTool(tool.name)}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all",
                          formData.selectedTools.includes(tool.name)
                            ? "border-cyan-500 bg-cyan-500/10 text-white"
                            : "border-white/10 bg-black/50 text-gray-400 hover:border-white/30"
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
                    ))}
                  </div>
                  {errors.selectedTools && (
                    <p className="text-sm text-red-400 mt-2">{errors.selectedTools}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-4">
                    Selected: {formData.selectedTools.length} tools
                  </p>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setFormData({ ...formData, plan: plan.id })}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          formData.plan === plan.id
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-white/10 bg-black/50 hover:border-white/30",
                          plan.popular && "ring-2 ring-blue-500/50"
                        )}
                      >
                        {plan.popular && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full mb-2 inline-block">
                            Popular
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-bold text-white">{plan.price}</span>
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
                </CardContent>
              </>
            )}

            {/* Step 5: Billing */}
            {currentStep === 5 && (
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

            {/* Step 6: Goals & Preferences */}
            {currentStep === 6 && (
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
                  onClick={handleNext}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                >
                  {currentStep === totalSteps ? "Complete Setup" : "Next"}
                  {currentStep < totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

