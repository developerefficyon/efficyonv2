import type React from "react"
import { MarketingShell, EditorialNav, EditorialFooter } from "@/components/marketing/editorial"

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <MarketingShell>
      <EditorialNav />
      <main>{children}</main>
      <EditorialFooter />
    </MarketingShell>
  )
}
