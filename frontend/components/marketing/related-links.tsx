// frontend/components/marketing/related-links.tsx
import Link from "next/link"

type Variant =
  | "features" | "integrations" | "compare" | "solutions"
  | "calculator" | "benchmarks" | "blog" | "tools"

const PRESETS: Record<Variant, { label: string; href: string }[]> = {
  features: [
    { label: "Compare Efficyon to Zylo", href: "/compare/efficyon-vs-zylo" },
    { label: "ROI calculator", href: "/calculator/roi" },
    { label: "All integrations", href: "/integrations" },
  ],
  integrations: [
    { label: "How features work", href: "/features" },
    { label: "Setup docs", href: "/docs/integrations" },
    { label: "ROI calculator", href: "/calculator/roi" },
  ],
  compare: [
    { label: "Features overview", href: "/features" },
    { label: "Best SaaS cost-optimization tools 2026", href: "/compare/best-saas-cost-optimization-tools" },
    { label: "ROI calculator", href: "/calculator/roi" },
  ],
  solutions: [
    { label: "Features overview", href: "/features" },
    { label: "Industry benchmarks", href: "/benchmarks" },
    { label: "Compare alternatives", href: "/compare" },
  ],
  calculator: [
    { label: "Industry benchmarks", href: "/benchmarks" },
    { label: "Features overview", href: "/features" },
    { label: "Compare alternatives", href: "/compare" },
  ],
  benchmarks: [
    { label: "ROI calculator", href: "/calculator/roi" },
    { label: "SaaS cost calculator", href: "/calculator/saas-cost" },
    { label: "Solutions for finance teams", href: "/solutions/for-finance-teams" },
  ],
  blog: [
    { label: "ROI calculator", href: "/calculator/roi" },
    { label: "Industry benchmarks", href: "/benchmarks" },
    { label: "All features", href: "/features" },
  ],
  tools: [
    { label: "All integrations", href: "/integrations" },
    { label: "Compare alternatives", href: "/compare" },
    { label: "ROI calculator", href: "/calculator/roi" },
  ],
}

export function RelatedLinks({ variant }: { variant: Variant }) {
  return (
    <aside className="mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-12 md:px-12">
      <p className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-[color:var(--green)]">
        ✦ Keep reading
      </p>
      <ul className="grid gap-3 md:grid-cols-3">
        {PRESETS[variant].map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[15px] text-white/75 hover:text-white">
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
