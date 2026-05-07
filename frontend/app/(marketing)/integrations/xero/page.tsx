import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
  IntegrationVideoFrame,
} from "@/components/marketing/editorial"
import { RelatedLinks } from "@/components/marketing/related-links"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export function generateMetadata() {
  return pageMetadata({
    title: "Xero Integration - Automated Software Spend Management",
    description:
      "Connect Xero to Efficyon for automated SaaS cost analysis with multi-currency, multi-org, and tracking-category-aware breakdowns. Built for UK, AU, and NZ teams.",
    path: "/integrations/xero",
  })
}

const CAPABILITIES = [
  {
    title: "Auto-import bills, expenses, and bank transactions",
    body: "Real-time sync from Xero. New transactions land in Efficyon on a recurring schedule — no manual exports, no clean-up before analysis runs.",
  },
  {
    title: "Multi-currency normalization",
    body: "GBP, AUD, NZD, EUR, USD — all SaaS spend gets normalized to your base reporting currency while preserving original transaction data and FX rates.",
  },
  {
    title: "Multi-org support",
    body: "Connect multiple Xero organizations to a single Efficyon workspace. Group-level visibility across regions and entities without losing per-org granularity.",
  },
  {
    title: "Tracking-category breakdowns",
    body: "We respect your existing Xero tracking categories — department, region, project, business unit. The same dimensions appear in your Efficyon dashboard.",
  },
  {
    title: "Catch duplicates and overlap",
    body: "Same vendor billed under two contact records. Two project tools doing one job. Recurring contractor seats that never get released.",
  },
  {
    title: "Track cost trends and price drift",
    body: "Watch how monthly software spend evolves across currencies and entities. Surface tier upgrades, seat creep, and silent annual escalators.",
  },
]

const FINDINGS = [
  {
    title: "Microsoft 365 Business Standard — 11 dormant seats",
    body: "Booked under Software Subscriptions across two AU subsidiaries. 24 of 35 active in the last 90 days. Modeled annual leak: AUD 2,772.",
  },
  {
    title: "ClickUp + Trello — overlapping project tools",
    body: "Both running across UK and NZ teams after a 2024 acquisition. Usage data shows one of the two could go. Modeled saving: GBP 4,200/yr.",
  },
  {
    title: "Currency drift on Slack Business+",
    body: "Same plan billed in USD across the AU entity costing 11% more than the UK entity's GBP equivalent. Worth a billing-currency review.",
  },
  {
    title: "Duplicate Adobe CC contact records",
    body: "Same Creative Cloud account split across two Xero contacts after a payment update. AUD 2,160 overpaid before catch.",
  },
  {
    title: "Project-level SaaS allocation gaps",
    body: "Three subscriptions tagged to a project that wrapped 8 months ago. Tracking categories show no activity — candidates for cancellation.",
  },
]

const FAQS = [
  {
    q: "Does the Xero integration support multi-currency?",
    a: "Yes — natively. Efficyon normalizes all SaaS spend into your base reporting currency for trend analysis while preserving the original transaction currency, amount, and FX rate. Reports can be viewed in either the original or normalized currency.",
  },
  {
    q: "Will it use my existing tracking categories?",
    a: "Yes. We map directly to your Xero tracking categories — whatever you've set up for departments, regions, projects, or business units. No need to restructure your books; the same breakdowns appear in your Efficyon dashboard automatically.",
  },
  {
    q: "Can I connect multiple Xero organizations?",
    a: "Yes. Group structures with multiple Xero orgs (separate UK, AU, and NZ entities, for example) can connect each org to one Efficyon workspace. You get group-level rollups plus per-org drill-down.",
  },
  {
    q: "Is the integration UK/AU/NZ tax-aware?",
    a: "VAT, GST, and BAS-relevant codes from Xero are preserved through the pipeline — we don't rewrite them. Findings are advisory; Efficyon never modifies your Xero records, so your tax positions are untouched.",
  },
  {
    q: "What does it cost?",
    a: "The Efficyon plan starts at $39/mo (Startup) or $119/mo (Growth) — see the homepage for details. The Xero integration is included on every plan; we don't gate connectors by tier.",
  },
]

export default function XeroIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon Xero Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect Xero accounting to Efficyon for automated SaaS cost analysis with multi-currency support, multi-org rollups, and tracking-category-aware breakdowns.",
    url: absoluteUrl("/integrations/xero"),
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Integrations", path: "/integrations" }, { name: "Xero", path: "/integrations/xero" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Integration · Xero"
        title="Efficyon × Xero,"
        italic="every entity, every currency."
        body="Xero runs the books for SMBs across the UK, Australia, and New Zealand — often across multiple currencies and entities at once. Connect it to Efficyon and your bills, contacts, and tracking categories become the input for cost-leak analysis without restructuring a thing."
        primaryCta={{ label: "Connect Xero", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <IntegrationVideoFrame
        src="/videos/integration-xero"
        label="Live scan · Xero · sample stack"
        meta="1920 × 1080 · 30fps · 4 vendors · 30-person UK/AU sample"
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it does"
          title="Six things,"
          italic="across currencies and orgs."
          body="No new system to roll out. Connect once and the analysis runs on the books and dimensions you already keep."
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
          italic="hiding in a UK/AU/NZ stack."
          body="Sketches of what a multi-org Xero scan tends to surface for a typical 40-person group operating in two or three currencies. Modeled, not customer data."
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
              Xero OAuth 2.0 with read-only scopes for accounting transactions, contacts, and tracking categories. No write or modify scopes are requested. Multi-tenant connections are supported for groups with several Xero orgs.
            </p>
          </div>
          <div>
            <EditorialEyebrow>Guarantee</EditorialEyebrow>
            <p className="text-[16px] leading-[1.7] text-white/65">
              GET-only requests, contractually. Encrypted at rest (AES-256) and in transit (TLS 1.3). EU-hosted infrastructure, GDPR-aligned. Disconnect from Efficyon or revoke from inside Xero — both stop sync immediately.
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

      <RelatedLinks variant="integrations" />

      <EditorialFinalCTA
        eyebrow="Connect Xero"
        title="Five minutes from"
        italic="OAuth to first finding."
        body="Read-only Xero OAuth, multi-org and multi-currency from day one, no card to start. Run your first scan on the books you already keep. Disconnect from either side at any time."
        primaryCta={{ label: "Connect Xero", href: "/register" }}
        secondaryCta={{ label: "See all integrations →", href: "/integrations" }}
      />
    </>
  )
}
