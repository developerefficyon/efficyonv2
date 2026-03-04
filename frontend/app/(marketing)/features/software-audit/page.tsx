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
  ClipboardCheck,
  Search,
  FileCheck,
  Shield,
  RefreshCw,
  List,
  Clock,
  BarChart3,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Automated Software Audits in Minutes, Not Months",
  description:
    "Run comprehensive software audits automatically. Efficyon discovers your complete software inventory, tracks compliance, and generates audit-ready reports in minutes instead of months.",
  alternates: {
    canonical: "/features/software-audit",
  },
  openGraph: {
    title: "Automated Software Audits in Minutes, Not Months | Efficyon",
    description:
      "Run comprehensive software audits automatically. Efficyon discovers your complete software inventory, tracks compliance, and generates audit-ready reports in minutes instead of months.",
    url: "https://www.efficyon.com/features/software-audit",
    type: "website",
  },
}

export default function SoftwareAuditPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Software Audit Tool",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/software-audit",
      description:
        "Automated software audit tool that provides complete software inventory, compliance tracking, license auditing, and audit-ready reports with continuous monitoring.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Automated discovery, Complete inventory, Compliance tracking, Audit-ready reports, Continuous monitoring, License auditing",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does automated software auditing work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your accounting systems, identity providers, and SaaS tools to automatically discover and catalog every piece of software in your organization. It tracks license counts, usage levels, costs, and compliance status for each tool. Reports are generated on demand or on a scheduled basis, giving you audit-ready documentation without weeks of manual work.",
          },
        },
        {
          "@type": "Question",
          name: "How long does a software audit take with Efficyon?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Initial discovery and inventory building typically completes within the first week. After that, your software audit is always current because Efficyon monitors continuously. Generating an audit report takes seconds since the data is always up to date. Compare this to traditional manual audits that take 3-6 months.",
          },
        },
        {
          "@type": "Question",
          name: "Can Efficyon help with vendor compliance audits?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Efficyon tracks your license entitlements against actual usage for each vendor. If you are over-deployed (using more licenses than purchased), the system flags the compliance risk before the vendor does. If you are under-deployed, it identifies the waste. This proactive compliance monitoring protects you from costly true-up penalties.",
          },
        },
        {
          "@type": "Question",
          name: "What information is included in audit reports?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon audit reports include complete software inventory with vendor details, license counts and entitlements versus actual usage, cost per tool and per user, compliance status with risk flags, usage trends over time, and optimization recommendations. Reports can be exported in PDF, CSV, or integrated directly with your GRC tools.",
          },
        },
        {
          "@type": "Question",
          name: "How does continuous auditing prevent audit fatigue?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Traditional audits are dreaded because they require massive manual effort every time. With Efficyon, auditing is continuous and automated. Your inventory, compliance, and cost data are always current, so generating a report for any stakeholder is a one-click operation. There is no annual scramble to collect data because it is always collected.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-8">
              <ClipboardCheck className="h-4 w-4" />
              Software Audit
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Automated Software Audits in Minutes, Not Months
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Traditional software audits take months of manual effort, produce incomplete
              results, and are outdated before the final report is written. Efficyon delivers a
              continuously updated, audit-ready software inventory with compliance tracking
              that runs itself.
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
                <span>Complete Inventory</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Compliance Tracking</span>
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
                Software Audits Are Painful, Slow, and Incomplete
              </h2>
              <p className="text-gray-300 text-lg">
                Most companies dread software audits because they require massive manual
                effort, pull people away from their real work, and still produce results that
                are incomplete. Vendor compliance audits are even worse, often resulting in
                unexpected true-up costs.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Manual audits take three to six months of spreadsheet work, email chains, and meetings just to produce a snapshot that is already outdated
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Incomplete inventories miss shadow IT, departmental purchases, and tools purchased on personal cards then expensed, leaving blind spots in your audit
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Compliance risks from over-deployment where you use more licenses than you purchased, exposing you to costly vendor true-up penalties
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <span className="text-red-500 mt-1 flex-shrink-0">&#10007;</span>
                  Audit fatigue causes teams to treat audits as a checkbox exercise, producing low-quality results that do not drive real optimization decisions
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Always Audit-Ready, Zero Manual Effort
              </h2>
              <p className="text-gray-300 text-lg">
                Efficyon replaces the entire manual audit cycle with automated, continuous
                software discovery and monitoring. Your inventory is always complete, your
                compliance status is always current, and audit-ready reports are one click
                away.
              </p>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Automated discovery that finds every piece of software across your organization including shadow IT, expensed tools, and free-tier products
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Complete software inventory with vendor details, license counts, cost data, department assignments, and usage metrics for every tool
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Compliance tracking that monitors license entitlements versus actual deployment and flags over-usage before vendors audit you
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Audit-ready reports generated on demand or on a schedule, exportable as PDF or CSV, with all the detail auditors and stakeholders need
                </p>
                <p className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Continuous monitoring that keeps your inventory and compliance data current 24/7 so you are always prepared, not just during audit season
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
              How Automated Software Auditing Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              From connection to complete audit-ready inventory in days, not months. Here is
              the process that replaces your annual audit scramble.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-yellow-500/20 mb-4">01</div>
              <h3 className="text-xl font-semibold text-white mb-3">Discover Everything</h3>
              <p className="text-gray-400 leading-relaxed">
                Efficyon scans your accounting records, SSO logs, expense reports, and API
                connections to build a complete map of every software tool in your organization.
                It catches tools purchased through official procurement, shadow IT bought on
                corporate cards, free-tier products with security implications, and everything
                in between.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-yellow-500/20 mb-4">02</div>
              <h3 className="text-xl font-semibold text-white mb-3">Catalog and Classify</h3>
              <p className="text-gray-400 leading-relaxed">
                Each discovered tool is automatically enriched with vendor information, license
                type, cost data, department ownership, user count, usage metrics, and compliance
                status. Efficyon categorizes tools by function so you can see your complete
                stack organized by purpose, cost, or risk level.
              </p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="text-5xl font-bold text-yellow-500/20 mb-4">03</div>
              <h3 className="text-xl font-semibold text-white mb-3">Monitor and Report</h3>
              <p className="text-gray-400 leading-relaxed">
                Your software inventory stays current through continuous monitoring. New tools
                are flagged as they appear. Compliance status updates in real time. Generate
                comprehensive audit reports on demand for any stakeholder, from internal
                finance reviews to external compliance audits, all with a single click.
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
              Benefits of Automated Software Auditing
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Replace the dreaded annual audit with a continuous, automated process that keeps
              your organization prepared and compliant at all times.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Automated Discovery</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                No more manual surveys, email chains, or spreadsheet compilation. Efficyon
                discovers every tool automatically by analyzing financial records, identity
                data, and API connections across your entire organization.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <List className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Complete Inventory</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Every tool, every license, every cost, organized and enriched with vendor
                details, department assignments, and usage data. The kind of comprehensive
                inventory that manual audits aspire to but rarely achieve.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Compliance Tracking</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Real-time monitoring of license entitlements versus deployment. Know instantly
                if you are over-deployed on any tool and address the gap before a vendor audit
                catches it and triggers true-up penalties.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Continuous Monitoring</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your audit data is always current because Efficyon never stops scanning. New
                tools, changed licenses, and compliance shifts are reflected immediately. There
                is no stale data and no need for periodic manual refreshes.
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
              <div className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2">Minutes</div>
              <p className="text-white font-medium mb-1">Audit Report Generation</p>
              <p className="text-gray-400 text-sm">
                Generate comprehensive audit-ready reports instantly from continuously maintained data
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">100%</div>
              <p className="text-white font-medium mb-1">Software Discovery</p>
              <p className="text-gray-400 text-sm">
                Complete visibility including shadow IT, departmental purchases, and free-tier tools with security implications
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
              Software Audit FAQ
            </h2>
            <p className="text-lg text-gray-300">
              How Efficyon automates software auditing and compliance tracking
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does automated software auditing work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects to your accounting systems, identity providers, and SaaS tools
                to automatically discover and catalog every piece of software in your
                organization. It tracks license counts, usage levels, costs, and compliance
                status for each tool. Reports are generated on demand or on a scheduled basis,
                giving you audit-ready documentation without weeks of manual effort.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How long does a software audit take with Efficyon?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Initial discovery and inventory building typically completes within the first
                week. After that, your software audit is always current because Efficyon
                monitors continuously. Generating an audit report takes seconds since the data
                is always up to date. Compare this to traditional manual audits that consume
                three to six months of team effort and still produce incomplete results.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon help with vendor compliance audits?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon tracks your license entitlements against actual usage for each
                vendor. If you are over-deployed, meaning you use more licenses than you
                purchased, the system flags the compliance risk before the vendor does. If you
                are under-deployed, it identifies the waste. This proactive compliance
                monitoring protects you from costly true-up penalties that can run into tens of
                thousands of dollars.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What information is included in audit reports?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon audit reports include complete software inventory with vendor details,
                license counts and entitlements versus actual usage, cost per tool and per user,
                compliance status with risk flags, usage trends over time, and optimization
                recommendations. Reports can be exported in PDF or CSV formats and shared
                directly with stakeholders or integrated with your GRC tools.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does continuous auditing prevent audit fatigue?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Traditional audits are dreaded because they require massive manual effort every
                time they are conducted. With Efficyon, auditing is continuous and automated.
                Your inventory, compliance, and cost data are always current, so generating a
                report for any stakeholder is a one-click operation. There is no annual scramble
                to collect data because data collection never stops.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10" />
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                End the Manual Audit Cycle Forever
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                Stop wasting months on manual software audits that produce incomplete results.
                Connect your systems and Efficyon builds your complete, compliance-ready
                software inventory automatically and keeps it current forever.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                  <Link href="/register">
                    Start Free Audit
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
