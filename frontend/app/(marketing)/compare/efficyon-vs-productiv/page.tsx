import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Productiv Alternative - Efficyon vs Productiv SaaS Intelligence Comparison",
    description:
      "Productiv is a deep engagement-analytics platform for enterprises. Efficyon is an AI-driven cost intelligence layer for SMB and mid-market. Different jobs, different price points.",
    alternates: {
      canonical: "/compare/efficyon-vs-productiv",
    },
    openGraph: {
      title: "Efficyon vs Productiv: SaaS Intelligence Platforms Compared",
      description:
        "Productiv measures adoption depth across enterprise SaaS. Efficyon measures the gap between spend and usage and recommends action.",
      url: absoluteUrl("/compare/efficyon-vs-productiv"),
    },
  }
}

const SIDE_BY_SIDE = [
  { feature: "Primary surface", efficyon: "Spend-vs-usage cost intelligence", productiv: "Feature-level engagement & adoption analytics" },
  { feature: "Pricing", efficyon: "$39–$119/mo · custom for enterprise", productiv: "Enterprise contracts, typically six figures" },
  { feature: "Target customer", efficyon: "SMB & mid-market (1–500)", productiv: "Large enterprises with adoption programs" },
  { feature: "Recommendations", efficyon: "Prioritized actions with dollar amounts", productiv: "Adoption insights and benchmarks" },
  { feature: "Accounting integration", efficyon: "Direct (Fortnox, Visma, QuickBooks, Xero)", productiv: "Contract & license-based cost data" },
  { feature: "Adoption depth", efficyon: "Usage signals from connected tools", productiv: "Feature-level engagement scoring" },
  { feature: "Setup time", efficyon: "Hours to days", productiv: "Weeks to months for enterprise rollout" },
] as const

export default function EfficyonVsProductivPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Efficyon vs Productiv: SaaS Intelligence Platforms Compared",
    description:
      "Comparison of Efficyon and Productiv. Different jobs: cost intelligence vs engagement analytics.",
    url: absoluteUrl("/compare/efficyon-vs-productiv"),
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the difference between Efficyon and Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is built around the spend-vs-usage gap and produces savings recommendations with dollar amounts. Productiv is built around feature-level engagement analytics and adoption scoring. Different jobs.",
        },
      },
      {
        "@type": "Question",
        name: "Is Efficyon cheaper than Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes — by an order of magnitude. Efficyon publishes monthly pricing starting at $39. Productiv is enterprise-only and typically priced in the six figures annually.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon offer engagement analytics like Productiv?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon uses usage signals to drive cost recommendations, but does not offer Productiv's depth of feature-level engagement scoring or adoption benchmarking. If granular adoption analytics is your primary need, Productiv has the edge there.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use both?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Some large organizations do — Productiv for adoption insight, a cost-side tool for spend optimization. For most companies under 500 the two needs collapse into one and a single AI-driven cost tool covers it.",
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

      <EditorialPageHero
        eyebrow="Compare · vs Productiv"
        title="Productiv asks how."
        italic="Efficyon asks how much."
        body="Productiv is a serious enterprise SaaS-intelligence platform built around feature-level engagement and adoption depth. Efficyon is a cost intelligence layer for SMB and mid-market built around the gap between spend and usage. Both are honest about what they do — they just do different things."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What Productiv does well"
          title="Adoption analytics,"
          italic="at enterprise depth."
          body="Productiv earned its position in the enterprise. It measures how employees actually engage with applications at a feature level — not just whether they logged in."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/70">
            For organizations running adoption programs across hundreds of applications and thousands of
            users, Productiv produces benchmarks and engagement scores that genuinely inform decisions about
            training, change management, and tool consolidation.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/55">
            That depth comes with an enterprise price tag and an enterprise implementation. Cost insights
            are present, but the platform&apos;s center of gravity is engagement, not the dollar number on the
            invoice.
          </p>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Where Efficyon is different"
          title="Built for the question"
          italic="finance keeps asking."
          body="The CFO wants to know how much you can cut and from where. Efficyon answers that directly — and prices itself for teams whose answer is not 'six figures'."
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
                  Productiv
                </span>
                {row.productiv}
              </dd>
            </div>
          ))}
        </dl>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Different outputs"
          title="What you actually get"
          italic="on Monday morning."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div className="border-l border-white/[0.08] pl-6">
            <EditorialMonoLabel green>Efficyon, in your inbox</EditorialMonoLabel>
            <p className="mt-4 font-[family-name:var(--font-instrument-serif)] text-[20px] italic leading-[1.5] text-white/80">
              &ldquo;Three actions this month — modeled total $7,400 / yr. Consolidating two project tools, downgrading nine licenses, removing one unused subscription.&rdquo;
            </p>
          </div>
          <div className="border-l border-white/[0.08] pl-6">
            <EditorialMonoLabel>Productiv, in your dashboard</EditorialMonoLabel>
            <p className="mt-4 font-[family-name:var(--font-instrument-serif)] text-[20px] italic leading-[1.5] text-white/55">
              &ldquo;Slack adoption sits at 89% across the org; channel engagement is steady; Huddle adoption is 12% and trending flat.&rdquo;
            </p>
          </div>
        </div>
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
              <li>Cost reduction is your primary goal, not adoption measurement.</li>
              <li>You are SMB or mid-market and an enterprise contract is a non-starter.</li>
              <li>You want recommendations with dollar amounts, not engagement scores.</li>
              <li>Direct accounting integration matters to you.</li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>Choose Productiv</EditorialMonoLabel>
            <ul className="mt-5 space-y-3 text-[15px] leading-[1.7] text-white/55">
              <li>You run adoption and change-management programs at scale.</li>
              <li>You are 5,000+ employees with budget for six-figure platforms.</li>
              <li>You need feature-level engagement analytics and benchmarking.</li>
              <li>Engagement depth is the deliverable, savings are a byproduct.</li>
            </ul>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Frequently asked"
          title="The questions"
          italic="people email us."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              q: "What is the actual difference?",
              a: "Efficyon is built around the gap between spend and usage and ships dollar-attached recommendations. Productiv is built around feature-level engagement and adoption depth. Different jobs.",
            },
            {
              q: "Is Efficyon cheaper?",
              a: "Yes — by an order of magnitude. Monthly pricing from $39 vs enterprise contracts typically in the six figures annually.",
            },
            {
              q: "Does Efficyon do engagement analytics?",
              a: "It uses usage signals to drive cost recommendations, but does not match Productiv's depth of feature-level engagement scoring. If that is your headline need, Productiv wins on that surface.",
            },
            {
              q: "Can I use both?",
              a: "Some large organizations do. For most teams under 500 the two needs collapse and a single AI-driven cost tool covers it.",
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
        title="If the answer you want"
        italic="is in dollars."
        body="Productiv is a serious enterprise tool for serious enterprise problems. Efficyon is built for teams whose problem looks more like a finance question than an adoption program. Connect read-only and see what we surface."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View all comparisons →", href: "/compare" }}
      />
    </>
  )
}
