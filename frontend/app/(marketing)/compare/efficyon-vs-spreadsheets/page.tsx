import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
  IntegrationVideoFrame,
} from "@/components/marketing/editorial"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Spreadsheets vs SaaS Management Software - Why Manual Tracking Costs More",
    description:
      "A spreadsheet works for ten subscriptions and breaks at forty. The math behind manual SaaS tracking — labor, gaps, missed savings — and where automation starts to pay for itself.",
    alternates: {
      canonical: "/compare/efficyon-vs-spreadsheets",
    },
    openGraph: {
      title: "Why Spreadsheets Are Costing You More Than a SaaS Management Tool",
      description:
        "The structural cost of manual SaaS tracking — labor, data gaps, missed savings — and where automation starts to pay for itself.",
      url: "https://www.efficyon.com/compare/efficyon-vs-spreadsheets",
    },
  }
}

const SIDE_BY_SIDE = [
  { feature: "Software cost", efficyon: "$39 – $119/mo", spreadsheet: "Free" },
  { feature: "Labor cost", efficyon: "Minutes/week to review", spreadsheet: "20–40 hrs/month at typical industry rates" },
  { feature: "Data freshness", efficyon: "Continuous, automated", spreadsheet: "Whenever someone last updated it" },
  { feature: "Usage data", efficyon: "Direct from connected tools", spreadsheet: "None — payments only" },
  { feature: "Recommendations", efficyon: "AI-prioritized actions with dollar amounts", spreadsheet: "Whatever a human spots" },
  { feature: "Renewal alerts", efficyon: "Automatic", spreadsheet: "Manual calendar entries that lapse" },
  { feature: "Scales with stack size", efficyon: "Yes — labor stays flat", spreadsheet: "No — labor grows linearly" },
] as const

const TIME_BREAKDOWN = [
  { task: "Gathering invoice and billing data", hours: "8–12 hrs" },
  { task: "Updating spreadsheet entries", hours: "4–8 hrs" },
  { task: "Reconciling discrepancies", hours: "3–6 hrs" },
  { task: "Creating reports and summaries", hours: "3–5 hrs" },
  { task: "Checking for new or changed subscriptions", hours: "2–4 hrs" },
] as const

export default function EfficyonVsSpreadsheetsPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Why Spreadsheets Are Costing You More Than a SaaS Management Tool",
    description:
      "Structural analysis of the cost of tracking SaaS subscriptions in spreadsheets versus a dedicated tool.",
    url: "https://www.efficyon.com/compare/efficyon-vs-spreadsheets",
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much time does manual SaaS tracking in spreadsheets take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Industry surveys put it at roughly 20-40 hours per month for a mid-sized stack — gathering invoices, updating entries, reconciling, reporting. At typical finance or IT rates that translates to four-figure monthly labor cost.",
        },
      },
      {
        "@type": "Question",
        name: "Why are spreadsheets inaccurate for SaaS tracking?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "They are only as fresh as the last manual update. They cannot see usage. They cannot detect new subscriptions. Manual entry has a 1-5% error rate that compounds across hundreds of cells.",
        },
      },
      {
        "@type": "Question",
        name: "When should a company switch to dedicated SaaS management software?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Useful signals: more than 10-15 SaaS subscriptions, monthly SaaS spend above ~$5,000, a missed renewal or surprise charge, or someone spending more than five hours per month maintaining the sheet.",
        },
      },
      {
        "@type": "Question",
        name: "What can a dedicated tool find that spreadsheets cannot?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Usage patterns showing underutilized licenses, overlapping tools serving the same job, tier mismatches, mid-cycle pricing changes, and recommendations with dollar amounts attached.",
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
        eyebrow="Compare · vs Spreadsheets"
        title="A spreadsheet works"
        italic="until it doesn't."
        body="At ten subscriptions a sheet is fine. By forty it is a part-time job. By a hundred it is wrong more often than it is right — and it still cannot see usage. This page is the structural argument for when the math stops working."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <IntegrationVideoFrame
        src="/videos/compare-spreadsheets"
        label="Side-by-side · Spreadsheet vs Efficyon"
        meta="1920 × 1080 · 30fps · same input data, two outputs"
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What spreadsheets do well"
          title="Familiar,"
          italic="flexible, free."
          body="No sneer here. Spreadsheets are the right answer for a lot of teams. We built our first prototype in one."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/70">
            They cost nothing in software. They are infinitely customizable. Every operator already knows how
            to use them. For a small team tracking ten or twelve recurring subscriptions, a sheet is genuinely
            the most efficient tool — and any vendor telling you otherwise is selling.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/55">
            What changes is the relationship between stack size, labor, and data quality. The bigger your
            stack gets, the more time the sheet eats and the less accurate it becomes. That tradeoff has a
            crossover point. The rest of this page is about where that point usually sits.
          </p>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The structural problem"
          title="Labor scales linearly,"
          italic="value flattens."
          body="A typical mid-sized stack consumes 20–40 hours/month of finance or IT time to maintain in a sheet. At industry rates that is a four-figure monthly cost — for data that still has no usage signal."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {TIME_BREAKDOWN.map((row) => (
            <div key={row.task} className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-5">
              <dt className="text-[15px] text-white/75">{row.task}</dt>
              <dd className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
                {row.hours}
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-6">
            <dt className="font-[family-name:var(--font-instrument-serif)] text-[20px] italic text-white/85">
              total each month
            </dt>
            <dd className="font-[family-name:var(--font-geist-mono)] text-[13px] uppercase tracking-[0.18em] text-white">
              20–35+ hrs
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-[13px] text-white/40">
          Time ranges drawn from finance/IT industry surveys on SaaS administration burden in mid-sized
          stacks. Your numbers will vary.
        </p>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Where Efficyon is different"
          title="Same data,"
          italic="without the labor."
          body="Direct accounting integration plus usage signals from connected tools — the parts a sheet structurally cannot have."
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
                  Spreadsheet
                </span>
                {row.spreadsheet}
              </dd>
            </div>
          ))}
        </dl>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="When to switch"
          title="The signals"
          italic="that tell you it's time."
        />
        <ul className="grid gap-6 md:grid-cols-2">
          {[
            "More than 10–15 SaaS subscriptions live in your stack.",
            "Monthly SaaS spend has crossed roughly $5,000.",
            "You have missed at least one renewal — or paid for something nobody used.",
            "Someone is spending five-plus hours a month maintaining the sheet.",
            "You cannot answer 'what do we spend on SaaS?' in under five minutes.",
            "Different departments are buying overlapping tools without anyone noticing.",
            "You suspect — but cannot prove — there are seats no one is using.",
            "Stack size is growing faster than your sheet's update cadence.",
          ].map((signal) => (
            <li
              key={signal}
              className="border-l border-white/[0.08] pl-5 text-[15px] leading-[1.65] text-white/75"
            >
              {signal}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[14px] text-white/55">
          If two or more of those resonate, the labor cost of the sheet is almost certainly higher than the
          monthly fee of any dedicated tool — including ones priced well above ours.
        </p>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Frequently asked"
          title="The honest"
          italic="version."
        />
        <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              q: "How much time does spreadsheet tracking really take?",
              a: "Industry surveys put it at 20–40 hours per month for a mid-sized stack. At typical finance/IT rates, that translates to four-figure monthly labor cost — usually distributed across one or two people who would rather be doing something else.",
            },
            {
              q: "Why are spreadsheets inaccurate?",
              a: "They are only as fresh as the last manual update. They cannot see usage. They cannot detect new subscriptions. Manual entry has a 1–5% error rate that compounds across hundreds of cells.",
            },
            {
              q: "When should we switch?",
              a: "When you have more than 10–15 subscriptions, when monthly SaaS spend crosses ~$5,000, when you have missed a renewal, or when someone is spending more than five hours a month on the sheet.",
            },
            {
              q: "What can a dedicated tool find that we can't?",
              a: "Usage patterns showing underutilized licenses, overlapping tools doing the same job, tier mismatches, mid-cycle pricing changes, and recommendations with dollar amounts attached. Things a human can find given infinite time — but rarely does.",
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
        title="Keep the sheet."
        italic="Just stop maintaining it."
        body="Efficyon is built so you can connect read-only, walk away, and check in once a month. Your spreadsheet stays — for the bits where it is genuinely better — but the work of keeping it accurate goes away."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "View all comparisons →", href: "/compare" }}
      />
    </>
  )
}
