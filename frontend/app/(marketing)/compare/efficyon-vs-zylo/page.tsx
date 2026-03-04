import type { Metadata } from "next"
import Link from "next/link"
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
  XCircle,
  DollarSign,
  Brain,
  Clock,
  BarChart3,
  Building2,
  Users,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Zylo Alternative - Efficyon vs Zylo SaaS Management Comparison",
    description:
      "Looking for a Zylo alternative? Compare Efficyon vs Zylo across pricing, features, AI capabilities, and time to value. See why growing companies switch to Efficyon.",
    alternates: {
      canonical: "/compare/efficyon-vs-zylo",
    },
    openGraph: {
      title: "Efficyon vs Zylo: Which SaaS Management Platform Is Right for You?",
      description:
        "An honest comparison of Efficyon and Zylo. Discover which SaaS management and cost optimization platform fits your business size, budget, and needs.",
      url: "https://www.efficyon.com/compare/efficyon-vs-zylo",
    },
  }
}

export default function EfficyonVsZyloPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Efficyon vs Zylo: SaaS Management Platform Comparison",
    description:
      "Detailed comparison of Efficyon and Zylo SaaS management platforms across pricing, features, AI capabilities, and time to value.",
    url: "https://www.efficyon.com/compare/efficyon-vs-zylo",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does Efficyon pricing compare to Zylo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon starts at $39/month for startups and $119/month for growing teams. Zylo typically requires enterprise contracts starting at $50,000+ per year, making it 100x more expensive for smaller companies.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon handle the same number of SaaS applications as Zylo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon integrates with 50+ business tools and can track and analyze your entire SaaS stack regardless of size. While Zylo may have a larger discovery database for very large enterprises, Efficyon covers all the major applications most businesses use.",
        },
      },
      {
        "@type": "Question",
        name: "Is it easy to switch from Zylo to Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Most teams can set up Efficyon in under a day. You can export your SaaS inventory from Zylo and Efficyon's onboarding process will help you reconnect your tools and start getting AI-powered insights within the first week.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon offer the same SaaS discovery features as Zylo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon focuses on cost optimization and usage analysis rather than shadow IT discovery. While Zylo has broader discovery capabilities for very large enterprises, Efficyon excels at connecting spend data with actual usage to find concrete savings opportunities.",
        },
      },
      {
        "@type": "Question",
        name: "What makes Efficyon's AI different from Zylo's analytics?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon uses AI to actively compare your spending with real usage data across all connected tools, then generates prioritized, actionable recommendations with estimated savings. Zylo provides analytics dashboards and benchmarking but focuses more on visibility than automated AI-driven recommendations.",
        },
      },
    ],
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-6">
              <Building2 className="h-4 w-4" />
              SaaS Management Comparison
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Efficyon vs Zylo: Which SaaS Management Platform Is Right for You?
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Zylo is a well-established enterprise SaaS management platform. But if you are an SMB or mid-market
              company looking for AI-powered cost optimization without the enterprise price tag, Efficyon
              may be the better fit. Here is an honest, detailed comparison.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Comparison Table */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Quick Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Feature</th>
                  <th className="text-center py-4 px-6 text-cyan-400 font-semibold">Efficyon</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-semibold">Zylo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Starting Price", efficyon: "From $39/mo", zylo: "$50,000+/year" },
                  { feature: "AI-Powered Recommendations", efficyon: true, zylo: false },
                  { feature: "Usage vs. Spend Analysis", efficyon: true, zylo: "Partial" },
                  { feature: "Time to Value", efficyon: "Days", zylo: "Weeks to months" },
                  { feature: "Accounting Integration", efficyon: true, zylo: false },
                  { feature: "SMB Friendly", efficyon: true, zylo: false },
                  { feature: "SaaS Discovery", efficyon: "Core apps", zylo: "Extensive" },
                  { feature: "Enterprise Scale (5,000+)", efficyon: "Via Enterprise plan", zylo: true },
                  { feature: "ROI Guarantee", efficyon: "90-day guarantee", zylo: "No" },
                  { feature: "Benchmarking Data", efficyon: "Growing", zylo: "Extensive" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-4 px-6 text-gray-300 text-sm">{row.feature}</td>
                    <td className="py-4 px-6 text-center">
                      {typeof row.efficyon === "boolean" ? (
                        row.efficyon ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-200">{row.efficyon}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {typeof row.zylo === "boolean" ? (
                        row.zylo ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-200">{row.zylo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed Feature Comparison */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Detailed Feature Comparison
          </h2>

          <div className="space-y-16">
            {/* AI Analysis */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">AI-Powered Analysis</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon uses AI at its core to compare your actual SaaS spending against real usage data.
                  The platform automatically identifies unused licenses, overlapping tools, and pricing
                  inefficiencies -- then generates prioritized recommendations with estimated dollar savings for each action.
                </p>
                <p className="text-gray-400 text-sm">
                  Zylo provides analytics dashboards and some benchmarking insights, but its primary approach
                  is visibility and reporting rather than AI-driven, automated recommendations. You get data, but
                  the analysis and action planning is largely manual.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">What this means in practice</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  With Efficyon, you log in and see a prioritized list of savings opportunities ranked by
                  impact. &quot;Cancel 3 unused Figma licenses to save $540/year&quot; or &quot;Consolidate Asana and
                  Monday.com to save $2,400/year.&quot; With Zylo, you see dashboards showing your SaaS inventory
                  and spending trends, then need to identify the optimization opportunities yourself or with
                  your Customer Success Manager.
                </p>
              </div>
            </div>

            {/* Pricing Accessibility */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Pricing Accessibility</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon offers transparent pricing starting at $39/month for startups (1-10 employees) and
                  $119/month for growing teams (11-50 employees). Enterprise pricing is custom but still
                  designed to deliver clear ROI with a 90-day guarantee.
                </p>
                <p className="text-gray-400 text-sm">
                  Zylo is built for enterprise buyers with annual contracts typically starting at $50,000 or
                  more. This pricing model makes sense for organizations with thousands of employees and
                  massive SaaS portfolios, but it puts Zylo out of reach for most SMBs and mid-market companies.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-green-400 mb-3">Cost comparison example</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>50-person company on Efficyon Growth</span>
                    <span className="text-green-400 font-medium">$1,428/year</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>50-person company on Zylo</span>
                    <span className="text-red-400 font-medium">$50,000+/year</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-gray-200">
                    <span>Annual savings with Efficyon</span>
                    <span className="text-green-400 font-bold">$48,500+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Time to Value */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Time to Value</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon is designed for rapid deployment. Most teams connect their first tools within hours,
                  and receive their first AI recommendations within the first week. The 90-day ROI guarantee
                  means you will see measurable savings within a quarter.
                </p>
                <p className="text-gray-400 text-sm">
                  Zylo implementations typically involve a longer onboarding process that can take weeks to months,
                  including data ingestion from multiple sources, integration configuration, and training. This
                  is expected for enterprise software managing thousands of applications.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-blue-400 mb-3">Implementation timeline</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span className="text-sm text-gray-200 font-medium">Efficyon</span>
                    </div>
                    <div className="ml-4 text-sm text-gray-400">
                      Day 1: Connect tools. Week 1: First recommendations. Month 1-3: Measurable ROI.
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                      <span className="text-sm text-gray-200 font-medium">Zylo</span>
                    </div>
                    <div className="ml-4 text-sm text-gray-400">
                      Week 1-4: Setup and data ingestion. Month 2-3: Full visibility. Month 3-6: Optimization begins.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting Integration */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">Financial & Accounting Integration</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon connects directly to accounting systems to pull real spend data. This means your
                  cost analysis is based on actual invoices and payments, not estimates or manually entered
                  contract values. The result is more accurate spend tracking and better savings identification.
                </p>
                <p className="text-gray-400 text-sm">
                  Zylo primarily relies on contract data, SSO logs, and expense report integrations. While
                  comprehensive for tracking subscriptions, it may not capture the full picture of what you are
                  actually paying after discounts, overages, and mid-cycle changes.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-purple-400 mb-3">Why accounting data matters</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Contract values and actual payments often differ significantly. An annual contract may say
                  $12,000/year, but mid-year upgrades, overages, or forgotten add-ons can push actual spend
                  to $15,000+. By connecting to your accounting system, Efficyon catches these discrepancies
                  and identifies the true cost of every tool.
                </p>
              </div>
            </div>

            {/* Target Audience */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-orange-400" />
                  <h3 className="text-xl font-semibold text-white">Target Audience & Scale</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon is built for SMBs and mid-market companies (1 to 500+ employees) that want
                  sophisticated SaaS cost optimization without the enterprise complexity and pricing. The
                  interface is intuitive, setup is fast, and pricing scales with your company.
                </p>
                <p className="text-gray-400 text-sm">
                  Zylo is purpose-built for large enterprises (typically 5,000+ employees) with sprawling
                  SaaS portfolios of hundreds or thousands of applications. It includes capabilities like
                  shadow IT discovery and vendor management that are most valuable at scale.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-orange-400 mb-3">Company size fit</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="text-cyan-400 font-medium min-w-[90px]">1-50</span>
                    <span>Efficyon Startup or Growth plan is ideal</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="text-cyan-400 font-medium min-w-[90px]">50-500</span>
                    <span>Efficyon Growth or Enterprise plan recommended</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="text-cyan-400 font-medium min-w-[90px]">500-5,000</span>
                    <span>Either platform could work; evaluate needs</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="text-gray-500 font-medium min-w-[90px]">5,000+</span>
                    <span>Zylo may be the stronger fit at this scale</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Pricing Comparison
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-cyan-500/20 rounded-xl p-8 bg-cyan-500/[0.03]">
              <h3 className="text-xl font-semibold text-white mb-2">Efficyon</h3>
              <p className="text-gray-400 text-sm mb-6">Transparent, published pricing</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Startup (1-10 employees)</span>
                  <span className="text-white font-semibold">$39/mo</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Growth (11-50 employees)</span>
                  <span className="text-white font-semibold">$119/mo</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Enterprise (50+)</span>
                  <span className="text-white font-semibold">Custom</span>
                </div>
                <div className="flex items-center gap-2 text-green-400 text-sm pt-2">
                  <CheckCircle className="h-4 w-4" />
                  90-day ROI guarantee on all plans
                </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-white mb-2">Zylo</h3>
              <p className="text-gray-400 text-sm mb-6">Enterprise contracts only</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Minimum contract</span>
                  <span className="text-white font-semibold">$50,000+/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Typical mid-market</span>
                  <span className="text-white font-semibold">$75,000-150,000/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Large enterprise</span>
                  <span className="text-white font-semibold">$200,000+/year</span>
                </div>
                <div className="text-gray-400 text-sm pt-2">
                  Pricing based on number of employees and SaaS spend
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Teams Switch */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Why Teams Switch from Zylo to Efficyon
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Budget constraints",
                description:
                  "Many mid-market companies find that Zylo's enterprise pricing doesn't align with their budget. Efficyon delivers comparable cost optimization at a fraction of the price, making sophisticated SaaS management accessible to companies of all sizes.",
              },
              {
                title: "Actionable AI over dashboards",
                description:
                  "Teams want more than visibility into their SaaS stack -- they want the platform to tell them exactly what to do and how much they will save. Efficyon's AI generates specific, prioritized recommendations rather than leaving analysis to the user.",
              },
              {
                title: "Faster time to value",
                description:
                  "Enterprise implementations that take months don't work for lean teams that need results fast. Efficyon's lightweight setup means teams start seeing savings opportunities in days, not quarters.",
              },
              {
                title: "Financial accuracy",
                description:
                  "By integrating with accounting systems, Efficyon captures what you actually pay -- not just what your contracts say. This leads to more accurate cost analysis and often uncovers spend that contract-based tools miss.",
              },
            ].map((reason, i) => (
              <div key={i} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                <h3 className="text-lg font-semibold text-white mb-3">{reason.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{reason.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Should Choose What */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Who Should Choose What?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-cyan-500/20 rounded-xl p-8 bg-cyan-500/[0.03]">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">Choose Efficyon if you...</h3>
              <ul className="space-y-3">
                {[
                  "Are an SMB or mid-market company (under 5,000 employees)",
                  "Want AI-driven recommendations, not just dashboards",
                  "Need fast time to value with minimal setup",
                  "Want transparent, affordable pricing from day one",
                  "Care more about cost optimization than shadow IT discovery",
                  "Want accounting-level accuracy in your spend data",
                  "Value a 90-day ROI guarantee",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                    <CheckCircle className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-300 mb-4">Consider Zylo if you...</h3>
              <ul className="space-y-3">
                {[
                  "Are a large enterprise with 5,000+ employees",
                  "Have a SaaS portfolio of 500+ applications",
                  "Need extensive shadow IT discovery capabilities",
                  "Want detailed SaaS benchmarking data",
                  "Have the budget for enterprise-grade contracts",
                  "Need vendor management and negotiation support",
                  "Require deep compliance and governance features",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                    <CheckCircle className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="faq-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon pricing compare to Zylo?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon starts at $39/month for startups and $119/month for growing teams. Zylo typically
                requires enterprise contracts starting at $50,000+ per year, making it 100x more expensive
                for smaller companies. Both platforms offer enterprise-level features, but Efficyon is designed
                to be accessible at every company size.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon handle the same number of SaaS applications as Zylo?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon integrates with 50+ business tools and can track and analyze your entire SaaS
                stack regardless of size. While Zylo may have a larger discovery database for very large
                enterprises with hundreds of unknown apps, Efficyon covers all the major applications most
                businesses use and focuses on maximizing savings from your known stack.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Is it easy to switch from Zylo to Efficyon?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Most teams can set up Efficyon in under a day. You can export your SaaS inventory
                from Zylo and Efficyon&apos;s onboarding process will help you reconnect your tools and start
                getting AI-powered insights within the first week. Our support team can assist with migration.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon offer the same SaaS discovery features as Zylo?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon focuses on cost optimization and usage analysis rather than shadow IT discovery.
                While Zylo has broader discovery capabilities for very large enterprises, Efficyon excels
                at connecting spend data with actual usage to find concrete savings opportunities. If shadow
                IT discovery is your primary concern, Zylo may be the better fit.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What makes Efficyon&apos;s AI different from Zylo&apos;s analytics?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon uses AI to actively compare your spending with real usage data across all connected
                tools, then generates prioritized, actionable recommendations with estimated savings. Zylo
                provides analytics dashboards and benchmarking but focuses more on visibility than automated
                AI-driven recommendations. The difference is between being told what to do versus figuring
                it out yourself from data.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to see what Efficyon can find?
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Start your free analysis and see AI-powered savings recommendations within your first week.
            No enterprise contracts, no long implementations. Just results backed by a 90-day ROI guarantee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
            >
              Start Free Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-medium border border-white/10 bg-white/5 text-gray-200 rounded-lg hover:border-white/20 hover:bg-white/10 hover:text-white transition-all duration-300"
            >
              View All Comparisons
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
