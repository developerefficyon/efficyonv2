"use client"

import { useState, useEffect } from "react"
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"

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
  const stripe = useStripe()
  const elements = useElements()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [planDetails, setPlanDetails] = useState<any>(null)

  useEffect(() => {
    createPaymentIntent()
  }, [planTier])

  const createPaymentIntent = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planTier,
          email,
          companyName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create payment intent")
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
      setPlanDetails(data.plan)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      setError("Payment system not ready")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email,
            name: companyName,
          },
        },
      })

      if (stripeError) {
        setError(stripeError.message || "Payment failed")
        onPaymentError(stripeError.message || "Payment failed")
        return
      }

      if (paymentIntent?.status === "succeeded") {
        // Confirm payment on backend
        const confirmResponse = await fetch("/api/stripe/confirm-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            planTier,
            companyName,
          }),
        })

        if (!confirmResponse.ok) {
          const data = await confirmResponse.json()
          throw new Error(data.error || "Failed to confirm payment")
        }

        setSuccess(true)
        onPaymentSuccess(paymentIntent.id)
      } else {
        setError(`Payment status: ${paymentIntent?.status}`)
        onPaymentError(`Payment status: ${paymentIntent?.status}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment processing failed"
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">Payment Successful!</h3>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200 mb-4">
            Your subscription has been activated. You can now start using Efficyon.
          </p>
          {planDetails && (
            <div className="bg-white dark:bg-gray-900 rounded p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                <span className="font-semibold">{planDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Monthly Credits:</span>
                <span className="font-semibold">{planDetails.tokens}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Enter your card information to complete the payment
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Summary */}
          {planDetails && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                <span className="font-semibold">{planDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-semibold">
                  ${((planDetails.tokens * 100) / 100).toFixed(2)}/month
                </span>
              </div>
              <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold pt-2 border-t">
                <span>Monthly Credits:</span>
                <span>{planDetails.tokens}</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Card Element */}
          <div className="border rounded-lg p-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": {
                      color: "#aab7c4",
                    },
                  },
                  invalid: {
                    color: "#9e2146",
                  },
                },
              }}
            />
          </div>

          {/* Email Display */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Billing email: <span className="font-semibold">{email}</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !stripe || !elements || !clientSecret}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              `Pay $${(planDetails?.tokens * 100) / 100 || "0"} to Start`
            )}
          </Button>

          {/* Security Notice */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Your payment is secure and encrypted using Stripe
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
