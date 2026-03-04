import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  BarChart3,
  Receipt,
  Search,
  TrendingUp,
  Globe,
  Shield,
  Lock,
  Eye,
  Zap,
  FolderOpen,
  Clock,
  Bell,
  Briefcase,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "Xero Integration - Automated Software Spend Management",
    description:
      "Connect Xero to Efficyon for automated software spend management with AI-powered analysis, multi-currency support, and project-based cost tracking. Coming soon.",
    alternates: {
      canonical: "/integrations/xero",
    },
    openGraph: {
      title: "Xero + Efficyon: Automated Software Spend Management",
      description:
        "Connect Xero to Efficyon for automated software spend management with AI-powered analysis, multi-currency support, and project-based cost tracking. Coming soon.",
      url: "https://www.efficyon.com/integrations/xero",
    },
    keywords: [
      "xero software spend management",
      "xero integration cost analysis",
      "xero saas tracking",
      "xero expense optimization",
      "xero multi-currency saas costs",
    ],
  }
}

export default function XeroIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon Xero Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect Xero accounting to Efficyon for automated software spend management with AI-powered analysis, multi-currency support, and project-based cost tracking.",
    url: "https://www.efficyon.com/integrations/xero",
    offers: {
      "@type": "Offer",
      price: "39",
      priceCurrency: "USD",
      description: "Starting from $39/month with the Startup plan",
      availability: "https://schema.org/PreOrder",
    },
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When will the Xero integration be available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Xero integration is currently in development and targeted for launch in Q2 2026. Join our waitlist to get notified when it launches and receive priority early access to the integration.",
        },
      },
      {
        "@type": "Question",
        name: "Will the Xero integration support multi-currency transactions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Multi-currency support is a core feature of the Xero integration. Efficyon will automatically handle currency conversions and show your SaaS costs in a normalized currency for accurate comparison and trend analysis, regardless of which currencies your vendors bill in.",
        },
      },
      {
        "@type": "Question",
        name: "How does the Xero integration handle tracking categories?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon will map to your existing Xero tracking categories to provide department and project-level SaaS cost breakdowns. You do not need to change your Xero setup. If you use tracking categories for departments, regions, or projects, those same breakdowns will appear in your Efficyon dashboard.",
        },
      },
      {
        "@type": "Question",
        name: "Can I connect Xero and other integrations at the same time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon supports multiple simultaneous integrations. Connecting Xero alongside Stripe gives you both accounting-level expense data and real-time subscription analytics, providing the most complete picture of your SaaS costs available.",
        },
      },
    ],
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <Link
            href="/integrations"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Integrations
          </Link>

          <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-16 w-16 rounded-xl bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="text-2xl text-gray-500 font-light">+</div>
              <div className="h-16 w-16 rounded-xl bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                <Zap className="h-8 w-8 text-cyan-400" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium ml-2">
                <Clock className="h-3 w-3" />
                Coming Soon
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              Xero + Efficyon: Automated Software Spend Management
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl">
              Connect Xero accounting to get complete visibility into your SaaS spending
              with AI-powered analysis. Featuring multi-currency support, project-based cost
              tracking, and intelligent expense detection -- built for globally-minded
              businesses.
            </p>

            {/* Waitlist CTA */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-2">
                Join the Waitlist
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Be the first to know when the Xero integration launches. Get priority early
                access and shape the features we build.
              </p>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="bg-black/50 border-white/20 text-white placeholder:text-gray-500 flex-1"
                />
                <Button className="bg-white text-black hover:bg-gray-100 shrink-0">
                  <Bell className="mr-2 h-4 w-4" />
                  Notify Me
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Overview */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              What This Integration Will Do
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Xero is one of the world&apos;s leading cloud accounting platforms, used by
                over 3.9 million subscribers across 180 countries. Known for its strong
                multi-currency capabilities and clean API, Xero is the accounting platform of
                choice for internationally-operating small and mid-sized businesses. The
                Efficyon integration will bring Xero&apos;s rich financial data into an
                AI-powered analysis engine purpose-built for SaaS cost optimization.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Many Xero users operate across multiple currencies, paying for SaaS tools in
                USD, EUR, GBP, and other currencies depending on where the vendor is based.
                This makes tracking total software spend difficult because costs fluctuate with
                exchange rates. Efficyon will normalize all your SaaS costs into a single
                reporting currency while preserving the original transaction data, giving you
                accurate trend analysis regardless of currency mix.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                The integration will also leverage Xero&apos;s tracking categories to provide
                project-level and department-level SaaS cost breakdowns. If your organization
                tracks expenses by project, region, or business unit in Xero, those same
                dimensions will appear in your Efficyon dashboard -- no additional
                configuration required. This gives you granular visibility into which projects
                and teams are driving software costs, and where optimization opportunities exist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Planned Capabilities
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              Features designed for Xero users managing international SaaS spending.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Receipt,
                  title: "Expense Auto-Import",
                  description:
                    "Automatically import bills, bank transactions, and expense claims from Xero. New transactions sync on a recurring schedule, keeping your SaaS cost data always current.",
                },
                {
                  icon: Search,
                  title: "SaaS Detection",
                  description:
                    "AI scans your Xero transactions and intelligently identifies which expenses are SaaS subscriptions. It recognizes vendor names, recurring patterns, and billing signatures even when descriptions vary.",
                },
                {
                  icon: TrendingUp,
                  title: "Cost Trend Analysis",
                  description:
                    "Visualize how your software spending evolves over time with currency-normalized charts. Spot price increases, seasonal patterns, and cost creep across your entire SaaS portfolio.",
                },
                {
                  icon: Globe,
                  title: "Multi-Currency Support",
                  description:
                    "Native support for multi-currency transactions. Efficyon normalizes all SaaS costs to your base currency while preserving original amounts, giving you accurate comparisons across vendors worldwide.",
                },
                {
                  icon: Briefcase,
                  title: "Project-Based Cost Tracking",
                  description:
                    "Leverage Xero tracking categories to break down SaaS costs by project, department, or business unit. See exactly which initiatives drive the most software spend and optimize accordingly.",
                },
              ].map((capability) => (
                <div
                  key={capability.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                    <capability.icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{capability.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How to Connect */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Will Work
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              Connecting Xero to Efficyon will follow our standard, secure integration
              process.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Connect Your Xero Account",
                  description:
                    "Navigate to the Efficyon integrations page and select Xero. You will be redirected to Xero's official OAuth flow to authorize read-only access. The connection takes seconds to establish and requires no API keys or technical setup.",
                },
                {
                  step: "02",
                  title: "Historical Data Imports",
                  description:
                    "Efficyon immediately begins syncing your historical Xero data -- bills, expenses, bank transactions, and tracking categories. Up to 24 months of history is imported during the initial setup for comprehensive trend analysis.",
                },
                {
                  step: "03",
                  title: "AI Identifies Optimization Opportunities",
                  description:
                    "Once your data is synced, Efficyon's AI engine analyzes your transactions, identifies SaaS subscriptions, normalizes currencies, and generates your first optimization report with specific savings recommendations.",
                },
              ].map((step) => (
                <div key={step.step} className="relative space-y-4">
                  <div className="text-5xl font-bold text-white/5">{step.step}</div>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Who This Integration Is For
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              The Xero integration is built for internationally-minded businesses that need
              sophisticated SaaS cost management.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "International Businesses with Multi-Currency SaaS Costs",
                  description:
                    "Companies operating across borders pay for SaaS tools in multiple currencies. The Xero integration normalizes these costs so you can compare vendors fairly, track trends accurately, and budget in your base currency without manual conversion.",
                },
                {
                  title: "Agencies and Consultancies Tracking Project Costs",
                  description:
                    "Professional services firms that allocate SaaS costs to client projects can leverage Xero tracking categories for automatic project-level cost breakdowns. See which client engagements drive the most software spend.",
                },
                {
                  title: "Finance Teams in Growing UK and ANZ Companies",
                  description:
                    "Xero is particularly popular in the UK, Australia, and New Zealand. Finance teams in these markets get a native integration that understands their accounting workflows, tax requirements, and reporting expectations.",
                },
                {
                  title: "Operations Leaders Managing Remote Teams",
                  description:
                    "Distributed teams often accumulate SaaS subscriptions across different regions and currencies. The Xero integration gives operations leaders a consolidated view of all software costs regardless of where teams are located.",
                },
              ].map((useCase) => (
                <div
                  key={useCase.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
                    <h3 className="text-lg font-semibold text-white">{useCase.title}</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data & Security */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Data Access & Security
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              Your Xero data will be protected with the same enterprise-grade security we
              apply to all integrations.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">What We Will Access</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Bills and expense transactions
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Bank transaction records
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Contact and supplier data
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Tracking categories and currencies
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-green-900/30 border border-green-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Security Measures</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Xero OAuth 2.0 authorization
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    AES-256 encryption at rest
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    TLS 1.3 encryption in transit
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    GDPR and SOC 2 compliant
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Read-Only Access</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Efficyon will connect to Xero with read-only permissions. We never create,
                  modify, or delete any data in your Xero account. Your accounting records
                  remain completely untouched, and you can revoke access at any time from
                  both Efficyon and your Xero settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-300 text-center mb-12">
              Common questions about the upcoming Xero integration.
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  When will the Xero integration be available?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  The Xero integration is currently in development and targeted for launch in
                  Q2 2026. Join our waitlist to get notified when it launches and receive
                  priority early access to the integration.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Will the Xero integration support multi-currency transactions?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes. Multi-currency support is a core feature of the Xero integration.
                  Efficyon will automatically handle currency conversions and show your SaaS
                  costs in a normalized currency for accurate comparison and trend analysis,
                  regardless of which currencies your vendors bill in.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  How does the Xero integration handle tracking categories?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Efficyon will map to your existing Xero tracking categories to provide
                  department and project-level SaaS cost breakdowns. You do not need to change
                  your Xero setup. If you use tracking categories for departments, regions, or
                  projects, those same breakdowns will appear in your Efficyon dashboard.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Can I connect Xero and other integrations at the same time?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes. Efficyon supports multiple simultaneous integrations. Connecting Xero
                  alongside Stripe gives you both accounting-level expense data and real-time
                  subscription analytics, providing the most complete picture of your SaaS
                  costs available.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Get Notified When Xero Launches
            </h2>
            <p className="text-lg text-gray-300">
              The Xero integration is coming soon. Join the waitlist for priority access, or
              explore our live integrations today -- Fortnox and Stripe are ready to connect
              right now.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/register">
                  Start with Live Integrations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/integrations">View All Integrations</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span>No credit card required</span>
              <span>•</span>
              <span>Multi-currency ready</span>
              <span>•</span>
              <span>90-day ROI guarantee</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
