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
  Bell,
  CalendarClock,
  LayoutDashboard,
  Building2,
  TrendingUp,
  Shield,
  Eye,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Subscription Tracking That Never Misses a Renewal",
  description:
    "Centralize every SaaS subscription in one dashboard. Track renewals, monitor cost trends, eliminate shadow IT, and get department-level breakdowns with Efficyon's subscription tracking.",
  alternates: {
    canonical: "/features/subscription-tracking",
  },
  openGraph: {
    title: "Subscription Tracking That Never Misses a Renewal | Efficyon",
    description:
      "Centralize every SaaS subscription in one dashboard. Track renewals, monitor cost trends, eliminate shadow IT, and get department-level breakdowns with Efficyon's subscription tracking.",
    url: "https://www.efficyon.com/features/subscription-tracking",
    type: "website",
  },
}

export default function SubscriptionTrackingPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Subscription Tracking",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/subscription-tracking",
      description:
        "Centralized SaaS subscription tracking platform with renewal alerts, cost trend analysis, shadow IT detection, and department-level spend breakdowns.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Centralized subscription dashboard, Renewal alerts, Cost trend analysis, Shadow IT detection, Department-level breakdown, Vendor management",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Efficyon discover all our subscriptions?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your accounting systems, expense management tools, and identity providers to automatically discover every SaaS subscription across your organization. This catches shadow IT purchases, corporate card subscriptions, and departmental tools that are typically invisible to central IT.",
          },
        },
        {
          "@type": "Question",
          name: "How far in advance do renewal alerts fire?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Renewal alerts are fully customizable. By default, Efficyon sends notifications at 90 days, 30 days, and 7 days before each renewal date. You can adjust these windows per subscription and route alerts to different team members based on ownership.",
          },
        },
        {
          "@type": "Question",
          name: "Can I see subscription costs broken down by department?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Efficyon provides granular department-level and team-level cost breakdowns for every subscription. You can see exactly how much each department spends, which tools they use, and how that spending trends over time.",
          },
        },
        {
          "@type": "Question",
          name: "What happens when a new subscription is detected?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "When Efficyon detects a new subscription, it automatically categorizes it, assigns it to the relevant department, checks for overlaps with existing tools, and notifies the designated administrator. This ensures no shadow IT purchase goes unnoticed.",
          },
        },
        {
          "@type": "Question",
          name: "Does subscription tracking work with annual and multi-year contracts?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Absolutely. Efficyon tracks monthly, annual, and multi-year subscriptions equally well. For annual contracts, the platform amortizes costs monthly for accurate trend reporting and sends renewal alerts well in advance of contract end dates.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <Bell className="h-4 w-4" />
              Subscription Tracking
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Subscription Tracking That Never Misses a Renewal
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Every SaaS subscription your company pays for, visible in one place. Know exactly
              what is coming up for renewal, who owns each tool, and where costs are trending
              before surprises hit your P&amp;L.
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
                <span>Automatic Discovery</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Custom Renewal Alerts</span>
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
                Lost in a Maze of Subscriptions
              </h2>
              <p className="text-gray-300 text-lg">
                As companies grow, subscriptions multiply. Different teams buy different tools,
                renewals sneak up unannounced, and finance loses track of what the company
                actually pays for. Sound familiar?
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Subscriptions are scattered across departments, credit cards, and expense accounts with no single source of truth
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Surprise auto-renewals trigger unexpected charges because nobody remembered the contract end date
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  No centralized inventory means IT cannot tell you how many SaaS tools the company actually uses today
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Shadow IT purchases bypass procurement, creating security risks and budget overruns that surface only at quarter close
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                One Dashboard to Track Them All
              </h2>
              <p className="text-gray-300 text-lg">
                Efficyon automatically discovers and catalogs every subscription, assigns
                ownership, and keeps you ahead of every renewal date with smart alerts that
                give your team time to negotiate or cancel.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Single dashboard that shows every subscription across your entire organization, updated automatically
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Customizable renewal alerts at 90, 30, and 7 days so you never get caught off guard by auto-renewals
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Cost trend analysis that reveals month-over-month and year-over-year spending changes per tool and per team
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Department-level breakdown so every manager sees their own spend and takes ownership of their tool stack
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Shadow IT detection that flags new, unrecognized subscriptions the moment they appear in your financial data
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
              How Subscription Tracking Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              From zero visibility to complete control in three steps. Efficyon does the heavy
              lifting so your team can focus on decisions, not data entry.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-blue-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Automatic Discovery</h3>
              <p className="text-gray-400 leading-relaxed">
                Connect your accounting system, identity provider, and expense management
                tools. Efficyon scans transaction records and SSO logs to build a complete
                inventory of every SaaS subscription your organization pays for, including
                those bought outside of official procurement channels.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-blue-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">Organize and Assign</h3>
              <p className="text-gray-400 leading-relaxed">
                Each subscription is automatically categorized by function, assigned to the
                relevant department, and tagged with renewal dates, contract terms, and cost
                history. Your team can add notes, set ownership, and configure alert
                preferences per subscription.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-blue-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Monitor and Optimize</h3>
              <p className="text-gray-400 leading-relaxed">
                Receive proactive renewal alerts, track cost trends, and get notified when new
                subscriptions appear. Efficyon continuously monitors your stack and surfaces
                opportunities to consolidate, downgrade, or cancel tools that are no longer
                providing value.
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
              Why Teams Love Efficyon Subscription Tracking
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Purpose-built for businesses that have outgrown spreadsheets but do not want the
              complexity of enterprise asset management tools.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Single Source of Truth</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Replace scattered spreadsheets and tribal knowledge with one authoritative
                dashboard that updates automatically. Every stakeholder sees the same data,
                eliminating discrepancies and confusion.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Never Miss a Renewal</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Configurable alerts at multiple intervals before each renewal give procurement
                and finance teams enough runway to negotiate better terms, cancel unused tools,
                or right-size before auto-renewal kicks in.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Cost Trend Analysis</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Visualize spending trends at the tool, department, and company level. Spot
                cost creep early, identify seasonal patterns, and make data-driven budget
                forecasts instead of guessing.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Department Visibility</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Give each department head a clear view of their team&apos;s SaaS stack and
                costs. Drive accountability by making spend visible to the people who control
                it and track departmental optimization over time.
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
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">100%</div>
              <p className="text-white font-medium mb-1">Subscription Visibility</p>
              <p className="text-gray-400 text-sm">
                Full discovery of every subscription including shadow IT purchases hidden across departments
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2">Zero</div>
              <p className="text-white font-medium mb-1">Surprise Renewals</p>
              <p className="text-gray-400 text-sm">
                Multi-stage alerts at 90, 30, and 7 days ensure your team is always prepared before a renewal hits
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">5 Min</div>
              <p className="text-white font-medium mb-1">Setup Time</p>
              <p className="text-gray-400 text-sm">
                Connect your accounts and Efficyon starts building your subscription inventory immediately
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
              Subscription Tracking FAQ
            </h2>
            <p className="text-lg text-gray-300">
              Everything you need to know about tracking subscriptions with Efficyon
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon discover all our subscriptions?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects to your accounting systems, expense management tools, and
                identity providers to automatically discover every SaaS subscription across your
                organization. This catches shadow IT purchases, corporate card subscriptions, and
                departmental tools that are typically invisible to central IT. The discovery
                process runs continuously so new subscriptions are flagged as soon as they appear.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How far in advance do renewal alerts fire?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Renewal alerts are fully customizable. By default, Efficyon sends notifications at
                90 days, 30 days, and 7 days before each renewal date. You can adjust these
                windows per subscription and route alerts to different team members based on
                ownership. For high-value contracts, many teams add a 180-day alert to allow time
                for vendor negotiation.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can I see subscription costs broken down by department?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon provides granular department-level and team-level cost breakdowns for
                every subscription. You can see exactly how much each department spends, which
                tools they use, and how that spending trends over time. Department heads can be
                given direct access to their own view for self-service cost management.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What happens when a new subscription is detected?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                When Efficyon detects a new subscription, it automatically categorizes it, assigns
                it to the relevant department, checks for overlaps with existing tools, and
                notifies the designated administrator. This ensures no shadow IT purchase goes
                unnoticed and gives your team the information needed to approve, consolidate,
                or address the new tool immediately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does subscription tracking work with annual and multi-year contracts?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Absolutely. Efficyon tracks monthly, annual, and multi-year subscriptions equally
                well. For annual contracts, the platform amortizes costs monthly for accurate
                trend reporting and sends renewal alerts well in advance of contract end dates so
                your procurement team can negotiate from a position of strength.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-green-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Take Control of Every Subscription
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Stop wondering what you are paying for. Efficyon builds your complete
                subscription inventory in minutes and keeps it current automatically so your
                team always has the full picture.
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
