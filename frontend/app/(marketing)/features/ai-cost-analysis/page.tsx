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
  Brain,
  Scan,
  TrendingUp,
  Lightbulb,
  Eye,
  Zap,
  Activity,
  Target,
} from "lucide-react"

export const metadata: Metadata = {
  title: "AI-Powered Cost Analysis That Finds What Humans Miss",
  description:
    "Machine learning algorithms analyze spending patterns, detect anomalies, and surface optimization opportunities across your entire SaaS stack. Proactive, continuous, and precise.",
  alternates: {
    canonical: "/features/ai-cost-analysis",
  },
  openGraph: {
    title: "AI-Powered Cost Analysis That Finds What Humans Miss | Efficyon",
    description:
      "Machine learning algorithms analyze spending patterns, detect anomalies, and surface optimization opportunities across your entire SaaS stack. Proactive, continuous, and precise.",
    url: "https://www.efficyon.com/features/ai-cost-analysis",
    type: "website",
  },
}

export default function AICostAnalysisPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon AI Cost Analysis",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/ai-cost-analysis",
      description:
        "AI-powered cost analysis tool that uses machine learning to analyze spending patterns, detect anomalies, provide predictive insights, and deliver prioritized optimization recommendations.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Pattern recognition, Anomaly detection, Predictive insights, Continuous monitoring, Prioritized recommendations, Machine learning analysis",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does AI cost analysis differ from manual cost review?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Manual cost reviews are periodic, time-consuming, and limited by human capacity to process large datasets. AI cost analysis is continuous, processes millions of data points simultaneously, and detects patterns that are invisible to manual review. It also eliminates human bias and works 24/7 without fatigue, catching issues the moment they appear.",
          },
        },
        {
          "@type": "Question",
          name: "What types of spending anomalies can the AI detect?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon's AI detects a wide range of anomalies including unexpected price increases, unusual usage spikes, billing errors, off-cycle charges, sudden cost jumps for specific tools, spending patterns that deviate from historical norms, and charges from vendors that should have been cancelled. Each anomaly is flagged with an explanation and recommended action.",
          },
        },
        {
          "@type": "Question",
          name: "How does Efficyon's AI learn about our organization?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The AI builds a baseline model of your organization's spending patterns, tool usage, and workflow habits during the first two weeks. It learns what is normal for your company and then flags deviations. The model continuously refines itself as it collects more data, becoming more accurate and relevant over time.",
          },
        },
        {
          "@type": "Question",
          name: "Can the AI predict future cost issues before they happen?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Efficyon's predictive analytics identify trends that point toward future cost increases, such as accelerating usage that will trigger the next pricing tier, upcoming renewals with historically increasing rates, and tool adoption patterns that suggest growing spend. This gives your team time to act proactively instead of reacting after the cost hits.",
          },
        },
        {
          "@type": "Question",
          name: "How are AI recommendations prioritized?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Each recommendation is scored by estimated savings impact, implementation difficulty, and confidence level. High-savings, low-effort actions appear at the top of your list. You can also filter by category (license optimization, vendor negotiation, tier rightsizing) to focus on the actions most relevant to your current priorities.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium mb-8">
              <Brain className="h-4 w-4" />
              AI Cost Analysis
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              AI-Powered Cost Analysis That Finds What Humans Miss
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Your SaaS spending generates thousands of data points every month. Too many for
              any human to analyze. Efficyon&apos;s machine learning engine processes it all
              continuously, detecting patterns, flagging anomalies, and surfacing savings
              opportunities before they become problems.
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
                <span>Continuous Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Predictive Insights</span>
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
                Human Analysis Cannot Keep Up With SaaS Complexity
              </h2>
              <p className="text-gray-300 text-lg">
                The average company uses over 100 SaaS tools. Each generates billing data,
                usage metrics, and cost trends that change monthly. Manual analysis is not just
                slow, it is fundamentally insufficient for the scale of the problem.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Manual cost analysis takes weeks to complete and is outdated by the time the report reaches decision-makers
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Human bias causes analysts to focus on the largest line items while smaller, systemic waste compounds unchecked across dozens of tools
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Too much data across too many tools for any team to process thoroughly, resulting in surface-level reviews that miss buried savings
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Reactive approach where cost problems are only discovered after they have impacted the budget, instead of being prevented proactively
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Machine Learning That Never Sleeps
              </h2>
              <p className="text-gray-300 text-lg">
                Efficyon&apos;s AI engine runs continuously, analyzing every transaction, usage
                signal, and cost trend across your entire SaaS ecosystem. It learns what normal
                looks like for your organization and then catches everything that deviates.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Pattern recognition that identifies recurring waste across hundreds of tools simultaneously, catching savings that span multiple vendors
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Anomaly detection that flags unusual charges, billing errors, unexpected price increases, and off-cycle payments the moment they appear
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Predictive insights that identify cost trends heading in the wrong direction so your team can act before spending spirals
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Continuous 24/7 monitoring that catches new issues as they emerge, not weeks later during a quarterly review
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Prioritized recommendations ranked by savings impact and implementation effort so your team tackles the highest-value actions first
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
              How AI Cost Analysis Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Efficyon&apos;s AI builds a deep understanding of your organization&apos;s spending
              patterns and then continuously scans for optimization opportunities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-pink-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Learn Your Baseline</h3>
              <p className="text-gray-400 leading-relaxed">
                During the first two weeks, the AI ingests your historical spend data, usage
                patterns, vendor contracts, and organizational structure. It builds a baseline
                model of what normal spending looks like for your specific company, including
                seasonal patterns, growth trends, and department-level variations.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-pink-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">Detect and Predict</h3>
              <p className="text-gray-400 leading-relaxed">
                With the baseline established, the AI continuously compares current data
                against expected patterns. It detects anomalies in real time, identifies
                emerging trends, and predicts future cost impacts. Every detection is
                cross-validated to minimize false positives and maximize actionability.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-pink-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Recommend and Track</h3>
              <p className="text-gray-400 leading-relaxed">
                Each finding is packaged into an actionable recommendation with estimated
                savings, confidence level, and implementation steps. Your team reviews and
                acts on recommendations through the dashboard. The AI tracks outcomes and
                refines its models based on results, getting smarter with every action you take.
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
              Why AI Outperforms Manual Cost Analysis
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Machine learning brings speed, scale, and precision that manual processes
              simply cannot match, especially as your SaaS stack grows.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Scan className="h-5 w-5 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Pattern Recognition</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                The AI processes millions of data points to identify spending patterns that
                span multiple tools, departments, and billing cycles. It finds systemic waste
                that no individual reviewer would notice because the pattern only emerges at
                scale.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Anomaly Detection</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Unexpected price hikes, billing errors, off-cycle charges, and vendor-side
                changes are flagged instantly. The AI knows what each vendor charge should look
                like and alerts you the moment something deviates from the expected pattern.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Predictive Insights</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Beyond detecting current waste, the AI forecasts where cost problems will
                emerge. Rising usage that will trigger a new pricing tier, growing adoption
                that will need more licenses, and vendors with a pattern of annual price
                increases are all surfaced in advance.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Smart Prioritization</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Every recommendation is scored by savings impact, implementation effort, and
                confidence. Your team always knows what to tackle first. Filter by category to
                focus on license reclamation, vendor negotiation, or tier optimization as
                priorities shift.
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
              <div className="text-4xl md:text-5xl font-bold text-pink-400 mb-2">10x</div>
              <p className="text-white font-medium mb-1">More Data Points Analyzed</p>
              <p className="text-gray-400 text-sm">
                AI processes orders of magnitude more data than any manual review, catching savings hidden in the noise
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">24/7</div>
              <p className="text-white font-medium mb-1">Continuous Monitoring</p>
              <p className="text-gray-400 text-sm">
                No waiting for quarterly reviews. The AI monitors your spend around the clock and alerts you in real time
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">90 Days</div>
              <p className="text-white font-medium mb-1">ROI Guarantee</p>
              <p className="text-gray-400 text-sm">
                Measurable return on investment guaranteed within 90 days or continued service at no extra cost
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
              AI Cost Analysis FAQ
            </h2>
            <p className="text-lg text-gray-300">
              How Efficyon&apos;s artificial intelligence transforms cost optimization
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does AI cost analysis differ from manual cost review?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Manual cost reviews are periodic, time-consuming, and limited by human capacity
                to process large datasets. AI cost analysis is continuous, processes millions of
                data points simultaneously, and detects patterns that are invisible to manual
                review. It also eliminates human bias and works around the clock without fatigue,
                catching issues the moment they appear rather than weeks later.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What types of spending anomalies can the AI detect?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon&apos;s AI detects a wide range of anomalies including unexpected price
                increases, unusual usage spikes, billing errors, off-cycle charges, sudden cost
                jumps for specific tools, spending patterns that deviate from historical norms,
                and charges from vendors that should have been cancelled. Each anomaly is flagged
                with a clear explanation and recommended action.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon&apos;s AI learn about our organization?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                The AI builds a baseline model of your organization&apos;s spending patterns, tool
                usage, and workflow habits during the first two weeks. It learns what is normal
                for your company and then flags deviations. The model continuously refines itself
                as it collects more data and observes how your team responds to recommendations,
                becoming more accurate and relevant over time.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can the AI predict future cost issues before they happen?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon&apos;s predictive analytics identify trends that point toward future
                cost increases, such as accelerating usage that will trigger the next pricing
                tier, upcoming renewals with historically increasing rates, and tool adoption
                patterns that suggest growing spend. This gives your team time to act proactively
                instead of reacting after the cost has already hit your budget.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How are AI recommendations prioritized?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Each recommendation is scored by estimated savings impact, implementation
                difficulty, and confidence level. High-savings, low-effort actions appear at the
                top of your list. You can also filter by category such as license optimization,
                vendor negotiation, or tier rightsizing to focus on the actions most relevant to
                your current priorities.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Let AI Find Your Hidden Savings
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Your SaaS data holds insights that manual review will never uncover. Connect
                your tools and let Efficyon&apos;s AI start finding the patterns, anomalies, and
                optimization opportunities that compound into real savings.
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
