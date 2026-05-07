import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"

export function generateMetadata(): Metadata {
  return {
    title: "SaaS Cost Optimization for Startups - Preserve the Runway",
    description:
      "Cost intelligence for startups burning runway on SaaS sprawl. Find the trial that auto-converted, the duplicate stack two co-founders set up, and the seat counts that haven't kept up with the team. 5× fee refund guarantee.",
    alternates: {
      canonical: "/solutions/for-startups",
    },
    openGraph: {
      title: "SaaS Cost Optimization for Startups | Efficyon",
      description:
        "Stop burning runway on SaaS sprawl. Find the trial that auto-converted, the duplicate stack, and the seats that haven't kept up. 5× fee refund guarantee.",
      url: absoluteUrl("/solutions/for-startups"),
      type: "website",
    },
  }
}

export default function ForStartupsPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SaaS Cost Optimization for Startups | Efficyon",
    description:
      "Cost intelligence for startups: surface the SaaS waste that's quietly compounding before it eats the runway.",
    url: absoluteUrl("/solutions/for-startups"),
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: SITE_URL,
    },
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much can a startup expect to surface with Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We model around $18.5k of annual leak in a typical 18-person stack. The actual figure scales with stack complexity — the more vendors and trial subscriptions accumulating in your accounting feed, the more we tend to surface. We back the engagement with a 5× fee refund guarantee: if the surfaced savings don't exceed five times what you paid us, you get refunded.",
        },
      },
      {
        "@type": "Question",
        name: "Is Efficyon worth it for a small team with only a handful of tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Even a 10-tool stack typically has a forgotten trial, a duplicated tier, and a seat count that hasn't moved since the last hire. The 5× fee refund guarantee means the downside is capped — if there's nothing to find, you don't pay for the scan that confirmed it.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly does Efficyon show results for a small team?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Connect read-only OAuth to your accounting system. The first scan typically runs inside 10 minutes; the first useful findings — duplicate vendors, dormant subscriptions, headcount-vs-seat mismatch — surface in the first session. Continuous analysis sharpens the picture over the following weeks.",
        },
      },
      {
        "@type": "Question",
        name: "Can a small team negotiate better with vendors using Efficyon's data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We give you the inputs the vendor's account manager already has: actual seat utilization, comparison to modeled benchmarks, and a clean view of the renewal calendar. The negotiation outcome is yours, but you walk in with numbers instead of feelings.",
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Solutions · For startups"
        title="The runway is finite."
        italic="The leak isn't."
        body="The trial that auto-converted last quarter. The two co-founders who each set up a CRM. The seat count that hasn't kept up with the team. None of it shows up as a single line big enough to action — until it's eaten three months of runway. Efficyon surfaces it while it's still small."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="Sprawl is structural,"
          italic="not a moral failing."
          body="Early-stage teams move fast and try things. The waste isn't from sloppiness — it's from velocity. Twenty product decisions per quarter leave a trail of vendor experiments that nobody owns the cleanup for."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-2">
          {[
            {
              label: "01 · The auto-converted trial",
              title: "A free seat became a paid one in your sleep.",
              body:
                "Someone signed up for a tool to test something three months ago. The card got charged. The line item shows up under a vendor name that doesn't match anything anyone remembers. Multiplied across a year, the total is meaningful. Individually, none of it crosses a review threshold.",
            },
            {
              label: "02 · Duplicate stacks",
              title: "Two co-founders, two CRMs.",
              body:
                "Founder A set up HubSpot. Founder B set up Pipedrive. Neither stopped using their version. The team eventually picked one in practice — but the other kept billing for two years. Duplicate-stack patterns are where the largest single findings tend to live in early-stage companies.",
            },
            {
              label: "03 · Seat counts that don't move",
              title: "The team grew. The licenses grew faster.",
              body:
                "You bought 10 seats expecting the round to close fast. The round took longer than planned. Six months in, the headcount caught up; another six months in, the seat count was already past the team again. Without continuous monitoring, the seat ratchet only goes one way.",
            },
            {
              label: "04 · The renewal that doubled",
              title: "The vendor knows your churn risk is low.",
              body:
                "An auto-renew bumped 22% on year two. By the time finance noticed, the year was already booked. With a renewal calendar that's actually maintained, the 22% becomes a negotiation, not a memory.",
            },
          ].map((b) => (
            <div key={b.label} className="bg-[#080809] p-10">
              <EditorialMonoLabel green>{b.label}</EditorialMonoLabel>
              <h3 className="mt-4 text-[22px] font-medium leading-[1.15] tracking-[-0.02em] md:text-[26px]">
                {b.title}
              </h3>
              <p className="mt-4 text-[15px] leading-[1.7] text-white/55">{b.body}</p>
            </div>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What Efficyon does"
          title="Connect once."
          italic="Watch the gap."
          body="Read-only OAuth into your accounting system, the optional usage feeds where they exist, and a scan that runs continuously after the first 10 minutes."
        />

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              n: "01",
              title: "Find the trials.",
              italic: "Auto-converted, auto-surfaced.",
              body:
                "Recurring charges from vendors that look like one-time experiments get flagged. The trial-that-became-a-subscription is one of the cleanest patterns to detect from the financial side, and it's where small startups often find their first 'oh' moment.",
            },
            {
              n: "02",
              title: "Surface duplicate stacks.",
              italic: "The two CRMs, the two project tools.",
              body:
                "Where two vendors solve the same job, we flag the overlap and show usage on each side where we can. Consolidation conversations start from a number, not from someone's memory of which tool the team agreed on six quarters ago.",
            },
            {
              n: "03",
              title: "Right-size the seats.",
              italic: "Identity-tied, not invoice-tied.",
              body:
                "For Microsoft 365, Google Workspace, and HubSpot, we tie seats to actual users. Idle seats and active-but-departed accounts surface against your identity state. The seat count starts moving with the team, not just upward.",
            },
            {
              n: "04",
              title: "Maintain the renewal calendar.",
              italic: "Alerts before the auto-renew, not after.",
              body:
                "Every subscription gets a renewal date. Configurable lead-time alerts route to the owner. The 22% bump becomes a conversation with the vendor before it's a line on your bill.",
            },
          ].map((row) => (
            <div key={row.n} className="grid gap-6 py-12 md:grid-cols-[80px_1fr] md:gap-10">
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {row.n}
              </span>
              <div>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] md:text-[28px]">
                  {row.title}{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                    {row.italic}
                  </span>
                </h3>
                <p className="mt-3 max-w-[68ch] text-[15.5px] leading-[1.7] text-white/55">
                  {row.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Why a startup specifically"
          title="The downside is"
          italic="contractually capped."
          body="We're pre-launch. We don't have a wall of customer logos. What we have is a refund clause that takes the asymmetry out of the decision, and a scope your security review can clear in an afternoon."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-3">
          <div className="bg-[#080809] p-10">
            <span
              className="text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.04em]"
              style={{ color: "var(--green)" }}
            >
              $18.5k
            </span>
            <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55">
              Modeled annual leak · 18-person stack
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              The midpoint we model when accounting + usage data flow in for an early-stage stack.
              Yours will differ — running the scan is how you replace the model with your number.
            </p>
          </div>
          <div className="bg-[#080809] p-10">
            <span
              className="text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.04em]"
              style={{ color: "var(--green)" }}
            >
              5×
            </span>
            <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55">
              Fee refund guarantee
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              If the surfaced savings don't clear five times your fee in the first engagement
              window, the difference is refunded. The downside lives in the contract.
            </p>
          </div>
          <div className="bg-[#080809] p-10">
            <span
              className="text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.04em]"
              style={{ color: "var(--green)" }}
            >
              10
              <span className="ml-1 font-[family-name:var(--font-instrument-serif)] text-[28px] italic text-white/55">
                min
              </span>
            </span>
            <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55">
              To first scan
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              Read-only OAuth, no agent install, no IT ticket. Built in Gothenburg, Sweden, EU-hosted —
              cancel anytime.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Stop the small leaks"
        italic="while they're still small."
        body="Connect one accounting system, run a scan in 10 minutes, see the trial that auto-converted and the seat count that's three hires ahead of the team. No credit card, read-only access, cancel anytime."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to us →", href: "/#contact" }}
      />
    </>
  )
}
