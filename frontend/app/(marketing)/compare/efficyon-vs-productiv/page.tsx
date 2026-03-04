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
  Target,
  Activity,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Productiv Alternative - Efficyon vs Productiv SaaS Intelligence Comparison",
    description:
      "Looking for a Productiv alternative? Compare Efficyon vs Productiv for SaaS intelligence and cost optimization. See how actionable AI compares to engagement analytics.",
    alternates: {
      canonical: "/compare/efficyon-vs-productiv",
    },
    openGraph: {
      title: "Efficyon vs Productiv: SaaS Intelligence Platforms Compared",
      description:
        "Compare Efficyon and Productiv for SaaS analytics and cost optimization. Discover which platform delivers better ROI for your business.",
      url: "https://www.efficyon.com/compare/efficyon-vs-productiv",
    },
  }
}

export default function EfficyonVsProductivPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Efficyon vs Productiv: SaaS Intelligence Platforms Compared",
    description:
      "Detailed comparison of Efficyon and Productiv SaaS intelligence platforms. Compare AI cost optimization versus engagement analytics.",
    url: "https://www.efficyon.com/compare/efficyon-vs-productiv",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the difference between Efficyon and Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon focuses on cost optimization, using AI to analyze spend vs usage and generate savings recommendations. Productiv focuses on engagement analytics, providing deep insights into how employees use SaaS applications. Efficyon answers 'where can we save money?' while Productiv answers 'how are people using our tools?'",
        },
      },
      {
        "@type": "Question",
        name: "Is Efficyon cheaper than Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, significantly. Efficyon starts at $39/month with transparent pricing. Productiv uses enterprise pricing that typically starts in the six figures annually. Efficyon is designed to be accessible to companies of all sizes, while Productiv primarily serves large enterprises.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon offer engagement analytics like Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon tracks usage data to identify underutilized tools and licenses, but it does not offer the same depth of engagement analytics as Productiv (such as feature-level adoption metrics). Efficyon uses usage data primarily to drive cost optimization recommendations rather than detailed adoption reporting.",
        },
      },
      {
        "@type": "Question",
        name: "Which platform has a faster ROI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is designed for rapid ROI, with most teams seeing savings recommendations within the first week and measurable cost reductions within 30-60 days. Efficyon backs this with a 90-day ROI guarantee. Productiv's ROI comes through improved adoption and reduced waste over time, which typically takes longer to measure.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use both Efficyon and Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Some large organizations use Productiv for deep engagement analytics and adoption insights, while using Efficyon for cost optimization and financial analysis. However, for most companies, Efficyon's usage tracking combined with cost analysis provides sufficient insight without needing a separate engagement analytics platform.",
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
              <Activity className="h-4 w-4" />
              SaaS Intelligence Comparison
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Efficyon vs Productiv: SaaS Intelligence Platforms Compared
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Both Efficyon and Productiv analyze your SaaS stack, but they answer different questions.
              Productiv focuses on how employees engage with applications. Efficyon focuses on where you
              can save money. Here is a thorough comparison to help you decide which approach fits your needs.
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
                  <th className="text-center py-4 px-6 text-gray-300 font-semibold">Productiv</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Starting Price", efficyon: "From $39/mo", productiv: "Enterprise only (6 figures+)" },
                  { feature: "Primary Focus", efficyon: "Cost optimization", productiv: "Engagement analytics" },
                  { feature: "AI Recommendations", efficyon: true, productiv: "Limited" },
                  { feature: "Spend vs Usage Analysis", efficyon: true, productiv: "Partial" },
                  { feature: "Feature-Level Analytics", efficyon: "Basic", productiv: "Extensive" },
                  { feature: "Accounting Integration", efficyon: true, productiv: false },
                  { feature: "ROI Guarantee", efficyon: "90-day guarantee", productiv: "No" },
                  { feature: "Deployment Time", efficyon: "Days", productiv: "Weeks to months" },
                  { feature: "SMB Plans Available", efficyon: true, productiv: false },
                  { feature: "Adoption Benchmarking", efficyon: "Growing", productiv: "Extensive" },
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
                      {typeof row.productiv === "boolean" ? (
                        row.productiv ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-200">{row.productiv}</span>
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
            {/* Analytics vs Optimization */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">Analytics vs. Optimization</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Productiv is a SaaS intelligence platform that excels at measuring how employees engage
                  with applications. It provides deep feature-level analytics, adoption rates, and engagement
                  scores that help IT and procurement teams understand tool utilization at a granular level.
                  This is genuinely powerful for large enterprises managing hundreds of applications.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon takes a different approach. While it tracks usage data, the goal is not engagement
                  reporting -- it is cost optimization. Every piece of usage data Efficyon collects is
                  cross-referenced with spending data to answer one question: &quot;Where can you save money, and
                  how much?&quot; The output is prioritized, actionable recommendations with specific dollar amounts.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Different outputs for different goals</h4>
                <div className="space-y-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-500 font-medium">Productiv output:</span>
                    <p className="mt-1">&quot;Slack has 89% adoption across the organization. 45% of users engage
                    with channels daily. Huddle feature adoption is 12%.&quot;</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-medium">Efficyon output:</span>
                    <p className="mt-1">&quot;You are paying for 200 Slack Business+ licenses at $12.50/user/month.
                    47 users have minimal activity. Downgrading them to free tier saves $7,050/year.
                    Additionally, 23 users overlap with Teams usage -- consolidating saves $3,450/year.&quot;</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Analysis */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Cost Analysis Depth</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon integrates with accounting systems to pull actual payment data, giving you an
                  accurate picture of what you are truly spending on each SaaS tool. It identifies discrepancies
                  between contracts and payments, catches overages, and tracks cost trends over time. Every
                  analysis is tied to a dollar amount.
                </p>
                <p className="text-gray-400 text-sm">
                  Productiv provides cost data primarily through contract and license information. It can
                  show you the cost of underutilized licenses, but its financial analysis is secondary to
                  its engagement analytics. The cost insights are useful but not as deep or actionable as
                  a purpose-built cost optimization platform.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-green-400 mb-3">Efficyon&apos;s financial edge</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    Direct accounting system integration
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    Invoice vs contract discrepancy detection
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    Prioritized savings recommendations with dollar amounts
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    ROI tracking for implemented optimizations
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    Cost trend analysis and forecasting
                  </li>
                </ul>
              </div>
            </div>

            {/* Accessibility & Pricing */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">Accessibility & Pricing</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Productiv is designed for large enterprises and prices accordingly. Annual contracts
                  typically start in the six figures, reflecting the depth of its engagement analytics
                  and the scale of organizations it serves. This pricing makes it inaccessible for most
                  small and mid-size companies.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon offers transparent pricing starting at $39/month for startups and $119/month
                  for growing teams. This makes advanced SaaS cost optimization available to companies
                  that would never be able to afford Productiv or similar enterprise tools. And every
                  plan includes a 90-day ROI guarantee, so you know you will see value.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-purple-400 mb-3">Making the math work</h4>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  For a 100-person company spending $50,000/month on SaaS:
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Efficyon Growth plan cost</span>
                    <span className="text-green-400 font-medium">$1,428/year</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Expected savings (15-25% of SaaS spend)</span>
                    <span className="text-green-400 font-medium">$90,000-150,000/year</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-gray-300">
                    <span>ROI</span>
                    <span className="text-green-400 font-bold">63x-105x</span>
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
                  Efficyon is designed for rapid deployment and fast results. Self-service setup takes
                  hours, not weeks. Most teams see their first AI-powered savings recommendations within
                  the first week, and measurable cost reductions within 30-60 days.
                </p>
                <p className="text-gray-400 text-sm">
                  Productiv&apos;s enterprise deployment typically takes longer, as it requires integration
                  with multiple data sources to build comprehensive engagement analytics. The depth of
                  insights justifies the longer implementation for large enterprises, but it means weeks
                  to months before you see the full picture.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-blue-400 mb-3">Speed to savings</h4>
                <div className="space-y-4 text-sm">
                  <div className="text-gray-300">
                    <span className="text-cyan-400 font-medium">Efficyon timeline:</span>
                    <ul className="mt-2 ml-4 space-y-1">
                      <li>Day 1: Connect tools and accounting</li>
                      <li>Day 3-7: First AI recommendations</li>
                      <li>Week 2-4: Begin implementing savings</li>
                      <li>Month 1-3: Measurable ROI achieved</li>
                    </ul>
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-500 font-medium">Productiv timeline:</span>
                    <ul className="mt-2 ml-4 space-y-1">
                      <li>Week 1-4: Integration and data collection</li>
                      <li>Month 2-3: Engagement baselines established</li>
                      <li>Month 3-6: Actionable insights emerge</li>
                      <li>Month 6+: Optimization strategies developed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Approach */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-6 w-6 text-orange-400" />
                  <h3 className="text-xl font-semibold text-white">AI & Recommendations</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Efficyon&apos;s AI is specifically designed to find cost savings. It analyzes spending
                  patterns, usage data, license configurations, and pricing tiers across your entire
                  SaaS stack to generate specific, actionable recommendations. Each recommendation
                  includes an estimated dollar impact and implementation guidance.
                </p>
                <p className="text-gray-400 text-sm">
                  Productiv uses analytics to provide adoption and engagement insights, but it is not
                  primarily designed to generate cost optimization recommendations. Its intelligence
                  is oriented toward helping teams understand how well tools are adopted and where
                  training or change management might be needed. Cost savings are a byproduct, not the goal.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-orange-400 mb-3">The AI difference</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Efficyon&apos;s AI proactively tells you: &quot;Here are 15 actions that will save you $8,400/month,
                  ranked by ease of implementation and impact.&quot; It continuously scans for new opportunities
                  and adapts recommendations as your usage changes. Productiv&apos;s analytics give you the data
                  to make decisions, but the analysis and decision-making remain with your team.
                </p>
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
              <h3 className="text-xl font-semibold text-white mb-2">Productiv</h3>
              <p className="text-gray-400 text-sm mb-6">Enterprise contracts only</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Pricing model</span>
                  <span className="text-white font-semibold">Custom enterprise</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Typical annual cost</span>
                  <span className="text-white font-semibold">$100,000+/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Contract type</span>
                  <span className="text-white font-semibold">Annual enterprise</span>
                </div>
                <div className="text-gray-400 text-sm pt-2">
                  Pricing not publicly listed; designed for large enterprises
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
            Why Teams Choose Efficyon Over Productiv
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Savings, not just analytics",
                description:
                  "Teams want their SaaS management tool to tell them exactly where to save money and how much they will save. Efficyon delivers specific, dollar-quantified recommendations rather than requiring you to derive cost insights from engagement data.",
              },
              {
                title: "Accessible pricing for real companies",
                description:
                  "At $39/month to start, Efficyon makes enterprise-grade cost optimization available to companies of every size. Productiv's six-figure contracts put it out of reach for the vast majority of businesses that need SaaS cost help the most.",
              },
              {
                title: "Faster path to ROI",
                description:
                  "With setup in hours and recommendations in days, Efficyon delivers measurable savings within the first quarter -- guaranteed. Teams that need to reduce SaaS costs now, not in 6 months, choose Efficyon for its speed.",
              },
              {
                title: "Financial accuracy over engagement depth",
                description:
                  "For teams whose primary goal is reducing spend, accounting-level financial accuracy matters more than feature-level engagement metrics. Efficyon connects to your financial systems for the most accurate cost picture possible.",
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
                  "Want to reduce SaaS costs as your primary objective",
                  "Need AI-generated savings recommendations with dollar amounts",
                  "Want transparent, accessible pricing (starting $39/mo)",
                  "Need fast deployment and quick time to value",
                  "Value accounting-level financial accuracy",
                  "Want a 90-day ROI guarantee",
                  "Are an SMB or mid-market company",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                    <CheckCircle className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-300 mb-4">Consider Productiv if you...</h3>
              <ul className="space-y-3">
                {[
                  "Need deep feature-level engagement analytics",
                  "Are a large enterprise with 5,000+ employees",
                  "Have budget for six-figure annual contracts",
                  "Want detailed adoption benchmarking data",
                  "Need to drive SaaS adoption and change management",
                  "Care more about usage depth than cost reduction",
                  "Need app-level usage reporting for governance",
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
                What is the difference between Efficyon and Productiv?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon focuses on cost optimization, using AI to analyze spend vs usage and generate savings
                recommendations with specific dollar amounts. Productiv focuses on engagement analytics,
                providing deep insights into how employees use SaaS applications at a feature level. Efficyon
                answers &quot;where can we save money?&quot; while Productiv answers &quot;how are people using our tools?&quot;
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Is Efficyon cheaper than Productiv?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes, significantly. Efficyon starts at $39/month with transparent, published pricing.
                Productiv uses enterprise pricing that typically starts in the six figures annually. Efficyon
                is designed to be accessible to companies of all sizes, while Productiv primarily serves
                large enterprises with substantial SaaS management budgets.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon offer engagement analytics like Productiv?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon tracks usage data to identify underutilized tools and licenses, but it does not
                offer the same depth of engagement analytics as Productiv (such as feature-level adoption
                metrics and engagement scoring). Efficyon uses usage data primarily to drive cost optimization
                recommendations rather than detailed adoption reporting. If granular engagement analytics is
                your primary need, Productiv has the edge.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Which platform has a faster ROI?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon is designed for rapid ROI, with most teams seeing savings recommendations within
                the first week and measurable cost reductions within 30-60 days. Efficyon backs this with a
                90-day ROI guarantee. Productiv&apos;s ROI comes through improved adoption and reduced waste
                over time, which typically takes longer to measure and may require organizational change
                management to realize.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can I use both Efficyon and Productiv?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Some large organizations use Productiv for deep engagement analytics and adoption
                insights while using Efficyon for cost optimization and financial analysis. However, for
                most companies, Efficyon&apos;s usage tracking combined with cost analysis provides sufficient
                insight for both optimization and adoption decisions without needing a separate engagement
                analytics platform.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to turn analytics into actual savings?
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Stop analyzing and start saving. Efficyon&apos;s AI tells you exactly where to cut costs and
            how much you will save. Start your free analysis today with our 90-day ROI guarantee.
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
