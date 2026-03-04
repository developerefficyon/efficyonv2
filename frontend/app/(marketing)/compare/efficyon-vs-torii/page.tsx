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
  Workflow,
  Settings,
  TrendingUp,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Torii Alternative - Efficyon vs Torii SaaS Management Compared",
    description:
      "Looking for a Torii alternative? Compare Efficyon vs Torii for SaaS management. See how AI-powered cost optimization compares to IT workflow automation.",
    alternates: {
      canonical: "/compare/efficyon-vs-torii",
    },
    openGraph: {
      title: "Efficyon vs Torii: SaaS Management Compared",
      description:
        "Compare Efficyon and Torii across features, pricing, and approach. Find the right SaaS management platform for your team.",
      url: "https://www.efficyon.com/compare/efficyon-vs-torii",
    },
  }
}

export default function EfficyonVsToriiPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Efficyon vs Torii: SaaS Management Compared",
    description:
      "Detailed comparison of Efficyon and Torii SaaS management platforms. Compare AI cost optimization versus IT workflow automation.",
    url: "https://www.efficyon.com/compare/efficyon-vs-torii",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the main difference between Efficyon and Torii?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is focused on AI-powered cost optimization, analyzing spend vs usage to find savings. Torii is focused on IT workflow automation, helping IT teams manage SaaS operations like onboarding, offboarding, and access management. They solve different primary problems.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use Efficyon and Torii together?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Some organizations use Torii for IT operations and workflow automation while using Efficyon for cost optimization and financial analysis. The platforms address different needs and can complement each other.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon pricing compare to Torii?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon offers transparent pricing starting at $39/month. Torii uses custom enterprise pricing that typically starts in the mid-five figures annually. Efficyon is significantly more accessible for small and mid-size companies.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon have workflow automation like Torii?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon includes basic workflow capabilities for implementing optimization recommendations, but it is not designed as a full IT workflow automation platform. If extensive onboarding/offboarding automation is your primary need, Torii may be a better fit.",
        },
      },
      {
        "@type": "Question",
        name: "Which platform is better for reducing SaaS costs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is specifically designed for cost reduction, using AI to analyze spend against usage and generate actionable savings recommendations. While Torii can help identify unused licenses, its primary strength is workflow automation rather than deep cost analysis.",
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
              <Settings className="h-4 w-4" />
              SaaS Management Comparison
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Efficyon vs Torii: SaaS Management Compared
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Torii and Efficyon both help you manage your SaaS stack, but they approach it from very
              different angles. Torii is an IT workflow automation platform. Efficyon is an AI-powered
              cost optimization engine. Here is how they compare -- and which might be right for you.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Comparison Table */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Quick Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Feature</th>
                  <th className="text-center py-4 px-6 text-cyan-400 font-semibold">Efficyon</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-semibold">Torii</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Starting Price", efficyon: "From $39/mo", torii: "Custom (enterprise)" },
                  { feature: "Primary Focus", efficyon: "Cost optimization", torii: "IT workflow automation" },
                  { feature: "AI Recommendations", efficyon: true, torii: false },
                  { feature: "Spend vs Usage Analysis", efficyon: true, torii: "Limited" },
                  { feature: "Workflow Automation", efficyon: "Basic", torii: "Extensive" },
                  { feature: "Onboarding/Offboarding", efficyon: false, torii: true },
                  { feature: "Accounting Integration", efficyon: true, torii: false },
                  { feature: "ROI Guarantee", efficyon: "90-day guarantee", torii: "No" },
                  { feature: "Self-Service Setup", efficyon: true, torii: "Assisted" },
                  { feature: "License Optimization", efficyon: "AI-driven", torii: "Basic reporting" },
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
                      {typeof row.torii === "boolean" ? (
                        row.torii ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-200">{row.torii}</span>
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
            {/* Core Philosophy */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">Core Philosophy</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon was built around one question: &quot;How much are you wasting on SaaS, and what should
                  you do about it?&quot; The platform connects to your accounting systems and SaaS tools, then
                  uses AI to compare real spending with actual usage. The output is a prioritized list of
                  specific actions that will save you money.
                </p>
                <p className="text-gray-400 text-sm">
                  Torii was built around a different question: &quot;How can IT teams efficiently manage the SaaS
                  lifecycle?&quot; It excels at automating IT operations -- employee onboarding and offboarding,
                  license provisioning, access management, and workflow triggers. It is an operations platform
                  first, with cost visibility as a secondary benefit.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">The key distinction</h4>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  Think of it this way: if your primary pain is &quot;We are spending too much on SaaS and need
                  to reduce costs,&quot; Efficyon is the better tool. If your primary pain is &quot;Our IT team
                  spends too much time on SaaS operations,&quot; Torii is the better tool.
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Many companies have both problems, which is why some organizations use both platforms for
                  their respective strengths.
                </p>
              </div>
            </div>

            {/* Cost Analysis Depth */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Cost Analysis Depth</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon provides deep financial analysis by connecting directly to your accounting system.
                  It tracks actual payments (not just contract values), identifies discrepancies between
                  contracts and invoices, spots pricing anomalies, and cross-references all of this with
                  usage data to generate AI recommendations with specific dollar amounts attached.
                </p>
                <p className="text-gray-400 text-sm">
                  Torii tracks SaaS spending primarily through contract data and integrations. It can show
                  you what you are paying for each tool and flag unused licenses, but it does not connect
                  to accounting systems for payment-level accuracy. Cost analysis is available but is not
                  the platform&apos;s primary focus.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-green-400 mb-3">Savings identification example</h4>
                <div className="space-y-4 text-sm text-gray-300">
                  <div>
                    <span className="text-cyan-400 font-medium">Efficyon would tell you:</span>
                    <p className="mt-1">&quot;You have 12 Notion licenses at $8/mo each, but only 5 show active usage
                    in the past 60 days. Downgrading to 5 licenses saves $672/year. Additionally, 3 users
                    could switch to the free tier based on their feature usage.&quot;</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Torii would tell you:</span>
                    <p className="mt-1">&quot;You have 12 Notion licenses. 7 users have not logged in within 30 days.&quot;
                    The cost calculation and recommendation is left to you.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Automation */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Workflow className="h-6 w-6 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">Workflow Automation</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  This is where Torii genuinely excels. The platform offers robust workflow automation for
                  IT operations: automated employee onboarding with license provisioning, offboarding with
                  access revocation, renewal management workflows, and custom triggers for various SaaS
                  lifecycle events. It is an IT operations platform at its core.
                </p>
                <p className="text-gray-400 text-sm">
                  Efficyon includes basic workflow features for implementing optimization recommendations
                  (such as flagging licenses for review or scheduling optimization tasks), but it is not
                  designed as a full IT workflow automation tool. If your team needs sophisticated
                  onboarding/offboarding automation, Torii has the edge here.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-purple-400 mb-3">Torii&apos;s workflow strengths</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    Automated new employee SaaS provisioning
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    Offboarding workflows with license reclamation
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    Custom workflow triggers and actions
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    Renewal management and approval flows
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    Self-service app request portals
                  </li>
                </ul>
              </div>
            </div>

            {/* ROI & Financial Tracking */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">ROI & Financial Tracking</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon includes built-in ROI tracking that shows the dollar impact of every optimization
                  you implement. You can see exactly how much you have saved, track savings over time, and
                  measure the platform&apos;s own ROI against your subscription cost. The 90-day ROI guarantee
                  ensures you see measurable value.
                </p>
                <p className="text-gray-400 text-sm">
                  Torii provides spend tracking and can show trends in your SaaS costs over time, but it
                  does not include dedicated ROI tracking for optimization actions. Measuring the impact
                  of changes typically requires manual tracking or integration with other financial tools.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-blue-400 mb-3">Efficyon ROI dashboard</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Efficyon&apos;s ROI dashboard shows total savings identified, savings implemented, savings
                  in progress, and projected future savings. Each recommendation tracks from identification
                  through implementation to verified savings, giving your finance team clear documentation
                  of cost optimization impact.
                </p>
              </div>
            </div>

            {/* Setup & Time to Value */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-orange-400" />
                  <h3 className="text-xl font-semibold text-white">Setup & Time to Value</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon is designed for self-service setup. Connect your accounting system and SaaS tools,
                  and the AI starts analyzing immediately. Most teams see their first recommendations within
                  a week and measurable savings within 30-60 days.
                </p>
                <p className="text-gray-400 text-sm">
                  Torii offers an assisted setup process that is more involved, as configuring workflow
                  automations requires careful planning around your organization&apos;s processes. Time to value
                  depends on implementation complexity, but full deployment typically takes several weeks.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-orange-400 mb-3">Getting started</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <p><span className="text-cyan-400 font-medium">Efficyon:</span> Sign up, connect tools, receive
                  AI recommendations within days. No implementation project required.</p>
                  <p><span className="text-gray-500 font-medium">Torii:</span> Plan workflows, configure automations,
                  test triggers, train IT team. Full value requires thoughtful implementation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Pricing Comparison</h2>
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
              <h3 className="text-xl font-semibold text-white mb-2">Torii</h3>
              <p className="text-gray-400 text-sm mb-6">Custom pricing, contact sales</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Pricing model</span>
                  <span className="text-white font-semibold">Per employee/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Typical starting cost</span>
                  <span className="text-white font-semibold">Mid 5-figures/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Contract length</span>
                  <span className="text-white font-semibold">Annual</span>
                </div>
                <div className="text-gray-400 text-sm pt-2">
                  Pricing not publicly listed; varies by organization size
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
            Why Teams Choose Efficyon Over Torii
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Cost savings are the top priority",
                description:
                  "When the primary goal is reducing SaaS spend, Efficyon's AI-driven cost analysis delivers deeper insights and more actionable recommendations than Torii's reporting capabilities. Efficyon was built for one thing: finding and eliminating waste.",
              },
              {
                title: "No IT team to run workflows",
                description:
                  "Many SMBs and mid-market companies don't have a dedicated IT team to build and maintain workflow automations. Efficyon requires no workflow configuration -- it simply analyzes your data and tells you where to save money.",
              },
              {
                title: "Accounting-level financial accuracy",
                description:
                  "Efficyon connects to your accounting system for payment-level accuracy. This catches discrepancies that contract-based tracking misses: overages, mid-cycle changes, and forgotten add-ons that inflate your actual spend.",
              },
              {
                title: "Faster ROI with less setup",
                description:
                  "Efficyon's self-service setup means you start getting value in days, not weeks. There is no implementation project, no workflow configuration phase, and no training required. Connect your tools and the AI does the rest.",
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Who Should Choose What?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-cyan-500/20 rounded-xl p-8 bg-cyan-500/[0.03]">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">Choose Efficyon if you...</h3>
              <ul className="space-y-3">
                {[
                  "Want to reduce SaaS costs as your primary goal",
                  "Need AI-powered recommendations, not just data",
                  "Want accounting-level spend accuracy",
                  "Are an SMB or mid-market company",
                  "Need fast self-service setup",
                  "Want ROI tracking and a 90-day guarantee",
                  "Don't have a large IT team for workflow configuration",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                    <CheckCircle className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-300 mb-4">Consider Torii if you...</h3>
              <ul className="space-y-3">
                {[
                  "Need robust IT workflow automation",
                  "Want automated onboarding/offboarding",
                  "Have a dedicated IT operations team",
                  "Need self-service app request portals",
                  "Prioritize IT efficiency over cost reduction",
                  "Want custom workflow triggers and actions",
                  "Need renewal management automation",
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
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="faq-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What is the main difference between Efficyon and Torii?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon is focused on AI-powered cost optimization, analyzing spend vs usage to find savings.
                Torii is focused on IT workflow automation, helping IT teams manage SaaS operations like
                onboarding, offboarding, and access management. They solve different primary problems, though
                both fall under the SaaS management umbrella.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can I use Efficyon and Torii together?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Some organizations use Torii for IT operations and workflow automation while using
                Efficyon for cost optimization and financial analysis. The platforms address different needs
                and can complement each other. Efficyon finds the savings; Torii helps IT manage the
                operational changes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon pricing compare to Torii?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon offers transparent pricing starting at $39/month for startups and $119/month for
                growing teams. Torii uses custom enterprise pricing that typically starts in the mid-five
                figures annually. Efficyon is significantly more accessible for small and mid-size companies
                that want SaaS cost optimization without enterprise pricing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon have workflow automation like Torii?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon includes basic workflow capabilities for implementing optimization recommendations,
                but it is not designed as a full IT workflow automation platform. If extensive
                onboarding/offboarding automation and custom IT workflows are your primary need, Torii is
                the stronger choice in that area.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Which platform is better for reducing SaaS costs?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon is specifically designed for cost reduction, using AI to analyze spend against
                usage and generate actionable savings recommendations with dollar amounts. While Torii can
                help identify unused licenses, its primary strength is workflow automation rather than deep
                cost analysis. For pure cost optimization, Efficyon is the more focused tool.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to optimize your SaaS costs?
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Start your free analysis and see where your SaaS spending can be optimized. AI-powered
            recommendations in days, measurable savings within a quarter. Backed by our 90-day ROI guarantee.
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
