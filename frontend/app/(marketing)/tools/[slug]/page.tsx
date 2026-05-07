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
import { absoluteUrl } from "@/lib/site"
import {
  saasTools,
  getToolBySlug,
  getRelatedTools,
  type SaasToolData,
} from "@/lib/saas-tools-data"
import { breadcrumbListLd, softwareApplicationLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"
import { categoryIntro } from "./category-intros"

export async function generateStaticParams() {
  return saasTools.map((tool) => ({
    slug: tool.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tool = getToolBySlug(slug)

  if (!tool) {
    return {
      title: "Tool Not Found",
    }
  }

  return pageMetadata({
    title: `${tool.name} Cost Analysis & Optimization`,
    description: `Analyze and optimize your ${tool.name} costs. Discover common waste patterns, pricing insights, and actionable tips to reduce your ${tool.name} spending by 25% or more.`,
    path: `/tools/${tool.slug}`,
    type: "website",
  })
}

function generateSeoContent(
  tool: SaasToolData
): { heading: string; body: string }[] {
  const lowercasedFirstWaste = `${tool.signatureWastePattern.charAt(0).toLowerCase()}${tool.signatureWastePattern.slice(1)}`
  return [
    {
      heading: `Where ${tool.name} sits in the market`,
      body: `${categoryIntro(tool.category)}\n\n${tool.marketPosition} ${tool.signatureWastePattern}`,
    },
    {
      heading: `What ${tool.name} costs`,
      body: `${tool.name} is typically priced at ${tool.commonPriceRange}. Pricing varies by tier and contract length; the patterns below describe the waste we see most often regardless of which tier a customer is on.`,
    },
    {
      heading: `Common waste patterns`,
      body: tool.commonWastePatterns.map((p) => `- ${p}`).join("\n"),
    },
    {
      heading: `How Efficyon analyzes ${tool.name} spend`,
      body: `Efficyon ingests your accounting data (Fortnox, QuickBooks, Stripe, Xero) and identity data (Microsoft 365, Google Workspace) and matches activity against billing. For ${tool.name}, that surfaces ${lowercasedFirstWaste} The findings appear in your dashboard with the contract month they applied to and the dollar value at stake.`,
    },
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

  const ld = [
    softwareApplicationLd({
      name: tool.name,
      description: tool.description ?? `${tool.name} — ${tool.category}`,
      url: absoluteUrl(`/tools/${tool.slug}`),
      category: tool.category,
    }),
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Tools Directory", path: "/tools" },
      { name: tool.name, path: `/tools/${tool.slug}` },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
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
        <div className="mx-auto max-w-[68ch] space-y-10 font-[family-name:var(--font-dm-sans)] text-[17px] leading-[1.8] text-white/70">
          {seoContent.map((section, index) => (
            <div key={index} className="space-y-4">
              <h3 className="text-[22px] font-medium leading-[1.25] tracking-[-0.02em] text-white">
                {section.heading}
              </h3>
              {section.body.split("\n\n").map((paragraph, pIdx) => {
                if (paragraph.includes("\n- ")) {
                  const lines = paragraph.split("\n").filter(Boolean)
                  return (
                    <ul
                      key={pIdx}
                      className="list-disc space-y-2 pl-5 marker:text-white/30"
                    >
                      {lines.map((line, lIdx) => (
                        <li key={lIdx}>{line.replace(/^- /, "")}</li>
                      ))}
                    </ul>
                  )
                }
                if (paragraph.startsWith("- ")) {
                  const lines = paragraph.split("\n").filter(Boolean)
                  return (
                    <ul
                      key={pIdx}
                      className="list-disc space-y-2 pl-5 marker:text-white/30"
                    >
                      {lines.map((line, lIdx) => (
                        <li key={lIdx}>{line.replace(/^- /, "")}</li>
                      ))}
                    </ul>
                  )
                }
                return <p key={pIdx}>{paragraph}</p>
              })}
            </div>
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
