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
  title: "Complete SaaS Spend Management in One Platform",
  description:
    "SaaS spend management platform: unified dashboards, real-time budget controls, forecasting, and department-level cost allocation.",
  path: "/features/saas-spend-management",
})

export default function SaaSSpendManagementPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon SaaS Spend Management",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features/saas-spend-management"),
      description:
        "Complete SaaS spend management platform with real-time dashboards, budget controls, forecasting, and department allocation in one unified view.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Real-time spend dashboard, Budget alerts, Spend forecasting, Department allocation, Vendor management, Trend analysis",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is SaaS spend management?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SaaS spend management is the practice of tracking, allocating, and forecasting all software subscription costs across an organization. Efficyon automates the workflow that finance teams typically run in spreadsheets.",
          },
        },
        {
          "@type": "Question",
          name: "How does Efficyon track SaaS spend?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Efficyon connects to accounting systems, corporate cards, and expense tools, then aggregates SaaS-related transactions by vendor, department, category, and time period — refreshing as new data lands.",
          },
        },
        {
          "@type": "Question",
          name: "Can I set budget limits per department?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Budgets can be set at the department, team, or category level. Configurable alerts notify owners as thresholds approach, before overruns become quarter-end emergencies.",
          },
        },
        {
          "@type": "Question",
          name: "How accurate is the forecasting?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Forecasting uses historical patterns, upcoming renewals, contracted price increases, and headcount trends. Accuracy improves with more data; modeled forecasts typically land within ±5–10% after the first quarter.",
          },
        },
      ],
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "SaaS Spend Management", path: "/features/saas-spend-management" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · Spend management"
        title="Replace the spreadsheet,"
        italic="keep the clarity."
        body="Every SaaS dollar — tracked, allocated, forecasted, broken down per department and per tool. Real-time, in your dashboard, in the same place where the cost-leak engine surfaces what to act on."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="SaaS is the second"
          italic="largest opex."
          body="Yet finance teams have less visibility into software costs than almost any other budget category — fragmented data, no controls, surprise renewals, and a spreadsheet that's stale by Tuesday."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>Where the visibility breaks</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Spend data scattered across accounting, corporate cards, expense reports, and departmental budgets — no unified view.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>No budget controls or thresholds — departments buy new tools without oversight until the invoice arrives.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>SaaS appears as generic line items with no context: which tool, who uses it, whether it delivers value.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Forgotten renewals and unannounced price increases blow through quarterly projections.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>Why spreadsheets lose</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              The spreadsheet was built for a stack of 8 tools. The modern stack is 80. Every reconciliation cycle drifts further from reality, and the time spent maintaining the sheet is the same money you're trying to save.
            </p>
            <p className="mt-5 text-[16px] leading-[1.75] text-white/55">
              The fix is to make the data the source — not the report.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Aggregate. Control."
          italic="Forecast."
          body="Three layers — each replacing a column in your existing spreadsheet, but live."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Aggregate every source"
            body="Accounting (Fortnox, QuickBooks), corporate cards, expense management, procurement records — every SaaS-related transaction identified, categorized, and consolidated into a single live view."
          />
          <Step
            num="02"
            title="Set controls and budgets"
            body="Thresholds by department, category, or vendor. Configurable alerts route to the right people. Optional approval workflows for new tool purchases so spend stays intentional."
          />
          <Step
            num="03"
            title="Forecast and optimize"
            body="Modeled projections from historical patterns, upcoming renewals, contracted increases, and headcount trends. Vendor benchmarks surface negotiation leverage as renewals approach."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample dashboard view"
          italic="department × tool."
          body="Illustrative — the structure of a real spend management view. Your numbers will differ; the breakdowns won't."
        />
        <SampleSpend
          rows={[
            { dept: "Engineering", monthly: "$12,400", trend: "+4% MoM", topTool: "GitHub Enterprise" },
            { dept: "Marketing", monthly: "$9,820", trend: "+11% MoM", topTool: "HubSpot Marketing Pro" },
            { dept: "Sales", monthly: "$7,960", trend: "+1% MoM", topTool: "Salesforce Sales Cloud" },
            { dept: "Operations", monthly: "$3,180", trend: "−2% MoM", topTool: "Notion Business" },
            { dept: "Design", monthly: "$2,640", trend: "0% MoM", topTool: "Figma Org" },
            { dept: "Unallocated", monthly: "$1,420", trend: "—", topTool: "Multiple · review" },
          ]}
        />
      </EditorialSection>

      <EditorialFinalCTA
        title="One dashboard"
        italic="for every dollar."
        body="Connect your accounting system. Spend, allocations, and forecasts populate in roughly an hour, then keep themselves current."
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

function SampleSpend({
  rows,
}: {
  rows: { dept: string; monthly: string; trend: string; topTool: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[1fr_140px_140px_1.4fr] gap-6 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Department</EditorialMonoLabel>
        <EditorialMonoLabel>Monthly</EditorialMonoLabel>
        <EditorialMonoLabel>Trend</EditorialMonoLabel>
        <EditorialMonoLabel>Top tool</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2 border-b border-white/[0.08] py-6 md:grid-cols-[1fr_140px_140px_1.4fr] md:gap-6 md:py-7"
        >
          <span className="text-[15.5px] text-white/85">{r.dept}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[14px] tabular-nums text-white/85">{r.monthly}</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[12.5px] tabular-nums text-white/55">{r.trend}</span>
          <span className="text-[14.5px] text-white/65">{r.topTool}</span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · structure of a real dashboard view
      </p>
    </div>
  )
}
