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
  UserX,
  Activity,
  UserMinus,
  Gauge,
  AlertCircle,
  BarChart3,
  Scale,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Find Every Unused License Draining Your Budget",
  description:
    "Detect unused and underutilized software licenses automatically. Efficyon analyzes real usage data to identify idle seats, departed employee licenses, and overprovisioned tiers.",
  alternates: {
    canonical: "/features/unused-license-detection",
  },
  openGraph: {
    title: "Find Every Unused License Draining Your Budget | Efficyon",
    description:
      "Detect unused and underutilized software licenses automatically. Efficyon analyzes real usage data to identify idle seats, departed employee licenses, and overprovisioned tiers.",
    url: "https://www.efficyon.com/features/unused-license-detection",
    type: "website",
  },
}

export default function UnusedLicenseDetectionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Unused License Detection",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/unused-license-detection",
      description:
        "Unused software license detection tool that analyzes real usage data to identify idle seats, departed employee licenses, and overprovisioned subscription tiers.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Usage heatmaps, Automatic idle license flagging, Rightsizing recommendations, Offboarding alerts, Activity-based analysis",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Efficyon detect unused software licenses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your SaaS tools via API and analyzes actual login frequency, feature usage, and activity levels for every licensed user. Licenses with no activity over a configurable threshold (default 30 days) are flagged as unused. Low-activity licenses are flagged as underutilized with rightsizing recommendations.",
          },
        },
        {
          "@type": "Question",
          name: "Can Efficyon detect licenses for employees who have left the company?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Efficyon integrates with your HR system or identity provider to cross-reference active employee records against active licenses. When an employee departs, any licenses still assigned to them are immediately flagged for deprovisioning, preventing ongoing charges for people who no longer work at your company.",
          },
        },
        {
          "@type": "Question",
          name: "What is the difference between unused and underutilized licenses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "An unused license has zero or negligible activity over the measurement period. An underutilized license shows some activity but not enough to justify the current tier. For example, an employee with a premium Zoom license who only joins meetings (never hosts) could be downgraded to a basic plan.",
          },
        },
        {
          "@type": "Question",
          name: "How much can we save by reclaiming unused licenses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The average company has 20-30% of its SaaS licenses either unused or significantly underutilized. For a company spending $100,000 per year on SaaS, that represents $20,000-$30,000 in recoverable waste. Efficyon customers typically see savings within the first billing cycle after reclaiming identified licenses.",
          },
        },
        {
          "@type": "Question",
          name: "Does unused license detection work for all SaaS tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon supports direct API integrations with 50+ popular SaaS tools for detailed usage analysis. For tools without direct integration, Efficyon uses SSO login data, browser activity signals, and financial data to estimate usage levels. The platform continuously expands its integration library.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-8">
              <UserX className="h-4 w-4" />
              Unused License Detection
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Find Every Unused License Draining Your Budget
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              You are paying for software licenses that nobody uses. Departed employees still
              have active seats. Teams sit on premium tiers they barely touch. Efficyon analyzes
              real usage data to reclaim every wasted license dollar.
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
                <span>Usage-Based Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Automatic Flagging</span>
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
                Licenses That Cost You Money While Sitting Idle
              </h2>
              <p className="text-gray-300 text-lg">
                Studies consistently show that 20-30% of SaaS licenses in the average company
                go unused. That means for every five seats you pay for, at least one is
                generating zero value. The waste compounds silently every billing cycle.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Paying full price for licenses that nobody has logged into in months, either because users switched to another tool or simply do not need it
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Departed employees still have active, paid licenses because offboarding checklists missed SaaS deprovisioning or the process is incomplete
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Overprovisioned subscription tiers where users are on premium plans but only use basic features, paying three to five times more than necessary
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  No usage data available to finance teams so there is no way to distinguish productive licenses from idle ones during budget reviews
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Usage Intelligence That Stops the Waste
              </h2>
              <p className="text-gray-300 text-lg">
                Efficyon connects directly to your SaaS tools to measure real usage at the
                individual license level. Every idle seat is flagged, every overprovisioned
                tier is identified, and every departed employee license is caught.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Usage heatmaps that show exactly who is using each tool, how often, and which features they actually touch
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Automatic flagging of licenses with zero or negligible activity over configurable time windows
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Rightsizing recommendations that suggest the optimal plan tier for each user based on their actual feature consumption
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Offboarding alerts that cross-reference your HR system to catch licenses assigned to employees who have left the company
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Continuous monitoring that catches new idle licenses as they appear, not just during periodic reviews
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
              How Unused License Detection Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Efficyon turns raw usage data into clear, actionable savings. Here is exactly how
              the process works from connection to savings.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-green-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Connect and Collect</h3>
              <p className="text-gray-400 leading-relaxed">
                Link your SaaS tools, identity provider, and HR system through secure API
                connections. Efficyon begins collecting login frequency, feature usage, session
                duration, and activity metrics for every licensed user across your organization.
                Most integrations take under a minute to set up.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-green-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">Analyze Usage Patterns</h3>
              <p className="text-gray-400 leading-relaxed">
                Our AI builds a usage profile for every user and every license. It distinguishes
                between active power users, occasional users who might benefit from a lower
                tier, users who have not logged in at all, and former employees whose accounts
                are still active. Each license gets a utilization score.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-green-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Reclaim and Rightsize</h3>
              <p className="text-gray-400 leading-relaxed">
                Receive a prioritized list of actions: licenses to revoke, tiers to downgrade,
                and accounts to deprovision. Each recommendation includes the specific dollar
                savings and a confidence score. Track progress as your team implements changes
                and watch recovered savings accumulate on your dashboard.
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
              Benefits of Unused License Detection
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Stop paying for software that generates no value. Efficyon makes license
              optimization automatic, continuous, and data-driven.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Usage Heatmaps</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Visual heatmaps show usage intensity across every tool and every user. Instantly
                see where licenses are thriving and where they are sitting dormant. Make
                data-backed decisions about what to keep.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Automatic Flagging</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Licenses that fall below your activity threshold are flagged automatically with
                no manual review required. Set custom thresholds per tool since what counts as
                active for Slack differs from Figma.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Scale className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Rightsizing Advice</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Not every license needs to be revoked. For underutilized seats, Efficyon
                recommends the optimal tier based on actual feature consumption, saving money
                while keeping users productive.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Offboarding Alerts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                HR integration ensures that the moment an employee leaves, every associated
                license is flagged for deprovisioning. No more paying for seats assigned to
                people who no longer work at your company.
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
              <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">20-30%</div>
              <p className="text-white font-medium mb-1">Licenses Typically Unused</p>
              <p className="text-gray-400 text-sm">
                One in four to one in three SaaS licenses in the average company generates zero value
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">1 Cycle</div>
              <p className="text-white font-medium mb-1">Savings Start Date</p>
              <p className="text-gray-400 text-sm">
                Reclaim identified licenses and see savings reflected in your very next billing cycle
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2">50+</div>
              <p className="text-white font-medium mb-1">Tool Integrations</p>
              <p className="text-gray-400 text-sm">
                Direct API integrations with the most popular business SaaS tools for precise usage analysis
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
              Unused License Detection FAQ
            </h2>
            <p className="text-lg text-gray-300">
              Common questions about finding and reclaiming unused software licenses
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon detect unused software licenses?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects to your SaaS tools via API and analyzes actual login frequency,
                feature usage, and activity levels for every licensed user. Licenses with no
                activity over a configurable threshold (default 30 days) are flagged as unused.
                Low-activity licenses are flagged as underutilized with rightsizing
                recommendations so you can downgrade rather than revoke.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon detect licenses for employees who have left the company?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon integrates with your HR system or identity provider to
                cross-reference active employee records against active licenses. When an
                employee departs, any licenses still assigned to them are immediately flagged
                for deprovisioning, preventing ongoing charges for people who no longer work at
                your company. This alone often recovers thousands of dollars annually.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What is the difference between unused and underutilized licenses?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                An unused license has zero or negligible activity over the measurement period. An
                underutilized license shows some activity but not enough to justify the current
                tier. For example, an employee with a premium Zoom license who only joins
                meetings but never hosts could be downgraded to a basic plan. Efficyon identifies
                both and provides specific recommendations for each.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How much can we save by reclaiming unused licenses?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                The average company has 20-30% of its SaaS licenses either unused or significantly
                underutilized. For a company spending $100,000 per year on SaaS, that represents
                $20,000-$30,000 in recoverable waste. Efficyon customers typically see savings
                within the first billing cycle after reclaiming identified licenses.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does unused license detection work for all SaaS tools?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon supports direct API integrations with 50+ popular SaaS tools for detailed
                usage analysis. For tools without direct integration, Efficyon uses SSO login
                data, browser activity signals, and financial data to estimate usage levels. The
                platform continuously expands its integration library based on customer needs.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Stop Paying for Licenses Nobody Uses
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Every idle license is money you could invest elsewhere. Connect your tools and
                Efficyon will show you exactly which licenses to reclaim, downgrade, or
                deprovision, starting with the highest-value opportunities.
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
