import Link from "next/link"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { RelatedLinks } from "@/components/marketing/related-links"
import { absoluteUrl } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Cost Optimization That Pays for Itself",
  description:
    "SaaS cost optimization software: connect accounting + identity to surface unused licenses, duplicate subscriptions, and renewal risk in one view.",
  path: "/features/saas-cost-optimization",
})

export default function SaaSCostOptimizationPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon SaaS Cost Optimization",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features/saas-cost-optimization"),
      description:
        "AI-powered SaaS cost optimization platform that analyzes usage data, detects waste, and delivers actionable savings recommendations.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Automated cost tracking, AI recommendations, Usage-based insights, License optimization, Spend analytics",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How much can SaaS cost optimization save?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Modeled savings for a typical mid-size SaaS-heavy stack land in the 20–30% range — driven by unused licenses, overlapping tools, and overprovisioned tiers. Actual savings depend on stack size and how long spend has gone unmanaged.",
          },
        },
        {
          "@type": "Question",
          name: "How does Efficyon's AI-driven cost optimization work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your accounting system and SaaS tools, then cross-references spend against usage to identify unused licenses, duplicate subscriptions, and overprovisioned tiers. Each finding is ranked by potential savings.",
          },
        },
        {
          "@type": "Question",
          name: "How long does it take to set up?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Initial setup takes about 10 minutes. Connect one system and your first analysis runs immediately. Most teams receive their first actionable recommendations within two weeks as the engine builds a complete picture.",
          },
        },
        {
          "@type": "Question",
          name: "Does it require changes to our current tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Efficyon uses read-only integrations and never writes to your systems. Recommendations are surfaced in your dashboard for your team to act on at their own pace.",
          },
        },
      ],
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "SaaS Cost Optimization", path: "/features/saas-cost-optimization" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · Cost optimization"
        title="The headline act —"
        italic="stop the leak."
        body="Efficyon connects accounting data to the systems your team actually uses, models the gap between paid-for and used, and tells you what to cancel, downgrade, or renegotiate. One engine, monthly cadence, read-only access."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="Spend grows faster"
          italic="than the team using it."
          body="The mid-size SaaS-heavy company adds tools faster than it retires them. Without a continuous cross-tool view, waste compounds: unused seats, mismatched tiers, shadow purchases, drift on renewal."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>What goes wrong</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>SaaS spend grows ~15–20% YoY while headcount grows at half that rate. The gap between paid-for and used widens every quarter.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>No centralized view of which tools are actually being used, by whom, and how often. Finance is flying blind — this is where{" "}
                  <Link href="/features/subscription-tracking" className="text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
                    subscription tracking
                  </Link>
                  {" "}starts.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Spreadsheets are stale the moment they're compiled and consume dozens of hours per month to maintain.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Decentralized buying creates{" "}
                  <Link href="/features/duplicate-payment-detection" className="text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
                    duplicate subscriptions
                  </Link>
                  {" "}nobody catches until the annual audit — if then.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>The structural problem</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              The cost-leak isn't a single line item. It's the gap between what you pay vendors and what your people actually use — a gap that only shows up when accounting data and product usage data sit in the same place. Most teams have neither, which is why a 20–30% structural waste figure appears in stack after stack.
            </p>
            <p className="mt-5 text-[16px] leading-[1.75] text-white/55">
              Efficyon is the layer that closes that gap, continuously.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Connect once."
          italic="Watch the gap monthly."
          body="Three steps from setup to recommendations. Most teams see actionable findings in two weeks."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Connect your stack"
            italic="read-only."
            body="Link your accounting system (Fortnox, QuickBooks), identity (Microsoft 365, Google Workspace), and tools (HubSpot, Shopify, OpenAI, Anthropic). Setup is roughly 10 minutes. We never write back."
          />
          <Step
            num="02"
            title="The engine cross-references"
            italic="spend × usage."
            body="Rule-based and AI checks compare invoiced amounts against active seats, feature touch-points, and 90-day activity windows. Anomalies, duplicates, and mismatched tiers are flagged with explanations."
          />
          <Step
            num="03"
            title="Recommendations land"
            italic="in your inbox."
            body="Each finding ships with a modeled dollar value, a confidence score, and the action to take. You implement at your own pace; we track outcomes and refine the next month."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample findings"
          italic="from a typical scan."
          body="Illustrative — based on the patterns we model in a typical 18-person SaaS-heavy stack. Your numbers will differ; the categories rarely do."
        />
        <SampleFindings
          rows={[
            {
              category: "Unused licenses",
              finding: "12 of 48 HubSpot Marketing Pro seats — no logins in 90 days",
              modeledValue: "$5,400/yr",
            },
            {
              category: "Tier mismatch",
              finding: "Zoom Premium across the team — feature usage suggests Standard fits 70%",
              modeledValue: "$2,800/yr",
            },
            {
              category: "Tool overlap",
              finding: "Asana + Monday.com both active — single project tool would consolidate",
              modeledValue: "$3,600/yr",
            },
            {
              category: "Price drift",
              finding: "Vendor X raised seat price 18% YoY without contract notification",
              modeledValue: "$1,900/yr",
            },
            {
              category: "Departed employees",
              finding: "5 ex-employees still hold paid SaaS seats across 3 tools",
              modeledValue: "$2,200/yr",
            },
          ]}
        />
      </EditorialSection>

      <RelatedLinks variant="features" />

      <EditorialFinalCTA
        title="Connect one system."
        italic="See the gap in 10 minutes."
        body="No credit card. Read-only access. The first analysis is free — you keep whatever you find."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing →", href: "/#pricing" }}
      />
    </>
  )
}

/* ─────────── helpers ─────────── */
function Step({
  num,
  title,
  italic,
  body,
}: {
  num: string
  title: string
  italic?: string
  body: string
}) {
  return (
    <div className="border-t border-white/[0.08] pt-8">
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums tracking-[0.18em] text-white/35">
        {num}
      </span>
      <h3 className="mt-4 text-[24px] font-medium tracking-[-0.02em]">
        {title}
        {italic && (
          <>
            {" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
              {italic}
            </span>
          </>
        )}
      </h3>
      <p className="mt-4 text-[15px] leading-[1.7] text-white/55">{body}</p>
    </div>
  )
}

function SampleFindings({
  rows,
}: {
  rows: { category: string; finding: string; modeledValue: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[200px_1fr_140px] gap-8 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Category</EditorialMonoLabel>
        <EditorialMonoLabel>Sample / illustrative finding</EditorialMonoLabel>
        <EditorialMonoLabel>Modeled value</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-3 border-b border-white/[0.08] py-6 md:grid-cols-[200px_1fr_140px] md:gap-8 md:py-7"
        >
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
            {r.category}
          </span>
          <span className="text-[15.5px] leading-[1.65] text-white/80">{r.finding}</span>
          <span
            className="font-[family-name:var(--font-instrument-serif)] text-[20px] italic"
            style={{ color: "var(--green)" }}
          >
            {r.modeledValue}
          </span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · modeled on a typical 18-person SaaS-heavy stack
      </p>
    </div>
  )
}
