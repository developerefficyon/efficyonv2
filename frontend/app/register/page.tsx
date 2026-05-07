"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import { MarketingShell, EditorialNav } from "@/components/marketing/editorial"

export default function RegisterPage() {
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
        <RegisterContent />
      </Suspense>
    </MarketingShell>
  )
}

function RegisterContent() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect")

  // Persist redirect in localStorage so it survives the email verification detour
  useEffect(() => {
    if (redirect) {
      localStorage.setItem("invite_redirect", redirect)
    }
  }, [redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      // Register user via backend - uses Admin API to create user without Supabase sending emails
      // Backend will create user, update profile, and send verification email via Resend
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const registerRes = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      })

      if (!registerRes.ok) {
        const errorData = await registerRes.json().catch(() => ({ error: "Failed to create account" }))
        setError(errorData.error || "Failed to create account. Please try again.")
        setIsLoading(false)
        return
      }

      await registerRes.json()

      setIsLoading(false)

      toast.success("Account created successfully", {
        description: `We sent a verification link to ${email}. Please verify your email before logging in.`,
      })

      // Redirect to login after successful registration (preserve redirect param for invite flow)
      const loginUrl = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"
      router.push(loginUrl)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setIsLoading(false)
      setError(e?.message || "An error occurred. Please try again.")
      toast.error("Registration failed", {
        description: e?.message || "An error occurred while creating your account.",
      })
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
            ✦ New account
          </p>
          <h1 className="text-[clamp(40px,4.5vw,64px)] font-medium leading-[1.0] tracking-[-0.04em]">
            Start finding{" "}
            <span
              className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
              style={{ color: "var(--green)" }}
            >
              the leaks.
            </span>
          </h1>
          <p className="mt-8 max-w-[420px] text-[16px] leading-[1.7] text-white/55">
            Connect a system or two, run a scan, and see where your software spend quietly drifts away each month.
          </p>

          <ul className="mt-12 space-y-3 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
            {["Read-only on every system", "No card · free first scan", "EU-hosted · Gothenburg, Sweden"].map((t) => (
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
            <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
              ✦ Create account
            </p>
            <h2 className="text-[28px] font-medium tracking-[-0.02em]">
              Get{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                started.
              </span>
            </h2>
            <p className="mt-2 text-[14px] text-white/50">
              A scan takes a few minutes. No credit card required.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
              aria-busy={isLoading}
              aria-live="polite"
            >
              <Field label="Full name" htmlFor="name">
                <User className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent pb-2 pl-7 pt-2 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                  disabled={isLoading}
                  required
                />
              </Field>

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

              <Field label="Password" htmlFor="password">
                <Lock className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
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

              <Field label="Confirm password" htmlFor="confirmPassword">
                <Lock className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent pb-2 pl-7 pr-9 pt-2 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                  disabled={isLoading}
                  required
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
                    Creating your account…
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-[13.5px] text-white/55">
              Already have an account?{" "}
              <Link
                href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
                className="font-medium transition-colors hover:text-white"
                style={{ color: "var(--green)" }}
              >
                Sign in →
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
