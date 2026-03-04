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
  AlertTriangle,
  FileSpreadsheet,
  TrendingDown,
  Zap,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Spreadsheets vs SaaS Management Software - Why Manual Tracking Costs More",
    description:
      "Still tracking SaaS subscriptions in spreadsheets? See the real cost of manual tracking vs automated tools like Efficyon. Calculate your hidden labor costs and data accuracy gaps.",
    alternates: {
      canonical: "/compare/efficyon-vs-spreadsheets",
    },
    openGraph: {
      title: "Why Spreadsheets Are Costing You More Than a SaaS Management Tool",
      description:
        "The true cost of tracking SaaS in spreadsheets: 20+ hours/month in labor, constant data gaps, and missed savings. See how automation changes the equation.",
      url: "https://www.efficyon.com/compare/efficyon-vs-spreadsheets",
    },
  }
}

export default function EfficyonVsSpreadsheetsPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Why Spreadsheets Are Costing You More Than a SaaS Management Tool",
    description:
      "Comprehensive analysis of the true cost of tracking SaaS subscriptions in spreadsheets versus using automated tools like Efficyon.",
    url: "https://www.efficyon.com/compare/efficyon-vs-spreadsheets",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much time does manual SaaS tracking in spreadsheets take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most companies report spending 20-40+ hours per month on manual SaaS tracking, including gathering data from invoices, updating spreadsheets, reconciling discrepancies, and creating reports. For a finance or IT professional earning $50-75/hour, that's $1,000-3,000 per month in labor costs alone.",
        },
      },
      {
        "@type": "Question",
        name: "Why are spreadsheets inaccurate for SaaS tracking?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Spreadsheets rely on manual data entry, which means they are immediately outdated the moment they are updated. They cannot track real-time usage, automatically detect new subscriptions, or catch mid-cycle pricing changes. Studies show manual data entry has a 1-5% error rate, which compounds across hundreds of data points.",
        },
      },
      {
        "@type": "Question",
        name: "When should a company switch from spreadsheets to SaaS management software?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Consider switching when you have more than 10-15 SaaS subscriptions, when SaaS spend exceeds $5,000/month, when you've missed a renewal or overpaid due to outdated data, or when the person managing the spreadsheet spends more than 5 hours per month on it. At $39/month, Efficyon pays for itself when it saves just one unnecessary license.",
        },
      },
      {
        "@type": "Question",
        name: "What can Efficyon find that spreadsheets cannot?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon connects to your actual tools and accounting systems to find: usage patterns showing which licenses are underutilized, overlapping tools serving the same purpose, pricing tier mismatches where you're paying for features you don't use, automatic detection of new or changed subscriptions, and AI-generated recommendations with specific dollar savings.",
        },
      },
      {
        "@type": "Question",
        name: "How much does Efficyon cost compared to the labor cost of spreadsheet tracking?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon starts at $39/month. The average labor cost of manual spreadsheet tracking is $1,000-3,000/month for a single person's time. This means Efficyon costs 97% less than the labor required to maintain a spreadsheet -- and it provides dramatically better data, AI-powered insights, and automatic savings recommendations that spreadsheets simply cannot offer.",
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
              <FileSpreadsheet className="h-4 w-4" />
              Spreadsheets vs. Automation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Why Spreadsheets Are Costing You More Than a SaaS Management Tool
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Most companies start tracking SaaS subscriptions in spreadsheets. It seems free and
              simple. But the hidden costs of manual tracking -- in labor, errors, and missed savings
              -- typically exceed $2,000/month. Here is a detailed look at the true cost comparison
              and why even a $39/month tool saves you money from day one.
            </p>
          </div>
        </div>
      </section>

      {/* The Hidden Cost Banner */}
      <section className="py-8 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="border border-red-500/20 rounded-xl p-8 bg-red-500/[0.03]">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-red-400 mb-2">20-40+</div>
                <div className="text-gray-300 text-sm">hours/month spent on manual SaaS tracking</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400 mb-2">$2,000+</div>
                <div className="text-gray-300 text-sm">monthly labor cost at $50-75/hour</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400 mb-2">15-30%</div>
                <div className="text-gray-300 text-sm">of SaaS spend wasted without visibility</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Comparison Table */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Spreadsheet vs Efficyon: Side by Side
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Capability</th>
                  <th className="text-center py-4 px-6 text-cyan-400 font-semibold">Efficyon</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-semibold">Spreadsheets</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Monthly Cost", efficyon: "From $39/mo", spreadsheet: "$2,000+ in labor" },
                  { feature: "Data Accuracy", efficyon: "Real-time, automated", spreadsheet: "Manual, often outdated" },
                  { feature: "Usage Tracking", efficyon: true, spreadsheet: false },
                  { feature: "AI Recommendations", efficyon: true, spreadsheet: false },
                  { feature: "Auto-Detection of New Apps", efficyon: true, spreadsheet: false },
                  { feature: "Spend vs Usage Analysis", efficyon: true, spreadsheet: false },
                  { feature: "Time Required", efficyon: "Minutes/week", spreadsheet: "20-40+ hrs/month" },
                  { feature: "Renewal Alerts", efficyon: "Automatic", spreadsheet: "Manual calendar entries" },
                  { feature: "Overlap Detection", efficyon: "AI-powered", spreadsheet: "Requires expertise" },
                  { feature: "Historical Trend Analysis", efficyon: "Automatic", spreadsheet: "Manual charts" },
                  { feature: "Scales with Growth", efficyon: true, spreadsheet: false },
                  { feature: "ROI Guarantee", efficyon: "90-day guarantee", spreadsheet: "N/A" },
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
                      {typeof row.spreadsheet === "boolean" ? (
                        row.spreadsheet ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-200">{row.spreadsheet}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed Breakdown */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            The True Cost of Spreadsheet SaaS Tracking
          </h2>

          <div className="space-y-16">
            {/* Labor Costs */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-red-400" />
                  <h3 className="text-xl font-semibold text-white">Labor Costs: $1,000-3,000+/Month</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Maintaining a SaaS tracking spreadsheet is not a quick task. Someone (usually in finance
                  or IT) has to regularly gather invoice data, update subscription details, check for new
                  tools, reconcile discrepancies, and generate reports. For most companies, this adds up
                  to 20-40 hours per month.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  At $50-75/hour (a reasonable rate for a finance or IT professional), that is $1,000 to
                  $3,000 per month in labor -- just to maintain a spreadsheet that is still often inaccurate
                  and incomplete. This is the single biggest hidden cost of the &quot;free&quot; spreadsheet approach.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-red-400 mb-3">Monthly time breakdown</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Gathering invoice and billing data</span>
                    <span className="text-gray-400">8-12 hrs</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Updating spreadsheet entries</span>
                    <span className="text-gray-400">4-8 hrs</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Reconciling discrepancies</span>
                    <span className="text-gray-400">3-6 hrs</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Creating reports and summaries</span>
                    <span className="text-gray-400">3-5 hrs</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Checking for new/changed subscriptions</span>
                    <span className="text-gray-400">2-4 hrs</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-gray-200 font-medium">
                    <span>Total monthly time</span>
                    <span className="text-red-400">20-35+ hours</span>
                  </div>
                  <div className="flex justify-between text-gray-200 font-medium">
                    <span>At $60/hour average</span>
                    <span className="text-red-400">$1,200-2,100+/month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Accuracy */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-xl font-semibold text-white">Data Accuracy: Always Behind</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  A spreadsheet is only as accurate as the last time someone updated it. In practice,
                  this means your SaaS inventory is always slightly -- or significantly -- wrong.
                  Employees sign up for new tools without telling IT. Prices change. Contracts auto-renew
                  at higher rates. Trial subscriptions convert to paid plans.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Research shows that manual data entry has a 1-5% error rate. When you are tracking 50-100+
                  SaaS tools with multiple data points each, errors compound quickly. One missed zero turns
                  a $120/year subscription into $1,200, throwing off your entire analysis.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-yellow-400 mb-3">Common spreadsheet blind spots</h4>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    Shadow IT: apps purchased outside of IT/finance approval
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    Mid-cycle price changes and overages
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    Auto-renewed contracts at higher rates
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    Trial-to-paid conversions nobody noticed
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    Duplicate subscriptions across departments
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    Usage data (who is actually using each tool)
                  </li>
                </ul>
              </div>
            </div>

            {/* No Usage Data */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <TrendingDown className="h-6 w-6 text-orange-400" />
                  <h3 className="text-xl font-semibold text-white">Zero Usage Visibility</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  This is perhaps the most critical limitation. A spreadsheet can tell you what you are
                  paying for a tool, but it cannot tell you if people are actually using it. Without usage
                  data, you are guessing about which licenses are underutilized, which tools overlap in
                  functionality, and which subscriptions could be downgraded.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon connects to your SaaS tools to track actual usage, then cross-references that
                  with spending data. This is how it identifies that you are paying for 30 Zoom Pro licenses
                  but only 18 are used regularly -- saving you $1,440/year on just that one tool.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-orange-400 mb-3">What usage data reveals</h4>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  Typical findings when usage data is first connected:
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Licenses with zero usage (last 90 days)</span>
                    <span className="text-red-400 font-medium">15-25%</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Licenses with minimal usage</span>
                    <span className="text-yellow-400 font-medium">10-20%</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tools with overlapping functionality</span>
                    <span className="text-orange-400 font-medium">3-5 groups</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Users on wrong pricing tier</span>
                    <span className="text-yellow-400 font-medium">20-35%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* No AI Insights */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">No AI-Powered Insights</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Even if your spreadsheet is perfectly maintained (it is not), it cannot analyze patterns,
                  identify optimization opportunities, or generate recommendations. A spreadsheet stores data;
                  it does not think about it. Finding savings requires human expertise, time, and effort --
                  and humans miss patterns that AI catches.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon&apos;s AI continuously analyzes your spending and usage patterns to find savings you
                  would not spot in a spreadsheet. It identifies cross-tool overlap, pricing anomalies,
                  seasonal usage patterns, and tier optimization opportunities across your entire stack.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">AI insights spreadsheets cannot provide</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Cross-tool overlap detection (e.g., Asana + Monday.com + Trello)
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Tier optimization (users on Business tier using only Free features)
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Predictive cost forecasting based on growth patterns
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Automatic detection of pricing anomalies and overcharges
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Prioritized action plans ranked by savings impact
                  </li>
                </ul>
              </div>
            </div>

            {/* Scale Problems */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Spreadsheets Do Not Scale</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  When you have 10 SaaS tools, a spreadsheet might work. At 30, it becomes painful. At 50+,
                  it becomes a full-time job. And as your company grows, the number of tools, users, and
                  complexity of your SaaS stack grows with it. The spreadsheet approach gets more expensive
                  and less effective over time.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Efficyon scales automatically. Whether you have 10 tools or 200, the platform connects,
                  analyzes, and recommends without requiring more manual effort. Your cost stays the same
                  as your stack grows, while a spreadsheet approach would require proportionally more labor.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-medium text-green-400 mb-3">The cost comparison over time</h4>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-4 text-gray-400 font-medium mb-2">
                    <span>SaaS Tools</span>
                    <span className="text-center">Spreadsheet/mo</span>
                    <span className="text-center">Efficyon/mo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-gray-300">
                    <span>10-20</span>
                    <span className="text-center text-red-400">$800-1,200</span>
                    <span className="text-center text-green-400">$39</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-gray-300">
                    <span>20-50</span>
                    <span className="text-center text-red-400">$1,500-2,500</span>
                    <span className="text-center text-green-400">$119</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-gray-300">
                    <span>50-100</span>
                    <span className="text-center text-red-400">$2,500-4,000</span>
                    <span className="text-center text-green-400">$119</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-gray-300">
                    <span>100+</span>
                    <span className="text-center text-red-400">$4,000+</span>
                    <span className="text-center text-green-400">Custom</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-4">
                  * Spreadsheet costs based on estimated labor at $60/hour average
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Total Cost Comparison */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Total Cost Comparison: Spreadsheet vs. Efficyon
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-red-500/20 rounded-xl p-8 bg-red-500/[0.03]">
              <h3 className="text-xl font-semibold text-white mb-2">Spreadsheet Tracking</h3>
              <p className="text-gray-400 text-sm mb-6">Annual cost for a 30-person company</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Labor (25 hrs/mo at $60/hr)</span>
                  <span className="text-red-400 font-semibold">$18,000/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Missed savings (no usage data)</span>
                  <span className="text-red-400 font-semibold">$12,000-30,000/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Error-related overspend</span>
                  <span className="text-red-400 font-semibold">$2,000-5,000/year</span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span className="text-white">Total hidden cost</span>
                  <span className="text-red-400">$32,000-53,000/year</span>
                </div>
              </div>
            </div>

            <div className="border border-cyan-500/20 rounded-xl p-8 bg-cyan-500/[0.03]">
              <h3 className="text-xl font-semibold text-white mb-2">Efficyon</h3>
              <p className="text-gray-400 text-sm mb-6">Annual cost for a 30-person company</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Efficyon Growth plan</span>
                  <span className="text-green-400 font-semibold">$1,428/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Labor (automated, ~2 hrs/mo review)</span>
                  <span className="text-green-400 font-semibold">$1,440/year</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-300">Expected SaaS savings from AI</span>
                  <span className="text-green-400 font-semibold">-$18,000-36,000/year</span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span className="text-white">Net annual benefit</span>
                  <span className="text-green-400">$15,000-33,000 saved</span>
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
            Why Companies Upgrade from Spreadsheets
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "The SaaS stack outgrew the spreadsheet",
                description:
                  "What started as a simple list of 10 subscriptions has grown to 40, 60, or 100+ tools. The spreadsheet that took 2 hours a month now takes 20+. Teams realize they need automation when the manual approach starts consuming significant time.",
              },
              {
                title: "Missed a costly renewal",
                description:
                  "A contract auto-renewed at a 20% higher rate because nobody updated the calendar reminder. Or a tool the team stopped using kept charging for 6 months. These expensive mistakes often trigger the search for a better solution.",
              },
              {
                title: "Leadership asked questions they could not answer",
                description:
                  "When the CFO asks 'Which tools have we added this quarter and what is our total SaaS cost growth?' and the answer requires a week of research, companies realize they need real-time data and automated reporting.",
              },
              {
                title: "Discovery that SaaS waste was significant",
                description:
                  "Even a rough audit often reveals 15-30% waste in SaaS spending. When companies realize they are losing tens of thousands per year in unused licenses and redundant tools, a $39/month solution becomes obvious.",
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

      {/* When to Upgrade */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            When Should You Upgrade from Spreadsheets?
          </h2>
          <div className="border border-white/10 rounded-xl p-8 bg-white/[0.02]">
            <p className="text-gray-300 leading-relaxed mb-6">
              Spreadsheets make sense when you are just starting out with a handful of subscriptions.
              But there are clear signals that it is time to upgrade to a dedicated tool:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                "You have more than 10-15 SaaS subscriptions",
                "Total SaaS spend exceeds $5,000/month",
                "You have missed at least one renewal or overpayment",
                "Someone spends more than 5 hours/month managing the spreadsheet",
                "You cannot answer 'how much do we spend on SaaS?' within 5 minutes",
                "You suspect there are tools being paid for that nobody uses",
                "Different departments are buying overlapping tools",
                "You are growing and adding new tools regularly",
              ].map((signal, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{signal}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-6">
              If two or more of these apply to your organization, you are likely losing more money on
              spreadsheet inefficiency than you would spend on Efficyon.
            </p>
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
                How much time does manual SaaS tracking in spreadsheets take?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Most companies report spending 20-40+ hours per month on manual SaaS tracking, including
                gathering data from invoices, updating spreadsheets, reconciling discrepancies, and creating
                reports. For a finance or IT professional earning $50-75/hour, that is $1,000-3,000 per month
                in labor costs alone -- far more than the $39/month Efficyon charges.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Why are spreadsheets inaccurate for SaaS tracking?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Spreadsheets rely on manual data entry, which means they are immediately outdated the moment
                they are updated. They cannot track real-time usage, automatically detect new subscriptions,
                or catch mid-cycle pricing changes. Studies show manual data entry has a 1-5% error rate,
                which compounds across hundreds of data points into significant inaccuracies.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                When should a company switch from spreadsheets to SaaS management software?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Consider switching when you have more than 10-15 SaaS subscriptions, when SaaS spend exceeds
                $5,000/month, when you have missed a renewal or overpaid due to outdated data, or when the
                person managing the spreadsheet spends more than 5 hours per month on it. At $39/month,
                Efficyon pays for itself when it saves just one unnecessary license.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What can Efficyon find that spreadsheets cannot?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon connects to your actual tools and accounting systems to find: usage patterns showing
                which licenses are underutilized, overlapping tools serving the same purpose, pricing tier
                mismatches where you are paying for features you do not use, automatic detection of new or
                changed subscriptions, and AI-generated recommendations with specific dollar savings attached
                to each action.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How much does Efficyon cost compared to the labor cost of spreadsheet tracking?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon starts at $39/month. The average labor cost of manual spreadsheet tracking is
                $1,000-3,000/month for a single person&apos;s time. This means Efficyon costs 97% less than
                the labor required to maintain a spreadsheet -- and it provides dramatically better data,
                AI-powered insights, and automatic savings recommendations that spreadsheets simply cannot offer.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to retire the spreadsheet?
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Stop spending 20+ hours a month on manual SaaS tracking. Efficyon automates everything,
            adds AI-powered savings recommendations, and costs less than a single hour of the labor
            you are currently spending. Start your free analysis today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
            >
              Start Free Analysis -- $39/mo
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
