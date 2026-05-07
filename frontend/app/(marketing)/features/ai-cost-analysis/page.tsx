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
  title: "AI Cost Analysis That Finds What Humans Miss",
  description:
    "AI cost analysis: continuous pattern recognition + anomaly detection on accounting and usage data to surface waste and savings opportunities.",
  path: "/features/ai-cost-analysis",
})

export default function AICostAnalysisPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Efficyon AI Cost Analysis",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/features/ai-cost-analysis"),
      description:
        "AI-powered cost analysis that uses pattern recognition and anomaly detection on accounting and usage data to surface optimization opportunities.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "39",
        highPrice: "119",
        priceCurrency: "USD",
        offerCount: "3",
      },
      featureList:
        "Pattern recognition, Anomaly detection, Predictive insights, Continuous monitoring, Prioritized recommendations, Explainable findings",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does AI cost analysis differ from manual review?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Manual review is periodic and capacity-limited. Efficyon's analysis is continuous, runs across millions of data points, and surfaces patterns that only appear at scale. Every finding is explainable — you see the data behind the recommendation.",
          },
        },
        {
          "@type": "Question",
          name: "What anomalies can it detect?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Unexpected price increases, unusual usage spikes, billing errors, off-cycle charges, deviations from a tool's historical pattern, and charges from vendors that should have been cancelled. Each anomaly carries an explanation and a recommended action.",
          },
        },
        {
          "@type": "Question",
          name: "How does it learn about our organization?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The engine builds a baseline model of your organization's spend and usage patterns over the first two weeks — seasonal swings, growth trends, departmental variations. The baseline refines as new data arrives.",
          },
        },
        {
          "@type": "Question",
          name: "Can it predict future cost issues?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Predictive signals include accelerating usage that will trigger the next pricing tier, upcoming renewals with historically increasing rates, and adoption patterns that suggest growing spend. These surface in advance so you can act before the cost lands.",
          },
        },
      ],
    },
    breadcrumbListLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "AI Cost Analysis", path: "/features/ai-cost-analysis" },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Feature · The engine"
        title="Continuous,"
        italic="explainable."
        body="Pattern recognition and anomaly detection across accounting + usage data. Tuned on the actual shape of SaaS waste — not generic finance signals. Every finding ships with the data behind it."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See all features", href: "/features" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The problem"
          title="Manual review can't"
          italic="keep up."
          body="The mid-size stack generates thousands of data points a month — invoices, seat changes, usage windows, contract events. No human can hold it in working memory; no spreadsheet was built for it."
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <EditorialMonoLabel>Where humans hit the wall</EditorialMonoLabel>
            <ul className="mt-6 space-y-5 text-[15.5px] leading-[1.7] text-white/65">
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Manual reviews take weeks and are outdated by the time the report reaches decision-makers.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Reviewers focus on the largest line items while smaller, systemic waste compounds across dozens of tools.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>The interesting patterns only emerge cross-tool — and the cross-tool view requires a dataset no human is curating.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-[10px] h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                <span>Reactive: cost issues are discovered after they hit the budget, not before.</span>
              </li>
            </ul>
          </div>
          <div>
            <EditorialMonoLabel>What "explainable" means here</EditorialMonoLabel>
            <p className="mt-6 text-[16px] leading-[1.75] text-white/65">
              We're not selling a black box. Every finding lists the rule or model that produced it, the underlying invoices and activity windows, and the assumptions behind the modeled dollar value. You can audit any recommendation before acting on it — that's the contract.
            </p>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="How Efficyon does it"
          title="Baseline. Detect."
          italic="Recommend."
          body="Three layers, running continuously. The first scan completes in roughly two weeks; from then on, it's monthly cadence."
        />
        <div className="grid gap-12 md:grid-cols-3">
          <Step
            num="01"
            title="Baseline your stack"
            body="The first two weeks: ingest historical spend, usage, contracts, and org structure. Learn what 'normal' looks like for your company — including seasonality, growth, and departmental variations."
          />
          <Step
            num="02"
            title="Detect & predict"
            body="Continuous comparison of current data against the baseline. Anomalies, pattern matches, and forecasted issues surface in real time. Cross-validation reduces false positives."
          />
          <Step
            num="03"
            title="Recommend & track"
            body="Each finding lands as a prioritized recommendation: modeled dollar value, confidence score, and the implementation step. Outcomes feed back; next month's analysis gets sharper."
          />
        </div>
      </EditorialSection>

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What it surfaces"
          title="Sample anomaly feed"
          italic="from a typical scan."
          body="Illustrative — categories repeat across stacks; the specific events vary."
        />
        <SampleAnomalies
          rows={[
            { type: "Price drift", finding: "Vendor X seat price up 18% YoY · no contract notification", confidence: "High" },
            { type: "Usage spike", finding: "OpenAI API calls 4× last month · approaching tier change", confidence: "High" },
            { type: "Tier mismatch", finding: "Premium Zoom across team — feature usage matches Standard for 70%", confidence: "Med" },
            { type: "Predicted overage", finding: "HubSpot contacts at 92% of plan limit · auto-upgrade in 30 days", confidence: "High" },
            { type: "Off-cycle charge", finding: "Vendor Y double-charged in March on different cards", confidence: "High" },
          ]}
        />
      </EditorialSection>

      <RelatedLinks variant="features" />

      <EditorialFinalCTA
        title="Let the engine"
        italic="watch the gap."
        body="Connect one system. The first baseline runs in two weeks; the monthly findings start landing in your dashboard automatically."
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

function SampleAnomalies({
  rows,
}: {
  rows: { type: string; finding: string; confidence: string }[]
}) {
  return (
    <div className="border-t border-white/[0.08]">
      <div className="hidden grid-cols-[180px_1fr_120px] gap-8 border-b border-white/[0.08] py-4 md:grid">
        <EditorialMonoLabel>Signal</EditorialMonoLabel>
        <EditorialMonoLabel>Sample finding</EditorialMonoLabel>
        <EditorialMonoLabel>Confidence</EditorialMonoLabel>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-3 border-b border-white/[0.08] py-6 md:grid-cols-[180px_1fr_120px] md:gap-8 md:py-7"
        >
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
            {r.type}
          </span>
          <span className="text-[15.5px] leading-[1.65] text-white/80">{r.finding}</span>
          <span
            className="font-[family-name:var(--font-instrument-serif)] text-[18px] italic"
            style={{ color: "var(--green)" }}
          >
            {r.confidence}
          </span>
        </div>
      ))}
      <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-white/35">
        Sample / illustrative · explainable findings · audit any one before acting
      </p>
    </div>
  )
}
