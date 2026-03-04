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
  CreditCard,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Users,
  Shield,
  Lock,
  Eye,
  Zap,
  RefreshCw,
  DollarSign,
  Activity,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "Stripe Integration - Deep Subscription Billing Analytics",
    description:
      "Connect Stripe to Efficyon for deep subscription billing analytics. Track payment trends, identify billing anomalies, and optimize your SaaS spending.",
    alternates: {
      canonical: "/integrations/stripe",
    },
    openGraph: {
      title: "Stripe + Efficyon: Deep Subscription Billing Analytics",
      description:
        "Connect Stripe to Efficyon for deep subscription billing analytics. Track payment trends, identify billing anomalies, and optimize your SaaS spending.",
      url: "https://www.efficyon.com/integrations/stripe",
    },
    keywords: [
      "stripe subscription analytics",
      "stripe billing analysis",
      "stripe payment tracking",
      "stripe saas optimization",
      "subscription cost analysis",
    ],
  }
}

export default function StripeIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon Stripe Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect Stripe to Efficyon for deep subscription billing analytics, payment trend tracking, and AI-powered SaaS cost optimization.",
    url: "https://www.efficyon.com/integrations/stripe",
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
        name: "What can Efficyon analyze from my Stripe account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon analyzes your Stripe subscriptions, payment history, invoice data, and billing events. This includes subscription amounts, billing cycles, failed payment patterns, refunds, and churn indicators. We provide a comprehensive view of all your Stripe-billed SaaS expenses in one dashboard.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon process payments through Stripe?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon uses Stripe for its own billing infrastructure, but the Stripe integration for analytics is separate. The analytics integration connects to your Stripe account with read-only access to analyze your outgoing subscriptions and payments to SaaS vendors that bill through Stripe.",
        },
      },
      {
        "@type": "Question",
        name: "How does Stripe integration differ from connecting an accounting platform?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Accounting platforms like Fortnox provide invoice and categorization data, while the Stripe integration gives you real-time subscription-level detail including billing cycles, failed payments, and usage patterns. For the most complete picture, we recommend connecting both your accounting platform and Stripe.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon detect subscription price changes in Stripe?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon monitors your Stripe subscription data continuously and alerts you when a vendor changes their pricing, when you move between pricing tiers, or when unexpected charges appear. This helps you stay on top of cost creep across all your SaaS subscriptions.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
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
              <div className="h-16 w-16 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-purple-400" />
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
              Stripe + Efficyon: Deep Subscription Billing Analytics
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl">
              Analyze all your Stripe-billed subscriptions, track payment trends, and identify
              billing anomalies. Get deep visibility into your recurring SaaS costs with
              AI-powered analytics that go beyond basic Stripe reporting.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Connect Stripe Now
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
                Stripe powers billing for thousands of SaaS companies. If your business pays
                for software tools that bill through Stripe, this integration gives you a
                consolidated, intelligent view of all those subscriptions -- their costs,
                billing cycles, payment history, and trends over time.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Unlike Stripe&apos;s built-in dashboard, which focuses on your own revenue and
                customer payments, Efficyon&apos;s integration analyzes your outgoing SaaS
                spend. We connect to your Stripe account, pull in subscription and payment data,
                and apply AI analysis to detect billing anomalies, predict upcoming charges,
                and flag subscriptions that may no longer be delivering value.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                For companies that both bill through Stripe and pay for SaaS tools via Stripe,
                this integration creates a unique revenue-vs-cost perspective. You can see
                exactly how your SaaS costs scale relative to your own subscription revenue,
                giving finance teams the data they need to maintain healthy margins.
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
              Powerful analytics built on your Stripe subscription data.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: RefreshCw,
                  title: "Subscription Tracking",
                  description:
                    "Monitor every active subscription billed through Stripe. See billing amounts, renewal dates, plan tiers, and per-seat costs in a unified dashboard that updates automatically.",
                },
                {
                  icon: TrendingUp,
                  title: "Payment Trend Analysis",
                  description:
                    "Visualize how your Stripe-billed SaaS costs change over time. Identify cost creep from price increases, tier upgrades, and growing seat counts before they impact your budget.",
                },
                {
                  icon: AlertTriangle,
                  title: "Failed Payment Alerts",
                  description:
                    "Get notified about failed payment attempts, expired cards, and billing errors that could disrupt your SaaS tools. Prevent unexpected service interruptions and late fees.",
                },
                {
                  icon: DollarSign,
                  title: "Revenue vs Cost Comparison",
                  description:
                    "For SaaS companies using Stripe for their own billing, compare your incoming subscription revenue against your outgoing SaaS costs. Track your cost-to-revenue ratio over time.",
                },
                {
                  icon: Activity,
                  title: "Churn Risk Indicators",
                  description:
                    "Identify subscriptions with declining usage patterns, frequent downgrades, or irregular payment behaviors. Spot opportunities to renegotiate or consolidate before renewal dates.",
                },
              ].map((capability) => (
                <div
                  key={capability.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-500/20 flex items-center justify-center">
                    <capability.icon className="h-5 w-5 text-purple-400" />
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
              How to Connect Stripe
            </h2>
            <p className="text-lg text-gray-300 mb-12">
              Three steps to unlock deep subscription analytics from your Stripe data.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Connect Your Stripe Account",
                  description:
                    "From your Efficyon dashboard, navigate to Integrations and select Stripe. You will be redirected to Stripe's secure OAuth flow to authorize read-only access. The connection is established in seconds.",
                },
                {
                  step: "02",
                  title: "Historical Data Syncs Automatically",
                  description:
                    "Efficyon immediately begins syncing your historical Stripe data -- subscriptions, invoices, payments, and billing events. Up to 24 months of history is imported during the initial sync.",
                },
                {
                  step: "03",
                  title: "View Your Analytics Dashboard",
                  description:
                    "Once synced, your Stripe analytics dashboard populates with subscription insights, payment trends, cost breakdowns, and AI-generated optimization recommendations tailored to your spending patterns.",
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
              The Stripe integration delivers value for teams managing subscription-heavy
              SaaS environments.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "SaaS Companies Monitoring Their Own Costs",
                  description:
                    "SaaS businesses that both charge through Stripe and pay for tools via Stripe can compare revenue against SaaS costs in real time. Understand your cost structure and protect margins as you scale.",
                },
                {
                  title: "Finance Teams Tracking Recurring Charges",
                  description:
                    "Finance professionals juggling dozens of Stripe-billed subscriptions get a single source of truth. See every recurring charge, its trend, and whether it aligns with actual tool usage across your organization.",
                },
                {
                  title: "Operations Managers Preventing Billing Surprises",
                  description:
                    "Operations teams responsible for tool management can set up alerts for unexpected price changes, failed payments, and subscription renewals. Never be caught off guard by a surprise invoice again.",
                },
                {
                  title: "Startup Founders Watching Burn Rate",
                  description:
                    "Early-stage founders who need to manage burn carefully can track exactly how their SaaS costs grow month over month. Identify which tools drive the most cost and which deliver the least value relative to spend.",
                },
              ].map((useCase) => (
                <div
                  key={useCase.title}
                  className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
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
              Your Stripe data is handled with the highest security standards.
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
                    Active subscriptions and plans
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Invoice and payment history
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Billing event timestamps
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    Subscription amounts and cycles
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
                    Stripe OAuth secure authorization
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    End-to-end encryption
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    No credit card numbers stored
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    SOC 2 compliant infrastructure
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Read-Only Access</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Efficyon requests only read-level permissions from Stripe. We cannot
                  create charges, modify subscriptions, or access sensitive payment
                  credentials. Your billing operations remain completely untouched.
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
              Common questions about the Stripe integration.
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  What can Efficyon analyze from my Stripe account?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Efficyon analyzes your Stripe subscriptions, payment history, invoice data,
                  and billing events. This includes subscription amounts, billing cycles, failed
                  payment patterns, refunds, and churn indicators. We provide a comprehensive
                  view of all your Stripe-billed SaaS expenses in one dashboard.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Does Efficyon process payments through Stripe?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Efficyon uses Stripe for its own billing infrastructure, but the Stripe
                  integration for analytics is separate. The analytics integration connects to
                  your Stripe account with read-only access to analyze your outgoing
                  subscriptions and payments to SaaS vendors that bill through Stripe.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  How does Stripe integration differ from connecting an accounting platform?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Accounting platforms like Fortnox provide invoice and categorization data,
                  while the Stripe integration gives you real-time subscription-level detail
                  including billing cycles, failed payments, and usage patterns. For the most
                  complete picture, we recommend connecting both your accounting platform and
                  Stripe.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-white/10 rounded-lg px-6 bg-black/50"
              >
                <AccordionTrigger className="text-white hover:no-underline">
                  Can Efficyon detect subscription price changes in Stripe?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes. Efficyon monitors your Stripe subscription data continuously and alerts
                  you when a vendor changes their pricing, when you move between pricing tiers,
                  or when unexpected charges appear. This helps you stay on top of cost creep
                  across all your SaaS subscriptions.
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
              Connect Stripe to Efficyon Today
            </h2>
            <p className="text-lg text-gray-300">
              Unlock deep subscription analytics and start optimizing your SaaS costs.
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
              <span>Instant sync</span>
              <span>•</span>
              <span>Read-only access</span>
              <span>•</span>
              <span>24 months of history</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
