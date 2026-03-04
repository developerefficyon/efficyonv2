"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Calculator,
  ArrowRight,
  Shield,
  DollarSign,
  Building2,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Industry benchmark data ($/employee/month)                        */
/* ------------------------------------------------------------------ */
const INDUSTRY_BENCHMARKS: Record<string, { low: number; mid: number; high: number; label: string }> = {
  technology: { low: 120, mid: 150, high: 200, label: "Technology" },
  finance: { low: 100, mid: 130, high: 170, label: "Finance" },
  healthcare: { low: 80, mid: 110, high: 150, label: "Healthcare" },
  marketing: { low: 110, mid: 140, high: 180, label: "Marketing" },
  ecommerce: { low: 90, mid: 120, high: 160, label: "E-commerce" },
  education: { low: 60, mid: 85, high: 120, label: "Education" },
  other: { low: 80, mid: 110, high: 150, label: "Other" },
}

const STAGE_MULTIPLIER: Record<string, number> = {
  startup: 0.85,
  growth: 1.0,
  enterprise: 1.15,
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "How is the expected SaaS spend range calculated?",
    a: "We use industry benchmarks based on aggregated data from thousands of companies. The expected range is calculated by multiplying your employee count by industry-specific per-employee monthly SaaS costs, then adjusting for your company's growth stage. Technology companies typically spend $120-$200 per employee per month, while education organizations spend $60-$120.",
  },
  {
    q: "What counts as SaaS overspending?",
    a: "Overspending occurs when your actual SaaS costs exceed the industry benchmark range for your company profile. Common causes include unused licenses that haven't been deprovisioned, duplicate tools serving the same function across teams, premium tier subscriptions when a lower tier would suffice, and shadow IT purchases that bypass central procurement.",
  },
  {
    q: "How accurate are these SaaS cost benchmarks?",
    a: "Our benchmarks are derived from industry reports and real-world data across companies of various sizes and sectors. They provide a useful directional guide for evaluating your spending. However, individual company needs vary. Some organizations require more specialized tooling which legitimately increases costs. For a precise analysis based on your actual usage data, we recommend connecting your accounts to Efficyon.",
  },
  {
    q: "How can I reduce my SaaS costs quickly?",
    a: "The fastest wins typically come from three areas: canceling unused licenses that no one has logged into in 90+ days, consolidating duplicate tools where multiple teams use different products for the same purpose, and rightsizing subscription tiers based on actual feature usage. Efficyon automates the detection of all three and provides prioritized recommendations ranked by savings potential.",
  },
]

/* ------------------------------------------------------------------ */
/*  Metadata (exported separately for server-side SEO)                */
/* ------------------------------------------------------------------ */
// NOTE: For "use client" pages in the App Router, metadata must be
// exported from a separate layout.tsx or handled via generateMetadata
// in a parent route. The JSON-LD is rendered client-side below.

/* ------------------------------------------------------------------ */
/*  Helper: format currency                                           */
/* ------------------------------------------------------------------ */
function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function SaaSCostCalculatorPage() {
  /* --- inputs --- */
  const [employees, setEmployees] = useState(50)
  const [industry, setIndustry] = useState("technology")
  const [stage, setStage] = useState("growth")
  const [currentSpend, setCurrentSpend] = useState(5000)

  /* --- FAQ toggle --- */
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  /* --- calculations --- */
  const results = useMemo(() => {
    const bench = INDUSTRY_BENCHMARKS[industry]
    const mult = STAGE_MULTIPLIER[stage]

    const expectedLow = Math.round(employees * bench.low * mult)
    const expectedMid = Math.round(employees * bench.mid * mult)
    const expectedHigh = Math.round(employees * bench.high * mult)

    const overspend = Math.max(0, currentSpend - expectedMid)
    const overspendPct = expectedMid > 0 ? Math.round((overspend / expectedMid) * 100) : 0
    const wasteRate = overspend > 0 ? 0.25 + Math.min(0.10, overspendPct / 1000) : 0
    const annualWaste = Math.round(overspend * 12 * wasteRate)
    const efficyonSavings = Math.round(annualWaste * 0.7)

    const perEmployeeActual = employees > 0 ? Math.round(currentSpend / employees) : 0
    const perEmployeeBench = bench.mid

    const barMaxVal = Math.max(currentSpend, expectedHigh, 1)

    return {
      expectedLow,
      expectedMid,
      expectedHigh,
      overspend,
      overspendPct,
      annualWaste,
      efficyonSavings,
      perEmployeeActual,
      perEmployeeBench,
      barMaxVal,
    }
  }, [employees, industry, stage, currentSpend])

  /* --- JSON-LD --- */
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SaaS Cost Calculator",
      url: "https://www.efficyon.com/calculator/saas-cost",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Interactive calculator to estimate how much your company should spend on SaaS based on industry benchmarks, company size, and growth stage.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
              <Calculator className="h-4 w-4" />
              Free Calculator
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              SaaS Cost Calculator: How Much Should Your Company Spend?
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Enter your company profile below and instantly see how your SaaS spending
              compares to industry benchmarks. Identify overspending and estimate potential savings.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* ---- LEFT: Inputs ---- */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-400" />
                Your Company Profile
              </h2>

              {/* Employees slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Number of Employees</label>
                  <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-md">{employees}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-cyan-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-cyan-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>100</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              {/* Industry dropdown */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full h-10 rounded-lg bg-black/50 border border-white/20 text-white px-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                >
                  {Object.entries(INDUSTRY_BENCHMARKS).map(([key, val]) => (
                    <option key={key} value={key} className="bg-black text-white">
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Growth stage radio */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Growth Stage</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["startup", "growth", "enterprise"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStage(s)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 capitalize ${
                        stage === s
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                          : "bg-black/30 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current spend */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Current Monthly SaaS Spend</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    min={0}
                    value={currentSpend}
                    onChange={(e) => setCurrentSpend(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 rounded-lg bg-black/50 border border-white/20 text-white pl-9 pr-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            {/* ---- RIGHT: Results ---- */}
            <div className="space-y-6">
              {/* Expected range */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Expected Monthly SaaS Spend</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold text-white transition-all duration-300">${fmt(results.expectedLow)}</span>
                  <span className="text-gray-500 text-lg">&ndash;</span>
                  <span className="text-3xl md:text-4xl font-bold text-white transition-all duration-300">${fmt(results.expectedHigh)}</span>
                </div>
                <p className="text-sm text-gray-400">
                  Based on {INDUSTRY_BENCHMARKS[industry].label} industry benchmarks for {employees} employees at {stage} stage
                </p>
              </div>

              {/* Bar comparison */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Your Spend vs Benchmark</h3>

                {/* Your spend bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Your Spend</span>
                    <span className="text-white font-semibold">${fmt(currentSpend)}/mo</span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg transition-all duration-500 ease-out ${
                        currentSpend > results.expectedHigh ? "bg-gradient-to-r from-red-500 to-red-400" :
                        currentSpend > results.expectedMid ? "bg-gradient-to-r from-yellow-500 to-yellow-400" :
                        "bg-gradient-to-r from-green-500 to-green-400"
                      }`}
                      style={{ width: `${Math.min(100, (currentSpend / results.barMaxVal) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Benchmark bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Industry Benchmark</span>
                    <span className="text-white font-semibold">${fmt(results.expectedMid)}/mo</span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(100, (results.expectedMid / results.barMaxVal) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Per-employee comparison */}
                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Your Cost / Employee</p>
                    <p className="text-lg font-bold text-white">${fmt(results.perEmployeeActual)}<span className="text-xs text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Benchmark / Employee</p>
                    <p className="text-lg font-bold text-cyan-400">${fmt(results.perEmployeeBench)}<span className="text-xs text-gray-500">/mo</span></p>
                  </div>
                </div>
              </div>

              {/* Overspend & Savings */}
              {results.overspend > 0 ? (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <h3 className="text-sm font-medium text-red-400 uppercase tracking-wider">Potential Overspend Detected</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Monthly Overspend</p>
                      <p className="text-2xl font-bold text-red-400 transition-all duration-300">${fmt(results.overspend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Overspend %</p>
                      <p className="text-2xl font-bold text-red-400 transition-all duration-300">{results.overspendPct}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Est. Annual Waste</p>
                      <p className="text-2xl font-bold text-yellow-400 transition-all duration-300">${fmt(results.annualWaste)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Potential Savings w/ Efficyon</p>
                      <p className="text-2xl font-bold text-green-400 transition-all duration-300">${fmt(results.efficyonSavings)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-green-400" />
                    <h3 className="text-sm font-medium text-green-400 uppercase tracking-wider">Looking Good</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Your current spend is within or below the industry benchmark range. You may still benefit from identifying unused licenses and duplicate tools.
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6 text-center">
                <p className="text-white font-semibold mb-2">Want exact numbers?</p>
                <p className="text-gray-400 text-sm mb-4">
                  Connect your accounts and let Efficyon analyze your actual usage data for precise savings recommendations.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Get a Detailed Analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Understanding SaaS Costs in 2026</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Software-as-a-Service costs have become one of the most significant and fastest-growing expenses for businesses of all sizes. According to recent industry research, the average company now spends between $2,000 and $3,500 per employee per year on SaaS subscriptions, and that figure continues to climb. For a 50-person company, this translates to an annual SaaS budget somewhere between $100,000 and $175,000 &mdash; a number that can surprise even seasoned finance leaders when they see it broken down.
                </p>
                <p>
                  The challenge is not simply the total amount being spent. It is the hidden waste embedded within that spending. Industry studies consistently find that 25 to 35 percent of enterprise SaaS spending goes toward subscriptions that are underutilized, duplicative, or entirely unused. This waste accumulates silently because individual subscriptions often seem small on their own, and because purchasing decisions are frequently decentralized across departments.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Average SaaS Spend by Company Size</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Company size is the single most important variable in predicting SaaS costs, but the relationship is not strictly linear. Smaller companies tend to spend more per employee because they cannot negotiate volume discounts and often rely on higher-tier plans to access the features they need. Larger organizations benefit from enterprise agreements but face different challenges, including tool sprawl and difficulty maintaining visibility across hundreds of subscriptions.
                </p>
                <p>
                  Startups with 1 to 10 employees typically spend $100 to $180 per employee per month on SaaS. Companies in the growth phase with 11 to 50 employees usually see costs between $90 and $160 per employee per month, as they begin to standardize their tooling and negotiate better rates. Mid-market companies with 51 to 200 employees generally fall in the $80 to $150 range per employee, while enterprises with 200 or more employees can range from $70 to $130 per employee per month depending on their ability to consolidate vendors and enforce procurement policies.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Industry Benchmarks for SaaS Spending</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Industry context matters significantly when evaluating your SaaS spend. Technology companies consistently spend the most on software, averaging $120 to $200 per employee per month, because their core operations depend heavily on development tools, cloud infrastructure, collaboration platforms, and specialized engineering software. Marketing and advertising firms follow closely at $110 to $180, driven by their reliance on analytics platforms, content management systems, and campaign automation tools.
                </p>
                <p>
                  Financial services companies spend $100 to $170 per employee per month, with regulatory compliance and data security tools contributing significantly to the total. Healthcare organizations average $80 to $150, with electronic health records and HIPAA-compliant communication tools driving costs. E-commerce businesses fall in the $90 to $160 range, and education organizations tend to have the lowest SaaS spend at $60 to $120 per employee per month.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Common SaaS Cost Drivers</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Several factors consistently push SaaS costs above benchmarks. The most common is unused or underutilized licenses. When employees leave the company or change roles, their software licenses often remain active, generating ongoing charges for accounts no one is using. Research suggests that 20 to 30 percent of all SaaS licenses in the average organization are either completely unused or used less than once per month.
                </p>
                <p>
                  Duplicate and overlapping tools represent another major cost driver. It is not uncommon to find three or four project management tools, two video conferencing platforms, or multiple file-sharing solutions deployed across different teams within the same organization. Each team chose the tool that best fit their workflow, but nobody evaluated the total organizational cost of running multiple solutions with significant feature overlap.
                </p>
                <p>
                  Overprovisioned subscription tiers also contribute to waste. Teams frequently sign up for premium or enterprise tiers to access one or two specific features, while the basic or mid-tier plan would cover 95 percent of their actual usage. Without regular tier reviews, these overpayments become embedded in the budget and go unquestioned at renewal time.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">How to Reduce SaaS Costs</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Reducing SaaS costs effectively requires visibility, analysis, and ongoing management. The first step is building a complete inventory of every SaaS subscription in your organization, including those purchased directly by individual teams or employees. This shadow IT component is often the largest source of surprise spending.
                </p>
                <p>
                  Once you have full visibility, the next step is correlating spend data with actual usage. Which licenses are actively used? Which tools have significant feature overlap? Where are you paying for enterprise-level features that nobody uses? Answering these questions manually through spreadsheets is time-consuming and error-prone, which is why automated solutions like Efficyon exist.
                </p>
                <p>
                  Efficyon connects to your accounting systems and SaaS tools to build a real-time picture of your software spending and usage. Its AI engine automatically identifies unused licenses, duplicate tools, and overprovisioned tiers, then delivers prioritized recommendations ranked by savings potential. Companies using Efficyon typically reduce their SaaS spending by 25 percent within the first 90 days, and the platform continuously monitors for new optimization opportunities as your stack evolves.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-lg bg-black/50 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left text-white hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-gray-300 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl border border-white/10 overflow-hidden max-w-3xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
            <div className="relative z-10 px-8 py-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Get a Detailed Analysis of Your SaaS Spend
              </h2>
              <p className="text-gray-300 max-w-xl mx-auto mb-6">
                This calculator provides estimates based on industry averages. For precise, actionable
                insights based on your actual subscriptions and usage data, start a free Efficyon analysis.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Start Free Analysis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                No credit card required &middot; 90-day ROI guarantee
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
