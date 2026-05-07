"use client"

/* ──────────────────────────────────────────────────────────────
   Editorial design system — Efficyon marketing
   Dark · Refined · Green-accent (#00D17A) · Serif-italic punctuation

   Use these primitives across every marketing page so the look stays
   consistent. The homepage is the reference implementation.
   ────────────────────────────────────────────────────────────── */

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { ArrowUpRight, ArrowRight } from "lucide-react"

export const GREEN = "#00D17A"
export const GREEN_SOFT = "rgba(0, 209, 122, 0.14)"
export const BG = "#080809"

/* ─────────── reveal-on-scroll hook ─────────── */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShown(true),
      { threshold: 0.12 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return { ref, shown }
}

/* ─────────── Background ─────────── */
export function BackgroundTexture() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 12% -10%, rgba(0,209,122,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 95% 5%, rgba(0,209,122,0.05), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </>
  )
}

/* ─────────── Shell wrapper ─────────── */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen text-white antialiased selection:bg-[color:var(--green)] selection:text-black"
      style={{
        ["--green" as string]: GREEN,
        ["--green-soft" as string]: GREEN_SOFT,
        background: BG,
      } as React.CSSProperties}
    >
      <BackgroundTexture />
      {children}
    </div>
  )
}

/* ─────────── Editorial Nav ─────────── */
export function EditorialNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 h-[64px] backdrop-blur-md transition-colors ${
        scrolled ? "border-b border-white/[0.07]" : "border-b border-transparent"
      }`}
      style={{ background: "rgba(8,8,9,0.78)" }}
    >
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-6 md:px-12">
        <Link href="/" className="group flex items-center gap-2.5 text-[15px] font-medium tracking-[-0.01em]">
          <Image
            src="/logo.png"
            alt="Efficyon"
            width={32}
            height={32}
            priority
            className="h-7 w-auto object-contain"
          />
          <span>Efficyon</span>
          <span
            className="hidden md:inline-block translate-y-[1px] font-[family-name:var(--font-instrument-serif)] text-[14px] italic text-white/40"
          >
            / cost intelligence
          </span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          <NavLink href="/features">Features</NavLink>
          <NavLink href="/integrations">Integrations</NavLink>
          <NavLink href="/solutions">Solutions</NavLink>
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/#pricing">Pricing</NavLink>
          <NavLink href="/login">Login</NavLink>
        </div>

        <Link
          href="/register"
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white px-4 py-[7px] text-[13px] font-medium text-black transition-all hover:bg-[color:var(--green)] hover:text-black"
        >
          Book a demo
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
        </Link>
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[13px] text-white/60 transition-colors hover:text-white">
      {children}
    </Link>
  )
}

/* ─────────── Editorial Footer ─────────── */
const FOOTER_LINKS = {
  Product: [
    ["Features", "/features"],
    ["Integrations", "/integrations"],
    ["Solutions", "/solutions"],
    ["Pricing", "/#pricing"],
    ["Compare", "/compare"],
  ],
  Resources: [
    ["Blog", "/blog"],
    ["ROI Calculator", "/calculator/roi"],
    ["SaaS Cost Calculator", "/calculator/saas-cost"],
    ["Waste Estimator", "/calculator/waste-estimator"],
    ["Benchmarks", "/benchmarks"],
    ["Tools Directory", "/tools"],
  ],
  Company: [
    ["Login", "/login"],
    ["Register", "/register"],
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
    ["Contact", "mailto:info@efficyon.com"],
  ],
} as const

export function EditorialFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08]">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-12">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-[16px] font-medium tracking-[-0.01em]">
            <Image
              src="/logo.png"
              alt="Efficyon"
              width={32}
              height={32}
              className="h-7 w-auto object-contain"
            />
            Efficyon
          </Link>
          <p className="mt-4 max-w-[300px] text-[13.5px] leading-[1.7] text-white/45">
            Cost intelligence for SaaS-heavy teams. We watch the gap between what
            you pay and what you actually use.
          </p>
          <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/35">
            Built in Gothenburg · EU-hosted
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([title, items]) => (
          <FooterCol key={title} title={title} items={items as readonly (readonly [string, string])[]} />
        ))}
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-3 border-t border-white/[0.08] px-6 py-6 text-[12px] text-white/40 md:flex-row md:items-center md:px-12">
        <span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.14em]">
          © 2026 Efficyon AB
        </span>
        <span className="font-[family-name:var(--font-instrument-serif)] italic text-white/35">
          The waste hides in the gap.
        </span>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }: { title: string; items: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <p className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
        {title}
      </p>
      <ul className="space-y-3">
        {items.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-[13.5px] text-white/65 transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────── Eyebrow ─────────── */
export function EditorialEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
      style={{ color: GREEN }}
    >
      ✦ {children}
    </p>
  )
}

/* ─────────── Section ─────────── */
export function EditorialSection({
  children,
  className = "",
  border = true,
  id,
}: {
  children: ReactNode
  className?: string
  border?: boolean
  id?: string
}) {
  return (
    <section
      id={id}
      className={`relative z-10 mx-auto max-w-[1240px] px-6 py-32 md:px-12 ${
        border ? "border-t border-white/[0.08]" : ""
      } ${className}`}
    >
      {children}
    </section>
  )
}

/* ─────────── Hero (page-level title block) ─────────── */
export function EditorialPageHero({
  eyebrow,
  title,
  italic,
  body,
  primaryCta,
  secondaryCta,
}: {
  eyebrow?: string
  title: string
  italic?: string
  body?: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}) {
  return (
    <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-20 pt-[160px] md:px-12 md:pb-28 md:pt-[180px]">
      {eyebrow && (
        <div className="mb-10 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/55">
            {eyebrow}
          </span>
        </div>
      )}
      <h1 className="max-w-[18ch] text-[clamp(48px,6.5vw,92px)] font-medium leading-[0.96] tracking-[-0.045em]">
        {title}
        {italic && (
          <>
            {" "}
            <span
              className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
              style={{ color: GREEN }}
            >
              {italic}
            </span>
          </>
        )}
      </h1>

      {body && (
        <p className="mt-10 max-w-[560px] text-[18px] font-light leading-[1.65] text-white/65">
          {body}
        </p>
      )}

      {(primaryCta || secondaryCta) && (
        <div className="mt-10 flex flex-wrap items-center gap-5">
          {primaryCta && (
            <EditorialCTA href={primaryCta.href}>{primaryCta.label}</EditorialCTA>
          )}
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="group inline-flex items-center gap-2 text-[14px] text-white/65 transition-colors hover:text-white"
            >
              {secondaryCta.label}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

/* ─────────── Section heading + intro paragraph ─────────── */
export function EditorialSectionIntro({
  eyebrow,
  title,
  italic,
  body,
}: {
  eyebrow: string
  title: string
  italic?: string
  body?: string
}) {
  return (
    <div className="mb-16 grid gap-12 md:grid-cols-2 md:items-end">
      <div>
        <EditorialEyebrow>{eyebrow}</EditorialEyebrow>
        <h2 className="text-[clamp(36px,4.2vw,60px)] font-medium leading-[1.02] tracking-[-0.035em]">
          {title}
          {italic && (
            <>
              {" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                {italic}
              </span>
            </>
          )}
        </h2>
      </div>
      {body && (
        <p className="max-w-[460px] text-[16px] leading-[1.7] text-white/55 md:justify-self-end">
          {body}
        </p>
      )}
    </div>
  )
}

/* ─────────── CTA button ─────────── */
export function EditorialCTA({
  href,
  children,
  variant = "primary",
}: {
  href: string
  children: ReactNode
  variant?: "primary" | "outline"
}) {
  if (variant === "outline") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-6 py-[14px] text-[14px] font-medium text-white transition-all hover:border-white/40"
      >
        {children}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-full px-6 py-[14px] text-[14px] font-medium text-black transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_30px_rgba(0,209,122,0.35)]"
      style={{ background: GREEN }}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

/* ─────────── Editorial card (link in a row-list) ─────────── */
export function EditorialCard({
  href,
  index,
  title,
  italic,
  body,
  meta,
}: {
  href: string
  index?: number
  title: string
  italic?: string
  body: string
  meta?: string
}) {
  const { ref, shown } = useReveal<HTMLAnchorElement>()
  const hasIndex = typeof index === "number"
  return (
    <Link
      ref={ref}
      href={href}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(12px)",
      }}
      className={`group grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 transition-all duration-500 ease-out hover:bg-white/[0.012] md:gap-12 ${
        hasIndex ? "md:grid-cols-[60px_1fr_auto]" : "md:grid-cols-[1fr_auto]"
      }`}
    >
      {hasIndex && (
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
          {String(index! + 1).padStart(2, "0")}
        </span>
      )}
      <div>
        <h3 className="text-[24px] font-medium tracking-[-0.02em] transition-colors group-hover:[color:var(--green)] md:text-[28px]">
          {title}
          {italic && (
            <>
              {" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                {italic}
              </span>
            </>
          )}
        </h3>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.65] text-white/55">{body}</p>
        {meta && (
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/40">
            {meta}
          </p>
        )}
      </div>
      <span className="flex items-center gap-2 self-end font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/45 transition-colors group-hover:text-white">
        Read
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  )
}

/* ─────────── Final CTA block ─────────── */
export function EditorialFinalCTA({
  eyebrow = "Get started",
  title,
  italic,
  body,
  primaryCta = { label: "Book a free demo", href: "/register" },
  secondaryCta = { label: "Or start free →", href: "/register" },
}: {
  eyebrow?: string
  title: string
  italic?: string
  body?: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}) {
  return (
    <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-32 md:px-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 -z-10 h-[340px] w-[340px] -translate-y-1/2 rounded-full opacity-60 blur-[80px]"
        style={{ background: "radial-gradient(circle, rgba(0,209,122,0.35), transparent 70%)" }}
      />
      <EditorialEyebrow>{eyebrow}</EditorialEyebrow>
      <h2 className="max-w-[16ch] text-[clamp(40px,5.5vw,80px)] font-medium leading-[0.98] tracking-[-0.04em]">
        {title}
        {italic && (
          <>
            {" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic" style={{ color: GREEN }}>
              {italic}
            </span>
          </>
        )}
      </h2>
      {body && (
        <p className="mt-8 max-w-[480px] text-[16px] leading-[1.7] text-white/55">{body}</p>
      )}
      <div className="mt-10 flex flex-wrap items-center gap-6">
        <EditorialCTA href={primaryCta.href}>{primaryCta.label}</EditorialCTA>
        <Link href={secondaryCta.href} className="text-[14px] text-white/65 transition-colors hover:text-white">
          {secondaryCta.label}
        </Link>
      </div>
    </section>
  )
}

/* ─────────── Mono label ─────────── */
export function EditorialMonoLabel({
  children,
  green = false,
}: {
  children: ReactNode
  green?: boolean
}) {
  return (
    <span
      className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em]"
      style={{ color: green ? GREEN : "rgba(255,255,255,0.45)" }}
    >
      {children}
    </span>
  )
}
