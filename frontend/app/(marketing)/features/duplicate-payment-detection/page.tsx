import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { RelatedLinks } from "@/components/marketing/related-links"
import { absoluteUrl } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Stop Paying Twice for the Same Software",
  description:
    "Duplicate payment detection: pattern-match across accounting, expense, and usage data to find overlapping tools and redundant subscriptions.",
  path: "/features/duplicate-payment-detection",
})

export default function DuplicatePaymentDetectionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Duplicate Payment Detection",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features/duplicate-payment-detection"),
      description:
        "AI-powered duplicate payment detection software that identifies overlapping SaaS tools, redundant subscriptions, and duplicate invoices across your organization.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Duplicate invoice detection, Overlapping tool analysis, Consolidation recommendations, Cross-department scanning",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Efficyon detect duplicate payments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon analyzes records from your accounting system, corporate cards, and expense reports — looking for duplicate invoices, near-duplicate vendor charges, and subscriptions to functionally overlapping tools. Pattern-matching catches cases manual review misses.",
          },
        },
        {
          "@type": "Question",
          name: "What's the difference between duplicate payments and overlapping tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Duplicate payments are exact or near-exact charges for the same service. Overlapping tools are different products serving the same purpose — for example, paying for both Asana and Monday.com. Efficyon detects both.",
          },
        },
        {
          "@type": "Question",
          name: "How quickly does Efficyon find duplicates?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "First duplicate-payment findings typically surface within 48 hours of connecting financial data. Functional-overlap analysis maps tool relationships and completes within roughly two weeks.",
          },
        },
        {
          "@type": "Question",
          name: "Can it catch duplicates across departments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — and this is where the largest savings usually live. The same tool, bought by two different teams on two different cards, is invisible to either team alone but obvious from a unified view.",
          },
        },
      ],
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "Duplicate Payment Detection", path: "/features/duplicate-payment-detection" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · Pattern matching"
        title="The kind of waste"
        italic="one departure creates."
        body="Duplicate invoices. Two tools doing the same job, bought by two different teams. Subscriptions still charging because the original owner left and nobody noticed. Efficyon's pattern engine finds them all."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="Redundancy hides"
          italic="in plain sight."
          body="Most mid-size companies carry two to three duplicate or functionally overlapping subscriptions at any given time. The waste compounds silently because no single person has the cross-departmental view needed to spot it."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>The four shapes of redundancy</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Multiple teams independently buying the same SaaS product, doubling or tripling cost for a single tool.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Functional overlap — paying premium prices for features already covered by a tool you own.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Duplicate invoices from the same vendor at different amounts or on different cycles, slipping through manual approval.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>"Orphan" subscriptions — tied to people who left, paid through a card nobody audits.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>Why manual review misses it</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              Spotting redundancy requires comparing accounting data against a functional taxonomy of tools and a usage signal — three datasets that almost never sit in the same place. Efficyon does the comparison continuously so the pattern emerges automatically.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Three feeds,"
          italic="one cross-reference."
          body="Accounting + expense + tool inventory. The duplicate becomes obvious as soon as they sit beside each other."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Scan financial data"
            body="Pulls accounting transactions, corporate-card lines, and expense reports into one canonical vendor map — regardless of which team initiated the charge."
          />
          <Step
            num="02"
            title="Detect overlaps"
            body="Cross-references your tool inventory against a functional taxonomy. Flags exact duplicates, near-duplicate invoices, and tools that solve the same job differently."
          />
          <Step
            num="03"
            title="Recommend the action"
            body="For invoice duplicates, the exact charges to dispute. For overlap, a consolidation plan with usage-backed evidence — which tool to keep, which to retire."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample duplicates"
          italic="in a typical scan."
          body="Illustrative — based on patterns we see modeled across 18-to-50 person orgs. The categories repeat; the dollar values vary."
        />
        <SampleDuplicates
          rows={[
            {
              type: "Tool overlap",
              detail: "Asana Premium (Eng) + Monday.com Standard (Marketing) — same job",
              modeled: "$3,600/yr",
            },
            {
              type: "Tool overlap",
              detail: "Loom Business + Vidyard Pro — both team-video; consolidate to one",
              modeled: "$1,920/yr",
            },
            {
              type: "Duplicate invoice",
              detail: "Vendor X charged twice in March on different cards",
              modeled: "$1,440 one-time",
            },
            {
              type: "Orphan subscription",
              detail: "Notion Pro seat tied to ex-employee email · 14 months active",
              modeled: "$280/yr",
            },
            {
              type: "Cross-department dup.",
              detail: "Two HubSpot accounts (Marketing + Sales) — single workspace would consolidate",
              modeled: "$5,800/yr",
            },
          ]}
        />
      </EditorialSection>

      <RelatedLinks variant="features" />

      <EditorialFinalCTA
        title="Find what you're paying"
        italic="twice for."
        body="Connect your accounting and expense data. Most teams see their first duplicate flagged within 48 hours."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing →", href: "/#pricing" }}
      />
    </>
  )
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="border-t border-white/[0.08] pt-8">
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums tracking-[0.18em] text-white/35">
        {num}
      </span>
      <h3 className="mt-4 text-[24px] font-medium tracking-[-0.02em]">{title}</h3>
      <p className="mt-4 text-[15px] leading-[1.7] text-white/55">{body}</p>
    </div>
  )
}

function SampleDuplicates({
  rows,
}: {
  rows: { type: string; detail: string; modeled: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[200px_1fr_160px] gap-8 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Type</EditorialMonoLabel>
        <EditorialMonoLabel>Sample finding</EditorialMonoLabel>
        <EditorialMonoLabel>Modeled value</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-3 border-b border-white/[0.08] py-6 md:grid-cols-[200px_1fr_160px] md:gap-8 md:py-7"
        >
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
            {r.type}
          </span>
          <span className="text-[15.5px] leading-[1.65] text-white/80">{r.detail}</span>
          <span
            className="font-[family-name:var(--font-instrument-serif)] text-[20px] italic"
            style={{ color: "var(--green)" }}
          >
            {r.modeled}
          </span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · patterns vary by stack
      </p>
    </div>
  )
}
