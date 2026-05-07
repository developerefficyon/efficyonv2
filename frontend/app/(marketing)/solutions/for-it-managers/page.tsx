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
    title: "Software Asset Management for IT Teams - Shadow IT, Surfaced",
    description:
      "Software asset management for IT teams. Detect shadow IT through accounting data, find departed employees with active seats, and tie license usage to identity. Read-only access, EU-hosted.",
    alternates: {
      canonical: "/solutions/for-it-managers",
    },
    openGraph: {
      title: "Software Asset Management for IT Teams | Efficyon",
      description:
        "Detect shadow IT, surface departed-employee seats, and tie license usage to identity data. Read-only access, EU-hosted.",
      url: absoluteUrl("/solutions/for-it-managers"),
      type: "website",
    },
  }
}

export default function ForITManagersPage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Software Asset Management for IT Teams | Efficyon",
    description:
      "Shadow IT discovery, license usage tied to identity, and departed-employee seat detection — anchored in accounting and identity data.",
    url: absoluteUrl("/solutions/for-it-managers"),
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
        name: "How does Efficyon detect shadow IT?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon analyzes the accounting feed and corporate-card data to find SaaS subscriptions that bypassed IT-approved procurement. When a marketing seat shows up on a card statement under a vendor IT has never seen, we flag it. The accounting ledger is the one feed every purchase eventually touches — which is why anchoring there finds what an inventory scan cannot.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon help with software license compliance?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Where the integration exposes seat-level data — Microsoft 365, Google Workspace, HubSpot — Efficyon ties license counts to actual users, surfaces idle seats, and flags departed employees who still hold access. License compliance becomes a continuous read instead of a quarterly project.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon integrate with our existing IT and identity tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Today Efficyon reads from Microsoft 365 and Google Workspace, plus the major productivity and CRM stacks (HubSpot, Shopify) and AI consumption platforms (OpenAI, Anthropic, Gemini). Native Okta / Azure AD integration is on the roadmap. The integration list is shaped by the IT teams who engage with us first.",
        },
      },
      {
        "@type": "Question",
        name: "How is Efficyon different from a traditional ITAM tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Traditional ITAM scans endpoints for installed software. Efficyon reads the accounting feed and identity-tied usage data, which is where modern SaaS spend actually lives. ITAM finds the laptop's installed apps; Efficyon finds the $40/seat tool that runs entirely in a browser, paid through a credit card, used by three departments and approved by none.",
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbListLd([{ name: "Home", path: "/" }, { name: "Solutions", path: "/solutions" }, { name: "For IT Managers", path: "/solutions/for-it-managers" }])]) }}
      />

      <EditorialPageHero
        eyebrow="Solutions · For IT managers"
        title="Shadow IT,"
        italic="surfaced."
        body="The SaaS purchases that bypassed your procurement workflow live in one place: the accounting feed. Efficyon reads it, ties what it finds to identity data where it can, and tells you which seats are idle, which employees left months ago, and which tools never got a security review."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See features →", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="Endpoint scans find"
          italic="the wrong half of the stack."
          body="Modern SaaS runs in a browser, paid by a card, approved by no one in particular. The traditional ITAM playbook — agents on laptops, network monitoring, software inventory — is structurally blind to the half of the stack that matters most for cost and security."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-2">
          {[
            {
              label: "01 · The procurement side door",
              title: "A card, an email, and a new vendor.",
              body:
                "A department lead signs up, expenses it, embeds it in a workflow over a quarter. By the time IT learns the tool exists, removing it is a political conversation, not a technical one. The discovery has to happen at the financial layer, not the network layer.",
            },
            {
              label: "02 · Departed employees, active seats",
              title: "The offboarding script doesn't reach SaaS.",
              body:
                "Your offboarding is solid for AD and the major suites. The 47 long-tail SaaS tools — many never inventoried — keep the seat live, sometimes for years. Each one is a paid license and a security exposure with the same root cause.",
            },
            {
              label: "03 · License vs. usage drift",
              title: "Three tiers up from what's needed.",
              body:
                "An enterprise plan was justified by a feature nobody uses anymore, a seat count that hasn't been right since 2023, a renewal that auto-bumped. Without seat-level usage tied to identity, you can't tell which licenses are real and which are inertia.",
            },
            {
              label: "04 · Compliance review gaps",
              title: "Every untracked tool is a finding.",
              body:
                "SOC 2, GDPR, sector frameworks — they all assume an inventory. Tools that bypassed procurement also bypassed the security review. The cost of finding them in an audit is much higher than the cost of finding them in a dashboard.",
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
          title="Financial discovery."
          italic="Identity-tied usage."
          body="The two reads — what was paid for, and who actually used it — done continuously, with the gap between them as the signal."
        />

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              n: "01",
              title: "Discovery from the ledger.",
              italic: "Where it always shows up.",
              body:
                "Read-only OAuth into the accounting feed. Every recurring vendor charge becomes an inventoried subscription. Shadow IT stops being a research project and becomes a column.",
            },
            {
              n: "02",
              title: "Usage tied to identity.",
              italic: "Where the integration exposes it.",
              body:
                "Microsoft 365, Google Workspace, HubSpot — seat-level usage attached to the actual user. Idle seats and active-but-departed accounts surface against your identity provider's offboarding state.",
            },
            {
              n: "03",
              title: "Departed-employee detection.",
              italic: "The offboarding gap, closed.",
              body:
                "Cross-reference active seats with identity status. The seats your offboarding script missed surface as a list, not as an audit finding. Each one is a paid license and a security exposure with one shared fix.",
            },
            {
              n: "04",
              title: "Tier and seat-count drift.",
              italic: "Pricing reality vs. paid reality.",
              body:
                "Where seat counts are visible, we compare them to active usage on a 90-day window. The enterprise tier you don't actually need, the seat count that hasn't moved with the team — both surface as findings with a recommended action.",
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
          eyebrow="Why an IT lead specifically"
          title="Read-only,"
          italic="and built for procurement scrutiny."
          body="No agents on endpoints, no writes to identity, no payment initiation. The scope is narrow on purpose — it's how a SaaS-discovery tool gets through your security review without becoming a project."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-3">
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
              OAuth or scoped API keys. No agents on endpoints. No writes to identity providers,
              accounting systems, or vendor portals.
            </p>
          </div>
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
              Connect to first scan
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              No deployment. No agents to push. Connect via OAuth, the inventory builds in the
              background, the first scan completes the same morning.
            </p>
          </div>
          <div className="bg-[#080809] p-10">
            <span
              className="text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.04em]"
              style={{ color: "var(--green)" }}
            >
              EU
            </span>
            <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55">
              Built in Gothenburg, Sweden
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/50">
              EU hosting and data residency by default. Useful when the security review starts
              with the geography of the processor.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Find what bypassed"
        italic="your procurement workflow."
        body="Connect the accounting feed and a productivity suite. The shadow-IT inventory builds itself, the departed-employee seats surface, the idle licenses come with a recommended action. Read-only, EU-hosted, cancel anytime."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Talk to us →", href: "/#contact" }}
      />
    </>
  )
}
