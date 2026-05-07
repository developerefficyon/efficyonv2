import {
  MarketingShell,
  EditorialNav,
  EditorialFooter,
  EditorialPageHero,
} from "@/components/marketing/editorial"

export default function PrivacyPolicy() {
  return (
    <MarketingShell>
      <EditorialNav />

      <EditorialPageHero
        eyebrow="Legal · Privacy"
        title="Your data, our"
        italic="promise."
        body="We collect what we need to run the product and nothing else. This page explains what that means in plain language."
      />

      <article className="relative z-10 mx-auto max-w-[68ch] px-6 pb-32 md:px-12">
        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Information we collect
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            We collect information you provide directly to us, such as when you create an
            account, request our services, or contact us for support.
          </p>
          <ul className="mt-4 space-y-2 text-[15px] leading-[1.75] text-white/65">
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Contact information (name, email, phone number)</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Business information and requirements</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Communication preferences</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Usage data and analytics</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            How we use your information
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            We use the information we collect to:
          </p>
          <ul className="mt-4 space-y-2 text-[15px] leading-[1.75] text-white/65">
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Provide and improve our services</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Communicate with you about our services</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Analyze usage patterns and optimize performance</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--green)" }} />
              <span>Comply with legal obligations</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Data security
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            We implement appropriate technical and organizational measures to protect your
            personal information against unauthorized access, alteration, disclosure, or
            destruction.
          </p>
        </section>

        <section>
          <h2 className="mt-12 mb-4 text-[28px] font-medium tracking-[-0.02em]">
            Contact us
          </h2>
          <p className="text-[15px] leading-[1.75] text-white/70">
            If you have any questions about this Privacy Policy, please contact us at{" "}
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
