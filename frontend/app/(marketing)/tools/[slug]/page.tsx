import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  saasTools,
  getToolBySlug,
  getRelatedTools,
} from "@/lib/saas-tools-data"
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Lightbulb,
  Shuffle,
  Shield,
  BarChart3,
  Tag,
} from "lucide-react"

export async function generateStaticParams() {
  return saasTools.map((tool) => ({
    slug: tool.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tool = getToolBySlug(slug)

  if (!tool) {
    return {
      title: "Tool Not Found",
    }
  }

  return {
    title: `${tool.name} Cost Analysis & Optimization`,
    description: `Analyze and optimize your ${tool.name} costs. Discover common waste patterns, pricing insights, and actionable tips to reduce your ${tool.name} spending by 25% or more.`,
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: `${tool.name} Cost Analysis & Optimization | Efficyon`,
      description: `Analyze and optimize your ${tool.name} costs. Discover common waste patterns, pricing insights, and actionable tips to reduce spending.`,
      url: `https://www.efficyon.com/tools/${tool.slug}`,
      type: "website",
    },
  }
}

function generateSeoContent(tool: ReturnType<typeof getToolBySlug>) {
  if (!tool) return ""

  const templates = [
    `Managing ${tool.name} costs effectively requires a strategic approach that goes beyond simply counting licenses. As one of the most widely used tools in the ${tool.category.toLowerCase()} space, ${tool.name} delivers significant value to teams that use it actively. The challenge arises when organizations scale their ${tool.name} deployment without regularly auditing whether every seat, feature, and tier is being fully utilized. Starting at ${tool.startingPrice}, individual costs appear manageable, but companies with ${tool.idealFor.toLowerCase()} frequently discover that their aggregate ${tool.name} spend has grown to ${tool.typicalCompanySpend} per month without corresponding increases in usage or value delivered.`,

    `The most effective ${tool.name} optimization strategy begins with a thorough usage audit. This means examining not just who has access, but how each user interacts with the platform. Many organizations find that 20-30% of their licensed users are low-activity or inactive, creating an immediate opportunity to reclaim costs by downgrading or removing those seats. Beyond license count, the tier each user is assigned to matters significantly. ${tool.name}'s ${tool.pricingModel.toLowerCase()} model means that placing users on a higher tier than they need compounds costs across every seat in the organization.`,

    `Organizations that take a proactive approach to ${tool.name} cost management typically achieve savings of 15-30% within the first quarter. This involves establishing a regular cadence of license reviews, setting up automated alerts for usage thresholds, and creating clear policies for when new seats or upgrades are justified. Rather than treating ${tool.name} as a fixed cost, the most cost-efficient organizations treat it as a variable expense that should be continuously optimized based on actual usage data and business needs.`,

    `Efficyon helps companies automate this entire process for ${tool.name} and every other tool in their stack. By connecting your ${tool.name} account alongside your financial data, Efficyon provides a complete picture of cost versus value for each subscription. Our AI engine identifies the specific ${tool.name} waste patterns most relevant to your organization and delivers prioritized recommendations ranked by potential savings impact. With our 90-day ROI guarantee, you can be confident that the optimization effort will pay for itself many times over.`,
  ]

  return templates
}

export default async function ToolAnalysisPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tool = getToolBySlug(slug)

  if (!tool) {
    notFound()
  }

  const relatedTools = getRelatedTools(tool, 4)
  const annualCostLow = Math.round(
    tool.averageCostPerUser * 10 * 12
  ).toLocaleString()
  const annualCostHigh = Math.round(
    tool.averageCostPerUser * 100 * 12
  ).toLocaleString()
  const seoContent = generateSeoContent(tool)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${tool.name} Cost Analysis & Optimization`,
    description: `Analyze and optimize your ${tool.name} costs. Discover common waste patterns, pricing insights, and actionable optimization tips.`,
    url: `https://www.efficyon.com/tools/${tool.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
    about: {
      "@type": "SoftwareApplication",
      name: tool.name,
      url: tool.website,
      applicationCategory: tool.category,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-12 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              All Tools
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium">
                <Tag className="h-3.5 w-3.5" />
                {tool.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {tool.name} Cost Analysis & Optimization Tips
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl">
              {tool.description}
            </p>
          </div>
        </div>
      </section>

      {/* Overview Card */}
      <section className="py-12 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-1">Category</div>
                <div className="text-white font-semibold">{tool.category}</div>
              </div>
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-1">Pricing Model</div>
                <div className="text-white font-semibold">
                  {tool.pricingModel}
                </div>
              </div>
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-1">Starting Price</div>
                <div className="text-white font-semibold">
                  {tool.startingPrice.split(";")[0].trim()}
                </div>
              </div>
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-1">Typical Spend</div>
                <div className="text-white font-semibold">
                  {tool.typicalCompanySpend}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Breakdown Section */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                What {tool.name} Typically Costs
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-2">
                  Average Cost Per User
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${tool.averageCostPerUser}
                  <span className="text-lg font-normal text-gray-400">
                    /month
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Based on typical plan mix across organizations
                </div>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-2">
                  Typical Monthly Company Spend
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {tool.typicalCompanySpend}
                </div>
                <div className="text-sm text-gray-500">
                  Varies by team size and plan tier
                </div>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-2">
                  Annual Cost Projection
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${annualCostLow} &ndash; ${annualCostHigh}
                </div>
                <div className="text-sm text-gray-500">
                  For teams of 10-100 users per year
                </div>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-sm text-gray-400 mb-2">Ideal For</div>
                <div className="text-lg font-semibold text-white mb-1">
                  {tool.idealFor}
                </div>
                <div className="text-sm text-gray-500">
                  Pricing starts at {tool.startingPrice.split(";")[0].trim()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Common Waste Patterns */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Where Companies Waste Money on {tool.name}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {tool.commonWastePatterns.map((pattern, index) => (
                <div
                  key={index}
                  className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03]"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm text-amber-300/80 font-medium mb-1">
                        Waste Pattern #{index + 1}
                      </div>
                      <p className="text-gray-300 text-sm">{pattern}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Optimization Tips */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                How to Optimize Your {tool.name} Costs
              </h2>
            </div>

            <div className="space-y-4">
              {tool.optimizationTips.map((tip, index) => (
                <div
                  key={index}
                  className="p-5 rounded-xl border border-green-500/20 bg-green-500/[0.03] flex items-start gap-4"
                >
                  <div className="h-8 w-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 font-bold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-200">{tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Alternatives Section */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Shuffle className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Alternatives to {tool.name}
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {tool.alternatives.map((alt) => {
                const altTool = saasTools.find(
                  (t) =>
                    t.name.toLowerCase() === alt.toLowerCase() ||
                    t.name.toLowerCase().includes(alt.toLowerCase().split(" ")[0])
                )
                return (
                  <div
                    key={alt}
                    className="p-5 rounded-xl border border-white/10 bg-white/[0.02]"
                  >
                    <div className="text-white font-semibold mb-1">{alt}</div>
                    {altTool ? (
                      <div className="text-sm text-gray-400">
                        From {altTool.startingPrice.split(";")[0].split("(")[0].trim()}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        Popular alternative
                      </div>
                    )}
                    {altTool && (
                      <Link
                        href={`/tools/${altTool.slug}`}
                        className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
                      >
                        View analysis
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="p-4 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03]">
              <p className="text-sm text-gray-300">
                <strong className="text-cyan-400">Before switching:</strong>{" "}
                Analyze your actual {tool.name} usage with Efficyon before
                migrating to an alternative. Often, optimizing your current
                tool&apos;s configuration and license allocation delivers more
                savings than a migration, with far less disruption to your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content Block */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Optimizing {tool.name} Costs: A Complete Guide
            </h2>
            <div className="prose prose-invert max-w-none space-y-5 text-gray-300">
              {seoContent.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-14 w-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-7 w-7 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Analyze Your {tool.name} Costs with Efficyon
            </h2>
            <p className="text-gray-300 mb-8">
              Connect your {tool.name} account and get personalized optimization
              recommendations in minutes. See exactly where you&apos;re overspending
              and how much you can save.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/register">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-gray-300 hover:bg-white/5 bg-transparent"
                asChild
              >
                <Link href={tool.website} target="_blank" rel="noopener noreferrer">
                  Visit {tool.name}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mt-6">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-green-400" />
                90-day ROI guarantee
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                More {tool.category} Tools
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedTools.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/tools/${related.slug}`}
                    className="group p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                  >
                    <h3 className="text-white font-semibold group-hover:text-cyan-400 transition-colors mb-1">
                      {related.name}
                    </h3>
                    <div className="text-sm text-gray-400 mb-3">
                      From {related.startingPrice.split(";")[0].split("(")[0].trim()}
                    </div>
                    <span className="text-sm text-cyan-400 group-hover:underline inline-flex items-center gap-1">
                      Analyze costs
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
