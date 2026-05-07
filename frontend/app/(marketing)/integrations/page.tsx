import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Integrations - Connect Your Tools",
  description:
    "Integrate Efficyon with your accounting and billing platforms for automated SaaS cost analysis. Connect Fortnox, Stripe, QuickBooks, Xero, and more.",
  path: "/integrations",
})

type IntegrationStatus = "live" | "coming-soon"
type IntegrationCard = {
  name: string
  slug: string
  status: IntegrationStatus
  body: string
  meta: string
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    name: "Fortnox",
    slug: "fortnox",
    status: "live",
    body: "Auto-import Fortnox invoices, categorize SaaS expenses, and surface optimization opportunities. Built for Swedish SMBs first — multi-currency, VAT-aware.",
    meta: "Accounting · Sweden · OAuth read-only",
  },
  {
    name: "Stripe",
    slug: "stripe",
    status: "live",
    body: "Analyze every Stripe-billed subscription, track payment trends, and catch billing anomalies before they hit your books.",
    meta: "Billing · Global · OAuth read-only",
  },
  {
    name: "QuickBooks",
    slug: "quickbooks",
    status: "live",
    body: "Auto-categorize and analyze your SaaS subscriptions alongside your full QuickBooks ledger. Real-time sync, no exports.",
    meta: "Accounting · US/CA · OAuth read-only",
  },
  {
    name: "Xero",
    slug: "xero",
    status: "live",
    body: "Complete visibility into SaaS spend through Xero. Multi-currency, multi-org, with department-level analysis.",
    meta: "Accounting · UK/AU/NZ · OAuth read-only",
  },
  {
    name: "Visma eEkonomi",
    slug: "visma",
    status: "coming-soon",
    body: "Visma at Fortnox parity — invoices, suppliers, customers. Multi-currency. The other half of the Swedish SMB market.",
    meta: "Accounting · Sweden · OAuth read-only",
  },
  {
    name: "Microsoft 365",
    slug: "microsoft-365",
    status: "coming-soon",
    body: "Per-license activity for Business Basic, Standard, Premium, E3, E5. Surfaces dormant seats and overprovisioned tiers.",
    meta: "Productivity · Identity · Graph API",
  },
  {
    name: "Google Workspace",
    slug: "google-workspace",
    status: "coming-soon",
    body: "User activity, license assignments, and storage usage across Workspace tiers. Pinpoint who's actually using what.",
    meta: "Productivity · Identity · OAuth",
  },
  {
    name: "HubSpot",
    slug: "hubspot",
    status: "coming-soon",
    body: "Seat usage, last-active dates, paid feature utilization. Spot Enterprise-tier features being used at Starter intensity.",
    meta: "Sales · Marketing · OAuth",
  },
  {
    name: "Shopify",
    slug: "shopify",
    status: "coming-soon",
    body: "App-by-app spend audit on your Shopify install. Catch the 14 apps from 2023 that nobody uses but everybody pays for.",
    meta: "E-commerce · OAuth",
  },
  {
    name: "Asana",
    slug: "asana",
    status: "coming-soon",
    body: "Per-seat activity, project counts, paid feature usage. Identify Business-tier seats living a Premium-tier life.",
    meta: "Project mgmt · OAuth",
  },
  {
    name: "Airtable",
    slug: "airtable",
    status: "coming-soon",
    body: "Workspace utilization, base activity, and seat-level usage. Common waste pattern: Pro seats for read-only viewers.",
    meta: "Database · OAuth + PKCE",
  },
  {
    name: "OpenAI / Anthropic / Gemini",
    slug: "ai-providers",
    status: "coming-soon",
    body: "API consumption analysis across all three frontier AI labs. Token spend per project, model choice efficiency, and burn-rate forecasting.",
    meta: "AI APIs · admin keys",
  },
]

const live = INTEGRATIONS.filter((i) => i.status === "live")
const upcoming = INTEGRATIONS.filter((i) => i.status === "coming-soon")

export default function IntegrationsIndexPage() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Efficyon Integrations",
      description:
        "Connect your accounting and billing platforms to Efficyon for automated SaaS cost analysis and optimization.",
      url: absoluteUrl("/integrations"),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: live.map((integration, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${integration.name} Integration`,
          url: absoluteUrl(`/integrations/${integration.slug}`),
        })),
      },
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Integrations", path: "/integrations" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
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
          title="4 integrations,"
          italic="growing every month."
          body="Each connection is OAuth-only and scoped to GET requests. We can't write, modify, or delete anything in your accounts — that's contractual."
        />
        <div className="border-t border-white/[0.08]">
          {live.map((it, i) => (
            <EditorialCard
              key={it.slug}
              href={`/integrations/${it.slug}`}
              index={i}
              title={it.name}
              italic="✦ live"
              body={it.body}
              meta={it.meta}
            />
          ))}
        </div>
      </EditorialSection>

      {upcoming.length > 0 && (
        <section className="relative z-10 border-t border-white/[0.06]">
          <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-12">
            <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/35">
              ✦ Shipping next
            </p>
            <h2 className="text-[clamp(28px,3vw,40px)] font-medium leading-[1.05] tracking-[-0.02em]">
              Already on the path.
            </h2>
            <p className="mt-3 max-w-[520px] text-[14px] leading-[1.6] text-white/55">
              Backend support exists or is in active rollout. Landing pages and setup docs ship as each integration goes generally available.
            </p>
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {upcoming.map((i) => (
                <div
                  key={i.slug}
                  className="group rounded-md border border-white/[0.06] bg-white/[0.012] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-medium text-white/65">{i.name}</p>
                    <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-white/55">
                      Soon
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.6] text-white/40">{i.body}</p>
                  <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-white/30">
                    {i.meta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
