"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { ArrowLeft, Mail, CheckCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import { MarketingShell, EditorialNav } from "@/components/marketing/editorial"

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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const emailRes = await fetch(`${apiBase}/api/email/send-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!emailRes.ok) {
        const errorData = await emailRes.json().catch(() => ({ error: "Failed to send reset email" }))
        throw new Error(errorData.error || "Failed to send reset email")
      }

      setIsSubmitted(true)
      toast.success("Reset link sent", {
        description: `If an account exists with this email, we've sent a password reset link. Please check your email.`,
      })
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e?.message || "Failed to send reset email. Please try again.")
      toast.error("Failed to send reset email", {
        description: e?.message || "An error occurred while sending the reset email.",
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

  return (
    <MarketingShell>
      <EditorialNav />
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
              ✦ Forgotten password
            </p>
            <h1 className="text-[clamp(40px,4.5vw,64px)] font-medium leading-[1.0] tracking-[-0.04em]">
              Reset access in{" "}
              <span
                className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
                style={{ color: "var(--green)" }}
              >
                two emails.
              </span>
            </h1>
            <p className="mt-8 max-w-[420px] text-[16px] leading-[1.7] text-white/55">
              Enter the email tied to your account. We&apos;ll send a reset link that&apos;s valid for the next hour.
            </p>

            <ul className="mt-12 space-y-3 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
              {["Single-use reset link", "Expires after one hour", "EU-hosted · Gothenburg"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — form / confirmation card */}
          <div className="w-full max-w-[460px] md:justify-self-end">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-[13px] text-white/55 transition-colors hover:text-white md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="border border-white/[0.09] bg-white/[0.012] p-8 md:p-10">
              {isSubmitted ? (
                <>
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(0, 209, 122, 0.14)" }}>
                    <CheckCircle className="h-5 w-5" style={{ color: "var(--green)" }} />
                  </div>
                  <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                    ✦ Check your inbox
                  </p>
                  <h2 className="text-[28px] font-medium tracking-[-0.02em]">
                    Link{" "}
                    <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                      sent.
                    </span>
                  </h2>
                  <p className="mt-3 text-[14px] leading-[1.7] text-white/55">
                    If an account exists for{" "}
                    <span className="text-white/85">{email}</span>, you&apos;ll get a reset link in the next minute or two.
                  </p>
                  <p className="mt-3 text-[13px] text-white/45">
                    Nothing arrived? Check spam, then try again.
                  </p>

                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      onClick={handleResend}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-[14px] text-[14px] font-medium text-white transition-colors hover:border-white/40"
                    >
                      Send again
                    </button>
                    <Link
                      href="/login"
                      className="text-center text-[13.5px] text-white/55 transition-colors hover:text-white"
                    >
                      Back to login →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                    ✦ Reset password
                  </p>
                  <h2 className="text-[28px] font-medium tracking-[-0.02em]">
                    Forgot it{" "}
                    <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                      again?
                    </span>
                  </h2>
                  <p className="mt-2 text-[14px] text-white/50">
                    We&apos;ll send a single-use link to your email.
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
                          Sending reset link…
                        </>
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-[13.5px] text-white/55">
                    Remembered it?{" "}
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
