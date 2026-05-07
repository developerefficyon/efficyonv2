"use client"

import { useState, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import {
  EditorialEyebrow,
  EditorialCTA,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"

/* ------------------------------------------------------------------ */
/*  Audit recency multipliers (preserved)                             */
/* ------------------------------------------------------------------ */
const AUDIT_OPTIONS = [
  { value: "never", label: "Never", multiplier: 1.4 },
  { value: "6plus", label: "6+ months ago", multiplier: 1.2 },
  { value: "1to6", label: "1–6 months", multiplier: 1.0 },
  { value: "recent", label: "Recently", multiplier: 0.8 },
] as const

type AuditValue = (typeof AUDIT_OPTIONS)[number]["value"]

const faqs = [
  {
    q: "What counts as SaaS waste?",
    a: "SaaS waste includes any software spending that does not deliver proportional value. The three main categories: unused licenses (paid-for accounts no one uses), duplicate tools (multiple subscriptions for the same job), and overprovisioned tiers (paying for premium features the team never touches). Shadow IT — unmanaged purchases that bypass procurement — accelerates all three.",
  },
  {
    q: "How accurate is this waste estimate?",
    a: "The model uses industry-validated formulas based on aggregated third-party data. The output is a directional estimate — useful for understanding the magnitude of waste, not pinpointing it. For a precise read, Efficyon connects to your actual subscriptions and produces line-item findings.",
  },
  {
    q: "What is the Shadow IT risk score?",
    a: "It assesses the likelihood that your organization has unapproved or untracked software purchases. The score factors employee count vs managed subscription count, audit recency, and the overall utilization rate. A higher score means a higher chance of unknown subscriptions creating both cost and security exposure.",
  },
  {
    q: "How often should a company audit its SaaS subscriptions?",
    a: "Quarterly at minimum. Companies with rapid growth or decentralized purchasing should review monthly. Continuous automated monitoring through a platform like Efficyon is the most effective approach — manual audits typically miss 30–40% more waste than continuous tracking.",
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

export default function WasteEstimatorPage() {
  const [numSubs, setNumSubs] = useState(25)
  const [monthlySpend, setMonthlySpend] = useState(8000)
  const [dailyUsePct, setDailyUsePct] = useState(60)
  const [employees, setEmployees] = useState(40)
  const [lastAudit, setLastAudit] = useState<AuditValue>("6plus")

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  /* --- calculations (preserved) --- */
  const results = useMemo(() => {
    const auditMult = AUDIT_OPTIONS.find((a) => a.value === lastAudit)?.multiplier ?? 1.0

    const unusedRate = ((100 - dailyUsePct) / 100) * 0.45 * auditMult
    const unusedWasteMonthly = Math.round(monthlySpend * unusedRate)
    const unusedWasteAnnual = unusedWasteMonthly * 12

    const dupeRate = 0.05 + Math.min(0.12, (numSubs / 200) * 0.12)
    const dupeWasteMonthly = Math.round(monthlySpend * dupeRate * auditMult)
    const dupeWasteAnnual = dupeWasteMonthly * 12

    const overprovRate = 0.08 + Math.min(0.07, (employees / 500) * 0.07)
    const overprovWasteMonthly = Math.round(monthlySpend * overprovRate * auditMult)
    const overprovWasteAnnual = overprovWasteMonthly * 12

    const totalWasteMonthly = unusedWasteMonthly + dupeWasteMonthly + overprovWasteMonthly
    const totalWasteAnnual = totalWasteMonthly * 12

    const wastePerEmployee = employees > 0 ? Math.round(totalWasteAnnual / employees) : 0
    const wastePct = monthlySpend > 0 ? Math.round((totalWasteMonthly / monthlySpend) * 100) : 0

    const toolsPerEmployee = numSubs / Math.max(1, employees)
    let shadowScore = 3
    if (toolsPerEmployee < 0.3) shadowScore += 2
    if (dailyUsePct < 50) shadowScore += 1
    if (lastAudit === "never") shadowScore += 3
    else if (lastAudit === "6plus") shadowScore += 2
    else if (lastAudit === "1to6") shadowScore += 1
    if (employees > 100) shadowScore += 1
    shadowScore = Math.min(10, Math.max(1, shadowScore))
    const shadowLabel = shadowScore <= 3 ? "Low" : shadowScore <= 6 ? "Medium" : "High"

    let urgency = 2
    if (wastePct > 40) urgency += 3
    else if (wastePct > 25) urgency += 2
    else if (wastePct > 15) urgency += 1
    if (lastAudit === "never") urgency += 2
    else if (lastAudit === "6plus") urgency += 1
    if (totalWasteAnnual > 50000) urgency += 2
    else if (totalWasteAnnual > 20000) urgency += 1
    if (dailyUsePct < 50) urgency += 1
    urgency = Math.min(10, Math.max(1, urgency))

    const totalParts = unusedWasteMonthly + dupeWasteMonthly + overprovWasteMonthly
    const unusedPct = totalParts > 0 ? Math.round((unusedWasteMonthly / totalParts) * 100) : 33
    const dupePct = totalParts > 0 ? Math.round((dupeWasteMonthly / totalParts) * 100) : 33
    const overprovPct = totalParts > 0 ? 100 - unusedPct - dupePct : 34

    const avgSavings = Math.round(totalWasteAnnual * 0.7)

    return {
      unusedWasteMonthly,
      unusedWasteAnnual,
      dupeWasteMonthly,
      dupeWasteAnnual,
      overprovWasteMonthly,
      overprovWasteAnnual,
      totalWasteMonthly,
      totalWasteAnnual,
      wastePerEmployee,
      wastePct,
      shadowScore,
      shadowLabel,
      urgency,
      unusedPct,
      dupePct,
      overprovPct,
      avgSavings,
    }
  }, [numSubs, monthlySpend, dailyUsePct, employees, lastAudit])

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SaaS Waste Estimator",
      url: absoluteUrl("/calculator/waste-estimator"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Estimate how much your company wastes on unused and underutilized SaaS subscriptions with this free interactive calculator.",
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

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-16 pt-[160px] md:px-12 md:pb-20 md:pt-[180px]">
        <div className="mb-10 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/55">
            Calculator · Waste model
          </span>
        </div>
        <h1 className="max-w-[20ch] text-[clamp(40px,5.6vw,80px)] font-medium leading-[0.98] tracking-[-0.04em]">
          Where is the{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic" style={{ color: GREEN }}>
            money hiding?
          </span>
        </h1>
        <p className="mt-8 max-w-[560px] text-[17px] font-light leading-[1.65] text-white/65">
          Estimate annual waste from unused licenses, duplicate tools, and overprovisioned tiers.
          Includes a Shadow IT risk score and an urgency rating. Five inputs, no email.
        </p>
      </section>

      {/* CALCULATOR */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 pb-24 pt-16 md:px-12">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* LEFT — inputs */}
          <div>
            <EditorialEyebrow>Your stack</EditorialEyebrow>
            <h2 className="mb-12 text-[28px] font-medium tracking-[-0.02em] md:text-[32px]">
              Five inputs.{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                Honest output.
              </span>
            </h2>

            <div className="space-y-10">
              <div className="space-y-3">
                <FieldLabel value={numSubs}>Number of SaaS subscriptions</FieldLabel>
                <input
                  type="range"
                  min={5}
                  max={200}
                  value={numSubs}
                  onChange={(e) => setNumSubs(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                  <span>200</span>
                </div>
              </div>

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
                <FieldLabel value={`${dailyUsePct}%`}>% of tools used daily</FieldLabel>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={dailyUsePct}
                  onChange={(e) => setDailyUsePct(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>10%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-3">
                <FieldLabel value={employees}>Number of employees</FieldLabel>
                <input
                  type="range"
                  min={5}
                  max={500}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className={sliderClass}
                />
                <div className="flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/30">
                  <span>5</span>
                  <span>125</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <FieldLabel>When was your last SaaS audit?</FieldLabel>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {AUDIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLastAudit(opt.value)}
                      className={`rounded-full border px-4 py-2 text-[12px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.14em] transition-colors ${
                        lastAudit === opt.value
                          ? "border-[color:var(--green)] bg-[color:var(--green-soft)] text-white"
                          : "border-white/[0.12] text-white/55 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="space-y-12">
            {/* Hero result */}
            <div className="border-t border-white/[0.08] pt-10">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Modeled annual waste
              </p>
              <p
                className="mt-4 font-[family-name:var(--font-instrument-serif)] text-[clamp(72px,9vw,128px)] font-normal italic leading-[0.92] tracking-[-0.03em]"
                style={{ color: GREEN }}
              >
                ${fmt(results.totalWasteAnnual)}
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-x-6 border-t border-white/[0.08] pt-6 font-[family-name:var(--font-geist-mono)] tabular-nums">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Per employee
                  </dt>
                  <dd className="mt-2 text-[22px] text-white">${fmt(results.wastePerEmployee)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    % of spend
                  </dt>
                  <dd className="mt-2 text-[22px] text-white">{results.wastePct}%</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Per month
                  </dt>
                  <dd className="mt-2 text-[22px] text-white">${fmt(results.totalWasteMonthly)}</dd>
                </div>
              </dl>
            </div>

            {/* Breakdown */}
            <div>
              <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Waste breakdown
              </p>
              {/* Stacked thin bar */}
              <div className="mb-6 flex h-[3px] w-full overflow-hidden bg-white/[0.08]">
                <div className="h-full transition-all duration-500" style={{ width: `${results.unusedPct}%`, background: GREEN }} />
                <div className="h-full bg-white/55 transition-all duration-500" style={{ width: `${results.dupePct}%` }} />
                <div className="h-full bg-white/30 transition-all duration-500" style={{ width: `${results.overprovPct}%` }} />
              </div>

              <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08] font-[family-name:var(--font-geist-mono)] tabular-nums">
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-[13px]">
                  <dt className="flex items-baseline gap-3 text-white/65">
                    <span className="inline-block h-1.5 w-1.5" style={{ background: GREEN }} />
                    Unused licenses
                  </dt>
                  <dd className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {results.unusedPct}%
                  </dd>
                  <dd className="text-white">${fmt(results.unusedWasteAnnual)}/yr</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-[13px]">
                  <dt className="flex items-baseline gap-3 text-white/65">
                    <span className="inline-block h-1.5 w-1.5 bg-white/55" />
                    Duplicate tools
                  </dt>
                  <dd className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {results.dupePct}%
                  </dd>
                  <dd className="text-white">${fmt(results.dupeWasteAnnual)}/yr</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-[13px]">
                  <dt className="flex items-baseline gap-3 text-white/65">
                    <span className="inline-block h-1.5 w-1.5 bg-white/30" />
                    Overprovisioning
                  </dt>
                  <dd className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {results.overprovPct}%
                  </dd>
                  <dd className="text-white">${fmt(results.overprovWasteAnnual)}/yr</dd>
                </div>
              </dl>
            </div>

            {/* Urgency + Shadow IT */}
            <div className="grid gap-10 sm:grid-cols-2">
              <div>
                <p className="mb-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                  Urgency · {results.urgency}/10
                </p>
                <div className="relative h-[2px] w-full bg-white/[0.12]">
                  <div
                    className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 transition-all duration-500"
                    style={{
                      background: GREEN,
                      left: `${((results.urgency - 1) / 9) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-3 flex justify-between font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-white/40">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>Act now</span>
                </div>
              </div>
              <div>
                <p className="mb-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                  Shadow IT risk
                </p>
                <p
                  className="font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em]"
                  style={{ color: GREEN }}
                >
                  {results.shadowLabel}
                </p>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/55">
                  {results.shadowScore}/10 · likelihood of untracked subs
                </p>
              </div>
            </div>

            {/* Comparison */}
            <div className="border-t border-white/[0.08] pt-8">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
                Companies like yours typically recover
              </p>
              <p
                className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[44px] font-normal italic leading-none tracking-[-0.02em]"
                style={{ color: GREEN }}
              >
                ${fmt(results.avgSavings)}<span className="text-[18px] text-white/45">/yr</span>
              </p>
              <p className="mt-3 text-[14px] leading-[1.6] text-white/55">
                with continuous, automated SaaS optimization.
              </p>
            </div>

            <div className="pt-4">
              <EditorialCTA href="/register">Get the line-item analysis</EditorialCTA>
            </div>
          </div>
        </div>
      </section>

      {/* SEO */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <EditorialEyebrow>The pattern</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
              SaaS waste{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                grows over time.
              </span>
            </h2>
          </div>
          <div className="space-y-6 text-[15.5px] leading-[1.7] text-white/60">
            <p>
              Industry research consistently puts SaaS waste at 25–35% of total spend.
              For a mid-sized stack, that&apos;s tens of thousands of dollars a year on
              software no one uses, software that overlaps with software no one uses, or
              tiers that nobody downgraded after the trial.
            </p>
            <p>
              The problem is structural. SaaS subscriptions are easy to acquire and easy
              to forget. A department head signs up with a corporate card; that person
              leaves; the subscription continues billing indefinitely. Multiply across
              dozens of teams and the cumulative waste compounds quietly.
            </p>
            <p>
              Three categories: <strong className="text-white/85">unused licenses</strong>{" "}
              (paid-for accounts no one signs into),{" "}
              <strong className="text-white/85">duplicate tools</strong> (multiple
              subscriptions for the same job), and{" "}
              <strong className="text-white/85">overprovisioning</strong> (paying for
              premium features the team never touches). Quarterly audits catch some.
              Continuous monitoring catches the rest.
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
        title="Stop estimating."
        italic="Start identifying."
        body="The estimator gives you a number. Efficyon gives you a list — which subscription, which seat, which tier, which contract. Connect one accounting system to begin."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Or run the ROI calculator →", href: "/calculator/roi" }}
      />
    </>
  )
}
