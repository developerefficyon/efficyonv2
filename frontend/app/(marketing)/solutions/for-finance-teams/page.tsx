import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowRight,
  CheckCircle,
  Calculator,
  DollarSign,
  FileText,
  BarChart3,
  Bell,
  Clock,
  AlertTriangle,
  PieChart,
  FolderOpen,
  Shield,
  Download,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "SaaS Spend Visibility for Finance Teams - Save 20+ Hours/Month",
    description:
      "Give your finance team complete SaaS spend visibility. Automate categorization, eliminate surprise renewals, and cut manual tracking by 20+ hours/month. 15% average cost reduction.",
    alternates: {
      canonical: "/solutions/for-finance-teams",
    },
    openGraph: {
      title: "Complete SaaS Spend Visibility for Finance Teams | Efficyon",
      description:
        "Automate SaaS spend tracking, categorization, and reporting. Finance teams save 20+ hours/month and reduce costs by 15% on average.",
      url: "https://www.efficyon.com/solutions/for-finance-teams",
      type: "website",
    },
  }
}

export default function ForFinanceTeamsPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Complete SaaS Spend Visibility for Finance Teams | Efficyon",
    description:
      "Give your finance team complete SaaS spend visibility. Automate categorization, eliminate surprise renewals, and reduce SaaS costs by 15%.",
    url: "https://www.efficyon.com/solutions/for-finance-teams",
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
        name: "How does Efficyon integrate with our existing accounting systems?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon connects directly to popular accounting platforms including QuickBooks, Xero, Fortnox, NetSuite, and Sage. We also integrate with banking feeds and corporate card providers. Data syncs automatically, so your SaaS spend data is always current without manual imports or CSV uploads.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon replace our manual SaaS spend tracking spreadsheets?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Efficyon eliminates the need for manual spend tracking by automatically discovering, categorizing, and tracking every SaaS subscription across your organization. Finance teams that switch from spreadsheets to Efficyon save an average of 20+ hours per month on manual data collection and reconciliation.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon support department-level cost allocation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon automatically allocates SaaS costs to departments, teams, and cost centers based on actual usage data. You can generate department-level reports, set budget thresholds per department, and track spending trends over time. This makes internal chargebacks and budget reviews significantly easier.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon help with audit preparation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon maintains a complete, timestamped record of every SaaS subscription, payment, and license change. During audit periods, you can generate compliance-ready reports showing all software expenditures with vendor details, approval history, and usage justification. What used to take weeks of preparation now takes minutes.",
        },
      },
    ],
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              <Calculator className="h-4 w-4" />
              For Finance Teams
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              Give Your Finance Team Complete SaaS Spend Visibility
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              SaaS invoices are scattered across 40 vendors, 12 credit cards, and zero centralized
              records. Efficyon brings it all into one dashboard -- automatically categorized,
              department-allocated, and audit-ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Book a Finance Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Connects to Your Accounting Software</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Export-Ready Reports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                The SaaS Spend Visibility Problem
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Software is now the second-largest line item after payroll, yet it is the hardest to
                track, categorize, and control. Finance teams are drowning in fragmented data.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Fragmented SaaS Invoices</h3>
                </div>
                <p className="text-gray-400">
                  The average mid-size company has SaaS payments flowing through corporate cards,
                  departmental expense accounts, direct invoices, and employee reimbursements. A
                  2024 study found that 30% of SaaS spend happens outside of procurement channels.
                  Your finance team is chasing invoices across a dozen systems every month.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Manual Categorization</h3>
                </div>
                <p className="text-gray-400">
                  Bank statements show cryptic vendor names. Credit card transactions lack context.
                  Your team spends hours every month manually categorizing SaaS transactions,
                  matching them to departments, and reconciling against budgets. One misclassified
                  charge cascades into reporting errors.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Surprise Renewals</h3>
                </div>
                <p className="text-gray-400">
                  Annual renewals hit the budget with no warning. A department head signed a
                  $15,000/year contract that auto-renewed silently. By the time finance discovers
                  the charge, the cancellation window is closed. This happens multiple times per
                  quarter at most organizations, creating budget variances that are impossible to
                  plan for.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Painful Audit Preparation
                  </h3>
                </div>
                <p className="text-gray-400">
                  When auditors ask for a complete accounting of software expenditures, your team
                  scrambles for weeks. Pulling vendor agreements, matching purchase orders to
                  invoices, and justifying every subscription is tedious, error-prone work. And it
                  happens every single audit cycle, consuming resources you do not have.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <PieChart className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">No Single Source of Truth</h3>
                </div>
                <p className="text-gray-400">
                  Ask three people how much the company spends on SaaS and you get three different
                  numbers. The ERP shows one total, the expense system shows another, and the
                  departmental spreadsheets show yet another. Without a centralized platform, every
                  budget review starts with an argument about which numbers are correct.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                How Efficyon Transforms SaaS Financial Management
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Replace hours of manual work with automated, real-time SaaS spend intelligence that
                your entire finance team can trust.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PieChart className="h-6 w-6 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Automated Spend Discovery and Categorization
                  </h3>
                  <p className="text-gray-400">
                    Efficyon connects to your accounting software, bank feeds, and corporate card
                    providers to automatically identify and categorize every SaaS transaction. Our
                    AI recognizes vendor names even when they appear differently across payment
                    channels -- no more manual lookups, no more misclassifications. Every
                    subscription is tagged with the correct vendor, category, department, and cost
                    center.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bell className="h-6 w-6 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Proactive Budget Alerts and Renewal Tracking
                  </h3>
                  <p className="text-gray-400">
                    Set budget thresholds by department, category, or vendor. Efficyon sends
                    real-time alerts when spending approaches limits, when new subscriptions are
                    detected, and when renewals are approaching. Finance is never surprised by a
                    charge again. Every renewal gets a 30-day, 14-day, and 7-day advance
                    notification so you have time to review, negotiate, or cancel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Department-Level Allocation and Reporting
                  </h3>
                  <p className="text-gray-400">
                    Automatically allocate SaaS costs to departments and cost centers based on
                    actual usage. Generate month-over-month comparisons, variance reports, and
                    trend analysis without touching a spreadsheet. When a department head asks why
                    their software budget increased by 12% this quarter, you have the answer in
                    two clicks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Download className="h-6 w-6 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Export-Ready, Audit-Ready Reports
                  </h3>
                  <p className="text-gray-400">
                    Every data point in Efficyon can be exported to CSV, Excel, or PDF with a
                    single click. Audit preparation that used to take weeks now takes minutes.
                    Generate complete software expenditure reports with vendor details, contract
                    dates, approval history, and usage justification -- all timestamped and
                    formatted for compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Features Finance Teams Rely On
              </h2>
              <p className="text-lg text-gray-300">
                Purpose-built for the way modern finance teams manage software spend.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Automated Categorization</h3>
                <p className="text-gray-400">
                  AI-powered vendor recognition and transaction categorization. Efficyon correctly
                  maps cryptic merchant names to SaaS vendors, assigns GL codes, and tags each
                  subscription to its department and cost center automatically.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center">
                  <Bell className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Budget Alerts</h3>
                <p className="text-gray-400">
                  Set thresholds at the department, category, or vendor level. Receive real-time
                  notifications when spending approaches limits. Get advance warnings on upcoming
                  renewals so you always have time to review and approve.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Department Allocation</h3>
                <p className="text-gray-400">
                  Automatically split SaaS costs across departments based on usage data.
                  Simplify internal chargebacks and give every budget owner visibility into their
                  team&apos;s actual software spend without manual tracking.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center">
                  <Download className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Export-Ready Reports</h3>
                <p className="text-gray-400">
                  One-click export to CSV, Excel, or PDF. Pre-built report templates for budget
                  reviews, audit preparation, and board presentations. Every report includes the
                  complete data trail auditors require.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Measurable Impact for Finance
              </h2>
              <p className="text-lg text-gray-300">
                Results reported by finance teams after implementing Efficyon.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-blue-400">20+ hrs</p>
                <p className="text-lg text-white font-medium">Saved Per Month</p>
                <p className="text-sm text-gray-400">
                  Eliminated manual SaaS spend tracking, categorization, reconciliation, and
                  report generation. Time your team gets back for strategic work.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-blue-400">15%</p>
                <p className="text-lg text-white font-medium">Average Cost Reduction</p>
                <p className="text-sm text-gray-400">
                  Through identifying unused licenses, consolidating duplicate tools, right-sizing
                  plans, and catching renewals before auto-charge deadlines.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-blue-400">100%</p>
                <p className="text-lg text-white font-medium">Spend Visibility</p>
                <p className="text-sm text-gray-400">
                  Complete view of every SaaS subscription across all payment channels. One
                  number, one source of truth, zero arguments in budget meetings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-black/50 p-10">
              <div className="space-y-6">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-5 w-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl text-gray-300 leading-relaxed">
                  &ldquo;Before Efficyon, our month-end close included two full days just for SaaS
                  reconciliation. We had subscriptions coming through five different payment
                  channels and nobody could agree on our total software spend. Now everything is
                  in one place, auto-categorized, and export-ready. Our last audit took 80% less
                  preparation time. I genuinely do not know how we managed without it.&rdquo;
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Sarah Lindqvist</p>
                  <p className="text-gray-400 text-sm">
                    Financial Controller, Mid-Market SaaS Company (180 employees)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-300">
              Common questions from finance teams evaluating Efficyon.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon integrate with our existing accounting systems?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects directly to popular accounting platforms including QuickBooks,
                Xero, Fortnox, NetSuite, and Sage. We also integrate with banking feeds and
                corporate card providers. Data syncs automatically, so your SaaS spend data is
                always current without manual imports or CSV uploads. Setup takes minutes, not days.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon replace our manual SaaS spend tracking spreadsheets?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Absolutely. Efficyon eliminates the need for manual spend tracking by automatically
                discovering, categorizing, and tracking every SaaS subscription across your
                organization. Finance teams that switch from spreadsheets to Efficyon save an
                average of 20+ hours per month on manual data collection and reconciliation. And
                unlike spreadsheets, Efficyon updates in real time and never has formula errors.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon support department-level cost allocation?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon automatically allocates SaaS costs to departments, teams, and cost
                centers based on actual usage data. You can generate department-level reports, set
                budget thresholds per department, and track spending trends over time. This makes
                internal chargebacks and budget reviews significantly easier and more accurate than
                manual allocation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon help with audit preparation?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon maintains a complete, timestamped record of every SaaS subscription,
                payment, and license change. During audit periods, you can generate compliance-ready
                reports showing all software expenditures with vendor details, approval history, and
                usage justification. What used to take weeks of preparation now takes minutes.
                Reports export directly to the formats auditors expect.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Stop Chasing SaaS Invoices. Start Controlling Them.
            </h2>
            <p className="text-lg text-gray-300">
              Give your finance team the visibility, automation, and control they need to manage
              SaaS spend with confidence. Your free analysis reveals exactly where the money is
              going.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Schedule a Finance Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>Connects to your accounting software</span>
              <span>|</span>
              <span>90-day ROI guarantee</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
