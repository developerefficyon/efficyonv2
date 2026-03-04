import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { saasTools, getAllCategories } from "@/lib/saas-tools-data"
import {
  ArrowRight,
  Search,
  CheckCircle,
  Shield,
} from "lucide-react"

export const metadata: Metadata = {
  title: "SaaS Tool Cost Analysis",
  description:
    "Cost analysis and optimization tips for 50+ popular SaaS tools. Discover how to reduce spending on Slack, Salesforce, AWS, Jira, and more with data-driven insights from Efficyon.",
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    title: "SaaS Tool Cost Analysis | Efficyon",
    description:
      "Cost analysis and optimization tips for 50+ popular SaaS tools. Discover how to reduce spending on Slack, Salesforce, AWS, Jira, and more.",
    url: "https://www.efficyon.com/tools",
    type: "website",
  },
}

export default function ToolsIndexPage() {
  const categories = getAllCategories()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SaaS Tool Cost Analysis",
    description:
      "Cost analysis and optimization tips for 50+ popular SaaS tools.",
    url: "https://www.efficyon.com/tools",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-16 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-6">
              <Search className="h-4 w-4" />
              50+ Tools Analyzed
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Cost Analysis for 50+ Popular SaaS Tools
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Discover exactly where your company is overspending on software.
              Our tool-by-tool analysis reveals common waste patterns, pricing
              insights, and actionable optimization tips for the most popular
              SaaS products.
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
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="py-12 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">50+</div>
              <div className="text-sm text-gray-400">Tools Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">13</div>
              <div className="text-sm text-gray-400">Categories Covered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">25%+</div>
              <div className="text-sm text-gray-400">Average Savings Found</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">90-Day</div>
              <div className="text-sm text-gray-400">ROI Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid by Category */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {categories.map((category) => {
            const categoryTools = saasTools.filter(
              (t) => t.category === category
            )
            if (categoryTools.length === 0) return null

            return (
              <div key={category} id={category.toLowerCase().replace(/\s+/g, "-")} className="mb-16 last:mb-0">
                <div className="flex items-center gap-3 mb-8">
                  <h2 className="text-2xl font-bold text-white">{category}</h2>
                  <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                    {categoryTools.length} tools
                  </span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      className="group block p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          {tool.name}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {tool.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          From{" "}
                          <span className="text-gray-300">
                            {tool.startingPrice.split(";")[0].split("(")[0].trim()}
                          </span>
                        </span>
                        <span className="text-cyan-400 font-medium group-hover:underline">
                          Analyze costs
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">
              Understanding SaaS Cost Analysis
            </h2>
            <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
              <p>
                The average company now uses over 100 SaaS applications, and
                that number continues to grow each year. While each tool may
                seem affordable individually, the cumulative cost of software
                subscriptions has become one of the largest line items in most
                company budgets. Research consistently shows that 25-40% of SaaS
                spending is wasted on unused licenses, overlapping tools, and
                overprovisioned subscription tiers.
              </p>
              <p>
                SaaS cost analysis is the process of examining your software
                subscriptions to identify waste, right-size licenses, and
                negotiate better pricing. This goes beyond simply tracking how
                much you spend. Effective cost analysis correlates spending data
                with actual usage patterns to reveal which tools are delivering
                value and which are silently draining your budget.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                Common Sources of SaaS Waste
              </h3>
              <p>
                Across the 50+ tools analyzed on this page, several waste
                patterns appear repeatedly. The most common is{" "}
                <strong className="text-white">unused or underutilized licenses</strong>{" "}
                &mdash; seats assigned to employees who have left the company,
                changed roles, or simply stopped using the tool. The second most
                common pattern is{" "}
                <strong className="text-white">overlapping tools</strong>, where
                multiple teams independently purchase tools that serve the same
                function. For example, a company might be paying for Slack,
                Microsoft Teams, and Google Chat simultaneously across different
                departments.
              </p>
              <p>
                <strong className="text-white">Tier mismatch</strong> is another
                significant waste source. Many companies purchase Enterprise or
                Premium tiers for their entire organization when only a small
                percentage of users need advanced features. The majority of the
                team would be equally well-served by a Standard or even Free tier.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8">
                How Efficyon Helps
              </h3>
              <p>
                Efficyon automates the SaaS cost analysis process by connecting
                to your accounting systems and SaaS tools to build a complete
                picture of your software spending and usage. Our AI engine
                cross-references spend data with usage patterns to identify the
                highest-impact optimization opportunities. Rather than spending
                weeks manually auditing subscriptions, Efficyon delivers
                prioritized recommendations within days, along with projected
                savings for each action item.
              </p>
              <p>
                Every analysis is backed by our 90-day ROI guarantee. If you
                don&apos;t see measurable savings within the first quarter, we
                continue working with you at no additional cost until you do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Optimize Your SaaS Costs?
            </h2>
            <p className="text-gray-300 mb-8">
              Connect your tools and get personalized cost optimization
              recommendations in minutes. Average companies save 25%+ on their
              SaaS spend.
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
    </>
  )
}
