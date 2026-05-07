import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialMonoLabel,
} from "@/components/marketing/editorial"
import { absoluteUrl } from "@/lib/site"
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Automated Software Audits in Minutes, Not Months",
  description:
    "Automated software audit: continuous inventory, license compliance tracking, and audit-ready reports — replace quarterly spreadsheet scrambles.",
  path: "/features/software-audit",
})

export default function SoftwareAuditPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon Software Audit Tool",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features/software-audit"),
      description:
        "Automated software audit tool that provides complete software inventory, license compliance tracking, and audit-ready reports with continuous monitoring.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Automated discovery, Complete inventory, Compliance tracking, Audit-ready reports, Continuous monitoring, License auditing",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does automated software auditing work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to accounting systems, identity providers, and SaaS tools to automatically catalog every piece of software in your organization. License counts, usage levels, costs, and compliance status are tracked continuously. Reports are generated on demand.",
          },
        },
        {
          "@type": "Question",
          name: "How long does an audit take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Initial discovery typically completes within the first week. After that, the audit is always current because the inventory is continuous. Generating an audit report takes seconds — the underlying data is always live.",
          },
        },
        {
          "@type": "Question",
          name: "Can it help with vendor compliance audits?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Efficyon tracks license entitlements against actual usage. If you're over-deployed, the system flags the compliance risk before the vendor does. If you're under-deployed, it identifies the waste.",
          },
        },
        {
          "@type": "Question",
          name: "What's in the audit reports?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Complete inventory with vendor details, license counts vs. actual usage, cost per tool and per user, compliance status, usage trends, and optimization recommendations. Exportable as PDF or CSV.",
          },
        },
      ],
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "Software Audit", path: "/features/software-audit" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · Audit · compliance"
        title="The audit that"
        italic="audits itself."
        body="Continuous software inventory, license compliance tracking, and audit-ready reports built on the same accounting + identity + usage feeds powering the rest of Efficyon. Quarter-end stops being a fire drill."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="Audits are slow,"
          italic="painful, incomplete."
          body="Most companies dread software audits because they require months of spreadsheet work, pull people away from real work, and still produce a snapshot that's outdated by the time it's signed off."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>Why the manual audit fails</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>3–6 months of spreadsheet work, email chains, and meetings just to produce a snapshot that's already outdated.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Incomplete inventories — missing shadow IT, departmental purchases, and tools expensed on personal cards.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Compliance risk: over-deployment exposes you to vendor true-up penalties that can run into tens of thousands.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Audit fatigue makes teams treat the exercise as a checkbox — and the report stops driving decisions.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>The structural fix</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              Audits fail because they're a periodic snapshot of a continuously changing system. The fix isn't a better project — it's making the inventory and compliance status live, then exporting it on demand.
            </p>
            <p className="mt-5 text-[16px] leading-[1.75] text-white/55">
              That's the entire shape of this feature.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Discover. Catalog."
          italic="Export."
          body="Same data feeds the cost-leak engine uses — extended with compliance signals."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Discover everything"
            body="Accounting records, SSO logs, expense reports, and API connections feed into one map of every software tool — official procurement, shadow IT, free-tier products with security implications."
          />
          <Step
            num="02"
            title="Catalog & classify"
            body="Each tool enriched with vendor data, license type, cost, ownership, user count, usage metrics, and compliance status. Categorized by function so you can slice the stack by purpose, cost, or risk."
          />
          <Step
            num="03"
            title="Monitor & report"
            body="Continuous monitoring keeps the inventory current. Compliance gaps flagged in real time. Audit reports generate in seconds — PDF, CSV, or direct integration with GRC tools."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample inventory row"
          italic="from a continuous audit."
          body="Illustrative — the structure of a real audit row. Every entry is auditable down to the source invoice and activity window."
        />
        <SampleInventory
          rows={[
            { tool: "HubSpot Marketing Pro", licensed: "48", active: "36", cost: "$1,800/mo", flag: "Over-licensed · 12 idle" },
            { tool: "Microsoft 365 E5", licensed: "120", active: "115", cost: "$5,640/mo", flag: "5 ex-employees · deprovision" },
            { tool: "Adobe Creative Cloud", licensed: "20", active: "12", cost: "$1,200/mo", flag: "8 inactive 120+ days" },
            { tool: "Asana Premium", licensed: "32", active: "31", cost: "$420/mo", flag: "Overlap with Monday.com" },
            { tool: "GitHub Enterprise", licensed: "85", active: "84", cost: "$1,785/mo", flag: "Compliant" },
            { tool: "Vendor X (untagged)", licensed: "—", active: "—", cost: "$640/mo", flag: "Shadow IT · review owner" },
          ]}
        />
      </EditorialSection>

      <EditorialFinalCTA
        title="End the manual"
        italic="audit cycle."
        body="Connect your accounting system and identity provider. The audit is current within the week — and it stays current."
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

function SampleInventory({
  rows,
}: {
  rows: { tool: string; licensed: string; active: string; cost: string; flag: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[1.4fr_100px_100px_140px_1.6fr] gap-6 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Tool</EditorialMonoLabel>
        <EditorialMonoLabel>Licensed</EditorialMonoLabel>
        <EditorialMonoLabel>Active</EditorialMonoLabel>
        <EditorialMonoLabel>Cost</EditorialMonoLabel>
        <EditorialMonoLabel>Audit flag</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2 border-b border-white/[0.08] py-6 md:grid-cols-[1.4fr_100px_100px_140px_1.6fr] md:gap-6 md:py-7"
        >
          <span className="text-[15.5px] text-white/85">{r.tool}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-white/65">{r.licensed}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-white/65">{r.active}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-white/85">{r.cost}</span>
          <span
            className="font-[family-name:var(--font-instrument-serif)] text-[16px] italic"
            style={{ color: r.flag === "Compliant" ? "rgba(255,255,255,0.45)" : "var(--green)" }}
          >
            {r.flag}
          </span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · structure of a real continuous-audit row
      </p>
    </div>
  )
}
