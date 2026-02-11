"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/ui/navbar"
import { useAuth } from "@/lib/auth-hooks"
import { SparklesCore } from "@/components/ui/sparkles"
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect")
  // Fall back to localStorage (set during register → email verify flow)
  const redirect = redirectParam || (typeof window !== "undefined" ? localStorage.getItem("invite_redirect") : null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const loggedInUser = await login(email, password)
      if (loggedInUser) {
        setIsRedirecting(true)
        if (loggedInUser.role === "admin") {
          router.push("/dashboard/admin")
        } else if (redirect) {
          // Honor redirect param (e.g., invite accept flow)
          localStorage.removeItem("invite_redirect")
          router.push(redirect)
        } else {
          if (loggedInUser.onboardingCompleted) {
            router.push("/dashboard")
          } else {
            router.push("/onboarding")
          }
        }
      }
    } catch (err: any) {
      console.error('[Login] Error details:', err)
      if (err?.message === "EMAIL_NOT_CONFIRMED") {
        setError("Please verify your email from the link we sent before logging in.")
      } else if (err?.message === "NOT_APPROVED") {
        setError("Your account is awaiting admin approval.")
      } else if (err?.message === "INVALID_CREDENTIALS") {
        // Provide helpful message for admin email
        if (email.toLowerCase() === "admin@efficyon.com") {
          setError("Invalid password. Default password is 'Admin@123456' (check .env ADMIN_PASSWORD). Run 'npm run seed' to reset.")
        } else {
          setError("Invalid email or password. Please check your credentials and try again.")
        }
      } else if (err?.message === "PROFILE_NOT_FOUND") {
        setError("Your account profile could not be found. Please contact support.")
      } else {
        setError(err?.message || "Invalid email or password")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        {/* Sparkles Background */}
        <div className="absolute inset-0">
          <SparklesCore
            id="login-sparkles"
            background="transparent"
            minSize={0.4}
            maxSize={1.2}
            particleDensity={50}
            className="w-full h-full"
            particleColor="#22d3ee"
            speed={0.5}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-700" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* Animated Logo */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
            <div className="relative w-20 h-20 flex items-center justify-center bg-black/80 backdrop-blur-sm border border-white/20 rounded-2xl">
              <div className="absolute w-5 h-5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full top-3 left-3 shadow-lg shadow-cyan-500/50 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.5s' }} />
              <div className="absolute w-3 h-3 bg-white/60 rounded-full top-3 right-3 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.5s' }} />
              <div className="absolute w-3 h-3 bg-white/60 rounded-full bottom-3 left-3 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.5s' }} />
              <div className="absolute w-5 h-1 bg-white/60 bottom-4 right-3 rounded animate-bounce" style={{ animationDelay: '600ms', animationDuration: '1.5s' }} />
            </div>
          </div>

          {/* Text */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 animate-fade-in">
            Welcome back
          </h1>
          <p className="text-gray-400 text-lg mb-8 animate-fade-in-delay">
            Preparing your dashboard...
          </p>

          {/* Loading Indicator */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-cyan-500/30 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-cyan-500 rounded-full animate-spin" />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
              <span>Optimizing your experience</span>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
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
              <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
              <CardDescription className="text-gray-400">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                aria-busy={isLoading}
                aria-live="polite"
              >
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-300">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Tip: You can press <span className="font-semibold text-gray-300">Enter</span> to sign in faster.
                </p>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing you in...</span>
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-gray-400">
                Don't have an account?{" "}
                <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
