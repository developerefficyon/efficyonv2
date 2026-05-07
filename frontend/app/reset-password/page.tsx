"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { MarketingShell, EditorialNav } from "@/components/marketing/editorial"

function ResetPasswordContent() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Supabase sends tokens in URL hash (#) not query params (?)
    // Handle the redirect immediately when page loads with hash
    const handleHashRedirect = async () => {
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        // If we have recovery tokens in the hash, set the session immediately
        if (accessToken && refreshToken && type === "recovery") {
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              console.error("Session error:", sessionError)
              setError("Invalid or expired reset link. Please request a new password reset.")
            } else {
              // Clear the hash from URL after setting session
              window.history.replaceState(null, "", window.location.pathname)
            }
          } catch (err: unknown) {
            console.error("Error setting session:", err)
            setError("Failed to verify reset link. Please request a new password reset.")
          }
        }
      }
    }

    handleHashRedirect()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      // Check if we already have a session (set from useEffect)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Try to get tokens from URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token") || searchParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token")
        const type = hashParams.get("type") || searchParams.get("type")

        if (!accessToken || !refreshToken || type !== "recovery") {
          throw new Error("Invalid or expired reset link. Please request a new password reset.")
        }

        // Set the session with the recovery tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          throw new Error(sessionError.message || "Failed to verify reset link")
        }
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw new Error(updateError.message || "Failed to update password")
      }

      setIsSuccess(true)
      toast.success("Password reset successfully", {
        description: "Your password has been updated. You can now sign in with your new password.",
      })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e?.message || "Failed to reset password. Please try again.")
      toast.error("Failed to reset password", {
        description: e?.message || "An error occurred while resetting your password.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-6 pb-20 pt-[120px] md:px-12">
      <div className="grid w-full gap-16 md:grid-cols-[1fr_1fr] md:items-center">
        {/* Left — editorial intro */}
        <div className="hidden md:block">
          <Link
            href="/"
            className="group mb-10 inline-flex items-center gap-2.5 text-[15px] font-medium tracking-[-0.01em]"
          >
            <Image src="/logo.png" alt="Efficyon" width={32} height={32} priority className="h-7 w-auto object-contain" />
            <span>Efficyon</span>
            <span className="translate-y-[1px] font-[family-name:var(--font-instrument-serif)] text-[14px] italic text-white/40">
              / cost intelligence
            </span>
          </Link>

          <p
            className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "var(--green)" }}
          >
            ✦ Almost there
          </p>
          <h1 className="text-[clamp(40px,4.5vw,64px)] font-medium leading-[1.0] tracking-[-0.04em]">
            Set a new{" "}
            <span
              className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
              style={{ color: "var(--green)" }}
            >
              password.
            </span>
          </h1>
          <p className="mt-8 max-w-[420px] text-[16px] leading-[1.7] text-white/55">
            Pick something you can remember. Six characters minimum. We&apos;ll sign you in straight after.
          </p>

          <ul className="mt-12 space-y-3 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
            {["Stored as a one-way hash", "Active sessions stay signed in", "EU-hosted · Gothenburg, Sweden"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — form / success card */}
        <div className="w-full max-w-[460px] md:justify-self-end">
          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-2 text-[13px] text-white/55 transition-colors hover:text-white md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <div className="border border-white/[0.09] bg-white/[0.012] p-8 md:p-10">
            {isSuccess ? (
              <>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(0, 209, 122, 0.14)" }}>
                  <CheckCircle className="h-5 w-5" style={{ color: "var(--green)" }} />
                </div>
                <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                  ✦ Password updated
                </p>
                <h2 className="text-[28px] font-medium tracking-[-0.02em]">
                  All{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                    set.
                  </span>
                </h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-white/55">
                  Your password has been updated. Redirecting you to login…
                </p>

                <div className="mt-8 flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Redirecting
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                  ✦ New password
                </p>
                <h2 className="text-[28px] font-medium tracking-[-0.02em]">
                  Pick a fresh{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                    one.
                  </span>
                </h2>
                <p className="mt-2 text-[14px] text-white/50">
                  Minimum six characters.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="mt-8 space-y-5"
                  aria-busy={isLoading}
                  aria-live="polite"
                >
                  <Field label="New password" htmlFor="password">
                    <Lock className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent pb-2 pl-7 pr-9 pt-2 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  <Field label="Confirm new password" htmlFor="confirmPassword">
                    <Lock className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent pb-2 pl-7 pr-9 pt-2 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  {error && (
                    <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/[0.06] p-3 text-[13px] text-red-300/95">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-[14px] text-[14px] font-medium text-black transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_30px_rgba(0,209,122,0.35)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    style={{ background: "var(--green)" }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Resetting password…
                      </>
                    ) : (
                      <>
                        Reset password
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-[13.5px] text-white/55">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="font-medium transition-colors hover:text-white"
                    style={{ color: "var(--green)" }}
                  >
                    Sign in →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <MarketingShell>
      <EditorialNav />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--green)" }} />
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </MarketingShell>
  )
}

function Field({
  label,
  htmlFor,
  aside,
  children,
}: {
  label: string
  htmlFor: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55"
        >
          {label}
        </label>
        {aside}
      </div>
      <div className="relative border-b border-white/15 transition-colors focus-within:border-[color:var(--green)]">
        {children}
      </div>
    </div>
  )
}
