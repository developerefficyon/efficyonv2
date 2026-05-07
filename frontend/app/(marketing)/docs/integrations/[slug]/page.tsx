import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { INTEGRATION_DOCS, getDoc } from "@/lib/integration-docs"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return INTEGRATION_DOCS.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) return { title: "Integration setup — Efficyon" }
  return {
    title: `${doc.name} setup guide — connect ${doc.name} to Efficyon`,
    description: doc.blurb,
    alternates: { canonical: `/docs/integrations/${doc.slug}` },
    openGraph: {
      title: `${doc.name} × Efficyon — setup guide`,
      description: doc.blurb,
      url: absoluteUrl(`/docs/integrations/${doc.slug}`),
    },
  }
}

export default async function IntegrationDocPage({ params }: PageProps) {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `Connect ${doc.name} to Efficyon`,
    description: doc.blurb,
    url: absoluteUrl(`/docs/integrations/${doc.slug}`),
    proficiencyLevel: "Beginner",
    dependencies: doc.prerequisites.join("; "),
    publisher: { "@type": "Organization", name: "Efficyon" },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow={`Setup guide · ${doc.category}`}
        title={`Connect ${doc.name},`}
        italic="step by step."
        body={doc.blurb}
        primaryCta={{ label: `Connect ${doc.name} now`, href: "/register" }}
        secondaryCta={{ label: `Read about ${doc.name} →`, href: `/integrations/${doc.slug}` }}
      />

      {/* Prereqs */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Before you start"
          title="What you'll need."
          italic="Three things, all standard."
          body="Most teams already have all three. If you don't, the setup will fail fast with a clear error rather than half-connecting and confusing the analysis."
        />
        <ul className="border-t border-white/[0.08]">
          {doc.prerequisites.map((p, i) => (
            <li
              key={i}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-7 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] leading-[1.7] text-white/70">{p}</span>
            </li>
          ))}
        </ul>
      </EditorialSection>

      {/* Scopes */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Permissions · Read-only"
          title={`Exactly what ${doc.name} will ask you to authorize.`}
          italic="No more, no less."
          body="Every scope listed below is read-only. We can't write, modify, or delete anything — that's not a policy choice, it's encoded in the OAuth grant your account approves."
        />
        <div className="border-t border-white/[0.08]">
          {doc.scopes.map((s, i) => (
            <div
              key={s.scope}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-7 md:grid-cols-[260px_1fr] md:gap-12"
            >
              <code
                className="font-[family-name:var(--font-geist-mono)] text-[12.5px] tracking-[-0.005em]"
                style={{ color: "var(--green)" }}
              >
                {String(i + 1).padStart(2, "0")} · {s.scope}
              </code>
              <p className="text-[14.5px] leading-[1.7] text-white/65">{s.explanation}</p>
            </div>
          ))}
        </div>
      </EditorialSection>

      {/* Steps */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The flow"
          title={`${doc.steps.length} steps,`}
          italic={`about ${doc.steps.length * 2}–${doc.steps.length * 3} minutes total.`}
          body="If you've connected an OAuth app before, this will look familiar. We've added detail on the parts that are specific to this provider."
        />
        <ol className="border-t border-white/[0.08]">
          {doc.steps.map((step, i) => (
            <li
              key={step.title}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] md:text-[26px]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.7] text-white/65">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </EditorialSection>

      {/* After connect + Revoke */}
      <EditorialSection>
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <EditorialEyebrow>What happens after</EditorialEyebrow>
            <p className="mt-4 text-[15px] leading-[1.75] text-white/70">{doc.afterConnect}</p>
          </div>
          <div>
            <EditorialEyebrow>How to revoke</EditorialEyebrow>
            <p className="mt-4 text-[15px] leading-[1.75] text-white/70">{doc.revoke}</p>
          </div>
        </div>
      </EditorialSection>

      {/* FAQ */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="FAQ"
          title="The questions"
          italic="people actually ask."
          body={`Things people considering ${doc.name} + Efficyon ask, with honest answers — including where we say no, or where we'd rather wait until something is true.`}
        />
        <div className="border-t border-white/[0.08]">
          {doc.faq.map((f) => (
            <details
              key={f.q}
              className="group border-b border-white/[0.08] py-7"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-6 text-[18px] font-medium tracking-[-0.01em] text-white/85 marker:hidden">
                <span className="md:max-w-[80ch]">{f.q}</span>
                <span
                  className="font-[family-name:var(--font-instrument-serif)] text-[24px] italic transition-transform group-open:rotate-45"
                  style={{ color: "var(--green)" }}
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-[80ch] text-[15px] leading-[1.75] text-white/65">{f.a}</p>
            </details>
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title={`Ready to connect ${doc.name}?`}
        italic="The first scan is free."
        body={`No credit card. Read-only access. If we don't surface at least 5× our fee in the first 30 days, you don't pay.`}
        primaryCta={{ label: `Connect ${doc.name} now`, href: "/register" }}
        secondaryCta={{ label: "Read all setup guides →", href: "/docs/integrations" }}
      />
    </>
  )
}
