"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [countdown, setCountdown] = useState(5)

  // Handle email verification
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Supabase redirects with hash fragments like #access_token=...&type=signup
        // Check both URL params and hash fragments
        const token = searchParams.get("token")
        const type = searchParams.get("type")
        
        // Also check hash fragments from window.location.hash
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const hashType = hashParams.get("type")
        const accessToken = hashParams.get("access_token")

        // If we have hash fragments, Supabase is handling the verification
        if (hashType === "signup" || type === "signup" || accessToken) {
          // Get the session from Supabase (it should be set automatically)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error("Session error:", sessionError)
            setStatus("error")
            return
          }

          if (session) {
            // Email is verified, update profile in database using public endpoint
            // Use public endpoint to avoid auth issues - we have userId from session
            const userId = session.user.id
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
            
            // Retry mechanism - Supabase might need a moment to update email_confirmed_at
            const updateProfile = async (retries = 3) => {
              for (let i = 0; i < retries; i++) {
                try {
                  if (i > 0) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * i))
                  }
                  
                  console.log(`Updating email_verified for user (attempt ${i + 1}/${retries}):`, userId)
                  
                  const updateRes = await fetch(`${apiBase}/api/profiles/update-email-verified-public`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userId }),
                  })

                  console.log("Update response status:", updateRes.status, updateRes.statusText)

                  if (updateRes.ok) {
                    const result = await updateRes.json()
                    console.log("Profile email_verified updated successfully:", result)
                    return true
                  } else {
                    // Try to get error as JSON first, then text
                    let errorData
                    const contentType = updateRes.headers.get("content-type")
                    try {
                      if (contentType && contentType.includes("application/json")) {
                        errorData = await updateRes.json()
                      } else {
                        errorData = { message: await updateRes.text() }
                      }
                    } catch (e) {
                      errorData = { message: `HTTP ${updateRes.status}: ${updateRes.statusText}` }
                    }
                    
                    console.error(`Attempt ${i + 1} failed:`, {
                      status: updateRes.status,
                      statusText: updateRes.statusText,
                      error: errorData,
                    })
                    
                    if (i === retries - 1) {
                      console.error("All retry attempts failed to update profile. Last error:", errorData)
                    }
                  }
                } catch (error) {
                  console.error(`Attempt ${i + 1} error:`, error)
                  if (i === retries - 1) {
                    console.error("All retry attempts failed with errors")
                  }
                }
              }
              return false
            }

            // Try to update profile (with retries)
            await updateProfile()

            // Email is verified, show success
            setStatus("success")
            
            // Sign out to clear the session (user needs to log in properly)
            await supabase.auth.signOut()
          } else {
            // No session, but hash indicates verification attempt
            // Try to get userId from hash params
            const userIdFromHash = hashParams.get("user_id") || accessToken?.split(".")?.[1] 
              ? JSON.parse(atob(accessToken.split(".")[1])).sub 
              : null
            
            if (userIdFromHash) {
              try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
                console.log("Updating email_verified for user from hash:", userIdFromHash)
                
                const updateRes = await fetch(`${apiBase}/api/profiles/update-email-verified-public`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ userId: userIdFromHash }),
                })

                if (updateRes.ok) {
                  const result = await updateRes.json()
                  console.log("Profile email_verified updated successfully:", result)
                } else {
                  const errorText = await updateRes.text()
                  console.error("Failed to update profile:", updateRes.status, errorText)
                }
              } catch (error) {
                console.error("Error updating profile:", error)
              }
            }
            
            setStatus("success")
          }
        } else {
          // No verification parameters, but assume success if we reached this page
          setStatus("success")
        }
      } catch (error) {
        console.error("Verification error:", error)
        setStatus("error")
      }
    }

    verifyEmail()
  }, [searchParams])

  // Handle countdown timer
  useEffect(() => {
    if (status !== "success") return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status])

  // Handle redirect when countdown reaches 0
  useEffect(() => {
    if (status === "success" && countdown === 0) {
      router.push("/login")
    }
  }, [status, countdown, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <Card className="bg-black/80 backdrop-blur-xl border-white/10 shadow-2xl max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          {status === "verifying" && (
            <>
              <div className="mx-auto w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <CardTitle className="text-2xl font-bold text-white">Verifying your email...</CardTitle>
              <CardDescription className="text-gray-400">
                Please wait while we verify your email address.
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Email Verified!</CardTitle>
              <CardDescription className="text-gray-400">
                Your email address has been successfully verified. You can now sign in to your account.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">✕</span>
              </div>
              <CardTitle className="text-2xl font-bold text-white">Verification Failed</CardTitle>
              <CardDescription className="text-gray-400">
                There was an error verifying your email. Please try again or contact support.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "success" && (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-400">
                  Redirecting to login in <span className="text-cyan-400 font-semibold">{countdown}</span> seconds...
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all"
                >
                  Go to Login Now
                </Link>
              </div>
            </>
          )}

          {status === "error" && (
            <div className="text-center space-y-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all"
              >
                Go to Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

