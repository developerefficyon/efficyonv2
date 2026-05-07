import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialFinalCTA,
  EditorialEyebrow,
} from "@/components/marketing/editorial"
import { absoluteUrl, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "About — Built in Gothenburg, Sweden, for teams who like their numbers honest",
  description:
    "Why we built Efficyon, what we believe, and how we work. Cost intelligence for SaaS-heavy teams, made by a small team in Gothenburg, Sweden.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Efficyon — Cost intelligence for SaaS-heavy teams",
    description:
      "Why we built Efficyon, what we believe, and how we work. Made by a small team in Gothenburg, Sweden.",
    url: absoluteUrl("/about"),
  },
}

const PRINCIPLES = [
  {
    title: "Read-only, always.",
    body:
      "Every connector we ship is OAuth-scoped to GET requests. We can't write, modify, or delete anything in your accounts. It's not a promise — it's a technical guarantee, restated in your contract.",
  },
  {
    title: "Honest math first.",
    body:
      "We'd rather show you a smaller, defensible number than a flashy one we can't back up. If the scan finds $4,200/yr in leaks, that's what we tell you — not $40,000 with an asterisk.",
  },
  {
    title: "Refundable in the first 30 days.",
    body:
      "If we don't surface at least 5× our fee in your first month, you don't pay. Written into the contract, not the marketing copy. The math is what makes that promise possible.",
  },
  {
    title: "Built in public, shipping monthly.",
    body:
      "Every integration we add, every check we ship, every change goes into the changelog. You can watch the velocity, not just hear about it.",
  },
]

const STAGE = [
  {
    label: "Where we are",
    body:
      "Pre-launch. The product runs end-to-end, the integrations are live, and we're onboarding our first customers in Sweden, the UK, and the US. No wall of customer logos yet — we're not faking one. We have the math, the methodology, and a contract that backs both.",
  },
  {
    label: "Where we're going",
    body:
      "Cost intelligence is a category that doesn't quite exist yet. Discovery tools watch the SaaS layer. Spend tools watch the accounting layer. Almost nobody watches the gap between them — and that's where the waste lives. We want to be the layer that does, for every accounting and identity stack a finance team uses.",
  },
  {
    label: "How we ship",
    body:
      "Small team, fast cadence. We add at least one integration a month, prioritized by which trial users actually need it most. The roadmap is shaped by signing customers, not pre-built TAM slides.",
  },
]

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Efficyon",
    url: absoluteUrl("/about"),
    description:
      "Why we built Efficyon, what we believe, and how we work. Made in Gothenburg, Sweden.",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: SITE_URL,
      foundingLocation: {
        "@type": "Place",
        name: "Gothenburg, Sweden",
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="About · Efficyon"
        title="Built in Gothenburg, Sweden — for teams who like"
        italic="their numbers honest."
        body="Efficyon is a small team building cost-intelligence software in the open. This page is what we believe, why we believe it, and how we ship — written before we have a wall of logos to hide behind."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See the changelog →", href: "/changelog" }}
      />

      {/* The thesis */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The thesis"
          title="Software spend is the second-largest line item"
          italic="finance teams can't fully explain."
          body="Cost lives in your accounting platform. Usage lives in your identity provider, your project tools, your AI APIs. The waste only shows up when you compare both — and almost no software does that today. We're building the layer that does."
        />
        <div className="grid gap-x-12 gap-y-2 border-t border-white/[0.08] pt-8 md:grid-cols-2">
          <p className="text-[16px] leading-[1.75] text-white/65">
            Discovery tools tell you what you bought. Usage tools tell you who logged in.
            Neither tells you what&apos;s leaking — because the leak only shows up when you
            compare the invoice to the activity log, and almost nobody does that monthly,
            in dollars, by vendor.
          </p>
          <p className="text-[16px] leading-[1.75] text-white/65">
            We connect your accounting feed to your real usage data and run that
            comparison every month. The output is{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] italic text-white">
              dollars, not dashboards
            </span>{" "}
            — what to cut, what to downgrade, what to renegotiate, with the
            recommended action and the contracted amount printed next to it.
          </p>
        </div>
      </EditorialSection>

      {/* What we believe */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="What we believe"
          title="Four principles."
          italic="They show up in the contract."
          body="We can't claim trust we haven't earned yet. We can claim guarantees we'll honour. These are the four we put in writing for every customer."
        />
        <div className="border-t border-white/[0.08]">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="grid grid-cols-1 items-baseline gap-6 border-b border-white/[0.08] py-10 md:grid-cols-[60px_1fr] md:gap-12"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] md:text-[28px]">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.7] text-white/60">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </EditorialSection>

      {/* Where we are / going */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="Stage · Honest"
          title="Pre-launch, shipping monthly,"
          italic="onboarding our first paying customers."
          body="We don't fake traction. Here's where we actually are — and where we're going."
        />
        <div className="grid gap-12 border-t border-white/[0.08] pt-10 md:grid-cols-3 md:gap-10">
          {STAGE.map((s) => (
            <div key={s.label}>
              <EditorialEyebrow>{s.label}</EditorialEyebrow>
              <p className="mt-4 text-[15px] leading-[1.75] text-white/65">{s.body}</p>
            </div>
          ))}
        </div>
      </EditorialSection>

      {/* Made in Gothenburg */}
      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The team"
          title="Small team."
          italic="Gothenburg, Sweden."
          body="We're not yet at the size where a team page makes sense. When we are, this is where the photos and bios will live. Until then, the work speaks — and the changelog is the closest thing to a team photo we have."
        />
        <div className="grid gap-8 border-t border-white/[0.08] pt-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="font-[family-name:var(--font-instrument-serif)] text-[28px] italic leading-[1.4] text-white/85">
              Efficyon AB · Gothenburg, Sweden · EU-hosted · ships monthly.
            </p>
          </div>
          <div className="space-y-3 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
            <div className="flex items-center gap-3">
              <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
              EU-hosted (read-only OAuth)
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
              GDPR-aligned · DPA available
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
              No SOC 2 / ISO yet — we&apos;ll publish when audited, not before
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block h-1 w-1 rounded-full" style={{ background: "var(--green)" }} />
              Contact: <a href="mailto:info@efficyon.com" className="text-white/80 transition-colors hover:text-white">info@efficyon.com</a>
            </div>
          </div>
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Want to see what we'd find"
        italic="in your stack?"
        body="Connect one system, run a scan in 10 minutes, and see what surfaces against your real numbers. Read-only. Cancel anytime. Refundable in the first 30 days."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Read the changelog →", href: "/changelog" }}
      />
    </>
  )
}
