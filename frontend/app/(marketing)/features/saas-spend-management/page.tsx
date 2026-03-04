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
  Wallet,
  PieChart,
  TrendingUp,
  Building2,
  Bell,
  BarChart3,
  Landmark,
  LineChart,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Complete SaaS Spend Management in One Platform",
  description:
    "Full SaaS spend visibility with real-time dashboards, budget controls, forecasting, and department allocation. Take control of every software dollar with Efficyon.",
  alternates: {
    canonical: "/features/saas-spend-management",
  },
  openGraph: {
    title: "Complete SaaS Spend Management in One Platform | Efficyon",
    description:
      "Full SaaS spend visibility with real-time dashboards, budget controls, forecasting, and department allocation. Take control of every software dollar with Efficyon.",
    url: "https://www.efficyon.com/features/saas-spend-management",
    type: "website",
  },
}

export default function SaaSSpendManagementPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon SaaS Spend Management",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/saas-spend-management",
      description:
        "Complete SaaS spend management platform with real-time dashboards, budget controls, forecasting, department allocation, and vendor management in one unified view.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Real-time spend dashboard, Budget alerts, Spend forecasting, Department allocation, Vendor management, Trend analysis",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is SaaS spend management?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SaaS spend management is the practice of tracking, controlling, and optimizing all software subscription costs across an organization. It includes subscription inventory, budget allocation, cost monitoring, vendor management, and forecasting. Efficyon automates the entire process with AI-powered analysis and real-time dashboards.",
          },
        },
        {
          "@type": "Question",
          name: "How does Efficyon track SaaS spend in real time?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your accounting systems, corporate cards, and expense management tools to pull transaction data as it happens. The real-time dashboard aggregates this data by vendor, department, category, and time period, giving finance teams an always-current view of SaaS spending across the organization.",
          },
        },
        {
          "@type": "Question",
          name: "Can I set budget limits for each department?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Efficyon lets you set budget thresholds at the department, team, or category level. When spending approaches or exceeds these thresholds, configurable alerts notify the relevant stakeholders. This prevents budget overruns before they happen rather than catching them after the fact.",
          },
        },
        {
          "@type": "Question",
          name: "How accurate is Efficyon's spend forecasting?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon's forecasting model analyzes historical spending patterns, upcoming renewals, contracted price increases, and headcount growth trends to project future SaaS costs. Forecast accuracy improves over time as the AI collects more data. Most customers report forecasts within 5-10% of actual spend after the first quarter.",
          },
        },
        {
          "@type": "Question",
          name: "Does Efficyon support vendor management and negotiation?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon provides vendor intelligence including contract terms, renewal dates, pricing benchmarks, and usage data that strengthens your negotiating position. While Efficyon does not negotiate on your behalf, the data it surfaces gives procurement teams the leverage needed to secure better terms at every renewal.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8">
              <Wallet className="h-4 w-4" />
              SaaS Spend Management
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Complete SaaS Spend Management in One Platform
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Every software dollar, tracked, allocated, and optimized. Efficyon gives your
              finance team real-time visibility into SaaS spending across every department,
              with budget controls and forecasting that eliminate end-of-quarter surprises.
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
                <span>Real-Time Dashboards</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Budget Controls</span>
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
                Flying Blind on Software Spending
              </h2>
              <p className="text-gray-300 text-lg">
                SaaS is now the second or third largest operating expense for most companies,
                yet finance teams have less visibility into software costs than almost any other
                budget category. That gap grows wider every quarter.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Fragmented spend data scattered across accounting systems, corporate cards, expense reports, and departmental budgets with no unified view
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  No budget controls or spending thresholds, allowing departments to purchase new tools without oversight until the invoice arrives
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Finance team blind spots where SaaS costs appear only as generic line items without context about what tool, who uses it, or whether it delivers value
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Quarterly surprise costs from forgotten renewals, price increases, and unplanned tool purchases that blow through budget projections
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Total Spend Visibility and Control
              </h2>
              <p className="text-gray-300 text-lg">
                Efficyon consolidates every SaaS payment into a single real-time dashboard with
                drill-down capabilities by vendor, department, category, and time period. Set
                budgets, get alerts, and forecast with confidence.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Real-time spend dashboard that aggregates data from every financial source, updated continuously as transactions flow in
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Budget alerts at the department, team, or category level that notify stakeholders when spending approaches or exceeds thresholds
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Spend forecasting that projects future costs based on historical patterns, upcoming renewals, and headcount trends
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Department allocation that assigns every dollar of SaaS spend to the team that uses it, driving accountability and informed budgeting
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Vendor management with contract tracking, pricing benchmarks, and renewal intelligence to strengthen negotiation leverage
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
              How SaaS Spend Management Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              From fragmented data to unified control in three steps. Efficyon gives your
              finance team the tools to manage SaaS spending proactively, not reactively.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-orange-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Aggregate All Spend Data</h3>
              <p className="text-gray-400 leading-relaxed">
                Efficyon connects to your accounting system, corporate card provider, expense
                management platform, and procurement tools. Every SaaS-related transaction is
                identified, categorized by vendor and department, and consolidated into a
                single real-time view. No more reconciling data from five different systems.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-orange-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">Set Controls and Budgets</h3>
              <p className="text-gray-400 leading-relaxed">
                Define spending thresholds by department, tool category, or individual vendor.
                Configure alert rules that notify the right people when budgets are at risk.
                Set up approval workflows for new tool purchases so every dollar of SaaS spend
                is intentional, not accidental.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-orange-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Forecast and Optimize</h3>
              <p className="text-gray-400 leading-relaxed">
                Use AI-powered forecasting to predict next quarter&apos;s SaaS costs with
                confidence. Track optimization progress against targets. Surface vendor
                negotiation opportunities as renewals approach. Turn SaaS spending from a cost
                center headache into a strategic advantage.
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
              Benefits of Centralized Spend Management
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Give your finance team the visibility and control they need to make SaaS spending
              a strategic asset instead of a runaway cost.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Real-Time Dashboard</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                A single, always-current view of your complete SaaS spending. Drill down by
                vendor, department, category, or time period. Export reports for board
                presentations or budget reviews in seconds.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Budget Alerts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Configurable threshold alerts at every level of your organization. Know the
                moment a department approaches its budget limit so you can course-correct
                before overruns become quarter-end emergencies.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <LineChart className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Spend Forecasting</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-driven forecasting projects future costs based on trends, renewals, and
                growth. Plan next quarter&apos;s budget with confidence instead of guesswork.
                Forecasts refine automatically as new data arrives.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Vendor Intelligence</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Contract tracking, pricing benchmarks, and renewal timelines for every vendor.
                Enter negotiations armed with data about market rates and your actual usage so
                you can secure the best terms every time.
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
              <div className="text-4xl md:text-5xl font-bold text-orange-400 mb-2">25%</div>
              <p className="text-white font-medium mb-1">Average Spend Reduction</p>
              <p className="text-gray-400 text-sm">
                Companies using Efficyon for spend management reduce total SaaS costs by an average of 25%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">95%</div>
              <p className="text-white font-medium mb-1">Forecast Accuracy</p>
              <p className="text-gray-400 text-sm">
                AI-powered spend forecasting achieves 90-95% accuracy after the first quarter of data collection
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
              SaaS Spend Management FAQ
            </h2>
            <p className="text-lg text-gray-300">
              Everything you need to know about managing SaaS spending with Efficyon
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What is SaaS spend management?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                SaaS spend management is the practice of tracking, controlling, and optimizing all
                software subscription costs across an organization. It includes subscription
                inventory, budget allocation, cost monitoring, vendor management, and
                forecasting. Efficyon automates the entire process with AI-powered analysis and
                real-time dashboards, replacing the manual spreadsheets and fragmented data that
                most finance teams rely on today.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon track SaaS spend in real time?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects to your accounting systems, corporate cards, and expense
                management tools to pull transaction data as it happens. The real-time dashboard
                aggregates this data by vendor, department, category, and time period, giving
                finance teams an always-current view of SaaS spending across the organization.
                Data refreshes continuously, not on a monthly or quarterly cadence.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can I set budget limits for each department?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon lets you set budget thresholds at the department, team, or category
                level. When spending approaches or exceeds these thresholds, configurable alerts
                notify the relevant stakeholders. This prevents budget overruns before they
                happen rather than catching them after the fact. You can also set escalation
                rules for different threshold levels.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How accurate is Efficyon&apos;s spend forecasting?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon&apos;s forecasting model analyzes historical spending patterns, upcoming
                renewals, contracted price increases, and headcount growth trends to project
                future SaaS costs. Forecast accuracy improves over time as the AI collects more
                data. Most customers report forecasts within 5-10% of actual spend after the
                first quarter of use.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon support vendor management and negotiation?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon provides vendor intelligence including contract terms, renewal dates,
                pricing benchmarks, and usage data that strengthens your negotiating position.
                While Efficyon does not negotiate on your behalf, the data it surfaces gives
                procurement teams the leverage needed to secure better terms at every renewal.
                Many customers report 10-20% savings on renewals just from the pricing benchmark
                data alone.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Take Control of Your SaaS Budget
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Replace fragmented data and guesswork with a unified spend management platform.
                See where every dollar goes, set budgets that stick, and forecast with
                confidence. Setup takes five minutes.
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
