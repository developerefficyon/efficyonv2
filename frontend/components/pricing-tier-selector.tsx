"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { useState, useEffect } from "react"

interface Plan {
  tier: string
  name: string
  description: string
  price_monthly_cents: number
  included_tokens: number
  max_integrations: number
  max_team_members: number
  features: string[]
}

interface PricingTierSelectorProps {
  onSelectTier: (tier: string) => void
  loading?: boolean
}

export function PricingTierSelector({ onSelectTier, loading = false }: PricingTierSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedTier, setSelectedTier] = useState<string>("startup")
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const response = await fetch(`${apiBase}/api/stripe/plans`)
      const data = await response.json()
      setPlans(data.plans)
    } catch (error) {
      console.error("Error fetching plans:", error)
    } finally {
      setLoadingPlans(false)
    }
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const handleSelectTier = (tier: string) => {
    setSelectedTier(tier)
    onSelectTier(tier)
  }

  if (loadingPlans) {
    return <div className="text-center py-8">Loading pricing plans...</div>
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select the plan that best fits your needs. Upgrade anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <Card
            key={plan.tier}
            className={`relative transition-all cursor-pointer ${
              selectedTier === plan.tier
                ? "ring-2 ring-blue-500 shadow-lg"
                : "hover:shadow-md"
            }`}
            onClick={() => handleSelectTier(plan.tier)}
          >
            {plan.tier === "growth" && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pricing */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${formatPrice(plan.price_monthly_cents)}</span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Billed monthly, cancel anytime
                </p>
              </div>

              {/* Credits/Tokens */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  {plan.included_tokens} Monthly Credits
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  For Deep Research analyses
                </p>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y">
                <div>
                  <div className="text-2xl font-bold">{plan.max_integrations}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Integrations</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{plan.max_team_members}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Team Members</div>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Select Button */}
              <Button
                className="w-full"
                variant={selectedTier === plan.tier ? "default" : "outline"}
                disabled={loading}
                onClick={() => handleSelectTier(plan.tier)}
              >
                {selectedTier === plan.tier ? "Selected" : "Select Plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How Credits Work:</h3>
          <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
            <li>• <strong>Deep Research</strong> (2 data sources): 1 credit</li>
            <li>• <strong>Advanced Analysis</strong> (3+ data sources): 5-10 credits</li>
            <li>• <strong>Chat Support</strong> on reports: Unlimited, no credits</li>
            <li>• Unused credits roll over each month</li>
            <li>• Purchase additional credits anytime as needed</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
