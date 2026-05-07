"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight, ChevronDown } from "lucide-react"
import {
  EditorialEyebrow,
  EditorialCTA,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"
import { RelatedLinks } from "@/components/marketing/related-links"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"

/* ------------------------------------------------------------------ */
/*  Pricing tiers (preserved)                                         */
/* ------------------------------------------------------------------ */
function getEfficyonPlan(employees: number): { name: string; monthly: number; annual: number } {
  if (employees <= 10) return { name: "Startup", monthly: 39, annual: 39 * 12 }
  if (employees <= 50) return { name: "Growth", monthly: 119, annual: 119 * 12 }
  const price = Math.max(200, employees * 5)
  return { name: "Enterprise", monthly: price, annual: price * 12 }
}

/* ------------------------------------------------------------------ */
/*  FAQ data (preserved)                                              */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "How are the license optimization savings calculated?",
    a: "License optimization savings are estimated at 15-25% of your monthly SaaS spend, depending on the number of tools and employees. This figure is based on industry research showing that the average organization wastes 20-30% of its SaaS budget on unused or underutilized licenses. The calculator uses a conservative model that accounts for your company size and tool count to produce a realistic estimate.",
  },
  {
    q: "What is included in duplicate elimination savings?",
    a: "Duplicate elimination savings account for the cost of running multiple tools that serve the same purpose across different teams. The calculator estimates this at 5-10% of total spend based on your number of SaaS tools. Companies with more tools are statistically more likely to have overlapping subscriptions. Common duplicates include project management tools, video conferencing platforms, and file storage services.",
  },
  {
    q: "How is the payback period determined?",
    a: "The payback period represents the number of days it takes for your cumulative savings from Efficyon to exceed the cost of your Efficyon subscription. It is calculated by dividing your annual Efficyon cost by your daily projected savings. Most companies see payback within 15-45 days, meaning the platform pays for itself within the first one to two months.",
  },
  {
    q: "Are these ROI projections guaranteed?",
    a: "While these projections are based on industry averages and conservative formulas, actual results vary by organization. Efficyon offers a fee-refund guarantee — if you don't see measurable savings within the guarantee window, your subscription fees are refunded.",
  },
]

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

/* ------------------------------------------------------------------ */
/*  Editorial primitives (local helpers, no external deps)             */
/* ------------------------------------------------------------------ */
const inputClass =
  "w-full bg-transparent border-0 border-b border-white/[0.12] py-2 text-[15px] font-[family-name:var(--font-geist-mono)] tabular-nums text-white outline-none transition-colors placeholder:text-white/25 focus:border-[color:var(--green)]"

const sliderClass =
  "w-full h-[2px] appearance-none cursor-pointer bg-white/[0.12] accent-[color:var(--green)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--green)] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[color:var(--green)] [&::-moz-range-thumb]:border-0"

function FieldLabel({ children, value }: { children: React.ReactNode; value?: string | number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55">
        {children}
      </span>
      {value !== undefined && (
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white">
          {value}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function ROICalculatorPage() {
  /* --- inputs (preserved) --- */
  const [monthlySpend, setMonthlySpend] = useState(10000)
  const [numTools, setNumTools] = useState(30)
  const [employees, setEmployees] = useState(50)
  const [hoursManagement, setHoursManagement] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(50)

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  /* --- calculations (preserved) --- */
  const results = useMemo(() => {
    const licenseRate = 0.15 + Math.min(0.10, (numTools / 200) * 0.10)
    const licenseSavingsMonthly = Math.round(monthlySpend * licenseRate)
    const licenseSavingsAnnual = licenseSavingsMonthly * 12

    const dupeRate = 0.05 + Math.min(0.05, (numTools / 200) * 0.05)
    const dupeSavingsMonthly = Math.round(monthlySpend * dupeRate)
    const dupeSavingsAnnual = dupeSavingsMonthly * 12

    const timeSavingsMonthly = Math.round(hoursManagement * 0.6 * hourlyRate)
    const timeSavingsAnnual = timeSavingsMonthly * 12

    const totalSavingsMonthly = licenseSavingsMonthly + dupeSavingsMonthly + timeSavingsMonthly
    const totalSavingsAnnual = totalSavingsMonthly * 12

    const plan = getEfficyonPlan(employees)

    const netSavingsAnnual = totalSavingsAnnual - plan.annual
    const roiPct = plan.annual > 0 ? Math.round((netSavingsAnnual / plan.annual) * 100) : 0

    const dailySavings = totalSavingsAnnual / 365
    const paybackDaysCalc = dailySavings > 0 ? Math.round(plan.annual / dailySavings) : 999

    const threeYearSavings = netSavingsAnnual * 3
    const optimizedMonthly = monthlySpend - licenseSavingsMonthly - dupeSavingsMonthly

    return {
      licenseSavingsMonthly,
      licenseSavingsAnnual,
      licenseRate: Math.round(licenseRate * 100),
      dupeSavingsMonthly,
      dupeSavingsAnnual,
      dupeRate: Math.round(dupeRate * 100),
      timeSavingsMonthly,
      timeSavingsAnnual,
      hoursSaved: Math.round(hoursManagement * 0.6),
      totalSavingsMonthly,
      totalSavingsAnnual,
      plan,
      netSavingsAnnual,
      roiPct,
      paybackDays: paybackDaysCalc,
      threeYearSavings,
      optimizedMonthly,
    }
  }, [monthlySpend, numTools, employees, hoursManagement, hourlyRate])

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SaaS Optimization ROI Calculator",
      url: absoluteUrl("/calculator/roi"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Calculate your potential return on investment from SaaS cost optimization including license savings, duplicate elimination, and time savings.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Calculators", path: "/calculator" }, { name: "Optimization ROI Calculator", path: "/calculator/roi" }])]) }}
      />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-16 pt-[160px] md:px-12 md:pb-20 md:pt-[180px]">
        <div className="mb-10 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/55">
            Calculator · ROI model
          </span>
        </div>
        <h1 className="max-w-[20ch] text-[clamp(40px,5.6vw,80px)] font-medium leading-[0.98] tracking-[-0.04em]">
          What does cleanup{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic" style={{ color: GREEN }}>
            actually return?
          </span>
        </h1>
        <p className="mt-8 max-w-[560px] text-[17px] font-light leading-[1.65] text-white/65">
          Model the savings from license optimization, duplicate elimination, and time saved on
          manual SaaS management. Conservative formulas, transparent inputs, no email gate.
        </p>
      </section>

      {/* CALCULATOR */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 pb-24 pt-16 md:px-12">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* LEFT — inputs */}
          <div>
            <EditorialEyebrow>Your stack today</EditorialEyebrow>
            <h2 className="mb-12 text-[28px] font-medium tracking-[-0.02em] md:text-[32px]">
              Five inputs.{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                That&apos;s it.
              </span>
            </h2>

            <div className="space-y-10">
              <div>
                <FieldLabel>Monthly SaaS spend (USD)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Math.max(0, Number(e.target.value)))}
                  className={inputClass}
                />
              </div>

              <div className="space-y-3">
                <FieldLabel value={numTools}>Number of SaaS tools</FieldLabel>
                <input
                  type="range"
                  min={5}
                  max={200}
                  value={numTools}
                  onChange={(e) => setNumTools(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                  <span>200</span>
                </div>
              </div>

              <div className="space-y-3">
                <FieldLabel value={employees}>Number of employees</FieldLabel>
                <input
                  type="range"
                  min={10}
                  max={500}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>10</span>
                  <span>125</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              <div className="space-y-3">
                <FieldLabel value={`${hoursManagement}h`}>Hours / month on manual SaaS mgmt</FieldLabel>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={hoursManagement}
                  onChange={(e) => setHoursManagement(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>0h</span>
                  <span>20h</span>
                  <span>40h</span>
                  <span>80h</span>
                </div>
              </div>

              <div>
                <FieldLabel>Average hourly cost (IT / Finance, USD)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="space-y-12">
            {/* Hero result */}
            <div className="border-t border-white/[0.08] pt-10">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Modeled annual savings
              </p>
              <p
                className="mt-4 font-[family-name:var(--font-instrument-serif)] text-[clamp(72px,9vw,128px)] font-normal italic leading-[0.92] tracking-[-0.03em]"
                style={{ color: GREEN }}
              >
                ${fmt(results.totalSavingsAnnual)}
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-x-6 border-t border-white/[0.08] pt-6 font-[family-name:var(--font-geist-mono)] tabular-nums">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">Net ROI</dt>
                  <dd className="mt-2 text-[24px] text-white">{fmt(results.roiPct)}%</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">Payback</dt>
                  <dd className="mt-2 text-[24px] text-white">{results.paybackDays}d</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">3-yr net</dt>
                  <dd className="mt-2 text-[24px] text-white">${fmt(results.threeYearSavings)}</dd>
                </div>
              </dl>
            </div>

            {/* Breakdown */}
            <div>
              <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Savings breakdown
              </p>
              <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08] font-[family-name:var(--font-geist-mono)] tabular-nums">
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-[13px]">
                  <dt className="text-white/65">License optimization</dt>
                  <dd className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {results.licenseRate}%
                  </dd>
                  <dd className="text-white">${fmt(results.licenseSavingsAnnual)}/yr</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-[13px]">
                  <dt className="text-white/65">Duplicate elimination</dt>
                  <dd className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {results.dupeRate}%
                  </dd>
                  <dd className="text-white">${fmt(results.dupeSavingsAnnual)}/yr</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-[13px]">
                  <dt className="text-white/65">Time savings</dt>
                  <dd className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {results.hoursSaved}h/mo
                  </dd>
                  <dd className="text-white">${fmt(results.timeSavingsAnnual)}/yr</dd>
                </div>
              </dl>
            </div>

            {/* Spend comparison */}
            <div>
              <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Monthly spend comparison
              </p>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums">
                    <span className="text-white/55">Current</span>
                    <span className="text-white">${fmt(monthlySpend)}/mo</span>
                  </div>
                  <div className="h-[2px] w-full bg-white/[0.12]">
                    <div className="h-full bg-white/55" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums">
                    <span className="text-white/55">Optimized</span>
                    <span style={{ color: GREEN }}>${fmt(results.optimizedMonthly)}/mo</span>
                  </div>
                  <div className="h-[2px] w-full bg-white/[0.12]">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        background: GREEN,
                        width: `${monthlySpend > 0 ? (results.optimizedMonthly / monthlySpend) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Investment vs return */}
            <div>
              <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Investment vs return
              </p>
              <dl className="grid grid-cols-3 gap-6 border-y border-white/[0.08] py-6 font-[family-name:var(--font-geist-mono)] tabular-nums">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Efficyon · {results.plan.name}
                  </dt>
                  <dd className="mt-2 text-[20px] text-white">
                    ${fmt(results.plan.monthly)}
                    <span className="text-[12px] text-white/40">/mo</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Monthly savings
                  </dt>
                  <dd className="mt-2 text-[20px]" style={{ color: GREEN }}>
                    ${fmt(results.totalSavingsMonthly)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Net annual
                  </dt>
                  <dd className="mt-2 text-[20px]" style={{ color: GREEN }}>
                    ${fmt(results.netSavingsAnnual)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Cumulative timeline */}
            <div>
              <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Cumulative net · timeline
              </p>
              <dl className="grid grid-cols-4 gap-4 border-y border-white/[0.08] py-6 font-[family-name:var(--font-geist-mono)] tabular-nums">
                {[1, 3, 6, 12].map((month) => {
                  const cumulative =
                    results.totalSavingsMonthly * month - results.plan.monthly * month
                  return (
                    <div key={month}>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Month {month}
                      </dt>
                      <dd
                        className="mt-2 text-[18px]"
                        style={{ color: cumulative >= 0 ? GREEN : "rgba(255,255,255,0.55)" }}
                      >
                        {cumulative >= 0 ? "+" : ""}
                        {fmt(cumulative)}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>

            <div className="pt-4">
              <EditorialCTA href="/register">Run this on your real data</EditorialCTA>
            </div>
          </div>
        </div>
      </section>

      {/* SEO content */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <EditorialEyebrow>The model</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
              Why payback{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                is so fast.
              </span>
            </h2>
          </div>
          <div className="space-y-6 text-[15.5px] leading-[1.7] text-white/60">
            <p>
              SaaS optimization ROI is unusually compelling because the savings come from
              eliminating waste that&apos;s already on your books — not from new capability
              you have to build. The money is being spent. It&apos;s just being spent
              inefficiently.
            </p>
            <p>
              The typical company finds 20–30% of its SaaS budget going toward
              subscriptions that are underutilized, duplicated across teams, or completely
              unused. For a $10k/month stack, that&apos;s $24k–$36k of annual waste.
              Even after accounting for the cost of a platform like Efficyon, the net
              savings begin compounding from week one.
            </p>
            <p>
              Three pillars make up most of the model: license optimization (15–25% of
              spend), duplicate elimination (5–10%), and time saved automating manual
              license-tracking work. The first two free up budget; the third frees up
              the IT/Finance hours currently lost to spreadsheet reconciliation.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>FAQ</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          The questions{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            we hear most.
          </span>
        </h2>
        <div className="border-t border-white/[0.08]">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-white/[0.08]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-baseline justify-between gap-6 py-6 text-left transition-colors hover:bg-white/[0.012]"
              >
                <span className="text-[18px] font-medium tracking-[-0.01em] text-white md:text-[20px]">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-white/45 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <p className="max-w-[68ch] pb-6 text-[15px] leading-[1.7] text-white/55">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <RelatedLinks variant="calculator" />

      <EditorialFinalCTA
        title="Stop modeling."
        italic="Start measuring."
        body="Connect one accounting system and run your first analysis on real data. Read-only access. No credit card. Cancel anytime."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Try the SaaS Cost Calculator →", href: "/calculator/saas-cost" }}
      />
      <span className="hidden">
        <Link href="/register">register</Link>
        <ArrowUpRight className="h-3 w-3" />
      </span>
    </>
  )
}
