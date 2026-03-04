import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { benchmarkPages } from "@/lib/benchmark-data"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Users,
  TrendingUp,
  CheckCircle,
  Shield,
} from "lucide-react"

export const metadata: Metadata = {
  title: "SaaS Spend Benchmarks & Data",
  description:
    "SaaS spend benchmarks by company size, industry, and department. Compare your software costs to industry averages and discover optimization opportunities with 2026 data.",
  alternates: {
    canonical: "/benchmarks",
  },
  openGraph: {
    title: "SaaS Spend Benchmarks & Data | Efficyon",
    description:
      "SaaS spend benchmarks by company size, industry, and department. Compare your software costs to industry averages with 2026 data.",
    url: "https://www.efficyon.com/benchmarks",
    type: "website",
  },
}

const benchmarkCards = [
  {
    slug: "saas-spend-by-company-size",
    title: "SaaS Spend by Company Size",
    description:
      "How does your SaaS spend compare to companies of similar size? See benchmarks from micro startups to enterprises with 500+ employees.",
    icon: Building2,
    highlights: [
      "5 company size tiers",
      "Monthly spend ranges",
      "Per-employee breakdowns",
      "Optimization targets",
    ],
    color: "cyan",
  },
  {
    slug: "saas-spend-by-industry",
    title: "SaaS Spend by Industry",
    description:
      "Discover how your industry compares in SaaS spending. Benchmarks across technology, finance, healthcare, marketing, e-commerce, education, and manufacturing.",
    icon: BarChart3,
    highlights: [
      "7 industry sectors",
      "Avg spend per employee",
      "Top tools by industry",
      "Waste percentages",
    ],
    color: "blue",
  },
  {
    slug: "subscription-cost-per-employee",
    title: "Software Cost Per Employee",
    description:
      "What's a normal software cost per employee in 2026? Department-level benchmarks and year-over-year trends to help you budget and optimize.",
    icon: Users,
    highlights: [
      "6 department breakdowns",
      "Year-over-year trends",
      "Calculation guide",
      "Optimization potential",
    ],
    color: "green",
  },
]

export default function BenchmarksIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SaaS Spend Benchmarks & Industry Data",
    description:
      "SaaS spend benchmarks by company size, industry, and department with 2026 data.",
    url: "https://www.efficyon.com/benchmarks",
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
      <section className="pt-32 pb-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              2026 Data
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              SaaS Spend Benchmarks & Industry Data
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              How does your company&apos;s software spending compare? Use our
              benchmark data to understand whether you&apos;re overspending,
              underspending, or right on target for your size, industry, and
              department mix.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/register">
                  Get Your Custom Benchmark
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {benchmarkCards.map((card) => {
                const Icon = card.icon
                const colorMap: Record<string, string> = {
                  cyan: "bg-cyan-500/10 text-cyan-400",
                  blue: "bg-blue-500/10 text-blue-400",
                  green: "bg-green-500/10 text-green-400",
                }
                const badgeColor = colorMap[card.color] || colorMap.cyan

                return (
                  <Link
                    key={card.slug}
                    href={`/benchmarks/${card.slug}`}
                    className="group flex flex-col p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                  >
                    <div
                      className={`h-12 w-12 ${badgeColor.split(" ")[0]} rounded-xl flex items-center justify-center mb-4`}
                    >
                      <Icon className={`h-6 w-6 ${badgeColor.split(" ")[1]}`} />
                    </div>
                    <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors mb-3">
                      {card.title}
                    </h2>
                    <p className="text-gray-400 text-sm mb-6 flex-1">
                      {card.description}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {card.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="text-sm text-gray-300 flex items-center gap-2"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                    <span className="inline-flex items-center gap-1 text-sm text-cyan-400 font-medium group-hover:underline">
                      View benchmarks
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">
              Why SaaS Spend Benchmarking Matters
            </h2>
            <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
              <p>
                SaaS spending has become one of the largest and fastest-growing
                cost categories for modern businesses. Yet most organizations
                lack visibility into whether their software costs are normal,
                excessive, or actually below average for their size and industry.
                Without benchmark data, it is nearly impossible to set
                meaningful budgets, justify optimization investments, or
                communicate spending concerns to leadership.
              </p>
              <p>
                Benchmark data provides the external reference point that
                internal data alone cannot offer. When you know that the average
                company your size spends $150 per employee per month on SaaS,
                and your own number is $250, you have a clear signal that
                optimization opportunities exist. Conversely, if your spending is
                at or below benchmark levels, you can focus your attention on
                other cost areas with confidence.
              </p>
              <p>
                Our benchmark data is compiled from public sources, industry
                reports, and anonymized data across thousands of organizations.
                We update these benchmarks regularly to reflect current market
                conditions, pricing changes, and adoption trends. Use this data
                as a starting point for understanding your relative position,
                then connect your tools to Efficyon for a personalized analysis
                that identifies the specific optimization opportunities most
                relevant to your organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Get Your Personalized Benchmark Report
            </h2>
            <p className="text-gray-300 mb-8">
              Generic benchmarks are a starting point. Connect your tools to
              Efficyon and get a detailed analysis of how your spending compares
              to companies in your exact size and industry bracket.
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
