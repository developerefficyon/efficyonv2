"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-hooks"
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import { MarketingShell } from "@/components/marketing/editorial"

export default function LoginPage() {
  return (
    <MarketingShell>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--green)" }} />
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </MarketingShell>
  )
}

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect")
  const redirect =
    redirectParam ||
    (typeof window !== "undefined" ? localStorage.getItem("invite_redirect") : null)

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
          localStorage.removeItem("invite_redirect")
          router.push(redirect)
        } else if (loggedInUser.onboardingCompleted) {
          router.push("/dashboard")
        } else {
          router.push("/onboarding")
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      console.error("[Login] Error details:", e)
      if (e?.message === "EMAIL_NOT_CONFIRMED") {
        setError("Please verify your email from the link we sent before logging in.")
      } else if (e?.message === "NOT_APPROVED") {
        setError("Your account is awaiting admin approval.")
      } else if (e?.message === "INVALID_CREDENTIALS") {
        if (email.toLowerCase() === "admin@efficyon.com") {
          setError(
            "Invalid password. Default is 'Admin@123456' (check .env ADMIN_PASSWORD). Run 'npm run seed' to reset."
          )
        } else {
          setError("Invalid email or password. Please check your credentials and try again.")
        }
      } else if (e?.message === "PROFILE_NOT_FOUND") {
        setError("Your account profile could not be found. Please contact support.")
      } else {
        setError(e?.message || "Invalid email or password")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-6 py-20 md:px-12">
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
            ✦ Welcome back
          </p>
          <h1 className="text-[clamp(40px,4.5vw,64px)] font-medium leading-[1.0] tracking-[-0.04em]">
            Sign in to{" "}
            <span
              className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
              style={{ color: "var(--green)" }}
            >
              your stack.
            </span>
          </h1>
          <p className="mt-8 max-w-[420px] text-[16px] leading-[1.7] text-white/55">
            Pick up the most recent scan, see what&apos;s new since you last looked, and decide what to act on this month.
          </p>

          <ul className="mt-12 space-y-3 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
            {["Read-only on every system", "Cancel anytime", "EU-hosted · Gothenburg"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — form card */}
        <div className="w-full max-w-[460px] md:justify-self-end">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-[13px] text-white/55 transition-colors hover:text-white md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="border border-white/[0.09] bg-white/[0.012] p-8 md:p-10">
            <p
              className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45"
            >
              ✦ Sign in
            </p>
            <h2 className="text-[28px] font-medium tracking-[-0.02em]">
              Welcome{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                back.
              </span>
            </h2>
            <p className="mt-2 text-[14px] text-white/50">
              Enter your credentials below.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
              aria-busy={isLoading}
              aria-live="polite"
            >
              <Field label="Email" htmlFor="email">
                <Mail className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent pb-2 pl-7 pt-2 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                  disabled={isLoading}
                  required
                />
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                aside={
                  <Link
                    href="/forgot-password"
                    className="text-[11px] uppercase tracking-[0.18em] font-[family-name:var(--font-geist-mono)] text-white/45 transition-colors hover:text-white"
                  >
                    Forgot?
                  </Link>
                }
              >
                <Lock className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pb-2 pl-7 pr-9 pt-2 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                  disabled={isLoading}
                  required
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
                    Signing you in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-[13.5px] text-white/55">
              Don&apos;t have an account?{" "}
              <Link
                href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"}
                className="font-medium transition-colors hover:text-white"
                style={{ color: "var(--green)" }}
              >
                Sign up →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
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
