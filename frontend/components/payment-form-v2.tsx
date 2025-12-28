"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CreditCard } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface PaymentFormProps {
  planTier: string
  email: string
  companyName: string
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
}

export function PaymentForm({
  planTier,
  email,
  companyName,
  onPaymentSuccess,
  onPaymentError,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planDetails, setPlanDetails] = useState<any>(null)

  useEffect(() => {
    createCheckoutSession()
  }, [planTier])

  const createCheckoutSession = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`${apiBase}/api/stripe/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          planTier,
          email,
          companyName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create checkout session")
      }

      const data = await response.json()
      setPlanDetails(data.plan)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`${apiBase}/api/stripe/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          planTier,
          email,
          companyName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create checkout session")
      }

      const data = await response.json()
      const stripe = await stripePromise

      if (!stripe) {
        throw new Error("Stripe failed to load")
      }

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment processing failed"
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {planDetails && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Plan:</span>
                <span className="font-semibold text-white">{planDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="font-semibold text-white">${(planDetails.monthlyPrice / 100).toFixed(2)}/month</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="text-gray-400">Monthly Credits:</span>
                <span className="font-semibold text-cyan-400 text-lg">{planDetails.tokens}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleCheckout}
        disabled={loading}
        size="lg"
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-6 text-base h-auto"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirecting to checkout...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Proceed to Stripe Checkout
          </span>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        🔒 You will be redirected to Stripe's secure checkout page
      </p>
    </div>
  )
}