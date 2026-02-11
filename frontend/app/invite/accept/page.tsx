"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { signOut } from "next-auth/react"
import { Loader2, CheckCircle, XCircle, Users, LogIn, UserPlus, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10 w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-cyan-400 mb-1">Efficyon</h1>
            </div>
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-cyan-400 mx-auto animate-spin" />
              <h2 className="text-xl font-semibold text-white">Loading...</h2>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error" | "no-auth" | "email-mismatch">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [invitedEmail, setInvitedEmail] = useState("")
  const acceptingRef = useRef(false)

  useEffect(() => {
    if (authLoading) return

    if (!token) {
      setStatus("error")
      setErrorMessage("Invalid invitation link. No token provided.")
      return
    }

    if (!user) {
      setStatus("no-auth")
      return
    }

    // Guard against double-invocation (React Strict Mode)
    if (acceptingRef.current) return
    acceptingRef.current = true

    acceptInvitation()
  }, [user, authLoading, token])

  async function acceptInvitation() {
    setStatus("accepting")
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const backendToken = await getBackendToken()

      if (!backendToken) {
        setStatus("no-auth")
        return
      }

      const res = await fetch(`${apiBase}/api/team/accept-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${backendToken}`,
        },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        setStatus("success")
        setTimeout(() => {
          router.push("/dashboard/team")
        }, 2000)
      } else {
        const data = await res.json()
        if (data.error === "EMAIL_MISMATCH") {
          setStatus("email-mismatch")
          setInvitedEmail(data.invitedEmail || "")
        } else {
          setStatus("error")
          setErrorMessage(data.message || data.error || "Failed to accept invitation")
        }
      }
    } catch {
      setStatus("error")
      setErrorMessage("An error occurred while accepting the invitation")
    }
  }

  async function handleSignOutAndRetry() {
    await signOut({ redirect: false })
    // Stay on the same page — useEffect will detect no user and show login/register options
    acceptingRef.current = false
    setStatus("loading")
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="bg-black/80 backdrop-blur-xl border-white/10 w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-cyan-400 mb-1">Efficyon</h1>
          </div>

          {(status === "loading" || status === "accepting") && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-cyan-400 mx-auto animate-spin" />
              <h2 className="text-xl font-semibold text-white">
                {status === "loading" ? "Loading..." : "Accepting Invitation..."}
              </h2>
              <p className="text-gray-400 text-sm">Please wait while we process your invitation.</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Welcome to the Team!</h2>
              <p className="text-gray-400 text-sm">
                You've successfully joined the team. Redirecting to your dashboard...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Invitation Error</h2>
              <p className="text-gray-400 text-sm">{errorMessage}</p>
              <Link href="/dashboard">
                <Button className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          )}

          {status === "email-mismatch" && (
            <div className="space-y-4">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Wrong Account</h2>
              <p className="text-gray-400 text-sm">
                This invitation was sent to <span className="text-white font-medium">{invitedEmail}</span>, but you're signed in as <span className="text-white font-medium">{user?.email}</span>.
              </p>
              <p className="text-gray-500 text-xs">
                Please sign out and sign in with the correct account.
              </p>
              <Button
                onClick={handleSignOutAndRetry}
                className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign Out & Switch Account
              </Button>
            </div>
          )}

          {status === "no-auth" && (
            <div className="space-y-4">
              <Users className="w-12 h-12 text-cyan-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">You've Been Invited!</h2>
              <p className="text-gray-400 text-sm">
                Please sign in or create an account to accept this invitation.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                <Link href={`/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`}>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link href={`/register?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`}>
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
