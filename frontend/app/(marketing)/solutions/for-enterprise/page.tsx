import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"

export function generateMetadata(): Metadata {
  return {
    title: "Enterprise SaaS Cost Intelligence - Read-Only, EU-Hosted",
    description:
      "Enterprise SaaS cost intelligence. Read-only access to accounting and usage data, EU hosting, and an integration surface that fits next to your ERP and identity provider. Pre-launch — designed for procurement-grade scrutiny.",
    alternates: {
      canonical: "/solutions/for-enterprise",
    },
    openGraph: {
      title: "Enterprise SaaS Cost Intelligence | Efficyon",
      description:
        "Read-only access, EU hosting, and an integration surface that fits next to your ERP and identity provider.",
      url: "https://www.efficyon.com/solutions/for-enterprise",
      type: "website",
    },
  }
}

export default function ForEnterprisePage() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Enterprise SaaS Cost Intelligence | Efficyon",
    description:
      "Enterprise SaaS cost intelligence with read-only access, EU hosting, and deep integration with ERP and identity providers.",
    url: "https://www.efficyon.com/solutions/for-enterprise",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where is Efficyon hosted, and who can read our data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is built in Gothenburg and EU-hosted. Access to your data is limited to the integrations you grant — read-only by design — and to a small operating team for support. We do not write to your accounting ledger, identity provider, or vendor portals. Security documentation is available under NDA for procurement reviews.",
        },
      },
      {
        "@type": "Question",
        name: "Does Efficyon support SSO and SAML for enterprise deployments?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SSO/SAML support is on the roadmap and prioritised for enterprise engagements. We work with the major identity providers (Okta, Azure AD, Google Workspace) on the read side today and are bringing inbound SSO into the product as we move out of pre-launch. Talk to us about your specific identity stack — that conversation drives the order.",
        },
      },
      {
        "@type": "Question",
        name: "Can Efficyon integrate with our existing ERP and identity systems?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Efficyon is built around accounting and usage data. We currently support a curated set of accounting systems (Fortnox, QuickBooks), productivity suites (Microsoft 365, Google Workspace), CRM and commerce (HubSpot, Shopify), and the major API-consumption platforms (OpenAI, Anthropic, Gemini). Enterprise integration requirements feed directly into the roadmap — bring the list, we'll be honest about what's there today.",
        },
      },
      {
        "@type": "Question",
        name: "Efficyon is pre-launch. Why would an enterprise sign now?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Because the alternative is a vendor that locked their roadmap two years ago. Pre-launch means you can shape the integration list, the dashboard, and the security posture to fit your stack. The 5× fee refund guarantee makes the downside contractual. If we don't surface five times our fee in modeled savings, you get refunded.",
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

      <EditorialPageHero
        eyebrow="Solutions · For enterprise"
        title="Scale without"
        italic="the sprawl tax."
        body="Hundreds of vendors, dozens of departments, governance that has to actually hold. Efficyon sits between your accounting feed and your usage data — read-only, EU-hosted, and built to be audited before it's signed. We're pre-launch; we don't promise customer logos we don't have."
        primaryCta={{ label: "Talk to us", href: "/#contact" }}
        secondaryCta={{ label: "See features →", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The enterprise problem"
          title="The cost is symptomatic."
          italic="The governance is the disease."
          body="At enterprise scale, a SaaS line that grows 22% year-over-year isn't just a cost question — it's a procurement, security, and compliance question that touches every department."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-2">
          {[
            {
              label: "01 · Inventory",
              title: "Nobody has the full list.",
              body:
                "Two hundred subscriptions adopted organically over years, by individual departments, on individual cards. The complete inventory exists in nobody's head and no single system. The first job is rebuilding it from financial data — because that's the only feed every purchase eventually touches.",
            },
            {
              label: "02 · Procurement side doors",
              title: "The credit card bypasses the workflow.",
              body:
                "Multi-level approval, security review, legal sign-off — and then a department lead reimburses a $40/seat tool through expenses. The governance you spent years building has a side door, and the side door is where the SaaS gets in.",
            },
            {
              label: "03 · Cross-department duplication",
              title: "Four project tools, one job.",
              body:
                "Engineering on Jira, marketing on Asana, ops on Monday, a side team on Trello. Consolidation needs cross-department coordination — and a number to anchor the conversation. The number lives in the data we surface.",
            },
            {
              label: "04 · Compliance surface",
              title: "Every untracked tool is an audit finding.",
              body:
                "SOC 2, GDPR, sector-specific frameworks. The regulatory cost of poor SaaS governance routinely exceeds the software cost itself. A complete inventory is the precondition for any of the rest of it.",
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
          eyebrow="What we're building"
          title="A platform you can"
          italic="read before you sign."
          body="Pre-launch means you see the entire surface. Read-only scope, EU hosting, integrations on the roadmap, and a contract that backs the modeled savings with a refund."
        />

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              n: "01",
              title: "Read-only access.",
              italic: "Scoped, auditable.",
              body:
                "OAuth or scoped API keys to your accounting feed and usage sources. We read; we do not write. Your security team can audit the exact scope before signing. No agents on endpoints, no writes to your ledger, no payment initiation.",
            },
            {
              n: "02",
              title: "EU-hosted, built in Gothenburg.",
              italic: "Data residency that holds.",
              body:
                "Efficyon is a Swedish company with EU hosting. Data residency is a default, not an enterprise upcharge. For organisations under GDPR scrutiny, the geography of the processor matters; we're set up for it.",
            },
            {
              n: "03",
              title: "Integration surface that fits.",
              italic: "ERP, identity, productivity.",
              body:
                "Today: Fortnox, QuickBooks, Microsoft 365, Google Workspace, HubSpot, Shopify, plus OpenAI / Anthropic / Gemini for AI consumption. Enterprise integration requirements drive the roadmap — bring your list, we'll be honest about what's available now.",
            },
            {
              n: "04",
              title: "5× fee refund guarantee.",
              italic: "Downside, contractual.",
              body:
                "If modeled savings don't exceed five times what you pay us in the first engagement, we refund the difference. We're pre-launch and we know the asymmetry — the guarantee is how we close it.",
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
          eyebrow="Honesty rules"
          title="What we won't claim,"
          italic="and what we will."
          body="Every SaaS-management vendor has a pitch deck full of customer logos. We don't have that yet. Here is what's true today."
        />

        <div className="grid gap-px overflow-hidden border border-white/[0.08] md:grid-cols-2">
          <div className="bg-[#080809] p-10">
            <EditorialMonoLabel>Won&apos;t claim</EditorialMonoLabel>
            <ul className="mt-6 space-y-4 text-[15px] leading-[1.7] text-white/55">
              <li>— No customer testimonials. We have no customers yet.</li>
              <li>— No &ldquo;trusted by 500+ enterprises.&rdquo; Trusted by zero, currently.</li>
              <li>— No SOC 2 Type II badge in the header. We're working toward it; we're not there.</li>
              <li>— No fabricated benchmarks. Modeled numbers are labelled modeled.</li>
            </ul>
          </div>
          <div className="bg-[#080809] p-10">
            <EditorialMonoLabel green>Will claim</EditorialMonoLabel>
            <ul className="mt-6 space-y-4 text-[15px] leading-[1.7] text-white/70">
              <li>— Read-only data access, scoped to integrations you grant.</li>
              <li>— EU-hosted, built in Gothenburg.</li>
              <li>— 5× fee refund guarantee, in the contract.</li>
              <li>— A roadmap shaped by the enterprise teams who sign first.</li>
            </ul>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Talk to us before"
        italic="the roadmap is locked."
        body="Pre-launch is the window where your integration list and security posture shape the product. Enterprise procurement at this stage is a conversation, not a checkout flow."
        primaryCta={{ label: "Schedule a call", href: "/#contact" }}
        secondaryCta={{ label: "See features →", href: "/features" }}
      />
    </>
  )
}
