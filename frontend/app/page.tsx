"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, ArrowRight } from "lucide-react"

/* ──────────────────────────────────────────────────────────────
   Efficyon — Editorial Homepage
   Dark · Refined · Green-accent · Serif-italic punctuation
   ────────────────────────────────────────────────────────────── */

const GREEN = "#00D17A"
const GREEN_SOFT = "rgba(0, 209, 122, 0.14)"

/* tiny hook: reveal-on-scroll */
function useReveal<T extends HTMLElement>() {
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

export default function HomePage() {
  return (
    <div
      className="min-h-screen text-white antialiased selection:bg-[color:var(--green)] selection:text-black"
      style={{
        ["--green" as string]: GREEN,
        ["--green-soft" as string]: GREEN_SOFT,
        background: "#080809",
      } as React.CSSProperties}
    >
      <BackgroundTexture />
      <NavBar />
      <Hero />
      <Numbers />
      <Integrations />
      <HowItWorks />
      <Findings />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}

/* ───────────────────────── BACKGROUND ───────────────────────── */
function BackgroundTexture() {
  return (
    <>
      {/* radial green wash, top-left */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 12% -10%, rgba(0,209,122,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 95% 5%, rgba(0,209,122,0.05), transparent 65%)",
        }}
      />
      {/* faint grain */}
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

/* ─────────────────────────── NAV ─────────────────────────── */
function NavBar() {
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
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-medium tracking-[-0.01em]">
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
          <a href="#how" className="text-[13px] text-white/60 transition-colors hover:text-white">
            How it works
          </a>
          <a href="#findings" className="text-[13px] text-white/60 transition-colors hover:text-white">
            What we find
          </a>
          <a href="#pricing" className="text-[13px] text-white/60 transition-colors hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="text-[13px] text-white/60 transition-colors hover:text-white">
            Login
          </Link>
        </div>

        <Link
          href="/register"
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white px-4 py-[7px] text-[13px] font-medium text-black transition-all hover:bg-[color:var(--green)] hover:text-black"
        >
          Get started
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
        </Link>
      </div>
    </nav>
  )
}

/* ─────────────────────────── HERO ─────────────────────────── */
function Hero() {
  return (
    <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 pt-[180px] md:px-12 md:pb-32 md:pt-[200px]">
      <div className="mb-12 flex items-center gap-3">
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: "var(--green)" }}
        />
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/55">
          SaaS Cost Intelligence — Live ✦ EU-hosted
        </span>
      </div>

      <h1 className="max-w-[12ch] text-[clamp(56px,8vw,112px)] font-medium leading-[0.94] tracking-[-0.045em] text-white">
        Stop paying for{" "}
        <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
          SaaS
        </span>{" "}
        you{" "}
        <span
          className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
          style={{ color: "var(--green)" }}
        >
          don&apos;t use.
        </span>
      </h1>

      <div className="mt-12 grid items-end gap-10 md:grid-cols-[1.4fr_1fr]">
        <p className="max-w-[520px] text-[18px] font-light leading-[1.65] text-white/65">
          Efficyon connects your accounting data with your actual license usage —
          and shows you exactly where the money is leaking. Every month. In dollars,
          not dashboards.
        </p>

        <div className="flex flex-wrap items-center gap-5">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-[14px] text-[14px] font-medium text-black transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_30px_rgba(0,209,122,0.35)]"
            style={{ background: "var(--green)" }}
          >
            Start free analysis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how"
            className="group inline-flex items-center gap-2 text-[14px] text-white/65 transition-colors hover:text-white"
          >
            See how it works
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </div>
      </div>

      {/* Editorial signature line */}
      <div className="mt-24 flex items-center gap-6 text-[12px] text-white/40">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.18em]">
          № 001 · The new way to manage SaaS spend
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </section>
  )
}

/* ─────────────────────────── NUMBERS ─────────────────────────── */
function Numbers() {
  const items = [
    {
      val: "$18.5k",
      sub: "modeled leak in a typical 18-person stack",
      tone: "green",
    },
    {
      val: "10",
      unit: "min",
      sub: "to connect & run your first analysis",
      tone: "white",
    },
    {
      val: "5×",
      sub: "fee refund guarantee — or you don't pay",
      tone: "green",
    },
  ] as const

  return (
    <section className="relative z-10 mx-auto max-w-[1240px] px-6 md:px-12">
      <div className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-3 md:divide-x md:divide-y-0">
        {items.map((it, i) => (
          <div key={i} className="px-0 py-12 md:px-12">
            <div className="mb-3 flex items-baseline gap-2">
              <span
                className="text-[clamp(48px,5.5vw,72px)] font-medium leading-none tracking-[-0.04em]"
                style={{ color: it.tone === "green" ? "var(--green)" : "white" }}
              >
                {it.val}
              </span>
              {"unit" in it && it.unit && (
                <span className="font-[family-name:var(--font-instrument-serif)] text-[28px] italic text-white/55">
                  {it.unit}
                </span>
              )}
            </div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
              {it.sub}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────── INTEGRATIONS ─────────────────────────── */
function Integrations() {
  const tools = [
    { name: "Fortnox", weight: 600 },
    { name: "Microsoft 365", weight: 500 },
    { name: "HubSpot", weight: 600 },
    { name: "QuickBooks", weight: 500 },
    { name: "Xero", weight: 600 },
    { name: "Stripe", weight: 500 },
    { name: "Shopify", weight: 600 },
    { name: "Google Workspace", weight: 500 },
    { name: "Visma", weight: 600 },
    { name: "OpenAI", weight: 500 },
    { name: "Anthropic", weight: 600 },
    { name: "Asana", weight: 500 },
    { name: "Airtable", weight: 600 },
  ]

  return (
    <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
      <div className="mb-12 flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <p
            className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "var(--green)" }}
          >
            ✦ Connects to
          </p>
          <h3 className="text-[20px] tracking-[-0.01em] text-white/70">
            <span className="font-[family-name:var(--font-instrument-serif)] italic text-white">
              The systems you already use.
            </span>
          </h3>
        </div>
        <Link
          href="/integrations"
          className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white"
        >
          See all integrations →
        </Link>
      </div>

      <ul className="flex flex-wrap items-baseline gap-x-10 gap-y-6">
        {tools.map((t, i) => (
          <li
            key={t.name}
            className="group flex items-baseline gap-3 transition-colors"
          >
            <span
              className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-white/25"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className="text-[clamp(20px,2vw,28px)] tracking-[-0.015em] text-white/55 transition-colors group-hover:text-white"
              style={{ fontWeight: t.weight }}
            >
              {t.name}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-12 max-w-[600px] text-[13.5px] leading-[1.7] text-white/40">
        Read-only OAuth on every connection. We never write, modify, or delete —
        guaranteed in your contract. New integrations ship every month.
      </p>
    </section>
  )
}

/* ─────────────────────────── HOW IT WORKS ─────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Connect your systems",
      body: "Link Fortnox, Microsoft 365, HubSpot, QuickBooks and more in under 10 minutes. Read-only access — we never modify your data, guaranteed in writing.",
    },
    {
      num: "02",
      title: "We find the gaps",
      body: "Efficyon cross-references what you pay against who actually uses what — surfacing dormant licenses, unnoticed price hikes, and forgotten tools.",
    },
    {
      num: "03",
      title: "You act on it",
      body: "Get a clear monthly report with exactly what to cut, downgrade, or renegotiate — with dollar savings per action. You decide what to do.",
    },
  ]

  return (
    <section id="how" className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-32 md:px-12">
      <div className="mb-20 grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-end">
        <div>
          <p
            className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "var(--green)" }}
          >
            ✦ How it works
          </p>
          <h2 className="text-[clamp(36px,4.2vw,60px)] font-medium leading-[1.02] tracking-[-0.035em]">
            Three steps to{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
              clarity.
            </span>
          </h2>
        </div>
        <p className="max-w-[460px] text-[16px] leading-[1.7] text-white/55 md:justify-self-end md:text-right">
          The whole flow takes less than the average meeting about your SaaS budget.
          Then it runs every month, in the background, forever.
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-3 md:gap-16">
        {steps.map((s, i) => {
          return <StepCard key={s.num} {...s} index={i} />
        })}
      </div>

      {/* Animated companion to the three steps */}
      <HowItWorksVideo />
    </section>
  )
}

/* ─── HowItWorks animated companion ─── */
function HowItWorksVideo() {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(16px)",
      }}
      className="mt-20 transition-all duration-700 ease-out"
    >
      <div className="mb-4 flex items-center text-[11px] text-white/40 font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em]">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: "var(--green)" }}
          />
          <span>// The flow, animated</span>
        </div>
      </div>

      <div
        className="relative overflow-hidden border border-white/[0.08]"
        style={{
          aspectRatio: "16 / 9",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(0,209,122,0.03) 100%), #0a0a0b",
        }}
      >
        {/* Editorial corner ticks */}
        <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-white/30" aria-hidden />
        <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-white/30" aria-hidden />
        <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-white/30" aria-hidden />
        <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-white/30" aria-hidden />

        {/* Empty-state fallback */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-3 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.3em] text-white/25">
              ✦ Composition · HowItWorksLoop
            </div>
            <div className="font-[family-name:var(--font-instrument-serif)] text-[24px] italic text-white/30">
              Connect → Reconcile → Report.
            </div>
          </div>
        </div>

        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/how-it-works.webm" type="video/webm" />
          <source src="/videos/how-it-works.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  )
}

function StepCard({
  num,
  title,
  body,
  index,
}: {
  num: string
  title: string
  body: string
  index: number
}) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${index * 90}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(18px)",
      }}
      className="transition-all duration-700 ease-out"
    >
      <div className="mb-6 flex items-center gap-4">
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tracking-[0.1em] text-white/30">
          {num}
        </span>
        <span className="h-px w-10" style={{ background: "var(--green)" }} />
      </div>
      <h3 className="mb-3 text-[22px] font-medium tracking-[-0.015em] text-white">
        {title}
      </h3>
      <p className="text-[14.5px] leading-[1.75] text-white/55">{body}</p>
    </div>
  )
}

/* ─────────────────────────── FINDINGS ─────────────────────────── */
function Findings() {
  const rows = [
    {
      tool: "Microsoft 365",
      desc: "10 over-provisioned licenses — Business Premium used only for email",
      amount: "$6,200",
    },
    {
      tool: "HubSpot",
      desc: "5 of 8 seats unused or barely active for the past 90 days",
      amount: "$4,300",
    },
    {
      tool: "Intercom",
      desc: "Tool already replaced internally — still being billed monthly",
      amount: "$3,250",
    },
    {
      tool: "Price drift",
      desc: "Unnoticed 15–25% renewal increases across three SaaS vendors",
      amount: "$2,700",
    },
  ]

  return (
    <section
      id="findings"
      className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-32 md:px-12"
    >
      <div className="grid gap-20 md:grid-cols-[1.35fr_1fr] md:gap-24">
        <div>
          <p
            className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "var(--green)" }}
          >
            ✦ What we find
          </p>
          <h2 className="mb-7 max-w-[12ch] text-[clamp(36px,4.2vw,60px)] font-medium leading-[1.02] tracking-[-0.035em]">
            The waste hides{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
              in the gap.
            </span>
          </h2>
          <p className="mb-14 max-w-[440px] text-[15.5px] leading-[1.75] text-white/55">
            No one is watching both sides at once — what you&apos;re paying for and what
            your team actually uses. That&apos;s where the money disappears.
          </p>

          <div className="border-t border-white/[0.08]">
            {rows.map((r, i) => (
              <FindingRow key={r.tool} {...r} index={i} />
            ))}
          </div>

          <div className="mt-7 flex items-baseline justify-between gap-6 pt-2">
            <div>
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                Sample scan · illustrative 18-person stack
              </p>
              <p className="mt-1 text-[12px] text-white/35">
                Numbers compound annually. Your scan will surface different ones.
              </p>
            </div>
            <div className="text-right">
              <span
                className="text-[clamp(40px,4.5vw,56px)] font-medium leading-none tracking-[-0.035em]"
                style={{ color: "var(--green)" }}
              >
                $18,500
              </span>
              <span className="ml-1 font-[family-name:var(--font-instrument-serif)] text-[24px] italic text-white/55">
                /yr
              </span>
            </div>
          </div>
        </div>

        {/* Right column — methodology + security */}
        <aside className="space-y-12 md:pt-20">
          <figure>
            <p
              className="mb-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45"
            >
              ✦ The approach
            </p>
            <p className="font-[family-name:var(--font-instrument-serif)] text-[26px] leading-[1.45] tracking-[-0.005em] text-white/85">
              Discovery tools tell you what you bought. Usage tools tell you who
              logged in.{" "}
              <em className="not-italic" style={{ color: "var(--green)" }}>
                Neither tells you what&apos;s leaking
              </em>{" "}
              — because the leak only shows up when you compare both sides. We
              connect your accounting feed to your real usage data and run that
              comparison every month. The output is{" "}
              <em className="not-italic" style={{ color: "var(--green)" }}>
                dollars, not dashboards
              </em>
              .
            </p>
            <figcaption className="mt-6 flex items-center gap-3 text-[12px] uppercase tracking-[0.16em] text-white/45 font-[family-name:var(--font-geist-mono)]">
              <span className="h-px w-8" style={{ background: "var(--green)" }} />
              Efficyon · Cost intelligence · Gothenburg
            </figcaption>
          </figure>

          <div className="border-t border-white/[0.08] pt-10">
            <p
              className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45"
            >
              Security &amp; access
            </p>
            <p className="text-[14px] leading-[1.7] text-white/60">
              Efficyon uses read-only access to your systems. Our code makes only
              <span className="font-[family-name:var(--font-geist-mono)] text-white/80"> GET </span>
              requests — it is technically impossible for us to write, modify, or
              delete anything in your accounts. Guaranteed in your contract.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function FindingRow({
  tool,
  desc,
  amount,
  index,
}: {
  tool: string
  desc: string
  amount: string
  index: number
}) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${index * 80}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateX(0)" : "translateX(-12px)",
      }}
      className="grid grid-cols-[110px_1fr_auto] items-baseline gap-6 border-b border-white/[0.08] py-5 transition-all duration-500 ease-out hover:bg-white/[0.015]"
    >
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/55">
        {tool}
      </span>
      <span className="text-[14.5px] leading-[1.5] text-white/85">{desc}</span>
      <span
        className="text-right text-[20px] font-medium tracking-[-0.02em]"
        style={{ color: "var(--green)" }}
      >
        {amount}
        <span className="ml-1 text-[12px] text-white/40 font-[family-name:var(--font-geist-mono)]">/yr</span>
      </span>
    </div>
  )
}

/* ─────────────────────────── PRICING ─────────────────────────── */
type Billing = "6mo" | "monthly" | "yearly"

interface Plan {
  name: string
  tag: string
  description: string
  prices: Record<Billing, { value: string; suffix: string }>
  features: string[]
  cta: string
  ctaHref: string
  highlight: boolean
  custom?: boolean
}

const PLANS: Plan[] = [
  {
    name: "Startup",
    tag: "1–10 employees",
    description: "Get your first audit running in under 10 minutes.",
    prices: {
      "6mo": { value: "$199", suffix: "for 6 months" },
      monthly: { value: "$39", suffix: "per month" },
      yearly: { value: "$31", suffix: "per month, billed yearly" },
    },
    features: [
      "AI-driven process analysis",
      "Monthly optimization reports",
      "Email support",
      "Basic integrations",
      "ROI tracking",
      "5 integrations",
      "10 monthly tokens",
      "Up to 3 team members",
    ],
    cta: "Try free",
    ctaHref: "/register",
    highlight: false,
  },
  {
    name: "Growth",
    tag: "Most popular · 11–50 employees",
    description: "Everything you need to keep waste out of the stack.",
    prices: {
      "6mo": { value: "$599", suffix: "for 6 months" },
      monthly: { value: "$119", suffix: "per month" },
      yearly: { value: "$95", suffix: "per month, billed yearly" },
    },
    features: [
      "Everything in Startup, plus —",
      "Advanced AI analysis",
      "Custom automations",
      "Priority support",
      "API integrations",
      "Team training included",
      "15 integrations",
      "50 monthly tokens",
      "Up to 10 team members",
    ],
    cta: "Try free",
    ctaHref: "/register",
    highlight: true,
  },
  {
    name: "Enterprise",
    tag: "50+ employees",
    description: "For finance & IT teams that need control, SLAs and depth.",
    prices: {
      "6mo": { value: "Custom", suffix: "tailored pricing" },
      monthly: { value: "Custom", suffix: "tailored pricing" },
      yearly: { value: "Custom", suffix: "tailored pricing" },
    },
    features: [
      "Everything in Growth, plus —",
      "Dedicated team",
      "Custom AI model",
      "On-premise deployment",
      "SLA guarantee",
      "Quarterly strategy review",
      "Unlimited integrations",
      "200 monthly tokens",
      "Unlimited team members",
    ],
    cta: "Contact us",
    ctaHref: "#contact",
    highlight: false,
    custom: true,
  },
]

function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly")

  return (
    <section
      id="pricing"
      className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-32 md:px-12"
    >
      <div className="mb-16 grid gap-12 md:grid-cols-2 md:items-end">
        <div>
          <p
            className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "var(--green)" }}
          >
            ✦ Pricing
          </p>
          <h2 className="text-[clamp(36px,4.2vw,60px)] font-medium leading-[1.02] tracking-[-0.035em]">
            Simple, honest{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
              pricing.
            </span>
          </h2>
        </div>
        <p className="max-w-[460px] text-[16px] leading-[1.7] text-white/55 md:justify-self-end">
          The savings we find typically pay for the subscription many times over.
          All plans include our 90-day ROI guarantee — we only win when you do.
        </p>
      </div>

      <BillingToggle billing={billing} setBilling={setBilling} />

      <div className="mt-2 border-t border-white/[0.08]">
        {PLANS.map((p, i) => (
          <PlanRow key={p.name} plan={p} billing={billing} index={i} />
        ))}
      </div>
    </section>
  )
}

function BillingToggle({
  billing,
  setBilling,
}: {
  billing: Billing
  setBilling: (b: Billing) => void
}) {
  const opts: { id: Billing; label: string; note?: string }[] = [
    { id: "6mo", label: "6 months" },
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly", note: "save ~20%" },
  ]
  return (
    <div className="mb-10 flex flex-wrap items-center gap-2">
      <span className="mr-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/40">
        Billed —
      </span>
      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {opts.map((o) => {
          const active = billing === o.id
          return (
            <button
              key={o.id}
              onClick={() => setBilling(o.id)}
              className={`relative rounded-full px-4 py-1.5 text-[12.5px] font-medium tracking-[-0.005em] transition-colors ${
                active ? "text-black" : "text-white/55 hover:text-white"
              }`}
              style={active ? { background: "var(--green)" } : undefined}
            >
              {o.label}
              {o.note && (
                <span
                  className={`ml-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] ${
                    active ? "text-black/60" : "text-white/30"
                  }`}
                >
                  · {o.note}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlanRow({
  plan,
  billing,
  index,
}: {
  plan: Plan
  billing: Billing
  index: number
}) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const price = plan.prices[billing]
  const isCustom = plan.custom

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${index * 90}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(14px)",
      }}
      className="group relative grid grid-cols-1 gap-8 border-b border-white/[0.08] py-12 transition-all duration-500 ease-out md:grid-cols-[220px_1fr_auto] md:gap-14"
    >
      {plan.highlight && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-px"
          style={{ background: "var(--green)" }}
        />
      )}

      <div className={plan.highlight ? "pl-4 md:pl-6" : ""}>
        <h3 className="text-[26px] font-medium tracking-[-0.025em] transition-colors group-hover:[color:var(--green)]">
          {plan.name}
        </h3>
        <p
          className={`mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] ${
            plan.highlight ? "" : "text-white/45"
          }`}
          style={plan.highlight ? { color: "var(--green)" } : undefined}
        >
          {plan.tag}
        </p>
        <p className="mt-4 max-w-[200px] text-[13.5px] leading-[1.55] text-white/55">
          {plan.description}
        </p>
      </div>

      <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-baseline gap-3 text-[14px] text-white/70">
            <span
              className="mt-[6px] inline-block h-[3px] w-[3px] flex-shrink-0 rounded-full"
              style={{ background: "var(--green)" }}
            />
            {f}
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-start md:items-end">
        <div className="flex items-baseline">
          <span
            key={`${plan.name}-${billing}`}
            className={`animate-[fadeIn_0.35s_ease] text-[44px] font-medium leading-none tracking-[-0.04em] ${
              isCustom
                ? "font-[family-name:var(--font-instrument-serif)] italic font-normal text-[34px]"
                : ""
            }`}
          >
            {price.value}
          </span>
        </div>
        <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-white/45 md:text-right">
          {price.suffix}
        </p>
        <Link
          href={plan.ctaHref}
          className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium transition-all ${
            plan.highlight
              ? "text-black hover:opacity-90 hover:shadow-[0_8px_24px_rgba(0,209,122,0.3)]"
              : "border border-white/15 text-white hover:border-white/40"
          }`}
          style={plan.highlight ? { background: "var(--green)" } : undefined}
        >
          {plan.cta}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

/* ─────────────────────────── FINAL CTA ─────────────────────────── */
function FinalCTA() {
  return (
    <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-36 md:px-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 -z-10 h-[340px] w-[340px] -translate-y-1/2 rounded-full opacity-60 blur-[80px]"
        style={{ background: "radial-gradient(circle, rgba(0,209,122,0.35), transparent 70%)" }}
      />

      <p
        className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em]"
        style={{ color: "var(--green)" }}
      >
        ✦ Get started
      </p>

      <h2 className="max-w-[14ch] text-[clamp(48px,6.5vw,96px)] font-medium leading-[0.96] tracking-[-0.045em]">
        See what we{" "}
        <span
          className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
          style={{ color: "var(--green)" }}
        >
          find
        </span>{" "}
        in your stack.
      </h2>

      <p className="mt-10 max-w-[480px] text-[16px] leading-[1.7] text-white/55">
        20 minutes. No commitment. We&apos;ll connect to one system, run your first
        analysis, and show you the numbers. If we don&apos;t find at least 5× what you&apos;d
        pay us — you walk.
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-6">
        <Link
          href="/register"
          className="group inline-flex items-center gap-2 rounded-full px-7 py-4 text-[14px] font-medium text-black transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_30px_rgba(0,209,122,0.35)]"
          style={{ background: "var(--green)" }}
        >
          Start free analysis
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/register"
          className="text-[14px] text-white/65 transition-colors hover:text-white"
        >
          Or start free →
        </Link>
      </div>

      <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.14em] text-white/45">
        {["No credit card", "Read-only access", "Cancel anytime", "EU-hosted data"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
            {t}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ─────────────────────────── FOOTER ─────────────────────────── */
function Footer() {
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

        <FooterCol
          title="Product"
          items={[
            ["Features", "/features"],
            ["Integrations", "/integrations"],
            ["Solutions", "/solutions"],
            ["Pricing", "#pricing"],
          ]}
        />
        <FooterCol
          title="Resources"
          items={[
            ["Blog", "/blog"],
            ["ROI Calculator", "/calculator/roi"],
            ["SaaS Benchmarks", "/benchmarks"],
            ["Compare", "/compare"],
          ]}
        />
        <FooterCol
          title="Company"
          items={[
            ["Login", "/login"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
            ["Contact", "mailto:info@efficyon.com"],
          ]}
        />
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

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <p className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
        {title}
      </p>
      <ul className="space-y-3">
        {items.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-[13.5px] text-white/65 transition-colors hover:text-white"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
