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
  BookOpen,
  Receipt,
  FolderOpen,
  TrendingUp,
  Users,
  Shield,
  Lock,
  Eye,
  Zap,
  BarChart3,
  Clock,
  Bell,
  FileCheck,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "QuickBooks Integration - Smart SaaS Spend Tracking",
    description:
      "Connect QuickBooks to Efficyon for automated SaaS expense categorization, budget tracking, and AI-powered cost optimization. Coming soon.",
    alternates: {
      canonical: "/integrations/quickbooks",
    },
    openGraph: {
      title: "QuickBooks + Efficyon: Smart SaaS Spend Tracking",
      description:
        "Connect QuickBooks to Efficyon for automated SaaS expense categorization, budget tracking, and AI-powered cost optimization. Coming soon.",
      url: "https://www.efficyon.com/integrations/quickbooks",
    },
    keywords: [
      "quickbooks saas cost tracking",
      "quickbooks integration cost management",
      "quickbooks expense categorization",
      "quickbooks saas optimization",
      "quickbooks software spend analysis",
    ],
  }
}

export default function QuickBooksIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon QuickBooks Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect QuickBooks Online to Efficyon for automated SaaS expense categorization, budget tracking, and AI-powered cost optimization.",
    url: "https://www.efficyon.com/integrations/quickbooks",
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
        name: "When will the QuickBooks integration be available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The QuickBooks integration is currently in development and expected to launch in Q2 2026. Join our waitlist to be notified as soon as it becomes available and get priority early access.",
        },
      },
      {
        "@type": "Question",
        name: "Which QuickBooks versions will be supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "At launch, we will support QuickBooks Online (all plans: Simple Start, Essentials, Plus, and Advanced). QuickBooks Desktop support is planned for a later release. The integration uses the QuickBooks Online API for secure, real-time data sync.",
        },
      },
      {
        "@type": "Question",
        name: "How will the QuickBooks integration handle expense categorization?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon's AI will analyze your QuickBooks expenses and automatically identify which transactions are SaaS subscriptions. It categorizes them by vendor, department, and type, even when descriptions are inconsistent. You can review and adjust categories, and the AI learns from your corrections over time.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use the QuickBooks integration alongside other Efficyon integrations?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Efficyon is designed to work with multiple data sources simultaneously. Connecting QuickBooks alongside Stripe or other integrations gives you the most complete view of your SaaS spending, combining accounting data with real-time subscription analytics.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
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
              <div className="h-16 w-16 rounded-xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-400" />
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
              QuickBooks + Efficyon: Smart SaaS Spend Tracking
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl">
              Connect QuickBooks to automatically categorize and analyze your SaaS
              subscriptions alongside your financial data. Get AI-powered insights into
              software spend, budget tracking, and department-level cost allocation -- all
              from the accounting platform you already use.
            </p>

            {/* Waitlist CTA */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-2">
                Join the Waitlist
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Be the first to know when the QuickBooks integration launches. Get priority
                early access.
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
                QuickBooks Online is one of the most widely used accounting platforms in the
                world, trusted by millions of small and mid-sized businesses. The Efficyon
                integration will connect directly to your QuickBooks Online account to import
                expenses, bills, and vendor payments, then use AI to identify and analyze your
                SaaS subscriptions automatically.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                For many growing companies, SaaS expenses are scattered across different chart
                of accounts categories in QuickBooks. Some are booked under &quot;Software
                Subscriptions,&quot; others under &quot;Office Expenses&quot; or &quot;Professional
                Services.&quot; This makes it nearly impossible to get a clear picture of total
                software spend. Efficyon solves this by using AI to identify SaaS transactions
                regardless of how they are categorized in QuickBooks.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                The integration will also support department-level cost allocation, allowing
                you to see exactly which teams are driving software costs. Combined with
                Efficyon&apos;s usage analysis, you will be able to compare what each
                department spends on SaaS tools against how much those tools are actually used
                -- revealing optimization opportunities that are invisible from accounting data
                alone.
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
              Features that will be available when the QuickBooks integration launches.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Receipt,
                  title: "Auto-Import Expenses",
                  description:
                    "Automatically import bills, expenses, and vendor payments from QuickBooks Online. New transactions sync on a recurring schedule without any manual intervention required.",
                },
                {
                  icon: FolderOpen,
                  title: "SaaS Categorization",
                  description:
                    "AI identifies SaaS subscriptions across all your QuickBooks expense categories. Even if software costs are booked inconsistently, Efficyon will find and categorize them correctly.",
                },
                {
                  icon: BarChart3,
                  title: "Budget Tracking",
                  description:
                    "Set SaaS spending budgets by department or category and track actual expenses in real time. Get proactive alerts when teams approach or exceed their software budget limits.",
                },
                {
                  icon: Users,
                  title: "Department Cost Allocation",
                  description:
                    "Break down SaaS costs by department, team, or cost center using your QuickBooks class and location tracking. See which parts of your organization drive the most software spend.",
                },
                {
                  icon: FileCheck,
                  title: "Tax-Ready Reporting",
                  description:
                    "Generate clean, categorized reports of all your SaaS expenses that are ready for tax preparation. Exportable formats that align with standard accounting practices and QuickBooks categories.",
                },
              ].map((capability) => (
                <div
                  key={capability.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
                    <capability.icon className="h-5 w-5 text-blue-400" />
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
              Connecting QuickBooks to Efficyon will be simple and fast.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Connect QuickBooks Online",
                  description:
                    "From the Efficyon integrations page, select QuickBooks and authorize access through Intuit's secure OAuth flow. The connection uses QuickBooks' official API with read-only permissions.",
                },
                {
                  step: "02",
                  title: "Automatic Expense Import",
                  description:
                    "Your QuickBooks expenses, bills, and vendor payments begin importing immediately. Historical data from the past 12-24 months is synced during the initial setup for comprehensive analysis.",
                },
                {
                  step: "03",
                  title: "AI Categorizes SaaS Spend",
                  description:
                    "Efficyon's AI engine scans your imported data and identifies SaaS subscriptions, categorizes them by vendor and department, and generates your first optimization report with actionable recommendations.",
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
              The QuickBooks integration is built for businesses that rely on QuickBooks
              Online for their accounting and want automated SaaS cost visibility.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Growing Companies with Expanding SaaS Stacks",
                  description:
                    "As your team grows, so does your software stack. Companies adding new tools every quarter need automated tracking to prevent cost sprawl. The QuickBooks integration ensures every new subscription is captured and analyzed.",
                },
                {
                  title: "Finance Teams Managing Multi-Category Software Costs",
                  description:
                    "When SaaS expenses are spread across multiple QuickBooks categories, getting a unified view requires manual work. Efficyon's AI consolidates software costs regardless of their chart of accounts placement.",
                },
                {
                  title: "Controllers Needing Department-Level Visibility",
                  description:
                    "Financial controllers who need to allocate software costs to specific departments or cost centers benefit from Efficyon's automated department-level SaaS cost breakdowns, powered by QuickBooks class tracking.",
                },
                {
                  title: "Accountants Preparing Year-End Reports",
                  description:
                    "CPAs and bookkeepers preparing annual financial statements can generate clean, categorized SaaS expense reports that are ready for tax preparation, saving hours of manual categorization work.",
                },
              ].map((useCase) => (
                <div
                  key={useCase.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" />
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
              The same security standards we apply to all our integrations will protect your
              QuickBooks data.
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
                    Expense transactions and bills
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Vendor and supplier records
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Chart of accounts categories
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Class and location tracking data
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
                    Intuit OAuth 2.0 authorization
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
                    SOC 2 compliant data handling
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Read-Only Access</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Efficyon will use read-only access to your QuickBooks Online account. We
                  will never create, modify, or delete transactions, invoices, or any other
                  data in your accounting system. Full disconnect at any time.
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
              Common questions about the upcoming QuickBooks integration.
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  When will the QuickBooks integration be available?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  The QuickBooks integration is currently in development and expected to
                  launch in Q2 2026. Join our waitlist to be notified as soon as it becomes
                  available and get priority early access.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Which QuickBooks versions will be supported?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  At launch, we will support QuickBooks Online (all plans: Simple Start,
                  Essentials, Plus, and Advanced). QuickBooks Desktop support is planned for
                  a later release. The integration uses the QuickBooks Online API for secure,
                  real-time data sync.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  How will the QuickBooks integration handle expense categorization?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Efficyon&apos;s AI will analyze your QuickBooks expenses and automatically
                  identify which transactions are SaaS subscriptions. It categorizes them by
                  vendor, department, and type, even when descriptions are inconsistent. You
                  can review and adjust categories, and the AI learns from your corrections
                  over time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Can I use the QuickBooks integration alongside other Efficyon integrations?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Absolutely. Efficyon is designed to work with multiple data sources
                  simultaneously. Connecting QuickBooks alongside Stripe or other integrations
                  gives you the most complete view of your SaaS spending, combining accounting
                  data with real-time subscription analytics.
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
              Get Notified When QuickBooks Launches
            </h2>
            <p className="text-lg text-gray-300">
              The QuickBooks integration is coming soon. Join the waitlist for priority
              access, or start with our live integrations today -- Fortnox and Stripe are
              ready to connect right now.
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
              <span>90-day ROI guarantee</span>
              <span>•</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
