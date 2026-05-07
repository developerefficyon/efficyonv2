import Link from "next/link"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl, CURRENT_YEAR, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export async function generateMetadata() {
  return pageMetadata({
    title: `Efficyon vs Cleanshelf: ${CURRENT_YEAR} Comparison`,
    description:
      "Cleanshelf was acquired by Zylo in 2021 and is no longer independently developed. Efficyon is a modern, actively maintained alternative for SaaS cost optimization, priced for SMB and mid-market.",
    path: "/compare/efficyon-vs-cleanshelf",
  })
}

const SIDE_BY_SIDE = [
  { feature: "Status", efficyon: "Actively developed (pre-launch)", cleanshelf: "Acquired by Zylo in 2021" },
  { feature: "Pricing", efficyon: "$39–$119/mo · custom for enterprise", cleanshelf: "Now available only via Zylo enterprise contracts" },
  { feature: "Primary surface", efficyon: "Spend-vs-usage analysis with AI recommendations", cleanshelf: "Spend tracking and basic optimization suggestions" },
  { feature: "Accounting integration", efficyon: "Direct (Fortnox, Visma, QuickBooks, Xero)", cleanshelf: "Limited; relied on contract data" },
  { feature: "Independent product", efficyon: "Yes", cleanshelf: "No — absorbed into Zylo" },
  { feature: "Active integration library", efficyon: "Continuously updated", cleanshelf: "Frozen at acquisition" },
] as const

export default function EfficyonVsCleanshelfPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Looking for a Cleanshelf Alternative? Try Efficyon",
    description:
      "Cleanshelf was acquired by Zylo in 2021 and is no longer independently developed. Efficyon is a modern alternative for SaaS cost optimization.",
    url: absoluteUrl("/compare/efficyon-vs-cleanshelf"),
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What happened to Cleanshelf?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cleanshelf was acquired by Zylo in 2021. Since the acquisition, the product has been integrated into Zylo's enterprise platform and is no longer available as an independent tool. Existing customers were transitioned to Zylo.",
        },
      },
      {
        "@type": "Question",
        name: "Is Efficyon a structural replacement for Cleanshelf?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It overlaps on the spend-tracking surface that Cleanshelf occupied, with added usage-side analysis and direct accounting integration. We are pre-launch — we cannot claim seamless migration, but the use-case fit is close.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon compare to Zylo (which acquired Cleanshelf)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Zylo is enterprise-priced and enterprise-scoped. Efficyon is built for SMB and mid-market with transparent monthly pricing. For teams that valued Cleanshelf's accessibility, Efficyon is the closer structural match.",
        },
      },
      {
        "@type": "Question",
        name: "Can I migrate my Cleanshelf data to Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "There is no direct migration tool. Efficyon rebuilds your inventory by connecting to your accounting system and SaaS tools at onboarding, so a manual export from Cleanshelf is usually unnecessary.",
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Compare", path: "/compare" }, { name: "Efficyon vs Cleanshelf", path: "/compare/efficyon-vs-cleanshelf" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Compare · vs Cleanshelf"
        title="Cleanshelf was acquired."
        italic="Efficyon picks up the brief."
        body="Cleanshelf was a focused, accessible spend management tool. After Zylo acquired it in 2021, the independent product effectively stopped — and existing customers were rolled into an enterprise contract. If that was the wrong size for you, this page is about what changed and what now fits."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What Cleanshelf did well"
          title="A focused mid-market"
          italic="spend tracker."
          body="No fabricated knocks here. Cleanshelf was a respected SaaS spend management product before the acquisition — that is precisely why teams are looking for a replacement."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/70">
            Cleanshelf gave finance and IT teams a single place to see SaaS subscriptions, costs, and renewal
            dates. Setup was relatively light. The pricing was within reach for mid-sized teams. For its era it
            was a clean, opinionated take on the problem.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/55">
            What it did not do — heavy AI-driven analysis, deep usage tracking, accounting-level cost
            accuracy — was reasonable for the time. The category has since moved on, and so has the product:
            it is now part of Zylo, and that is a different scope at a different price.
          </p>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Where Efficyon is different"
          title="Spend-vs-usage,"
          italic="not just spend."
          body="Cleanshelf showed you what you were paying. Efficyon focuses on the gap between what you pay and what you actually use — and it does so on a monthly billing cadence, not an enterprise contract."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {SIDE_BY_SIDE.map((row) => (
            <div
              key={row.feature}
              className="grid gap-4 py-8 md:grid-cols-[200px_1fr_1fr] md:items-baseline md:gap-12"
            >
              <dt>
                <EditorialMonoLabel>{row.feature}</EditorialMonoLabel>
              </dt>
              <dd className="text-[15px] leading-[1.65] text-white/85">
                <span className="mb-1 block font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Efficyon
                </span>
                {row.efficyon}
              </dd>
              <dd className="text-[15px] leading-[1.65] text-white/55">
                <span className="mb-1 block font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Cleanshelf (legacy)
                </span>
                {row.cleanshelf}
              </dd>
            </div>
          ))}
        </dl>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="If you are evaluating both"
          title="Where each one"
          italic="actually fits."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel green>Choose Efficyon</EditorialMonoLabel>
            <ul className="mt-5 space-y-3 text-[15px] leading-[1.7] text-white/70">
              <li>You valued Cleanshelf&apos;s accessibility and want a similarly priced alternative.</li>
              <li>You want usage-side analysis and dollar-attached recommendations, not just spend tracking.</li>
              <li>Your accounting lives in Fortnox, Visma, QuickBooks, or Xero and you want direct integration.</li>
              <li>You are comfortable working with a pre-launch product that ships frequently.</li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>Stay on Zylo (Cleanshelf&apos;s parent)</EditorialMonoLabel>
            <ul className="mt-5 space-y-3 text-[15px] leading-[1.7] text-white/55">
              <li>You are a large enterprise and need extensive shadow-IT discovery.</li>
              <li>You already have a Zylo contract from the Cleanshelf transition and the scope fits.</li>
              <li>You need vendor-management workflows and benchmarking against a large dataset.</li>
              <li>Enterprise governance and compliance are central to your evaluation.</li>
            </ul>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Frequently asked"
          title="What people"
          italic="actually want to know."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              q: "What happened to Cleanshelf?",
              a: "Acquired by Zylo in 2021. Integrated into the Zylo enterprise platform. No longer sold as an independent product; existing customers were transitioned to Zylo contracts.",
            },
            {
              q: "Is Efficyon a structural replacement?",
              a: "It covers the spend-tracking surface Cleanshelf occupied and adds usage-side analysis with direct accounting integration. We are pre-launch, so we cannot claim seamless migration — but the use-case fit is close.",
            },
            {
              q: "How does Efficyon compare to Zylo?",
              a: (
                <>
                  Zylo is enterprise-priced and enterprise-scoped. Efficyon is built for SMB and mid-market
                  with transparent monthly pricing. For a deeper read see{" "}
                  <Link href="/compare/efficyon-vs-zylo" className="text-white/85 underline-offset-4 hover:underline">
                    Efficyon vs Zylo
                  </Link>
                  .
                </>
              ),
            },
            {
              q: "Can I migrate my data?",
              a: "No formal migration tool. Efficyon rebuilds your inventory by connecting to accounting plus your live tools at onboarding, which is usually faster than exporting from Cleanshelf.",
            },
          ].map((item) => (
            <div key={item.q} className="grid gap-6 py-10 md:grid-cols-[1fr_2fr] md:gap-12">
              <dt className="text-[18px] font-medium leading-[1.4] tracking-[-0.01em] text-white/85">
                {item.q}
              </dt>
              <dd className="text-[15px] leading-[1.7] text-white/55">{item.a}</dd>
            </div>
          ))}
        </dl>
      </EditorialSection>

      <EditorialFinalCTA
        title="A modern Cleanshelf"
        italic="without the enterprise contract."
        body="If you valued the focus and accessibility of the original Cleanshelf, Efficyon is the closer structural match. Read-only OAuth on every connection, monthly pricing, and a pre-launch team that ships on the regular."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View all comparisons →", href: "/compare" }}
      />
    </>
  )
}
