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
  Building2,
  Shield,
  Lock,
  Users,
  Workflow,
  Server,
  Globe,
  Key,
  Layers,
  HeadphonesIcon,
  BarChart3,
  FileCheck,
  Plug,
} from "lucide-react"

export function generateMetadata(): Metadata {
  return {
    title: "Enterprise SaaS Management Platform - Scale with Control",
    description:
      "Enterprise-grade SaaS management at scale. SSO/SAML, custom integrations, dedicated CSM, SLA guarantees, and SOC 2/GDPR compliance. Enterprise customers save $500K+ annually with 40% reduction in redundant tools.",
    alternates: {
      canonical: "/solutions/for-enterprise",
    },
    openGraph: {
      title: "Enterprise-Grade SaaS Management at Scale | Efficyon",
      description:
        "SSO/SAML, custom integrations, dedicated support, and compliance-ready SaaS management. Enterprise customers save $500K+ annually.",
      url: "https://www.efficyon.com/solutions/for-enterprise",
      type: "website",
    },
  }
}

export default function ForEnterprisePage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Enterprise-Grade SaaS Management at Scale | Efficyon",
    description:
      "Enterprise SaaS management with SSO/SAML, custom integrations, dedicated support, and compliance-ready reporting. $500K+ annual savings.",
    url: "https://www.efficyon.com/solutions/for-enterprise",
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
        name: "What security and compliance certifications does Efficyon hold?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is SOC 2 Type II certified and GDPR compliant. We undergo annual third-party security audits and maintain comprehensive security documentation available under NDA. All data is encrypted at rest and in transit, and we support data residency requirements for EU and other regulated jurisdictions. Our security team provides dedicated support for enterprise procurement reviews.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon support SSO and SAML authentication?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enterprise plans include full SSO/SAML 2.0 support with integration for Okta, Azure AD, OneLogin, Ping Identity, and other SAML-compliant identity providers. We also support SCIM provisioning for automated user lifecycle management. This ensures that access to Efficyon follows your existing identity governance policies.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon integrate with our existing enterprise systems?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon offers pre-built integrations with 50+ enterprise tools including SAP, Oracle, NetSuite, Workday, ServiceNow, and Salesforce. For systems without pre-built connectors, our REST API and webhook support enable custom integrations. Enterprise customers receive dedicated integration engineering support to ensure smooth deployment within your existing technology stack.",
        },
      },
      {
        "@type": "Question",
        name: "What does the enterprise onboarding process look like?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enterprise onboarding is led by a dedicated Customer Success Manager who guides your team through configuration, integration, and rollout. Typical enterprise deployments are production-ready within 4-6 weeks. This includes security review, SSO configuration, data source integration, custom reporting setup, and team training. We provide ongoing quarterly business reviews to ensure continuous optimization.",
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              For Enterprise (500+ employees)
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              Enterprise-Grade SaaS Management at Scale
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Thousands of subscriptions. Hundreds of vendors. Dozens of departments. Efficyon
              gives enterprise IT, procurement, and finance the platform to manage it all -- with
              the security, compliance, and integration depth your organization demands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/#contact">
                  Request Enterprise Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Contact Sales</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>SSO/SAML</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Dedicated CSM</span>
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
                The Enterprise SaaS Management Challenge
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                At enterprise scale, SaaS management is not just a cost problem -- it is an
                operational, security, and compliance problem that touches every department.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Layers className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Thousands of Subscriptions</h3>
                </div>
                <p className="text-gray-400">
                  Enterprise organizations with 500+ employees typically manage 200-600 SaaS
                  subscriptions. Many were adopted organically by individual departments over
                  years. Without a centralized system, nobody has a complete inventory. The sheer
                  volume makes manual management impossible and creates significant blind spots in
                  both cost and security visibility.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Complex Approval Workflows</h3>
                </div>
                <p className="text-gray-400">
                  Enterprise procurement requires multi-level approval, security reviews, legal
                  sign-off, and budget authorization. But many SaaS purchases bypass these
                  controls entirely. Credit card purchases, departmental budgets, and expense
                  reimbursements create procurement side doors that weaken governance and
                  compliance controls you spent years building.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Multi-Department Coordination</h3>
                </div>
                <p className="text-gray-400">
                  When engineering, marketing, sales, and HR each manage their own SaaS
                  portfolios, duplication is inevitable. The enterprise uses Jira and Asana and
                  Monday.com and Trello -- four project management tools serving the same
                  purpose across different teams. Consolidation requires cross-department
                  coordination that nobody has time to lead without data-driven justification.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Compliance Requirements</h3>
                </div>
                <p className="text-gray-400">
                  SOC 2, GDPR, HIPAA, ISO 27001 -- enterprise compliance frameworks require
                  complete visibility into data flows, vendor security postures, and access
                  controls. Every unapproved SaaS tool is a potential compliance violation. Every
                  untracked data flow is an audit finding waiting to happen. The regulatory cost
                  of poor SaaS governance far exceeds the software cost itself.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-6 space-y-3 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Plug className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Integration with Existing Systems</h3>
                </div>
                <p className="text-gray-400">
                  Enterprise technology stacks are complex. Any new platform needs to integrate
                  with existing ERP systems, identity providers, procurement tools, and ITSM
                  platforms. Point solutions that cannot connect to your SAP, Oracle, or
                  ServiceNow deployments create more data silos, not fewer. The integration
                  requirement eliminates most SaaS management tools from enterprise consideration.
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
                How Efficyon Delivers Enterprise-Scale Control
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Built from the ground up for enterprise requirements: security, compliance,
                integration depth, and dedicated support at every step.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="h-6 w-6 text-orange-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Complete SaaS Discovery at Enterprise Scale
                  </h3>
                  <p className="text-gray-400">
                    Efficyon connects to your ERP, banking feeds, corporate card platforms, and
                    expense management systems to build a comprehensive inventory of every SaaS
                    subscription across the entire organization. Our AI processes thousands of
                    transactions to identify, classify, and deduplicate vendors automatically.
                    Within weeks, you have the first complete view of your SaaS portfolio that
                    your organization has ever had -- including shadow IT that bypassed
                    procurement entirely.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Key className="h-6 w-6 text-orange-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Enterprise Security and Compliance Built In
                  </h3>
                  <p className="text-gray-400">
                    Efficyon is SOC 2 Type II certified and GDPR compliant. Enterprise plans
                    include SSO/SAML 2.0 with Okta, Azure AD, and all major identity providers.
                    SCIM provisioning automates user lifecycle management. Role-based access
                    controls ensure that each team sees only their data. All data is encrypted at
                    rest and in transit, with data residency options for EU and other regulated
                    jurisdictions. Our security team supports your procurement review process
                    directly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Plug className="h-6 w-6 text-orange-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Deep Integration with Your Technology Stack
                  </h3>
                  <p className="text-gray-400">
                    Pre-built integrations with SAP, Oracle, NetSuite, Workday, ServiceNow,
                    Salesforce, and 50+ other enterprise systems. Full REST API and webhook
                    support for custom integrations. Enterprise customers receive dedicated
                    integration engineering support to ensure Efficyon fits seamlessly into your
                    existing workflows, data pipelines, and reporting infrastructure. We do not
                    create another silo -- we connect to everything you already use.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HeadphonesIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Dedicated Support and Strategic Partnership
                  </h3>
                  <p className="text-gray-400">
                    Every enterprise customer gets a dedicated Customer Success Manager who
                    understands your organization, your goals, and your technology landscape.
                    Quarterly business reviews ensure continuous optimization. SLA-backed
                    support guarantees response times your team can count on. Your CSM
                    coordinates across our engineering, security, and data teams so you have a
                    single point of contact for everything.
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
                Enterprise-Grade Capabilities
              </h2>
              <p className="text-lg text-gray-300">
                Every feature enterprise IT, procurement, and finance teams require.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-orange-900/40 rounded-xl flex items-center justify-center">
                  <Lock className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">SSO/SAML</h3>
                <p className="text-gray-400">
                  Full SAML 2.0 and SSO support with Okta, Azure AD, OneLogin, and all major
                  identity providers. SCIM provisioning for automated user management.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-cyan-900/40 rounded-xl flex items-center justify-center">
                  <Plug className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Custom Integrations</h3>
                <p className="text-gray-400">
                  50+ pre-built integrations plus full REST API and webhook support. Dedicated
                  integration engineering for custom connector development.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <HeadphonesIcon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Dedicated CSM</h3>
                <p className="text-gray-400">
                  Named Customer Success Manager with quarterly business reviews. Single point of
                  contact for onboarding, configuration, and ongoing optimization.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-green-900/40 rounded-xl flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">SLA Guarantee</h3>
                <p className="text-gray-400">
                  Contractual SLA with guaranteed uptime, response times, and resolution
                  commitments. Enterprise-grade reliability your team can depend on.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-purple-900/40 rounded-xl flex items-center justify-center">
                  <Server className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">On-Premise Option</h3>
                <p className="text-gray-400">
                  For organizations with strict data residency or air-gap requirements. Deploy
                  Efficyon within your own infrastructure with full feature parity.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="h-12 w-12 bg-red-900/40 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">API Access</h3>
                <p className="text-gray-400">
                  Full REST API for programmatic access to all Efficyon data and functionality.
                  Build custom dashboards, automate workflows, and integrate with your BI tools.
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
                Enterprise-Scale Results
              </h2>
              <p className="text-lg text-gray-300">
                Impact metrics from enterprise organizations managing SaaS with Efficyon.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-orange-400">$500K+</p>
                <p className="text-lg text-white font-medium">Annual Savings</p>
                <p className="text-sm text-gray-400">
                  Average annual savings for enterprise customers through license optimization,
                  vendor consolidation, and renewal negotiations powered by usage data.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-orange-400">40%</p>
                <p className="text-lg text-white font-medium">Redundant Tool Reduction</p>
                <p className="text-sm text-gray-400">
                  Average reduction in overlapping subscriptions after cross-department analysis
                  and consolidation. Fewer tools means fewer vendors to manage and fewer security
                  reviews.
                </p>
              </div>

              <div className="text-center space-y-2 rounded-xl border border-white/10 bg-black/50 p-8">
                <p className="text-4xl font-bold text-orange-400">4-6 wk</p>
                <p className="text-lg text-white font-medium">Time to Production</p>
                <p className="text-sm text-gray-400">
                  Full enterprise deployment including security review, SSO configuration,
                  integrations, custom reporting, and team training. Your CSM manages the
                  entire process.
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
                      className="h-5 w-5 text-orange-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl text-gray-300 leading-relaxed">
                  &ldquo;We had 437 SaaS subscriptions across 12 departments when we started with
                  Efficyon. Within 90 days, we identified $620K in annual waste -- duplicate tools
                  across regions, licenses for employees who had left the company, and enterprise
                  plans where standard plans would suffice. The procurement team uses the renewal
                  calendar religiously now, and the CFO finally has a single dashboard that shows
                  the complete picture. The dedicated CSM has been exceptional -- they understand
                  our organization almost as well as we do.&rdquo;
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Robert Andersson</p>
                  <p className="text-gray-400 text-sm">
                    VP of IT Procurement, Enterprise Software Company (1,200 employees)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Enterprise Security and Compliance
              </h2>
              <p className="text-lg text-gray-300">
                The certifications and controls your security team requires.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center rounded-xl border border-white/10 bg-black/50 p-6 space-y-2">
                <Shield className="h-8 w-8 text-green-400 mx-auto" />
                <p className="text-white font-semibold">SOC 2 Type II</p>
                <p className="text-sm text-gray-400">Annual third-party audit</p>
              </div>
              <div className="text-center rounded-xl border border-white/10 bg-black/50 p-6 space-y-2">
                <Globe className="h-8 w-8 text-blue-400 mx-auto" />
                <p className="text-white font-semibold">GDPR Compliant</p>
                <p className="text-sm text-gray-400">EU data residency available</p>
              </div>
              <div className="text-center rounded-xl border border-white/10 bg-black/50 p-6 space-y-2">
                <Lock className="h-8 w-8 text-purple-400 mx-auto" />
                <p className="text-white font-semibold">Encryption</p>
                <p className="text-sm text-gray-400">AES-256 at rest and in transit</p>
              </div>
              <div className="text-center rounded-xl border border-white/10 bg-black/50 p-6 space-y-2">
                <Key className="h-8 w-8 text-orange-400 mx-auto" />
                <p className="text-white font-semibold">SSO/SAML 2.0</p>
                <p className="text-sm text-gray-400">All major identity providers</p>
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
              Questions enterprise teams ask during evaluation.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                What security and compliance certifications does Efficyon hold?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon is SOC 2 Type II certified and GDPR compliant. We undergo annual
                third-party security audits and maintain comprehensive security documentation
                available under NDA. All data is encrypted at rest and in transit, and we support
                data residency requirements for EU and other regulated jurisdictions. Our security
                team provides dedicated support for enterprise procurement reviews.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Does Efficyon support SSO and SAML authentication?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Enterprise plans include full SSO/SAML 2.0 support with integration for Okta,
                Azure AD, OneLogin, Ping Identity, and other SAML-compliant identity providers. We
                also support SCIM provisioning for automated user lifecycle management, ensuring
                that access to Efficyon follows your existing identity governance policies.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                Can Efficyon integrate with our existing enterprise systems?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Efficyon offers pre-built integrations with 50+ enterprise tools including SAP,
                Oracle, NetSuite, Workday, ServiceNow, and Salesforce. For systems without
                pre-built connectors, our REST API and webhook support enable custom integrations.
                Enterprise customers receive dedicated integration engineering support to ensure
                smooth deployment within your existing technology stack.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-white/10 rounded-lg px-6 bg-black/50"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                What does the enterprise onboarding process look like?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Enterprise onboarding is led by a dedicated Customer Success Manager who guides
                your team through configuration, integration, and rollout. Typical enterprise
                deployments are production-ready within 4-6 weeks. This includes security review,
                SSO configuration, data source integration, custom reporting setup, and team
                training. We provide ongoing quarterly business reviews to ensure continuous
                optimization and ROI realization.
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
              Ready to Manage SaaS at Enterprise Scale?
            </h2>
            <p className="text-lg text-gray-300">
              Join enterprise organizations saving $500K+ annually on SaaS. Your dedicated team
              will guide you from security review through full deployment.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/#contact">
                  Request Enterprise Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Contact Enterprise Sales</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>Custom pricing</span>
              <span>|</span>
              <span>Dedicated CSM</span>
              <span>|</span>
              <span>SLA guarantee</span>
              <span>|</span>
              <span>90-day ROI guarantee</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
