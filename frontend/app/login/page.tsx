"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/ui/navbar"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

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
        } else {
          // For non-admin users, check if onboarding is completed
          if (loggedInUser.onboardingCompleted) {
            router.push("/dashboard")
          } else {
            router.push("/onboarding")
          }
        }
      }
    } catch (err: any) {
      if (err?.message === "EMAIL_NOT_CONFIRMED") {
        setError("Please verify your email from the link we sent before logging in.")
      } else if (err?.message === "NOT_APPROVED") {
        setError("Your account is awaiting admin approval.")
      } else {
        setError("Invalid email or password")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-md">
          {isRedirecting ? (
            <Card className="bg-black/80 backdrop-blur-xl border-cyan-500/40 shadow-[0_0_40px_rgba(34,211,238,0.25)] animate-pulse">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-white">Signing you in</CardTitle>
                <CardDescription className="text-gray-400">
                  Redirecting to your dashboard. This usually takes just a moment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500">
                    Optimizing your cloud stack behind the scenes...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
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
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
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
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

