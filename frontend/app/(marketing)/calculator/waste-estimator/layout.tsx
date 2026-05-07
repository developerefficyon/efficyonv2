import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "SaaS Waste Estimator: How Much Are You Losing? | Efficyon",
  description:
    "Free SaaS waste estimator. Calculate how much your company loses to unused subscriptions, duplicate tools, and overprovisioned licenses. Get an urgency score and shadow IT risk assessment.",
  keywords: [
    "saas waste calculator",
    "subscription waste estimator",
    "unused software cost",
    "saas audit tool",
    "software waste analysis",
  ],
  alternates: {
    canonical: "/calculator/waste-estimator",
  },
  openGraph: {
    title: "SaaS Waste Estimator | Efficyon",
    description:
      "How much is your company losing to SaaS waste? Estimate unused license costs, duplicate tool spending, and overprovisioning waste instantly.",
    url: absoluteUrl("/calculator/waste-estimator"),
    type: "website",
  },
}

export default function WasteEstimatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
