import Link from "next/link"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
  IntegrationVideoFrame,
} from "@/components/marketing/editorial"
import { RelatedLinks } from "@/components/marketing/related-links"
import { absoluteUrl, CURRENT_YEAR, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export async function generateMetadata() {
  return pageMetadata({
    title: `Efficyon vs Zylo: ${CURRENT_YEAR} Comparison`,
    description:
      "Zylo is the established enterprise SaaS management platform. Efficyon is the AI-driven cost layer for SMB and mid-market. Different scopes, very different price points.",
    path: "/compare/efficyon-vs-zylo",
  })
}

const SIDE_BY_SIDE = [
  { feature: "Primary surface", efficyon: "AI-driven spend-vs-usage cost intelligence", zylo: "Enterprise SaaS discovery, governance, benchmarking" },
  { feature: "Pricing", efficyon: "$39–$119/mo · custom for enterprise", zylo: "Enterprise contracts, typically from $50K/year" },
  { feature: "Target customer", efficyon: "SMB & mid-market (1–500)", zylo: "Large enterprises (5,000+)" },
  { feature: "Discovery breadth", efficyon: "Connector-based across major SaaS", zylo: "Extensive — large dataset for shadow-IT discovery" },
  { feature: "Recommendations", efficyon: "Prioritized actions with dollar amounts", zylo: "Analytics dashboards & benchmarking" },
  { feature: "Accounting integration", efficyon: "Direct (Fortnox, Visma, QuickBooks, Xero)", zylo: "Available; less central to the product" },
  { feature: "Time to first value", efficyon: "Hours to days", zylo: "Weeks to months for enterprise rollout" },
] as const

export default function EfficyonVsZyloPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Efficyon vs Zylo: SaaS Management Platform Comparison",
    description:
      "Honest comparison of Efficyon and Zylo. Different scopes, different prices, different target customers.",
    url: absoluteUrl("/compare/efficyon-vs-zylo"),
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does Efficyon pricing compare to Zylo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon publishes monthly pricing from $39. Zylo uses enterprise contracts typically starting at $50K+ per year. The two are not competing on price; they are scoped for different organizations.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon handle enterprise-scale stacks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is built for SMB and mid-market — roughly 1 to 500 employees. For organizations beyond that, particularly those needing extensive shadow-IT discovery and large-dataset benchmarking, Zylo is the more natural fit.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon offer the same SaaS discovery as Zylo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon's discovery is connector-driven and focused on the major SaaS tools and accounting systems. Zylo invests heavily in broader shadow-IT discovery across enterprise-scale stacks. Different problems.",
        },
      },
      {
        "@type": "Question",
        name: "What makes Efficyon's AI different?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon's AI is oriented around producing dollar-attached recommendations from the spend-vs-usage gap. Zylo's analytics surface is broader — visibility, benchmarking, governance — with cost optimization as one component among many.",
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Compare", path: "/compare" }, { name: "Efficyon vs Zylo", path: "/compare/efficyon-vs-zylo" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Compare · vs Zylo"
        title="Zylo is the standard"
        italic="for the enterprise."
        body="Zylo earned its position. It is one of the most established SaaS management platforms in the world, with deep discovery, governance, and benchmarking built for organizations measured in thousands of employees. We are not pretending it is bad — we are scoped for a different size of company at a very different price point."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <IntegrationVideoFrame
        src="/videos/compare-zylo"
        label="Side-by-side · Zylo vs Efficyon"
        meta="1920 × 1080 · 30fps · same discovery data, different decisions"
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What Zylo does well"
          title="Enterprise governance,"
          italic="at depth."
          body="If you are 5,000 people with a stack the size of a city, the things Zylo does are genuinely hard problems and the platform solves them."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/70">
            Zylo's strengths are scope: extensive shadow-IT discovery, vendor management workflows,
            compliance and governance tooling, and a{" "}
            <Link href="/benchmarks" className="text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
              benchmarking dataset
            </Link>{" "}
            built from thousands of customers.
            For procurement and IT teams in large enterprises, that scope is worth the price tag.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/55">
            That same scope means a long implementation, an enterprise contract, and a price floor that
            does not bend for smaller teams. If you are not the customer profile they sell to, the platform
            is not designed to fit.
          </p>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Where Efficyon is different"
          title="Smaller scope,"
          italic="sharper focus."
          body="We do not pretend to compete with Zylo on enterprise governance breadth. We compete on the specific shape of the cost question — and on a price point a 50-person finance team can actually approve."
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
                  Zylo
                </span>
                {row.zylo}
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
              <li>You are SMB or mid-market — roughly 1 to 500 employees.</li>
              <li>Cost reduction is the explicit headline, not governance breadth.</li>
              <li>You want monthly pricing, not an enterprise contract.</li>
              <li>Your accounting lives in Fortnox, Visma, QuickBooks, or Xero.</li>
              <li>You want to be live and seeing recommendations in days, not quarters.</li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>Choose Zylo</EditorialMonoLabel>
            <ul className="mt-5 space-y-3 text-[15px] leading-[1.7] text-white/55">
              <li>You are 5,000+ employees with a SaaS stack measured in hundreds.</li>
              <li>Shadow-IT discovery and governance are central to your evaluation.</li>
              <li>You need benchmarking data from a large customer dataset.</li>
              <li>Vendor management and renewal negotiation workflows are required.</li>
              <li>An enterprise contract and longer implementation are acceptable.</li>
            </ul>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Frequently asked"
          title="The questions"
          italic="that come up first."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              q: "How does pricing compare?",
              a: "Efficyon publishes monthly pricing from $39. Zylo uses enterprise contracts typically starting at $50K+ per year. They are not competing on price — they are scoped for different organizations.",
            },
            {
              q: "Can Efficyon handle enterprise-scale stacks?",
              a: "Efficyon is built for SMB and mid-market — roughly 1 to 500 employees. Beyond that, particularly with extensive shadow-IT discovery needs and large-dataset benchmarking, Zylo is the more natural fit.",
            },
            {
              q: "Does Efficyon offer the same SaaS discovery?",
              a: "Discovery is connector-driven and focused on the major SaaS tools and accounting systems. Zylo invests in broader enterprise-scale shadow-IT discovery. Different problems.",
            },
            {
              q: "What makes the AI different?",
              a: "Efficyon's AI is oriented around producing dollar-attached recommendations from the spend-vs-usage gap. Zylo's analytics surface is broader — visibility, benchmarking, governance — with cost optimization as one component among many.",
            },
            {
              q: "Is migration realistic?",
              a: (
                <>
                  If you are leaving an enterprise contract you have already paid for, migration is a project. Efficyon rebuilds inventory by connecting to accounting plus your live tools, which is light by comparison — but the procurement question is the larger one. If you came from{" "}
                  <Link href="/compare/efficyon-vs-cleanshelf" className="text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
                    Cleanshelf
                  </Link>
                  , the transition path is shorter still.
                </>
              ),
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

      <RelatedLinks variant="compare" />

      <EditorialFinalCTA
        title="If you are 5,000+,"
        italic="Zylo probably wins."
        body="We are honest about scope: enterprise governance is not what Efficyon is for. If you are smaller and the question is where your SaaS budget is leaking, that is exactly what we built. Connect read-only and see what we surface."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View all comparisons →", href: "/compare" }}
      />
    </>
  )
}
