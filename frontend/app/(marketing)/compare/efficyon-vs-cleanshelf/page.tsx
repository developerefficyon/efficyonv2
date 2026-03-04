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
  RefreshCw,
  Plug,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cleanshelf Alternative - Modern SaaS Cost Optimization | Efficyon",
    description:
      "Looking for a Cleanshelf alternative? Cleanshelf was acquired by Zylo and is no longer independently developed. Efficyon offers a modern, AI-powered alternative with active development and transparent pricing.",
    alternates: {
      canonical: "/compare/efficyon-vs-cleanshelf",
    },
    openGraph: {
      title: "Looking for a Cleanshelf Alternative? Try Efficyon",
      description:
        "Cleanshelf was acquired by Zylo. Efficyon is the modern, actively developed alternative for SaaS cost optimization with AI-powered analysis.",
      url: "https://www.efficyon.com/compare/efficyon-vs-cleanshelf",
    },
  }
}

export default function EfficyonVsCleanshelfPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Looking for a Cleanshelf Alternative? Try Efficyon",
    description:
      "Cleanshelf was acquired by Zylo and is no longer independently developed. Compare with Efficyon as a modern, AI-powered SaaS cost optimization alternative.",
    url: "https://www.efficyon.com/compare/efficyon-vs-cleanshelf",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What happened to Cleanshelf?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cleanshelf was acquired by Zylo, a larger SaaS management platform. Since the acquisition, Cleanshelf has been integrated into Zylo's product and is no longer available as an independent, standalone platform. Existing Cleanshelf customers have been transitioned to Zylo.",
        },
      },
      {
        "@type": "Question",
        name: "Is Efficyon a good replacement for Cleanshelf?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon covers all the core SaaS spend management capabilities that Cleanshelf offered, and adds AI-powered analysis, accounting system integration, and usage-based optimization that go beyond what Cleanshelf provided. Pricing starts at $39/month with a 90-day ROI guarantee.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon compare to Zylo (which acquired Cleanshelf)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Zylo is an enterprise platform with pricing starting at $50,000+/year. Efficyon offers similar cost optimization capabilities with AI-powered analysis starting at $39/month. For SMBs and mid-market companies, Efficyon is a more accessible and cost-effective alternative.",
        },
      },
      {
        "@type": "Question",
        name: "Can I migrate my data from Cleanshelf to Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "While there is no direct migration tool, Efficyon's onboarding process connects directly to your SaaS tools and accounting systems to rebuild your SaaS inventory automatically. Most teams are fully set up within a few days without needing to manually migrate data.",
        },
      },
      {
        "@type": "Question",
        name: "What does Efficyon offer that Cleanshelf did not?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon adds AI-powered analysis that compares spend with actual usage, direct accounting system integration for payment-level accuracy, automated prioritized recommendations with estimated savings, ROI tracking, and a 90-day ROI guarantee. These capabilities represent the next generation of SaaS cost optimization.",
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
              <RefreshCw className="h-4 w-4" />
              Cleanshelf Alternative
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Looking for a Cleanshelf Alternative? Try Efficyon
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Cleanshelf was a solid SaaS spend management tool -- but it was acquired by Zylo and is
              no longer independently developed. If you are looking for a modern, actively maintained
              alternative with AI-powered cost optimization, Efficyon picks up where Cleanshelf left off
              and goes further.
            </p>
          </div>
        </div>
      </section>

      {/* Context Banner */}
      <section className="py-8 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="border border-yellow-500/20 rounded-xl p-6 bg-yellow-500/[0.03]">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  What happened to Cleanshelf?
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Cleanshelf, a SaaS spend management platform, was acquired by Zylo. Since the acquisition,
                  Cleanshelf&apos;s product has been integrated into Zylo&apos;s enterprise platform and is no longer
                  available as an independent tool. Existing Cleanshelf customers were transitioned to Zylo,
                  which comes with enterprise pricing starting at $50,000+/year. For teams that valued
                  Cleanshelf&apos;s focused, accessible approach to SaaS spend management, Efficyon offers a
                  modern alternative.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Comparison Table */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Cleanshelf vs Efficyon: Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Feature</th>
                  <th className="text-center py-4 px-6 text-cyan-400 font-semibold">Efficyon</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-semibold">Cleanshelf (legacy)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Status", efficyon: "Actively developed", cleanshelf: "Acquired by Zylo" },
                  { feature: "Starting Price", efficyon: "From $39/mo", cleanshelf: "Now part of Zylo ($50K+/yr)" },
                  { feature: "AI-Powered Analysis", efficyon: true, cleanshelf: false },
                  { feature: "Spend vs Usage Comparison", efficyon: true, cleanshelf: false },
                  { feature: "Accounting Integration", efficyon: true, cleanshelf: "Limited" },
                  { feature: "SaaS Spend Tracking", efficyon: true, cleanshelf: true },
                  { feature: "License Optimization", efficyon: "AI-automated", cleanshelf: "Manual review" },
                  { feature: "Ongoing Product Updates", efficyon: "Continuous", cleanshelf: "Discontinued" },
                  { feature: "ROI Guarantee", efficyon: "90-day guarantee", cleanshelf: "No" },
                  { feature: "Independent Platform", efficyon: true, cleanshelf: false },
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
                      {typeof row.cleanshelf === "boolean" ? (
                        row.cleanshelf ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-200">{row.cleanshelf}</span>
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
            What Efficyon Adds Beyond Cleanshelf
          </h2>

          <div className="space-y-16">
            {/* AI-Powered Analysis */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">AI-Powered Cost Analysis</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Cleanshelf provided SaaS spend tracking and basic optimization suggestions. It helped
                  you see what you were paying, but the analysis and action planning was largely manual.
                  You could see your subscriptions and costs, but identifying the best optimization
                  opportunities required human judgment.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon uses AI to go far beyond tracking. It compares your spending against real usage
                  data across all connected tools, identifies patterns that humans would miss, and generates
                  prioritized recommendations with specific dollar amounts. The AI learns your organization&apos;s
                  patterns and continuously finds new savings opportunities.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">The evolution from tracking to intelligence</h4>
                <div className="space-y-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-500 font-medium">Cleanshelf era (tracking):</span>
                    <p className="mt-1">&quot;You have 45 SaaS subscriptions costing $28,000/month.&quot;</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-medium">Efficyon era (intelligence):</span>
                    <p className="mt-1">&quot;You have 45 SaaS subscriptions costing $28,000/month. Here are 12 specific
                    actions ranked by impact that will save you $6,200/month, starting with consolidating
                    your project management tools from 3 to 1.&quot;</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting Integration */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Accounting System Integration</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  One of Efficyon&apos;s key differentiators is direct integration with accounting systems. This
                  means your cost data comes from actual invoices and payments, not just contract values or
                  credit card statements. The result is significantly more accurate spend analysis.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Cleanshelf relied on contract data and expense integrations, which often lagged behind
                  actual spending. Mid-cycle upgrades, overage charges, and invoice discrepancies could go
                  unnoticed until a manual audit. Efficyon catches these automatically.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-green-400 mb-3">Why accounting data matters</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  In our analysis, organizations typically find a 10-20% discrepancy between contract values
                  and actual payments. This means if you are tracking costs based on contracts alone, you
                  could be underestimating your SaaS spend by thousands of dollars per month. Accounting
                  system integration closes this gap entirely.
                </p>
              </div>
            </div>

            {/* Modern Integrations */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Plug className="h-6 w-6 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">Modern Integration Ecosystem</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Since Cleanshelf is no longer actively developed, its integration library is frozen in time.
                  New SaaS tools, updated APIs, and modern authentication methods are not being supported.
                  Over time, existing integrations may break as the tools they connect to evolve.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon maintains an actively growing library of 50+ integrations that are continuously
                  updated. New tools are added regularly, and existing integrations are maintained to work
                  with the latest API versions. This ensures your SaaS management platform stays current
                  as your tech stack evolves.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-purple-400 mb-3">Integration matters</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  SaaS tools frequently update their APIs, add new features, and change authentication
                  methods. An actively maintained integration library means Efficyon keeps pace with these
                  changes. A frozen integration library means increasing compatibility issues over time,
                  data gaps, and growing manual work to fill the holes.
                </p>
              </div>
            </div>

            {/* Continuous Innovation */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <RefreshCw className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Continuous Product Innovation</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  When a product is acquired and absorbed into a larger platform, its development trajectory
                  changes. Cleanshelf&apos;s roadmap is now determined by Zylo&apos;s priorities, and the original
                  product vision may not continue independently.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon is independently funded and 100% focused on SaaS cost optimization. Every product
                  update, every new feature, and every improvement is directed at helping you save money on
                  SaaS. You benefit from a team entirely dedicated to solving this one problem exceptionally well.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-blue-400 mb-3">Product development focus</h4>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  Efficyon&apos;s development is focused entirely on cost optimization:
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    Regular feature releases and improvements
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    New integrations added continuously
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    AI model improvements for better recommendations
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    Customer feedback directly shapes the roadmap
                  </li>
                </ul>
              </div>
            </div>

            {/* Transparent Pricing */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Transparent, Accessible Pricing</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Cleanshelf is now part of Zylo, which means enterprise pricing. If you previously used
                  Cleanshelf at a reasonable price point, the transition to Zylo likely means a significant
                  cost increase -- potentially 10x or more for smaller organizations.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon maintains transparent pricing accessible to companies of all sizes. The Startup
                  plan at $39/month and Growth plan at $119/month deliver advanced AI-powered cost optimization
                  at a fraction of enterprise platform pricing. And every plan comes with a 90-day ROI guarantee.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-green-400 mb-3">Pricing comparison</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Efficyon Startup</span>
                    <span className="text-green-400 font-medium">$39/mo</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Efficyon Growth</span>
                    <span className="text-green-400 font-medium">$119/mo</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Efficyon Enterprise</span>
                    <span className="text-white font-medium">Custom</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-gray-300">
                    <span>Zylo (includes Cleanshelf)</span>
                    <span className="text-red-400 font-medium">$50,000+/year</span>
                  </div>
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
            Why Former Cleanshelf Users Choose Efficyon
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Active development they can count on",
                description:
                  "After experiencing what happens when a product gets acquired and development stops, teams want assurance that their SaaS management tool will continue to evolve. Efficyon is independently focused on continuous improvement.",
              },
              {
                title: "AI capabilities Cleanshelf never had",
                description:
                  "Efficyon represents the next generation of SaaS cost management. AI-powered spend vs usage analysis, automated recommendations, and predictive insights go far beyond the manual tracking and basic reporting that Cleanshelf offered.",
              },
              {
                title: "Pricing that stays accessible",
                description:
                  "The transition from Cleanshelf to Zylo meant a massive price jump for many teams. Efficyon keeps advanced SaaS cost optimization accessible with pricing starting at $39/month, not $50,000/year.",
              },
              {
                title: "Modern technology and integrations",
                description:
                  "Built on modern infrastructure with a growing integration library, Efficyon stays compatible with the latest SaaS tools and APIs. No more worrying about integrations breaking because the product is no longer maintained.",
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
                  "Were a Cleanshelf user looking for a modern replacement",
                  "Want AI-powered cost optimization, not just tracking",
                  "Need an actively developed, independent platform",
                  "Want transparent pricing accessible to SMBs",
                  "Value accounting-level accuracy in spend data",
                  "Want a 90-day ROI guarantee",
                  "Need modern integrations that stay up to date",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                    <CheckCircle className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-300 mb-4">Consider Zylo (Cleanshelf&apos;s parent) if you...</h3>
              <ul className="space-y-3">
                {[
                  "Are a large enterprise (5,000+ employees)",
                  "Need extensive SaaS discovery for shadow IT",
                  "Have the budget for enterprise contracts ($50K+/yr)",
                  "Want benchmarking data from a large customer base",
                  "Need vendor management and negotiation support",
                  "Require deep compliance and governance features",
                  "Already have a Zylo contract from the Cleanshelf transition",
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
                What happened to Cleanshelf?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Cleanshelf was acquired by Zylo, a larger SaaS management platform. Since the acquisition,
                Cleanshelf has been integrated into Zylo&apos;s product and is no longer available as an
                independent, standalone platform. Existing Cleanshelf customers have been transitioned to
                Zylo, which comes with enterprise-level pricing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Is Efficyon a good replacement for Cleanshelf?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon covers all the core SaaS spend management capabilities that Cleanshelf offered,
                and adds AI-powered analysis, accounting system integration, and usage-based optimization
                that go beyond what Cleanshelf provided. Pricing starts at $39/month with a 90-day ROI
                guarantee, making it accessible to the same market Cleanshelf served.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon compare to Zylo (which acquired Cleanshelf)?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Zylo is an enterprise platform with pricing starting at $50,000+/year, designed for large
                organizations with thousands of employees. Efficyon offers AI-powered cost optimization
                with transparent pricing starting at $39/month. For SMBs and mid-market companies that
                valued Cleanshelf&apos;s accessibility, Efficyon is the more natural successor. For a detailed
                comparison, see our{" "}
                <Link href="/compare/efficyon-vs-zylo" className="text-cyan-400 hover:underline">
                  Efficyon vs Zylo page
                </Link>.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Can I migrate my data from Cleanshelf to Efficyon?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                While there is no direct migration tool, Efficyon&apos;s onboarding process connects directly
                to your SaaS tools and accounting systems to rebuild your SaaS inventory automatically. Most
                teams are fully set up within a few days without needing to manually migrate data. Our
                support team can assist if you need help with the transition.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What does Efficyon offer that Cleanshelf did not?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon adds AI-powered analysis that compares spend with actual usage, direct accounting
                system integration for payment-level accuracy, automated prioritized recommendations with
                estimated savings amounts, built-in ROI tracking, and a 90-day ROI guarantee. These
                capabilities represent the next generation of SaaS cost optimization beyond Cleanshelf&apos;s
                spend tracking approach.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready for a modern Cleanshelf alternative?
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Efficyon picks up where Cleanshelf left off -- and goes much further with AI-powered analysis.
            Start your free analysis and see why teams are choosing the next generation of SaaS cost optimization.
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
