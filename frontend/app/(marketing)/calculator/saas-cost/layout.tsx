import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "SaaS Cost Calculator: How Much Should Your Company Spend? | Efficyon",
  description:
    "Free interactive SaaS cost calculator. Enter your company profile to see industry benchmarks, identify overspending, and estimate potential savings based on company size, industry, and growth stage.",
  keywords: [
    "saas cost calculator",
    "how much should saas cost",
    "saas spend benchmark",
    "software cost per employee",
    "saas budget calculator",
  ],
  alternates: {
    canonical: "/calculator/saas-cost",
  },
  openGraph: {
    title: "SaaS Cost Calculator | Efficyon",
    description:
      "How much should your company spend on SaaS? Use our free calculator to compare your spending against industry benchmarks and identify potential savings.",
    url: absoluteUrl("/calculator/saas-cost"),
    type: "website",
  },
}

export default function SaaSCostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
