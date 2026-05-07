import Link from "next/link"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { RelatedLinks } from "@/components/marketing/related-links"
import { absoluteUrl } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Subscription Tracking That Never Misses a Renewal",
  description:
    "Subscription tracking software for SaaS: centralize renewals, monitor cost trends, detect shadow IT, and break costs down by department.",
  path: "/features/subscription-tracking",
})

export default function SubscriptionTrackingPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Subscription Tracking",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features/subscription-tracking"),
      description:
        "Centralized SaaS subscription tracking platform with renewal alerts, cost trend analysis, shadow IT detection, and department-level spend breakdowns.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Centralized subscription dashboard, Renewal alerts, Cost trend analysis, Shadow IT detection, Department-level breakdown, Vendor management",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Efficyon discover all our subscriptions?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to your accounting system, expense management, and identity provider to automatically catalog every SaaS subscription — including shadow IT bought on corporate cards or expensed personally.",
          },
        },
        {
          "@type": "Question",
          name: "How far in advance do renewal alerts fire?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Default alerts fire at 90, 30, and 7 days before renewal. Windows are configurable per subscription, and alerts can be routed to different owners.",
          },
        },
        {
          "@type": "Question",
          name: "Can I see costs broken down by department?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — every subscription is mapped to a department or team based on identity data and explicit tagging. Drill-downs run by tool, owner, category, and time period.",
          },
        },
        {
          "@type": "Question",
          name: "What happens when a new subscription appears?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon classifies it, checks for overlap with existing tools, assigns a likely owner, and notifies the admin so shadow IT becomes a decision instead of a discovery.",
          },
        },
      ],
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "Subscription Tracking", path: "/features/subscription-tracking" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · Visibility"
        title="Every subscription,"
        italic="in one place."
        body="Renewal dates. Owners. Cost per seat. Trend lines. Shadow IT, surfaced before it becomes structural. Built on the same accounting + identity feeds powering the rest of the platform."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="A maze of subscriptions,"
          italic="and no map."
          body="As companies grow, subscriptions multiply faster than oversight. Different teams, different cards, different renewal calendars — and finance never has the full picture."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>Where the visibility breaks</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Subscriptions scatter across departments, cards, and expense reports with no single source of truth.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Auto-renewals trigger surprise charges because nobody remembered the contract end date.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>IT can't tell you how many SaaS tools the company actually uses today, only what it has formally procured.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Shadow IT bypasses procurement entirely — security risks and budget overruns surface only at quarter close. Pair with{" "}
                  <Link href="/features/unused-license-detection" className="text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
                    unused license detection
                  </Link>
                  {" "}to catch idle seats alongside shadow tools.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>The compounding effect</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              The classic case: one person leaves, owns three subscriptions on a corporate card, and the renewals continue silently for two years. Multiplied across a 50-person org, that's a structural leak no spreadsheet will catch.
            </p>
            <p className="mt-5 text-[16px] leading-[1.75] text-white/55">
              The fix isn't a better spreadsheet — it's a feed. Combined with{" "}
              <Link href="/features/saas-spend-management" className="text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
                spend management
              </Link>
              , the full picture of what you pay and what gets used lives in one place.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Discover. Assign."
          italic="Alert."
          body="The tracking layer is plumbing — boring on purpose. It runs continuously and only interrupts you when something needs a decision."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Discover automatically"
            body="Pulled from accounting (vendors, recurring invoices), identity (active seats per tool), and expense data. Subscriptions surface whether they came through procurement or a personal card."
          />
          <Step
            num="02"
            title="Assign and tag"
            body="Each tool gets a category, an owner, a department, a renewal date, and a contract term. You can override anything; the system learns your conventions."
          />
          <Step
            num="03"
            title="Alert before it bites"
            body="Default 90/30/7-day renewal alerts. New, unrecognized subscriptions are flagged the moment they hit your accounting feed."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample tracker view"
          italic="from a 50-person org."
          body="Illustrative — your numbers will differ. The shape of the problem rarely does."
        />
        <SampleSubscriptions
          rows={[
            { tool: "HubSpot Marketing Pro", owner: "Marketing", renews: "12 Mar 2026", monthly: "$1,800", flag: "Renewal · 30 days" },
            { tool: "Notion Business", owner: "Operations", renews: "Mar 2027", monthly: "$640", flag: "—" },
            { tool: "Asana Premium", owner: "Engineering", renews: "08 Feb 2026", monthly: "$420", flag: "Overlap with Monday.com" },
            { tool: "Monday.com Standard", owner: "Marketing", renews: "Apr 2026", monthly: "$310", flag: "Overlap with Asana" },
            { tool: "Loom Business", owner: "—", renews: "21 Feb 2026", monthly: "$140", flag: "Owner left · review" },
            { tool: "Calendly Teams", owner: "Sales", renews: "May 2026", monthly: "$90", flag: "—" },
          ]}
        />
      </EditorialSection>

      <RelatedLinks variant="features" />

      <EditorialFinalCTA
        title="Stop discovering subscriptions"
        italic="at the bank statement."
        body="Connect your accounting system and identity provider. Your full subscription map appears in roughly an hour, then keeps itself current."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing →", href: "/#pricing" }}
      />
    </>
  )
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="border-t border-white/[0.08] pt-8">
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums tracking-[0.18em] text-white/35">
        {num}
      </span>
      <h3 className="mt-4 text-[24px] font-medium tracking-[-0.02em]">{title}</h3>
      <p className="mt-4 text-[15px] leading-[1.7] text-white/55">{body}</p>
    </div>
  )
}

function SampleSubscriptions({
  rows,
}: {
  rows: { tool: string; owner: string; renews: string; monthly: string; flag: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_120px_1.2fr] gap-6 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Tool</EditorialMonoLabel>
        <EditorialMonoLabel>Owner</EditorialMonoLabel>
        <EditorialMonoLabel>Renews</EditorialMonoLabel>
        <EditorialMonoLabel>Monthly</EditorialMonoLabel>
        <EditorialMonoLabel>Flag</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2 border-b border-white/[0.08] py-5 md:grid-cols-[1.4fr_1fr_1fr_120px_1.2fr] md:gap-6 md:py-6"
        >
          <span className="text-[15.5px] text-white/85">{r.tool}</span>
          <span className="text-[14px] text-white/55">{r.owner}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[12.5px] text-white/65">{r.renews}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-white/85">{r.monthly}</span>
          <span
            className={
              r.flag === "—"
                ? "text-[14px] text-white/30"
                : "font-[family-name:var(--font-instrument-serif)] text-[16px] italic text-white/85"
            }
            style={r.flag !== "—" ? { color: "var(--green)" } : undefined}
          >
            {r.flag}
          </span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · structure of a real tracker view
      </p>
    </div>
  )
}
