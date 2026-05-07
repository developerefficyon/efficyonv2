import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Spend Benchmarks & Data",
  description:
    "SaaS spend benchmarks by company size, industry, and department. Compare your software costs to industry averages and discover optimization opportunities with 2026 data.",
  path: "/benchmarks",
})

const BENCHMARKS = [
  {
    slug: "saas-spend-by-company-size",
    title: "SaaS spend by company size",
    italic: "from startup to enterprise.",
    body:
      "Five company-size tiers, monthly spend ranges, per-employee breakdowns, and the optimization target where each tier tends to leak the most.",
    meta: "5 tiers · per-employee · waste %",
  },
  {
    slug: "saas-spend-by-industry",
    title: "SaaS spend by industry",
    italic: "the per-sector reality.",
    body:
      "Seven industries — technology, finance, healthcare, marketing, e-commerce, education, manufacturing — with average spend per employee, typical waste, and top tools per sector.",
    meta: "7 industries · top tools · waste range",
  },
  {
    slug: "subscription-cost-per-employee",
    title: "Software cost per employee",
    italic: "what's normal in 2026?",
    body:
      "Department-level benchmarks (Engineering, Sales, Marketing, HR, Finance, Support), year-over-year trends, and a guide to calculating your own number.",
    meta: "6 departments · YoY trend · how-to guide",
  },
] as const

export default function BenchmarksIndexPage() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "SaaS Spend Benchmarks & Industry Data",
      description:
        "SaaS spend benchmarks by company size, industry, and department with 2026 data.",
      url: absoluteUrl("/benchmarks"),
      publisher: {
        "@type": "Organization",
        name: "Efficyon",
        url: SITE_URL,
      },
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Benchmarks", path: "/benchmarks" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      <EditorialPageHero
        eyebrow="2026 · Third-party industry data"
        title="What does"
        italic="normal look like?"
        body="Benchmarks compiled from public sources, third-party industry reports, and aggregated anonymized data. Use them to calibrate your own spend before you start optimizing."
        primaryCta={{ label: "Get a custom benchmark", href: "/register" }}
        secondaryCta={{ label: "Try the cost calculator", href: "/calculator/saas-cost" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Three lenses"
          title="Three ways"
          italic="to compare."
          body="Same underlying data, three different cuts. Pick the angle that matches the question your team is trying to answer."
        />
        <div className="border-t border-white/[0.08]">
          {BENCHMARKS.map((b, i) => (
            <EditorialCard
              key={b.slug}
              href={`/benchmarks/${b.slug}`}
              index={i}
              title={b.title}
              italic={b.italic}
              body={b.body}
              meta={b.meta}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Why benchmarks matter"
          title="Internal data alone"
          italic="can't tell you you're overpaying."
          body="Benchmarks are the external reference internal data doesn't have. Without them, every budget conversation is a hunch."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/65">
            When you know the average company your size spends $150 per employee
            per month on SaaS — and your number is $250 — you have a clear signal
            that something&apos;s worth investigating. Conversely, if your spend
            sits at or below the benchmark range, you can focus your attention
            on other cost categories with confidence.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/65">
            Our benchmarks are compiled from third-party industry reports and
            public sources, refreshed for 2026. Use this data as the starting
            point. For an exact, organization-specific cut — connect Efficyon
            and we&apos;ll do the math against your actual subscriptions.
          </p>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Generic benchmarks"
        italic="are a starting point."
        body="Connect your accounting system to Efficyon for a personalized benchmark report — your spend against companies in your exact size, industry, and stage. Read-only access. No credit card."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Try the calculators →", href: "/calculator" }}
      />
    </>
  )
}
