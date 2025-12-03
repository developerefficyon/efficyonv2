"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/ui/navbar"
import { supabase } from "@/lib/supabaseClient"
import { ArrowLeft, Mail, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Use current origin to support any port (3000, 3001, etc.)
      const appUrl = typeof window !== "undefined" 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const redirectTo = `${appUrl}/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      })

      if (resetError) {
        throw new Error(resetError.message || "Failed to send reset email")
      }

      setIsSubmitted(true)
      toast.success("Reset link sent", {
        description: `We've sent a password reset link to ${email}. Please check your email.`,
      })
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.")
      toast.error("Failed to send reset email", {
        description: err.message || "An error occurred while sending the reset email.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsSubmitted(false)
    setError("")
    // The form will be shown again, user can submit again
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to home</span>
            </Link>

            <Card className="bg-black/80 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-white text-center">Check your email</CardTitle>
                <CardDescription className="text-gray-400 text-center">
                  We've sent a password reset link to {email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400 text-center">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleResend}
                    variant="outline"
                    className="w-full border-white/10 bg-black/50 text-white hover:bg-white/5"
                  >
                    Resend email
                  </Button>
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                    >
                      Back to login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to home</span>
          </Link>

          <Card className="bg-black/80 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-white">Reset your password</CardTitle>
              <CardDescription className="text-gray-400">
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

