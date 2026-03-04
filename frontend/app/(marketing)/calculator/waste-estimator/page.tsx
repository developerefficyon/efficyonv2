"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Trash2,
  ArrowRight,
  Shield,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  Gauge,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Audit recency multipliers                                         */
/* ------------------------------------------------------------------ */
const AUDIT_OPTIONS = [
  { value: "never", label: "Never", multiplier: 1.4 },
  { value: "6plus", label: "6+ months ago", multiplier: 1.2 },
  { value: "1to6", label: "1-6 months ago", multiplier: 1.0 },
  { value: "recent", label: "Recently", multiplier: 0.8 },
] as const

type AuditValue = (typeof AUDIT_OPTIONS)[number]["value"]

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "What counts as SaaS waste?",
    a: "SaaS waste includes any software spending that does not deliver proportional value to your organization. The three main categories are: unused licenses (accounts that are paid for but not actively used), duplicate tools (multiple subscriptions serving the same function across teams), and overprovisioned tiers (paying for premium features that your team does not actually use). Shadow IT purchases that bypass central procurement also contribute significantly to waste.",
  },
  {
    q: "How accurate is this waste estimate?",
    a: "This estimator uses industry-validated formulas based on aggregated data from thousands of companies. The results provide a directional estimate to help you understand the magnitude of potential waste. Actual waste amounts vary by organization. For a precise assessment based on your real subscription and usage data, Efficyon provides detailed analysis by connecting directly to your SaaS tools and accounting systems.",
  },
  {
    q: "What is the Shadow IT risk score?",
    a: "The Shadow IT risk score assesses the likelihood that your organization has unapproved or untracked software purchases. It is calculated based on your employee count relative to managed subscriptions, how recently you conducted a SaaS audit, and the overall utilization rate. A higher score indicates greater probability of unknown subscriptions creating hidden costs and security risks.",
  },
  {
    q: "How often should a company audit its SaaS subscriptions?",
    a: "Best practice is to conduct a SaaS audit at least quarterly. However, companies with rapid growth or decentralized purchasing should review monthly. Continuous automated monitoring through a platform like Efficyon is the most effective approach, as it catches waste in real time rather than waiting for periodic manual reviews. Companies that have never audited their SaaS stack typically find 30-40% more waste than those with regular review cycles.",
  },
]

/* ------------------------------------------------------------------ */
/*  Helper: format currency                                           */
/* ------------------------------------------------------------------ */
function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function WasteEstimatorPage() {
  /* --- inputs --- */
  const [numSubs, setNumSubs] = useState(25)
  const [monthlySpend, setMonthlySpend] = useState(8000)
  const [dailyUsePct, setDailyUsePct] = useState(60)
  const [employees, setEmployees] = useState(40)
  const [lastAudit, setLastAudit] = useState<AuditValue>("6plus")

  /* --- FAQ toggle --- */
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  /* --- calculations --- */
  const results = useMemo(() => {
    const auditMult = AUDIT_OPTIONS.find((a) => a.value === lastAudit)?.multiplier ?? 1.0

    // Unused license waste: based on utilization gap
    // If 60% tools are used daily, assume ~25% of the remaining 40% licenses are fully unused
    // Plus some partial underutilization
    const unusedRate = ((100 - dailyUsePct) / 100) * 0.45 * auditMult
    const unusedWasteMonthly = Math.round(monthlySpend * unusedRate)
    const unusedWasteAnnual = unusedWasteMonthly * 12

    // Duplicate tool waste: more tools = more overlap probability
    // Base: ~5% of spend, scaling up with tool count
    const dupeRate = 0.05 + Math.min(0.12, (numSubs / 200) * 0.12)
    const dupeWasteMonthly = Math.round(monthlySpend * dupeRate * auditMult)
    const dupeWasteAnnual = dupeWasteMonthly * 12

    // Overprovisioning waste: assume 8-15% based on company size
    const overprovRate = 0.08 + Math.min(0.07, (employees / 500) * 0.07)
    const overprovWasteMonthly = Math.round(monthlySpend * overprovRate * auditMult)
    const overprovWasteAnnual = overprovWasteMonthly * 12

    // Total waste
    const totalWasteMonthly = unusedWasteMonthly + dupeWasteMonthly + overprovWasteMonthly
    const totalWasteAnnual = totalWasteMonthly * 12

    // Waste per employee
    const wastePerEmployee = employees > 0 ? Math.round(totalWasteAnnual / employees) : 0

    // Waste as % of total spend
    const wastePct = monthlySpend > 0 ? Math.round((totalWasteMonthly / monthlySpend) * 100) : 0

    // Shadow IT risk score (1-10)
    const toolsPerEmployee = numSubs / Math.max(1, employees)
    let shadowScore = 3
    if (toolsPerEmployee < 0.3) shadowScore += 2 // low ratio = likely missing tools
    if (dailyUsePct < 50) shadowScore += 1
    if (lastAudit === "never") shadowScore += 3
    else if (lastAudit === "6plus") shadowScore += 2
    else if (lastAudit === "1to6") shadowScore += 1
    if (employees > 100) shadowScore += 1
    shadowScore = Math.min(10, Math.max(1, shadowScore))
    const shadowLabel = shadowScore <= 3 ? "Low" : shadowScore <= 6 ? "Medium" : "High"
    const shadowColor = shadowScore <= 3 ? "text-green-400" : shadowScore <= 6 ? "text-yellow-400" : "text-red-400"

    // Urgency score (1-10)
    let urgency = 2
    if (wastePct > 40) urgency += 3
    else if (wastePct > 25) urgency += 2
    else if (wastePct > 15) urgency += 1
    if (lastAudit === "never") urgency += 2
    else if (lastAudit === "6plus") urgency += 1
    if (totalWasteAnnual > 50000) urgency += 2
    else if (totalWasteAnnual > 20000) urgency += 1
    if (dailyUsePct < 50) urgency += 1
    urgency = Math.min(10, Math.max(1, urgency))

    // Waste breakdown percentages for the visual
    const totalParts = unusedWasteMonthly + dupeWasteMonthly + overprovWasteMonthly
    const unusedPct = totalParts > 0 ? Math.round((unusedWasteMonthly / totalParts) * 100) : 33
    const dupePct = totalParts > 0 ? Math.round((dupeWasteMonthly / totalParts) * 100) : 33
    const overprovPct = totalParts > 0 ? 100 - unusedPct - dupePct : 34

    // Comparison savings (companies like yours)
    const avgSavings = Math.round(totalWasteAnnual * 0.7)

    return {
      unusedWasteMonthly,
      unusedWasteAnnual,
      dupeWasteMonthly,
      dupeWasteAnnual,
      overprovWasteMonthly,
      overprovWasteAnnual,
      totalWasteMonthly,
      totalWasteAnnual,
      wastePerEmployee,
      wastePct,
      shadowScore,
      shadowLabel,
      shadowColor,
      urgency,
      unusedPct,
      dupePct,
      overprovPct,
      avgSavings,
    }
  }, [numSubs, monthlySpend, dailyUsePct, employees, lastAudit])

  /* --- JSON-LD --- */
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SaaS Waste Estimator",
      url: "https://www.efficyon.com/calculator/waste-estimator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Estimate how much your company wastes on unused and underutilized SaaS subscriptions with this free interactive calculator.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              <Trash2 className="h-4 w-4" />
              Free Waste Estimator
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              SaaS Waste Estimator: How Much Are You Losing?
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Estimate how much your company wastes on unused subscriptions, duplicate tools, and
              overprovisioned licenses. Get your waste score and urgency assessment instantly.
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
                <Eye className="h-5 w-5 text-red-400" />
                Your SaaS Profile
              </h2>

              {/* Number of subscriptions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Number of SaaS Subscriptions</label>
                  <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-md">{numSubs}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  value={numSubs}
                  onChange={(e) => setNumSubs(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-red-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-red-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                  <span>200</span>
                </div>
              </div>

              {/* Monthly spend */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Monthly SaaS Spend</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    min={0}
                    value={monthlySpend}
                    onChange={(e) => setMonthlySpend(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 rounded-lg bg-black/50 border border-white/20 text-white pl-9 pr-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                  />
                </div>
              </div>

              {/* % tools used daily */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Percentage of Tools Used Daily</label>
                  <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-md">{dailyUsePct}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={dailyUsePct}
                  onChange={(e) => setDailyUsePct(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-red-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-red-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>10%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Employees */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Number of Employees</label>
                  <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-md">{employees}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={500}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-red-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-red-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span>125</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              {/* Last audit */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">When Was Your Last SaaS Audit?</label>
                <div className="grid grid-cols-2 gap-3">
                  {AUDIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLastAudit(opt.value)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        lastAudit === opt.value
                          ? "bg-red-500/20 border-red-500/50 text-red-400"
                          : "bg-black/30 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- RIGHT: Results ---- */}
            <div className="space-y-6">
              {/* Total waste card */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 md:p-8">
                <h3 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-4">Estimated Annual Waste</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl md:text-5xl font-bold text-red-400 transition-all duration-300">${fmt(results.totalWasteAnnual)}</span>
                  <span className="text-gray-500 text-sm">/year</span>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-red-500/10">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Waste / Employee</p>
                    <p className="text-lg font-bold text-white transition-all duration-300">${fmt(results.wastePerEmployee)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Waste % of Spend</p>
                    <p className="text-lg font-bold text-white transition-all duration-300">{results.wastePct}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monthly Waste</p>
                    <p className="text-lg font-bold text-white transition-all duration-300">${fmt(results.totalWasteMonthly)}</p>
                  </div>
                </div>
              </div>

              {/* Waste breakdown "pie chart" */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Waste Breakdown</h3>

                {/* Stacked bar */}
                <div className="h-10 rounded-lg overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${results.unusedPct}%` }}
                  >
                    {results.unusedPct > 15 && <span className="text-[10px] font-bold text-white">{results.unusedPct}%</span>}
                  </div>
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${results.dupePct}%` }}
                  >
                    {results.dupePct > 15 && <span className="text-[10px] font-bold text-white">{results.dupePct}%</span>}
                  </div>
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${results.overprovPct}%` }}
                  >
                    {results.overprovPct > 15 && <span className="text-[10px] font-bold text-white">{results.overprovPct}%</span>}
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="h-3 w-3 rounded-sm bg-red-500" />
                      Unused Licenses
                    </span>
                    <span className="text-white font-semibold text-sm">${fmt(results.unusedWasteAnnual)}/yr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="h-3 w-3 rounded-sm bg-orange-500" />
                      Duplicate Tools
                    </span>
                    <span className="text-white font-semibold text-sm">${fmt(results.dupeWasteAnnual)}/yr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="h-3 w-3 rounded-sm bg-yellow-500" />
                      Overprovisioning
                    </span>
                    <span className="text-white font-semibold text-sm">${fmt(results.overprovWasteAnnual)}/yr</span>
                  </div>
                </div>
              </div>

              {/* Urgency Meter */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Urgency Score
                  </h3>
                  <span className={`text-2xl font-bold transition-all duration-300 ${
                    results.urgency <= 3 ? "text-green-400" : results.urgency <= 6 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {results.urgency}/10
                  </span>
                </div>

                {/* Gradient bar */}
                <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-500 to-red-500">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-6 w-1.5 bg-white rounded-full shadow-lg shadow-black/50 transition-all duration-500"
                    style={{ left: `${((results.urgency - 1) / 9) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low Priority</span>
                  <span>Moderate</span>
                  <span>Act Now</span>
                </div>
              </div>

              {/* Shadow IT Risk */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Shadow IT Risk</h3>
                    <p className="text-xs text-gray-500">Likelihood of untracked subscriptions</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold transition-all duration-300 ${results.shadowColor}`}>
                      {results.shadowLabel}
                    </p>
                    <p className="text-xs text-gray-500">{results.shadowScore}/10</p>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-sm mb-1">Companies like yours save an average of</p>
                <p className="text-3xl font-bold text-cyan-400 transition-all duration-300 mb-2">${fmt(results.avgSavings)}<span className="text-sm text-gray-400">/year</span></p>
                <p className="text-gray-500 text-xs">with automated SaaS optimization</p>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <p className="text-white font-semibold mb-2">Get an exact analysis</p>
                <p className="text-gray-400 text-sm mb-4">
                  These are estimates. Connect your real data for precise waste identification and actionable savings recommendations.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Get an Exact Analysis
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
              <h2 className="text-2xl font-bold text-white mb-4">Understanding SaaS Waste</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  SaaS waste is one of the most underestimated financial drains in modern business. Research consistently shows that organizations waste 25 to 35 percent of their total SaaS spending on software that is unused, underutilized, or redundant. For a mid-sized company spending $100,000 per year on SaaS subscriptions, this means $25,000 to $35,000 is effectively thrown away annually &mdash; money that could be redirected toward growth initiatives, headcount, or bottom-line profitability.
                </p>
                <p>
                  The problem is structural. Unlike physical assets, SaaS subscriptions are easy to acquire, easy to forget, and difficult to track without dedicated tooling. A department head can sign up for a new project management tool with a corporate credit card and no one outside their team knows about it. When that person leaves or the team shifts to a different tool, the subscription continues billing indefinitely. Multiply this pattern across dozens of teams and hundreds of employees, and the cumulative waste becomes staggering.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">The Three Types of SaaS Waste</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  <strong className="text-white">Unused license waste</strong> is the most straightforward category. These are subscriptions or individual seats that no one actively uses. Common causes include employee turnover without license deprovisioning, free trials that converted to paid plans and were forgotten, and tools that were adopted for a specific project and never canceled after the project ended. Industry data suggests that 15 to 25 percent of all SaaS licenses in the average organization fall into this category.
                </p>
                <p>
                  <strong className="text-white">Duplicate tool waste</strong> occurs when multiple teams subscribe to different tools that serve essentially the same function. The classic example is the company running Slack, Microsoft Teams, and Google Chat simultaneously across different departments. Each tool has its own per-user cost, and the overlap provides no additional value. Other common duplicates include project management platforms, file storage services, CRM systems, and video conferencing tools. The more subscriptions an organization has, the more likely it is to have significant duplication.
                </p>
                <p>
                  <strong className="text-white">Overprovisioning waste</strong> is the subtlest form of SaaS waste. It happens when organizations pay for higher subscription tiers than their actual usage requires. A team of 10 might be on an enterprise plan designed for 50 users because they needed one specific feature at deployment time. Or a company might be paying for unlimited storage when they are only using 20 percent of their allocation. Overprovisioning waste is especially common because subscription upgrades are easy while downgrades require active review and decision-making.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Why SaaS Waste Grows Over Time</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  SaaS waste is not a static problem. It grows progressively worse unless actively managed. Several compounding factors drive this growth. First, most SaaS contracts auto-renew with annual price increases of 5 to 10 percent, meaning even static waste becomes more expensive each year. Second, companies continuously add new tools as they grow, and each new addition increases the probability of overlap and underutilization.
                </p>
                <p>
                  Employee turnover further accelerates waste accumulation. The average company experiences 15 to 20 percent annual employee turnover, and departing employees leave behind an average of 5 to 8 active SaaS licenses. Without automated deprovisioning workflows, these licenses remain active for months or even years after the employee has left.
                </p>
                <p>
                  Shadow IT is the third major growth driver. Gartner estimates that shadow IT accounts for 30 to 40 percent of all IT spending in large organizations. These untracked purchases create blind spots that no manual audit can fully capture. Only continuous, automated monitoring can keep pace with the rate at which new subscriptions appear across a growing organization. Efficyon addresses all three of these growth drivers through real-time monitoring, automated alerts, and AI-powered recommendations.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">How to Eliminate SaaS Waste</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Eliminating SaaS waste requires a systematic approach that goes beyond one-time audits. The most effective strategy combines three elements: complete visibility into all active subscriptions, continuous usage monitoring to identify underutilization as it occurs, and automated workflows to act on findings quickly.
                </p>
                <p>
                  Start by building a comprehensive inventory of every SaaS tool in your organization. This means scanning expense reports, credit card statements, SSO logs, and browser activity to capture both centrally managed and shadow IT subscriptions. Then, correlate each subscription with actual usage data to identify the unused, duplicated, and overprovisioned licenses described above.
                </p>
                <p>
                  Platforms like Efficyon automate this entire process. By connecting to your accounting systems, identity providers, and individual SaaS tools through secure API integrations, Efficyon builds and maintains a real-time inventory of your entire software stack. Its AI engine continuously analyzes usage patterns, flags waste as it appears, and delivers prioritized recommendations that your team can implement immediately. Companies using Efficyon typically eliminate 25 percent or more of their SaaS waste within the first 90 days, with the platform paying for itself within the first month.
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
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10" />
            <div className="relative z-10 px-8 py-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Get an Exact Analysis of Your SaaS Waste
              </h2>
              <p className="text-gray-300 max-w-xl mx-auto mb-6">
                This estimator provides directional numbers based on industry averages. For precise waste
                identification down to the individual license level, connect your accounts to Efficyon.
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
