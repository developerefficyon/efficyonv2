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
  Trophy,
  Star,
  DollarSign,
  Brain,
  Building2,
  Workflow,
  BarChart3,
  FileSpreadsheet,
  CreditCard,
  Users,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Best SaaS Cost Optimization Tools in 2026 - Complete Guide",
    description:
      "Compare the best SaaS cost optimization tools in 2026: Efficyon, Zylo, Torii, Productiv, Cleanshelf, Vendr, Cledara, and manual methods. Honest reviews with pricing, features, and recommendations.",
    alternates: {
      canonical: "/compare/best-saas-cost-optimization-tools",
    },
    openGraph: {
      title: "Best SaaS Cost Optimization Tools in 2026: Complete Guide",
      description:
        "Comprehensive guide to the best SaaS cost optimization and management tools. Compare 8 solutions across pricing, features, and ideal use cases.",
      url: "https://www.efficyon.com/compare/best-saas-cost-optimization-tools",
    },
  }
}

const tools = [
  {
    name: "Efficyon",
    tagline: "Best overall for SMBs and mid-market",
    icon: Brain,
    color: "cyan",
    overview:
      "Efficyon is an AI-powered SaaS cost optimization platform that connects to your accounting systems and SaaS tools to compare real spending with actual usage. Its AI generates prioritized, actionable recommendations with specific dollar savings, making it the most focused tool for companies that want to reduce SaaS waste quickly.",
    features: [
      "AI-powered spend vs usage analysis",
      "Direct accounting system integration",
      "Prioritized savings recommendations with dollar amounts",
      "ROI tracking for implemented optimizations",
      "50+ tool integrations",
      "Usage-based license optimization",
    ],
    pricing: "Startup: $39/mo | Growth: $119/mo | Enterprise: Custom",
    bestFor: "SMBs and mid-market companies (1-500 employees) that want AI-driven cost savings with fast time to value.",
    limitations: "Less extensive SaaS discovery than enterprise platforms. Benchmarking data is growing but not as large as established players.",
    verdict: "Best choice for companies that want to reduce SaaS costs with minimal effort and maximum AI automation.",
  },
  {
    name: "Zylo",
    tagline: "Best for large enterprises",
    icon: Building2,
    color: "gray",
    overview:
      "Zylo is an established enterprise SaaS management platform that focuses on SaaS discovery, optimization, and governance. It has one of the largest SaaS benchmarking databases and excels at helping large organizations gain visibility into their entire SaaS portfolio, including shadow IT.",
    features: [
      "Extensive SaaS discovery and shadow IT detection",
      "Large benchmarking database",
      "Vendor management and negotiation insights",
      "Compliance and governance tools",
      "Renewal management",
      "Enterprise integrations",
    ],
    pricing: "Enterprise contracts starting at $50,000+/year",
    bestFor: "Large enterprises (5,000+ employees) with massive SaaS portfolios and budgets for comprehensive SaaS management.",
    limitations: "Very expensive for smaller companies. Longer implementation time. Less AI-driven automation for cost recommendations.",
    verdict: "The go-to choice for large enterprises that need comprehensive SaaS visibility and governance at scale.",
  },
  {
    name: "Torii",
    tagline: "Best for IT workflow automation",
    icon: Workflow,
    color: "gray",
    overview:
      "Torii is a SaaS management platform that excels at IT workflow automation. It helps IT teams automate SaaS lifecycle management including employee onboarding/offboarding, license provisioning, and app request workflows. Cost visibility is included but secondary to operational automation.",
    features: [
      "Automated onboarding/offboarding workflows",
      "Custom workflow triggers and actions",
      "Self-service app request portals",
      "License provisioning automation",
      "Renewal management workflows",
      "SaaS discovery",
    ],
    pricing: "Custom pricing (per employee/year, typically mid-five figures annually)",
    bestFor: "IT teams at mid-market to enterprise companies that need to automate SaaS operations and reduce manual IT work.",
    limitations: "Cost optimization is not the primary focus. Requires IT team to configure and maintain workflows. Enterprise pricing.",
    verdict: "Ideal for IT-led organizations that prioritize operational automation over cost reduction.",
  },
  {
    name: "Productiv",
    tagline: "Best for engagement analytics",
    icon: BarChart3,
    color: "gray",
    overview:
      "Productiv is a SaaS intelligence platform that provides deep engagement analytics. It measures how employees use SaaS applications at a feature level, providing adoption scores and utilization insights that help IT and procurement teams understand the true value of their tools.",
    features: [
      "Feature-level engagement analytics",
      "Adoption scoring and benchmarking",
      "App-level usage reporting",
      "License reclamation insights",
      "Renewal intelligence",
      "Team-level analytics",
    ],
    pricing: "Enterprise contracts (typically six figures annually)",
    bestFor: "Large enterprises that need deep engagement analytics and want to understand how well employees adopt and use SaaS tools.",
    limitations: "Very expensive. Focused on analytics over actionable cost recommendations. Long implementation. Not accessible to SMBs.",
    verdict: "Best for enterprises that want to measure SaaS engagement depth, not just cost optimization.",
  },
  {
    name: "Cleanshelf (acquired by Zylo)",
    tagline: "Legacy option -- now part of Zylo",
    icon: Building2,
    color: "gray",
    overview:
      "Cleanshelf was a SaaS spend management platform that provided subscription tracking and cost visibility. It was acquired by Zylo and integrated into their enterprise platform. Cleanshelf is no longer available as a standalone product, and existing customers have been transitioned to Zylo.",
    features: [
      "SaaS subscription tracking (historical)",
      "Spend visibility and reporting (historical)",
      "Basic optimization suggestions (historical)",
      "Now part of Zylo's enterprise platform",
    ],
    pricing: "No longer independently priced. Available through Zylo ($50,000+/year)",
    bestFor: "No longer recommended as a standalone tool. Former Cleanshelf customers should evaluate Efficyon or Zylo based on their size and budget.",
    limitations: "No longer independently developed. Requires Zylo enterprise contract. No AI-driven analysis. Frozen feature set.",
    verdict: "Was a good mid-market option but no longer exists independently. Consider Efficyon as a modern alternative.",
  },
  {
    name: "Vendr",
    tagline: "Best for SaaS purchasing and negotiation",
    icon: CreditCard,
    color: "gray",
    overview:
      "Vendr is a SaaS buying platform that helps companies purchase and renew SaaS at better prices. Rather than managing existing subscriptions, Vendr focuses on the procurement process -- negotiating contracts, managing renewals, and leveraging their buying data to get better pricing from vendors.",
    features: [
      "SaaS purchasing and negotiation",
      "Vendor price benchmarking",
      "Renewal management and negotiation",
      "Contract management",
      "Intake and approval workflows",
      "Savings tracking on new purchases",
    ],
    pricing: "Based on SaaS spend under management (typically a percentage of savings or flat fee starting ~$30,000+/year)",
    bestFor: "Companies with significant SaaS spend ($500K+/year) that want help negotiating better prices on purchases and renewals.",
    limitations: "Does not optimize existing usage or licenses. No usage tracking. Focused on procurement, not operations. High minimum spend thresholds.",
    verdict: "Great complement to a cost optimization tool -- Vendr negotiates better prices while Efficyon optimizes how you use what you buy.",
  },
  {
    name: "Cledara",
    tagline: "Best for SaaS spending control",
    icon: DollarSign,
    color: "gray",
    overview:
      "Cledara is a SaaS spending management platform that provides virtual cards for SaaS purchases, giving finance teams granular control over software spending. It focuses on spend control, visibility, and approval workflows rather than usage optimization.",
    features: [
      "Virtual cards for each SaaS subscription",
      "Real-time spend tracking and control",
      "Approval workflows for new subscriptions",
      "Automatic cancellation of unused subscriptions",
      "Budget alerts and spending limits",
      "Centralized SaaS dashboard",
    ],
    pricing: "Based on company size and SaaS spend (free tier for small teams, paid plans from ~$100+/month)",
    bestFor: "Finance teams that want granular control over SaaS purchasing through virtual cards and approval workflows.",
    limitations: "Limited usage analytics beyond payment activity. No AI-driven optimization. Less focused on usage-based cost savings.",
    verdict: "Excellent for spend control and governance. Best paired with a usage optimization tool like Efficyon for complete coverage.",
  },
  {
    name: "Manual Tracking (Spreadsheets)",
    tagline: "Common starting point -- not recommended long term",
    icon: FileSpreadsheet,
    color: "gray",
    overview:
      "Most companies begin tracking SaaS subscriptions in spreadsheets. While this costs nothing in software, the hidden costs of labor ($1,000-3,000+/month), inaccuracy, and missed savings typically far exceed the cost of dedicated tools. Spreadsheets provide no usage data, no AI insights, and do not scale.",
    features: [
      "No software cost",
      "Fully customizable format",
      "Familiar tool for most teams",
      "Good for very small portfolios (<10 tools)",
    ],
    pricing: "Free (but $1,000-3,000+/month in hidden labor costs)",
    bestFor: "Very early-stage companies with fewer than 10 SaaS tools and minimal SaaS spend.",
    limitations: "Extremely time-consuming. Always outdated. No usage tracking. No AI insights. Does not scale. High error rate. Missed savings.",
    verdict: "Acceptable for startups with <10 tools. Any company with more should upgrade to a dedicated platform.",
  },
]

export default function BestSaaSToolsPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Best SaaS Cost Optimization Tools in 2026: Complete Guide",
    description:
      "Comprehensive guide comparing the best SaaS cost optimization tools in 2026.",
    url: "https://www.efficyon.com/compare/best-saas-cost-optimization-tools",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best SaaS cost optimization tool for small businesses?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is the best SaaS cost optimization tool for small businesses, with pricing starting at $39/month and AI-powered analysis that works from day one. It provides enterprise-grade cost optimization without the enterprise price tag or complexity.",
        },
      },
      {
        "@type": "Question",
        name: "How much can SaaS cost optimization tools save?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Companies typically save 15-30% of their total SaaS spend through optimization. For a company spending $50,000/year on SaaS, that means $7,500-15,000 in annual savings. The ROI on optimization tools is typically 10-50x the cost of the tool itself.",
        },
      },
      {
        "@type": "Question",
        name: "What features should I look for in a SaaS cost optimization tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Key features to evaluate: usage tracking (not just spend tracking), AI-powered recommendations, accounting system integration, automated alerts and reporting, ROI tracking, and reasonable pricing. The most important factor is whether the tool generates actionable savings recommendations, not just data.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need a SaaS management tool if I only have 20 subscriptions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Even with 20 subscriptions, manual tracking takes significant time and misses optimization opportunities. At $39/month, a tool like Efficyon pays for itself by finding just one unused license or pricing optimization. The typical company wastes 15-30% of SaaS spend regardless of portfolio size.",
        },
      },
      {
        "@type": "Question",
        name: "What is the difference between SaaS management and SaaS cost optimization?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SaaS management is the broader category covering discovery, procurement, operations, and governance of SaaS tools. SaaS cost optimization is specifically focused on reducing waste and maximizing value from your SaaS spend. Some tools (like Zylo and Torii) focus on management, while others (like Efficyon) focus specifically on cost optimization.",
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
              <Trophy className="h-4 w-4" />
              2026 Guide
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Best SaaS Cost Optimization Tools in 2026: Complete Guide
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Companies waste 15-30% of their SaaS budget on unused licenses, overlapping tools, and
              wrong-tier subscriptions. The right optimization tool finds these savings automatically.
              We reviewed and compared 8 approaches to SaaS cost optimization to help you choose the
              best fit for your organization.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Last updated: March 2026. We update this guide quarterly.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Rankings */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Quick Rankings
          </h2>
          <div className="space-y-4">
            {[
              { name: "Efficyon", category: "Best Overall for SMBs & Mid-Market", price: "From $39/mo", highlight: true },
              { name: "Zylo", category: "Best for Large Enterprises (5,000+)", price: "From $50K/year", highlight: false },
              { name: "Torii", category: "Best for IT Workflow Automation", price: "Custom enterprise", highlight: false },
              { name: "Productiv", category: "Best for Engagement Analytics", price: "Six figures/year", highlight: false },
              { name: "Vendr", category: "Best for SaaS Purchasing & Negotiation", price: "From ~$30K/year", highlight: false },
              { name: "Cledara", category: "Best for SaaS Spend Control", price: "From ~$100/mo", highlight: false },
              { name: "Cleanshelf", category: "Legacy (acquired by Zylo)", price: "Via Zylo only", highlight: false },
              { name: "Spreadsheets", category: "Common Starting Point (not recommended)", price: "$1K-3K/mo in labor", highlight: false },
            ].map((tool, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 rounded-xl border ${
                  tool.highlight
                    ? "border-cyan-500/30 bg-cyan-500/[0.05]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  tool.highlight ? "bg-cyan-500 text-white" : "bg-white/10 text-gray-400"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${tool.highlight ? "text-white" : "text-gray-200"}`}>
                      {tool.name}
                    </span>
                    {tool.highlight && (
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                        Top Pick
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{tool.category}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${tool.highlight ? "text-cyan-400" : "text-gray-400"}`}>
                    {tool.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Feature Comparison Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-3 text-cyan-400 font-semibold">Efficyon</th>
                  <th className="text-center py-4 px-3 text-gray-300 font-medium">Zylo</th>
                  <th className="text-center py-4 px-3 text-gray-300 font-medium">Torii</th>
                  <th className="text-center py-4 px-3 text-gray-300 font-medium">Productiv</th>
                  <th className="text-center py-4 px-3 text-gray-300 font-medium">Vendr</th>
                  <th className="text-center py-4 px-3 text-gray-300 font-medium">Cledara</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Recommendations", vals: [true, false, false, false, false, false] },
                  { feature: "Spend vs Usage", vals: [true, "Partial", "Partial", "Partial", false, false] },
                  { feature: "Accounting Integration", vals: [true, false, false, false, false, true] },
                  { feature: "SaaS Discovery", vals: ["Core", "Extensive", true, true, false, "Via cards"] },
                  { feature: "Workflow Automation", vals: ["Basic", "Basic", "Extensive", false, "Purchasing", "Approvals"] },
                  { feature: "Engagement Analytics", vals: ["Basic", "Basic", "Basic", "Extensive", false, false] },
                  { feature: "Negotiation Support", vals: [false, true, false, false, "Core", false] },
                  { feature: "Virtual Cards", vals: [false, false, false, false, false, true] },
                  { feature: "ROI Guarantee", vals: [true, false, false, false, false, false] },
                  { feature: "SMB Pricing", vals: [true, false, false, false, false, true] },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-gray-300">{row.feature}</td>
                    {row.vals.map((val, j) => (
                      <td key={j} className="py-3 px-3 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <CheckCircle className="h-4 w-4 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-xs text-gray-400">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Individual Tool Reviews */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Detailed Reviews
          </h2>

          <div className="space-y-16">
            {tools.map((tool, index) => {
              const Icon = tool.icon
              const isEfficyon = tool.name === "Efficyon"
              return (
                <div
                  key={index}
                  id={tool.name.toLowerCase().replace(/[\s()]/g, "-")}
                  className={`border rounded-xl p-8 ${
                    isEfficyon
                      ? "border-cyan-500/20 bg-cyan-500/[0.03]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      isEfficyon ? "bg-cyan-500/20" : "bg-white/10"
                    }`}>
                      <Icon className={`h-6 w-6 ${isEfficyon ? "text-cyan-400" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-white">{index + 1}. {tool.name}</h3>
                        {isEfficyon && (
                          <span className="flex items-center gap-1 text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full font-medium">
                            <Star className="h-3 w-3" /> Top Pick
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{tool.tagline}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Overview</h4>
                      <p className="text-gray-300 leading-relaxed">{tool.overview}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Key Features</h4>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {tool.features.map((feature, fi) => (
                          <li key={fi} className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckCircle className={`h-4 w-4 flex-shrink-0 ${
                              isEfficyon ? "text-cyan-400" : "text-gray-500"
                            }`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-black/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Pricing</h4>
                        <p className={`text-sm ${isEfficyon ? "text-cyan-400" : "text-gray-300"}`}>
                          {tool.pricing}
                        </p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Best For</h4>
                        <p className="text-sm text-gray-300">{tool.bestFor}</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Limitations</h4>
                        <p className="text-sm text-gray-300">{tool.limitations}</p>
                      </div>
                    </div>

                    <div className={`rounded-lg p-4 ${isEfficyon ? "bg-cyan-500/10" : "bg-white/[0.03]"}`}>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Our Verdict</h4>
                      <p className={`text-sm font-medium ${isEfficyon ? "text-cyan-400" : "text-gray-200"}`}>
                        {tool.verdict}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How to Choose */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            How to Choose the Right Tool
          </h2>
          <div className="space-y-6">
            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Start with your primary goal</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p className="font-medium text-gray-200 mb-1">If your goal is cost reduction:</p>
                  <p>Choose Efficyon. It is purpose-built for finding and eliminating SaaS waste with AI.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-200 mb-1">If your goal is IT automation:</p>
                  <p>Choose Torii. It excels at workflow automation for SaaS lifecycle management.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-200 mb-1">If your goal is enterprise governance:</p>
                  <p>Choose Zylo. It provides the deepest SaaS discovery and compliance tools.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-200 mb-1">If your goal is better purchasing:</p>
                  <p>Choose Vendr. It negotiates better prices on new and renewing contracts.</p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Consider your budget</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
                <div>
                  <p className="font-medium text-green-400 mb-1">Under $200/month</p>
                  <p>Efficyon ($39-119/mo) or Cledara for spend control</p>
                </div>
                <div>
                  <p className="font-medium text-yellow-400 mb-1">$2,000-5,000/month</p>
                  <p>Torii, Vendr, or Efficyon Enterprise</p>
                </div>
                <div>
                  <p className="font-medium text-red-400 mb-1">$5,000+/month</p>
                  <p>Zylo, Productiv, or multi-tool strategy</p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Factor in company size</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
                <div>
                  <p className="font-medium text-purple-400 mb-1">1-50 employees</p>
                  <p>Efficyon Startup or Growth. Cledara for spend control. Spreadsheets if fewer than 10 tools.</p>
                </div>
                <div>
                  <p className="font-medium text-purple-400 mb-1">50-500 employees</p>
                  <p>Efficyon Growth/Enterprise. Consider adding Vendr for negotiation on large contracts.</p>
                </div>
                <div>
                  <p className="font-medium text-purple-400 mb-1">500+ employees</p>
                  <p>Evaluate all options. Zylo for governance at scale. Efficyon for cost optimization. Consider a multi-tool approach.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Key Takeaways</h2>
          <div className="border border-white/10 rounded-xl p-8 bg-white/[0.02]">
            <ul className="space-y-4">
              {[
                "Every company with more than 10 SaaS subscriptions should use a dedicated optimization tool. The savings always exceed the cost of the tool.",
                "Efficyon is the best value for SMBs and mid-market companies, offering AI-powered optimization starting at $39/month with a 90-day ROI guarantee.",
                "Enterprise platforms like Zylo and Productiv serve important needs at scale but are overkill (and overpriced) for most companies under 5,000 employees.",
                "The right tool depends on your primary goal: cost optimization (Efficyon), IT automation (Torii), governance (Zylo), purchasing (Vendr), or spend control (Cledara).",
                "Spreadsheets are the most expensive option in the long run. The labor cost alone typically exceeds 10-50x the cost of a dedicated tool.",
                "AI-powered tools like Efficyon represent the next generation -- they do not just show you data, they tell you exactly what to do and how much you will save.",
              ].map((takeaway, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">{takeaway}</span>
                </li>
              ))}
            </ul>
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
                What is the best SaaS cost optimization tool for small businesses?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon is the best SaaS cost optimization tool for small businesses, with pricing starting
                at $39/month and AI-powered analysis that works from day one. It provides enterprise-grade
                cost optimization without the enterprise price tag or complexity. Most teams see their first
                savings recommendations within a week of connecting their tools.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How much can SaaS cost optimization tools save?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Companies typically save 15-30% of their total SaaS spend through optimization. For a company
                spending $50,000/year on SaaS, that means $7,500-15,000 in annual savings. The ROI on
                optimization tools is typically 10-50x the cost of the tool itself, making them one of the
                highest-ROI investments a company can make.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What features should I look for in a SaaS cost optimization tool?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Key features to evaluate: usage tracking (not just spend tracking), AI-powered recommendations,
                accounting system integration, automated alerts and reporting, ROI tracking, and reasonable
                pricing. The most important factor is whether the tool generates actionable savings
                recommendations with specific dollar amounts, not just data and dashboards.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Do I need a SaaS management tool if I only have 20 subscriptions?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Even with 20 subscriptions, manual tracking takes significant time and misses
                optimization opportunities. At $39/month, a tool like Efficyon pays for itself by finding
                just one unused license or pricing optimization. The typical company wastes 15-30% of SaaS
                spend regardless of portfolio size -- that is $1,500-3,000 per year on a modest $10,000 annual SaaS budget.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What is the difference between SaaS management and SaaS cost optimization?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                SaaS management is the broader category covering discovery, procurement, operations, and
                governance of SaaS tools. SaaS cost optimization is specifically focused on reducing waste
                and maximizing value from your SaaS spend. Some tools like Zylo and Torii focus on management
                (visibility, workflows, governance), while others like Efficyon focus specifically on cost
                optimization (finding savings, recommending actions, tracking ROI).
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
            Efficyon is rated #1 for SMBs and mid-market companies. Start your free analysis and see
            AI-powered savings recommendations within your first week. No enterprise contracts, no long
            implementation. Just results backed by a 90-day ROI guarantee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
            >
              Start Free Analysis -- From $39/mo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-medium border border-white/10 bg-white/5 text-gray-200 rounded-lg hover:border-white/20 hover:bg-white/10 hover:text-white transition-all duration-300"
            >
              View Individual Comparisons
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
