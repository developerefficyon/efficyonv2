import type { Metadata } from "next"
import Link from "next/link"
import { companySizeBenchmarks } from "@/lib/benchmark-data"
import { ArrowLeft } from "lucide-react"
import {
  EditorialEyebrow,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, datasetLd, jsonLdScript } from "@/lib/seo/jsonld"

export const metadata: Metadata = {
  title: "Average SaaS Spend by Company Size: 2026 Benchmarks",
  description:
    "How much do companies spend on SaaS by size? Comprehensive 2026 benchmarks covering startups (1-10 employees) through enterprises (500+), with per-employee breakdowns and optimization targets.",
  alternates: {
    canonical: "/benchmarks/saas-spend-by-company-size",
  },
  openGraph: {
    title: "Average SaaS Spend by Company Size: 2026 Benchmarks | Efficyon",
    description:
      "Comprehensive 2026 benchmarks for SaaS spending by company size, from startups to enterprises.",
    url: absoluteUrl("/benchmarks/saas-spend-by-company-size"),
    type: "article",
  },
}

export default function SaasSpendByCompanySizePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Average SaaS Spend by Company Size: 2026 Benchmarks",
    description:
      "Comprehensive benchmarks for SaaS spending by company size in 2026.",
    url: absoluteUrl("/benchmarks/saas-spend-by-company-size"),
    datePublished: "2026-03-01",
    dateModified: "2026-03-01",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: SITE_URL,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Benchmarks", path: "/benchmarks" }, { name: "SaaS Spend by Company Size", path: "/benchmarks/saas-spend-by-company-size" }]), datasetLd({ name: "SaaS Spend by Company Size — 2026", description: "Per-employee SaaS spend benchmarks across company-size bands, sourced from third-party industry data.", url: absoluteUrl("/benchmarks/saas-spend-by-company-size"), datePublished: "2026-03-01", dateModified: "2026-03-01", variableMeasured: ["Monthly SaaS spend per employee", "Tool count per employee", "Waste percentage"] })]) }}
      />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-20 pt-[160px] md:px-12 md:pb-24 md:pt-[180px]">
        <Link
          href="/benchmarks"
          className="mb-10 inline-flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All benchmarks
        </Link>

        <div className="mb-10 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/55">
            2026 · Industry data
          </span>
        </div>

        <h1 className="max-w-[20ch] text-[clamp(40px,5.6vw,80px)] font-medium leading-[0.98] tracking-[-0.04em]">
          SaaS spend{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic" style={{ color: GREEN }}>
            by company size.
          </span>
        </h1>
        <p className="mt-8 max-w-[600px] text-[17px] font-light leading-[1.65] text-white/65">
          How much should your company actually be spending on SaaS? Five company-size
          tiers, monthly spend ranges, per-employee math, and the typical waste percentage
          in each segment.
        </p>
      </section>

      {/* QUICK STATS */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-16 md:px-12">
        <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Monthly spend range
            </dt>
            <dd className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em] text-white">
              $1K–$200K+
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Tools per company
            </dt>
            <dd className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em] text-white">
              15–200+
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Typical waste
            </dt>
            <dd
              className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em]"
              style={{ color: GREEN }}
            >
              25–45%
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Per employee / month
            </dt>
            <dd
              className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em]"
              style={{ color: GREEN }}
            >
              $100–$350
            </dd>
          </div>
        </dl>
      </section>

      {/* MAIN BENCHMARK TABLE */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>The table</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Spend benchmarks{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            by tier.
          </span>
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="border-y border-white/[0.08] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                <th className="py-5 pr-6 text-left font-normal">Company size</th>
                <th className="py-5 pr-6 text-left font-normal">Employees</th>
                <th className="py-5 pr-6 text-left font-normal">Monthly spend</th>
                <th className="py-5 pr-6 text-left font-normal">Tool count</th>
                <th className="py-5 pr-6 text-left font-normal">Per employee</th>
                <th className="py-5 text-left font-normal">Waste %</th>
              </tr>
            </thead>
            <tbody>
              {companySizeBenchmarks.map((b) => (
                <tr key={b.size} className="border-b border-white/[0.08]">
                  <td className="py-6 pr-6 align-top">
                    <span className="text-[18px] font-medium tracking-[-0.01em] text-white">
                      {b.size}
                    </span>
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white/70">
                    {b.employees}
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white/70">
                    {b.monthlySpend}
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white/70">
                    {b.toolCount}
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px]" style={{ color: GREEN }}>
                    {b.perEmployeeMonthly}
                  </td>
                  <td className="py-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white">
                    {b.wastePercentage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile dl list */}
        <div className="md:hidden divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {companySizeBenchmarks.map((b) => (
            <div key={b.size} className="py-8" style={{ fontVariantNumeric: "tabular-nums" }}>
              <p className="text-[20px] font-medium tracking-[-0.01em] text-white">{b.size}</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[12px] text-white/45">
                {b.employees} employees
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-y-4 font-[family-name:var(--font-geist-mono)]">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Monthly spend</dt>
                  <dd className="mt-1 text-[14px] text-white/75">{b.monthlySpend}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Tools</dt>
                  <dd className="mt-1 text-[14px] text-white/75">{b.toolCount}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Per employee</dt>
                  <dd className="mt-1 text-[14px]" style={{ color: GREEN }}>{b.perEmployeeMonthly}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Waste %</dt>
                  <dd className="mt-1 text-[14px] text-white">{b.wastePercentage}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* PER-EMPLOYEE VISUALIZATION */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>Visual scale</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Per-employee spend{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            at a glance.
          </span>
        </h2>

        <div className="space-y-8">
          {companySizeBenchmarks.map((b) => {
            const minSpend = parseInt(b.perEmployeeMonthly.replace(/[^0-9]/g, ""))
            const maxSpend = parseInt(
              b.perEmployeeMonthly.split("-")[1]?.replace(/[^0-9]/g, "") || "350"
            )
            const avgSpend = (minSpend + maxSpend) / 2
            const widthPercentage = Math.min((avgSpend / 350) * 100, 100)

            return (
              <div key={b.size}>
                <div
                  className="mb-3 flex items-baseline justify-between font-[family-name:var(--font-geist-mono)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <span className="text-[13px] text-white/75">
                    {b.size}{" "}
                    <span className="text-[11px] text-white/40">· {b.employees}</span>
                  </span>
                  <span className="text-[13px]" style={{ color: GREEN }}>
                    {b.perEmployeeMonthly}
                  </span>
                </div>
                <div className="h-[2px] w-full bg-white/[0.08]">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ background: GREEN, width: `${widthPercentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-8 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/35">
          Scale: $0 – $350 per employee per month
        </p>
      </section>

      {/* OPTIMIZATION TARGETS */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>By tier</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Where each tier{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            tends to leak.
          </span>
        </h2>
        <div className="border-t border-white/[0.08]">
          {companySizeBenchmarks.map((b, i) => (
            <div
              key={b.size}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[20px] font-medium tracking-[-0.01em] text-white md:text-[22px]">
                  {b.size}{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/55">
                    ({b.employees})
                  </span>
                </p>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.7] text-white/60">
                  {b.optimizationTarget}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEO content */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <EditorialEyebrow>Reading the benchmarks</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
              The relationship{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                isn&apos;t linear.
              </span>
            </h2>
          </div>
          <div className="space-y-6 text-[15.5px] leading-[1.7] text-white/60">
            <p>
              SaaS spending scales with company size — but not proportionally.
              The relationship is shaped by industry, growth stage, technical
              complexity, and procurement maturity. Smaller companies tend to
              spend more per employee because fixed-cost tools amortize over
              fewer users; enterprises benefit from volume discounts but
              accumulate sprawl that eats those savings back.
            </p>
            <p>
              <strong className="text-white/85">Micro &amp; small (1–50):</strong>{" "}
              Typically $1K–$15K/month across 15–60 tools. The primary waste
              pattern is tool proliferation — teams adopt new tools quickly
              without checking for overlap. Consolidation usually wins.
            </p>
            <p>
              <strong className="text-white/85">Mid-market (51–500):</strong>{" "}
              $15K–$200K/month across 60–200 tools. Waste percentage tends to
              peak here at 30–40% — the company is large enough to have
              accumulated sprawl, but procurement is rarely formalized yet.
              License-tier mismatch is rampant. The highest percentage savings
              tend to come from this segment.
            </p>
            <p>
              <strong className="text-white/85">Enterprise (500+):</strong>{" "}
              $200K+/month across 200+ tools. Procurement teams exist, but
              shadow IT and legacy contracts persist. Absolute dollar savings
              are largest here — even a 10% reduction on $200K/month is
              $240K/year.
            </p>
          </div>
        </div>
      </section>

      <EditorialFinalCTA
        title="See where your stack"
        italic="actually sits."
        body="Connect your accounting system to Efficyon and get a personalized benchmark report — your spend against companies in your exact size and industry bracket. Read-only access. No credit card."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View by industry →", href: "/benchmarks/saas-spend-by-industry" }}
      />
    </>
  )
}
