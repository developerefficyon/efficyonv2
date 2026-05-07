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
import { pageMetadata } from "@/lib/seo/metadata"

export function generateMetadata() {
  return pageMetadata({
    title: "Stripe Integration - Subscription Billing Analysis",
    description:
      "Connect Stripe to Efficyon to track recurring SaaS payments, surface billing anomalies, and analyze subscription cost trends with AI-powered analytics.",
    path: "/integrations/stripe",
  })
}

const CAPABILITIES = [
  {
    title: "Track every Stripe-billed subscription",
    body: "Active subscriptions, plan tiers, billing cycles, per-seat amounts — consolidated into one view that updates automatically as Stripe data changes.",
  },
  {
    title: "Recurring payment trend analysis",
    body: "See how monthly recurring spend evolves over time. Surface price increases, tier upgrades, and seat-count creep before they hit the next invoice.",
  },
  {
    title: "Billing anomaly detection",
    body: "Catch failed payments, expired cards, retried charges, and unexpected line items that wouldn't show up in a normal accounting export.",
  },
  {
    title: "Cost-to-revenue lens",
    body: "If you also bill through Stripe, compare incoming subscription revenue against outgoing SaaS spend in the same dashboard. Watch your cost-of-software ratio.",
  },
  {
    title: "Renewal and churn-risk indicators",
    body: "Subscriptions with declining usage, frequent downgrades, or irregular billing get flagged ahead of renewal — time to renegotiate or cancel.",
  },
  {
    title: "Up to 24 months of history on first sync",
    body: "Initial connection backfills past subscriptions and invoices so trend analysis works on day one, not after a quarter of waiting.",
  },
]

const FINDINGS = [
  {
    title: "Vendor X — silent annual price bump",
    body: "MRR rose 18% YoY without a tier change or seat increase. Renewal in 47 days — flag for renegotiation.",
  },
  {
    title: "Two Notion subscriptions on the same Stripe customer",
    body: "Trial converted, then a separate workspace started a paid plan against the same card. Modeled overlap: $1,920/yr.",
  },
  {
    title: "Stripe-billed Loom seats — 11 inactive",
    body: "Seats added during a 2024 push, last login ≥ 120 days for 11 of 27. Drop or downgrade for those users.",
  },
  {
    title: "Failed payment retry loops on a forgotten tool",
    body: "Card expired in 2025; Stripe has retried 7 times. Either reactivate intentionally or cancel — the silent retries are a tell.",
  },
  {
    title: "Cost-to-revenue drift",
    body: "Outgoing SaaS spend is growing 1.4× faster than your own MRR over the last 6 months. Worth a margin conversation.",
  },
]

const FAQS = [
  {
    q: "What can Efficyon analyze from my Stripe account?",
    a: "Subscriptions, invoices, payment events, refunds, and billing-cycle metadata. We use that to detect cost creep, billing anomalies, and underused seats — and (if you also use Stripe to bill your own customers) to track outgoing SaaS spend against incoming subscription revenue.",
  },
  {
    q: "Does Efficyon process payments through Stripe?",
    a: "We use Stripe to bill our own customers, but that's separate. The Stripe integration on this page is read-only — it analyzes your outgoing subscriptions and the SaaS vendors that bill you through Stripe. No payments are initiated by Efficyon on your behalf.",
  },
  {
    q: "How is this different from connecting an accounting platform?",
    a: "Accounting platforms (Fortnox, QuickBooks, Xero) tell you what hit your books. Stripe tells you the exact subscription state — billing cycles, failed retries, prorations, plan changes. Connect both for the full picture: what you paid plus why and what changed.",
  },
  {
    q: "Can it detect price changes on my SaaS subscriptions?",
    a: "Yes. We watch for plan changes, unit-price changes, and silent annual escalators on subscriptions you pay through Stripe. You'll see the change in the dashboard with the date and amount delta.",
  },
  {
    q: "What scopes does the Stripe connection use?",
    a: "Read-only access to subscriptions, invoices, customers, and events. We don't request charge or transfer scopes, and we don't store card numbers — Stripe never exposes them and we never need them.",
  },
]

export default function StripeIntegrationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Efficyon Stripe Integration",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Connect Stripe to Efficyon for subscription billing analysis, recurring payment tracking, and AI-powered SaaS cost optimization.",
    url: absoluteUrl("/integrations/stripe"),
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Integrations", path: "/integrations" }, { name: "Stripe", path: "/integrations/stripe" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Integration · Stripe"
        title="Efficyon × Stripe,"
        italic="every recurring charge, watched."
        body="A lot of SaaS bills you through Stripe. Connect your Stripe account to Efficyon and every subscription, invoice, and billing event becomes the input for cost-leak analysis — anomalies, price drift, dead retries, all surfaced before the next renewal."
        primaryCta={{ label: "Connect Stripe", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <IntegrationVideoFrame
        src="/videos/integration-stripe"
        label="Live scan · Stripe · sample stack"
        meta="1920 × 1080 · 30fps · 4 vendors · SaaS-on-Stripe sample"
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it does"
          title="Six things,"
          italic="all out of your billing event stream."
          body="Stripe already knows the truth of your recurring SaaS charges. Efficyon turns that into a finance-grade view of what's working and what's leaking."
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
          italic="hiding in a Stripe-billed stack."
          body="Sketches of the patterns a typical billing-platform-heavy stack tends to surface. Modeled, not customer data."
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
              Stripe OAuth with read-only restricted-key permissions. We request access to subscriptions, invoices, customers, and events — nothing else. No charge, refund, transfer, or payout endpoints in our allowlist.
            </p>
          </div>
          <div>
            <EditorialEyebrow>Guarantee</EditorialEyebrow>
            <p className="text-[16px] leading-[1.7] text-white/65">
              GET-only requests, contractually. Encrypted at rest (AES-256) and in transit (TLS 1.3). No card numbers stored or exposed. Disconnect from Efficyon or revoke from inside Stripe — both stop sync immediately.
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
        eyebrow="Connect Stripe"
        title="Five minutes from"
        italic="OAuth to first finding."
        body="Read-only Stripe OAuth, no card to start. Run your first scan and watch every recurring charge fall into one view. Disconnect from either side at any time."
        primaryCta={{ label: "Connect Stripe", href: "/register" }}
        secondaryCta={{ label: "See all integrations →", href: "/integrations" }}
      />
    </>
  )
}
