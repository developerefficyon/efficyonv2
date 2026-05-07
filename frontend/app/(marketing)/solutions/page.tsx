import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
  EditorialEyebrow,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Solutions - SaaS Cost Optimization by Role",
  description:
    "Efficyon provides tailored SaaS cost optimization solutions for startups, finance teams, IT managers, CFOs, and enterprises. Find the right solution for your role and team size.",
  path: "/solutions",
})

const SOLUTIONS = [
  {
    slug: "for-startups",
    title: "For startups",
    italic: "preserve the runway.",
    body: "Every dollar matters at 18 months of runway. Efficyon surfaces the trial that auto-converted, the duplicate stack two co-founders set up, and the seat counts that haven't kept up with the team. Built for the lean stage.",
    meta: "Pre-Series B · 5–40 people",
  },
  {
    slug: "for-finance-teams",
    title: "For finance teams",
    italic: "the spreadsheet, retired.",
    body: "Centralize SaaS spend across every accounting feed and corporate card. Auto-categorize subscriptions, allocate to departments, and stop manually reconciling renewals against the budget every month.",
    meta: "Categorization · allocation · audit-ready",
  },
  {
    slug: "for-it-managers",
    title: "For IT managers",
    italic: "shadow IT, surfaced.",
    body: "Find the SaaS subscriptions that bypassed procurement, departed employees with active seats, and tools your security review never saw. License usage tied to identity data — not just inventory.",
    meta: "Discovery · compliance · access",
  },
  {
    slug: "for-cfo",
    title: "For CFOs",
    italic: "the second-largest line, explained.",
    body: "SaaS is the line item nobody can answer for in the boardroom. Efficyon gives you the modeled forecast, the department-level breakdown, and the narrative for why software spend moves the way it does.",
    meta: "Forecast · benchmark · board-ready",
  },
  {
    slug: "for-enterprise",
    title: "For enterprise",
    italic: "scale without sprawl.",
    body: "Hundreds of vendors, dozens of departments, governance that has to actually hold. Read-only access, EU hosting, SSO/SAML on the roadmap, and an integration surface that fits next to your ERP and identity provider.",
    meta: "500+ employees · EU-hosted",
  },
]

export default function SolutionsHubPage() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Solutions - SaaS Cost Optimization by Role | Efficyon",
      description:
        "Efficyon provides tailored SaaS cost optimization solutions for startups, finance teams, IT managers, CFOs, and enterprises.",
      url: absoluteUrl("/solutions"),
      publisher: {
        "@type": "Organization",
        name: "Efficyon",
        url: SITE_URL,
      },
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Solutions", path: "/solutions" },
    ]),
  ]

  const PILLARS = [
    { val: "$18.5k", label: "Modeled annual leak in a typical 18-person stack" },
    { val: "10", unit: "min", label: "To connect your first system and run a scan" },
    { val: "5×", label: "Fee refund guarantee — or you don't pay" },
  ] as const

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      <EditorialPageHero
        eyebrow="Platform · Solutions"
        title="One engine."
        italic="Five vantage points."
        body="Efficyon ingests the same accounting and usage data for every team — but the questions a CFO asks are not the questions an IT lead asks. Pick the angle closest to how you think about cost."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="By role"
          title="Same data."
          italic="Different lens."
          body="Each path frames the same cost-intelligence engine for the team that has to act on it. Startup founders, finance leads, IT managers, CFOs, enterprise procurement — five readings of one number."
        />
        <div className="border-t border-white/[0.08]">
          {SOLUTIONS.map((s, i) => (
            <EditorialCard
              key={s.slug}
              href={`/solutions/${s.slug}`}
              index={i}
              title={s.title}
              italic={s.italic}
              body={s.body}
              meta={s.meta}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The honest math"
          title="No customer logos yet,"
          italic="just guarantees you can read."
          body="Efficyon is pre-launch. We don't have a wall of testimonials. We have read-only access, contractual refunds, and numbers we can show our work on."
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
        title="Not sure which path fits?"
        italic="Start with the scan."
        body="Connect one system, run an analysis in 10 minutes, see what we surface. The right framing tends to reveal itself the moment you see your own numbers."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to us →", href: "/#contact" }}
      />
    </>
  )
}
