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
  TrendingUp,
  PieChart,
  BarChart3,
  Target,
  LineChart,
  DollarSign,
  Presentation,
  AlertTriangle,
  Building,
  Scale,
  Eye,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "SaaS Spend Intelligence for CFOs - Board-Ready Reporting",
    description:
      "The SaaS spend intelligence platform CFOs trust. Board-ready dashboards, benchmarking data, accurate forecasting, and 20-30% waste reduction. Make software your most optimized expense line.",
    alternates: {
      canonical: "/solutions/for-cfo",
    },
    openGraph: {
      title: "The SaaS Spend Intelligence Platform CFOs Trust | Efficyon",
      description:
        "Board-ready SaaS dashboards, benchmarking data, accurate forecasting, and 20-30% waste reduction. Strategic cost intelligence for financial leadership.",
      url: "https://www.efficyon.com/solutions/for-cfo",
      type: "website",
    },
  }
}

export default function ForCFOPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "The SaaS Spend Intelligence Platform CFOs Trust | Efficyon",
    description:
      "Board-ready SaaS dashboards, benchmarking data, accurate forecasting, and 20-30% waste reduction for CFOs and financial leaders.",
    url: "https://www.efficyon.com/solutions/for-cfo",
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
        name: "What kind of ROI can a CFO expect from Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CFOs typically see a 20-30% reduction in total SaaS waste within the first 90 days. For a company spending $500K annually on software, that translates to $100K-$150K in recovered spend. Beyond direct savings, the time saved on manual reporting and the accuracy improvement in forecasting deliver additional strategic value that compounds over time.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon help with board reporting on software spend?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon provides executive dashboards designed for board-level communication. You get trend visualizations, peer benchmarking comparisons, department-level breakdowns, and ROI tracking for optimization initiatives. All dashboards can be exported as presentation-ready PDFs or shared via live links with read-only access for board members.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon help forecast future SaaS spend?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon uses historical spend data, renewal calendars, and growth projections to model future SaaS costs with high accuracy. You can scenario-plan for headcount changes, new tool adoptions, and vendor price increases. This turns SaaS from an unpredictable expense line into one you can forecast with confidence during budgeting cycles.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon benchmark our SaaS spend against peers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon maintains anonymized benchmarking data across industries and company sizes. You can see how your per-employee SaaS spend, tool count, and category allocation compare to similar companies. This data is invaluable for answering board questions like 'Are we spending too much on software?' with data rather than opinions.",
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              For CFOs & Financial Leadership
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              The SaaS Spend Intelligence Platform CFOs Trust
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              SaaS is your second-largest expense after payroll, but it is the one line item nobody
              can explain to the board. Efficyon gives you the strategic visibility, benchmarking
              data, and forecasting accuracy to control it.
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
                <Link href="/#contact">Book an Executive Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Board-Ready Dashboards</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Peer Benchmarking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>90-Day ROI Guarantee</span>
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
                The CFO&apos;s SaaS Visibility Problem
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Companies now spend an average of $4,830 per employee per year on SaaS. At scale,
                that is millions in software costs with surprisingly little strategic oversight.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Eye className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Least Understood Expense</h3>
                </div>
                <p className="text-gray-400">
                  SaaS is the second-largest line item after payroll, yet most CFOs cannot answer
                  basic questions about it with confidence. How many tools does the company use?
                  What percentage is waste? Are we paying more than our peers? The data is
                  scattered across too many systems to answer these questions quickly or accurately.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Scale className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">No Benchmarking Data</h3>
                </div>
                <p className="text-gray-400">
                  When the board asks &ldquo;Is our software spend reasonable?&rdquo; you have no
                  peer comparison data to answer with confidence. Without benchmarks, every
                  optimization decision is based on gut feeling instead of data. You do not know if
                  your per-employee SaaS spend is in the 50th percentile or the 90th.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Presentation className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Board Reporting Gaps</h3>
                </div>
                <p className="text-gray-400">
                  The board wants to understand software ROI. They want trends, comparisons, and
                  a clear narrative about whether technology spend is driving growth or dragging
                  on margins. Assembling this data manually takes your finance team days of
                  preparation, and the result is still a collection of static spreadsheets
                  that cannot tell a strategic story.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <LineChart className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Unpredictable Forecasting</h3>
                </div>
                <p className="text-gray-400">
                  SaaS costs are notoriously hard to forecast. Price increases, auto-renewals,
                  new tool adoptions, and headcount-linked licensing create constant budget
                  variances. During planning season, you are guessing at next year&apos;s software
                  budget because you do not have a reliable model for how these costs grow.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Building className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Department-Level Blind Spots</h3>
                </div>
                <p className="text-gray-400">
                  Engineering&apos;s software budget grew 40% this year, but is that because of
                  headcount growth, price increases, or tool proliferation? Without department-level
                  analysis that connects spend to usage, you cannot have productive conversations
                  with department heads about optimization. Every budget review devolves into
                  finger-pointing instead of strategic planning.
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
                Strategic SaaS Intelligence for Financial Leadership
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Efficyon transforms SaaS from your least understood expense into your most
                optimized one. Board-ready visibility, data-driven decisions, accurate forecasts.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Presentation className="h-6 w-6 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Executive Dashboards Built for the Board Room
                  </h3>
                  <p className="text-gray-400">
                    Efficyon&apos;s executive dashboards present SaaS spend data the way boards
                    want to see it: trend lines, benchmark comparisons, department breakdowns,
                    and ROI metrics. No more assembling presentations from fragmented data.
                    Share live dashboard links with board members or export as presentation-ready
                    PDFs. The data updates in real time, so your story is always current.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Peer Benchmarking with Real Data
                  </h3>
                  <p className="text-gray-400">
                    Answer the board&apos;s hardest question with confidence. Efficyon provides
                    anonymized benchmarking data showing how your per-employee SaaS spend, tool
                    count, and category allocation compare to similar-sized companies in your
                    industry. Know exactly where you are over-indexed and where you are efficient.
                    Use this data to set realistic optimization targets and justify strategic
                    investments.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <LineChart className="h-6 w-6 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Accurate SaaS Forecasting
                  </h3>
                  <p className="text-gray-400">
                    Efficyon models future SaaS costs using historical spend data, renewal
                    calendars, contracted price escalations, and headcount projections. Scenario
                    planning lets you model the impact of hiring 50 people, consolidating two
                    tools, or renegotiating a major contract. Budget planning goes from guesswork
                    to data-driven forecasting with variance tracking that keeps you on target
                    throughout the fiscal year.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building className="h-6 w-6 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Department-Level Analysis and Accountability
                  </h3>
                  <p className="text-gray-400">
                    Break down SaaS spend by department, team, and cost center with usage data
                    attached. Give every budget owner visibility into their actual software
                    consumption. When engineering&apos;s spend grows 40%, you can see exactly
                    whether it is headcount-driven (expected) or tool proliferation (addressable).
                    This turns budget reviews from adversarial conversations into collaborative
                    optimization exercises.
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
                Features CFOs Rely On
              </h2>
              <p className="text-lg text-gray-300">
                Strategic intelligence tools built for financial decision-makers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-purple-900/40 rounded-xl flex items-center justify-center">
                  <Presentation className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Executive Dashboards</h3>
                <p className="text-gray-400">
                  Board-ready visualizations of SaaS spend trends, cost-per-employee metrics,
                  and optimization progress. Shareable via live links or exportable as
                  presentation-quality PDFs for quarterly reviews.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Peer Benchmarking</h3>
                <p className="text-gray-400">
                  Compare your SaaS spend against anonymized peer data by industry, company
                  size, and growth stage. Know exactly where you over-spend and where you are
                  lean relative to comparable companies.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <LineChart className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">SaaS Forecasting</h3>
                <p className="text-gray-400">
                  Model future costs using renewal data, price escalations, and headcount plans.
                  Scenario planning for mergers, hiring waves, and consolidation initiatives.
                  Replace budgeting guesswork with data-driven projections.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">ROI Tracking</h3>
                <p className="text-gray-400">
                  Track the financial impact of every optimization decision. See cumulative
                  savings over time, cost avoidance from renewal negotiations, and the total
                  return on your Efficyon investment in real dollars.
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
                CFO-Level Results
              </h2>
              <p className="text-lg text-gray-300">
                Impact metrics from companies with strategic SaaS management in place.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-purple-400">20-30%</p>
                <p className="text-lg text-white font-medium">SaaS Waste Reduction</p>
                <p className="text-sm text-gray-400">
                  Typical reduction in total SaaS waste within the first 90 days. For a company
                  spending $500K/year on software, that is $100K-$150K back on the bottom line.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-purple-400">95%+</p>
                <p className="text-lg text-white font-medium">Forecast Accuracy</p>
                <p className="text-sm text-gray-400">
                  SaaS budget forecast accuracy with Efficyon&apos;s renewal tracking and
                  scenario modeling. Eliminate the budget variances that make quarterly reviews
                  difficult.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-purple-400">Minutes</p>
                <p className="text-lg text-white font-medium">Board Report Generation</p>
                <p className="text-sm text-gray-400">
                  Generate comprehensive SaaS spend reports in minutes instead of days.
                  Board-ready dashboards with trend analysis, benchmarks, and department
                  breakdowns.
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
                      className="h-5 w-5 text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl text-gray-300 leading-relaxed">
                  &ldquo;The board kept asking me how our software spend compared to peers, and I
                  had no answer. Efficyon gave me benchmarking data within the first month. We
                  were spending 35% more per employee than comparable companies. Within two
                  quarters, we reduced SaaS costs by $280K annually and I can now walk into any
                  board meeting with real-time data instead of stale spreadsheets. The forecasting
                  alone has been worth the investment -- our budget variance on software went from
                  18% to under 3%.&rdquo;
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Jennifer Hayes</p>
                  <p className="text-gray-400 text-sm">
                    CFO, Growth-Stage Technology Company (420 employees)
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
              Questions financial leaders ask before choosing Efficyon.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                What kind of ROI can a CFO expect from Efficyon?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                CFOs typically see a 20-30% reduction in total SaaS waste within the first 90
                days. For a company spending $500K annually on software, that translates to
                $100K-$150K in recovered spend. Beyond direct savings, the time saved on manual
                reporting and the accuracy improvement in forecasting deliver additional strategic
                value that compounds over time. Our 90-day ROI guarantee ensures you see results.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon help with board reporting on software spend?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon provides executive dashboards designed for board-level communication. You
                get trend visualizations, peer benchmarking comparisons, department-level
                breakdowns, and ROI tracking for optimization initiatives. All dashboards can be
                exported as presentation-ready PDFs or shared via live links with read-only access
                for board members. No more manual slide preparation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon help forecast future SaaS spend?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon uses historical spend data, renewal calendars, and growth projections
                to model future SaaS costs with high accuracy. You can scenario-plan for headcount
                changes, new tool adoptions, and vendor price increases. This turns SaaS from an
                unpredictable expense line into one you can forecast with confidence during
                budgeting cycles, reducing budget variance to under 5%.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon benchmark our SaaS spend against peers?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon maintains anonymized benchmarking data across industries and company
                sizes. You can see how your per-employee SaaS spend, tool count, and category
                allocation compare to similar companies. This data is invaluable for answering board
                questions like &ldquo;Are we spending too much on software?&rdquo; with data rather
                than opinions, and for setting realistic optimization targets grounded in peer
                performance.
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
              Make SaaS Your Most Optimized Expense Line
            </h2>
            <p className="text-lg text-gray-300">
              Join the CFOs who have transformed software from their least understood cost into a
              strategic advantage. Your free analysis shows exactly where the opportunities are.
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
                <Link href="/#contact">Schedule an Executive Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>Board-ready dashboards</span>
              <span>|</span>
              <span>Peer benchmarking included</span>
              <span>|</span>
              <span>90-day ROI guarantee</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
