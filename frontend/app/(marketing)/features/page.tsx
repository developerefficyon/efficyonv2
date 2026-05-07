import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
  EditorialEyebrow,
} from "@/components/marketing/editorial"
import { absoluteUrl } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Features - SaaS Cost Optimization Tools",
  description:
    "Explore Efficyon's full suite of SaaS cost optimization features. From subscription tracking and duplicate payment detection to AI-powered cost analysis and automated software audits.",
  path: "/features",
})

const FEATURES = [
  {
    slug: "saas-cost-optimization",
    title: "SaaS cost optimization",
    italic: "the headline act.",
    body: "AI-driven analysis of your entire SaaS stack. Surfaces unused licenses, overlapping tools, and price drift — every month, in your dashboard.",
    meta: "Continuous · cross-tool",
  },
  {
    slug: "subscription-tracking",
    title: "Subscription tracking",
    body: "Centralized view of every subscription across your org. Renewal dates, owners, cost per seat. Catch shadow IT before it becomes structural.",
    meta: "Real-time · alerts",
  },
  {
    slug: "duplicate-payment-detection",
    title: "Duplicate payment detection",
    body: "Find duplicate invoices, overlapping tools, and redundant subscriptions silently draining your budget. The kind of thing one person leaving the company creates and no one notices for two years.",
    meta: "Pattern matching · accounting → usage",
  },
  {
    slug: "unused-license-detection",
    title: "Unused license detection",
    italic: "where the money hides.",
    body: "Usage-based analysis identifies licenses that sit idle, departed employees with active seats, and overprovisioned tiers across every connected tool.",
    meta: "90-day activity windows",
  },
  {
    slug: "saas-spend-management",
    title: "SaaS spend management",
    body: "Full spend visibility, real-time dashboards, budget controls, forecasting, department-level allocation. Replace your spreadsheet without losing the spreadsheet's clarity.",
    meta: "Per-department · per-tool",
  },
  {
    slug: "ai-cost-analysis",
    title: "AI cost analysis",
    body: "Machine learning models continuously analyze spending patterns, detect anomalies, and surface optimization opportunities humans miss. Tuned on accounting + usage data, not generic finance.",
    meta: "Continuous · explainable",
  },
  {
    slug: "software-audit",
    title: "Software audit",
    body: "Automated software inventory, compliance tracking, audit-ready reports generated in minutes. Your finance team stops fearing quarter-end.",
    meta: "Audit · compliance · export",
  },
]

const PILLARS = [
  {
    val: "$18.5k",
    label: "Modeled annual leak in a typical 18-person stack",
  },
  {
    val: "10",
    unit: "min",
    label: "To connect your first system and run a scan",
  },
  {
    val: "5×",
    label: "Fee refund guarantee — or you don't pay",
  },
] as const

export default function FeaturesIndexPage() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features"),
      description:
        "AI-powered SaaS cost optimization platform with subscription tracking, duplicate payment detection, unused license detection, spend management, AI cost analysis, and automated software audits.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      <EditorialPageHero
        eyebrow="Platform · Features"
        title="Every tool you need to"
        italic="stop the leak."
        body="Efficyon connects your accounting data with the systems your team actually uses, surfaces the gap, and tells you what to do about it. Seven features, one engine."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The stack"
          title="Seven features."
          italic="One engine."
          body="Each surfaces a specific kind of leak. Together they're the cost-intelligence layer your finance & IT teams have been building in spreadsheets."
        />
        <div className="border-t border-white/[0.08]">
          {FEATURES.map((f, i) => (
            <EditorialCard
              key={f.slug}
              href={`/features/${f.slug}`}
              index={i}
              title={f.title}
              italic={f.italic}
              body={f.body}
              meta={f.meta}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Why teams pick us"
          title="The math is honest,"
          italic="the access is read-only."
          body="We don't have a wall of customer logos yet — we're early. We have something better: contractual guarantees and a stack you can audit before you sign."
        />
        <div className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-3 md:divide-x md:divide-y-0">
          {PILLARS.map((p, i) => (
            <div key={i} className="px-0 py-12 md:px-12">
              <div className="mb-3 flex items-baseline gap-2">
                <span
                  className="text-[clamp(48px,5.5vw,72px)] font-medium leading-none tracking-[-0.04em]"
                  style={{ color: "var(--green)" }}
                >
                  {p.val}
                </span>
                {"unit" in p && p.unit && (
                  <span className="font-[family-name:var(--font-instrument-serif)] text-[28px] italic text-white/55">
                    {p.unit}
                  </span>
                )}
              </div>
              <EditorialEyebrow>{p.label}</EditorialEyebrow>
            </div>
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Stop overpaying for software."
        italic="Start with one scan."
        body="Connect one system, run your first analysis in 10 minutes, and see what we surface. No credit card. Read-only access. Cancel anytime."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to sales →", href: "/#contact" }}
      />
    </>
  )
}
