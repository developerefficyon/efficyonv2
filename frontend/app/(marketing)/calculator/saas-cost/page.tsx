"use client"

import { useState, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import {
  EditorialEyebrow,
  EditorialCTA,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"

/* ------------------------------------------------------------------ */
/*  Industry benchmark data (preserved)                               */
/* ------------------------------------------------------------------ */
const INDUSTRY_BENCHMARKS: Record<string, { low: number; mid: number; high: number; label: string }> = {
  technology: { low: 120, mid: 150, high: 200, label: "Technology" },
  finance: { low: 100, mid: 130, high: 170, label: "Finance" },
  healthcare: { low: 80, mid: 110, high: 150, label: "Healthcare" },
  marketing: { low: 110, mid: 140, high: 180, label: "Marketing" },
  ecommerce: { low: 90, mid: 120, high: 160, label: "E-commerce" },
  education: { low: 60, mid: 85, high: 120, label: "Education" },
  other: { low: 80, mid: 110, high: 150, label: "Other" },
}

const STAGE_MULTIPLIER: Record<string, number> = {
  startup: 0.85,
  growth: 1.0,
  enterprise: 1.15,
}

const faqs = [
  {
    q: "How is the expected SaaS spend range calculated?",
    a: "We use industry benchmarks based on aggregated third-party data. The expected range is calculated by multiplying your employee count by industry-specific per-employee monthly SaaS costs, then adjusting for your company's growth stage. Technology companies typically spend $120-$200 per employee per month, while education organizations spend $60-$120.",
  },
  {
    q: "What counts as SaaS overspending?",
    a: "Overspending occurs when your actual SaaS costs exceed the industry benchmark range for your company profile. Common causes include unused licenses that haven't been deprovisioned, duplicate tools serving the same function across teams, premium tier subscriptions when a lower tier would suffice, and shadow IT purchases that bypass central procurement.",
  },
  {
    q: "How accurate are these SaaS cost benchmarks?",
    a: "Our benchmarks are derived from third-party industry reports and public data across companies of various sizes and sectors. They provide a directional guide for evaluating spending. Some organizations require specialized tooling that legitimately increases costs. For a precise, organization-specific analysis, connect your accounts to Efficyon.",
  },
  {
    q: "How can I reduce my SaaS costs quickly?",
    a: "The fastest wins come from three areas: cancelling unused licenses (no logins in 90+ days), consolidating duplicate tools where multiple teams use different products for the same purpose, and rightsizing subscription tiers based on actual feature usage. Efficyon automates the detection of all three and prioritizes by savings potential.",
  },
]

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

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

export default function SaaSCostCalculatorPage() {
  const [employees, setEmployees] = useState(50)
  const [industry, setIndustry] = useState("technology")
  const [stage, setStage] = useState("growth")
  const [currentSpend, setCurrentSpend] = useState(5000)

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const results = useMemo(() => {
    const bench = INDUSTRY_BENCHMARKS[industry]
    const mult = STAGE_MULTIPLIER[stage]

    const expectedLow = Math.round(employees * bench.low * mult)
    const expectedMid = Math.round(employees * bench.mid * mult)
    const expectedHigh = Math.round(employees * bench.high * mult)

    const overspend = Math.max(0, currentSpend - expectedMid)
    const overspendPct = expectedMid > 0 ? Math.round((overspend / expectedMid) * 100) : 0
    const wasteRate = overspend > 0 ? 0.25 + Math.min(0.10, overspendPct / 1000) : 0
    const annualWaste = Math.round(overspend * 12 * wasteRate)
    const efficyonSavings = Math.round(annualWaste * 0.7)

    const perEmployeeActual = employees > 0 ? Math.round(currentSpend / employees) : 0
    const perEmployeeBench = bench.mid

    const barMaxVal = Math.max(currentSpend, expectedHigh, 1)

    return {
      expectedLow,
      expectedMid,
      expectedHigh,
      overspend,
      overspendPct,
      annualWaste,
      efficyonSavings,
      perEmployeeActual,
      perEmployeeBench,
      barMaxVal,
    }
  }, [employees, industry, stage, currentSpend])

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SaaS Cost Calculator",
      url: "https://www.efficyon.com/calculator/saas-cost",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Interactive calculator to estimate how much your company should spend on SaaS based on industry benchmarks, company size, and growth stage.",
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

  const overspendActive = results.overspend > 0

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-16 pt-[160px] md:px-12 md:pb-20 md:pt-[180px]">
        <div className="mb-10 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/55">
            Calculator · Benchmark
          </span>
        </div>
        <h1 className="max-w-[20ch] text-[clamp(40px,5.6vw,80px)] font-medium leading-[0.98] tracking-[-0.04em]">
          How much should you{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic" style={{ color: GREEN }}>
            actually be spending?
          </span>
        </h1>
        <p className="mt-8 max-w-[560px] text-[17px] font-light leading-[1.65] text-white/65">
          Compare your monthly SaaS spend to third-party industry benchmarks. Adjust for size,
          industry, and growth stage. See modeled overspend and annual waste in real time.
        </p>
      </section>

      {/* CALCULATOR */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 pb-24 pt-16 md:px-12">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* LEFT — inputs */}
          <div>
            <EditorialEyebrow>Your company</EditorialEyebrow>
            <h2 className="mb-12 text-[28px] font-medium tracking-[-0.02em] md:text-[32px]">
              Four inputs.{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                Live results.
              </span>
            </h2>

            <div className="space-y-10">
              <div className="space-y-3">
                <FieldLabel value={employees}>Number of employees</FieldLabel>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>1</span>
                  <span>100</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <FieldLabel>Industry</FieldLabel>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={`${inputClass} cursor-pointer appearance-none pr-8`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff66' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 4px center",
                  }}
                >
                  {Object.entries(INDUSTRY_BENCHMARKS).map(([key, val]) => (
                    <option key={key} value={key} className="bg-[#080809] text-white">
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Growth stage</FieldLabel>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["startup", "growth", "enterprise"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStage(s)}
                      className={`rounded-full border px-4 py-2 text-[12px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.14em] transition-colors ${
                        stage === s
                          ? "border-[color:var(--green)] bg-[color:var(--green-soft)] text-white"
                          : "border-white/[0.12] text-white/55 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Current monthly SaaS spend (USD)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={currentSpend}
                  onChange={(e) => setCurrentSpend(Math.max(0, Number(e.target.value)))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="space-y-12">
            <div className="border-t border-white/[0.08] pt-10">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Expected monthly spend · range
              </p>
              <p
                className="mt-4 font-[family-name:var(--font-instrument-serif)] text-[clamp(56px,7.2vw,104px)] font-normal italic leading-[0.94] tracking-[-0.03em]"
                style={{ color: GREEN }}
              >
                ${fmt(results.expectedLow)}{" "}
                <span className="text-white/35">–</span> ${fmt(results.expectedHigh)}
              </p>
              <p className="mt-4 max-w-[60ch] text-[14px] leading-[1.6] text-white/55">
                Based on {INDUSTRY_BENCHMARKS[industry].label} industry benchmarks for{" "}
                {employees} employees at {stage} stage.
              </p>
            </div>

            {/* Comparison */}
            <div>
              <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Your spend vs benchmark
              </p>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex justify-between font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums">
                    <span className="text-white/55">Your spend</span>
                    <span className="text-white">${fmt(currentSpend)}/mo</span>
                  </div>
                  <div className="h-[2px] w-full bg-white/[0.12]">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        background:
                          currentSpend > results.expectedHigh
                            ? "rgba(255,255,255,0.85)"
                            : GREEN,
                        width: `${Math.min(100, (currentSpend / results.barMaxVal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums">
                    <span className="text-white/55">Industry benchmark</span>
                    <span className="text-white">${fmt(results.expectedMid)}/mo</span>
                  </div>
                  <div className="h-[2px] w-full bg-white/[0.12]">
                    <div
                      className="h-full bg-white/55 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (results.expectedMid / results.barMaxVal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-x-6 border-y border-white/[0.08] py-6 font-[family-name:var(--font-geist-mono)] tabular-nums">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    You · per employee
                  </dt>
                  <dd className="mt-2 text-[20px] text-white">
                    ${fmt(results.perEmployeeActual)}
                    <span className="text-[12px] text-white/40">/mo</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Benchmark · per employee
                  </dt>
                  <dd className="mt-2 text-[20px]" style={{ color: GREEN }}>
                    ${fmt(results.perEmployeeBench)}
                    <span className="text-[12px] text-white/40">/mo</span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Overspend / OK */}
            <div>
              {overspendActive ? (
                <>
                  <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em]" style={{ color: GREEN }}>
                    ✦ Potential overspend detected
                  </p>
                  <dl className="grid grid-cols-2 gap-6 border-y border-white/[0.08] py-6 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Monthly overspend
                      </dt>
                      <dd className="mt-2 text-[22px] text-white">${fmt(results.overspend)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Overspend %
                      </dt>
                      <dd className="mt-2 text-[22px] text-white">{results.overspendPct}%</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Modeled annual waste
                      </dt>
                      <dd className="mt-2 text-[22px] text-white">${fmt(results.annualWaste)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Recoverable w/ Efficyon
                      </dt>
                      <dd className="mt-2 text-[22px]" style={{ color: GREEN }}>
                        ${fmt(results.efficyonSavings)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="border-y border-white/[0.08] py-8">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em]" style={{ color: GREEN }}>
                    ✦ Within benchmark
                  </p>
                  <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.65] text-white/65">
                    Your current spend sits at or below the industry benchmark range.
                    You may still benefit from identifying unused licenses and duplicate
                    tools — that&apos;s a different question than total spend.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4">
              <EditorialCTA href="/register">Get a precise breakdown</EditorialCTA>
            </div>
          </div>
        </div>
      </section>

      {/* SEO */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <EditorialEyebrow>The benchmark</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
              Where the{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                numbers come from.
              </span>
            </h2>
          </div>
          <div className="space-y-6 text-[15.5px] leading-[1.7] text-white/60">
            <p>
              Industry data consistently puts the average per-employee SaaS bill between
              $150 and $200 per month, with significant variance by industry. Tech firms
              push toward $200+; education organizations trend below $120.
            </p>
            <p>
              Company size matters but the relationship isn&apos;t linear. Small firms
              spend more per employee because fixed-cost tools amortize over fewer users;
              enterprises benefit from volume discounts but accumulate tool sprawl that
              eats those savings back.
            </p>
            <p>
              Independent of size, third-party studies consistently find 25–35% of SaaS
              spending wasted on unused, duplicated, or overprovisioned subscriptions.
              The benchmark range above accounts for typical waste — being above it
              suggests structural overspend; being well below it sometimes indicates
              under-investment.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>FAQ</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Common questions.
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

      <EditorialFinalCTA
        title="Estimates are useful."
        italic="Exact numbers are better."
        body="Connect one accounting system and Efficyon will tell you exactly which subscriptions, seats, and tiers are over the benchmark — not just whether your total is."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See the ROI calculator →", href: "/calculator/roi" }}
      />
    </>
  )
}
