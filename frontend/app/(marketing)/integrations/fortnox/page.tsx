import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
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
  FileText,
  Receipt,
  Search,
  TrendingUp,
  Users,
  Shield,
  Lock,
  Eye,
  Zap,
  BarChart3,
  AlertTriangle,
  FolderOpen,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "Fortnox Integration - Automated SaaS Cost Analysis",
    description:
      "Connect Fortnox to Efficyon for automated invoice import, SaaS expense categorization, and AI-powered cost optimization. Ideal for Swedish SMBs and finance teams.",
    alternates: {
      canonical: "/integrations/fortnox",
    },
    openGraph: {
      title: "Fortnox + Efficyon: Automated SaaS Cost Analysis",
      description:
        "Connect Fortnox to Efficyon for automated invoice import, SaaS expense categorization, and AI-powered cost optimization. Ideal for Swedish SMBs and finance teams.",
      url: "https://www.efficyon.com/integrations/fortnox",
    },
    keywords: [
      "fortnox cost analysis",
      "fortnox integration saas management",
      "fortnox invoice import",
      "fortnox saas expenses",
      "swedish accounting saas optimization",
    ],
  }
}

export default function FortnoxIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon Fortnox Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect Fortnox accounting to Efficyon for automated SaaS cost analysis, invoice import, and AI-powered expense optimization.",
    url: "https://www.efficyon.com/integrations/fortnox",
    offers: {
      "@type": "Offer",
      price: "39",
      priceCurrency: "USD",
      description: "Starting from $39/month with the Startup plan",
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
        name: "How does the Fortnox integration work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon connects to your Fortnox account via secure OAuth authentication. Once connected, we automatically import your invoices and supplier data, then use AI to categorize SaaS expenses and identify cost optimization opportunities. The entire setup takes less than five minutes.",
        },
      },
      {
        "@type": "Question",
        name: "What Fortnox data does Efficyon access?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon accesses your Fortnox invoices, supplier information, and expense categories using read-only permissions. We never modify your Fortnox data. All data is encrypted in transit and at rest, and we comply with GDPR requirements for handling financial data.",
        },
      },
      {
        "@type": "Question",
        name: "Is the Fortnox integration available for all Fortnox plans?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, the Efficyon integration works with all Fortnox plans that support API access, including Fortnox Bokfoering, Fortnox Fakturering, and Fortnox Komplett. You need an active Fortnox subscription with API access enabled.",
        },
      },
      {
        "@type": "Question",
        name: "Can I disconnect Fortnox from Efficyon at any time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. You can disconnect the Fortnox integration at any time from your Efficyon dashboard settings. When disconnected, we stop importing new data immediately. You can also request complete deletion of your imported Fortnox data from our systems.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />
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
              <div className="h-16 w-16 rounded-xl bg-green-900/30 border border-green-500/20 flex items-center justify-center">
                <FileText className="h-8 w-8 text-green-400" />
              </div>
              <div className="text-2xl text-gray-500 font-light">+</div>
              <div className="h-16 w-16 rounded-xl bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                <Zap className="h-8 w-8 text-cyan-400" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium ml-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Live Integration
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              Fortnox + Efficyon: Automated SaaS Cost Analysis
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl">
              Connect your Fortnox accounting system to automatically import invoices,
              categorize SaaS expenses, and identify cost optimization opportunities. Built
              specifically for Swedish businesses that rely on Fortnox for their financial
              operations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Connect Fortnox Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Overview */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              What This Integration Does
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Fortnox is the leading accounting platform for Swedish businesses, trusted by
                over 400,000 companies. By connecting Fortnox to Efficyon, you unlock automated
                SaaS cost analysis that works directly from your accounting data -- no manual
                exports, no spreadsheets, no guesswork.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                The integration automatically syncs your supplier invoices, payment records, and
                expense categories from Fortnox into Efficyon. Our AI then analyzes this data to
                identify which payments are SaaS subscriptions, detect cost anomalies, flag
                potential duplicate charges, and surface actionable savings opportunities.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Whether you are a growing startup with a handful of SaaS tools or a mid-market
                company managing dozens of software subscriptions, the Fortnox integration gives
                you the financial visibility you need to make smarter purchasing decisions and
                reduce unnecessary software spend.
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
              Key Capabilities
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              Everything you get when you connect Fortnox to Efficyon.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Receipt,
                  title: "Auto-Import Invoices",
                  description:
                    "Supplier invoices from Fortnox are imported automatically on a recurring schedule. New invoices appear in Efficyon within minutes of being registered in Fortnox.",
                },
                {
                  icon: FolderOpen,
                  title: "SaaS Expense Categorization",
                  description:
                    "AI identifies which of your Fortnox expenses are SaaS subscriptions and categorizes them by vendor, department, and type -- even when invoice descriptions are vague.",
                },
                {
                  icon: AlertTriangle,
                  title: "Duplicate Payment Detection",
                  description:
                    "Automatically flag potential duplicate charges, overlapping subscriptions, and double-billed invoices that slip through manual review processes.",
                },
                {
                  icon: TrendingUp,
                  title: "Cost Trend Analysis",
                  description:
                    "Track how your SaaS spending evolves month over month. Spot price increases, unexpected charges, and seasonal spending patterns across all your software vendors.",
                },
                {
                  icon: Users,
                  title: "Vendor Spend Tracking",
                  description:
                    "See exactly how much you spend with each SaaS vendor over time. Compare vendor costs against industry benchmarks and identify negotiation opportunities.",
                },
                {
                  icon: BarChart3,
                  title: "Budget vs Actual Reporting",
                  description:
                    "Set SaaS spending budgets and track actual expenses against them in real time. Get alerts when spending approaches or exceeds your defined thresholds.",
                },
              ].map((capability) => (
                <div
                  key={capability.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-green-900/30 border border-green-500/20 flex items-center justify-center">
                    <capability.icon className="h-5 w-5 text-green-400" />
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
              How to Connect Fortnox
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              Get up and running in three simple steps. The entire process takes less than
              five minutes.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Connect via OAuth",
                  description:
                    "Log in to your Efficyon dashboard and click 'Add Integration'. Select Fortnox from the list and authorize the connection through Fortnox's secure OAuth flow. No API keys to copy, no credentials to manage.",
                },
                {
                  step: "02",
                  title: "Auto-Import Begins",
                  description:
                    "Within minutes, Efficyon begins importing your historical invoices and expense data from Fortnox. Depending on your data volume, the initial sync may take up to an hour for a complete history.",
                },
                {
                  step: "03",
                  title: "Get AI-Powered Insights",
                  description:
                    "Once your data is imported, Efficyon's AI engine categorizes your SaaS expenses and generates your first optimization report. You will see savings opportunities, spending trends, and actionable recommendations.",
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
              Who Benefits from This Integration
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              The Fortnox integration is designed for teams that want clear, automated SaaS
              spend visibility without disrupting existing accounting workflows.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Swedish SMBs Tracking SaaS Spend",
                  description:
                    "Small and medium-sized businesses in Sweden already using Fortnox can gain instant visibility into their software costs. No need to switch accounting platforms or adopt new tools -- Efficyon works with the Fortnox data you already have.",
                },
                {
                  title: "Finance Teams Automating Expense Categorization",
                  description:
                    "Finance professionals who spend hours manually categorizing invoices as SaaS vs non-SaaS expenses can automate the entire process. Efficyon's AI does the categorization for you, saving hours of manual work each month.",
                },
                {
                  title: "CFOs Wanting Real-Time Cost Visibility",
                  description:
                    "CFOs and finance leaders who need on-demand visibility into software spending can access real-time dashboards instead of waiting for monthly reports. Spot cost overruns before they become problems.",
                },
                {
                  title: "Auditors Needing Clean SaaS Records",
                  description:
                    "Internal and external auditors who need clear, well-categorized records of all software subscriptions benefit from Efficyon's automated categorization and comprehensive reporting capabilities.",
                },
              ].map((useCase) => (
                <div
                  key={useCase.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
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
              We take your financial data seriously. Here is exactly what we access and how we
              protect it.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">What We Access</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Supplier invoices and payment records
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Expense categories and account codes
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Vendor and supplier information
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Invoice amounts and payment dates
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
                    AES-256 encryption at rest
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    TLS 1.3 encryption in transit
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    GDPR compliant data handling
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    SOC 2 Type II certification
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Read-Only Access</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Efficyon uses read-only access to your Fortnox account. We never create,
                  modify, or delete any data in your accounting system. You can revoke access
                  at any time from both the Efficyon dashboard and your Fortnox settings.
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
              Common questions about the Fortnox integration.
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  How does the Fortnox integration work?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Efficyon connects to your Fortnox account via secure OAuth authentication.
                  Once connected, we automatically import your invoices and supplier data, then
                  use AI to categorize SaaS expenses and identify cost optimization
                  opportunities. The entire setup takes less than five minutes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  What Fortnox data does Efficyon access?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Efficyon accesses your Fortnox invoices, supplier information, and expense
                  categories using read-only permissions. We never modify your Fortnox data.
                  All data is encrypted in transit and at rest, and we comply with GDPR
                  requirements for handling financial data.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Is the Fortnox integration available for all Fortnox plans?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes, the Efficyon integration works with all Fortnox plans that support API
                  access, including Fortnox Bokfoering, Fortnox Fakturering, and Fortnox
                  Komplett. You need an active Fortnox subscription with API access enabled.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Can I disconnect Fortnox from Efficyon at any time?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Absolutely. You can disconnect the Fortnox integration at any time from your
                  Efficyon dashboard settings. When disconnected, we stop importing new data
                  immediately. You can also request complete deletion of your imported Fortnox
                  data from our systems.
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
              Connect Fortnox to Efficyon Today
            </h2>
            <p className="text-lg text-gray-300">
              Start importing your Fortnox invoices and uncover SaaS savings in minutes.
              No credit card required for the free trial. 90-day ROI guarantee on all
              paid plans.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Schedule a Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span>5-minute setup</span>
              <span>•</span>
              <span>Read-only access</span>
              <span>•</span>
              <span>GDPR compliant</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
