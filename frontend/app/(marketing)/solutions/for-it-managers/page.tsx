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
  Monitor,
  Shield,
  Search,
  AlertTriangle,
  Eye,
  Lock,
  BarChart3,
  Scan,
  FileWarning,
  Users,
  Activity,
  Layers,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "Software Asset Management for IT Teams - Full Visibility",
    description:
      "Software asset management that IT teams actually use. Automated discovery, shadow IT detection, license compliance, and security gap closure. Identify 100% of software in your environment.",
    alternates: {
      canonical: "/solutions/for-it-managers",
    },
    openGraph: {
      title: "Software Asset Management That IT Teams Actually Use | Efficyon",
      description:
        "Automated software discovery, shadow IT detection, license compliance monitoring, and security alerts. Full inventory of every tool in your organization.",
      url: "https://www.efficyon.com/solutions/for-it-managers",
      type: "website",
    },
  }
}

export default function ForITManagersPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Software Asset Management That IT Teams Actually Use | Efficyon",
    description:
      "Automated software discovery, shadow IT detection, license compliance monitoring, and security alerts for IT teams.",
    url: "https://www.efficyon.com/solutions/for-it-managers",
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
        name: "How does Efficyon detect shadow IT?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon analyzes payment data from accounting systems, bank feeds, and expense reports to identify SaaS subscriptions that were purchased outside of IT-approved procurement channels. When a marketing team member signs up for a new design tool using a company card, Efficyon flags it immediately so IT can evaluate the security and compliance implications before it becomes embedded in workflows.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon help with software license compliance?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon tracks license counts against actual usage across your organization. It flags when you have more licenses than active users (overspend), when users share credentials (compliance risk), and when you are approaching license limits. This is critical for audit preparedness and avoiding both overpayment and compliance penalties.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon integrate with our existing IT management tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon integrates with popular IT management and identity platforms including Okta, Azure AD, Google Workspace, Jamf, and ServiceNow. These integrations enrich our analysis by combining financial data with identity and access data, giving IT a complete picture of who has access to what and whether that access is justified by actual usage.",
        },
      },
      {
        "@type": "Question",
        name: "How is Efficyon different from traditional IT asset management (ITAM) tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Traditional ITAM tools focus on installed software and hardware inventory. Efficyon focuses specifically on SaaS, which is where most modern IT spend goes but where traditional tools have blind spots. Efficyon combines financial data with usage data to answer questions ITAM tools cannot: Which SaaS tools are we paying for that nobody uses? Where do we have overlapping functionality? Are we on the right pricing tier?",
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
              <Monitor className="h-4 w-4" />
              For IT Managers & Directors
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              Software Asset Management That IT Teams Actually Use
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Your users adopted 40% more SaaS tools than IT approved. Efficyon gives you a
              complete inventory of every tool in your environment -- who is using it, what it
              costs, and whether it is a risk.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Start Free Discovery
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Book an IT Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Shadow IT Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Compliance Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>SOC 2 Compliant</span>
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
                The SaaS Sprawl IT Cannot See
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Gartner estimates that shadow IT accounts for 30-40% of IT spending in large
                enterprises. Every unapproved tool is a potential security vulnerability, compliance
                risk, and budget leak.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Eye className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Shadow IT Proliferation</h3>
                </div>
                <p className="text-gray-400">
                  Employees sign up for SaaS tools with a company email and a credit card. No
                  procurement process, no security review, no IT visibility. Marketing uses one
                  file-sharing tool, engineering uses another, and sales uses a third. Each one
                  stores company data outside of your control. In the average 200-person company,
                  there are 3-4x more SaaS apps in use than IT is aware of.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <FileWarning className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">License Compliance Risks</h3>
                </div>
                <p className="text-gray-400">
                  Are you over-licensed or under-licensed? Both are costly. Over-licensing wastes
                  budget. Under-licensing creates legal exposure. Credential sharing compounds the
                  problem. Without real-time tracking of license counts versus active users, you
                  are flying blind during vendor audits and internal compliance reviews.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Layers className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Vendor Sprawl</h3>
                </div>
                <p className="text-gray-400">
                  When every team picks their own tools, you end up with three project management
                  platforms, two CRM systems, four video conferencing solutions, and five ways to
                  share files. The overlap wastes money, creates data silos, complicates
                  integrations, and multiplies the attack surface IT needs to secure.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Lock className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Security Gaps</h3>
                </div>
                <p className="text-gray-400">
                  Every SaaS tool an employee signs up for is another potential data exfiltration
                  point. Does it support SSO? Does it have SOC 2 certification? Does it store data
                  in a compliant region? If IT does not know a tool exists, IT cannot evaluate its
                  security posture. Former employees may retain access to shadow IT tools long
                  after offboarding.
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
                How Efficyon Gives IT Complete Control
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Automated discovery, continuous monitoring, and actionable intelligence -- without
                installing agents on every machine.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Scan className="h-6 w-6 text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Automated SaaS Discovery
                  </h3>
                  <p className="text-gray-400">
                    Efficyon analyzes financial data, SSO logs, and email domains to build a
                    complete inventory of every SaaS tool in your organization. No agent
                    installation required. No employee surveys. No guesswork. Within days of
                    connecting, you see the full picture -- including the tools nobody in IT knew
                    existed. New tools are flagged the moment they appear in payment data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Search className="h-6 w-6 text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Shadow IT Detection and Classification
                  </h3>
                  <p className="text-gray-400">
                    Every newly discovered application is classified by risk level. Efficyon
                    evaluates whether the vendor supports SSO, holds security certifications, and
                    stores data in compliant regions. High-risk shadow IT gets flagged immediately
                    so IT can intervene before sensitive data flows into unapproved systems. You
                    get a clear, prioritized list of what to address first.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Activity className="h-6 w-6 text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Usage Tracking and License Optimization
                  </h3>
                  <p className="text-gray-400">
                    See exactly who is using each tool and how often. Identify licenses assigned
                    to employees who have not logged in for 30, 60, or 90 days. Spot credential
                    sharing patterns that violate license terms. Efficyon gives you the data to
                    right-size every subscription and ensure compliance, while reclaiming licenses
                    from inactive users before the next renewal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Compliance Reporting and Security Alerts
                  </h3>
                  <p className="text-gray-400">
                    Generate compliance reports for SOC 2, ISO 27001, and GDPR audits that show
                    complete software inventory with vendor security posture assessments.
                    Real-time alerts notify IT when new unapproved tools are adopted, when
                    license counts change unexpectedly, or when a vendor&apos;s security posture
                    degrades. Stay ahead of compliance requirements instead of scrambling at audit
                    time.
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
                Features Built for IT Operations
              </h2>
              <p className="text-lg text-gray-300">
                The tools you need to manage, secure, and optimize your SaaS environment.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center">
                  <Scan className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Automated Discovery</h3>
                <p className="text-gray-400">
                  Continuous scanning of financial data, SSO platforms, and email to discover
                  every SaaS application in your organization. No agents, no surveys, no gaps.
                  New tools are identified within hours of first payment.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Usage Tracking</h3>
                <p className="text-gray-400">
                  Per-user, per-tool usage analytics showing login frequency, feature adoption,
                  and activity trends. Identify inactive licenses, underutilized tools, and
                  credential sharing across your entire SaaS portfolio.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <FileWarning className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Compliance Reporting</h3>
                <p className="text-gray-400">
                  Pre-built compliance report templates for SOC 2, ISO 27001, and GDPR audits.
                  Complete software inventory with vendor security assessments, license counts,
                  and access histories. Ready for auditors in minutes.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Security Alerts</h3>
                <p className="text-gray-400">
                  Real-time notifications when unapproved tools are adopted, when access
                  anomalies are detected, or when vendor security postures change. Prioritized by
                  risk level so you address the most critical items first.
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
                Measurable Impact for IT
              </h2>
              <p className="text-lg text-gray-300">
                What IT teams achieve with Efficyon in the first 90 days.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-green-400">100%</p>
                <p className="text-lg text-white font-medium">Software Visibility</p>
                <p className="text-sm text-gray-400">
                  Complete inventory of every SaaS tool in your organization, including shadow IT
                  adopted without IT approval or knowledge.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-green-400">40%</p>
                <p className="text-lg text-white font-medium">Redundant Tools Eliminated</p>
                <p className="text-sm text-gray-400">
                  Average reduction in overlapping tools after consolidation. Fewer vendors means
                  fewer integrations, fewer security reviews, and fewer things to manage.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-green-400">Zero</p>
                <p className="text-lg text-white font-medium">Compliance Surprises</p>
                <p className="text-sm text-gray-400">
                  Real-time license tracking and vendor security monitoring ensures you are audit-ready
                  at all times, not just during audit season.
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
                      className="h-5 w-5 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl text-gray-300 leading-relaxed">
                  &ldquo;We thought we had about 60 SaaS tools. Efficyon found 147. Nearly half
                  were shadow IT -- tools adopted by individual teams without any IT involvement.
                  Three of them had known security vulnerabilities and two were storing customer
                  data in non-compliant regions. Within 60 days, we consolidated down to 89 tools,
                  saved $180K annually, and closed security gaps we did not even know existed.&rdquo;
                </blockquote>
                <div>
                  <p className="text-white font-semibold">David Kowalski</p>
                  <p className="text-gray-400 text-sm">
                    IT Director, B2B SaaS Company (340 employees)
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
              Common questions from IT managers evaluating SaaS management solutions.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon detect shadow IT?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon analyzes payment data from accounting systems, bank feeds, and expense
                reports to identify SaaS subscriptions purchased outside of IT-approved procurement
                channels. When a marketing team member signs up for a new design tool using a
                company card, Efficyon flags it immediately so IT can evaluate the security and
                compliance implications before it becomes embedded in workflows.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon help with software license compliance?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Efficyon tracks license counts against actual usage across your organization.
                It flags when you have more licenses than active users (overspend), when users share
                credentials (compliance risk), and when you are approaching license limits. This is
                critical for audit preparedness and avoiding both overpayment and compliance
                penalties from vendors.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon integrate with our existing IT management tools?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon integrates with popular IT management and identity platforms including
                Okta, Azure AD, Google Workspace, Jamf, and ServiceNow. These integrations enrich
                our analysis by combining financial data with identity and access data, giving IT a
                complete picture of who has access to what and whether that access is justified by
                actual usage patterns.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                How is Efficyon different from traditional ITAM tools?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Traditional IT asset management tools focus on installed software and hardware
                inventory. Efficyon focuses specifically on SaaS, which is where most modern IT
                spend goes but where traditional tools have blind spots. Efficyon combines financial
                data with usage data to answer questions ITAM tools cannot: Which SaaS tools are we
                paying for that nobody uses? Where do we have overlapping functionality? Are we on
                the right pricing tier for each vendor?
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
              See Every Tool in Your Organization. Finally.
            </h2>
            <p className="text-lg text-gray-300">
              Stop guessing what software your teams are using. Start your free SaaS discovery
              and get a complete inventory of your software environment within days.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Start Free Discovery
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Schedule an IT Demo</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>No agents required</span>
              <span>|</span>
              <span>SOC 2 compliant</span>
              <span>|</span>
              <span>90-day ROI guarantee</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
