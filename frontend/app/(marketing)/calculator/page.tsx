import type { Metadata } from "next"
import Link from "next/link"
import {
  Calculator,
  TrendingUp,
  Trash2,
  ArrowRight,
  BarChart3,
  Shield,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Free SaaS Calculators & Tools | Efficyon",
  description:
    "Free interactive SaaS calculators to estimate your software costs, calculate ROI from optimization, and identify subscription waste. Make data-driven decisions about your SaaS stack.",
  alternates: {
    canonical: "/calculator",
  },
  openGraph: {
    title: "Free SaaS Calculators & Tools | Efficyon",
    description:
      "Free interactive SaaS calculators to estimate your software costs, calculate ROI from optimization, and identify subscription waste.",
    url: "https://www.efficyon.com/calculator",
  },
}

const calculators = [
  {
    title: "SaaS Cost Calculator",
    description:
      "How much should your company spend on SaaS? Enter your company profile to see industry benchmarks, identify overspending, and discover potential savings based on real data from thousands of companies.",
    href: "/calculator/saas-cost",
    icon: Calculator,
    color: "cyan" as const,
    stats: "Used by 2,000+ companies",
    features: [
      "Industry-specific benchmarks",
      "Per-employee cost analysis",
      "Overspend detection",
      "Annual waste estimation",
    ],
  },
  {
    title: "SaaS Optimization ROI Calculator",
    description:
      "What return can you expect from optimizing your SaaS stack? Calculate projected savings from license optimization, duplicate elimination, and time savings with our comprehensive ROI model.",
    href: "/calculator/roi",
    icon: TrendingUp,
    color: "green" as const,
    stats: "Average ROI: 340%",
    features: [
      "License optimization savings",
      "Duplicate tool elimination",
      "Time savings quantification",
      "Payback period calculation",
    ],
  },
  {
    title: "SaaS Waste Estimator",
    description:
      "How much money is your company losing to unused subscriptions, duplicate tools, and overprovisioned licenses? Get an instant waste estimate and urgency score for your organization.",
    href: "/calculator/waste-estimator",
    icon: Trash2,
    color: "red" as const,
    stats: "Avg waste found: $42,000/yr",
    features: [
      "Unused license detection",
      "Duplicate tool analysis",
      "Shadow IT risk scoring",
      "Urgency assessment",
    ],
  },
]

const colorMap = {
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    glow: "group-hover:shadow-cyan-500/20",
    dot: "bg-cyan-400",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/20",
    glow: "group-hover:shadow-green-500/20",
    dot: "bg-green-400",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    glow: "group-hover:shadow-red-500/20",
    dot: "bg-red-400",
  },
}

export default function CalculatorIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free SaaS Calculators & Tools",
    description:
      "Interactive SaaS cost calculators to help businesses optimize their software spending.",
    url: "https://www.efficyon.com/calculator",
    mainEntity: calculators.map((calc) => ({
      "@type": "WebApplication",
      name: calc.title,
      url: `https://www.efficyon.com${calc.href}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Free Tools &mdash; No Sign-Up Required
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
              Free SaaS Cost Analysis Tools
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Make data-driven decisions about your software stack. Our
              interactive calculators use industry benchmarks to help you
              understand, optimize, and reduce your SaaS spending.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {calculators.map((calc) => {
              const Icon = calc.icon
              const colors = colorMap[calc.color]

              return (
                <Link
                  key={calc.href}
                  href={calc.href}
                  className={`group relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300 hover:shadow-2xl ${colors.glow} flex flex-col`}
                >
                  <div
                    className={`h-14 w-14 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center mb-6`}
                  >
                    <Icon className={`h-7 w-7 ${colors.text}`} />
                  </div>

                  <h2 className="text-xl font-bold text-white mb-3">
                    {calc.title}
                  </h2>

                  <p className="text-gray-400 text-sm mb-6 flex-grow">
                    {calc.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {calc.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/10">
                    <span className="text-xs text-gray-500">{calc.stats}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-sm font-medium ${colors.text} group-hover:gap-2 transition-all`}
                    >
                      Try it free
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-white mb-6">
            Why Use SaaS Cost Analysis Tools?
          </h2>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              Software-as-a-Service spending has become one of the largest
              line items in modern business budgets. The average company now
              uses over 100 SaaS applications, and that number continues to
              grow year over year. Without proper visibility and management,
              this rapid expansion leads to significant waste through unused
              licenses, duplicate subscriptions, and overprovisioned plans.
            </p>
            <p>
              Our free calculators are designed to give you an instant,
              data-driven snapshot of where your SaaS spend stands relative to
              industry benchmarks. Whether you are a startup founder trying to
              keep costs lean, a finance leader preparing for budget season, or
              an IT manager tasked with rationalizing your software stack,
              these tools provide the insights you need to make informed
              decisions.
            </p>
            <p>
              Each calculator uses formulas derived from real-world data across
              thousands of companies. The results are estimates intended to
              help you identify areas worth investigating further. For a
              comprehensive, precise analysis of your actual SaaS stack,{" "}
              <Link href="/register" className="text-cyan-400 hover:text-cyan-300 underline">
                sign up for Efficyon
              </Link>{" "}
              and get AI-powered insights based on your real usage data.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-white">
              Want More Than Estimates?
            </h2>
            <p className="text-gray-300 text-lg">
              These calculators provide helpful estimates, but Efficyon delivers
              exact numbers based on your actual SaaS usage data. Start your
              free analysis today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25"
              >
                Start Free Analysis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              No credit card required. 90-day ROI guarantee.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
