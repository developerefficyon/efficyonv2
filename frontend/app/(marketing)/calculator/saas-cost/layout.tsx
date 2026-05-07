import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Cost Calculator: How Much Should Your Company Spend? | Efficyon",
  description:
    "Free interactive SaaS cost calculator. Enter your company profile to see industry benchmarks, identify overspending, and estimate potential savings based on company size, industry, and growth stage.",
  path: "/calculator/saas-cost",
})

export default function SaaSCostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
