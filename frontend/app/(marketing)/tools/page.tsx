import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialEyebrow,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { saasTools, getAllCategories } from "@/lib/saas-tools-data"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { ToolsFilterList } from "./tools-filter-list"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Tool Cost Analysis",
  description:
    "Cost analysis and optimization tips for 50+ popular SaaS tools. Discover how to reduce spending on Slack, Salesforce, AWS, Jira, and more with data-driven insights from Efficyon.",
  path: "/tools",
})

const PILLARS = [
  { val: "50+", label: "Tools analyzed across the directory" },
  { val: "13", label: "Categories covered, end-to-end" },
  { val: "25%", label: "Typical waste we find in audits" },
] as const

export default function ToolsIndexPage() {
  const categories = getAllCategories()

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "SaaS Tool Cost Analysis",
      description:
        "Cost analysis and optimization tips for 50+ popular SaaS tools.",
      url: absoluteUrl("/tools"),
      publisher: {
        "@type": "Organization",
        name: "Efficyon",
        url: SITE_URL,
      },
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Tools Directory", path: "/tools" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      <EditorialPageHero
        eyebrow="Directory · 50+ tools"
        title="Cost analysis for"
        italic="every tool you run."
        body="A working directory of the SaaS tools we see most often in finance ledgers — what they actually cost, where teams waste money on them, and how to right-size each one. Independent, opinionated, updated continuously."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The shape of it"
          title="Sized to scan,"
          italic="not to scroll past."
        />
        <div className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-3 md:divide-x md:divide-y-0">
          {PILLARS.map((p, i) => (
            <div key={i} className="px-0 py-12 md:px-12">
              <div className="mb-3">
                <span
                  className="text-[clamp(48px,5.5vw,72px)] font-medium leading-none tracking-[-0.04em]"
                  style={{ color: "var(--green)" }}
                >
                  {p.val}
                </span>
              </div>
              <EditorialEyebrow>{p.label}</EditorialEyebrow>
            </div>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The directory"
          title="Search by tool,"
          italic="filter by category."
          body="Each entry breaks down typical pricing, where waste hides, and how to optimize it. Pick what you run today."
        />
        <ToolsFilterList tools={saasTools} categories={[...categories]} />
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The thinking"
          title="Why most teams are overspending,"
          italic="even when they think they aren't."
          body="Read this before you commit to a renewal or a new tier."
        />
        <div className="mx-auto max-w-[68ch] space-y-7 font-[family-name:var(--font-dm-sans)] text-[17px] leading-[1.8] text-white/70">
          <p>
            The average company runs more than a hundred SaaS applications. Each
            one looks affordable on its own. Together they form one of the
            largest line items in the budget — and{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] italic text-white/90">
              25 to 40 percent of that spend is waste
            </span>{" "}
            on unused licenses, overlapping tools, and overprovisioned tiers.
          </p>
          <p>
            Real cost analysis is not the same as tracking spend. It means
            correlating what you pay with what people actually use — every
            month, across every tool. That's the gap most spreadsheets miss,
            and it's the one this directory is built to surface.
          </p>
          <p>
            The three patterns we see repeatedly: licenses assigned to people
            who left or stopped using the tool, multiple teams independently
            buying overlapping tools, and Enterprise tiers paid for by everyone
            when only a handful actually need the advanced features.
          </p>
          <p>
            Efficyon connects to your accounting and your tools, cross-references
            spend against usage, and ranks the leaks by impact. If your first
            quarter doesn't show measurable savings, we keep working until it
            does.
          </p>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Ready to stop overpaying"
        italic="for software?"
        body="Connect one tool, run a scan in 10 minutes, and see what we surface against your real ledger. Read-only OAuth on every connection."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Try the ROI calculator →", href: "/calculator/roi" }}
      />
    </>
  )
}
