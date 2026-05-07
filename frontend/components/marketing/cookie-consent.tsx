"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const STORAGE_KEY = "efficyon-cookie-consent"
const GREEN = "#00D17A"

type Choice = "accepted" | "necessary-only" | null

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice>("accepted") // start collapsed; set after mount
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Choice
      setChoice(stored)
    } catch {
      // localStorage unavailable (e.g. privacy mode) — show banner anyway
      setChoice(null)
    }
  }, [])

  function decide(c: Exclude<Choice, null>) {
    setChoice(c)
    try {
      window.localStorage.setItem(STORAGE_KEY, c)
    } catch {
      // ignore — UI still hides
    }
  }

  // Don't render anything during SSR or before we've checked localStorage,
  // and hide entirely once a choice is recorded.
  if (!mounted || choice !== null) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[640px] border border-white/[0.12] backdrop-blur-md md:inset-x-auto md:right-6 md:bottom-6 md:max-w-[440px]"
      style={{ background: "rgba(8,8,9,0.92)" }}
    >
      <div className="p-5 md:p-6">
        <p
          className="mb-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em]"
          style={{ color: GREEN }}
        >
          ✦ A note on cookies
        </p>
        <h2 className="text-[18px] font-medium tracking-[-0.01em] text-white">
          A few cookies, no tracking circus.
        </h2>
        <p className="mt-2 text-[13.5px] leading-[1.65] text-white/65">
          Strictly-necessary cookies keep you signed in. Analytics cookies help us see which
          pages teams find useful — fully anonymous, EU-hosted, no third-party advertisers.
          You can change your mind anytime in{" "}
          <Link href="/privacy" className="text-white/85 underline-offset-4 transition-colors hover:text-white" style={{ textDecoration: "underline", textDecorationColor: GREEN }}>
            Privacy
          </Link>
          .
        </p>
        <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="inline-flex items-center justify-center rounded-full px-5 py-[10px] text-[13px] font-medium text-black transition-all hover:translate-y-[-1px] hover:shadow-[0_6px_18px_rgba(0,209,122,0.3)]"
            style={{ background: GREEN }}
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => decide("necessary-only")}
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-[10px] text-[13px] font-medium text-white transition-colors hover:border-white/40"
          >
            Necessary only
          </button>
        </div>
      </div>
    </div>
  )
}
