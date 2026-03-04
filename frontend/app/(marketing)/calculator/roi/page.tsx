"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  TrendingUp,
  ArrowRight,
  Shield,
  DollarSign,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Pricing tiers                                                     */
/* ------------------------------------------------------------------ */
function getEfficyonPlan(employees: number): { name: string; monthly: number; annual: number } {
  if (employees <= 10) return { name: "Startup", monthly: 39, annual: 39 * 12 }
  if (employees <= 50) return { name: "Growth", monthly: 119, annual: 119 * 12 }
  // Enterprise: estimate $5/employee/month
  const price = Math.max(200, employees * 5)
  return { name: "Enterprise", monthly: price, annual: price * 12 }
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "How are the license optimization savings calculated?",
    a: "License optimization savings are estimated at 15-25% of your monthly SaaS spend, depending on the number of tools and employees. This figure is based on industry research showing that the average organization wastes 20-30% of its SaaS budget on unused or underutilized licenses. The calculator uses a conservative model that accounts for your company size and tool count to produce a realistic estimate.",
  },
  {
    q: "What is included in duplicate elimination savings?",
    a: "Duplicate elimination savings account for the cost of running multiple tools that serve the same purpose across different teams. The calculator estimates this at 5-10% of total spend based on your number of SaaS tools. Companies with more tools are statistically more likely to have overlapping subscriptions. Common duplicates include project management tools, video conferencing platforms, and file storage services.",
  },
  {
    q: "How is the payback period determined?",
    a: "The payback period represents the number of days it takes for your cumulative savings from Efficyon to exceed the cost of your Efficyon subscription. It is calculated by dividing your annual Efficyon cost by your daily projected savings. Most companies see payback within 15-45 days, meaning the platform pays for itself within the first one to two months.",
  },
  {
    q: "Are these ROI projections guaranteed?",
    a: "While these projections are based on industry averages and conservative formulas, actual results vary by organization. However, Efficyon backs its service with a 90-day ROI guarantee. If you do not see measurable savings within the first 90 days, Efficyon will continue working at no additional cost until you do, or provide a full refund of your subscription fees.",
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
export default function ROICalculatorPage() {
  /* --- inputs --- */
  const [monthlySpend, setMonthlySpend] = useState(10000)
  const [numTools, setNumTools] = useState(30)
  const [employees, setEmployees] = useState(50)
  const [hoursManagement, setHoursManagement] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(50)

  /* --- FAQ toggle --- */
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  /* --- calculations --- */
  const results = useMemo(() => {
    // License optimization: 15-25% (more tools = higher %)
    const licenseRate = 0.15 + Math.min(0.10, (numTools / 200) * 0.10)
    const licenseSavingsMonthly = Math.round(monthlySpend * licenseRate)
    const licenseSavingsAnnual = licenseSavingsMonthly * 12

    // Duplicate elimination: 5-10% (more tools = more dupes)
    const dupeRate = 0.05 + Math.min(0.05, (numTools / 200) * 0.05)
    const dupeSavingsMonthly = Math.round(monthlySpend * dupeRate)
    const dupeSavingsAnnual = dupeSavingsMonthly * 12

    // Time savings
    const timeSavingsMonthly = Math.round(hoursManagement * 0.6 * hourlyRate) // save 60% of manual hours
    const timeSavingsAnnual = timeSavingsMonthly * 12

    // Total savings
    const totalSavingsMonthly = licenseSavingsMonthly + dupeSavingsMonthly + timeSavingsMonthly
    const totalSavingsAnnual = totalSavingsMonthly * 12

    // Efficyon cost
    const plan = getEfficyonPlan(employees)

    // Net ROI
    const netSavingsAnnual = totalSavingsAnnual - plan.annual
    const roiPct = plan.annual > 0 ? Math.round((netSavingsAnnual / plan.annual) * 100) : 0

    // Payback period
    const dailySavings = totalSavingsAnnual / 365
    const paybackDays = dailySavings > 0 ? Math.round(plan.annual / (dailySavings * 365) * 365) : 999
    // Simplified: paybackDays = plan.annual / dailySavings
    const paybackDaysCalc = dailySavings > 0 ? Math.round(plan.annual / dailySavings) : 999

    // 3-year projection
    const threeYearSavings = netSavingsAnnual * 3

    // Optimized spend
    const optimizedMonthly = monthlySpend - licenseSavingsMonthly - dupeSavingsMonthly

    return {
      licenseSavingsMonthly,
      licenseSavingsAnnual,
      licenseRate: Math.round(licenseRate * 100),
      dupeSavingsMonthly,
      dupeSavingsAnnual,
      dupeRate: Math.round(dupeRate * 100),
      timeSavingsMonthly,
      timeSavingsAnnual,
      hoursSaved: Math.round(hoursManagement * 0.6),
      totalSavingsMonthly,
      totalSavingsAnnual,
      plan,
      netSavingsAnnual,
      roiPct,
      paybackDays: paybackDaysCalc,
      threeYearSavings,
      optimizedMonthly,
    }
  }, [monthlySpend, numTools, employees, hoursManagement, hourlyRate])

  /* --- JSON-LD --- */
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SaaS Optimization ROI Calculator",
      url: "https://www.efficyon.com/calculator/roi",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Calculate your potential return on investment from SaaS cost optimization including license savings, duplicate elimination, and time savings.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Free ROI Calculator
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              SaaS Optimization ROI Calculator
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Calculate your potential return on investment from SaaS cost optimization. See how
              much you could save through license optimization, duplicate elimination, and time savings.
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
                <Wrench className="h-5 w-5 text-green-400" />
                Your Current Situation
              </h2>

              {/* Monthly SaaS spend */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Monthly SaaS Spend</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    min={0}
                    value={monthlySpend}
                    onChange={(e) => setMonthlySpend(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 rounded-lg bg-black/50 border border-white/20 text-white pl-9 pr-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50"
                  />
                </div>
              </div>

              {/* Number of SaaS tools */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Number of SaaS Tools</label>
                  <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-md">{numTools}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  value={numTools}
                  onChange={(e) => setNumTools(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-green-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-green-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-green-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                  <span>200</span>
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
                  min={10}
                  max={500}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-green-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-green-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-green-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>10</span>
                  <span>125</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              {/* Hours on manual management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Hours on Manual SaaS Management / Month</label>
                  <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-md">{hoursManagement}h</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={hoursManagement}
                  onChange={(e) => setHoursManagement(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-green-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-green-500/30
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-green-500/30"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0h</span>
                  <span>20h</span>
                  <span>40h</span>
                  <span>80h</span>
                </div>
              </div>

              {/* Hourly rate */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Average Hourly Cost (IT/Finance Staff)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    min={0}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 rounded-lg bg-black/50 border border-white/20 text-white pl-9 pr-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50"
                  />
                </div>
              </div>
            </div>

            {/* ---- RIGHT: Results ---- */}
            <div className="space-y-6">
              {/* ROI Summary Card */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6 md:p-8">
                <h3 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-6">ROI Summary</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Annual Savings</p>
                    <p className="text-3xl font-bold text-white transition-all duration-300">${fmt(results.totalSavingsAnnual)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ROI</p>
                    <p className="text-3xl font-bold text-green-400 transition-all duration-300">{fmt(results.roiPct)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payback Period</p>
                    <p className="text-3xl font-bold text-white transition-all duration-300">{results.paybackDays} <span className="text-lg text-gray-400">days</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">3-Year Net Savings</p>
                    <p className="text-3xl font-bold text-white transition-all duration-300">${fmt(results.threeYearSavings)}</p>
                  </div>
                </div>
              </div>

              {/* Savings Breakdown */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Savings Breakdown</h3>

                <div className="space-y-4">
                  {/* License optimization */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-cyan-400" />
                        License Optimization ({results.licenseRate}%)
                      </span>
                      <span className="text-white font-semibold">${fmt(results.licenseSavingsAnnual)}/yr</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                        style={{ width: `${results.totalSavingsAnnual > 0 ? (results.licenseSavingsAnnual / results.totalSavingsAnnual) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Duplicate elimination */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        Duplicate Elimination ({results.dupeRate}%)
                      </span>
                      <span className="text-white font-semibold">${fmt(results.dupeSavingsAnnual)}/yr</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                        style={{ width: `${results.totalSavingsAnnual > 0 ? (results.dupeSavingsAnnual / results.totalSavingsAnnual) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Time savings */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-green-400" />
                        Time Savings ({results.hoursSaved}h/mo saved)
                      </span>
                      <span className="text-white font-semibold">${fmt(results.timeSavingsAnnual)}/yr</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${results.totalSavingsAnnual > 0 ? (results.timeSavingsAnnual / results.totalSavingsAnnual) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Spend Comparison Bar */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Monthly Spend Comparison</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Current Spend</span>
                      <span className="text-white font-semibold">${fmt(monthlySpend)}/mo</span>
                    </div>
                    <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg bg-gradient-to-r from-red-500/80 to-red-400/80 w-full" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Optimized Spend</span>
                      <span className="text-green-400 font-semibold">${fmt(results.optimizedMonthly)}/mo</span>
                    </div>
                    <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${monthlySpend > 0 ? (results.optimizedMonthly / monthlySpend) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Efficyon Cost & Net ROI */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Investment vs Return</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Efficyon ({results.plan.name})</p>
                    <p className="text-xl font-bold text-white">${fmt(results.plan.monthly)}<span className="text-xs text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monthly Savings</p>
                    <p className="text-xl font-bold text-green-400">${fmt(results.totalSavingsMonthly)}<span className="text-xs text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Net Annual ROI</p>
                    <p className="text-xl font-bold text-green-400">${fmt(results.netSavingsAnnual)}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Savings Timeline */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Cumulative Savings Timeline</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 3, 6, 12].map((month) => {
                    const cumulative = results.totalSavingsMonthly * month - results.plan.monthly * month
                    return (
                      <div key={month} className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Month {month}</p>
                        <p className={`text-lg font-bold transition-all duration-300 ${cumulative >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {cumulative >= 0 ? "+" : ""}{fmt(cumulative)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
                <p className="text-white font-semibold mb-2">Ready to start saving?</p>
                <p className="text-gray-400 text-sm mb-4">
                  Connect your accounts and start seeing real savings within 2 weeks.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Start Saving Today
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
              <h2 className="text-2xl font-bold text-white mb-4">Understanding SaaS Optimization ROI</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Return on investment from SaaS optimization is one of the most compelling business cases in modern IT management. Unlike many technology investments that require months or years to demonstrate value, SaaS optimization delivers measurable financial returns within weeks. This is because the savings come from eliminating existing waste rather than building new capabilities &mdash; the money is already being spent, it is simply being spent inefficiently.
                </p>
                <p>
                  The typical company discovers that 20 to 30 percent of its SaaS budget is going toward subscriptions that are underutilized, duplicated across teams, or entirely unused. For a company spending $10,000 per month on SaaS, this translates to $24,000 to $36,000 in annual waste. Even after accounting for the cost of an optimization platform, the net savings are substantial and begin accumulating from the first month of implementation.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Three Pillars of SaaS Savings</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  SaaS optimization savings come from three primary sources, each contributing meaningfully to the total return. License optimization is typically the largest, accounting for 15 to 25 percent of total SaaS spend. This includes identifying and canceling licenses for employees who have left the organization, rightsizing subscription tiers based on actual feature usage, and renegotiating contracts using usage data as leverage.
                </p>
                <p>
                  Duplicate tool elimination usually contributes another 5 to 10 percent in savings. As organizations grow, different teams independently adopt tools for similar purposes. The marketing team might use one project management tool while engineering uses another and the operations team uses a third. Consolidating these into a single platform not only reduces direct subscription costs but also improves cross-team collaboration and reduces the learning curve for employees who move between departments.
                </p>
                <p>
                  Time savings represent the third pillar. IT and finance teams spend an average of 20 to 40 hours per month on manual SaaS management tasks including license tracking, invoice reconciliation, compliance verification, and vendor communication. Automating these processes with a platform like Efficyon frees up skilled staff to focus on strategic work rather than administrative overhead. At an average loaded cost of $50 per hour, saving 12 hours per month represents $7,200 in annual value.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Why Payback Is So Fast</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  The payback period for SaaS optimization is exceptionally short compared to other technology investments. Most companies achieve full payback within 15 to 45 days. The reason is straightforward: the savings begin as soon as the first unused licenses are identified and canceled, which typically happens within the first week of analysis.
                </p>
                <p>
                  Unlike enterprise software implementations that require months of configuration and training before delivering value, SaaS optimization platforms work immediately with your existing data. Efficyon connects to your accounting system and SaaS providers through secure API integrations, begins analyzing within hours, and delivers its first batch of actionable recommendations within two weeks. The savings from implementing even the first few recommendations often exceed the entire annual cost of the platform.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Compounding Returns Over Time</h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  One of the most valuable aspects of SaaS optimization is that the returns compound over time. The initial cleanup eliminates the most obvious waste, but continuous monitoring catches new inefficiencies as they emerge. New hires are assigned appropriate license tiers from day one. Departing employees have their licenses flagged for immediate deprovisioning. Subscription renewals are reviewed automatically, and the platform alerts you when usage patterns suggest a tier change would save money.
                </p>
                <p>
                  Over a three-year period, the cumulative savings from SaaS optimization typically exceed the initial year savings by a factor of 3.5 to 4, because the platform prevents waste from reaccumulating while also identifying new optimization opportunities as your tool stack evolves. This compounding effect makes SaaS optimization one of the highest-ROI investments an IT or finance team can make.
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
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-cyan-500/10" />
            <div className="relative z-10 px-8 py-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Start Saving Today
              </h2>
              <p className="text-gray-300 max-w-xl mx-auto mb-6">
                Every day without optimization is another day of unnecessary spending. Connect your
                tools in five minutes and start seeing your first savings recommendations within two weeks.
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
