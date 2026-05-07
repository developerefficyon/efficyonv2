import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialEyebrow,
  EditorialMonoLabel,
  EditorialCard,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import {
  saasTools,
  getToolBySlug,
  getRelatedTools,
} from "@/lib/saas-tools-data"

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
      url: absoluteUrl(`/tools/${tool.slug}`),
      type: "website",
    },
  }
}

function generateSeoContent(tool: ReturnType<typeof getToolBySlug>) {
  if (!tool) return [] as string[]

  return [
    `Managing ${tool.name} costs effectively requires a strategic approach that goes beyond simply counting licenses. As one of the most widely used tools in the ${tool.category.toLowerCase()} space, ${tool.name} delivers significant value to teams that use it actively. The challenge arises when organizations scale their ${tool.name} deployment without regularly auditing whether every seat, feature, and tier is being fully utilized. Starting at ${tool.startingPrice}, individual costs appear manageable, but companies with ${tool.idealFor.toLowerCase()} frequently discover that their aggregate ${tool.name} spend has grown to ${tool.typicalCompanySpend} per month without corresponding increases in usage or value delivered.`,
    `The most effective ${tool.name} optimization strategy begins with a thorough usage audit. This means examining not just who has access, but how each user interacts with the platform. Many organizations find that 20-30% of their licensed users are low-activity or inactive, creating an immediate opportunity to reclaim costs by downgrading or removing those seats. Beyond license count, the tier each user is assigned to matters significantly. ${tool.name}'s ${tool.pricingModel.toLowerCase()} model means that placing users on a higher tier than they need compounds costs across every seat in the organization.`,
    `Organizations that take a proactive approach to ${tool.name} cost management typically achieve savings of 15-30% within the first quarter. This involves establishing a regular cadence of license reviews, setting up automated alerts for usage thresholds, and creating clear policies for when new seats or upgrades are justified. Rather than treating ${tool.name} as a fixed cost, the most cost-efficient organizations treat it as a variable expense that should be continuously optimized based on actual usage data and business needs.`,
    `Efficyon helps companies automate this entire process for ${tool.name} and every other tool in their stack. By connecting your ${tool.name} account alongside your financial data, Efficyon provides a complete picture of cost versus value for each subscription. Our AI engine identifies the specific ${tool.name} waste patterns most relevant to your organization and delivers prioritized recommendations ranked by potential savings impact.`,
  ]
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
    url: absoluteUrl(`/tools/${tool.slug}`),
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: SITE_URL,
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

      <EditorialPageHero
        eyebrow={`${tool.category} · Cost analysis`}
        title={`${tool.name},`}
        italic="line by line."
        body={tool.description}
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "← All tools", href: "/tools" }}
      />

      {/* Quick facts row */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The numbers"
          title="What it costs,"
          italic="at a glance."
        />
        <dl className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-4 md:divide-x md:divide-y-0">
          {[
            { label: "Category", value: tool.category },
            { label: "Pricing model", value: tool.pricingModel },
            {
              label: "Starting price",
              value: tool.startingPrice.split(";")[0].trim(),
            },
            { label: "Typical spend", value: tool.typicalCompanySpend },
          ].map((item) => (
            <div key={item.label} className="px-0 py-10 md:px-10">
              <EditorialMonoLabel>{item.label}</EditorialMonoLabel>
              <dd className="mt-3 text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-white">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </EditorialSection>

      {/* Cost breakdown */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Cost breakdown"
          title={`Where ${tool.name}`}
          italic="actually shows up on the invoice."
          body="Per-user math, monthly aggregates, annual projections — the figures we plug into models when sizing typical waste."
        />
        <div className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="px-0 py-12 md:px-12">
            <EditorialMonoLabel>Avg cost per user</EditorialMonoLabel>
            <p className="mt-4 text-[clamp(40px,4.4vw,60px)] font-medium leading-none tracking-[-0.035em]">
              <span style={{ color: GREEN }}>${tool.averageCostPerUser}</span>{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] text-[28px] italic text-white/55">
                / month
              </span>
            </p>
            <p className="mt-4 max-w-[40ch] text-[15px] leading-[1.7] text-white/55">
              Based on the typical plan mix we see across organizations of this
              size.
            </p>
          </div>
          <div className="px-0 py-12 md:px-12">
            <EditorialMonoLabel>Annual projection · 10–100 users</EditorialMonoLabel>
            <p className="mt-4 text-[clamp(40px,4.4vw,60px)] font-medium leading-none tracking-[-0.035em]">
              ${annualCostLow}{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] italic text-white/55">
                –
              </span>{" "}
              ${annualCostHigh}
            </p>
            <p className="mt-4 max-w-[40ch] text-[15px] leading-[1.7] text-white/55">
              Ideal for {tool.idealFor.toLowerCase()}. Tier choice swings the
              total dramatically.
            </p>
          </div>
        </div>
      </EditorialSection>

      {/* Waste patterns */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Waste patterns"
          title={`Where companies overspend on`}
          italic={`${tool.name}.`}
          body="The same handful of leaks shows up in almost every audit. Check yours against this list before your next renewal."
        />
        <ol className="border-t border-white/[0.08]">
          {tool.commonWastePatterns.map((pattern, index) => (
            <li
              key={index}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="max-w-[68ch] text-[18px] leading-[1.65] text-white/75">
                {pattern}
              </p>
            </li>
          ))}
        </ol>
      </EditorialSection>

      {/* Optimization tips */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How to fix it"
          title={`Optimizing ${tool.name}`}
          italic="without breaking workflow."
          body="Practical, sequenced steps. Start at the top — most companies recover the bulk of their savings in the first two."
        />
        <ol className="border-t border-white/[0.08]">
          {tool.optimizationTips.map((tip, index) => (
            <li
              key={index}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span
                className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums"
                style={{ color: GREEN }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="max-w-[68ch] text-[18px] leading-[1.65] text-white/80">
                {tip}
              </p>
            </li>
          ))}
        </ol>
      </EditorialSection>

      {/* Alternatives */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Alternatives"
          title={`If ${tool.name} isn't the right fit,`}
          italic="here's what else to look at."
          body="Switching costs are usually higher than people expect. Audit usage first — often the cheaper move is to right-size what you already run."
        />
        <div className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-3 md:divide-x md:divide-y-0">
          {tool.alternatives.map((alt) => {
            const altTool = saasTools.find(
              (t) =>
                t.name.toLowerCase() === alt.toLowerCase() ||
                t.name
                  .toLowerCase()
                  .includes(alt.toLowerCase().split(" ")[0])
            )
            return (
              <div key={alt} className="px-0 py-10 md:px-10">
                <p className="text-[22px] font-medium tracking-[-0.02em]">
                  {alt}
                </p>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                  {altTool
                    ? `From ${altTool.startingPrice.split(";")[0].split("(")[0].trim()}`
                    : "Popular alternative"}
                </p>
                {altTool && (
                  <Link
                    href={`/tools/${altTool.slug}`}
                    className="group mt-5 inline-flex items-center gap-1.5 text-[13px] text-white/65 transition-colors hover:text-white"
                  >
                    View analysis
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </EditorialSection>

      {/* Long-form */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The complete guide"
          title={`Optimizing ${tool.name}`}
          italic="costs, in full."
        />
        <div className="mx-auto max-w-[68ch] space-y-7 font-[family-name:var(--font-dm-sans)] text-[17px] leading-[1.8] text-white/70">
          {seoContent.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </EditorialSection>

      {/* External link */}
      <EditorialSection>
        <div className="flex flex-col gap-6 border-y border-white/[0.08] py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <EditorialEyebrow>Vendor site</EditorialEyebrow>
            <p className="text-[20px] font-medium tracking-[-0.02em]">
              Visit {tool.name}{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/55">
                directly.
              </span>
            </p>
          </div>
          <Link
            href={tool.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-5 py-3 text-[13px] font-medium text-white transition-all hover:border-white/40 md:self-auto"
          >
            {tool.website.replace(/^https?:\/\//, "")}
            <span>↗</span>
          </Link>
        </div>
      </EditorialSection>

      {/* Related tools */}
      {relatedTools.length > 0 && (
        <EditorialSection>
          <EditorialSectionIntro
            eyebrow={`More in ${tool.category}`}
            title="Adjacent tools"
            italic="worth comparing."
          />
          <div className="border-t border-white/[0.08]">
            {relatedTools.map((related, i) => (
              <EditorialCard
                key={related.slug}
                href={`/tools/${related.slug}`}
                index={i}
                title={related.name}
                body={related.description}
                meta={`From ${related.startingPrice.split(";")[0].split("(")[0].trim()} · ${related.pricingModel}`}
              />
            ))}
          </div>
        </EditorialSection>
      )}

      <EditorialFinalCTA
        title={`Analyze your ${tool.name} spend.`}
        italic="In ten minutes."
        body={`Connect ${tool.name} alongside your accounting and we'll surface every overlap, idle seat, and tier mismatch. Read-only OAuth, no credit card.`}
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Back to all tools →", href: "/tools" }}
      />
    </>
  )
}
