import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
  IntegrationVideoFrame,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"

export function generateMetadata(): Metadata {
  return {
    title: "Fortnox Integration - Automated SaaS Cost Analysis",
    description:
      "Connect Fortnox to Efficyon for automated invoice import, SaaS expense categorization, and AI-powered cost optimization. Built for Swedish SMBs and finance teams.",
    alternates: {
      canonical: "/integrations/fortnox",
    },
    openGraph: {
      title: "Fortnox + Efficyon: Automated SaaS Cost Analysis",
      description:
        "Connect Fortnox to Efficyon for automated invoice import, SaaS expense categorization, and AI-powered cost optimization. Built for Swedish SMBs and finance teams.",
      url: absoluteUrl("/integrations/fortnox"),
    },
    keywords: [
      "fortnox cost analysis",
      "fortnox integration saas management",
      "fortnox invoice import",
      "fortnox saas expenses",
      "swedish accounting saas optimization",
    ],
  }
}

const CAPABILITIES = [
  {
    title: "Auto-import supplier invoices",
    body: "Supplier invoices from Fortnox sync on a recurring schedule — new entries appear in Efficyon within minutes of being registered upstream.",
  },
  {
    title: "Categorize SaaS expenses",
    body: "AI sorts which Fortnox transactions are software subscriptions and groups them by vendor, department, and type — even when descriptions are vague.",
  },
  {
    title: "Multi-currency normalization",
    body: "SEK, EUR, USD, GBP — every charge gets normalized to your reporting currency while preserving the original transaction record.",
  },
  {
    title: "VAT-aware analysis",
    body: "Swedish VAT codes are preserved through the pipeline. Reverse-charge EU invoices, OSS, and standard moms behave correctly out of the box.",
  },
  {
    title: "Surface duplicates and overlap",
    body: "Catch double-billed invoices, two tools doing one job, and the seat that's been auto-renewing since the original owner left.",
  },
  {
    title: "Track cost trends month-over-month",
    body: "Watch how SaaS spend evolves alongside the rest of your books. Flag price drift, tier upgrades, and seasonal noise before they snowball.",
  },
]

const FINDINGS = [
  {
    title: "Microsoft 365 Business Standard — 7 inactive seats",
    body: "Booked under Programvara. 12 of 19 licenses active in the last 90 days. Modeled annual leak: 14,028 SEK.",
  },
  {
    title: "Adobe Creative Cloud and Canva Pro overlap",
    body: "Two design suites running in parallel for a 4-person marketing team. One license set covers actual usage.",
  },
  {
    title: "Slack Business+ → Pro downshift",
    body: "Premium-tier features (SSO, compliance exports) used twice in 6 months. Pro tier saves ~38,400 SEK per year.",
  },
  {
    title: "Duplicate Mailchimp invoices",
    body: "Same plan billed to two vendor records in Fortnox after a card change in 2024. 8,200 SEK overpaid before catch.",
  },
  {
    title: "GitHub Enterprise seats — 4 dormant",
    body: "Last commit ≥ 180 days for 4 of 22 paid seats. Drop them or downgrade to Team for those users.",
  },
]

const FAQS = [
  {
    q: "How does the Fortnox integration work?",
    a: "Efficyon connects to your Fortnox account through Fortnox's standard OAuth flow. We pull invoices, supplier records, and expense categories on a schedule, run categorization and rule-based checks, and surface findings inside the dashboard. No CSV exports, no manual mapping. Setup runs in roughly five minutes.",
  },
  {
    q: "What Fortnox data does Efficyon access?",
    a: "Read-only access to supplier invoices, vendor records, and expense categories — and only the scopes Fortnox grants for analysis. We never touch customer ledgers, salary data, or anything outside what's needed to identify and analyze SaaS spend. Data is encrypted at rest and in transit, EU-hosted, and handled under GDPR.",
  },
  {
    q: "Which Fortnox plans are supported?",
    a: "Any Fortnox plan with API access — Bokföring, Fakturering, and Komplett included. You'll need an active Fortnox subscription with API access enabled. The Efficyon integration itself starts at $39/mo (Startup plan) or $119/mo (Growth) — see pricing on the homepage.",
  },
  {
    q: "Can I disconnect at any time?",
    a: "Yes. Disconnect from the Efficyon dashboard or revoke the connection from inside Fortnox — both work, both stop sync immediately. You can also request deletion of imported Fortnox data from our systems.",
  },
  {
    q: "Is this audit-friendly for Swedish accounting standards?",
    a: "Yes. We preserve original invoice references, VAT codes, and account assignments — nothing is rewritten in your books. Findings are advisory only; any action you take (cancellation, downgrade, vendor renegotiation) happens outside Efficyon, on your terms.",
  },
]

export default function FortnoxIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon Fortnox Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect Fortnox accounting to Efficyon for automated SaaS cost analysis, invoice import, and AI-powered expense optimization.",
    url: absoluteUrl("/integrations/fortnox"),
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
      url: SITE_URL,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Integrations", path: "/integrations" }, { name: "Fortnox", path: "/integrations/fortnox" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Integration · Fortnox"
        title="Efficyon × Fortnox,"
        italic="the books talking to your SaaS."
        body="Fortnox runs the accounting for the bulk of Swedish SMBs. Connect it to Efficyon and the invoices, suppliers, and account codes already in your books become the input for cost-leak analysis — multi-currency, VAT-aware, read-only."
        primaryCta={{ label: "Connect Fortnox", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <IntegrationVideoFrame
        src="/videos/integration-fortnox"
        label="Live scan · Fortnox · sample stack"
        meta="1920 × 1080 · 30fps · 4 vendors · sample 18-person Swedish stack"
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it does"
          title="Six things,"
          italic="quietly, on a schedule."
          body="We don't replace Fortnox. We watch it for the patterns you'd catch yourself if you had time to read every invoice."
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
          italic="hiding in a Swedish SMB stack."
          body="Below is the shape of findings a typical 18-person Fortnox-using stack tends to surface. Numbers are modeled — your run will differ."
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
              OAuth via Fortnox. We request the minimum scopes needed to read supplier invoices, vendor records, and expense categories. No write, no modify, no delete — those endpoints are not in our allowlist.
            </p>
          </div>
          <div>
            <EditorialEyebrow>Guarantee</EditorialEyebrow>
            <p className="text-[16px] leading-[1.7] text-white/65">
              GET-only requests, contractually. Encrypted at rest (AES-256) and in transit (TLS 1.3). EU-hosted infrastructure, GDPR-aligned. Disconnect from either side stops sync immediately and lets you request deletion of all imported data.
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
                  className="font-[family-name:var(--font-instrument-serif)] text-[28px] italic leading-none text-white/40 transition-transform group-open:rotate-45"
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
        eyebrow="Connect Fortnox"
        title="Five minutes from"
        italic="OAuth to first finding."
        body="Read-only OAuth, EU-hosted, no card to start. Run your first scan and see what surfaces. Disconnect from either side at any time."
        primaryCta={{ label: "Connect Fortnox", href: "/register" }}
        secondaryCta={{ label: "See all integrations →", href: "/integrations" }}
      />
    </>
  )
}
