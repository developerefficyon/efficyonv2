import Link from "next/link"
import { industryBenchmarks } from "@/lib/benchmark-data"
import { ArrowLeft } from "lucide-react"
import {
  EditorialEyebrow,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, datasetLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Spend Benchmarks by Industry: 2026 Data",
  description:
    "How does your industry compare in SaaS spending? 2026 benchmarks for technology, finance, healthcare, marketing, e-commerce, education, and manufacturing with waste percentages and top tools.",
  path: "/benchmarks/saas-spend-by-industry",
})

export default function SaasSpendByIndustryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "SaaS Spend Benchmarks by Industry: 2026 Data",
    description:
      "Industry-specific SaaS spending benchmarks for 2026 covering seven major sectors.",
    url: absoluteUrl("/benchmarks/saas-spend-by-industry"),
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Benchmarks", path: "/benchmarks" }, { name: "SaaS Spend by Industry", path: "/benchmarks/saas-spend-by-industry" }]), datasetLd({ name: "SaaS Spend by Industry — 2026", description: "SaaS spend benchmarks broken down by vertical industry, sourced from third-party data.", url: absoluteUrl("/benchmarks/saas-spend-by-industry"), datePublished: "2026-03-01", dateModified: "2026-03-01", variableMeasured: ["Monthly SaaS spend per industry", "Top tools per vertical", "Average tool count"] })]) }}
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
            by industry.
          </span>
        </h1>
        <p className="mt-8 max-w-[600px] text-[17px] font-light leading-[1.65] text-white/65">
          Software spend varies dramatically across sectors. Seven industries — average
          spend per employee, typical waste percentages, and the most common tools
          driving the bill in each.
        </p>
      </section>

      {/* QUICK STATS */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-16 md:px-12">
        <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Industries covered
            </dt>
            <dd className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em] text-white">
              7
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Per-employee range
            </dt>
            <dd className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em] text-white">
              $80–$400
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Waste range
            </dt>
            <dd
              className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em]"
              style={{ color: GREEN }}
            >
              20–45%
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              Highest spenders
            </dt>
            <dd
              className="mt-3 font-[family-name:var(--font-instrument-serif)] text-[40px] font-normal italic leading-none tracking-[-0.02em]"
              style={{ color: GREEN }}
            >
              Agencies
            </dd>
          </div>
        </dl>
      </section>

      {/* TABLE */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>The table</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Average spend{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            per employee, by industry.
          </span>
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="border-y border-white/[0.08] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                <th className="py-5 pr-6 text-left font-normal">Industry</th>
                <th className="py-5 pr-6 text-left font-normal">Avg / employee</th>
                <th className="py-5 pr-6 text-left font-normal">Typical waste</th>
                <th className="py-5 text-left font-normal">Top categories</th>
              </tr>
            </thead>
            <tbody>
              {industryBenchmarks.map((b) => (
                <tr key={b.industry} className="border-b border-white/[0.08]">
                  <td className="py-6 pr-6 align-top">
                    <span className="text-[18px] font-medium tracking-[-0.01em] text-white">
                      {b.industry}
                    </span>
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px]" style={{ color: GREEN }}>
                    {b.avgSpendPerEmployee}
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white">
                    {b.typicalWaste}
                  </td>
                  <td className="py-6 align-top">
                    <div className="flex flex-wrap gap-2">
                      {b.commonCategories.map((cat) => (
                        <span
                          key={cat}
                          className="border border-white/[0.12] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-white/65"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {industryBenchmarks.map((b) => (
            <div key={b.industry} className="py-8" style={{ fontVariantNumeric: "tabular-nums" }}>
              <p className="text-[20px] font-medium tracking-[-0.01em] text-white">{b.industry}</p>
              <dl className="mt-5 grid grid-cols-2 gap-y-4 font-[family-name:var(--font-geist-mono)]">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Avg / employee</dt>
                  <dd className="mt-1 text-[14px]" style={{ color: GREEN }}>{b.avgSpendPerEmployee}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Typical waste</dt>
                  <dd className="mt-1 text-[14px] text-white">{b.typicalWaste}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {b.commonCategories.map((cat) => (
                  <span
                    key={cat}
                    className="border border-white/[0.12] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-white/65"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DETAILED BREAKDOWNS */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>Sector by sector</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Detailed industry{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            analysis.
          </span>
        </h2>

        <div className="border-t border-white/[0.08]">
          {industryBenchmarks.map((b, i) => (
            <div
              key={b.industry}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <h3 className="text-[24px] font-medium tracking-[-0.02em] text-white md:text-[28px]">
                    {b.industry}
                  </h3>
                  <span
                    className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums"
                    style={{ color: GREEN }}
                  >
                    {b.avgSpendPerEmployee}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/40">
                    · {b.typicalWaste} waste
                  </span>
                </div>
                <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.7] text-white/60">
                  {b.notes}
                </p>
                <div className="mt-5">
                  <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Top tools
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {b.topTools.map((tool) => (
                      <span
                        key={tool}
                        className="border border-[color:var(--green)]/30 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.04em]"
                        style={{ color: GREEN }}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON VISUAL */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>Visual scale</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Industry spend{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            at a glance.
          </span>
        </h2>

        <div className="space-y-8">
          {industryBenchmarks.map((b) => {
            const minSpend = parseInt(b.avgSpendPerEmployee.replace(/[^0-9]/g, ""))
            const parts = b.avgSpendPerEmployee.split("-")
            const maxSpend = parts[1]
              ? parseInt(parts[1].replace(/[^0-9]/g, ""))
              : minSpend
            const avgSpend = (minSpend + maxSpend) / 2
            const widthPercentage = Math.min((avgSpend / 400) * 100, 100)

            return (
              <div key={b.industry}>
                <div
                  className="mb-3 flex items-baseline justify-between font-[family-name:var(--font-geist-mono)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <span className="text-[13px] text-white/75">{b.industry}</span>
                  <span className="text-[13px]" style={{ color: GREEN }}>
                    {b.avgSpendPerEmployee}
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
          Scale: $0 – $400 per employee per month
        </p>
      </section>

      {/* SEO */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <EditorialEyebrow>The pattern</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
              Why agencies{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                top the table.
              </span>
            </h2>
          </div>
          <div className="space-y-6 text-[15.5px] leading-[1.7] text-white/60">
            <p>
              <strong className="text-white/85">Technology</strong> consistently ranks
              among the highest spenders ($200–$350/employee/month). Developer tooling,
              cloud infrastructure, observability, and design tools stack up fast.
              Cloud alone often represents 40–60% of a tech company&apos;s SaaS bill.
            </p>
            <p>
              <strong className="text-white/85">Marketing agencies</strong> have the
              widest range ($200–$400) and the highest typical waste (30–45%). Tool
              experimentation, client-specific subscriptions, and overlap between
              analytics, SEO, social, and design platforms compound. Consolidation
              wins biggest here.
            </p>
            <p>
              <strong className="text-white/85">Healthcare &amp; finance</strong> face
              compliance-driven pricing pressure. HIPAA, SOC 2, and PCI-DSS push teams
              toward higher tiers — often org-wide when only a subset of users handles
              regulated data. Right-sizing compliance tiers can reduce costs 15–25%
              without compromising posture.
            </p>
            <p>
              <strong className="text-white/85">Education &amp; manufacturing</strong>{" "}
              have the lowest per-employee spend ($80–$160) but face their own quirks:
              seasonal usage in education; legacy ERP/CAD licenses alongside modern
              SaaS in manufacturing.
            </p>
          </div>
        </div>
      </section>

      <EditorialFinalCTA
        title="Industry averages"
        italic="are a starting point."
        body="Connect your accounting system to Efficyon and see how your spend compares against companies in your specific industry and size bracket. Read-only access. No credit card."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View by department →", href: "/benchmarks/subscription-cost-per-employee" }}
      />
    </>
  )
}
