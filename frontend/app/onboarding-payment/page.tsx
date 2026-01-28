"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PricingTierSelector } from "@/components/pricing-tier-selector"
import { PaymentForm as StripePaymentForm } from "@/components/payment-form-v2"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Building2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Using hosted Stripe Checkout via StripePaymentForm

type OnboardingStep = "company" | "pricing" | "payment" | "success"

interface CompanyData {
  name: string
  industry: string
  size: string
  website?: string
}

export default function OnboardingWithPayment() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [step, setStep] = useState<OnboardingStep>("company")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Company step data
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: "",
    industry: "",
    size: "",
    website: "",
  })

  // Pricing step data
  const [selectedTier, setSelectedTier] = useState<string>("startup")

  // Payment step data
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Step 1: Company Information
  const handleCompanyNext = async () => {
    if (!companyData.name || !companyData.industry || !companyData.size) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      // Save company information
      const response = await fetch(`${apiBase}/api/company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(companyData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save company information")
      }

      setStep("pricing")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Pricing Selection
  const handlePricingNext = () => {
    setStep("payment")
  }

  // Step 3: Payment Success
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      const response = await fetch(`${apiBase}/api/profile/onboarding-complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to complete onboarding")
      }

      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding")
    }
  }

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {(["company", "pricing", "payment", "success"] as const).map((s, index) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    step === s
                      ? "bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-800"
                      : ["company", "pricing", "payment"].indexOf(s) <
                        ["company", "pricing", "payment", "success"].indexOf(step)
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  )}
                >
                  {["company", "pricing", "payment"].indexOf(s) <
                  ["company", "pricing", "payment", "success"].indexOf(step) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={cn(
                      "w-12 h-1 transition-all",
                      ["company", "pricing", "payment"].indexOf(s) <
                      ["company", "pricing", "payment", "success"].indexOf(step)
                        ? "bg-green-500"
                        : step === s
                        ? "bg-blue-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs font-medium text-gray-600 dark:text-gray-400">
            <span>Company</span>
            <span>Pricing</span>
            <span>Payment</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Step 1: Company Information */}
          {step === "company" && (
            <CompanyStep
              data={companyData}
              setData={setCompanyData}
              onNext={handleCompanyNext}
              loading={loading}
              error={error}
              setError={setError}
            />
          )}

          {/* Step 2: Pricing Selection */}
          {step === "pricing" && (
            <PricingStep
              selectedTier={selectedTier}
              setSelectedTier={setSelectedTier}
              onBack={() => setStep("company")}
              onNext={handlePricingNext}
              loading={loading}
            />
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <PaymentStep
              planTier={selectedTier}
              email={user?.email || ""}
              companyName={companyData.name}
              onBack={() => setStep("pricing")}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              error={error}
              setError={setError}
            />
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <SuccessStep
              companyName={companyData.name}
              planTier={selectedTier}
              onContinue={() => router.push("/dashboard")}
            />
          )}
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already completed onboarding?{" "}
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
              Go to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// Company Step Component
function CompanyStep({
  data,
  setData,
  onNext,
  loading,
  error,
  setError,
}: {
  data: CompanyData
  setData: (data: CompanyData) => void
  onNext: () => Promise<void>
  loading: boolean
  error: string | null
  setError: (error: string | null) => void
}) {
  return (
    <div className="p-8">
      <CardHeader className="px-0 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          <CardTitle className="text-3xl">Tell Us About Your Company</CardTitle>
        </div>
        <CardDescription className="text-base">
          We'll use this information to tailor Efficyon to your needs
        </CardDescription>
      </CardHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div>
          <Label htmlFor="company-name" className="text-base font-semibold">
            Company Name *
          </Label>
          <Input
            id="company-name"
            placeholder="Your company name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="industry" className="text-base font-semibold">
              Industry *
            </Label>
            <select
              id="industry"
              value={data.industry}
              onChange={(e) => setData({ ...data, industry: e.target.value })}
              className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select industry</option>
              <option value="tech">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="services">Professional Services</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="size" className="text-base font-semibold">
              Company Size *
            </Label>
            <select
              id="size"
              value={data.size}
              onChange={(e) => setData({ ...data, size: e.target.value })}
              className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="website" className="text-base font-semibold">
            Website (Optional)
          </Label>
          <Input
            id="website"
            placeholder="https://yourcompany.com"
            value={data.website}
            onChange={(e) => setData({ ...data, website: e.target.value })}
            className="mt-2"
          />
        </div>

        <Button
          onClick={onNext}
          disabled={loading}
          size="lg"
          className="w-full mt-8"
        >
          {loading ? "Saving..." : "Continue to Pricing"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// Pricing Step Component
function PricingStep({
  selectedTier,
  setSelectedTier,
  onBack,
  onNext,
  loading,
}: {
  selectedTier: string
  setSelectedTier: (tier: string) => void
  onBack: () => void
  onNext: () => void
  loading: boolean
}) {
  return (
    <div className="p-8">
      <CardHeader className="px-0 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <CardTitle className="text-3xl">Choose Your Plan</CardTitle>
        </div>
        <CardDescription className="text-base">
          Select the plan that best fits your needs
        </CardDescription>
      </CardHeader>

      <div className="my-8">
        <PricingTierSelector onSelectTier={setSelectedTier} loading={loading} />
      </div>

      <div className="flex gap-4 mt-8">
        <Button onClick={onBack} variant="outline" size="lg" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={loading} size="lg" className="flex-1">
          Continue to Payment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// Payment Step Component
function PaymentStep({
  planTier,
  email,
  companyName,
  onBack,
  onSuccess,
  onError,
  error,
  setError,
}: {
  planTier: string
  email: string
  companyName: string
  onBack: () => void
  onSuccess: (paymentIntentId: string) => Promise<void>
  onError: (error: string) => void
  error: string | null
  setError: (error: string | null) => void
}) {
  const [processing, setProcessing] = useState(false)

  return (
    <div className="p-8">
      <CardHeader className="px-0 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <CardTitle className="text-3xl">Complete Your Payment</CardTitle>
        </div>
        <CardDescription className="text-base">
          Your subscription starts immediately after payment
        </CardDescription>
      </CardHeader>

      <div className="my-8">
        <StripePaymentForm
          planTier={planTier}
          email={email}
          companyName={companyName}
          onPaymentSuccess={(id) => {
            setProcessing(true)
            onSuccess(id).finally(() => setProcessing(false))
          }}
          onPaymentError={onError}
        />
      </div>

      <Button
        onClick={onBack}
        variant="outline"
        size="lg"
        className="w-full mt-4"
        disabled={processing}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>
  )
}

// Success Step Component
function SuccessStep({
  companyName,
  planTier,
  onContinue,
}: {
  companyName: string
  planTier: string
  onContinue: () => void
}) {
  return (
    <div className="p-8 text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <CardTitle className="text-3xl mb-2">Welcome to Efficyon!</CardTitle>
      <CardDescription className="text-lg mb-6">
        Your account is set up and ready to go
      </CardDescription>

      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6 mb-8 text-left space-y-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Company</p>
          <p className="font-semibold text-lg">{companyName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
          <p className="font-semibold text-lg capitalize">{planTier} Plan</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">What's Next</p>
          <ul className="font-semibold space-y-1 mt-2">
            <li>✓ Connect Fortnox</li>
            <li>✓ Run your first analysis</li>
            <li>✓ Discover cost savings</li>
          </ul>
        </div>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full">
        Go to Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}
