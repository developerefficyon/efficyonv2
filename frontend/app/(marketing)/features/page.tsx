import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  TrendingDown,
  Bell,
  Copy,
  UserX,
  Wallet,
  Brain,
  ClipboardCheck,
  CheckCircle,
  Zap,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Features - SaaS Cost Optimization Tools",
  description:
    "Explore Efficyon's full suite of SaaS cost optimization features. From subscription tracking and duplicate payment detection to AI-powered cost analysis and automated software audits.",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    title: "Features - SaaS Cost Optimization Tools | Efficyon",
    description:
      "Explore Efficyon's full suite of SaaS cost optimization features. From subscription tracking and duplicate payment detection to AI-powered cost analysis and automated software audits.",
    url: "https://www.efficyon.com/features",
    type: "website",
  },
}

const features = [
  {
    slug: "saas-cost-optimization",
    title: "SaaS Cost Optimization",
    description:
      "AI-driven analysis of your entire SaaS stack to uncover hidden savings, eliminate waste, and deliver measurable ROI within 90 days.",
    icon: TrendingDown,
    color: "cyan",
  },
  {
    slug: "subscription-tracking",
    title: "Subscription Tracking",
    description:
      "Centralized dashboard for every subscription across your organization. Never miss a renewal, catch shadow IT, and track cost trends over time.",
    icon: Bell,
    color: "blue",
  },
  {
    slug: "duplicate-payment-detection",
    title: "Duplicate Payment Detection",
    description:
      "Automatically detect duplicate invoices, overlapping tools, and redundant subscriptions that silently drain your budget every month.",
    icon: Copy,
    color: "purple",
  },
  {
    slug: "unused-license-detection",
    title: "Unused License Detection",
    description:
      "Usage-based analysis identifies licenses that sit idle, departed employees with active seats, and overprovisioned tiers across every tool.",
    icon: UserX,
    color: "green",
  },
  {
    slug: "saas-spend-management",
    title: "SaaS Spend Management",
    description:
      "Full spend visibility with real-time dashboards, budget controls, forecasting, and department-level allocation in a single platform.",
    icon: Wallet,
    color: "orange",
  },
  {
    slug: "ai-cost-analysis",
    title: "AI Cost Analysis",
    description:
      "Machine learning algorithms continuously analyze spending patterns, detect anomalies, and surface optimization opportunities humans miss.",
    icon: Brain,
    color: "pink",
  },
  {
    slug: "software-audit",
    title: "Software Audit",
    description:
      "Automated software inventory, compliance tracking, and audit-ready reports generated in minutes instead of months.",
    icon: ClipboardCheck,
    color: "yellow",
  },
]

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
}

export default function FeaturesIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.efficyon.com/features",
    description:
      "AI-powered SaaS cost optimization platform with subscription tracking, duplicate payment detection, unused license detection, spend management, AI cost analysis, and automated software audits.",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "39",
      highPrice: "119",
      priceCurrency: "USD",
      offerCount: "3",
    },
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            Platform Features
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl mx-auto leading-tight">
            Powerful Features to Optimize Your SaaS Spend
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            From automated discovery to AI-powered recommendations, Efficyon gives you every tool
            you need to eliminate SaaS waste and maximize the value of every dollar spent on software.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              asChild
            >
              <Link href="/#contact">Book a Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const colors = colorMap[feature.color]
              const Icon = feature.icon
              return (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  className={`group relative rounded-xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]`}
                >
                  <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center mb-5`}>
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                    {feature.title}
                  </h2>
                  <p className="text-gray-400 leading-relaxed mb-5">
                    {feature.description}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-cyan-400 group-hover:gap-2 transition-all">
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Efficyon Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Companies Choose Efficyon
            </h2>
            <p className="text-lg text-gray-300">
              Our integrated platform combines every capability you need to take control of SaaS
              spending, backed by AI that works around the clock.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-7 w-7 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">25% Average Savings</h3>
              <p className="text-gray-400 text-sm">
                Companies using Efficyon reduce their SaaS spend by an average of 25% within the
                first quarter of deployment.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <Zap className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">2-Week Time to Value</h3>
              <p className="text-gray-400 text-sm">
                Receive your first actionable recommendations within two weeks of connecting your
                accounts, not months.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto">
                <TrendingDown className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">90-Day ROI Guarantee</h3>
              <p className="text-gray-400 text-sm">
                We guarantee measurable return on investment within 90 days or we continue working at
                no extra cost until you see results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Stop Overpaying for Software?
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Start your free analysis today and discover exactly how much you could save. No
                credit card required, setup takes less than five minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                  <Link href="/register">
                    Start Free Analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                  asChild
                >
                  <Link href="/#contact">Talk to Sales</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-gray-400">
                No credit card required &middot; 5-minute setup &middot; Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
