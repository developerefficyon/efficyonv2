"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/ui/navbar"
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    // Use current origin to support any port (3000, 3001, etc.)
    const appUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectTo = `${appUrl}/auth/verify`
    
    console.log("Email redirect URL:", redirectTo)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          name,
          role: "customer",
        },
      },
    })

    if (signUpError) {
      setIsLoading(false)
      setError(signUpError.message)
      return
    }

    // Profile is automatically created by database trigger on user signup
    // Update profile with full_name if provided
    if (signUpData?.user?.id && name) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        console.log("Updating profile with full_name for user:", signUpData.user.id)
        
        // Update profile with full_name (profile already exists via trigger)
        const updateProfileRes = await fetch(`${apiBase}/api/profiles/update-public`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: signUpData.user.id,
            full_name: name,
          }),
        }).catch((fetchError) => {
          // Network error (backend not running, CORS, etc.)
          console.error("Network error updating profile:", fetchError)
          // Don't throw - profile exists, just missing full_name
        })

        if (updateProfileRes && updateProfileRes.ok) {
          console.log("Profile updated successfully with full_name")
        } else if (updateProfileRes) {
          console.warn("Failed to update profile with full_name, but profile exists via trigger")
        }
      } catch (profileError: any) {
        console.error("Error updating profile (non-critical):", profileError?.message)
        // Don't fail registration - profile exists via trigger, just missing full_name
      }
    }

    // Send verification email via Resend
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const emailRes = await fetch(`${apiBase}/api/email/send-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!emailRes.ok) {
        const errorData = await emailRes.json().catch(() => ({ error: "Failed to send verification email" }))
        console.warn("Failed to send verification email via Resend:", errorData.error)
        // Don't fail registration - Supabase may have sent an email already
      }
    } catch (emailError: any) {
      console.error("Error sending verification email via Resend (non-critical):", emailError?.message)
      // Don't fail registration - Supabase may have sent an email already
    }

    setIsLoading(false)

    toast.success("Verification email sent", {
      description: `We sent a verification link to ${email}. Please verify your email before logging in.`,
    })

    // Redirect to login after successful registration
    router.push("/login")
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
              <CardTitle className="text-2xl font-bold text-white">Create an account</CardTitle>
              <CardDescription className="text-gray-400">
                Get started with Efficyon today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      required
                    />
                  </div>
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
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
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
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

