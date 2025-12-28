# Token System Integration Examples

This document shows how to integrate the token/credit system throughout your application.

---

## 1. Display Token Balance in Dashboard

### Component Example: `TokenBalanceDisplay.tsx`

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Zap, AlertCircle } from "lucide-react"

export function TokenBalanceDisplay() {
  const [tokenBalance, setTokenBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTokenBalance()
  }, [])

  const fetchTokenBalance = async () => {
    try {
      const response = await fetch("/api/stripe/subscription")
      const data = await response.json()
      setTokenBalance(data.tokenBalance)
    } catch (error) {
      console.error("Error fetching token balance:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!tokenBalance) return null

  const availableTokens = tokenBalance.total_tokens - tokenBalance.used_tokens
  const usagePercentage = (tokenBalance.used_tokens / tokenBalance.total_tokens) * 100
  const isLow = availableTokens < 5

  return (
    <Card className={isLow ? "border-orange-300 bg-orange-50 dark:bg-orange-950" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">Monthly Credits</CardTitle>
          <CardDescription>Used for Deep Research analyses</CardDescription>
        </div>
        <Zap className={`w-5 h-5 ${isLow ? "text-orange-600" : "text-blue-600"}`} />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Token Count */}
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold">{availableTokens}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            of {tokenBalance.total_tokens} available
          </span>
        </div>

        {/* Progress Bar */}
        <Progress value={usagePercentage} className="h-2" />

        {/* Usage Breakdown */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Used</p>
            <p className="font-semibold">{tokenBalance.used_tokens} credits</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Available</p>
            <p className="font-semibold">{availableTokens} credits</p>
          </div>
        </div>

        {/* Warnings and Actions */}
        {isLow && availableTokens > 0 && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 rounded p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Low on credits. Running out soon.
            </p>
          </div>
        )}

        {availableTokens === 0 && (
          <div className="space-y-2">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 rounded p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                ❌ No credits available. Upgrade your plan or purchase more.
              </p>
            </div>
            <Button className="w-full" variant="default">
              Buy More Credits
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded p-3 text-xs space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-100">How to earn credits:</p>
          <ul className="text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>1 credit</strong>: Compare 2 data sources (Fortnox vs M365)</li>
            <li>• <strong>5 credits</strong>: Advanced analysis (3+ data sources)</li>
            <li>• <strong>10 credits</strong>: Custom multi-source deep dive</li>
          </ul>
        </div>

        {/* Reset Info */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Credits reset on the 1st of each month with your subscription renewal.
        </p>
      </CardContent>
    </Card>
  )
}
```

---

## 2. Deep Research Analysis with Token Check

### Service Example: `deepResearchService.ts`

```typescript
import { toast } from "sonner"

interface AnalysisRequest {
  integrationSources: string[]
  analysisType: string
  params?: any
}

/**
 * Calculate tokens needed for analysis
 */
function calculateTokensRequired(sources: string[]): number {
  if (sources.length === 2) return 1
  if (sources.length === 3) return 5
  if (sources.length >= 4) return 10
  return 0
}

/**
 * Check if user has enough tokens
 */
export async function canRunAnalysis(sources: string[]): Promise<boolean> {
  try {
    const response = await fetch("/api/stripe/subscription")
    const data = await response.json()

    if (!data.tokenBalance) {
      toast.error("No active subscription")
      return false
    }

    const tokensNeeded = calculateTokensRequired(sources)
    const tokensAvailable = data.tokenBalance.total_tokens - data.tokenBalance.used_tokens

    if (tokensAvailable < tokensNeeded) {
      toast.error(`Insufficient credits. Need ${tokensNeeded}, have ${tokensAvailable}`, {
        description: "Upgrade your plan or purchase more credits",
        action: {
          label: "Buy Credits",
          onClick: () => window.location.href = "/buy-credits"
        }
      })
      return false
    }

    return true
  } catch (error) {
    toast.error("Error checking token balance")
    return false
  }
}

/**
 * Run deep research analysis with token deduction
 */
export async function runDeepResearch(request: AnalysisRequest): Promise<any> {
  const tokensNeeded = calculateTokensRequired(request.integrationSources)

  // Check tokens first
  const hasTokens = await canRunAnalysis(request.integrationSources)
  if (!hasTokens) {
    throw new Error("Insufficient tokens")
  }

  try {
    // Run actual analysis
    const analysisResponse = await fetch("/api/deep-research/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    })

    if (!analysisResponse.ok) {
      throw new Error("Analysis failed")
    }

    const analysisResult = await analysisResponse.json()

    // Deduct tokens
    const tokenResponse = await fetch("/api/stripe/use-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokensToUse: tokensNeeded,
        analysisType: request.analysisType,
        integrationSources: request.integrationSources
      })
    })

    if (!tokenResponse.ok) {
      console.warn("Failed to deduct tokens, but analysis completed")
    }

    const tokenResult = await tokenResponse.json()
    toast.success(`Analysis complete! Used ${tokensNeeded} credits`, {
      description: `Remaining: ${tokenResult.tokenBalance.available}`
    })

    return {
      ...analysisResult,
      tokensUsed: tokensNeeded,
      tokensRemaining: tokenResult.tokenBalance.available
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Analysis failed")
    throw error
  }
}
```

---

## 3. Analysis Comparison Component

### Component Example: `DeepResearchSelector.tsx`

```typescript
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, AlertCircle } from "lucide-react"
import { runDeepResearch, calculateTokensRequired } from "@/services/deepResearchService"

const INTEGRATION_OPTIONS = [
  { name: "Fortnox", category: "Accounting" },
  { name: "Microsoft 365", category: "Productivity" },
  { name: "Slack", category: "Communication" },
  { name: "Jira", category: "Project Mgmt" }
]

export function DeepResearchSelector() {
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const tokensNeeded = calculateTokensRequired(selectedSources)

  const handleSelectSource = (source: string) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source))
    } else {
      setSelectedSources([...selectedSources, source])
    }
  }

  const handleRunAnalysis = async () => {
    setLoading(true)
    try {
      await runDeepResearch({
        integrationSources: selectedSources,
        analysisType: selectedSources.length === 2 ? "dual" : "multi"
      })
      // Analysis succeeded, reset selection
      setSelectedSources([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deep Research Analysis</CardTitle>
        <CardDescription>
          Compare multiple data sources to identify cost leaks
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Source Selection */}
        <div>
          <h3 className="font-semibold mb-3">Select data sources (2-4):</h3>
          <div className="grid grid-cols-2 gap-3">
            {INTEGRATION_OPTIONS.map(option => (
              <Card
                key={option.name}
                className={`cursor-pointer transition-all ${
                  selectedSources.includes(option.name)
                    ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "hover:shadow-md"
                }`}
                onClick={() => handleSelectSource(option.name)}
              >
                <CardContent className="pt-4">
                  <p className="font-medium">{option.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{option.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Token Cost */}
        {selectedSources.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Cost: {tokensNeeded} credits
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {selectedSources.length === 2 && "Standard comparison"}
                {selectedSources.length === 3 && "Advanced multi-source analysis"}
                {selectedSources.length >= 4 && "Comprehensive deep dive"}
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            💡 Analyzing multiple data sources helps identify cost leaks that would be missed
            looking at individual tools.
          </p>
        </div>

        {/* Run Button */}
        <Button
          onClick={handleRunAnalysis}
          disabled={selectedSources.length < 2 || loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Running Analysis..." : `Run Analysis (${tokensNeeded} credits)`}
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## 4. Subscription Status in Settings

### Component Example: `SubscriptionSettings.tsx`

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface SubscriptionData {
  subscription: any
  tokenBalance: any
}

export function SubscriptionSettings() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/subscription")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!data?.subscription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>No active subscription. Complete onboarding to get started.</p>
          <Button className="mt-4">Start Onboarding</Button>
        </CardContent>
      </Card>
    )
  }

  const { subscription, tokenBalance } = data
  const tierFeatures = {
    startup: ["5 integrations", "10 monthly credits", "Email support"],
    growth: ["15 integrations", "50 monthly credits", "Priority support"],
    custom: ["Unlimited integrations", "200 monthly credits", "24/7 support"]
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
              <p className="text-2xl font-bold capitalize">{subscription.plan_tier} Plan</p>
            </div>
            <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
              {subscription.status}
            </Badge>
          </div>

          {/* Features */}
          <div>
            <p className="text-sm font-semibold mb-2">Included Features:</p>
            <ul className="space-y-2">
              {tierFeatures[subscription.plan_tier as keyof typeof tierFeatures]?.map(
                (feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    {feature}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Billing Period</p>
              <p className="font-semibold">
                {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Amount</p>
              <p className="font-semibold">
                ${(subscription.amount_paid / 100).toFixed(2)}/month
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1">
              Change Plan
            </Button>
            <Button variant="outline" className="flex-1">
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Credits</CardTitle>
          <CardDescription>Track your Deep Research analysis usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Available</span>
              <span className="text-2xl font-bold">{tokenBalance.total_tokens}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Used This Month</span>
              <span className="text-xl font-semibold">{tokenBalance.used_tokens}</span>
            </div>
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span>Remaining</span>
              <span className="text-2xl font-bold">
                {tokenBalance.total_tokens - tokenBalance.used_tokens}
              </span>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 rounded p-3 text-sm">
              <p>
                Credits reset on {new Date(subscription.current_period_end).toLocaleDateString()} when your subscription renews.
              </p>
            </div>

            <Button className="w-full" variant="outline">
              Purchase Additional Credits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 5. API Integration in Existing Dashboard

Add to your main dashboard:

```typescript
// In dashboard/page.tsx

import { TokenBalanceDisplay } from "@/components/token-balance-display"
import { SubscriptionSettings } from "@/components/subscription-settings"

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Existing dashboard content */}
      
      {/* Add Token Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TokenBalanceDisplay />
        {/* Other cards */}
      </div>

      {/* Add Deep Research Component */}
      <DeepResearchSelector />

      {/* Settings section */}
      <SubscriptionSettings />
    </div>
  )
}
```

---

## 6. Cost Leak Analysis with Token Check

Modify your existing cost leak analysis to check tokens:

```typescript
// In costLeakAnalysis route handler

export async function analyzeFortnoxCostLeaks(req, res) {
  const user = req.user
  
  try {
    // Check token balance
    const { data: tokenBalance } = await supabase
      .from("token_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!tokenBalance) {
      return res.status(402).json({ 
        error: "No active subscription", 
        message: "Complete onboarding to access analysis"
      })
    }

    const availableTokens = tokenBalance.total_tokens - tokenBalance.used_tokens
    if (availableTokens < 1) {
      return res.status(402).json({ 
        error: "Insufficient tokens",
        available: availableTokens,
        message: "Purchase more credits to continue"
      })
    }

    // Proceed with analysis...
    const analysis = await performAnalysis()

    // Deduct token
    await supabase
      .from("token_balances")
      .update({ used_tokens: tokenBalance.used_tokens + 1 })
      .eq("user_id", user.id)

    return res.json({
      ...analysis,
      tokensUsed: 1,
      tokensRemaining: availableTokens - 1
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

---

## Implementation Checklist

- [ ] Add `TokenBalanceDisplay` to dashboard
- [ ] Add `DeepResearchSelector` to analysis page
- [ ] Add `SubscriptionSettings` to settings page
- [ ] Integrate token check in analysis endpoints
- [ ] Test full flow with different tier users
- [ ] Monitor token usage patterns
- [ ] Add analytics for token consumption
- [ ] Set up token reset mechanism
- [ ] Create "Buy Credits" flow
- [ ] Add in-app notifications for low tokens

---

This gives you a complete framework for integrating the token system throughout your application!
