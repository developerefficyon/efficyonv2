import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export async function generateMetadata() {
  return pageMetadata({
    title: "Torii Alternative - Efficyon vs Torii SaaS Management Compared",
    description:
      "Torii is a strong IT-workflow automation platform. Efficyon is an AI-driven cost intelligence layer. Different jobs, different prices.",
    path: "/compare/efficyon-vs-torii",
  })
}

const SIDE_BY_SIDE = [
  { feature: "Primary surface", efficyon: "Spend-vs-usage cost intelligence", torii: "IT lifecycle workflow automation" },
  { feature: "Pricing", efficyon: "$39–$119/mo · custom for enterprise", torii: "Custom (typically per-employee/year, mid-five figures)" },
  { feature: "Target customer", efficyon: "SMB & mid-market (1–500)", torii: "IT-led mid-market & enterprise" },
  { feature: "Onboarding/offboarding automation", efficyon: "Out of scope", torii: "Core competence" },
  { feature: "Cost recommendations", efficyon: "Prioritized actions with dollar amounts", torii: "Light — workflow surface, not finance" },
  { feature: "Accounting integration", efficyon: "Direct (Fortnox, Visma, QuickBooks, Xero)", torii: "Limited; not the primary use case" },
  { feature: "Setup model", efficyon: "Self-serve, hours to days", torii: "Workflow design with IT ownership" },
] as const

export default function EfficyonVsToriiPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Efficyon vs Torii: SaaS Management Compared",
    description:
      "Comparison of Efficyon and Torii. Different jobs: cost intelligence vs IT workflow automation.",
    url: absoluteUrl("/compare/efficyon-vs-torii"),
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the main difference between Efficyon and Torii?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is built around the spend-vs-usage gap and produces cost-saving recommendations. Torii is built around IT lifecycle workflows — onboarding, offboarding, app requests. Different jobs.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use both?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Some organizations run Torii for IT operations and a separate cost-side tool for finance. The two surfaces complement each other when both needs exist.",
        },
      },
      {
        "@type": "Question",
        name: "How does pricing compare?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon publishes monthly pricing from $39. Torii uses custom pricing — typically per-employee/year and landing in the mid-five figures for mid-market deals.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon do workflow automation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Lightly — for implementing optimization recommendations. It is not a full IT-workflow platform. If automated lifecycle workflows are your headline need, Torii is the better fit.",
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Compare", path: "/compare" }, { name: "Efficyon vs Torii", path: "/compare/efficyon-vs-torii" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Compare · vs Torii"
        title="Torii automates IT."
        italic="Efficyon optimizes spend."
        body="Both are SaaS management tools but they sit on different surfaces. Torii is the leader in IT lifecycle automation — onboarding, offboarding, app-request workflows. Efficyon is built around the gap between what you pay and what you use. Pick by which problem actually keeps your team up at night."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What Torii does well"
          title="IT lifecycle,"
          italic="genuinely automated."
          body="If your IT team is buried under provisioning tickets, Torii's workflow engine is built exactly for that — and it is good at it."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/70">
            Torii excels at automating the repetitive operational work around SaaS — when an employee
            joins, leaves, or changes role. App-request portals, automated provisioning, conditional
            triggers. For IT-led organizations with hundreds of users and dozens of regularly-issued tools,
            this is real time saved.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/55">
            Cost visibility ships with it, but it is not the headline. Torii&apos;s product center of gravity is
            the workflow, not the dollar number on the invoice. That focus is a feature, not a bug —
            provided it matches what you need.
          </p>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Where Efficyon is different"
          title="The cost question,"
          italic="taken seriously."
          body="If your bottleneck is finance asking 'where can we cut?' rather than IT asking 'how do we automate this?', Efficyon is built for that question — and priced for it."
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
                  Torii
                </span>
                {row.torii}
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
              <li>Cost reduction is the headline goal — finance is driving the conversation.</li>
              <li>You want recommendations with dollar amounts, not workflow templates.</li>
              <li>You are SMB or mid-market and an enterprise-priced workflow platform is overkill.</li>
              <li>Direct accounting integration matters to you.</li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>Choose Torii</EditorialMonoLabel>
            <ul className="mt-5 space-y-3 text-[15px] leading-[1.7] text-white/55">
              <li>IT operations are the bottleneck — you need lifecycle automation at scale.</li>
              <li>You have an IT team able to design and maintain workflows.</li>
              <li>Self-service app-request portals are part of your evaluation.</li>
              <li>Per-employee pricing in the mid-five figures range fits your budget.</li>
            </ul>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Frequently asked"
          title="The honest"
          italic="answers."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              q: "What's the main difference?",
              a: "Efficyon is cost intelligence — spend-vs-usage gap, recommendations with dollar amounts. Torii is IT workflow automation — onboarding, offboarding, app requests. Different jobs.",
            },
            {
              q: "Can I use both?",
              a: "Yes — and some organizations do. The surfaces are complementary rather than overlapping. Run Torii for IT operations, run a cost tool for finance.",
            },
            {
              q: "How does pricing compare?",
              a: "Efficyon publishes monthly pricing from $39. Torii uses custom per-employee pricing typically landing in the mid-five figures annually for mid-market deals.",
            },
            {
              q: "Does Efficyon automate workflows?",
              a: "Lightly — for implementing optimization recommendations. It is not a full IT-workflow platform. If automated lifecycle workflows are your headline need, Torii is the better fit.",
            },
            {
              q: "Which one cuts cost faster?",
              a: "Efficyon, structurally — that is what it is built for. Torii can identify unused licenses as a side effect of its workflow data, but the cost-recommendation surface is light by comparison.",
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
        title="Different jobs."
        italic="Pick the one you need."
        body="If your IT team is drowning in provisioning work, Torii is a serious answer. If your finance team is asking where the SaaS leak is — that is what we built Efficyon for. Connect read-only and see what we surface."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View all comparisons →", href: "/compare" }}
      />
    </>
  )
}
