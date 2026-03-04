import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { companySizeBenchmarks } from "@/lib/benchmark-data"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  CheckCircle,
  Shield,
  Users,
} from "lucide-react"

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
    url: "https://www.efficyon.com/benchmarks/saas-spend-by-company-size",
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
    url: "https://www.efficyon.com/benchmarks/saas-spend-by-company-size",
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

      {/* Hero Section */}
      <section className="pt-32 pb-12 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/benchmarks"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              All Benchmarks
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-4">
              <Building2 className="h-3.5 w-3.5" />
              2026 Data
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Average SaaS Spend by Company Size: 2026 Benchmarks
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl">
              How much should your company be spending on SaaS? Use these
              benchmarks to compare your software costs against companies of
              similar size and identify whether you&apos;re overspending.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-10 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">$1K-$200K+</div>
              <div className="text-sm text-gray-400">Monthly spend range</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">15-200+</div>
              <div className="text-sm text-gray-400">Tools per company</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">25-45%</div>
              <div className="text-sm text-gray-400">Typical waste</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">$100-$350</div>
              <div className="text-sm text-gray-400">Per employee/month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Benchmark Table */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              SaaS Spend Benchmarks by Company Size
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Company Size
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Employees
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Monthly Spend
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Tool Count
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Per Employee/Mo
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Waste %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companySizeBenchmarks.map((benchmark, index) => (
                    <tr
                      key={benchmark.size}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"
                      }`}
                    >
                      <td className="p-4">
                        <div className="text-white font-semibold">
                          {benchmark.size}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{benchmark.employees}</td>
                      <td className="p-4 text-gray-300">{benchmark.monthlySpend}</td>
                      <td className="p-4 text-gray-300">{benchmark.toolCount}</td>
                      <td className="p-4 text-cyan-400 font-medium">
                        {benchmark.perEmployeeMonthly}
                      </td>
                      <td className="p-4 text-amber-400 font-medium">
                        {benchmark.wastePercentage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {companySizeBenchmarks.map((benchmark) => (
                <div
                  key={benchmark.size}
                  className="p-5 rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="text-lg font-bold text-white mb-1">
                    {benchmark.size}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    {benchmark.employees} employees
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Monthly Spend</div>
                      <div className="text-sm text-gray-300">
                        {benchmark.monthlySpend}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Tools</div>
                      <div className="text-sm text-gray-300">
                        {benchmark.toolCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Per Employee</div>
                      <div className="text-sm text-cyan-400 font-medium">
                        {benchmark.perEmployeeMonthly}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Typical Waste</div>
                      <div className="text-sm text-amber-400 font-medium">
                        {benchmark.wastePercentage}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Optimization Targets */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Optimization Targets by Company Size
            </h2>
            <div className="space-y-4">
              {companySizeBenchmarks.map((benchmark) => (
                <div
                  key={benchmark.size}
                  className="p-5 rounded-xl border border-green-500/20 bg-green-500/[0.03] flex items-start gap-4"
                >
                  <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">
                      {benchmark.size} ({benchmark.employees} employees)
                    </div>
                    <p className="text-gray-300 text-sm">
                      {benchmark.optimizationTarget}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Spend Breakdown */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Per-Employee Spend Visualization
            </h2>
            <div className="space-y-6">
              {companySizeBenchmarks.map((benchmark) => {
                const minSpend = parseInt(
                  benchmark.perEmployeeMonthly.replace(/[^0-9]/g, "")
                )
                const maxSpend = parseInt(
                  benchmark.perEmployeeMonthly
                    .split("-")[1]
                    ?.replace(/[^0-9]/g, "") || "350"
                )
                const avgSpend = (minSpend + maxSpend) / 2
                const widthPercentage = Math.min((avgSpend / 350) * 100, 100)

                return (
                  <div key={benchmark.size}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium">
                        {benchmark.size} ({benchmark.employees})
                      </span>
                      <span className="text-sm text-cyan-400">
                        {benchmark.perEmployeeMonthly}
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Scale: $0 &ndash; $350 per employee per month
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Understanding SaaS Spend by Company Size
            </h2>
            <div className="prose prose-invert max-w-none space-y-5 text-gray-300">
              <p>
                SaaS spending scales with company size, but not always
                proportionally. The relationship between headcount and software
                costs is influenced by factors including industry, growth stage,
                technical complexity, and procurement maturity. Understanding
                where your company falls relative to benchmarks provides
                critical context for budget planning and optimization decisions.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Micro and Small Companies (1-50 employees)
              </h3>
              <p>
                Startups and small businesses typically spend $1,000 to $15,000
                per month on SaaS, using between 15 and 60 tools. The per-employee
                cost tends to be higher at this stage because fixed-cost tools
                (like a CRM or accounting software) are amortized across fewer
                users. The primary waste pattern for small companies is tool
                proliferation: teams adopt new tools quickly without evaluating
                overlap with existing subscriptions. At this stage, the most
                effective optimization strategy is consolidation. Using tools
                with broad feature sets (like Notion for docs and project
                management, or HubSpot for CRM and marketing) reduces the
                number of subscriptions without sacrificing capability.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Mid-Market Companies (51-500 employees)
              </h3>
              <p>
                Mid-market companies represent the sweet spot where SaaS spending
                becomes a material budget line item but procurement processes
                are not yet fully mature. Monthly spend ranges from $15,000 to
                $200,000 across 60 to 200 tools. The waste percentage tends to
                peak in this segment at 30-40% because the company is large
                enough to have accumulated significant tool sprawl but may not
                yet have dedicated SaaS management or procurement teams.
                License tier mismatch is particularly common here. Companies
                often purchase Enterprise tiers for their entire organization
                when Standard tiers would serve 80% of users. Implementing a
                formal SaaS management process and deploying a platform like
                Efficyon at this stage can yield the highest percentage savings.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Enterprise Companies (500+ employees)
              </h3>
              <p>
                Enterprises spend $200,000 or more per month on SaaS across 200
                or more tools. While they typically have procurement teams and
                vendor management processes, the sheer scale of their software
                portfolio creates persistent blind spots. Shadow IT &mdash;
                where departments purchase tools without central approval &mdash;
                is a major waste source at this scale. Enterprises also face
                significant costs from maintaining legacy tools that overlap
                with newer platform purchases. Enterprise optimization requires
                a systematic approach: centralized procurement, regular license
                audits, automated deprovisioning, and ongoing vendor
                negotiations. The absolute dollar savings at this level are
                enormous. Even a 10% reduction on $200,000 monthly spend
                represents $240,000 in annual savings.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Key Takeaways
              </h3>
              <p>
                Regardless of company size, 25-40% of SaaS spending is typically
                wasted. The waste patterns differ by scale, but the opportunity
                is consistent. For companies under 50 employees, consolidation
                and free-tier optimization deliver the best results. For
                mid-market companies, license tier optimization and formal
                procurement processes are key. For enterprises, vendor
                negotiation and shadow IT elimination offer the largest savings.
                Efficyon helps companies at every stage by automating the
                analysis process and delivering prioritized, actionable
                recommendations backed by usage data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              See How Your Spend Compares
            </h2>
            <p className="text-gray-300 mb-8">
              Connect your tools to Efficyon and get a personalized benchmark
              report showing exactly where you stand relative to companies your
              size.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/register">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mt-6">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-green-400" />
                90-day ROI guarantee
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
