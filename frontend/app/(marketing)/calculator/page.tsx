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
  title: "Free SaaS Calculators & Tools | Efficyon",
  description:
    "Free interactive SaaS calculators to estimate your software costs, calculate ROI from optimization, and identify subscription waste. Make data-driven decisions about your SaaS stack.",
  path: "/calculator",
})

const CALCULATORS = [
  {
    slug: "saas-cost",
    title: "SaaS Cost Calculator",
    italic: "are you spending too much?",
    body:
      "Enter your company profile and instantly see how your spend compares to industry benchmarks. Per-employee math, overspend detection, modeled annual waste — all on one page.",
    meta: "Industry benchmarks · per-employee · overspend",
  },
  {
    slug: "roi",
    title: "Optimization ROI Calculator",
    italic: "what would cleanup actually return?",
    body:
      "License optimization, duplicate elimination, and time savings — modeled against your current stack. See projected payback period and three-year net savings.",
    meta: "Savings model · payback · 3-year horizon",
  },
  {
    slug: "waste-estimator",
    title: "SaaS Waste Estimator",
    italic: "where is the money hiding?",
    body:
      "Estimate annual waste from unused licenses, duplicate tools, and overprovisioned tiers. Includes a Shadow IT risk score and an urgency assessment.",
    meta: "Unused · duplicate · overprovisioned",
  },
] as const

export default function CalculatorIndexPage() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Free SaaS Calculators & Tools",
      description:
        "Interactive SaaS cost calculators to help businesses optimize their software spending.",
      url: absoluteUrl("/calculator"),
      mainEntity: CALCULATORS.map((calc) => ({
        "@type": "WebApplication",
        name: calc.title,
        url: absoluteUrl(`/calculator/${calc.slug}`),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      })),
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Calculators", path: "/calculator" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      <EditorialPageHero
        eyebrow="Free tools · No sign-up"
        title="Numbers before"
        italic="you sign anything."
        body="Three interactive calculators that take the guesswork out of SaaS spend. Run them on your phone in five minutes — get a directional read on cost, ROI, and waste."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The toolkit"
          title="Three calculators."
          italic="One stack."
          body="Each runs entirely client-side on industry-validated formulas. They're estimates — directional, not diagnostic. For exact numbers, connect your accounting system."
        />
        <div className="border-t border-white/[0.08]">
          {CALCULATORS.map((c, i) => (
            <EditorialCard
              key={c.slug}
              href={`/calculator/${c.slug}`}
              index={i}
              title={c.title}
              italic={c.italic}
              body={c.body}
              meta={c.meta}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Why use them"
          title="Estimates beat"
          italic="hunches."
          body="The average company runs 100+ SaaS apps and wastes 25–35% of that spend without ever noticing. Use these to anchor the conversation before next budget cycle."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/65">
            SaaS spending has quietly become one of the largest line items in
            modern operating budgets. Without a baseline, it&apos;s impossible
            to know whether you&apos;re overpaying for a 50-person stack — or
            whether the new project management tool overlaps with three you
            already own. These calculators give you that baseline in minutes.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/65">
            Each formula is derived from third-party industry research on
            SaaS utilization, license rates, and waste percentages. The
            results are estimates intended to flag areas worth investigating.
            For a precise read on your actual stack — connect Fortnox, Visma,
            QuickBooks, or Xero, and Efficyon will tell you exactly where the
            leak is.
          </p>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Want exact numbers"
        italic="instead of estimates?"
        body="Connect one accounting system, run your first scan in 10 minutes, and Efficyon will tell you exactly where your stack is leaking — with line-item recommendations. Read-only access. No credit card."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to sales →", href: "mailto:info@efficyon.com" }}
      />
    </>
  )
}
