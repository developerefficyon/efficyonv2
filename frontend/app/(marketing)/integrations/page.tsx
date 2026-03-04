import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  BookOpen,
  BarChart3,
  Send,
  Plug,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Integrations - Connect Your Tools",
  description:
    "Integrate Efficyon with your accounting and billing platforms for automated SaaS cost analysis. Connect Fortnox, Stripe, QuickBooks, Xero, and more.",
  alternates: {
    canonical: "/integrations",
  },
  openGraph: {
    title: "Integrations - Connect Your Tools | Efficyon",
    description:
      "Integrate Efficyon with your accounting and billing platforms for automated SaaS cost analysis. Connect Fortnox, Stripe, QuickBooks, Xero, and more.",
    url: "https://www.efficyon.com/integrations",
  },
}

const integrations = [
  {
    name: "Fortnox",
    slug: "fortnox",
    status: "live" as const,
    description:
      "Connect your Fortnox accounting system to automatically import invoices, categorize SaaS expenses, and identify cost optimization opportunities.",
    icon: FileText,
    color: "green",
  },
  {
    name: "Stripe",
    slug: "stripe",
    status: "live" as const,
    description:
      "Analyze all your Stripe-billed subscriptions, track payment trends, and identify billing anomalies with AI-powered insights.",
    icon: CreditCard,
    color: "purple",
  },
  {
    name: "QuickBooks",
    slug: "quickbooks",
    status: "coming-soon" as const,
    description:
      "Connect QuickBooks to automatically categorize and analyze your SaaS subscriptions alongside your complete financial data.",
    icon: BookOpen,
    color: "blue",
  },
  {
    name: "Xero",
    slug: "xero",
    status: "coming-soon" as const,
    description:
      "Connect Xero accounting to get complete visibility into your SaaS spending with AI-powered multi-currency analysis.",
    icon: BarChart3,
    color: "cyan",
  },
]

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  green: {
    bg: "bg-green-900/30",
    text: "text-green-400",
    border: "border-green-500/20",
  },
  purple: {
    bg: "bg-purple-900/30",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  blue: {
    bg: "bg-blue-900/30",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  cyan: {
    bg: "bg-cyan-900/30",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
}

export default function IntegrationsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Efficyon Integrations",
    description:
      "Connect your accounting and billing platforms to Efficyon for automated SaaS cost analysis and optimization.",
    url: "https://www.efficyon.com/integrations",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: integrations.map((integration, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${integration.name} Integration`,
        url: `https://www.efficyon.com/integrations/${integration.slug}`,
      })),
    },
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
              <Plug className="h-4 w-4" />
              Integrations
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              Connect Your Financial Tools to Efficyon
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Integrate with your accounting and billing platforms for automated SaaS cost
              analysis. Import invoices, track subscriptions, and uncover savings opportunities
              -- all in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Integration Grid */}
      <section className="py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {integrations.map((integration) => {
              const colors = colorMap[integration.color]
              const Icon = integration.icon
              return (
                <Link
                  key={integration.slug}
                  href={`/integrations/${integration.slug}`}
                  className="group relative rounded-xl border border-white/10 bg-black/50 p-8 hover:border-white/20 hover:bg-white/[0.02] transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`h-14 w-14 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}
                    >
                      <Icon className={`h-7 w-7 ${colors.text}`} />
                    </div>
                    {integration.status === "live" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                    {integration.name}
                  </h2>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    {integration.description}
                  </p>

                  <div className="flex items-center text-cyan-400 text-sm font-medium">
                    Learn more
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Integrate Section */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Connect Your Tools?
            </h2>
            <p className="text-lg text-gray-300">
              Efficyon works best when it has a complete picture of your SaaS spending.
              Integrations bring your financial data together for deeper analysis and smarter
              recommendations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="h-12 w-12 bg-cyan-900/40 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Automatic Data Import</h3>
              <p className="text-gray-400 text-sm">
                No more manual spreadsheets. Your invoices, subscriptions, and expenses flow
                in automatically and stay up to date.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="h-12 w-12 bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">AI-Powered Analysis</h3>
              <p className="text-gray-400 text-sm">
                Our AI cross-references your financial data to find hidden waste, duplicate
                charges, and optimization opportunities.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="h-12 w-12 bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Actionable Insights</h3>
              <p className="text-gray-400 text-sm">
                Get specific, dollar-value recommendations you can act on immediately to reduce
                SaaS costs across your organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Request an Integration */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">Request an Integration</h2>
            <p className="text-gray-300">
              Don&apos;t see the tool you need? Let us know which integration would help your
              team and we&apos;ll prioritize it on our roadmap.
            </p>
            <div className="flex gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="your@email.com"
                className="bg-black/50 border-white/20 text-white placeholder:text-gray-500 flex-1"
              />
              <Button className="bg-white text-black hover:bg-gray-100 shrink-0">
                <Send className="mr-2 h-4 w-4" />
                Request
              </Button>
            </div>
            <p className="text-gray-500 text-xs">
              We&apos;ll notify you when new integrations become available.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Start Saving on SaaS Today
            </h2>
            <p className="text-lg text-gray-300">
              Connect your tools in minutes and get AI-powered cost optimization insights.
              No credit card required. 90-day ROI guarantee.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Book a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
