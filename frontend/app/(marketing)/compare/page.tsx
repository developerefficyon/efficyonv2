import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import {
  ArrowRight,
  BarChart3,
  Shield,
  Zap,
  FileSpreadsheet,
  Trophy,
  Building2,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Compare SaaS Management Tools",
  description:
    "See how Efficyon compares to other SaaS management and cost optimization tools. Honest, detailed comparisons to help you choose the right platform.",
  alternates: {
    canonical: "/compare",
  },
  openGraph: {
    title: "Compare SaaS Management Tools | Efficyon",
    description:
      "See how Efficyon compares to other SaaS management and cost optimization tools. Honest, detailed comparisons to help you choose the right platform.",
    url: "https://www.efficyon.com/compare",
  },
}

const comparisons = [
  {
    slug: "efficyon-vs-zylo",
    competitor: "Zylo",
    tagline: "Enterprise SaaS management vs AI-powered cost optimization",
    description:
      "Compare Efficyon and Zylo across pricing, features, and time to value. See why growing companies choose Efficyon for actionable cost savings.",
    icon: Building2,
    highlight: "Starts at $39/mo vs $50K+/year",
  },
  {
    slug: "efficyon-vs-torii",
    competitor: "Torii",
    tagline: "IT workflow automation vs deep cost analysis",
    description:
      "Torii excels at IT workflows. Efficyon excels at finding savings. Compare both platforms to see which fits your priorities.",
    icon: Zap,
    highlight: "Deeper cost analysis with AI recommendations",
  },
  {
    slug: "efficyon-vs-cleanshelf",
    competitor: "Cleanshelf",
    tagline: "A modern alternative to an acquired platform",
    description:
      "Cleanshelf was acquired by Zylo and is no longer independently developed. See how Efficyon offers a modern, actively maintained alternative.",
    icon: Shield,
    highlight: "Actively developed with modern AI",
  },
  {
    slug: "efficyon-vs-productiv",
    competitor: "Productiv",
    tagline: "SaaS intelligence vs actionable cost optimization",
    description:
      "Productiv focuses on engagement analytics. Efficyon focuses on saving you money. Compare both approaches side by side.",
    icon: BarChart3,
    highlight: "ROI guarantee with accessible pricing",
  },
  {
    slug: "efficyon-vs-spreadsheets",
    competitor: "Spreadsheets",
    tagline: "Manual tracking vs automated optimization",
    description:
      "Still tracking SaaS in spreadsheets? See the true cost of manual management and how automation saves both time and money.",
    icon: FileSpreadsheet,
    highlight: "$39/mo vs $2,000+/mo in labor costs",
  },
  {
    slug: "best-saas-cost-optimization-tools",
    competitor: "Best Tools 2026",
    tagline: "Complete guide to SaaS cost optimization platforms",
    description:
      "Our honest roundup of the best SaaS cost optimization tools in 2026, including pricing, features, and who each tool is best for.",
    icon: Trophy,
    highlight: "8 tools compared in detail",
  },
]

export default function ComparePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Compare SaaS Management Tools | Efficyon",
    description:
      "See how Efficyon compares to other SaaS management and cost optimization tools.",
    url: "https://www.efficyon.com/compare",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: comparisons.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Efficyon vs ${c.competitor}`,
        url: `https://www.efficyon.com/compare/${c.slug}`,
      })),
    },
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            See How Efficyon Compares
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Honest, detailed comparisons to help you choose the right SaaS
            management and cost optimization platform for your business. We
            believe in transparency -- even when a competitor might be the
            better fit.
          </p>
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {comparisons.map((comparison) => {
              const Icon = comparison.icon
              return (
                <Link
                  key={comparison.slug}
                  href={`/compare/${comparison.slug}`}
                  className="group block"
                >
                  <div className="h-full border border-white/10 rounded-xl bg-black/50 p-8 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          vs {comparison.competitor}
                        </h2>
                        <p className="text-sm text-gray-400">
                          {comparison.tagline}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                      {comparison.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full">
                        {comparison.highlight}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Not sure which tool is right for you?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            Our team can help you evaluate your SaaS management needs and
            determine if Efficyon is the right fit. No pressure, just honest
            guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
            >
              Start Free Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-medium border border-white/10 bg-white/5 text-gray-200 rounded-lg hover:border-white/20 hover:bg-white/10 hover:text-white transition-all duration-300"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
