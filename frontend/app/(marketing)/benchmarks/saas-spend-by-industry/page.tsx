import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { industryBenchmarks } from "@/lib/benchmark-data"
import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Shield,
  Building2,
} from "lucide-react"

export const metadata: Metadata = {
  title: "SaaS Spend Benchmarks by Industry: 2026 Data",
  description:
    "How does your industry compare in SaaS spending? 2026 benchmarks for technology, finance, healthcare, marketing, e-commerce, education, and manufacturing with waste percentages and top tools.",
  alternates: {
    canonical: "/benchmarks/saas-spend-by-industry",
  },
  openGraph: {
    title: "SaaS Spend Benchmarks by Industry: 2026 Data | Efficyon",
    description:
      "Industry-specific SaaS spending benchmarks with waste percentages and top tools per sector.",
    url: "https://www.efficyon.com/benchmarks/saas-spend-by-industry",
    type: "article",
  },
}

export default function SaasSpendByIndustryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "SaaS Spend Benchmarks by Industry: 2026 Data",
    description:
      "Industry-specific SaaS spending benchmarks for 2026 covering seven major sectors.",
    url: "https://www.efficyon.com/benchmarks/saas-spend-by-industry",
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

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4">
              <BarChart3 className="h-3.5 w-3.5" />
              2026 Data
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              SaaS Spend Benchmarks by Industry: 2026 Data
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl">
              SaaS spending varies significantly across industries. Compare your
              software costs to industry-specific benchmarks covering average
              spend per employee, common tool categories, waste percentages, and
              top tools for each sector.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-10 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">7</div>
              <div className="text-sm text-gray-400">Industries covered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">$80-$400</div>
              <div className="text-sm text-gray-400">Per employee/month range</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">20-45%</div>
              <div className="text-sm text-gray-400">Waste range</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">Agencies</div>
              <div className="text-sm text-gray-400">Highest spenders</div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Benchmark Table */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Average SaaS Spend Per Employee by Industry
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Industry
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Avg Spend/Employee
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Typical Waste
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Top Categories
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {industryBenchmarks.map((benchmark, index) => (
                    <tr
                      key={benchmark.industry}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"
                      }`}
                    >
                      <td className="p-4">
                        <div className="text-white font-semibold">
                          {benchmark.industry}
                        </div>
                      </td>
                      <td className="p-4 text-cyan-400 font-medium">
                        {benchmark.avgSpendPerEmployee}
                      </td>
                      <td className="p-4 text-amber-400 font-medium">
                        {benchmark.typicalWaste}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {benchmark.commonCategories.map((cat) => (
                            <span
                              key={cat}
                              className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300"
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {industryBenchmarks.map((benchmark) => (
                <div
                  key={benchmark.industry}
                  className="p-5 rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="text-lg font-bold text-white mb-3">
                    {benchmark.industry}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-500">Avg Spend/Employee</div>
                      <div className="text-sm text-cyan-400 font-medium">
                        {benchmark.avgSpendPerEmployee}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Typical Waste</div>
                      <div className="text-sm text-amber-400 font-medium">
                        {benchmark.typicalWaste}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {benchmark.commonCategories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Industry Breakdowns */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Detailed Industry Analysis
            </h2>

            <div className="space-y-6">
              {industryBenchmarks.map((benchmark) => (
                <div
                  key={benchmark.industry}
                  className="p-6 rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {benchmark.industry}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="text-cyan-400">
                          {benchmark.avgSpendPerEmployee}
                        </span>
                        <span className="text-amber-400">
                          {benchmark.typicalWaste} waste
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4">{benchmark.notes}</p>

                  <div className="pt-4 border-t border-white/5">
                    <div className="text-xs text-gray-500 mb-2">Top Tools</div>
                    <div className="flex flex-wrap gap-2">
                      {benchmark.topTools.map((tool) => (
                        <span
                          key={tool}
                          className="text-xs px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 font-medium"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spend Comparison Visual */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Industry Spend Comparison
            </h2>
            <div className="space-y-6">
              {industryBenchmarks.map((benchmark) => {
                const minSpend = parseInt(
                  benchmark.avgSpendPerEmployee.replace(/[^0-9]/g, "")
                )
                const parts = benchmark.avgSpendPerEmployee.split("-")
                const maxSpend = parts[1]
                  ? parseInt(parts[1].replace(/[^0-9]/g, ""))
                  : minSpend
                const avgSpend = (minSpend + maxSpend) / 2
                const widthPercentage = Math.min((avgSpend / 400) * 100, 100)

                return (
                  <div key={benchmark.industry}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium">
                        {benchmark.industry}
                      </span>
                      <span className="text-sm text-cyan-400">
                        {benchmark.avgSpendPerEmployee}
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Scale: $0 &ndash; $400 per employee per month
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Understanding SaaS Spend Differences Across Industries
            </h2>
            <div className="prose prose-invert max-w-none space-y-5 text-gray-300">
              <p>
                SaaS spending varies dramatically across industries, driven by
                differences in technical requirements, compliance obligations,
                workforce composition, and competitive pressures. A marketing
                agency with 50 employees may spend more on software per person
                than a manufacturing company with 500 employees, simply because
                the agency&apos;s work is entirely digital and requires a wide
                array of creative, analytics, and project management tools.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Technology Leads in Per-Employee Spend
              </h3>
              <p>
                Technology companies consistently rank among the highest SaaS
                spenders, with per-employee costs ranging from $200 to $350 per
                month. This is driven by expensive developer tooling (GitHub,
                Jira, CI/CD platforms), cloud infrastructure costs (AWS, GCP,
                Azure), monitoring and observability tools (Datadog, New Relic),
                and design tools (Figma). The waste percentage in technology
                companies tends to be 30-40%, primarily from over-provisioned
                cloud resources and unused developer tool licenses. Cloud
                infrastructure alone often represents 40-60% of a tech
                company&apos;s total SaaS bill, making it the single largest
                optimization opportunity.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Marketing Agencies Face the Highest Waste
              </h3>
              <p>
                Marketing agencies and creative firms have the widest range of
                per-employee spend ($200-$400/month) and the highest typical
                waste percentage (30-45%). This is because agencies frequently
                experiment with new tools, maintain client-specific
                subscriptions, and accumulate overlapping analytics, SEO,
                social media, and design tools over time. The fast-paced nature
                of agency work means that tools are adopted quickly but rarely
                evaluated for redundancy. An agency might be paying for both
                Semrush and Ahrefs, both Canva and Adobe Creative Cloud, and
                both Mailchimp and HubSpot for email marketing. Consolidation
                presents the largest savings opportunity in this sector.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Healthcare and Finance: Compliance Costs Matter
              </h3>
              <p>
                Healthcare and financial services firms face unique SaaS cost
                challenges driven by regulatory compliance. HIPAA requirements
                in healthcare and SOC 2/PCI-DSS requirements in finance often
                push organizations toward higher-tier plans that include
                compliance features like audit logs, data residency controls,
                and advanced encryption. While these features are necessary,
                they are frequently purchased organization-wide when only a
                subset of users handles regulated data. Right-sizing compliance
                tiers &mdash; assigning enterprise-grade licenses only to users
                who handle sensitive information &mdash; can reduce costs by
                15-25% without compromising regulatory posture.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Education and Manufacturing: Lower Spend, Different Challenges
              </h3>
              <p>
                Education and manufacturing organizations typically have the
                lowest per-employee SaaS spend ($80-$160/month), reflecting a
                lower density of digital tools per worker. However, these
                industries face unique challenges. Educational institutions deal
                with seasonal usage patterns that lead to paying for licenses
                during academic breaks. Manufacturing companies often maintain
                expensive legacy ERP and CAD licenses alongside modern SaaS
                tools. Both industries benefit from regular license audits to
                identify seasonal or role-based optimization opportunities.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Using Industry Benchmarks Effectively
              </h3>
              <p>
                Industry benchmarks should be used as directional indicators,
                not absolute targets. Your company&apos;s optimal SaaS spend
                depends on your specific business model, growth stage, and
                technical requirements. A tech startup building AI products will
                naturally spend more per employee than industry averages due to
                GPU compute costs and specialized tools. The goal is not to
                match the benchmark exactly, but to understand where your spend
                deviates and investigate whether those deviations represent
                strategic investments or unintentional waste.
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
              Get Industry-Specific Insights
            </h2>
            <p className="text-gray-300 mb-8">
              Connect your tools to Efficyon and see how your SaaS spend
              compares to other companies in your specific industry and size
              bracket.
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
