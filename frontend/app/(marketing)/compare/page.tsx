import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"

export const metadata: Metadata = {
  title: "Compare SaaS Management Tools",
  description:
    "Honest comparisons of Efficyon against Zylo, Torii, Productiv, Cleanshelf, spreadsheets, and more. Structural differences, not fabricated benchmarks.",
  alternates: {
    canonical: "/compare",
  },
  openGraph: {
    title: "Compare SaaS Management Tools | Efficyon",
    description:
      "Honest comparisons of Efficyon against Zylo, Torii, Productiv, Cleanshelf, spreadsheets, and more.",
    url: absoluteUrl("/compare"),
  },
}

const COMPARISONS = [
  {
    slug: "efficyon-vs-zylo",
    name: "Efficyon vs Zylo",
    italic: "SMB-priced vs enterprise-only.",
    body: "Zylo is the established enterprise SaaS management platform with deep discovery and benchmarking. Efficyon is the AI-driven cost layer priced for teams under 500.",
    meta: "Enterprise vs SMB · pricing · scope",
  },
  {
    slug: "efficyon-vs-torii",
    name: "Efficyon vs Torii",
    italic: "Workflow automation vs cost intelligence.",
    body: "Torii excels at IT lifecycle workflows — onboarding, offboarding, app requests. Efficyon focuses on the spend-vs-usage gap and actionable savings.",
    meta: "IT operations vs cost optimization",
  },
  {
    slug: "efficyon-vs-cleanshelf",
    name: "Efficyon vs Cleanshelf",
    italic: "An acquired product vs an active one.",
    body: "Cleanshelf was acquired by Zylo and is no longer independently developed. For teams that valued its accessibility, Efficyon is a structurally similar, actively maintained alternative.",
    meta: "Acquired · legacy · alternative",
  },
  {
    slug: "efficyon-vs-productiv",
    name: "Efficyon vs Productiv",
    italic: "Engagement analytics vs cost recommendations.",
    body: "Productiv measures feature-level adoption across enterprise SaaS. Efficyon measures the gap between what you pay and what you use, then tells you what to do.",
    meta: "Adoption analytics vs cost intelligence",
  },
  {
    slug: "efficyon-vs-spreadsheets",
    name: "Efficyon vs Spreadsheets",
    italic: "The starting point most teams outgrow.",
    body: "A spreadsheet works for ten subscriptions. At forty it becomes a part-time job — and it still has no usage data. Here is where the math stops working.",
    meta: "Manual tracking vs automation",
  },
  {
    slug: "best-saas-cost-optimization-tools",
    name: "Best SaaS cost optimization tools",
    italic: "the 2026 guide.",
    body: "An opinionated roundup of Efficyon, Zylo, Torii, Productiv, Cleanshelf, Vendr, Cledara, and the spreadsheet status quo. Who each is for, and where the lines are drawn.",
    meta: "Roundup · 8 approaches",
  },
] as const

export default function ComparePage() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Compare SaaS Management Tools | Efficyon",
      description:
        "Honest comparisons of Efficyon against other SaaS management and cost optimization tools.",
      url: absoluteUrl("/compare"),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: COMPARISONS.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          url: absoluteUrl(`/compare/${c.slug}`),
        })),
      },
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Compare", path: "/compare" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      <EditorialPageHero
        eyebrow="Compare · Honest framing"
        title="How Efficyon stacks up against"
        italic="the obvious alternatives."
        body="We are pre-launch. We do not have customer logos to wave around, and we are not going to pretend competitors are bad — they are not. These pages explain the structural differences so you can pick what fits."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The shortlist"
          title="Six comparisons,"
          italic="written without spin."
          body="Each page focuses on what each tool actually does, who it is built for, and how the pricing model works. No fabricated win-rates."
        />
        <div className="border-t border-white/[0.08]">
          {COMPARISONS.map((c, i) => (
            <EditorialCard
              key={c.slug}
              href={`/compare/${c.slug}`}
              index={i}
              title={c.name}
              italic={c.italic}
              body={c.body}
              meta={c.meta}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        eyebrow="Not sure yet?"
        title="Talk it through with"
        italic="a human."
        body="If your stack is unusual or you are deciding between two of the above, drop us a line. We will tell you when Efficyon is not the right fit — including which competitor probably is."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Email us →", href: "mailto:info@efficyon.com" }}
      />
    </>
  )
}
