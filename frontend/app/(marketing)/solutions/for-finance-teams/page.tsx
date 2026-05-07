import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"

export function generateMetadata(): Metadata {
  return {
    title: "SaaS Spend Visibility for Finance Teams - Retire the Spreadsheet",
    description:
      "Centralized SaaS spend tracking for finance teams. Auto-categorize subscriptions, allocate to departments, generate audit-ready reports. Replace the manual reconciliation spreadsheet without losing its clarity.",
    alternates: {
      canonical: "/solutions/for-finance-teams",
    },
    openGraph: {
      title: "SaaS Spend Visibility for Finance Teams | Efficyon",
      description:
        "Auto-categorize SaaS spend, allocate by department, and generate audit-ready reports without the manual reconciliation spreadsheet.",
      url: absoluteUrl("/solutions/for-finance-teams"),
      type: "website",
    },
  }
}

export default function ForFinanceTeamsPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SaaS Spend Visibility for Finance Teams | Efficyon",
    description:
      "Centralized SaaS spend tracking, auto-categorization, department allocation, and audit-ready reports for finance teams.",
    url: absoluteUrl("/solutions/for-finance-teams"),
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
        name: "How does Efficyon integrate with our existing accounting systems?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon connects directly to accounting platforms via OAuth or scoped read-only API keys. Today we support Fortnox and QuickBooks, with more on the roadmap. Data syncs automatically — no CSV exports, no manual imports, no monthly reconciliation against a spreadsheet that grew its own opinions.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon replace the manual SaaS spend tracking spreadsheet?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "That's the point. Efficyon auto-discovers and categorizes every SaaS subscription that touches your accounting feed, ties each one to a renewal date and a department, and keeps the inventory current without anyone maintaining it by hand. The spreadsheet's clarity, without the spreadsheet's labour.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon support department-level cost allocation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Subscriptions are allocated to departments and cost centers based on the data we can see — usage where the integration exposes it, payer / cost-center fields where it doesn't. You get department-level reports, budget thresholds, and trend lines that make internal chargebacks a routine task instead of a quarterly project.",
        },
      },
      {
        "@type": "Question",
        name: "How does Efficyon help with audit preparation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon maintains a timestamped record of every subscription, payment, and renewal change running through the connected accounting feeds. During audit periods, you can export a complete software expenditure report with vendor details and renewal history. Read-only access means we can pull the data; we cannot alter your ledger.",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Solutions", path: "/solutions" }, { name: "For Finance Teams", path: "/solutions/for-finance-teams" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Solutions · For finance teams"
        title="The spreadsheet,"
        italic="retired."
        body="Every finance team running SaaS spend through a manually maintained sheet eventually hits the same wall: the data is fine, the labour to keep it fine is the problem. Efficyon takes the categorization, the renewal calendar, and the department allocation off your desk."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="The data isn't missing."
          italic="The maintenance is."
          body="Every line is in the accounting system somewhere. The work is reading them, categorizing them, attaching renewal dates, and reconciling against a budget — every month, by hand."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-2">
          {[
            {
              label: "01 · Categorization labour",
              title: "Vendor names that don't match anything.",
              body:
                "Stripe charges that resolve to four different products under one merchant. Annual prepayments that should amortize. SaaS purchases that look like consultancy fees. The spreadsheet runs on the controller's pattern recognition, and the controller is one trip away from chaos.",
            },
            {
              label: "02 · Surprise renewals",
              title: "The auto-renew that shows up in close.",
              body:
                "A vendor's annual cycle bumped 9% mid-year. Nobody flagged it. The first time finance sees the increase is during the month-end close, after it's already booked. The renewal calendar is the spreadsheet's weakest column because it's the one nobody can keep current.",
            },
            {
              label: "03 · Department allocation",
              title: "Every line says general & admin.",
              body:
                "Without a connection to who actually uses what, the cleanest categorization in the world still maps everything to G&A or 'Software'. Department-level conversations start from a fictional baseline. Efficyon ties each subscription to the department where the usage actually lives.",
            },
            {
              label: "04 · Audit readiness",
              title: "The week of preparation tax.",
              body:
                "When auditors ask for the SaaS list with vendor details, payment history, and renewal terms, finance loses a week. With the data already structured and timestamped, the same request becomes an export. The week becomes a Friday afternoon.",
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
          title="Auto-categorize."
          italic="Auto-allocate. Auto-current."
          body="The clarity of the spreadsheet, with the maintenance assigned to the engine instead of a person."
        />

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              n: "01",
              title: "Connect once.",
              italic: "Sync runs forever.",
              body:
                "Read-only OAuth into Fortnox or QuickBooks (more on the roadmap). Every transaction is parsed, vendors are deduplicated, recurring patterns are detected. The inventory builds itself and stays current without manual imports.",
            },
            {
              n: "02",
              title: "Categorization that holds.",
              italic: "Pattern matching, not guessing.",
              body:
                "We resolve merchant names, separate one-off purchases from subscriptions, attach annual contracts to their amortization schedule, and flag the things we're uncertain about so you can confirm once instead of re-classifying every month.",
            },
            {
              n: "03",
              title: "Renewal calendar that's actually maintained.",
              italic: "Alerts, not surprises.",
              body:
                "Every subscription gets a renewal date inferred from the billing cadence and confirmed where the integration exposes it. Configurable lead-time alerts route to the owner — the auto-renew price bump becomes a conversation before the charge, not after.",
            },
            {
              n: "04",
              title: "Department allocation tied to usage.",
              italic: "G&A becomes a real breakdown.",
              body:
                "Where we have usage data (Microsoft 365, Google Workspace, HubSpot), seats are mapped to departments. Where we don't, you can set allocation rules once. The general-and-admin line stops absorbing every SaaS dollar.",
            },
            {
              n: "05",
              title: "Audit-ready, by default.",
              italic: "Export the report, not the prep.",
              body:
                "Vendor details, payment history, renewal terms, change log — all timestamped, all exportable. The week of audit prep becomes a Friday-afternoon export. Your finance team stops fearing quarter-end.",
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
          eyebrow="Why finance specifically"
          title="The accounting feed is"
          italic="the only complete source."
          body="IT inventories miss what finance pays. Procurement systems miss the credit-card side door. The accounting ledger is the one feed every SaaS purchase eventually touches — which is why we anchor on it."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-3">
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
              Connect &amp; first scan
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              Read-only OAuth, no agent install, no IT ticket. Connect Fortnox or QuickBooks and
              the first analysis runs.
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
              Surfaced savings clear five times your fee or we refund. The contract carries the
              risk, not your judgement on a tool you've never used.
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
              Access scope
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              We read the ledger. We don't write to it, can't modify invoices, can't initiate
              payments. EU-hosted, built in Gothenburg, Sweden.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Run the scan."
        italic="Retire the sheet."
        body="Connect one accounting system, see what we surface in 10 minutes. The spreadsheet keeps working until you trust the replacement — but most finance leads stop opening it inside the first month."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to us →", href: "/#contact" }}
      />
    </>
  )
}
