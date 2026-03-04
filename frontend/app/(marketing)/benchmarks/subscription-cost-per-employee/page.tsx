import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  departmentBenchmarks,
  yearOverYearGrowth,
} from "@/lib/benchmark-data"
import {
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle,
  Shield,
  TrendingUp,
  Calculator,
  DollarSign,
} from "lucide-react"

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

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium mb-4">
              <Users className="h-3.5 w-3.5" />
              2026 Data
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Software Cost Per Employee: What&apos;s Normal in 2026?
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl">
              The average company spends $150-$200 per employee per month on
              SaaS subscriptions. But this number varies dramatically by
              department, industry, and company maturity. Here&apos;s what the data
              shows.
            </p>
          </div>
        </div>
      </section>

      {/* Overall Benchmark */}
      <section className="py-12 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] text-center">
              <div className="text-sm text-cyan-400 font-medium mb-2">
                2026 Overall Benchmark
              </div>
              <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                $150&ndash;$200
              </div>
              <div className="text-lg text-gray-300">
                per employee per month
              </div>
              <div className="text-sm text-gray-500 mt-3">
                Median across all industries and company sizes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Department Breakdown */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Software Cost by Department
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Department
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Avg Cost/Employee
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Typical Waste
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Common Tools
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBenchmarks.map((dept, index) => (
                    <tr
                      key={dept.department}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"
                      }`}
                    >
                      <td className="p-4">
                        <div className="text-white font-semibold">
                          {dept.department}
                        </div>
                      </td>
                      <td className="p-4 text-cyan-400 font-medium">
                        {dept.avgCostPerEmployee}
                      </td>
                      <td className="p-4 text-amber-400 font-medium">
                        {dept.typicalWaste}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {dept.commonTools.slice(0, 4).map((tool) => (
                            <span
                              key={tool}
                              className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300"
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {departmentBenchmarks.map((dept) => (
                <div
                  key={dept.department}
                  className="p-5 rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="text-lg font-bold text-white mb-3">
                    {dept.department}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-500">Avg Cost/Employee</div>
                      <div className="text-sm text-cyan-400 font-medium">
                        {dept.avgCostPerEmployee}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Typical Waste</div>
                      <div className="text-sm text-amber-400 font-medium">
                        {dept.typicalWaste}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dept.commonTools.map((tool) => (
                      <span
                        key={tool}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Department Cost Visualization */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Department Cost Comparison
            </h2>
            <div className="space-y-6">
              {departmentBenchmarks.map((dept) => {
                const minCost = parseInt(
                  dept.avgCostPerEmployee.replace(/[^0-9]/g, "")
                )
                const parts = dept.avgCostPerEmployee.split("-")
                const maxCost = parts[1]
                  ? parseInt(parts[1].replace(/[^0-9]/g, ""))
                  : minCost
                const avgCost = (minCost + maxCost) / 2
                const widthPercentage = Math.min((avgCost / 450) * 100, 100)

                return (
                  <div key={dept.department}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium">
                        {dept.department}
                      </span>
                      <span className="text-sm text-cyan-400">
                        {dept.avgCostPerEmployee}
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Scale: $0 &ndash; $450 per employee per month
            </p>
          </div>
        </div>
      </section>

      {/* Optimization Potential by Department */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Optimization Potential by Department
            </h2>
            <div className="space-y-4">
              {departmentBenchmarks.map((dept) => (
                <div
                  key={dept.department}
                  className="p-5 rounded-xl border border-green-500/20 bg-green-500/[0.03] flex items-start gap-4"
                >
                  <div className="h-8 w-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">
                      {dept.department}
                    </div>
                    <p className="text-gray-300 text-sm">
                      {dept.optimizationPotential}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Year-over-Year Trends */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Year-over-Year Cost Trends
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Year
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      Avg Per Employee
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">
                      YoY Growth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearOverYearGrowth.map((item, index) => (
                    <tr
                      key={item.year}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"
                      }`}
                    >
                      <td className="p-4 text-white font-semibold">
                        {item.year}
                      </td>
                      <td className="p-4 text-cyan-400 font-medium">
                        {item.avgPerEmployee}
                      </td>
                      <td className="p-4 text-gray-300">{item.growth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Growth rate has been decelerating as companies adopt SaaS
              management practices, but absolute spend continues to increase.
            </p>
          </div>
        </div>
      </section>

      {/* How to Calculate Yours */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Calculator className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                How to Calculate Your Cost Per Employee
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-start gap-4">
                <div className="h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">1</span>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">
                    Gather All Software Subscriptions
                  </div>
                  <p className="text-gray-300 text-sm">
                    Export all recurring software charges from your accounting
                    system or credit card statements. Include annual subscriptions
                    (divided by 12), quarterly, and monthly charges. Don&apos;t
                    forget departmental purchases that may not go through
                    central procurement.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-start gap-4">
                <div className="h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">2</span>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">
                    Sum Your Total Monthly Software Spend
                  </div>
                  <p className="text-gray-300 text-sm">
                    Add up all software subscription costs to get your total
                    monthly SaaS spend. Include cloud infrastructure (AWS, GCP,
                    Azure), productivity tools, communication platforms, and
                    specialized tools. Exclude one-time purchases and hardware.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-start gap-4">
                <div className="h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">3</span>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">
                    Divide by Your Headcount
                  </div>
                  <p className="text-gray-300 text-sm">
                    Divide total monthly SaaS spend by the number of full-time
                    equivalent employees. Include contractors if they use company
                    software subscriptions. This gives you your per-employee
                    monthly cost.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-start gap-4">
                <div className="h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">4</span>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">
                    Compare to Benchmarks
                  </div>
                  <p className="text-gray-300 text-sm">
                    Compare your result against the benchmarks on this page for
                    your industry and company size. If your number is
                    significantly above benchmark, there is likely optimization
                    potential. If it&apos;s below, you may be underinvesting in
                    tools that could improve productivity.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03]">
              <p className="text-sm text-gray-300">
                <strong className="text-cyan-400">Skip the manual work:</strong>{" "}
                Efficyon automates this entire calculation by connecting to your
                accounting systems and SaaS tools. Get an accurate per-employee
                cost breakdown by department in minutes, not weeks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              The Complete Guide to Software Cost Per Employee
            </h2>
            <div className="prose prose-invert max-w-none space-y-5 text-gray-300">
              <p>
                Software cost per employee has become one of the most important
                metrics for modern businesses to track. As organizations have
                shifted from on-premise software to cloud-based SaaS
                subscriptions, software has transitioned from a capital expense
                with a one-time cost to a recurring operational expense that
                compounds every month. This shift makes per-employee software
                cost a critical input for budgeting, financial planning, and
                operational efficiency.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Why Engineering Costs the Most
              </h3>
              <p>
                Engineering departments consistently have the highest
                per-employee software costs, ranging from $250 to $450 per
                month. This is driven by the breadth and depth of tools
                required for modern software development. A typical engineer
                uses a code hosting platform (GitHub or GitLab, $4-$99/user),
                an IDE or editor, a project management tool (Jira or Linear),
                cloud infrastructure for development and staging environments,
                monitoring and observability tools (Datadog, $15+/host), and
                design tools for reviewing UI work (Figma). Each of these
                tools is essential for productivity, but the cumulative cost
                per engineer can surprise finance teams. The primary
                optimization opportunities in engineering are cloud
                infrastructure right-sizing (often 30-40% of the department
                budget), unused IDE licenses, and consolidating overlapping
                monitoring tools.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Sales and Marketing: High Spend, High Potential for Savings
              </h3>
              <p>
                Sales teams spend $150-$300 per employee per month, primarily
                on CRM platforms (Salesforce, HubSpot), sales engagement tools
                (Outreach, Salesloft), prospecting tools (LinkedIn Sales
                Navigator, ZoomInfo), and communication platforms. Marketing
                teams spend $200-$400 per person on analytics tools (Semrush,
                Google Analytics), creative tools (Adobe CC, Canva), email
                platforms (Mailchimp, HubSpot), and advertising management
                tools. Both departments are prone to tool overlap, where
                different team members use competing products for the same
                function. Consolidating on one CRM, one email platform, and one
                analytics suite can reduce department-level SaaS costs by
                20-30%.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                The Growth Trend Is Decelerating but Not Reversing
              </h3>
              <p>
                Year-over-year growth in per-employee SaaS costs has been
                gradually decelerating, from 12.5% in 2023 to a projected 7.9%
                in 2026. This deceleration reflects increasing adoption of SaaS
                management practices, vendor consolidation efforts, and greater
                scrutiny of software budgets during the post-2022 efficiency
                era. However, per-employee costs continue to increase in
                absolute terms because the overall number and capability of SaaS
                tools keeps growing. AI-powered features, in particular, are
                adding $5-$20 per user per month to many existing SaaS products
                as vendors introduce AI add-ons for coding assistance,
                writing, analytics, and customer service. Companies that do not
                actively manage their SaaS spend will continue to see per-employee
                costs rise at 8-10% annually.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                What &ldquo;Good&rdquo; Looks Like
              </h3>
              <p>
                A well-optimized company typically spends 10-20% below the
                benchmark for their industry and size segment. This does not
                mean cutting tools aggressively &mdash; under-investing in
                software can hurt productivity more than it saves in
                subscription costs. Instead, the goal is to ensure that every
                dollar spent on SaaS delivers value. This means right-sizing
                license tiers, eliminating truly unused subscriptions,
                consolidating overlapping tools, and negotiating volume
                discounts where appropriate. Efficyon helps companies achieve
                this balanced optimization by correlating spend data with actual
                usage patterns, ensuring that cost-cutting recommendations
                never compromise team productivity.
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
              Calculate Your Per-Employee Cost Automatically
            </h2>
            <p className="text-gray-300 mb-8">
              Skip the spreadsheet. Connect your tools to Efficyon and get an
              accurate per-employee cost breakdown by department, with
              optimization recommendations, in minutes.
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
