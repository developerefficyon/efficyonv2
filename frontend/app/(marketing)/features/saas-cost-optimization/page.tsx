import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowRight,
  CheckCircle,
  TrendingDown,
  BarChart3,
  DollarSign,
  Zap,
  Brain,
  Shield,
  Target,
  LineChart,
} from "lucide-react"

export const metadata: Metadata = {
  title: "SaaS Cost Optimization That Pays for Itself",
  description:
    "Reduce SaaS spending by 25% or more with AI-driven cost optimization. Efficyon analyzes usage, detects waste, and delivers actionable recommendations with a 90-day ROI guarantee.",
  alternates: {
    canonical: "/features/saas-cost-optimization",
  },
  openGraph: {
    title: "SaaS Cost Optimization That Pays for Itself | Efficyon",
    description:
      "Reduce SaaS spending by 25% or more with AI-driven cost optimization. Efficyon analyzes usage, detects waste, and delivers actionable recommendations with a 90-day ROI guarantee.",
    url: "https://www.efficyon.com/features/saas-cost-optimization",
    type: "website",
  },
}

export default function SaaSCostOptimizationPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon SaaS Cost Optimization",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/saas-cost-optimization",
      description:
        "AI-powered SaaS cost optimization platform that analyzes usage data, detects waste, and delivers actionable savings recommendations with a 90-day ROI guarantee.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Automated cost tracking, AI recommendations, Usage-based insights, ROI guarantee, License optimization, Spend analytics",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How much can SaaS cost optimization save my company?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "On average, companies using Efficyon reduce their SaaS spend by 25% within the first quarter. Savings come from eliminating unused licenses, consolidating overlapping tools, and rightsizing subscription tiers based on actual usage data.",
          },
        },
        {
          "@type": "Question",
          name: "How does Efficyon's AI-driven cost optimization work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your accounting systems and SaaS tools to collect spend and usage data. Our AI engine then cross-references this data to identify waste patterns including unused licenses, duplicate subscriptions, and overprovisioned tiers. You receive prioritized recommendations ranked by potential savings.",
          },
        },
        {
          "@type": "Question",
          name: "What is the 90-day ROI guarantee?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We guarantee measurable return on investment within 90 days. If you don't see the projected savings within that period, we continue working with you at no additional cost until you do, or provide a full refund of your subscription fees.",
          },
        },
        {
          "@type": "Question",
          name: "How long does it take to set up SaaS cost optimization?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Initial setup takes less than five minutes. Connect your accounting system and SaaS tools, and Efficyon begins analyzing immediately. Most companies receive their first actionable recommendations within two weeks.",
          },
        },
        {
          "@type": "Question",
          name: "Does SaaS cost optimization require changes to our current tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Efficyon uses read-only integrations to analyze your existing tools and spend data. There is no disruption to your current workflows. Recommendations are provided for your team to implement at their own pace.",
          },
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
              <TrendingDown className="h-4 w-4" />
              SaaS Cost Optimization
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              SaaS Cost Optimization That Pays for Itself
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Stop bleeding money on software you barely use. Efficyon&apos;s AI analyzes every
              subscription, license, and tool across your organization to find savings that
              compound month after month.
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
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>90-Day ROI Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Your SaaS Costs Are Growing Faster Than Your Business
              </h2>
              <p className="text-gray-300 text-lg">
                The average company wastes 25-35% of its SaaS budget on underutilized subscriptions,
                forgotten tools, and overprovisioned licenses. Without automated tracking, the
                problem only gets worse as you scale.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  SaaS spending grows 15-20% year over year while headcount grows at half that rate, creating an ever-widening gap between what you pay and what you actually need
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  No centralized visibility into which tools are actually being used, by whom, and how frequently, leaving finance teams flying blind
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Manual tracking in spreadsheets is error-prone, outdated by the time it is compiled, and consumes dozens of hours every month
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Shadow IT purchases and decentralized buying create duplicate subscriptions that nobody catches until the annual audit
                </p>
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Efficyon Finds the Savings Automatically
              </h2>
              <p className="text-gray-300 text-lg">
                Connect your tools once and let Efficyon&apos;s AI continuously scan for
                optimization opportunities. Every recommendation comes with a dollar figure
                attached so you can prioritize by impact.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Automated cost tracking that pulls data from your accounting system and every connected SaaS tool in real time
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  AI-powered recommendations prioritized by savings potential so you tackle the highest-impact items first
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Usage-based insights that reveal exactly which licenses are active, underutilized, or completely idle
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Measurable ROI guaranteed within 90 days, with continuous monitoring that uncovers new savings every month
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Vendor benchmarking that compares your contract terms against aggregated market data to ensure you are getting the best deal
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How SaaS Cost Optimization Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Three simple steps from setup to savings. Most companies see their first
              actionable recommendations within two weeks.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-cyan-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Connect Your Stack</h3>
              <p className="text-gray-400 leading-relaxed">
                Link your accounting system, SaaS tools, and identity providers in under five
                minutes. Efficyon uses secure, read-only API connections to pull in spend and
                usage data without touching your workflows.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-cyan-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Analyzes Everything</h3>
              <p className="text-gray-400 leading-relaxed">
                Our AI engine cross-references your spend data against actual usage patterns.
                It identifies unused licenses, overlapping tools, mismatched tiers, and
                spending anomalies that manual reviews cannot catch.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-cyan-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Implement and Save</h3>
              <p className="text-gray-400 leading-relaxed">
                Receive prioritized recommendations with estimated dollar savings for each
                action. Track implementation progress on your dashboard and watch your savings
                compound month over month.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Key Benefits of SaaS Cost Optimization
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Every feature is designed to deliver measurable savings with minimal effort from
              your team.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Complete Visibility</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                See every subscription, license, and payment in a single dashboard. No more
                hunting through invoices or chasing department heads for data. Efficyon gives
                your finance team full control.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">AI-Powered Insights</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Machine learning algorithms continuously analyze your data to find savings
                opportunities that human analysis misses. The system gets smarter over time as
                it learns your organization.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Guaranteed Savings</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Our 90-day ROI guarantee means you have nothing to lose. If Efficyon does not
                deliver measurable savings within the first quarter, we work for free until it
                does or refund your subscription.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Continuous Optimization</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                SaaS cost optimization is not a one-time project. Efficyon runs continuously,
                catching new waste as it appears, alerting you to renewals, and keeping your
                stack lean as your company grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2">25%</div>
              <p className="text-white font-medium mb-1">Average SaaS Savings</p>
              <p className="text-gray-400 text-sm">
                Reduction in total SaaS spend within the first 90 days of using Efficyon
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">2 Weeks</div>
              <p className="text-white font-medium mb-1">Time to First Insights</p>
              <p className="text-gray-400 text-sm">
                From connecting your accounts to receiving your first actionable cost-saving recommendations
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">90 Days</div>
              <p className="text-white font-medium mb-1">ROI Guarantee</p>
              <p className="text-gray-400 text-sm">
                Measurable return on investment guaranteed or we continue working at no cost until you see results
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              SaaS Cost Optimization FAQ
            </h2>
            <p className="text-lg text-gray-300">
              Common questions about optimizing your SaaS spending with Efficyon
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How much can SaaS cost optimization save my company?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                On average, companies using Efficyon reduce their SaaS spend by 25% within the first
                quarter. Savings come from eliminating unused licenses, consolidating overlapping
                tools, and rightsizing subscription tiers based on actual usage data. The exact
                amount depends on your current stack size and how long spend has gone unmanaged,
                but even lean organizations typically find 15% or more in recoverable waste.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon&apos;s AI-driven cost optimization work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects to your accounting systems and SaaS tools to collect spend and
                usage data. Our AI engine then cross-references this data to identify waste
                patterns including unused licenses, duplicate subscriptions, and overprovisioned
                tiers. Each finding is ranked by savings potential and presented with a clear
                action plan your team can follow immediately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What is the 90-day ROI guarantee?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                We guarantee measurable return on investment within 90 days. If you do not see the
                projected savings within that period, we continue working with you at no
                additional cost until you do, or provide a full refund of your subscription fees.
                This guarantee applies to all plans, including Startup.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How long does it take to set up SaaS cost optimization?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Initial setup takes less than five minutes. Connect your accounting system and SaaS
                tools through our secure API integrations, and Efficyon begins analyzing
                immediately. Most companies receive their first actionable recommendations
                within two weeks as the AI builds a complete picture of your spending patterns.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does SaaS cost optimization require changes to our current tools?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                No. Efficyon uses read-only integrations to analyze your existing tools and spend
                data. There is no disruption to your current workflows. Recommendations are
                provided for your team to implement at their own pace. You decide which actions
                to take and when, and Efficyon tracks your progress automatically.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start Saving on SaaS Today
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Every day you wait is another day of unnecessary SaaS spending. Connect your
                tools in five minutes and let Efficyon show you exactly where your money is
                going and how to keep more of it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              <p className="mt-6 text-sm text-gray-400">
                No credit card required &middot; 5-minute setup &middot; 90-day ROI guarantee
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
