import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Integrations - Connect Your Tools",
  description:
    "Integrate Efficyon with your accounting and billing platforms for automated SaaS cost analysis. Connect Fortnox, Stripe, QuickBooks, Xero, and more.",
  alternates: { canonical: "/integrations" },
  openGraph: {
    title: "Integrations - Connect Your Tools | Efficyon",
    description:
      "Integrate Efficyon with your accounting and billing platforms for automated SaaS cost analysis. Connect Fortnox, Stripe, QuickBooks, Xero, and more.",
    url: absoluteUrl("/integrations"),
  },
}

const INTEGRATIONS = [
  {
    name: "Fortnox",
    slug: "fortnox",
    status: "Live",
    body: "Auto-import Fortnox invoices, categorize SaaS expenses, and surface optimization opportunities. Built for Swedish SMBs first — multi-currency, VAT-aware.",
    meta: "Accounting · Sweden · OAuth read-only",
  },
  {
    name: "Stripe",
    slug: "stripe",
    status: "Live",
    body: "Analyze every Stripe-billed subscription, track payment trends, and catch billing anomalies before they hit your books.",
    meta: "Billing · Global · OAuth read-only",
  },
  {
    name: "Visma eEkonomi",
    slug: "visma",
    status: "Live",
    body: "Visma at Fortnox parity — invoices, suppliers, customers. Multi-currency. The other half of the Swedish SMB market.",
    meta: "Accounting · Sweden · OAuth read-only",
  },
  {
    name: "QuickBooks",
    slug: "quickbooks",
    status: "Live",
    body: "Auto-categorize and analyze your SaaS subscriptions alongside your full QuickBooks ledger. Real-time sync, no exports.",
    meta: "Accounting · US/CA · OAuth read-only",
  },
  {
    name: "Xero",
    slug: "xero",
    status: "Live",
    body: "Complete visibility into SaaS spend through Xero. Multi-currency, multi-org, with department-level analysis.",
    meta: "Accounting · UK/AU/NZ · OAuth read-only",
  },
  {
    name: "Microsoft 365",
    slug: "microsoft-365",
    status: "Live",
    body: "Per-license activity for Business Basic, Standard, Premium, E3, E5. Surfaces dormant seats and overprovisioned tiers.",
    meta: "Productivity · Identity · Graph API",
  },
  {
    name: "Google Workspace",
    slug: "google-workspace",
    status: "Live",
    body: "User activity, license assignments, and storage usage across Workspace tiers. Pinpoint who's actually using what.",
    meta: "Productivity · Identity · OAuth",
  },
  {
    name: "HubSpot",
    slug: "hubspot",
    status: "Live",
    body: "Seat usage, last-active dates, paid feature utilization. Spot Enterprise-tier features being used at Starter intensity.",
    meta: "Sales · Marketing · OAuth",
  },
  {
    name: "Shopify",
    slug: "shopify",
    status: "Live",
    body: "App-by-app spend audit on your Shopify install. Catch the 14 apps from 2023 that nobody uses but everybody pays for.",
    meta: "E-commerce · OAuth",
  },
  {
    name: "Asana",
    slug: "asana",
    status: "Live",
    body: "Per-seat activity, project counts, paid feature usage. Identify Business-tier seats living a Premium-tier life.",
    meta: "Project mgmt · OAuth",
  },
  {
    name: "Airtable",
    slug: "airtable",
    status: "Live",
    body: "Workspace utilization, base activity, and seat-level usage. Common waste pattern: Pro seats for read-only viewers.",
    meta: "Database · OAuth + PKCE",
  },
  {
    name: "OpenAI / Anthropic / Gemini",
    slug: "ai-providers",
    status: "Live",
    body: "API consumption analysis across all three frontier AI labs. Token spend per project, model choice efficiency, and burn-rate forecasting.",
    meta: "AI APIs · admin keys",
  },
]

export default function IntegrationsIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Efficyon Integrations",
    description:
      "Connect your accounting and billing platforms to Efficyon for automated SaaS cost analysis and optimization.",
    url: absoluteUrl("/integrations"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: INTEGRATIONS.map((integration, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${integration.name} Integration`,
        url: absoluteUrl(`/integrations/${integration.slug}`),
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Connectors · Read-only OAuth"
        title="The systems"
        italic="you already use."
        body="Efficyon connects to the tools running your business — accounting, identity, billing, AI APIs — and watches the gap between spend and usage. Read-only on every connection, guaranteed in writing."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Live connectors"
          title="12 integrations,"
          italic="growing every month."
          body="Each connection is OAuth-only and scoped to GET requests. We can't write, modify, or delete anything in your accounts — that's contractual."
        />
        <div className="border-t border-white/[0.08]">
          {INTEGRATIONS.map((it, i) => (
            <EditorialCard
              key={it.slug}
              href={`/integrations/${it.slug}`}
              index={i}
              title={it.name}
              italic={it.status.toLowerCase() === "live" ? "✦ live" : `${it.status.toLowerCase()}`}
              body={it.body}
              meta={it.meta}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Don't see your stack?"
        italic="Tell us — we ship monthly."
        body="We add at least one new integration every month, prioritized by what current and trial users actually need. Drop us a line and your tool may be next."
        primaryCta={{ label: "Request an integration", href: "mailto:info@efficyon.com?subject=Integration%20request" }}
        secondaryCta={{ label: "Start free analysis →", href: "/register" }}
      />
    </>
  )
}
