import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, itemListLd, softwareApplicationLd, jsonLdScript } from "@/lib/seo/jsonld"

const LISTICLE_TOOLS = [
  { name: "Efficyon", url: SITE_URL, description: "SaaS cost intelligence — accounting + identity, EU-hosted." },
  { name: "Zylo", url: "https://zylo.com", description: "Enterprise SaaS management platform." },
  { name: "Torii", url: "https://toriihq.com", description: "Mid-market SaaS management with workflow automation." },
  { name: "Productiv", url: "https://productiv.com", description: "Application engagement analytics for enterprise." },
  { name: "Cleanshelf", url: "https://www.cleanshelf.com", description: "Acquired by Zylo in 2021; legacy SaaS-management product." },
  { name: "Vendr", url: "https://vendr.com", description: "SaaS buying + procurement, not pure spend visibility." },
  { name: "Cledara", url: "https://cledara.com", description: "Subscription management with virtual cards." },
  { name: "Spreadsheets", url: absoluteUrl("/compare/efficyon-vs-spreadsheets"), description: "The status quo." },
]

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Best SaaS Cost Optimization Tools in 2026 - Complete Guide",
    description:
      "An opinionated guide to the eight common approaches to SaaS cost optimization in 2026: Efficyon, Zylo, Torii, Productiv, Cleanshelf, Vendr, Cledara, and the spreadsheet status quo.",
    alternates: {
      canonical: "/compare/best-saas-cost-optimization-tools",
    },
    openGraph: {
      title: "Best SaaS Cost Optimization Tools in 2026: Complete Guide",
      description:
        "Opinionated guide to eight approaches to SaaS cost optimization in 2026 — what each tool actually does, who it is built for, and how the pricing model works.",
      url: absoluteUrl("/compare/best-saas-cost-optimization-tools"),
    },
  }
}

const TOOLS = [
  {
    name: "Efficyon",
    italic: "the AI-driven cost layer.",
    bestFor: "SMB & mid-market (1–500)",
    pricing: "$39 – $119/mo · custom for enterprise",
    overview:
      "AI-powered SaaS cost intelligence. Connects accounting plus the tools your team uses, watches the gap between spend and usage, and surfaces prioritized recommendations with dollar amounts. Pre-launch — no customer wall yet.",
    strength:
      "Accounting-level accuracy; recommendations with explicit savings; transparent SMB pricing.",
    limitation:
      "Smaller integration library than incumbents. No formal benchmarking dataset yet because we are early.",
  },
  {
    name: "Zylo",
    italic: "the enterprise standard.",
    bestFor: "Large enterprises (5,000+)",
    pricing: "Enterprise contracts, typically $50K+/year",
    overview:
      "Established SaaS management platform built around discovery, governance, and benchmarking against a large customer dataset. Deep vendor management and compliance tooling.",
    strength:
      "Breadth of discovery, benchmarking data, and governance features at enterprise scale.",
    limitation:
      "Pricing and implementation timeline put it out of reach for most companies under 1,000 employees.",
  },
  {
    name: "Torii",
    italic: "IT operations, automated.",
    bestFor: "IT-led mid-market & enterprise",
    pricing: "Custom (typically per-employee/year, mid-five figures)",
    overview:
      "SaaS management with a strong IT-workflow bias — onboarding, offboarding, app-request portals, lifecycle automation. Cost visibility ships with it but is not the headline act.",
    strength:
      "Workflow automation and self-service portals for IT teams managing many users.",
    limitation:
      "Cost optimization is not the primary product surface. Requires IT to configure workflows.",
  },
  {
    name: "Productiv",
    italic: "engagement analytics, deep.",
    bestFor: "Large enterprises focused on adoption",
    pricing: "Enterprise contracts, typically six figures",
    overview:
      "SaaS intelligence focused on feature-level engagement and adoption scoring across the enterprise stack. Tells you how well tools are used, not directly how much you can save.",
    strength: "Depth of adoption analytics, feature-level engagement, benchmarking.",
    limitation:
      "Cost insights are a byproduct of analytics rather than the primary deliverable. Enterprise-only.",
  },
  {
    name: "Cleanshelf",
    italic: "now part of Zylo.",
    bestFor: "Existing Cleanshelf customers transitioning",
    pricing: "Available only via Zylo enterprise contracts",
    overview:
      "A SaaS spend tracking platform acquired by Zylo. No longer independently developed; existing customers were transitioned into Zylo's enterprise product.",
    strength: "Was a focused mid-market spend management tool in its independent era.",
    limitation: "Frozen feature set as a standalone; new customers buy Zylo, not Cleanshelf.",
  },
  {
    name: "Vendr",
    italic: "purchasing & negotiation.",
    bestFor: "Companies with $500K+/year SaaS spend",
    pricing: "Typically from ~$30K/year, often tied to spend under management",
    overview:
      "A SaaS buying platform — negotiates contracts, manages renewals, and uses aggregated buying data to push for better pricing. Procurement-focused, not usage-focused.",
    strength: "Negotiation leverage and procurement workflows for new and renewing contracts.",
    limitation:
      "Does not track usage of what you already own. Best paired with a usage-side tool, not used as a substitute.",
  },
  {
    name: "Cledara",
    italic: "spend control via virtual cards.",
    bestFor: "Finance teams wanting purchasing control",
    pricing: "Free tier for small teams · paid plans from ~$100/mo",
    overview:
      "Issues a virtual card per SaaS subscription, giving finance approval, cancellation, and budget controls at the payment layer. Strong on spend governance, lighter on usage analytics.",
    strength: "Granular spend control and approval workflows from the card up.",
    limitation: "Limited usage analytics. Pairs naturally with a usage-side cost optimization tool.",
  },
  {
    name: "Spreadsheets",
    italic: "the default starting point.",
    bestFor: "Teams with fewer than ten subscriptions",
    pricing: "Free in software · expensive in labor",
    overview:
      "A list of subscriptions in a sheet, updated by hand. Works at small scale, breaks down quickly past it. No usage data, no pattern matching, no alerts.",
    strength: "Zero software cost. Total flexibility. Familiar.",
    limitation:
      "Always slightly out of date. Cannot see usage. Maintenance time scales with stack size, not the tool.",
  },
] as const

export default function BestSaaSToolsPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Best SaaS Cost Optimization Tools in 2026: Complete Guide",
    description:
      "Opinionated guide to eight approaches to SaaS cost optimization in 2026.",
    url: absoluteUrl("/compare/best-saas-cost-optimization-tools"),
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best SaaS cost optimization tool for small businesses?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "For SMBs, the structural pick is a tool with transparent pricing in the tens of dollars per month, accounting integration, and usage-driven recommendations. Most enterprise SaaS management platforms are priced and scoped for organizations 10-100x larger.",
        },
      },
      {
        "@type": "Question",
        name: "How much can SaaS cost optimization tools save?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Industry estimates put SaaS waste at roughly 15-30% of total SaaS spend across unused licenses, overlapping tools, and wrong-tier subscriptions. Actual savings vary widely with the maturity of your procurement and the discipline of your IT-finance handoff.",
        },
      },
      {
        "@type": "Question",
        name: "What features should I look for in a SaaS cost optimization tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Usage tracking (not just spend tracking), accounting integration so the cost numbers match reality, recommendations with explicit savings amounts, renewal alerts, and read-only access. The most important question is whether the tool produces actions or just dashboards.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need a SaaS management tool if I only have 20 subscriptions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It depends on how often the stack changes and how much usage data you can pull manually. For most teams, twenty active subscriptions is past the point where a spreadsheet stays accurate without significant labor.",
        },
      },
      {
        "@type": "Question",
        name: "What is the difference between SaaS management and SaaS cost optimization?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SaaS management is the broad category — discovery, procurement, governance, lifecycle. SaaS cost optimization is the narrower discipline of finding and removing spend that does not produce value. Some platforms do both; most lean to one side.",
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Compare", path: "/compare" }, { name: "Best SaaS Cost Optimization Tools", path: "/compare/best-saas-cost-optimization-tools" }]), itemListLd(LISTICLE_TOOLS), softwareApplicationLd({ name: "Efficyon", description: "SaaS cost intelligence — accounting + identity, EU-hosted.", url: SITE_URL, category: "BusinessApplication" })]) }}
      />

      <EditorialPageHero
        eyebrow="Compare · 2026 guide"
        title="Eight approaches to SaaS cost,"
        italic="written without spin."
        body="Industry research consistently lands on 15–30% SaaS waste in mid-sized stacks. The right tool depends on which slice of that waste you are trying to remove and how much you are willing to spend to remove it. Here is what each option actually does."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="At a glance"
          title="What each tool is"
          italic="actually for."
          body="Pricing tiers, target customer, and the structural job each platform does. We are pre-launch — we are not claiming customer wins we have not earned."
        />
        <div className="border-t border-white/[0.08]">
          {TOOLS.map((t) => (
            <article
              key={t.name}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[1fr_auto] md:gap-12"
            >
              <div>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] md:text-[28px]">
                  {t.name}{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                    {t.italic}
                  </span>
                </h3>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.65] text-white/55">
                  {t.overview}
                </p>
                <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <dt>
                      <EditorialMonoLabel green>Strength</EditorialMonoLabel>
                    </dt>
                    <dd className="mt-2 text-[14px] leading-[1.65] text-white/70">{t.strength}</dd>
                  </div>
                  <div>
                    <dt>
                      <EditorialMonoLabel>Limitation</EditorialMonoLabel>
                    </dt>
                    <dd className="mt-2 text-[14px] leading-[1.65] text-white/55">{t.limitation}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-3 self-start md:items-end md:text-right">
                <div>
                  <EditorialMonoLabel>Built for</EditorialMonoLabel>
                  <p className="mt-1 text-[13.5px] text-white/70">{t.bestFor}</p>
                </div>
                <div>
                  <EditorialMonoLabel>Pricing</EditorialMonoLabel>
                  <p className="mt-1 text-[13.5px] text-white/70">{t.pricing}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How to choose"
          title="Start with the question"
          italic="you actually want answered."
          body="Most teams use the wrong tool because they bought the most-marketed one. The decision usually comes down to four reasonable goals."
        />
        <dl className="grid grid-cols-1 divide-y divide-white/[0.08] border-y border-white/[0.08] md:grid-cols-2 md:divide-x md:divide-y-0">
          {[
            {
              question: "Where can we cut cost — quickly?",
              answer:
                "An AI-driven, accounting-aware tool like Efficyon. Built for the spend-vs-usage gap.",
            },
            {
              question: "How do we automate IT lifecycle work?",
              answer: "Torii. Workflow automation is its main surface.",
            },
            {
              question: "We are 5,000+ people — give us governance.",
              answer:
                "Zylo or Productiv, depending on whether you weight discovery or adoption analytics.",
            },
            {
              question: "We need to negotiate contracts better.",
              answer: "Vendr on the procurement side. Pair with a usage-side tool, do not replace it.",
            },
          ].map((row) => (
            <div key={row.question} className="px-0 py-10 md:px-12">
              <dt className="font-[family-name:var(--font-instrument-serif)] text-[22px] italic text-white/85">
                {row.question}
              </dt>
              <dd className="mt-3 text-[14.5px] leading-[1.7] text-white/55">{row.answer}</dd>
            </div>
          ))}
        </dl>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Frequently asked"
          title="The questions"
          italic="that actually matter."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              q: "What is the best SaaS cost tool for small businesses?",
              a: "Structurally, the right shape for SMBs is transparent pricing in the tens of dollars per month, accounting integration, and recommendations with dollar amounts attached. Enterprise SaaS management platforms are priced for organizations 10–100x larger.",
            },
            {
              q: "How much can these tools actually save?",
              a: "Industry research lands on 15–30% of SaaS spend as recoverable waste. Real numbers depend on procurement maturity, IT-finance handoff, and how disciplined your team is about acting on recommendations.",
            },
            {
              q: "What should I look for in a tool?",
              a: "Usage tracking (not just spend), accounting integration so numbers match invoices, recommendations with explicit savings, and read-only access. The real question is whether the tool produces actions or just dashboards.",
            },
            {
              q: "Do I need a tool with only twenty subscriptions?",
              a: "It depends on stack volatility. Twenty subscriptions in a stable stack can survive in a sheet. Twenty in a fast-growing team usually cannot.",
            },
            {
              q: "What is the difference between SaaS management and cost optimization?",
              a: "Management is the broad category — discovery, procurement, governance, lifecycle. Cost optimization is the narrower discipline of removing spend that produces no value. Most platforms lean one way.",
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
        title="Pick the tool that fits."
        italic="Even if it is not us."
        body="If your stack is enterprise-scale and governance-heavy, Zylo or Productiv probably wins. If you want the spend-vs-usage gap closed quickly without an enterprise contract, that is what we built Efficyon for."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View individual comparisons →", href: "/compare" }}
      />
    </>
  )
}
