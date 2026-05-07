import type { Metadata } from "next"
import Link from "next/link"
import {
  departmentBenchmarks,
  yearOverYearGrowth,
} from "@/lib/benchmark-data"
import { ArrowLeft } from "lucide-react"
import {
  EditorialEyebrow,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"

export const metadata: Metadata = {
  title: "Software Cost Per Employee: What's Normal in 2026?",
  description:
    "What's a normal software cost per employee? 2026 benchmarks by department (Engineering, Sales, Marketing, HR, Finance, Support) with year-over-year trends and a guide to calculating yours.",
  alternates: {
    canonical: "/benchmarks/subscription-cost-per-employee",
  },
  openGraph: {
    title: "Software Cost Per Employee: What's Normal in 2026? | Efficyon",
    description:
      "Department-level software cost benchmarks per employee with year-over-year trends for 2026.",
    url: "https://www.efficyon.com/benchmarks/subscription-cost-per-employee",
    type: "article",
  },
}

export default function SubscriptionCostPerEmployeePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Software Cost Per Employee: What's Normal in 2026?",
    description:
      "Department-level benchmarks for software subscription costs per employee in 2026.",
    url: "https://www.efficyon.com/benchmarks/subscription-cost-per-employee",
    datePublished: "2026-03-01",
    dateModified: "2026-03-01",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          Software cost{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic" style={{ color: GREEN }}>
            per employee.
          </span>
        </h1>
        <p className="mt-8 max-w-[600px] text-[17px] font-light leading-[1.65] text-white/65">
          The average company spends $150–$200 per employee per month on SaaS. The number
          varies by department, industry, and maturity. Department breakdowns, year-over-year
          trends, and a four-step guide to calculating yours.
        </p>
      </section>

      {/* OVERALL HEADLINE */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
          2026 overall benchmark
        </p>
        <p
          className="mt-6 font-[family-name:var(--font-instrument-serif)] text-[clamp(80px,12vw,160px)] font-normal italic leading-[0.92] tracking-[-0.04em]"
          style={{ color: GREEN }}
        >
          $150–$200
        </p>
        <p className="mt-6 text-[18px] font-light leading-[1.6] text-white/65">
          per employee per month · median across industries and company sizes.
        </p>
      </section>

      {/* DEPARTMENT TABLE */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>By function</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Software cost{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            by department.
          </span>
        </h2>

        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="border-y border-white/[0.08] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                <th className="py-5 pr-6 text-left font-normal">Department</th>
                <th className="py-5 pr-6 text-left font-normal">Avg / employee</th>
                <th className="py-5 pr-6 text-left font-normal">Typical waste</th>
                <th className="py-5 text-left font-normal">Common tools</th>
              </tr>
            </thead>
            <tbody>
              {departmentBenchmarks.map((d) => (
                <tr key={d.department} className="border-b border-white/[0.08]">
                  <td className="py-6 pr-6 align-top">
                    <span className="text-[18px] font-medium tracking-[-0.01em] text-white">
                      {d.department}
                    </span>
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px]" style={{ color: GREEN }}>
                    {d.avgCostPerEmployee}
                  </td>
                  <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white">
                    {d.typicalWaste}
                  </td>
                  <td className="py-6 align-top">
                    <div className="flex flex-wrap gap-2">
                      {d.commonTools.slice(0, 4).map((tool) => (
                        <span
                          key={tool}
                          className="border border-white/[0.12] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-white/65"
                        >
                          {tool}
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
          {departmentBenchmarks.map((d) => (
            <div key={d.department} className="py-8" style={{ fontVariantNumeric: "tabular-nums" }}>
              <p className="text-[20px] font-medium tracking-[-0.01em] text-white">{d.department}</p>
              <dl className="mt-5 grid grid-cols-2 gap-y-4 font-[family-name:var(--font-geist-mono)]">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Avg / employee</dt>
                  <dd className="mt-1 text-[14px]" style={{ color: GREEN }}>{d.avgCostPerEmployee}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">Typical waste</dt>
                  <dd className="mt-1 text-[14px] text-white">{d.typicalWaste}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {d.commonTools.map((tool) => (
                  <span
                    key={tool}
                    className="border border-white/[0.12] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-white/65"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DEPT VISUALIZATION */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>Visual scale</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Department cost{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            comparison.
          </span>
        </h2>

        <div className="space-y-8">
          {departmentBenchmarks.map((d) => {
            const minCost = parseInt(d.avgCostPerEmployee.replace(/[^0-9]/g, ""))
            const parts = d.avgCostPerEmployee.split("-")
            const maxCost = parts[1]
              ? parseInt(parts[1].replace(/[^0-9]/g, ""))
              : minCost
            const avgCost = (minCost + maxCost) / 2
            const widthPercentage = Math.min((avgCost / 450) * 100, 100)

            return (
              <div key={d.department}>
                <div
                  className="mb-3 flex items-baseline justify-between font-[family-name:var(--font-geist-mono)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <span className="text-[13px] text-white/75">{d.department}</span>
                  <span className="text-[13px]" style={{ color: GREEN }}>
                    {d.avgCostPerEmployee}
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
          Scale: $0 – $450 per employee per month
        </p>
      </section>

      {/* OPTIMIZATION POTENTIAL */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>Where the leak is</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Optimization potential{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            by department.
          </span>
        </h2>
        <div className="border-t border-white/[0.08]">
          {departmentBenchmarks.map((d, i) => (
            <div
              key={d.department}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[20px] font-medium tracking-[-0.01em] text-white md:text-[22px]">
                  {d.department}
                </p>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.7] text-white/60">
                  {d.optimizationPotential}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* YOY TRENDS */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>The trajectory</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          Year-over-year{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            cost trends.
          </span>
        </h2>

        <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr className="border-y border-white/[0.08] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
              <th className="py-5 pr-6 text-left font-normal">Year</th>
              <th className="py-5 pr-6 text-left font-normal">Avg / employee</th>
              <th className="py-5 text-left font-normal">YoY growth</th>
            </tr>
          </thead>
          <tbody>
            {yearOverYearGrowth.map((item) => (
              <tr key={item.year} className="border-b border-white/[0.08]">
                <td className="py-6 pr-6 align-top text-[18px] font-medium tracking-[-0.01em] text-white">
                  {item.year}
                </td>
                <td className="py-6 pr-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px]" style={{ color: GREEN }}>
                  {item.avgPerEmployee}
                </td>
                <td className="py-6 align-top font-[family-name:var(--font-geist-mono)] text-[14px] text-white/70">
                  {item.growth}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 max-w-[68ch] text-[14px] leading-[1.65] text-white/45">
          Growth is decelerating as SaaS-management practices spread, but absolute spend
          continues to climb. AI-add-on pricing is the new tailwind to watch.
        </p>
      </section>

      {/* HOW TO CALCULATE */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <EditorialEyebrow>The calculation</EditorialEyebrow>
        <h2 className="mb-12 text-[clamp(32px,3.8vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
          How to calculate{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
            yours.
          </span>
        </h2>

        <div className="border-t border-white/[0.08]">
          {[
            {
              title: "Gather all software subscriptions",
              body: "Export every recurring software charge from your accounting system or card statements. Include annual subscriptions (divided by 12), quarterly, and monthly. Don't skip departmental purchases that bypass central procurement.",
            },
            {
              title: "Sum your total monthly software spend",
              body: "Add up everything to get total monthly SaaS spend. Include cloud infrastructure (AWS, GCP, Azure), productivity, communication, and specialized tools. Exclude one-time purchases and hardware.",
            },
            {
              title: "Divide by your headcount",
              body: "Divide total monthly SaaS spend by full-time-equivalent employees. Include contractors if they use company subscriptions. That number is your per-employee monthly cost.",
            },
            {
              title: "Compare to benchmarks",
              body: "Compare your result against the benchmarks above for your industry and company size. Significantly above benchmark suggests optimization potential. Below it sometimes signals under-investment in tools that improve productivity.",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[20px] font-medium tracking-[-0.01em] text-white md:text-[22px]">
                  {step.title}
                </p>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.7] text-white/60">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-[68ch] text-[15px] leading-[1.7] text-white/55">
          <span style={{ color: GREEN }}>✦</span>{" "}
          <span className="text-white/85">Skip the manual work.</span> Efficyon
          automates this entire calculation by connecting to your accounting system and
          SaaS tools — accurate per-employee breakdowns by department, in minutes.
        </p>
      </section>

      {/* SEO */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-24 md:px-12">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <EditorialEyebrow>Reading the data</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
              Why engineering{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                always tops the list.
              </span>
            </h2>
          </div>
          <div className="space-y-6 text-[15.5px] leading-[1.7] text-white/60">
            <p>
              <strong className="text-white/85">Engineering</strong> consistently has
              the highest per-employee software cost ($250–$450/month). Code hosting
              (GitHub/GitLab), IDEs, project management, cloud infrastructure for dev
              and staging, monitoring (Datadog), and design (Figma) — each tool is
              essential, but the cumulative bill surprises finance every time. Cloud
              right-sizing alone is often 30–40% of the department budget.
            </p>
            <p>
              <strong className="text-white/85">Sales &amp; marketing</strong> spend
              $150–$400/employee. CRM, sales engagement, prospecting, analytics,
              creative, email — both departments are prone to tool overlap. Consolidating
              CRM, email, and analytics suites typically reduces department SaaS by 20–30%.
            </p>
            <p>
              <strong className="text-white/85">The trend is decelerating, not
              reversing.</strong> Year-over-year per-employee SaaS growth has dropped
              from ~12.5% in 2023 to a projected 7.9% in 2026. AI add-ons are the new
              cost driver — vendors are tacking $5–$20/user/month onto existing tools
              for AI-assisted features. Companies that don&apos;t actively manage will
              keep seeing 8–10% annual increases.
            </p>
            <p>
              <strong className="text-white/85">What good looks like:</strong> 10–20%
              below benchmark for your industry and size — without under-investing in
              tools that drive productivity. The goal isn&apos;t cuts; it&apos;s ensuring
              every dollar delivers value.
            </p>
          </div>
        </div>
      </section>

      <EditorialFinalCTA
        title="Skip the spreadsheet."
        italic="Get the breakdown."
        body="Connect your accounting system to Efficyon and get an accurate per-employee cost breakdown by department — with optimization recommendations — in minutes. Read-only access. No credit card."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View by company size →", href: "/benchmarks/saas-spend-by-company-size" }}
      />
    </>
  )
}
