import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
} from "@/components/marketing/editorial"

export const metadata: Metadata = {
  title: "Changelog — what we shipped, ordered most recent first",
  description:
    "Every integration, check, and feature we've shipped. Built in public, updated monthly. The closest thing to a team photo we have.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Efficyon Changelog — what we shipped",
    description: "Built in public, updated monthly.",
    url: "https://www.efficyon.com/changelog",
  },
}

interface Release {
  date: string
  title: string
  italic?: string
  tag: "Marketing" | "Integrations" | "Engine" | "Product"
  items: string[]
}

const RELEASES: Release[] = [
  {
    date: "2026-05-07",
    title: "Editorial redesign + first per-integration videos",
    italic: "the marketing site, rebuilt.",
    tag: "Marketing",
    items: [
      "Built a new editorial design system (DM Sans + Instrument Serif italic + JetBrains Mono) — 11 reusable primitives, single source of truth across 38 marketing pages.",
      "Refactored all 38 public pages: features, integrations, solutions, compare, calculator, benchmarks, blog, tools — plus auth, privacy, terms.",
      "Honest-claims pass — removed fabricated testimonials, '25% average savings' / '63× ROI' / '50+ integrations' style claims, unverified SOC 2 / GDPR attestations. Sample data labeled illustrative.",
      "Shipped 6 Remotion videos: 4 vendor-skinned reconciliation engines (Fortnox / QuickBooks / Stripe / Xero) and 2 split-screen compare videos (vs Spreadsheets / vs Zylo).",
      "Pricing toggle on the homepage: 6 months / monthly / yearly across all three plans.",
    ],
  },
  {
    date: "2026-05-05",
    title: "Visma eEkonomi integration · at Fortnox parity",
    tag: "Integrations",
    items: [
      "Backend OAuth + 5 supplier-side checks + 1 customer-side check.",
      "Multi-currency normalization (SEK / EUR / USD / GBP).",
      "Frontend tool config + view component + brand logo.",
      "Closes the second half of the Swedish SMB market.",
    ],
  },
  {
    date: "2026-05-02",
    title: "Airtable integration · OAuth+PKCE",
    tag: "Integrations",
    items: [
      "4 V1 checks shipping: workspace activity, base utilization, paid-tier read-only seat detection, dormant-user surfacing.",
      "OAuth flow with PKCE (Airtable's recommended pattern).",
      "Frontend config, view component, brand logo, embedded setup guide.",
    ],
  },
  {
    date: "2026-04-28",
    title: "Asana integration",
    italic: "project mgmt waste, surfaced.",
    tag: "Integrations",
    items: [
      "Backend controller + OAuth + 4 checks + aggregator + routes + DB migration.",
      "Frontend tool config, registry entry, brand logo, setup guide section.",
      "Catches Business-tier seats living a Premium-tier life — common 30-50% overprovisioning.",
    ],
  },
  {
    date: "2026-04-22",
    title: "Monday.com · 5-check integration",
    tag: "Integrations",
    items: [
      "Five checks: inactive_user, seat_tier_overprovisioning, disabled_user, pending_invite, view_only_member.",
      "Aggregator + 5-check fan-out with severity ladder.",
      "Members data tab view component.",
      "Tool config + registry entry + brand logo + setup-guide section.",
      "Fixed seat-tier currentValue to equal the leak portion (not the whole tier).",
    ],
  },
  {
    date: "2026-04-15",
    title: "Real official marks for Atlassian and monday.com",
    tag: "Marketing",
    items: [
      "Replaced placeholder icons with the real, licensed brand marks.",
      "Pixel-aligned in the integration grid; passes monday.com brand-asset rules.",
    ],
  },
]

const TAG_COLORS: Record<Release["tag"], string> = {
  Marketing: "rgba(255,255,255,0.55)",
  Integrations: "var(--green)",
  Engine: "rgba(255,255,255,0.55)",
  Product: "rgba(255,255,255,0.55)",
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function ChangelogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Efficyon Changelog",
    description: "Every integration, check, and feature we ship.",
    url: "https://www.efficyon.com/changelog",
    blogPost: RELEASES.map((r) => ({
      "@type": "BlogPosting",
      headline: r.title,
      datePublished: r.date,
      author: { "@type": "Organization", name: "Efficyon" },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Changelog · Built in public"
        title="What we shipped,"
        italic="ordered most recent first."
        body="Every integration we add, every check we ship, every release goes here. No marketing translation, no version-number theatre. Just the work."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "About Efficyon →", href: "/about" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Recent releases"
          title="Six releases shipped"
          italic="in the last 30 days."
          body="The release cadence is roughly monthly, but integration-specific work ships continuously. The list below is the bigger landmarks — the daily commits live in git."
        />
        <div className="border-t border-white/[0.08]">
          {RELEASES.map((release) => (
            <article
              key={release.date}
              className="grid grid-cols-1 gap-8 border-b border-white/[0.08] py-12 md:grid-cols-[180px_1fr] md:gap-16"
            >
              {/* Date column */}
              <div>
                <time
                  dateTime={release.date}
                  className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45"
                >
                  {formatLongDate(release.date)}
                </time>
                <div className="mt-3">
                  <span
                    className="inline-block border px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em]"
                    style={{
                      color: TAG_COLORS[release.tag],
                      borderColor: release.tag === "Integrations" ? "var(--green)" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    ✦ {release.tag}
                  </span>
                </div>
              </div>

              {/* Body column */}
              <div>
                <h2 className="text-[26px] font-medium leading-[1.15] tracking-[-0.025em] md:text-[32px]">
                  {release.title}
                  {release.italic && (
                    <>
                      {" "}
                      <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/65">
                        {release.italic}
                      </span>
                    </>
                  )}
                </h2>
                <ul className="mt-6 space-y-3 text-[15px] leading-[1.7] text-white/65">
                  {release.items.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <span
                        className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 rounded-full"
                        style={{ background: "var(--green)" }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection>
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <EditorialEyebrow>The plan</EditorialEyebrow>
            <p className="mt-4 max-w-[480px] font-[family-name:var(--font-instrument-serif)] text-[26px] italic leading-[1.4] text-white/85">
              At least one new integration every month, prioritized by what current and trial users actually need.
            </p>
          </div>
          <div className="space-y-4 text-[15px] leading-[1.7] text-white/55">
            <p>
              The roadmap is shaped by signing customers, not pre-built TAM slides. If you connect a system we don&apos;t support yet, we add it to the queue. If three people connect the same one, it jumps the queue.
            </p>
            <p>
              Want a specific integration faster?{" "}
              <a
                href="mailto:info@efficyon.com?subject=Integration%20request"
                className="text-white/85 transition-colors hover:text-white"
                style={{ borderBottom: "1px solid var(--green)" }}
              >
                Tell us
              </a>
              .
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Run the analysis we keep"
        italic="shipping new checks for."
        body="Every integration on this changelog is live and read-only. Connect one, see what surfaces, and judge the math against your own stack."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "About Efficyon →", href: "/about" }}
      />
    </>
  )
}
