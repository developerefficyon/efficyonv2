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
  Copy,
  Layers,
  ScanSearch,
  Merge,
  DollarSign,
  AlertTriangle,
  Sparkles,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Stop Paying Twice for the Same Software",
  description:
    "Automatically detect duplicate payments, overlapping SaaS tools, and redundant subscriptions. Efficyon's AI finds the hidden waste that manual reviews miss.",
  alternates: {
    canonical: "/features/duplicate-payment-detection",
  },
  openGraph: {
    title: "Stop Paying Twice for the Same Software | Efficyon",
    description:
      "Automatically detect duplicate payments, overlapping SaaS tools, and redundant subscriptions. Efficyon's AI finds the hidden waste that manual reviews miss.",
    url: "https://www.efficyon.com/features/duplicate-payment-detection",
    type: "website",
  },
}

export default function DuplicatePaymentDetectionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Duplicate Payment Detection",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/duplicate-payment-detection",
      description:
        "AI-powered duplicate payment detection software that identifies overlapping SaaS tools, redundant subscriptions, and duplicate invoices across your organization.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Duplicate invoice detection, Overlapping tool analysis, Consolidation recommendations, Instant savings identification, Cross-department scanning",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Efficyon detect duplicate payments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon's AI analyzes transaction records from your accounting system, credit card statements, and expense reports to identify duplicate invoices, same-vendor payments at different amounts, and subscriptions to tools with overlapping functionality. The system looks beyond exact matches to catch near-duplicates that manual review would miss.",
          },
        },
        {
          "@type": "Question",
          name: "What is the difference between duplicate payments and overlapping tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Duplicate payments are exact or near-exact charges for the same service, such as two invoices from the same vendor in the same billing period. Overlapping tools are different products that serve the same function, like paying for both Asana and Monday.com for project management. Efficyon detects both types of waste.",
          },
        },
        {
          "@type": "Question",
          name: "How quickly can Efficyon find duplicate payments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most companies see their first duplicate payment findings within 48 hours of connecting their financial data. The comprehensive overlap analysis, which maps functional relationships between all your tools, typically completes within two weeks.",
          },
        },
        {
          "@type": "Question",
          name: "What happens after Efficyon finds a duplicate payment?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Each finding comes with a detailed report showing the duplicate charge, the estimated annual waste, and a recommended action. For overlapping tools, Efficyon provides a consolidation plan that recommends which tool to keep based on usage data, user satisfaction, and total cost.",
          },
        },
        {
          "@type": "Question",
          name: "Can Efficyon catch duplicate payments across different departments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, and this is where Efficyon provides the most value. Many duplicate subscriptions happen when different departments independently purchase the same tool or tools with overlapping features. Efficyon's cross-departmental analysis surfaces these hidden duplicates that no single team would ever catch on their own.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8">
              <Copy className="h-4 w-4" />
              Duplicate Payment Detection
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Stop Paying Twice for the Same Software
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Multiple teams buying the same tools. Overlapping features across different
              products. Duplicate invoices slipping through approval. Efficyon&apos;s AI catches
              every instance of double spending so you stop hemorrhaging budget on redundancy.
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
                <span>Cross-Department Scanning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Instant Savings Identified</span>
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
                The Hidden Cost of Redundancy
              </h2>
              <p className="text-gray-300 text-lg">
                Research shows that the average mid-size company has at least two to three
                duplicate or functionally overlapping SaaS subscriptions. That is thousands of
                dollars a month vanishing into tools that do the same thing.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Multiple teams independently purchase the same SaaS product, each unaware of the other&apos;s subscription, doubling or tripling your cost for a single tool
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Overlapping functionality across different products means you pay premium prices for features that exist in tools you already own
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Duplicate invoices from the same vendor at different amounts or on different billing cycles slip through manual approval processes undetected
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Wasted budget on redundant tools compounds every month, and without automated detection the problem grows as the company scales
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                AI That Spots Every Duplicate
              </h2>
              <p className="text-gray-300 text-lg">
                Efficyon analyzes your complete financial footprint and tool inventory to find
                every instance of duplicate or overlapping spend. Each finding comes with a
                clear action plan and dollar savings estimate.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Automatic detection of duplicate invoices, same-vendor multi-payments, and billing anomalies across all your financial data sources
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Functional overlap analysis that maps capabilities across your entire SaaS stack and flags where two or more tools serve the same purpose
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Consolidation recommendations that tell you which tool to keep based on usage data, user satisfaction, feature coverage, and total cost
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Instant savings calculation showing the exact monthly and annual amount you recover by eliminating each duplicate
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Cross-department scanning that catches redundancies invisible to any single team, where the biggest waste typically hides
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
              How Duplicate Payment Detection Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Efficyon goes far beyond simple invoice matching. Our AI understands tool
              functionality and organizational patterns to find redundancy at every level.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-purple-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Scan Financial Data</h3>
              <p className="text-gray-400 leading-relaxed">
                Efficyon ingests data from your accounting system, corporate cards, expense
                reports, and procurement records. The AI builds a complete map of every
                payment flowing out of your organization to SaaS vendors, regardless of which
                team initiated the purchase or which payment method was used.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-purple-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">Detect Overlaps</h3>
              <p className="text-gray-400 leading-relaxed">
                The AI cross-references your tool inventory against a comprehensive database
                of SaaS products and their feature sets. It identifies exact duplicate
                subscriptions, near-duplicate invoices with billing discrepancies, and
                functionally overlapping tools that serve the same business purpose across
                different teams.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-purple-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Consolidate and Save</h3>
              <p className="text-gray-400 leading-relaxed">
                Each duplicate or overlap comes with a detailed recommendation. For duplicate
                invoices, you get the exact charges to dispute. For overlapping tools, you
                receive a consolidation plan with usage-backed evidence showing which product
                to standardize on and how much you will save annually.
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
              Benefits of Automated Duplicate Detection
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Recover budget that has been silently leaking through duplicate and redundant
              SaaS subscriptions across your organization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <ScanSearch className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Automatic Detection</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI continuously monitors your financial data for duplicate charges, invoice
                anomalies, and same-vendor overpayments. No manual audits required. Issues are
                flagged the moment they appear.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Overlap Analysis</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Beyond exact duplicates, Efficyon maps functional overlap between different
                products. Discover that your marketing team&apos;s project tool does the same
                thing as engineering&apos;s and consolidate to one.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Merge className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Smart Consolidation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Every overlap finding includes a data-backed consolidation recommendation.
                Efficyon compares usage, satisfaction, features, and cost to tell you which
                tool to keep and which to retire.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Instant Savings</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Unlike other cost optimization strategies that take months, eliminating
                duplicate payments delivers immediate budget recovery. Cancel the redundant
                subscription today and save starting this billing cycle.
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
              <div className="text-4xl md:text-5xl font-bold text-purple-400 mb-2">2-3x</div>
              <p className="text-white font-medium mb-1">Average Duplicates Found</p>
              <p className="text-gray-400 text-sm">
                Most mid-size companies have two to three duplicate or overlapping SaaS subscriptions they are unaware of
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2">48 Hrs</div>
              <p className="text-white font-medium mb-1">First Findings Delivered</p>
              <p className="text-gray-400 text-sm">
                Duplicate payment detections typically surface within 48 hours of connecting your financial data
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">90 Days</div>
              <p className="text-white font-medium mb-1">ROI Guarantee</p>
              <p className="text-gray-400 text-sm">
                Measurable return on investment guaranteed within 90 days or we work at no extra cost
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
              Duplicate Payment Detection FAQ
            </h2>
            <p className="text-lg text-gray-300">
              How Efficyon finds and eliminates duplicate SaaS payments
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon detect duplicate payments?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon&apos;s AI analyzes transaction records from your accounting system, credit
                card statements, and expense reports to identify duplicate invoices, same-vendor
                payments at different amounts, and subscriptions to tools with overlapping
                functionality. The system looks beyond exact matches to catch near-duplicates
                and billing anomalies that manual review would miss.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What is the difference between duplicate payments and overlapping tools?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Duplicate payments are exact or near-exact charges for the same service, such as
                two invoices from the same vendor in the same billing period. Overlapping tools
                are different products that serve the same function, like paying for both Asana
                and Monday.com for project management. Efficyon detects both types of waste and
                provides specific action plans for each.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How quickly can Efficyon find duplicate payments?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Most companies see their first duplicate payment findings within 48 hours of
                connecting their financial data. The comprehensive overlap analysis, which maps
                functional relationships between all your tools, typically completes within two
                weeks as the AI builds a full picture of your SaaS ecosystem.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What happens after Efficyon finds a duplicate payment?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Each finding comes with a detailed report showing the duplicate charge, the
                estimated annual waste, and a recommended action. For overlapping tools, Efficyon
                provides a consolidation plan that recommends which tool to keep based on usage
                data, user satisfaction, and total cost. You can track implementation progress
                directly in your dashboard.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon catch duplicate payments across different departments?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes, and this is where Efficyon provides the most value. Many duplicate
                subscriptions happen when different departments independently purchase the same
                tool or tools with overlapping features. Efficyon&apos;s cross-departmental
                analysis surfaces these hidden duplicates that no single team would ever catch
                on their own. This cross-organizational view is typically where the largest
                savings are found.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Find Out What You Are Paying Twice For
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Connect your accounts and Efficyon will scan your entire SaaS footprint for
                duplicates and overlaps. Most companies find their first savings within 48
                hours.
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
