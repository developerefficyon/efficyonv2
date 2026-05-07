import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"

export const metadata: Metadata = {
  title: "Find Every Unused License Draining Your Budget",
  description:
    "Detect unused and underutilized SaaS licenses automatically. Efficyon analyzes 90-day activity windows to identify idle seats, departed-employee licenses, and overprovisioned tiers.",
  alternates: {
    canonical: "/features/unused-license-detection",
  },
  openGraph: {
    title: "Find Every Unused License Draining Your Budget | Efficyon",
    description:
      "Detect unused and underutilized SaaS licenses automatically. Efficyon analyzes 90-day activity windows to identify idle seats, departed-employee licenses, and overprovisioned tiers.",
    url: "https://www.efficyon.com/features/unused-license-detection",
    type: "website",
  },
}

export default function UnusedLicenseDetectionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Unused License Detection",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.efficyon.com/features/unused-license-detection",
      description:
        "Unused software license detection tool that analyzes real usage data to identify idle seats, departed employee licenses, and overprovisioned subscription tiers.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Usage-based analysis, Idle license flagging, Rightsizing recommendations, Offboarding alerts, 90-day activity windows",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Efficyon detect unused software licenses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your SaaS tools via read-only APIs and analyzes login frequency, feature touch-points, and activity levels per licensed user. The default threshold is 90 days; configurable per tool.",
          },
        },
        {
          "@type": "Question",
          name: "Can it detect licenses for ex-employees?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Cross-referencing identity (Microsoft 365, Google Workspace) against active license rolls catches seats still assigned to people who have left. This category alone often dominates the first month's findings.",
          },
        },
        {
          "@type": "Question",
          name: "What's the difference between unused and underutilized?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "An unused license has zero or negligible activity over the window. An underutilized license shows light activity that doesn't justify the current tier — typically a downgrade, not a revoke.",
          },
        },
        {
          "@type": "Question",
          name: "How much can be reclaimed?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Industry research and our own modeling consistently land on 20–30% of seats being unused or significantly underutilized in the average SaaS-heavy stack. Actual savings depend on stack composition.",
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · License analysis"
        title="Where the money"
        italic="hides."
        body="Idle seats. Departed employees still on the seat list. Premium tiers used at the basic level. Efficyon runs continuous 90-day activity windows across every connected tool to find every wasted seat."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="One in four seats,"
          italic="generating zero value."
          body="Industry research consistently puts unused or underutilized license rates in the 20–30% band for the average SaaS-heavy stack. The waste compounds silently every billing cycle because nobody is watching the activity feed."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>How seats go idle</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Paying full price for licenses nobody has logged into in months — users moved on to another tool, or never needed it.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Departed employees still hold paid seats because offboarding checklists missed SaaS deprovisioning.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Overprovisioned tiers — premium plans where users only touch basic features, paying 3–5× what they need.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>No usage data ever reaches finance, so productive seats and idle seats look identical at budget review.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>The structural issue</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              Vendors don't tell you which of your seats are idle — that's against their interest. So the only fix is a feed: read-only access to seat-level activity, run continuously, with the ex-employee cross-reference applied automatically.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Connect, analyze,"
          italic="reclaim."
          body="The flow is the same for every tool — only the activity definition differs."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Connect & collect"
            body="Read-only API integrations with your SaaS tools, identity provider, and (where available) HR system. Login frequency, feature usage, session duration, and assignment metadata flow into a single profile per user."
          />
          <Step
            num="02"
            title="Score every seat"
            body="Each seat gets a utilization score over a 90-day window: active power user, occasional (downgrade candidate), idle (revoke candidate), or ex-employee (deprovision now). Thresholds are configurable per tool."
          />
          <Step
            num="03"
            title="Reclaim & rightsize"
            body="Prioritized recommendations: revoke, downgrade, or deprovision. Each comes with a modeled dollar value and a confidence score. Track outcomes; the engine refines next month's findings from what you actioned."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample seat findings"
          italic="from a typical scan."
          body="Illustrative — patterns we model in a 30-person stack. Numbers vary; categories repeat."
        />
        <SampleSeats
          rows={[
            { tool: "HubSpot Marketing Pro", finding: "12 of 48 seats — 0 logins in 90 days", action: "Revoke", modeled: "$5,400/yr" },
            { tool: "Zoom Business", finding: "Premium across team — 70% only join, never host", action: "Downgrade tier", modeled: "$2,800/yr" },
            { tool: "Microsoft 365 E5", finding: "5 ex-employees still licensed", action: "Deprovision", modeled: "$2,160/yr" },
            { tool: "Adobe Creative Cloud", finding: "8 seats inactive 120+ days", action: "Revoke", modeled: "$5,760/yr" },
            { tool: "Notion Business", finding: "11 seats — guest access would suffice", action: "Downgrade plan", modeled: "$1,320/yr" },
          ]}
        />
      </EditorialSection>

      <EditorialFinalCTA
        title="Stop paying for seats"
        italic="nobody touches."
        body="Connect one tool. The first scan returns idle-seat candidates within hours. You keep whatever you reclaim."
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

function SampleSeats({
  rows,
}: {
  rows: { tool: string; finding: string; action: string; modeled: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[1.2fr_1.8fr_140px_140px] gap-6 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Tool</EditorialMonoLabel>
        <EditorialMonoLabel>Finding</EditorialMonoLabel>
        <EditorialMonoLabel>Action</EditorialMonoLabel>
        <EditorialMonoLabel>Modeled</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2 border-b border-white/[0.08] py-6 md:grid-cols-[1.2fr_1.8fr_140px_140px] md:gap-6 md:py-7"
        >
          <span className="text-[15.5px] text-white/85">{r.tool}</span>
          <span className="text-[15px] leading-[1.6] text-white/65">{r.finding}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/55">
            {r.action}
          </span>
          <span
            className="font-[family-name:var(--font-instrument-serif)] text-[20px] italic"
            style={{ color: "var(--green)" }}
          >
            {r.modeled}
          </span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · 30-person stack baseline
      </p>
    </div>
  )
}
