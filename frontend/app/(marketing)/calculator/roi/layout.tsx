import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Optimization ROI Calculator | Efficyon",
  description:
    "Calculate your potential return on investment from SaaS cost optimization. Estimate savings from license optimization, duplicate elimination, and time savings with payback period and 3-year projections.",
  path: "/calculator/roi",
})

export default function ROILayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
