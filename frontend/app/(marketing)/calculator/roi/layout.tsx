import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SaaS Optimization ROI Calculator | Efficyon",
  description:
    "Calculate your potential return on investment from SaaS cost optimization. Estimate savings from license optimization, duplicate elimination, and time savings with payback period and 3-year projections.",
  keywords: [
    "saas roi calculator",
    "saas optimization roi",
    "software optimization return on investment",
    "saas savings calculator",
    "license optimization roi",
  ],
  alternates: {
    canonical: "/calculator/roi",
  },
  openGraph: {
    title: "SaaS Optimization ROI Calculator | Efficyon",
    description:
      "Calculate your potential ROI from SaaS cost optimization. See projected savings, payback period, and 3-year net returns.",
    url: "https://www.efficyon.com/calculator/roi",
    type: "website",
  },
}

export default function ROILayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
