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
  Rocket,
  DollarSign,
  TrendingUp,
  BarChart3,
  Zap,
  AlertTriangle,
  Users,
  CreditCard,
  Eye,
  Shield,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "SaaS Cost Optimization for Startups - Save $12K+/Year",
    description:
      "Stop burning runway on unused SaaS tools. Efficyon helps startups identify wasted licenses, overlapping subscriptions, and overpaid tiers. Average startup saves $12,000/year. Plans from $39/mo.",
    alternates: {
      canonical: "/solutions/for-startups",
    },
    openGraph: {
      title: "SaaS Cost Optimization Built for Startups | Efficyon",
      description:
        "Stop burning runway on unused SaaS tools. Average startup saves $12,000/year with Efficyon. Plans from $39/mo with 90-day ROI guarantee.",
      url: "https://www.efficyon.com/solutions/for-startups",
      type: "website",
    },
  }
}

export default function ForStartupsPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SaaS Cost Optimization Built for Startups | Efficyon",
    description:
      "Stop burning runway on unused SaaS tools. Efficyon helps startups identify wasted licenses, overlapping subscriptions, and overpaid tiers.",
    url: "https://www.efficyon.com/solutions/for-startups",
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
        name: "How much can a startup save with Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The average startup using Efficyon saves $12,000 per year on SaaS costs. Early-stage startups with 10-30 tools typically find 20-35% of their software spend is going toward unused or underutilized licenses. Some founders discover savings within the first week of connecting their accounts.",
        },
      },
      {
        "@type": "Question",
        name: "Is Efficyon worth it for a small team with only a few tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Even small teams with 10-15 SaaS subscriptions typically find $200-500/month in waste from forgotten trials, duplicate functionality, and overpaid tiers. At $39/month, Efficyon pays for itself many times over. Most startups see positive ROI within the first month.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly does Efficyon show results for startups?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most startups see their first actionable recommendations within 48 hours of connecting their accounts. The initial SaaS audit takes about 5 minutes to set up, and our AI begins analyzing spend patterns immediately. Full optimization recommendations are typically ready within 2 weeks.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon help us negotiate better vendor pricing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Efficyon provides benchmarking data showing what similar-sized companies pay for the same tools. Armed with this data, startups have negotiated an average of 15-25% off their SaaS renewals. We also flag when you are on an enterprise tier but only using starter-level features.",
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
              <Rocket className="h-4 w-4" />
              For Startups (1-50 employees)
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              SaaS Cost Optimization Built for Startups
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              You are burning cash on 30+ SaaS tools but actually using 60% of them. Efficyon finds
              the waste, eliminates the overlap, and extends your runway -- starting at just $39/month.
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
                <Link href="/#pricing">See Startup Plan</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>90-Day ROI Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>5-Minute Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No Credit Card Required</span>
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
                The SaaS Tax on Your Runway
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Startups adopt tools fast to move fast. But without oversight, your SaaS stack
                becomes your second-largest expense after payroll -- and the one nobody is managing.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Eye className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Zero Budget Visibility</h3>
                </div>
                <p className="text-gray-400">
                  The average startup with 25 employees uses 40+ SaaS products. With no dedicated
                  finance or IT team, subscriptions are scattered across personal credit cards,
                  company accounts, and expense reports. You genuinely do not know what you are
                  spending.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Rapid Growth, Rapid Waste</h3>
                </div>
                <p className="text-gray-400">
                  Every new hire brings their preferred tools. Every pivot leaves behind abandoned
                  subscriptions. A tool chosen for a 5-person team is now billed for 30 seats, but
                  only 12 people log in. The waste compounds every month.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">No Dedicated IT or Finance</h3>
                </div>
                <p className="text-gray-400">
                  At a startup, the CEO is the CTO, the CFO, and the IT department. Nobody has time
                  to audit 40 subscriptions, compare usage data, and negotiate renewals. It falls
                  through the cracks every single month.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Paying for Enterprise Tiers</h3>
                </div>
                <p className="text-gray-400">
                  Vendors are great at upselling. Your 15-person startup is on a Business plan that
                  is designed for 200-person companies. You are paying for features you will never
                  touch and API limits you will never hit -- but nobody noticed the auto-renewal.
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
                How Efficyon Protects Your Runway
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Connect your accounts in 5 minutes. Our AI does the rest -- no spreadsheets, no
                manual audits, no wasted founder time.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Complete Spend Visibility in Minutes
                  </h3>
                  <p className="text-gray-400">
                    Efficyon connects to your accounting software, bank feeds, and credit card
                    statements to build a complete picture of every SaaS subscription your startup
                    pays for. No more hunting through email receipts or asking team members what they
                    signed up for. You get a single, real-time dashboard showing every tool, every
                    cost, and every user.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    AI-Powered Waste Detection
                  </h3>
                  <p className="text-gray-400">
                    Our algorithms compare what you pay against what you actually use. They flag
                    unused licenses, identify team members who have not logged into tools in 30+
                    days, and spot duplicate functionality across your stack. When three different
                    teams are paying for three different project management tools, Efficyon tells you
                    which one to keep and which ones to cancel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Right-Size Every Subscription
                  </h3>
                  <p className="text-gray-400">
                    Efficyon analyzes your actual feature usage and recommends the exact plan tier
                    you need. If you are on Slack Business+ but only use features from the Pro plan,
                    we flag it. If you are paying for 50 Figma seats but only 22 people opened it
                    this month, we flag it. Every recommendation comes with the dollar amount you
                    save by acting.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Renewal Alerts Before It Is Too Late
                  </h3>
                  <p className="text-gray-400">
                    Never get caught by an auto-renewal again. Efficyon tracks every renewal date
                    across your entire stack and sends alerts 30, 14, and 7 days before each one.
                    You get time to evaluate, negotiate, or cancel -- instead of discovering a
                    $3,000 annual renewal charge on your credit card statement.
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
                Built for the Way Startups Work
              </h2>
              <p className="text-lg text-gray-300">
                No enterprise complexity. Just the features that actually save you money.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Real-Time Spend Dashboard</h3>
                <p className="text-gray-400">
                  See every subscription, categorized and tracked in real time. Filter by team,
                  category, or vendor. Know exactly where your money goes without opening a
                  spreadsheet.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Smart Recommendations</h3>
                <p className="text-gray-400">
                  AI-generated action items ranked by savings impact. Each recommendation shows
                  exactly what to do, how much you save, and a one-click path to execute. No
                  analysis paralysis.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Usage Analytics</h3>
                <p className="text-gray-400">
                  See which tools your team actually uses, how often, and by whom. Identify
                  shelfware before renewal day. Know the difference between what you buy and what
                  you need.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Renewal Management</h3>
                <p className="text-gray-400">
                  Automated tracking and alerts for every subscription renewal across your stack.
                  Get advance notice to renegotiate, downgrade, or cancel before charges hit your
                  account.
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
                The Numbers Speak for Themselves
              </h2>
              <p className="text-lg text-gray-300">
                Real savings data from startups using Efficyon.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-cyan-400">$12,000</p>
                <p className="text-lg text-white font-medium">Average Annual Savings</p>
                <p className="text-sm text-gray-400">
                  Per startup, from eliminating unused licenses, consolidating overlapping tools,
                  and right-sizing plan tiers.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-cyan-400">3-6 mo</p>
                <p className="text-lg text-white font-medium">Runway Extension</p>
                <p className="text-sm text-gray-400">
                  By redirecting wasted SaaS spend back into growth. Every dollar saved is a dollar
                  that extends your funding.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-cyan-400">308x</p>
                <p className="text-lg text-white font-medium">ROI on $39/mo Plan</p>
                <p className="text-sm text-gray-400">
                  Average startup saves $1,000/month while paying just $39/month for Efficyon.
                  That is a return you can show your investors.
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
                      className="h-5 w-5 text-cyan-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl text-gray-300 leading-relaxed">
                  &ldquo;We were spending $4,200/month on SaaS tools for a 22-person team. Efficyon
                  found $1,400/month in waste within the first week -- tools nobody used, plans we
                  had outgrown in the wrong direction, and two project management tools doing the
                  same job. That is $16,800/year back on our balance sheet. It basically paid for
                  another engineer.&rdquo;
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Marcus Chen</p>
                  <p className="text-gray-400 text-sm">
                    Co-Founder & CEO, Series A SaaS Startup (28 employees)
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
              Common questions from startup founders and ops teams.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How much can a startup save with Efficyon?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                The average startup using Efficyon saves $12,000 per year on SaaS costs.
                Early-stage startups with 10-30 tools typically find 20-35% of their software spend
                is going toward unused or underutilized licenses. Some founders discover savings
                within the first week of connecting their accounts. The Startup plan costs $39/month
                -- most customers see positive ROI within the very first month.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Is Efficyon worth it for a small team with only a few tools?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Even small teams with 10-15 SaaS subscriptions typically find $200-500/month in
                waste from forgotten trials, duplicate functionality, and overpaid tiers. At
                $39/month, Efficyon pays for itself many times over. Beyond direct savings, the
                visibility alone prevents future waste as you grow and add more tools. Think of it
                as insurance against SaaS sprawl.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How quickly does Efficyon show results for startups?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Most startups see their first actionable recommendations within 48 hours of
                connecting their accounts. The initial SaaS audit takes about 5 minutes to set up,
                and our AI begins analyzing spend patterns immediately. Full optimization
                recommendations are typically ready within 2 weeks, including specific dollar
                amounts for each potential savings opportunity.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon help us negotiate better vendor pricing?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Absolutely. Efficyon provides benchmarking data showing what similar-sized companies
                pay for the same tools. Armed with this data, startups have negotiated an average of
                15-25% off their SaaS renewals. We also flag when you are on an enterprise tier but
                only using starter-level features, giving you the evidence you need to downgrade
                without losing any functionality your team actually depends on.
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
              Stop Burning Runway on Tools You Don&apos;t Use
            </h2>
            <p className="text-lg text-gray-300">
              Join hundreds of startups that have reclaimed thousands in wasted SaaS spend. Your
              free analysis takes 5 minutes and shows you exactly where the money is going.
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
                <Link href="/#contact">Talk to a Founder</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>Startup plan from $39/mo</span>
              <span>|</span>
              <span>90-day ROI guarantee</span>
              <span>|</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
