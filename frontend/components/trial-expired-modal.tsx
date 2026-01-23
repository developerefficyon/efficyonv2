"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, Check, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Plan {
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
      "10 monthly credits",
      "Email support",
      "Basic analytics",
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
      "Custom features",
    ],
  },
]

interface TrialExpiredModalProps {
  open: boolean
  onSelectPlan: (planTier: string) => Promise<void>
  trialEndsAt: string | null
}

export function TrialExpiredModal({
  open,
  onSelectPlan,
  trialEndsAt,
}: TrialExpiredModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("growth")
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    if (!selectedPlan) return
    setIsLoading(true)
    try {
      await onSelectPlan(selectedPlan)
    } catch (error) {
      console.error("Error selecting plan:", error)
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "recently"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-black border-red-500/30 max-w-3xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <Clock className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-white text-xl">
              Your Trial Has Expired
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Your 7-day free trial ended on{" "}
            <span className="text-red-400 font-semibold">
              {formatDate(trialEndsAt)}
            </span>
            . Choose a plan to continue using Efficyon and unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              disabled={isLoading}
              className={cn(
                "p-4 rounded-lg border text-left transition-all relative",
                selectedPlan === plan.id
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/30",
                plan.popular && "ring-1 ring-blue-500/50",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white mb-1">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-sm text-gray-400">/{plan.period}</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{plan.description}</p>
              <ul className="space-y-1.5">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-gray-300"
                  >
                    <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {selectedPlan === plan.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <Button
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 h-12 text-lg"
            onClick={handleContinue}
            disabled={!selectedPlan || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Continue with{" "}
                {plans.find((p) => p.id === selectedPlan)?.name || "Selected"}{" "}
                Plan
              </>
            )}
          </Button>
          <p className="text-center text-xs text-gray-500">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
