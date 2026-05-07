import {
  MarketingShell,
  EditorialNav,
  EditorialFooter,
  EditorialPageHero,
} from "@/components/marketing/editorial"

export default function TermsOfService() {
  return (
    <MarketingShell>
      <EditorialNav />

      <EditorialPageHero
        eyebrow="Legal · Terms"
        title="How we"
        italic="work together."
        body="The ground rules for using Efficyon. Short, plain-language, and meant to be read."
      />

      <article className="relative z-10 mx-auto max-w-[68ch] px-6 pb-32 md:px-12">
        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Acceptance of terms
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            By accessing and using our services, you accept and agree to be bound by the
            terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Service description
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            Efficyon provides SaaS cost optimization and analysis solutions including but
            not limited to:
          </p>
          <ul className="mt-4 space-y-2 text-[15px] leading-[1.75] text-white/65">
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>SaaS subscription tracking and management</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>AI-powered cost analysis and optimization</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Third-party tool integrations and data analysis</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Spending reports and recommendations</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            User responsibilities
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            You agree to:
          </p>
          <ul className="mt-4 space-y-2 text-[15px] leading-[1.75] text-white/65">
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Provide accurate and complete information</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Use our services in compliance with applicable laws</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Not interfere with or disrupt our services</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Maintain the confidentiality of your account credentials</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Limitation of liability
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            Our liability for any claims arising from the use of our services shall not
            exceed the amount paid by you for the specific service giving rise to the
            claim.
          </p>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Contact information
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            For questions about these Terms of Service, contact us at{" "}
            <a
              href="mailto:info@efficyon.com"
              className="font-medium underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[color:var(--green)]"
              style={{ color: "var(--green)" }}
            >
              info@efficyon.com
            </a>
            .
          </p>
        </section>

        <div className="mt-20 border-t border-white/[0.08] pt-6">
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/40">
            Last updated · 2026-05-07
          </p>
        </div>
      </article>

      <EditorialFooter />
    </MarketingShell>
  )
}
