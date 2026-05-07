import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"

export function generateMetadata(): Metadata {
  return {
    title: "SaaS Spend Intelligence for CFOs - Board-Ready Reporting",
    description:
      "Strategic SaaS cost intelligence for CFOs. Board-ready dashboards, modeled forecasting, department-level allocation, and read-only access to the second-largest line item after payroll.",
    alternates: {
      canonical: "/solutions/for-cfo",
    },
    openGraph: {
      title: "Strategic SaaS Cost Intelligence for CFOs | Efficyon",
      description:
        "Board-ready dashboards, modeled forecasts, and department-level allocation for the line item nobody can explain.",
      url: "https://www.efficyon.com/solutions/for-cfo",
      type: "website",
    },
  }
}

export default function ForCFOPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Strategic SaaS Cost Intelligence for CFOs | Efficyon",
    description:
      "Board-ready SaaS dashboards, modeled forecasting, and department-level allocation for financial leaders.",
    url: "https://www.efficyon.com/solutions/for-cfo",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What kind of ROI can a CFO model with Efficyon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon surfaces the gap between what your company pays for software and what is actually used. In a typical 18-person stack we model around $18.5k of annual leak — the figure scales with stack complexity, not headcount alone. We back the engagement with a 5× fee refund guarantee: if the surfaced savings don't exceed five times what you paid us, you get refunded.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon help with board reporting on software spend?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon turns your accounting feed into a single dashboard for the line item the board never asks the right question about. Trend lines, department-level allocation, modeled forecasts, and renewal calendars — exportable as PDFs or shared via read-only links so non-finance stakeholders can self-serve.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon forecast future SaaS spend?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. We use historical spend, renewal calendars, contracted price escalations, and headcount projections to model future SaaS costs. Numbers are typical / modeled — not observed customer averages — but the inputs are your data, so the forecast moves with your business, not a benchmark we pulled from a deck.",
        },
      },
      {
        "@type": "Question",
        name: "Is access to our financial data read-only?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Efficyon connects via OAuth or read-only API keys to your accounting system and corporate card feeds. We can read transactions; we can't write to your ledger, change your invoices, or initiate payments. EU-hosted, with a clear scope you can audit before you sign.",
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
        eyebrow="Solutions · For CFOs"
        title="The line item the board"
        italic="never asks twice about."
        body="SaaS is the second-largest expense after payroll, and the one nobody can explain in a single sentence. Efficyon connects your accounting data to actual usage, models the leak, and gives you the dashboard you've been assembling in a deck the night before every board meeting."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to sales →", href: "/#contact" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="You can read every number,"
          italic="except this one."
          body="The numbers exist — scattered across an accounting system, a dozen vendor portals, a spreadsheet a controller maintains by hand, and a corporate card statement nobody categorizes. Putting them together is the job."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-2">
          {[
            {
              label: "01 · The least-explained expense",
              title: "Second-largest line, zero narrative.",
              body:
                "Payroll has a story: headcount, role mix, geography. SaaS doesn't. When the board asks why software grew 22% year-over-year, the honest answer is usually 'we'll get back to you' — and then someone spends three days reverse-engineering it.",
            },
            {
              label: "02 · No native benchmark",
              title: "Is this number bad? You don't know.",
              body:
                "Without a comparable, every optimization decision is a gut call. Efficyon's modeled benchmarks come from accounting + usage patterns we observe in our own engine — labelled as modeled, not pulled from a customer roster we don't yet have.",
            },
            {
              label: "03 · Forecasts that miss",
              title: "Auto-renewals, price drift, headcount-linked seats.",
              body:
                "Three forces move SaaS cost, and a budgeting cycle catches none of them. Variance compounds. By Q3 the line is wrong by enough to need an explanation. Efficyon models the three forces directly so the next variance is shrinkable.",
            },
            {
              label: "04 · No department-level signal",
              title: "Engineering is up 40%. Why?",
              body:
                "Headcount? Tool sprawl? A single vendor renegotiation that went the wrong way? Without per-department allocation tied to usage, every budget review is a finger-pointing exercise. With it, it's a planning meeting.",
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
          title="One engine."
          italic="Four answers a CFO actually wants."
          body="We don't replace your FP&A stack. We sit upstream of it, owning the SaaS line specifically, and feed clean numbers into whatever model you already trust."
        />

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              n: "01",
              title: "Board-ready dashboards.",
              italic: "No more deck nights.",
              body:
                "Trend lines, department breakdowns, modeled forecasts, renewal calendar — the same view your board sees, exportable as a PDF or sharable as a read-only link. Always current. No copy-paste.",
            },
            {
              n: "02",
              title: "Modeled benchmarks.",
              italic: "Labelled, not faked.",
              body:
                "Every benchmark is marked modeled or typical. We don't fabricate 'industry averages from 5,000 customers' — we don't have 5,000 customers. We have a model, we show its inputs, and the number gets sharper as more data flows through.",
            },
            {
              n: "03",
              title: "Forecasts that move with you.",
              italic: "Renewals, price drift, headcount.",
              body:
                "Scenario-plan a hire of 50, a vendor consolidation, a renegotiated enterprise contract. The forecast updates. Variance from plan stays in the rolling view, so the surprise budget conversation never happens.",
            },
            {
              n: "04",
              title: "Department-level allocation.",
              italic: "Usage attached.",
              body:
                "Every dollar of SaaS spend tied to a department, then to actual seat-level usage where we can see it. Engineering's 40% becomes legible: x% headcount, y% price, z% sprawl. Real conversation, not finger-pointing.",
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
          eyebrow="Why a CFO specifically"
          title="Read-only by design,"
          italic="and contractually backed."
          body="The reason this exists for finance and not as a generic IT tool: we treat the accounting feed as the source of truth, the usage feed as the corroboration, and your fiduciary scope as a hard constraint."
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
              The midpoint of what we model when accounting + usage data flow in for a typical
              early-stage stack. Yours will differ — that's the point of running the scan.
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
              If the surfaced savings don't exceed five times what you paid us in the first
              engagement window, we refund the difference. The contract sits in the agreement.
            </p>
          </div>
          <div className="bg-[#080809] p-10">
            <span
              className="text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.04em]"
              style={{ color: "var(--green)" }}
            >
              read-only
            </span>
            <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55">
              Access scope · EU-hosted
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              OAuth or scoped API keys. We can read your ledger; we cannot write to it. Built in
              Gothenburg, hosted in the EU, scope your security team can audit before you sign.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Make SaaS the line"
        italic="you stop apologising for."
        body="Connect one accounting system, run a scan in 10 minutes, see the modeled leak and the renewal calendar in one view. No credit card. Read-only. Cancel anytime."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Schedule a call →", href: "/#contact" }}
      />
    </>
  )
}
