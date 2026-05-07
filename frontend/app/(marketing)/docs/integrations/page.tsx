import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { INTEGRATION_DOCS } from "@/lib/integration-docs"

export const metadata: Metadata = {
  title: "Integration setup guides — connect any system to Efficyon",
  description:
    "Step-by-step setup guides for every integration Efficyon supports. Read-only OAuth, multi-currency, contracted refundable.",
  alternates: { canonical: "/docs/integrations" },
  openGraph: {
    title: "Efficyon · Integration setup guides",
    description: "Step-by-step setup for every integration we support.",
    url: absoluteUrl("/docs/integrations"),
  },
}

export default function IntegrationDocsIndex() {
  return (
    <>
      <EditorialPageHero
        eyebrow="Docs · Integration setup"
        title="Connect any system,"
        italic="step by step."
        body="Every integration we support gets the same treatment: prerequisites, exact OAuth scopes, the click-by-click flow, and how to revoke. Read before you connect."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "All integrations →", href: "/integrations" }}
      />

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Setup guides"
          title="Pick your stack."
          italic="Each guide takes about 5 minutes to read."
          body="If your stack isn't listed here yet, the integration may still exist — we ship at least one new connector every month. Check the changelog or write us."
        />
        <div className="border-t border-white/[0.08]">
          {INTEGRATION_DOCS.map((doc, i) => (
            <EditorialCard
              key={doc.slug}
              href={`/docs/integrations/${doc.slug}`}
              index={i}
              title={`Connect ${doc.name}`}
              italic={`· ${doc.steps.length} steps`}
              body={doc.blurb}
              meta={`${doc.category} · ${doc.region}`}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Don't see your stack?"
        italic="Tell us — we ship monthly."
        body="We add at least one new integration a month, prioritized by what current and trial users actually need."
        primaryCta={{ label: "Request an integration", href: "mailto:info@efficyon.com?subject=Integration%20request" }}
        secondaryCta={{ label: "Read the changelog →", href: "/changelog" }}
      />
    </>
  )
}
