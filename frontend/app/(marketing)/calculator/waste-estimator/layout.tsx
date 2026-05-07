import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "SaaS Waste Estimator: How Much Are You Losing? | Efficyon",
  description:
    "Free SaaS waste estimator. Calculate how much your company loses to unused subscriptions, duplicate tools, and overprovisioned licenses. Get an urgency score and shadow IT risk assessment.",
  path: "/calculator/waste-estimator",
})

export default function WasteEstimatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
