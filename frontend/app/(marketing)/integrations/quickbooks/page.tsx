import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
} from "@/components/marketing/editorial"

export function generateMetadata(): Metadata {
  return {
    title: "QuickBooks Integration - Smart SaaS Spend Tracking",
    description:
      "Connect QuickBooks Online to Efficyon for automated SaaS expense categorization, real-time spend tracking, and AI-powered cost optimization. Built for US and Canadian SMBs.",
    alternates: {
      canonical: "/integrations/quickbooks",
    },
    openGraph: {
      title: "QuickBooks + Efficyon: Smart SaaS Spend Tracking",
      description:
        "Connect QuickBooks Online to Efficyon for automated SaaS expense categorization, real-time spend tracking, and AI-powered cost optimization. Built for US and Canadian SMBs.",
      url: "https://www.efficyon.com/integrations/quickbooks",
    },
    keywords: [
      "quickbooks saas cost tracking",
      "quickbooks integration cost management",
      "quickbooks expense categorization",
      "quickbooks saas optimization",
      "quickbooks software spend analysis",
    ],
  }
}

const CAPABILITIES = [
  {
    title: "Auto-import expenses, bills, and vendor payments",
    body: "Real-time sync from QuickBooks Online. New transactions land in Efficyon on a recurring schedule — no exports, no spreadsheets, no copy-paste.",
  },
  {
    title: "Categorize SaaS across messy charts of accounts",
    body: "AI finds software spend whether it's booked under Software Subscriptions, Office Expenses, Professional Services, or a one-off vendor name.",
  },
  {
    title: "Department and class-level allocation",
    body: "We respect your existing class and location tracking. Department-level SaaS cost breakdowns appear without changing your QuickBooks setup.",
  },
  {
    title: "Catch duplicates and overlap",
    body: "Same vendor billed under two slightly different names. Two project tools both running. The card change in 2024 that quietly created a parallel subscription.",
  },
  {
    title: "Track cost trends and price drift",
    body: "Watch monthly software spend evolve. Surface price increases, tier upgrades, and seat-count creep before the renewal email lands.",
  },
  {
    title: "Audit-ready exports",
    body: "Clean, categorized SaaS expense reports that align with your QuickBooks chart of accounts — useful at quarter-end and tax season.",
  },
]

const FINDINGS = [
  {
    title: "Microsoft 365 Business Premium — 9 dormant seats",
    body: "Booked under Office Expenses for a 32-person org. 23 active in the last 90 days. Modeled annual leak: $2,484.",
  },
  {
    title: "Asana Business + Notion Plus — overlapping use",
    body: "Both running across Engineering and Ops. Usage data shows one of the two could go. Modeled saving: $5,400/yr.",
  },
  {
    title: "Zoom One Business → Pro downshift candidate",
    body: "Large-meeting and recording features used twice in 6 months. Pro tier covers actual usage. Modeled saving: $1,920/yr.",
  },
  {
    title: "Duplicate Adobe CC line items",
    body: "Two vendor records in QuickBooks for the same Creative Cloud account after a payment-method change. $1,440 overpaid before catch.",
  },
  {
    title: "Salesforce Sales Cloud — 6 inactive seats",
    body: "Last login ≥ 120 days for 6 of 28 paid seats. Reclaim or convert to Platform licenses for those users.",
  },
]

const FAQS = [
  {
    q: "Which QuickBooks versions are supported?",
    a: "QuickBooks Online — Simple Start, Essentials, Plus, and Advanced. The integration uses Intuit's official OAuth and the QuickBooks Online API for real-time, read-only access. QuickBooks Desktop isn't supported today.",
  },
  {
    q: "How does Efficyon categorize SaaS when our chart of accounts is inconsistent?",
    a: "It looks at vendor names, recurring patterns, and billing signatures rather than just the GL account. So even if Stripe-billed tools are filed under three different categories across two years, Efficyon stitches them back together. You can review categorizations and the model adjusts to your corrections.",
  },
  {
    q: "Will it respect our class and location tracking?",
    a: "Yes. We map to your existing QuickBooks classes and locations to provide department- or cost-center-level SaaS breakdowns. No need to restructure your books — Efficyon adapts to what's already there.",
  },
  {
    q: "Can I run QuickBooks alongside another integration like Stripe or Microsoft 365?",
    a: "Yes — and we recommend it. Accounting data tells you what you paid; identity and usage tools tell you whether anyone's using it. The pair is where most leaks become obvious.",
  },
  {
    q: "What does it cost?",
    a: "The Efficyon plan starts at $39/mo (Startup) or $119/mo (Growth) — see the homepage for details. The QuickBooks integration is included on every plan; we don't gate connectors by tier.",
  },
]

export default function QuickBooksIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon QuickBooks Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect QuickBooks Online to Efficyon for automated SaaS expense categorization, real-time spend tracking, and AI-powered cost optimization.",
    url: "https://www.efficyon.com/integrations/quickbooks",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "39",
      highPrice: "119",
      priceCurrency: "USD",
      offerCount: "2",
    },
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Integration · QuickBooks"
        title="Efficyon × QuickBooks,"
        italic="every SaaS line, every class."
        body="QuickBooks Online runs the books for millions of US and Canadian SMBs. Connect it to Efficyon and your bills, vendor payments, and expense categories become the substrate for SaaS-cost analysis — real-time sync, read-only, no chart-of-accounts surgery required."
        primaryCta={{ label: "Connect QuickBooks", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it does"
          title="Six things,"
          italic="all from data already in QBO."
          body="No new tools to roll out, no exports to schedule. Connect once and the analysis runs on the books you already keep."
        />
        <ul className="space-y-7 border-t border-white/[0.08] pt-10">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="grid grid-cols-[12px_1fr] gap-5 md:grid-cols-[16px_1fr] md:gap-8">
              <span
                aria-hidden
                className="mt-[10px] inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <div>
                <h3 className="text-[20px] font-medium tracking-[-0.015em] md:text-[22px]">{c.title}</h3>
                <p className="mt-2 max-w-[68ch] text-[15px] leading-[1.65] text-white/55">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What we find · Sample · illustrative"
          title="The kind of leaks"
          italic="hiding in a US SMB stack."
          body="Sketches of what a QuickBooks-driven scan tends to surface for a typical 30-person org. Modeled, not customer data."
        />
        <ul className="space-y-7 border-t border-white/[0.08] pt-10">
          {FINDINGS.map((f) => (
            <li key={f.title} className="grid grid-cols-[12px_1fr] gap-5 md:grid-cols-[16px_1fr] md:gap-8">
              <span
                aria-hidden
                className="mt-[10px] inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <div>
                <h3 className="text-[20px] font-medium tracking-[-0.015em] md:text-[22px]">{f.title}</h3>
                <p className="mt-2 max-w-[68ch] text-[15px] leading-[1.65] text-white/55">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/35">
          Sample · illustrative · not from a real customer account
        </p>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Security & access"
          title="Read-only,"
          italic="and contractual."
        />
        <div className="grid gap-12 border-t border-white/[0.08] pt-10 md:grid-cols-2">
          <div>
            <EditorialEyebrow>Scopes</EditorialEyebrow>
            <p className="text-[16px] leading-[1.7] text-white/65">
              Intuit OAuth 2.0. We request the minimum read scopes needed to access bills, expenses, vendor records, accounts, and class/location tracking. No write, modify, or delete endpoints are in our allowlist.
            </p>
          </div>
          <div>
            <EditorialEyebrow>Guarantee</EditorialEyebrow>
            <p className="text-[16px] leading-[1.7] text-white/65">
              GET-only requests, contractually. Encrypted at rest (AES-256) and in transit (TLS 1.3). Disconnect from Efficyon or revoke from inside Intuit — both stop sync immediately. Data deletion available on request.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="FAQ"
          title="Honest answers,"
          italic="not marketing copy."
        />
        <div className="border-t border-white/[0.08]">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group border-b border-white/[0.08] py-7 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-baseline justify-between gap-8 list-none">
                <span className="text-[18px] font-medium tracking-[-0.015em] md:text-[20px]">{f.q}</span>
                <span
                  aria-hidden
                  className="font-[family-name:var(--font-instrument-serif)] text-[28px] italic leading-none transition-transform group-open:rotate-45"
                  style={{ color: "var(--green)" }}
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-[72ch] text-[15.5px] leading-[1.7] text-white/60">{f.a}</p>
            </details>
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        eyebrow="Connect QuickBooks"
        title="Five minutes from"
        italic="OAuth to first finding."
        body="Read-only Intuit OAuth, no card to start. Run your first scan on the books you already keep. Disconnect from either side at any time."
        primaryCta={{ label: "Connect QuickBooks", href: "/register" }}
        secondaryCta={{ label: "See all integrations →", href: "/integrations" }}
      />
    </>
  )
}
